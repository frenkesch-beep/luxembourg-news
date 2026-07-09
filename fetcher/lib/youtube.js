// Best-effort YouTube search scraping (newest-first). Fails soft per query.
import {
  sha1, passesKeyword, isFalsePositive, detectTopics, parseRelativeDate, withTimeout,
} from './util.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const TIMEOUT_MS = 15000;
const MAX_PER_QUERY = 15;

// Extract the ytInitialData JSON blob from a YouTube results page.
function extractInitialData(html) {
  // Common forms: `var ytInitialData = {...};` or `window["ytInitialData"] = {...};`
  const patterns = [
    /var ytInitialData\s*=\s*(\{.*?\})\s*;\s*<\/script>/s,
    /ytInitialData"?\]?\s*=\s*(\{.*?\})\s*;\s*<\/script>/s,
    /ytInitialData\s*=\s*(\{.*?\})\s*;/s,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      try { return JSON.parse(m[1]); } catch { /* try next */ }
    }
  }
  return null;
}

// Recursively collect all videoRenderer objects from the parsed data.
function collectVideoRenderers(node, acc = []) {
  if (!node || typeof node !== 'object') return acc;
  if (Array.isArray(node)) {
    for (const el of node) collectVideoRenderers(el, acc);
    return acc;
  }
  if (node.videoRenderer && node.videoRenderer.videoId) acc.push(node.videoRenderer);
  for (const key of Object.keys(node)) {
    if (key === 'videoRenderer') continue;
    collectVideoRenderers(node[key], acc);
  }
  return acc;
}

function runsText(field) {
  if (!field) return '';
  if (field.simpleText) return field.simpleText;
  if (Array.isArray(field.runs)) return field.runs.map((r) => r.text).join('');
  return '';
}

// Fetch + parse one YouTube query. Returns { source, kept, dropped, error, items }.
export async function fetchYouTube(cfg, keywords) {
  const label = `YouTube[${cfg.lang}]`;
  const result = { source: label, kept: 0, dropped: 0, error: null, items: [] };
  // sp=CAI%253D -> sort by upload date (newest first). hl/gl=en for parseable dates.
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(cfg.query)}&sp=CAI%253D&hl=en&gl=US`;
  try {
    const res = await withTimeout(
      fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' } }),
      TIMEOUT_MS, label);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const data = extractInitialData(html);
    if (!data) throw new Error('ytInitialData not found');
    const renderers = collectVideoRenderers(data);
    const langKeywords = keywords[cfg.lang] || [];
    const now = new Date();
    let count = 0;
    for (const vr of renderers) {
      if (count >= MAX_PER_QUERY) break;
      const title = runsText(vr.title);
      const owner = runsText(vr.ownerText) || runsText(vr.longBylineText);
      const publishedText = runsText(vr.publishedTimeText);
      const haystack = `${title} ${owner}`;
      // Keyword relevance check.
      if (!passesKeyword(haystack, langKeywords)) { result.dropped++; continue; }
      if (isFalsePositive(haystack)) { result.dropped++; continue; }
      // No parseable upload date (live streams, premieres, shelf entries) —
      // drop rather than fabricate a fetch-time date.
      const date = parseRelativeDate(publishedText, now);
      if (!date) { result.dropped++; continue; }
      const thumbs = (vr.thumbnail && vr.thumbnail.thumbnails) || [];
      const imageUrl = thumbs.length ? thumbs[thumbs.length - 1].url : null;
      const videoUrl = `https://www.youtube.com/watch?v=${vr.videoId}`;
      result.items.push({
        id: sha1(videoUrl),
        title,
        url: videoUrl,
        source: owner || 'YouTube',
        sourceCountry: '',
        type: 'video',
        lang: cfg.lang,
        publishedAt: date.toISOString(),
        summary: '',
        imageUrl,
        topics: detectTopics(haystack),
      });
      result.kept++;
      count++;
    }
  } catch (e) {
    result.error = e.message;
  }
  return result;
}
