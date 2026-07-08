# CONTRACT — Luxembourg News Aggregator

Single source of truth for every agent working on this repo. Do not deviate from the
schemas and paths below; other agents build against them in parallel.

## What this is

A static website (GitHub Pages) that aggregates news **about Luxembourg** from
**non-Luxembourgish** sources, in as many languages as possible (en, fr, de, es, zh,
ar, ru, ja, ko, pt, it, nl, pl, tr, el, hi, …). A Node.js fetcher runs hourly in
GitHub Actions, writes JSON, and the static frontend renders it.

## Repo layout

```
luxembourg-news/
├── CONTRACT.md              ← this file
├── package.json             ← type: module, Node >= 20
├── data/
│   └── sources.json         ← source config (written by research agent)
├── fetcher/
│   └── fetch.js             ← entry point, run via `npm run fetch` (pipeline agent)
├── public/                  ← the ENTIRE website; served as-is, this dir is the site root
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── data/
│       └── items.json       ← fetcher OUTPUT (committed; sample data during development)
└── .github/workflows/
    └── update.yml           ← hourly fetch + Pages deploy (pipeline agent)
```

Rules of engagement:
- **Frontend agent**: writes only inside `public/`, never touches `public/data/items.json`.
- **Research agent**: writes only `data/sources.json`.
- **Pipeline agent**: writes `fetcher/`, `package.json` deps, `.github/workflows/update.yml`, and `public/data/items.json` (real output).

## Output file: `public/data/items.json`

```json
{
  "generatedAt": "2026-07-08T12:00:00Z",
  "items": [ Item, ... ]   // sorted by publishedAt desc, rolling 30-day window, max ~1500 items
}
```

### Item schema

```json
{
  "id": "sha1 hex of canonical url",
  "title": "string, original language, plain text",
  "url": "https://... (final article/video url; resolve Google News redirect if feasible, else keep)",
  "source": "outlet name, e.g. \"BBC News\"",
  "sourceCountry": "ISO 3166-1 alpha-2 or \"\" if unknown",
  "type": "article" | "video",
  "lang": "ISO 639-1 code of the item's language",
  "publishedAt": "ISO-8601 UTC",
  "summary": "plain-text snippet, may be \"\" — strip HTML",
  "imageUrl": "https://... or null",
  "topics": ["politics"|"economy"|"finance"|"eu"|"sport"|"culture"|"travel"|"tech"|"other", ...]  // 1+ entries
}
```

## Source config: `data/sources.json`

```json
{
  "googleNews": [
    { "lang": "zh", "hl": "zh-CN", "gl": "CN", "ceid": "CN:zh-Hans", "query": "卢森堡" }
  ],
  "outlets": [
    { "name": "Politico Europe", "country": "BE", "lang": "en",
      "feedUrl": "https://...", "keywordFilter": true }
  ],
  "youtube": [
    { "lang": "en", "query": "Luxembourg news" }
  ],
  "excludeDomains": ["rtl.lu", "wort.lu", "tageblatt.lu", "luxtimes.lu", "delano.lu",
                     "paperjam.lu", "lessentiel.lu", "chronicle.lu", "virgule.lu", "..."],
  "keywords": {
    "en": ["luxembourg"], "de": ["luxemburg"], "zh": ["卢森堡"], "ar": ["لوكسمبورغ"], "...": []
  }
}
```

Google News RSS URL pattern:
`https://news.google.com/rss/search?q=<query>&hl=<hl>&gl=<gl>&ceid=<ceid>`

## Filtering rules (fetcher)

1. **Exclude Luxembourgish media**: drop any item whose resolved URL domain (or the
   `<source url>` element in Google News feeds) ends in `.lu` or is in `excludeDomains`.
2. **Relevance**: for outlet feeds with `keywordFilter: true`, keep only items whose
   title or summary contains a keyword for that feed's language (case-insensitive;
   also always check the `en`/`fr` spellings "luxembourg"/"luxemburg" as fallback).
   Google News search feeds and YouTube results are query-scoped but still must pass
   the same keyword check on title+summary.
3. **Dedupe**: by `id` (canonical URL) and additionally by normalized title
   (lowercase, strip punctuation/whitespace) — keep the earliest-fetched copy.
4. **Topic tagging**: keyword-based heuristic on title+summary (multi-language keyword
   lists live in the fetcher). Default `["other"]`.
5. Merge with previous `items.json` (accumulate history), drop items older than 30
   days, cap at ~1500 items, sort by `publishedAt` desc.
6. Any single feed failing must not fail the run — log and continue. YouTube scraping
   is best-effort; if the page layout breaks, skip videos silently.

## Frontend requirements (`public/`)

- Pure static: vanilla HTML/CSS/JS, **no build step, no external CDNs/fonts/scripts**.
- Fetches `data/items.json` with a relative path (works locally and on GitHub Pages).
- UI: type tabs (All / Articles / Videos), language filter chips (from data),
  topic chips, source dropdown, client-side text search, newest-first cards with
  source, country, relative time, summary, image (lazy, optional).
- Foreign-language cards: show original title; add a "translate" link →
  `https://translate.google.com/?sl=auto&tl=en&text=<urlencoded title>`.
- `dir="rtl"` on card text for `ar`/`fa`/`he` items.
- Light/dark via `prefers-color-scheme` plus manual toggle.
- Show `generatedAt` as "Last updated …" in the header.
- Accessible (semantic elements, focus states), responsive down to 375px.

## GitHub Actions (`update.yml`)

- Triggers: `schedule` (hourly cron), `workflow_dispatch`, `push` to `main`.
- Job 1: checkout → setup Node 20 → `npm ci` → `npm run fetch` → commit
  `public/data/items.json` if changed (skip gracefully when no diff).
- Job 2 (needs job 1): upload `public/` via `actions/upload-pages-artifact` →
  `actions/deploy-pages`. Permissions: `contents: write`, `pages: write`, `id-token: write`.
