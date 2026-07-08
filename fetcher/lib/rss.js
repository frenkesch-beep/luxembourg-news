// RSS fetching for Google News locale feeds and outlet feeds.
import Parser from 'rss-parser';
import {
  sha1, stripHtml, domainOf, isExcludedDomain, passesKeyword, isFalsePositive,
  detectTopics, stripSourceSuffix, withTimeout,
} from './util.js';

const UA = 'Mozilla/5.0 (compatible; LuxembourgNewsBot/1.0; +https://github.com/luxembourg-news)';
const FEED_TIMEOUT_MS = 15000;

const parser = new Parser({
  timeout: FEED_TIMEOUT_MS,
  headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:group', 'mediaGroup'],
    ],
  },
});

function attrUrl(node) {
  if (!node) return null;
  if (typeof node === 'string') return node;
  if (node.$ && node.$.url) return node.$.url;
  if (node.url) return node.url;
  return null;
}

function pickImage(item) {
  // enclosure (native)
  if (item.enclosure && item.enclosure.url && /^https?:/.test(item.enclosure.url)) {
    return item.enclosure.url;
  }
  const mc = item.mediaContent;
  if (Array.isArray(mc)) {
    for (const m of mc) {
      const u = attrUrl(m);
      if (u && /^https?:/.test(u)) return u;
    }
  } else if (mc) {
    const u = attrUrl(mc);
    if (u) return u;
  }
  if (item.mediaThumbnail) {
    const u = attrUrl(item.mediaThumbnail);
    if (u) return u;
  }
  if (item.mediaGroup && item.mediaGroup['media:thumbnail']) {
    const u = attrUrl(item.mediaGroup['media:thumbnail']);
    if (u) return u;
  }
  return null;
}

async function fetchRaw(url) {
  const res = await withTimeout(
    fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' } }),
    FEED_TIMEOUT_MS, url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

// Parse each <item> block from raw XML to recover the Google News <source url="...">.
function extractSourceUrls(xml) {
  const out = [];
  const blocks = xml.split(/<item\b[^>]*>/i).slice(1);
  for (const block of blocks) {
    const m = block.match(/<source\s+url="([^"]*)"[^>]*>([^<]*)<\/source>/i);
    out.push(m ? { url: m[1], name: m[2] } : { url: null, name: null });
  }
  return out;
}

function summarize(item, isGoogle) {
  if (isGoogle) return ''; // Google News "content" is just an <a> link to the article.
  const raw = item.contentSnippet || item.content || item.summary || item['content:encoded'] || '';
  const s = stripHtml(raw, 300);
  const t = (item.title || '').trim();
  if (s && t && s.toLowerCase() === t.toLowerCase()) return '';
  return s;
}

// Fetch one Google News locale feed. Returns { source, kept, dropped, error, items }.
export async function fetchGoogleNews(cfg, keywords, excludeDomains) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(cfg.query)}&hl=${cfg.hl}&gl=${cfg.gl}&ceid=${encodeURIComponent(cfg.ceid)}`;
  const label = `GoogleNews[${cfg.lang}/${cfg.gl}]`;
  const result = { source: label, kept: 0, dropped: 0, error: null, items: [] };
  try {
    const xml = await fetchRaw(url);
    const feed = await parser.parseString(xml);
    const sources = extractSourceUrls(xml);
    const langKeywords = keywords[cfg.lang] || [];
    feed.items.forEach((item, i) => {
      const src = sources[i] || { url: null, name: null };
      const sourceName = src.name || item.source || '';
      const cleanTitle = stripSourceSuffix(item.title || '', sourceName);
      const link = item.link || '';
      const sourceDomain = domainOf(src.url);

      // Rule 1: exclude Luxembourgish media (check <source url> domain).
      if (isExcludedDomain(sourceDomain, excludeDomains) || isExcludedDomain(domainOf(link), excludeDomains)) {
        result.dropped++; return;
      }
      const haystack = `${cleanTitle} ${summarize(item, true)}`;
      // Rule 2: keyword relevance.
      if (!passesKeyword(haystack, langKeywords)) { result.dropped++; return; }
      // False-positive guard (Paris landmarks / Belgian province).
      if (isFalsePositive(cleanTitle)) { result.dropped++; return; }

      const publishedAt = isoDate(item);
      if (!publishedAt) { result.dropped++; return; }
      result.items.push({
        id: sha1(link || cleanTitle),
        title: cleanTitle,
        url: link,
        source: sourceName || 'Google News',
        sourceCountry: '',
        type: 'article',
        lang: cfg.lang,
        publishedAt,
        summary: '',
        imageUrl: pickImage(item),
        topics: detectTopics(cleanTitle),
      });
      result.kept++;
    });
  } catch (e) {
    result.error = e.message;
  }
  return result;
}

// Fetch one outlet feed. Returns { source, kept, dropped, error, items }.
export async function fetchOutlet(cfg, keywords, excludeDomains) {
  const label = `${cfg.name}`;
  const result = { source: label, kept: 0, dropped: 0, error: null, items: [] };
  try {
    const feed = await withTimeout(parser.parseURL(cfg.feedUrl), FEED_TIMEOUT_MS, cfg.feedUrl);
    const langKeywords = keywords[cfg.lang] || [];
    for (const item of feed.items) {
      const link = item.link || '';
      const domain = domainOf(link);
      // Rule 1
      if (isExcludedDomain(domain, excludeDomains)) { result.dropped++; continue; }
      const title = (item.title || '').trim();
      const summary = summarize(item, false);
      const haystack = `${title} ${summary}`;
      // Rule 2 (keywordFilter is true for all configured outlets)
      if (cfg.keywordFilter !== false && !passesKeyword(haystack, langKeywords)) { result.dropped++; continue; }
      if (isFalsePositive(haystack)) { result.dropped++; continue; }
      const publishedAt = isoDate(item);
      if (!publishedAt) { result.dropped++; continue; }
      result.items.push({
        id: sha1(link || title),
        title,
        url: link,
        source: cfg.name,
        sourceCountry: cfg.country || '',
        type: 'article',
        lang: cfg.lang,
        publishedAt,
        summary,
        imageUrl: pickImage(item),
        topics: detectTopics(haystack),
      });
      result.kept++;
    }
  } catch (e) {
    result.error = e.message;
  }
  return result;
}

function isoDate(item) {
  if (item.isoDate) {
    const d = new Date(item.isoDate);
    if (!isNaN(d)) return d.toISOString();
  }
  if (item.pubDate) {
    const d = new Date(item.pubDate);
    if (!isNaN(d)) return d.toISOString();
  }
  return null;
}
