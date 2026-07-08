// Translates item titles + summaries into the site UI languages (lb, de, fr, en)
// via the unofficial Google Translate gtx endpoint (no API key; supports
// Luxembourgish). Translations are cached on each item under `translations`
// and persist across runs through the items.json history merge, so only new
// items (or previously failed languages) cost requests. Best-effort: on
// failure the frontend falls back to the original text.

export const SITE_LANGS = ['lb', 'de', 'fr', 'en'];

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const CONCURRENCY = 3;
const REQUEST_GAP_MS = 120; // per-worker pause between requests
const MAX_CALLS_PER_RUN = 4500;
const TIME_BUDGET_MS = 10 * 60000; // never blow the CI job timeout; rest deferred to next run
const MAX_SUMMARY_CHARS = 220;
const SEP = '\n\n';

let calls = 0;
let failures = 0;

async function translateText(text, targetLang) {
  const url = `${ENDPOINT}?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1500 * 2 ** attempt);
    calls++;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(12000),
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; LetzWorld/1.0)' },
      });
      if (res.status === 429 || res.status >= 500) continue; // retry
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data?.[0])) return null;
      return data[0].map((seg) => seg?.[0] ?? '').join('');
    } catch {
      // network/timeout — retry
    }
  }
  failures++;
  return null;
}

// Translate one item into one target language. Returns {title, summary} or null.
async function translateItem(item, targetLang) {
  const title = (item.title || '').trim();
  if (!title) return null;
  const summary = (item.summary || '').slice(0, MAX_SUMMARY_CHARS).trim();
  const text = summary ? title + SEP + summary : title;
  const translated = await translateText(text, targetLang);
  if (!translated) return null;
  const cut = translated.indexOf(SEP);
  if (!summary || cut === -1) {
    // No summary, or the separator didn't survive translation — keep title only.
    return { title: translated.split('\n')[0].trim(), summary: '' };
  }
  return {
    title: translated.slice(0, cut).trim(),
    summary: translated.slice(cut + SEP.length).trim(),
  };
}

// Mutates items: fills item.translations[lang] for every missing site language
// (except the item's own language, which the frontend renders from the original).
// Newest items first so the visible top of the site is covered even if the
// per-run call budget is exhausted.
export async function translateItems(items) {
  calls = 0;
  failures = 0;

  const jobs = [];
  for (const item of items) {
    if (!item.translations || typeof item.translations !== 'object') item.translations = {};
    for (const lang of SITE_LANGS) {
      if (lang === item.lang) continue;
      if (item.translations[lang]?.title) continue;
      jobs.push({ item, lang });
    }
  }

  const total = jobs.length;
  const deadline = Date.now() + TIME_BUDGET_MS;
  let done = 0;
  let translated = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (jobs.length > 0) {
      if (calls >= MAX_CALLS_PER_RUN || Date.now() > deadline) return;
      if (failures > 40 && failures > calls * 0.5) return; // endpoint is blocking us — bail
      const { item, lang } = jobs.shift();
      const result = await translateItem(item, lang);
      done++;
      if (result) {
        item.translations[lang] = result;
        translated++;
      }
      if (done % 200 === 0) console.log(`  …translated ${done}/${total} (${failures} failures)`);
      await sleep(REQUEST_GAP_MS);
    }
  });
  await Promise.all(workers);

  return { pending: total, translated, requests: calls, failures, skipped: total - done };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
