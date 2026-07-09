// Shared helpers for the Luxembourg news fetcher.
import crypto from 'node:crypto';

export function sha1(str) {
  return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
}

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  laquo: '«', raquo: '»', hellip: '…', mdash: '—', ndash: '–',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', euro: '€',
};

export function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => codePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => codePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) =>
      Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name) ? NAMED_ENTITIES[name] : m);
}

function codePoint(n) {
  try { return String.fromCodePoint(n); } catch { return ''; }
}

// Strip HTML tags + entities, collapse whitespace, trim to `max` chars.
export function stripHtml(input, max = 300) {
  if (!input) return '';
  let text = String(input).replace(/<[^>]*>/g, ' ');
  text = decodeEntities(text);
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length > max) text = text.slice(0, max - 1).trimEnd() + '…';
  return text;
}

// Return lowercase hostname of a URL, or '' if unparseable.
export function domainOf(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

// True if the domain is a Luxembourgish media outlet we must exclude.
export function isExcludedDomain(domain, excludeDomains) {
  if (!domain) return false;
  const d = domain.toLowerCase();
  if (d === 'lu' || d.endsWith('.lu')) return true;
  for (const ex of excludeDomains) {
    const e = ex.toLowerCase();
    if (d === e || d.endsWith('.' + e)) return true;
  }
  return false;
}

// Case-insensitive substring keyword check (works for CJK — no word boundaries).
export function passesKeyword(text, langKeywords) {
  if (!text) return false;
  const hay = text.toLowerCase();
  const list = [...(langKeywords || []), 'luxembourg', 'luxemburg'];
  for (const kw of list) {
    if (kw && hay.includes(kw.toLowerCase())) return true;
  }
  return false;
}

// Paris landmarks + Belgian province references that mention "Luxembourg" but
// are not about the country. Drop only clear matches.
const FALSE_POSITIVE_PATTERNS = [
  'jardin du luxembourg', 'jardins du luxembourg',
  'luxembourg gardens', 'luxembourg garden',
  'palais du luxembourg', 'luxembourg palace',
  'sénat', // (only combined below)
];
const FP_REGEXES = [
  /jardins?\s+du\s+luxembourg/i,
  /luxembourg\s+gardens?/i,
  /palais\s+du\s+luxembourg/i,
  /luxembourg\s+palace/i,
  /province\s+de\s+luxembourg/i,       // Belgian province (fr)
  /provincie\s+luxemburg/i,            // Belgian province (nl)
  /provinz\s+luxemburg/i,              // Belgian province (de)
  /provincia\s+di\s+lussemburgo/i,     // Belgian province (it)
  /jard[ií][mn]s?\s+d[eo]l?\s+luxemburgo/i, // Paris garden (es "jardín del", pt "jardim do")
  /pal[áa]cio\s+d[eo]l?\s+luxemburgo/i,     // Paris palace (es/pt)
  /rue\s+de\s+luxembourg/i,            // street name (Paris/Brussels)
  /rosa\s+(de\s+)?luxemburgo?/i,       // the German revolutionary (+ places named after her)
  /vanderlei\s+luxemburgo/i,           // Brazilian football coach
  /luxemburgo['’]s\b/i,                // English possessive of "Luxemburgo" = the coach
  /\b(dr|mr|mrs|ms|miss|prof(essor)?)\.?\s+(\w+\s+)?luxembourg\b/i, // person named Luxembourg
];

// The coach "Luxemburgo" (pt/es spelling) — excluded whenever "Luxemburgo"
// co-occurs with club-football context. For YouTube the haystack includes the
// CHANNEL name, so football channels ("GP FUTEBOL NEWS", "Diversos FC") are
// caught even when YouTube auto-translates the title to English. Country
// coverage ("Portugal x Luxemburgo", diplomacy, royals) contains none of these.
const COACH_CONTEXT =
  /(vanderlei|ancelotti|neymar|rom[áa]rio|\bneto\b|denilson|leomar|\bftf\b|\bcbf\b|palmeiras|corinthians|flamengo|cruzeiro|sele[çc][ãa]o brasileira|ex-?t[ée]cnico|t[ée]cnico|treinador|entrenador|real madrid|futebol|f[úu]tbol|football|esportes?|deportes?|\bfc\b|eliminat)/i;

export function isFalsePositive(text) {
  if (!text) return false;
  if (FP_REGEXES.some((re) => re.test(text))) return true;
  if (/luxemburgo/i.test(text) && COACH_CONTEXT.test(text)) return true;
  return false;
}

// Source/channel-name exclusion (Luxembourgish media identified by name rather
// than domain — e.g. YouTube channels). Patterns come from sources.json
// excludeSources and are treated as case-insensitive regexes.
export function matchesExcludedSource(name, patterns) {
  if (!name || !patterns) return false;
  return patterns.some((p) => {
    try {
      return new RegExp(p, 'i').test(name);
    } catch {
      return name.toLowerCase().includes(p.toLowerCase());
    }
  });
}

// Multilingual topic keyword heuristic (en/fr/de/es coverage; else -> other).
const TOPIC_KEYWORDS = {
  politics: ['government', 'minister', 'election', 'parliament', 'president', 'prime minister',
    'coalition', 'gouvernement', 'ministre', 'élection', 'parlement', 'président', 'premier ministre',
    'regierung', 'minister', 'wahl', 'parlament', 'präsident', 'kanzler',
    'gobierno', 'ministro', 'elección', 'parlamento', 'presidente'],
  economy: ['economy', 'economic', 'inflation', 'gdp', 'unemployment', 'wages', 'jobs', 'growth',
    'économie', 'inflation', 'chômage', 'croissance', 'salaire', 'emploi',
    'wirtschaft', 'arbeitslos', 'wachstum', 'löhne', 'konjunktur',
    'economía', 'crecimiento', 'empleo', 'desempleo', 'salario'],
  finance: ['bank', 'banking', 'fund', 'funds', 'investment', 'investor', 'finance', 'financial',
    'stock', 'bond', 'tax', 'budget',
    'banque', 'fonds', 'investissement', 'bourse', 'impôt', 'fiscal',
    'bank', 'fonds', 'investition', 'börse', 'steuer', 'anleihe', 'finanz',
    'banco', 'fondo', 'inversión', 'bolsa', 'impuesto', 'finanzas'],
  eu: ['european union', 'european commission', 'european parliament', 'brussels', 'eurozone',
    'meps', 'schengen', 'nato',
    'union européenne', 'commission européenne', 'parlement européen', 'bruxelles',
    'europäische union', 'europäische kommission', 'brüssel',
    'unión europea', 'comisión europea', 'bruselas'],
  sport: ['football', 'soccer', 'match', 'league', 'cup', 'olympic', 'tennis', 'cycling', 'basketball',
    'championnat', 'coupe', 'match', 'olympique', 'cyclisme',
    'fußball', 'spiel', 'liga', 'meisterschaft', 'olympia',
    'fútbol', 'partido', 'liga', 'copa', 'olímpico', 'deporte'],
  culture: ['film', 'movie', 'music', 'concert', 'festival', 'museum', 'art', 'exhibition', 'theatre',
    'musique', 'cinéma', 'exposition', 'musée', 'théâtre', 'culture',
    'musik', 'kunst', 'ausstellung', 'museum', 'kultur', 'film',
    'música', 'cine', 'exposición', 'museo', 'cultura', 'arte'],
  travel: ['travel', 'tourism', 'tourist', 'flight', 'hotel', 'airport', 'vacation', 'holiday',
    'tourisme', 'voyage', 'vol', 'aéroport', 'vacances',
    'tourismus', 'reise', 'flug', 'flughafen', 'urlaub',
    'turismo', 'viaje', 'vuelo', 'aeropuerto', 'vacaciones'],
  tech: ['tech', 'technology', 'software', 'startup', 'digital', 'satellite', 'space', 'cyber',
    'data center', 'semiconductor', 'artificial intelligence', ' ai ',
    'technologie', 'logiciel', 'numérique', 'satellite', 'espace', 'intelligence artificielle',
    'technologie', 'software', 'digital', 'weltraum', 'künstliche intelligenz',
    'tecnología', 'software', 'digital', 'satélite', 'espacio', 'inteligencia artificial'],
};

export function detectTopics(text) {
  if (!text) return ['other'];
  const hay = ' ' + text.toLowerCase() + ' ';
  const topics = [];
  for (const [topic, words] of Object.entries(TOPIC_KEYWORDS)) {
    if (words.some((w) => hay.includes(w))) topics.push(topic);
  }
  return topics.length ? topics : ['other'];
}

// Normalize a title for near-duplicate detection.
export function normalizeTitle(title) {
  return (title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

// Strip a trailing " - Source Name" suffix from Google News titles.
export function stripSourceSuffix(title, sourceName) {
  if (!title) return title;
  if (sourceName && title.endsWith(' - ' + sourceName)) {
    return title.slice(0, -(sourceName.length + 3)).trim();
  }
  // Fallback: remove a trailing " - X" when X is short and looks like an outlet name.
  const m = title.match(/^(.*)\s+-\s+([^-]{2,40})$/);
  if (m && sourceName && m[2].trim() === sourceName.trim()) return m[1].trim();
  return title;
}

// Parse relative time strings like "3 days ago" -> ISO date (English youtube UI).
export function parseRelativeDate(text, now = new Date()) {
  if (!text) return null;
  const m = text.toLowerCase().match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  const d = new Date(now.getTime());
  const ms = {
    second: 1000, minute: 60000, hour: 3600000, day: 86400000,
    week: 604800000, month: 2592000000, year: 31536000000,
  }[unit];
  return new Date(d.getTime() - n * ms);
}

// A concurrency-limited task runner. `tasks` is an array of () => Promise.
export async function runPool(tasks, limit) {
  const results = new Array(tasks.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < tasks.length) {
      const idx = cursor++;
      results[idx] = await tasks[idx]();
    }
  };
  const workers = [];
  for (let i = 0; i < Math.min(limit, tasks.length); i++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

// Wrap a promise with a timeout that rejects after `ms`.
export function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms: ${label}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
