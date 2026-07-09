// TikTok videos mentioning Luxembourg, via the Apify TikTok scraper actor
// (clockworks/tiktok-scraper). Requires APIFY_TOKEN in the environment — the
// stage is skipped (not failed) when it's absent. Luxembourgish creators are
// excluded by account region (LU) and by the excludeSources name patterns.
import { sha1, passesKeyword, isFalsePositive, detectTopics, withTimeout, matchesExcludedSource } from './util.js';

const ACTOR = 'clockworks~tiktok-scraper';
const TIMEOUT_MS = 240000; // actor run-sync can take a couple of minutes

// Naive language tag from which keyword list matches the caption; UI uses it
// for the language filter chips. Defaults to 'en'.
function detectLang(text, keywords) {
  const hay = (text || '').toLowerCase();
  for (const [lang, words] of Object.entries(keywords)) {
    if (lang === 'en') continue;
    if ((words || []).some((w) => w && hay.includes(w.toLowerCase()))) return lang;
  }
  return 'en';
}

export async function fetchTikTok(cfg, keywords, excludeSources = []) {
  const result = { source: 'TikTok (Apify)', kept: 0, dropped: 0, error: null, items: [] };
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    result.error = 'APIFY_TOKEN not set — skipped';
    return result;
  }
  const input = {
    searchQueries: (cfg && cfg.queries) || ['luxembourg'],
    resultsPerPage: (cfg && cfg.resultsPerQuery) || 25,
    searchSection: '/video',
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: false,
  };
  try {
    const res = await withTimeout(
      fetch(`https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${token}&timeout=200`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
      TIMEOUT_MS, 'apify tiktok');
    if (!res.ok) throw new Error(`Apify HTTP ${res.status}`);
    const videos = await res.json();
    if (!Array.isArray(videos)) throw new Error('unexpected Apify response');
    for (const v of videos) {
      const caption = v.text || '';
      const author = v.authorMeta || {};
      const authorName = author.nickName || author.name || '';
      const url = v.webVideoUrl || (author.name && v.id ? `https://www.tiktok.com/@${author.name}/video/${v.id}` : null);
      if (!url || !caption) { result.dropped++; continue; }
      // Relevance + false positives (coach, Paris landmarks…).
      const allKeywords = Object.values(keywords).flat();
      if (!passesKeyword(caption, allKeywords)) { result.dropped++; continue; }
      if (isFalsePositive(caption)) { result.dropped++; continue; }
      // No Luxembourgish tiktokers or news sites: account region LU, or a
      // name matching the excluded-source patterns.
      if ((author.region || '').toUpperCase() === 'LU') { result.dropped++; continue; }
      if (matchesExcludedSource(`${author.name || ''} ${authorName}`, excludeSources)) { result.dropped++; continue; }
      const publishedAt = v.createTimeISO || (v.createTime ? new Date(v.createTime * 1000).toISOString() : null);
      if (!publishedAt) { result.dropped++; continue; }
      result.items.push({
        id: sha1(url),
        title: caption.slice(0, 160),
        url,
        source: authorName ? `@${author.name || authorName}` : 'TikTok',
        sourceCountry: (author.region || '').length === 2 ? author.region.toUpperCase() : '',
        type: 'tiktok',
        lang: detectLang(caption, keywords),
        publishedAt,
        summary: caption.length > 160 ? caption : '',
        imageUrl: (v.videoMeta && v.videoMeta.coverUrl) || null,
        topics: detectTopics(caption),
      });
      result.kept++;
    }
  } catch (e) {
    result.error = e.message;
  }
  return result;
}
