(function () {
  "use strict";

  var PAGE_SIZE = 60;
  var RTL_LANGS = { ar: true, fa: true, he: true };

  // Native language names, keyed by ISO 639-1. Falls back to the code itself.
  var LANG_NAMES = {
    en: "English",
    fr: "Français",
    de: "Deutsch",
    es: "Español",
    zh: "中文",
    ar: "العربية",
    ru: "Русский",
    ja: "日本語",
    ko: "한국어",
    pt: "Português",
    it: "Italiano",
    nl: "Nederlands",
    pl: "Polski",
    tr: "Türkçe",
    el: "Ελληνικά",
    hi: "हिन्दी",
    fa: "فارسی",
    he: "עברית",
    sv: "Svenska",
    no: "Norsk",
    da: "Dansk",
    fi: "Suomi",
    cs: "Čeština",
    ro: "Română",
    hu: "Magyar",
    uk: "Українська",
    th: "ไทย",
    vi: "Tiếng Việt",
    id: "Bahasa Indonesia",
    lb: "Lëtzebuergesch"
  };

  // Site UI languages. Every item carries machine translations for these
  // (item.translations, produced by the fetcher); the original text is used
  // when the item's own language matches, or as fallback.
  var SITE_LANGS = ["lb", "de", "fr", "en"];

  var UI_STRINGS = {
    en: {
      tagline: "Luxembourg in the world’s news",
      tabs: { all: "All", article: "Articles", video: "Videos", tiktok: "TikTok", movie: "Movies" },
      searchPlaceholder: "Search titles, summaries, sources…",
      searchLabel: "Search news",
      allSources: "All sources",
      langLabel: "Language",
      topicLabel: "Topic",
      allLanguages: "All languages",
      allTopics: "All topics",
      lastUpdated: "Last updated:",
      results: "Showing {shown} of {total} results",
      noResults: "0 results",
      loading: "Loading news…",
      loadError: "We couldn’t load the news feed right now.",
      tryAgain: "Try again",
      empty: "No items match your filters.",
      clearFilters: "Clear filters",
      loadMore: "Load more",
      dark: "Dark",
      light: "Light",
      justNow: "just now",
      timeAgo: "{v} ago",
      translatedFrom: "Translated from {lang}",
      footer:
        "Lëtz World aggregates public news coverage of Luxembourg from outlets outside Luxembourg. Not affiliated with any government or media outlet. Links go to original sources.",
      topics: {
        politics: "Politics", economy: "Economy", finance: "Finance", eu: "EU",
        sport: "Sport", culture: "Culture", travel: "Travel", tech: "Tech", other: "Other"
      }
    },
    lb: {
      tagline: "Lëtzebuerg an de Weltnoriichten",
      tabs: { all: "Alles", article: "Artikelen", video: "Videoen", tiktok: "TikTok", movie: "Filmer" },
      searchPlaceholder: "Titelen, Resuméen, Quelle sichen…",
      searchLabel: "News sichen",
      allSources: "All Quellen",
      langLabel: "Sprooch",
      topicLabel: "Thema",
      allLanguages: "All Sproochen",
      allTopics: "All Themen",
      lastUpdated: "Fir d’lescht aktualiséiert:",
      results: "{shown} vun {total} Resultater",
      noResults: "0 Resultater",
      loading: "D’News gi gelueden…",
      loadError: "D’News konnten elo net geluede ginn.",
      tryAgain: "Nach eng Kéier probéieren",
      empty: "Keng Resultater fir är Filteren.",
      clearFilters: "Filtere läschen",
      loadMore: "Méi lueden",
      dark: "Donkel",
      light: "Hell",
      justNow: "elo grad",
      timeAgo: "virun {v}",
      translatedFrom: "Iwwersat aus: {lang}",
      footer:
        "Lëtz World sammelt öffentlech Noriichten iwwer Lëtzebuerg vu Medien ausserhalb vu Lëtzebuerg. Keng Affiliatioun mat enger Regierung oder engem Medium. D’Linke féieren op d’Originalquellen.",
      topics: {
        politics: "Politik", economy: "Wirtschaft", finance: "Finanzen", eu: "EU",
        sport: "Sport", culture: "Kultur", travel: "Reesen", tech: "Tech", other: "Aneres"
      }
    },
    de: {
      tagline: "Luxemburg in den Nachrichten der Welt",
      tabs: { all: "Alle", article: "Artikel", video: "Videos", tiktok: "TikTok", movie: "Filme" },
      searchPlaceholder: "Titel, Zusammenfassungen, Quellen durchsuchen…",
      searchLabel: "Nachrichten durchsuchen",
      allSources: "Alle Quellen",
      langLabel: "Sprache",
      topicLabel: "Thema",
      allLanguages: "Alle Sprachen",
      allTopics: "Alle Themen",
      lastUpdated: "Zuletzt aktualisiert:",
      results: "{shown} von {total} Ergebnissen",
      noResults: "0 Ergebnisse",
      loading: "Nachrichten werden geladen…",
      loadError: "Die Nachrichten konnten gerade nicht geladen werden.",
      tryAgain: "Erneut versuchen",
      empty: "Keine Treffer für Ihre Filter.",
      clearFilters: "Filter zurücksetzen",
      loadMore: "Mehr laden",
      dark: "Dunkel",
      light: "Hell",
      justNow: "gerade eben",
      timeAgo: "vor {v}",
      translatedFrom: "Übersetzt aus: {lang}",
      footer:
        "Lëtz World sammelt öffentliche Berichterstattung über Luxemburg von Medien außerhalb Luxemburgs. Keine Verbindung zu Regierungen oder Medienhäusern. Links führen zu den Originalquellen.",
      topics: {
        politics: "Politik", economy: "Wirtschaft", finance: "Finanzen", eu: "EU",
        sport: "Sport", culture: "Kultur", travel: "Reisen", tech: "Tech", other: "Sonstiges"
      }
    },
    fr: {
      tagline: "Le Luxembourg dans la presse mondiale",
      tabs: { all: "Tout", article: "Articles", video: "Vidéos", tiktok: "TikTok", movie: "Films" },
      searchPlaceholder: "Rechercher titres, résumés, sources…",
      searchLabel: "Rechercher",
      allSources: "Toutes les sources",
      langLabel: "Langue",
      topicLabel: "Sujet",
      allLanguages: "Toutes les langues",
      allTopics: "Tous les sujets",
      lastUpdated: "Dernière mise à jour :",
      results: "{shown} résultats sur {total}",
      noResults: "0 résultat",
      loading: "Chargement des actualités…",
      loadError: "Impossible de charger les actualités pour le moment.",
      tryAgain: "Réessayer",
      empty: "Aucun résultat pour vos filtres.",
      clearFilters: "Effacer les filtres",
      loadMore: "Charger plus",
      dark: "Sombre",
      light: "Clair",
      justNow: "à l’instant",
      timeAgo: "il y a {v}",
      translatedFrom: "Traduit depuis : {lang}",
      footer:
        "Lëtz World agrège la couverture médiatique publique du Luxembourg par des médias hors du Luxembourg. Aucune affiliation avec un gouvernement ou un média. Les liens mènent aux sources originales.",
      topics: {
        politics: "Politique", economy: "Économie", finance: "Finance", eu: "UE",
        sport: "Sport", culture: "Culture", travel: "Voyage", tech: "Tech", other: "Autre"
      }
    }
  };

  function t() {
    return UI_STRINGS[state.uiLang] || UI_STRINGS.en;
  }

  function topicLabel(topic) {
    return t().topics[topic] || capitalize(topic);
  }

  // Returns the display text for an item in the current site language.
  function textFor(item) {
    if (item.lang === state.uiLang) {
      return { title: item.title || "", summary: item.summary || "", translated: false };
    }
    var tr = item.translations && item.translations[state.uiLang];
    if (tr && tr.title) {
      return { title: tr.title, summary: tr.summary || "", translated: true };
    }
    return { title: item.title || "", summary: item.summary || "", translated: false };
  }

  // Minimal ISO 3166-1 alpha-2 -> flag emoji converter (regional indicator symbols).
  function flagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return "";
    var code = countryCode.toUpperCase();
    var A = 0x1f1e6;
    var chars = [];
    for (var i = 0; i < 2; i++) {
      var c = code.charCodeAt(i) - 65;
      if (c < 0 || c > 25) return "";
      chars.push(String.fromCodePoint(A + c));
    }
    return chars.join("");
  }

  function langName(code) {
    if (!code) return "Unknown";
    return LANG_NAMES[code] || code.toUpperCase();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function relativeTime(iso, now) {
    var then = new Date(iso).getTime();
    if (isNaN(then)) return "";
    var diffMs = now - then;
    if (diffMs < 0) diffMs = 0;
    var sec = Math.round(diffMs / 1000);
    if (sec < 60) return t().justNow;
    var min = Math.round(sec / 60);
    var v;
    if (min < 60) v = min + " min";
    else {
      var hr = Math.round(min / 60);
      if (hr < 24) v = hr + " h";
      else {
        var day = Math.round(hr / 24);
        if (day < 7) v = day + " d";
        else if (day < 30) v = Math.round(day / 7) + " w";
        else if (day < 365) v = Math.round(day / 30) + " mo";
        else v = Math.round(day / 365) + " y";
      }
    }
    return t().timeAgo.replace("{v}", v);
  }

  function formatAbsolute(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    try {
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return d.toISOString();
    }
  }

  // ---------------- State ----------------

  var state = {
    allItems: [],
    filtered: [],
    visibleCount: PAGE_SIZE,
    type: "all",
    lang: "",
    topic: "",
    source: "",
    query: "",
    uiLang: "lb",
    generatedAt: null
  };

  var els = {};

  function cacheEls() {
    els.grid = document.getElementById("card-grid");
    els.loadingState = document.getElementById("loading-state");
    els.errorState = document.getElementById("error-state");
    els.emptyState = document.getElementById("empty-state");
    els.loadMoreWrap = document.getElementById("load-more-wrap");
    els.loadMoreBtn = document.getElementById("load-more-btn");
    els.retryBtn = document.getElementById("retry-btn");
    els.clearFiltersBtn = document.getElementById("clear-filters-btn");
    els.resultsInfo = document.getElementById("results-info");
    els.lastUpdated = document.getElementById("last-updated");
    els.searchInput = document.getElementById("search-input");
    els.sourceSelect = document.getElementById("source-select");
    els.langChipsList = document.getElementById("lang-chips-list");
    els.topicChipsList = document.getElementById("topic-chips-list");
    els.typeTabs = document.querySelectorAll(".tab");
    els.themeToggle = document.getElementById("theme-toggle");
    els.langSwitchBtns = document.querySelectorAll("#lang-switch .lang-btn");
    els.tagline = document.getElementById("brand-tagline");
    els.footerText = document.getElementById("footer-text");
    els.langChipsLabel = document.getElementById("lang-chips-label");
    els.topicChipsLabel = document.getElementById("topic-chips-label");
    els.loadingText = document.getElementById("loading-text");
    els.errorText = document.getElementById("error-text");
    els.emptyText = document.getElementById("empty-text");
  }

  // ---------------- Site language (UI language) ----------------

  function initUiLang() {
    var stored = null;
    try {
      stored = localStorage.getItem("letzworld-lang");
    } catch (e) {
      /* ignore */
    }
    state.uiLang = SITE_LANGS.indexOf(stored) !== -1 ? stored : "lb";
    applyUiLang();

    els.langSwitchBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.dataset.uilang === state.uiLang) return;
        state.uiLang = btn.dataset.uilang;
        try {
          localStorage.setItem("letzworld-lang", state.uiLang);
        } catch (e) {
          /* ignore */
        }
        applyUiLang();
        applyFilters(); // re-filter (search matches translations) + re-render cards
      });
    });
  }

  function applyUiLang() {
    var s = t();
    document.documentElement.lang = state.uiLang;
    els.langSwitchBtns.forEach(function (btn) {
      var active = btn.dataset.uilang === state.uiLang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    els.tagline.textContent = s.tagline;
    els.footerText.textContent = s.footer;
    els.langChipsLabel.textContent = s.langLabel;
    els.topicChipsLabel.textContent = s.topicLabel;
    els.loadingText.textContent = s.loading;
    els.errorText.textContent = s.loadError;
    els.emptyText.textContent = s.empty;
    els.retryBtn.textContent = s.tryAgain;
    els.clearFiltersBtn.textContent = s.clearFilters;
    els.loadMoreBtn.textContent = s.loadMore;
    els.searchInput.placeholder = s.searchPlaceholder;

    els.typeTabs.forEach(function (tab) {
      tab.textContent = s.tabs[tab.dataset.type] || tab.dataset.type;
    });

    var allSourcesOpt = els.sourceSelect.querySelector('option[value=""]');
    if (allSourcesOpt) allSourcesOpt.textContent = s.allSources;
    var allLangsChip = els.langChipsList.querySelector('[data-lang=""]');
    if (allLangsChip) allLangsChip.textContent = s.allLanguages;
    var allTopicsChip = els.topicChipsList.querySelector('[data-topic=""]');
    if (allTopicsChip) allTopicsChip.textContent = s.allTopics;
    els.topicChipsList.querySelectorAll(".chip[data-topic]").forEach(function (chip) {
      if (chip.dataset.topic && chip.dataset.count) {
        chip.textContent = topicLabel(chip.dataset.topic) + " (" + chip.dataset.count + ")";
      }
    });

    updateThemeToggleLabel();
    renderLastUpdated(state.generatedAt);
  }

  // ---------------- Theme ----------------

  function initTheme() {
    var stored = null;
    try {
      stored = localStorage.getItem("letzworld-theme");
    } catch (e) {
      /* ignore */
    }
    if (stored === "dark" || stored === "light") {
      applyTheme(stored);
    } else {
      applyTheme(null);
    }

    els.themeToggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      var prefersDark =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      var effectiveDark = current ? current === "dark" : prefersDark;
      var next = effectiveDark ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem("letzworld-theme", next);
      } catch (e) {
        /* ignore */
      }
    });
  }

  function applyTheme(theme) {
    if (theme === "dark" || theme === "light") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    updateThemeToggleLabel();
  }

  function updateThemeToggleLabel() {
    var current = document.documentElement.getAttribute("data-theme");
    var prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var effectiveDark = current ? current === "dark" : prefersDark;
    var icon = els.themeToggle.querySelector(".theme-icon");
    var label = els.themeToggle.querySelector(".theme-label");
    if (effectiveDark) {
      icon.textContent = "☀️";
      label.textContent = t().light;
      els.themeToggle.setAttribute("aria-pressed", "true");
    } else {
      icon.textContent = "🌙";
      label.textContent = t().dark;
      els.themeToggle.setAttribute("aria-pressed", "false");
    }
  }

  // ---------------- Data loading ----------------

  function loadData() {
    setState("loading");
    fetch("data/items.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.items)) throw new Error("Malformed data");
        state.allItems = data.items.slice().sort(function (a, b) {
          return new Date(b.publishedAt) - new Date(a.publishedAt);
        });
        renderLastUpdated(data.generatedAt);
        buildFilterOptions(state.allItems);
        applyFilters();
        setState("ready");
      })
      .catch(function (err) {
        console.error("Failed to load items.json:", err);
        setState("error");
      });
  }

  function renderLastUpdated(generatedAt) {
    if (!generatedAt) {
      els.lastUpdated.textContent = "";
      return;
    }
    state.generatedAt = generatedAt;
    var abs = formatAbsolute(generatedAt);
    els.lastUpdated.textContent = t().lastUpdated + " " + (abs || generatedAt);
    els.lastUpdated.setAttribute("title", generatedAt);
  }

  function setState(mode) {
    els.loadingState.hidden = mode !== "loading";
    els.errorState.hidden = mode !== "error";
    if (mode === "loading" || mode === "error") {
      els.grid.innerHTML = "";
      els.emptyState.hidden = true;
      els.loadMoreWrap.hidden = true;
      els.resultsInfo.textContent = "";
    }
  }

  // ---------------- Filter option building ----------------

  function buildFilterOptions(items) {
    var langs = {};
    var topics = {};
    var sources = {};

    items.forEach(function (item) {
      if (item.lang) langs[item.lang] = (langs[item.lang] || 0) + 1;
      (item.topics || []).forEach(function (t) {
        topics[t] = (topics[t] || 0) + 1;
      });
      if (item.source) sources[item.source] = (sources[item.source] || 0) + 1;
    });

    var langCodes = Object.keys(langs).sort(function (a, b) {
      return langName(a).localeCompare(langName(b));
    });
    var topicNames = Object.keys(topics).sort();
    var sourceNames = Object.keys(sources).sort(function (a, b) {
      return a.localeCompare(b);
    });

    // Language chips
    var langFrag = document.createDocumentFragment();
    langCodes.forEach(function (code) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.lang = code;
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = langName(code) + " (" + langs[code] + ")";
      langFrag.appendChild(btn);
    });
    els.langChipsList.appendChild(langFrag);

    // Topic chips
    var topicFrag = document.createDocumentFragment();
    topicNames.forEach(function (topic) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.topic = topic;
      btn.dataset.count = topics[topic];
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = topicLabel(topic) + " (" + topics[topic] + ")";
      topicFrag.appendChild(btn);
    });
    els.topicChipsList.appendChild(topicFrag);

    // Source dropdown
    var sourceFrag = document.createDocumentFragment();
    sourceNames.forEach(function (source) {
      var opt = document.createElement("option");
      opt.value = source;
      opt.textContent = source + " (" + sources[source] + ")";
      sourceFrag.appendChild(opt);
    });
    els.sourceSelect.appendChild(sourceFrag);
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ---------------- Filtering ----------------

  function applyFilters() {
    var q = state.query.trim().toLowerCase();
    state.filtered = state.allItems.filter(function (item) {
      if (state.type !== "all" && item.type !== state.type) return false;
      if (state.lang && item.lang !== state.lang) return false;
      if (state.topic && (item.topics || []).indexOf(state.topic) === -1) return false;
      if (state.source && item.source !== state.source) return false;
      if (q) {
        var tr = (item.translations && item.translations[state.uiLang]) || {};
        var hay =
          (item.title || "").toLowerCase() +
          " " +
          (item.summary || "").toLowerCase() +
          " " +
          (tr.title || "").toLowerCase() +
          " " +
          (tr.summary || "").toLowerCase() +
          " " +
          (item.source || "").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    state.visibleCount = PAGE_SIZE;
    renderGrid();
  }

  // ---------------- Rendering ----------------

  function renderGrid() {
    var now = Date.now();
    var toShow = state.filtered.slice(0, state.visibleCount);

    els.grid.innerHTML = "";

    if (state.filtered.length === 0) {
      els.emptyState.hidden = false;
      els.loadMoreWrap.hidden = true;
      els.resultsInfo.textContent = t().noResults;
      return;
    }

    els.emptyState.hidden = true;

    var frag = document.createDocumentFragment();
    toShow.forEach(function (item) {
      frag.appendChild(buildCard(item, now));
    });
    els.grid.appendChild(frag);

    var hasMore = state.visibleCount < state.filtered.length;
    els.loadMoreWrap.hidden = !hasMore;

    els.resultsInfo.textContent = t()
      .results.replace("{shown}", toShow.length)
      .replace("{total}", state.filtered.length);
  }

  function buildCard(item, now) {
    var card = document.createElement("article");
    card.className = "card";

    var text = textFor(item);
    // RTL only applies when the ORIGINAL text is shown; translations are in a
    // left-to-right site language.
    var isRtl = !text.translated && RTL_LANGS[item.lang];

    if (item.imageUrl) {
      var imgWrap = document.createElement("div");
      imgWrap.className = "card-image";
      var img = document.createElement("img");
      img.src = item.imageUrl;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error", function () {
        imgWrap.remove();
      });
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);
    }

    // Meta row: source, flag, dot, relative time, video badge
    var meta = document.createElement("div");
    meta.className = "card-meta";

    if (item.type === "video") {
      var badge = document.createElement("span");
      badge.className = "video-badge";
      badge.innerHTML = "&#9658; VIDEO";
      meta.appendChild(badge);
    } else if (item.type === "movie") {
      var mbadge = document.createElement("span");
      mbadge.className = "video-badge movie-badge";
      mbadge.textContent = "🎬 " + t().tabs.movie.toUpperCase();
      meta.appendChild(mbadge);
    } else if (item.type === "tiktok") {
      var tbadge = document.createElement("span");
      tbadge.className = "video-badge tiktok-badge";
      tbadge.textContent = "♪ TIKTOK";
      meta.appendChild(tbadge);
    }

    var sourceSpan = document.createElement("span");
    sourceSpan.className = "card-source";
    var flag = flagEmoji(item.sourceCountry);
    sourceSpan.textContent = (flag ? flag + " " : "") + (item.source || "Unknown source");
    meta.appendChild(sourceSpan);

    var timeSpan = document.createElement("span");
    timeSpan.className = "card-dot";
    var timeEl = document.createElement("time");
    if (item.publishedAt) {
      timeEl.dateTime = item.publishedAt;
      if (item.type === "movie") {
        // Release year, not "59 y ago".
        timeEl.textContent = String(new Date(item.publishedAt).getUTCFullYear());
      } else {
        timeEl.title = formatAbsolute(item.publishedAt);
        timeEl.textContent = relativeTime(item.publishedAt, now);
      }
    }
    timeSpan.appendChild(timeEl);
    meta.appendChild(timeSpan);

    card.appendChild(meta);

    // Title
    var h3 = document.createElement("h3");
    h3.className = "card-title";
    if (isRtl) h3.dir = "rtl";
    var a = document.createElement("a");
    a.href = item.url || "#";
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = text.title || "(untitled)";
    if (text.translated && item.title) a.title = item.title; // original on hover
    h3.appendChild(a);
    card.appendChild(h3);

    // Summary
    if (text.summary) {
      var p = document.createElement("p");
      p.className = "card-summary";
      if (isRtl) p.dir = "rtl";
      p.textContent = text.summary;
      card.appendChild(p);
    }

    // Footer: topics + translate link
    var footer = document.createElement("div");
    footer.className = "card-footer";

    var topicsWrap = document.createElement("div");
    topicsWrap.className = "card-topics";
    (item.topics || []).forEach(function (topic) {
      var tag = document.createElement("span");
      tag.className = "topic-tag";
      tag.textContent = topicLabel(topic);
      topicsWrap.appendChild(tag);
    });
    footer.appendChild(topicsWrap);

    if (text.translated) {
      // Inline machine translation shown — mark it, original title on hover.
      var trTag = document.createElement("span");
      trTag.className = "translated-tag";
      trTag.textContent = "🌐 " + langName(item.lang);
      trTag.title = t().translatedFrom.replace("{lang}", langName(item.lang)) +
        (item.title ? "\n" + item.title : "");
      footer.appendChild(trTag);
    } else if (item.lang && item.lang !== state.uiLang) {
      // No cached translation (yet) — fall back to an external translate link.
      var translateLink = document.createElement("a");
      translateLink.className = "translate-link";
      translateLink.target = "_blank";
      translateLink.rel = "noopener";
      translateLink.href =
        "https://translate.google.com/?sl=auto&tl=" + state.uiLang + "&text=" +
        encodeURIComponent(item.title || "");
      translateLink.textContent = state.uiLang.toUpperCase() + " ↻";
      translateLink.setAttribute("aria-label", t().translatedFrom.replace("{lang}", langName(item.lang)));
      footer.appendChild(translateLink);
    }

    card.appendChild(footer);

    return card;
  }

  // ---------------- Event wiring ----------------

  function wireEvents() {
    els.typeTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        els.typeTabs.forEach(function (t) {
          t.classList.remove("is-active");
          t.setAttribute("aria-pressed", "false");
        });
        tab.classList.add("is-active");
        tab.setAttribute("aria-pressed", "true");
        state.type = tab.dataset.type;
        applyFilters();
      });
    });

    els.langChipsList.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      setActiveChip(els.langChipsList, btn);
      state.lang = btn.dataset.lang || "";
      applyFilters();
    });

    els.topicChipsList.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      setActiveChip(els.topicChipsList, btn);
      state.topic = btn.dataset.topic || "";
      applyFilters();
    });

    els.sourceSelect.addEventListener("change", function () {
      state.source = els.sourceSelect.value;
      applyFilters();
    });

    var searchDebounce = null;
    els.searchInput.addEventListener("input", function () {
      clearTimeout(searchDebounce);
      var value = els.searchInput.value;
      searchDebounce = setTimeout(function () {
        state.query = value;
        applyFilters();
      }, 150);
    });

    els.loadMoreBtn.addEventListener("click", function () {
      state.visibleCount += PAGE_SIZE;
      renderGrid();
    });

    els.retryBtn.addEventListener("click", function () {
      loadData();
    });

    els.clearFiltersBtn.addEventListener("click", function () {
      resetFilters();
    });

    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function () {
        var stored = null;
        try {
          stored = localStorage.getItem("letzworld-theme");
        } catch (e) {
          /* ignore */
        }
        if (!stored) updateThemeToggleLabel();
      };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  function setActiveChip(container, active) {
    container.querySelectorAll(".chip").forEach(function (chip) {
      var isActive = chip === active;
      chip.classList.toggle("is-active", isActive);
      chip.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function resetFilters() {
    state.type = "all";
    state.lang = "";
    state.topic = "";
    state.source = "";
    state.query = "";

    els.typeTabs.forEach(function (t) {
      var isAll = t.dataset.type === "all";
      t.classList.toggle("is-active", isAll);
      t.setAttribute("aria-pressed", isAll ? "true" : "false");
    });
    setActiveChip(els.langChipsList, els.langChipsList.querySelector('[data-lang=""]'));
    setActiveChip(els.topicChipsList, els.topicChipsList.querySelector('[data-topic=""]'));
    els.sourceSelect.value = "";
    els.searchInput.value = "";

    applyFilters();
  }

  // ---------------- Init ----------------

  document.addEventListener("DOMContentLoaded", function () {
    cacheEls();
    initTheme();
    initUiLang();
    wireEvents();
    loadData();
  });
})();
