// Movies whose script mentions Luxembourg, via QuoDB (subtitle quote search,
// no API key). Items get type "movie", publishedAt = release year, and are
// exempt from the 30-day window in fetch.js. Best-effort: fails soft.
import { sha1, isFalsePositive, withTimeout } from './util.js';

const TIMEOUT_MS = 15000;
const MAX_PAGES = 5;
const PER_PAGE = 40;

export async function fetchMovies(cfg) {
  const result = { source: 'QuoDB movies', kept: 0, dropped: 0, error: null, items: [] };
  const queries = (cfg && cfg.queries) || ['luxembourg'];
  const seen = new Set();
  try {
    for (const query of queries) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = `https://api.quodb.com/search/${encodeURIComponent(query)}?titles_per_page=${PER_PAGE}&phrases_per_title=1&page=${page}`;
        const res = await withTimeout(
          fetch(url, { headers: { Accept: 'application/json' } }), TIMEOUT_MS, url);
        if (!res.ok) break;
        const data = await res.json();
        const docs = Array.isArray(data?.docs) ? data.docs : [];
        if (docs.length === 0) break;
        for (const doc of docs) {
          if (!doc.title || !doc.phrase) continue;
          if (doc.serie) { result.dropped++; continue; } // movies only, not TV episodes
          const key = `${doc.title}|${doc.year}`;
          if (seen.has(key)) continue;
          seen.add(key);
          // Same landmark/person false positives as news ("Luxembourg Gardens",
          // "Rue de Luxembourg", Rosa Luxemburg…) — the country must be meant.
          if (isFalsePositive(doc.phrase)) { result.dropped++; continue; }
          const year = Number(doc.year) || null;
          result.items.push({
            id: sha1(`quodb:${doc.title_id || key}`),
            title: year ? `${doc.title} (${year})` : doc.title,
            url: `https://www.imdb.com/find/?q=${encodeURIComponent(doc.title + (year ? ' ' + year : ''))}&s=tt`,
            source: 'QuoDB',
            sourceCountry: '',
            type: 'movie',
            lang: 'en',
            publishedAt: year
              ? new Date(Date.UTC(year, 0, 1)).toISOString()
              : new Date(0).toISOString(),
            summary: `“${String(doc.phrase).replace(/\s+/g, ' ').trim()}”`,
            imageUrl: null,
            topics: ['culture'],
          });
          result.kept++;
        }
        if (docs.length < PER_PAGE) break;
      }
    }
  } catch (e) {
    result.error = e.message;
  }
  return result;
}
