#!/usr/bin/env node
// Luxembourg News Aggregator — fetcher entry point.
// Fetches Google News locale feeds, outlet RSS feeds, and YouTube search results,
// filters per CONTRACT.md, merges with prior history, and writes public/data/items.json.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { normalizeTitle, runPool } from './lib/util.js';
import { fetchGoogleNews, fetchOutlet } from './lib/rss.js';
import { fetchYouTube } from './lib/youtube.js';
import { translateItems, SITE_LANGS } from './lib/translate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SOURCES_PATH = resolve(ROOT, 'data/sources.json');
const OUTPUT_PATH = resolve(ROOT, 'public/data/items.json');

const CONCURRENCY = 8;
const WINDOW_DAYS = 30;
const MAX_ITEMS = 1500;

async function main() {
  const sources = JSON.parse(await readFile(SOURCES_PATH, 'utf8'));
  const { googleNews = [], outlets = [], youtube = [], excludeDomains = [], keywords = {} } = sources;

  // Build all feed tasks (RSS first, then YouTube).
  const tasks = [];
  for (const cfg of googleNews) tasks.push(() => fetchGoogleNews(cfg, keywords, excludeDomains));
  for (const cfg of outlets) tasks.push(() => fetchOutlet(cfg, keywords, excludeDomains));
  for (const cfg of youtube) tasks.push(() => fetchYouTube(cfg, keywords));

  console.log(`Fetching ${tasks.length} feeds (concurrency ${CONCURRENCY})…`);
  const results = await runPool(tasks, CONCURRENCY);

  // Collect fresh items.
  const fresh = [];
  for (const r of results) fresh.push(...r.items);

  // Merge with prior history (discard sample data). Prior items FIRST: dedupe
  // keeps the first occurrence, and the earliest-fetched copy must win (contract
  // rule 3) — Google News re-issues new redirect URLs for the same story, so a
  // fresh copy winning the title-dedupe would discard the cached translations.
  const prior = await loadPrior();
  const merged = [...prior, ...fresh];

  // Rule 3: dedupe by id, then by normalized title (keep first seen = freshest listed first).
  const byId = new Map();
  const seenTitles = new Set();
  const deduped = [];
  for (const it of merged) {
    if (!it || !it.id || !it.url) continue;
    if (byId.has(it.id)) continue;
    const tnorm = normalizeTitle(it.title);
    if (tnorm && seenTitles.has(tnorm)) continue;
    byId.set(it.id, it);
    if (tnorm) seenTitles.add(tnorm);
    deduped.push(it);
  }

  // Rule 5: 30-day window, sort desc, cap.
  const cutoff = Date.now() - WINDOW_DAYS * 86400000;
  const now = Date.now();
  let items = deduped.filter((it) => {
    const t = Date.parse(it.publishedAt);
    return !isNaN(t) && t >= cutoff && t <= now + 86400000; // tolerate slight clock skew
  });
  items.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  if (items.length > MAX_ITEMS) items = items.slice(0, MAX_ITEMS);

  // Translate titles/summaries into the site UI languages (cached per item).
  console.log(`\nTranslating into site languages (${SITE_LANGS.join(', ')})…`);
  const tstats = await translateItems(items);

  const output = { generatedAt: new Date().toISOString(), items };
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

  printSummary(results, items, tstats);
}

async function loadPrior() {
  try {
    const raw = JSON.parse(await readFile(OUTPUT_PATH, 'utf8'));
    const items = Array.isArray(raw.items) ? raw.items : [];
    // Discard sample seed data (ids start with "sample").
    const real = items.filter((it) => it && typeof it.id === 'string' && !it.id.startsWith('sample'));
    if (real.length !== items.length) {
      console.log(`Discarded ${items.length - real.length} sample items from prior output.`);
    }
    return real;
  } catch {
    return [];
  }
}

function printSummary(results, items, tstats) {
  console.log('\n=== Feed summary ===');
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`${pad('SOURCE', 26)} ${pad('KEPT', 6)} ${pad('DROPPED', 8)} ERROR`);
  let totalErrors = 0;
  for (const r of results) {
    if (r.error) totalErrors++;
    console.log(`${pad(r.source, 26)} ${pad(r.kept, 6)} ${pad(r.dropped, 8)} ${r.error ? 'ERR: ' + r.error : ''}`);
  }

  const byLang = {};
  const byType = {};
  for (const it of items) {
    byLang[it.lang] = (byLang[it.lang] || 0) + 1;
    byType[it.type] = (byType[it.type] || 0) + 1;
  }
  console.log('\n=== Output ===');
  console.log(`Total items: ${items.length}`);
  console.log(`Languages (${Object.keys(byLang).length}):`, JSON.stringify(byLang));
  console.log('Types:', JSON.stringify(byType));
  console.log(`Feeds with errors: ${totalErrors}/${results.length}`);
  if (tstats) {
    const fully = items.filter((it) =>
      SITE_LANGS.every((l) => l === it.lang || it.translations?.[l]?.title)
    ).length;
    console.log(
      `Translations: ${tstats.translated} new (${tstats.requests} requests, ` +
        `${tstats.failures} failed, ${tstats.skipped} deferred) — ` +
        `${fully}/${items.length} items fully translated`
    );
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
