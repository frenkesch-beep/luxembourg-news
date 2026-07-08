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
    if (sec < 60) return "just now";
    var min = Math.round(sec / 60);
    if (min < 60) return min + " min ago";
    var hr = Math.round(min / 60);
    if (hr < 24) return hr + " h ago";
    var day = Math.round(hr / 24);
    if (day < 7) return day + " d ago";
    var week = Math.round(day / 7);
    if (day < 30) return week + " w ago";
    var month = Math.round(day / 30);
    if (day < 365) return month + " mo ago";
    var year = Math.round(day / 365);
    return year + " y ago";
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
    query: ""
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
      label.textContent = "Light";
      els.themeToggle.setAttribute("aria-pressed", "true");
    } else {
      icon.textContent = "🌙";
      label.textContent = "Dark";
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
    var abs = formatAbsolute(generatedAt);
    els.lastUpdated.textContent = "Last updated: " + (abs || generatedAt);
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
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = capitalize(topic) + " (" + topics[topic] + ")";
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
        var hay =
          (item.title || "").toLowerCase() +
          " " +
          (item.summary || "").toLowerCase() +
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
      els.resultsInfo.textContent = "0 results";
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

    els.resultsInfo.textContent =
      "Showing " + toShow.length + " of " + state.filtered.length + " results";
  }

  function buildCard(item, now) {
    var card = document.createElement("article");
    card.className = "card";

    var isRtl = RTL_LANGS[item.lang];

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
      timeEl.title = formatAbsolute(item.publishedAt);
      timeEl.textContent = relativeTime(item.publishedAt, now);
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
    a.textContent = item.title || "(untitled)";
    h3.appendChild(a);
    card.appendChild(h3);

    // Summary
    if (item.summary) {
      var p = document.createElement("p");
      p.className = "card-summary";
      if (isRtl) p.dir = "rtl";
      p.textContent = item.summary;
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
      tag.textContent = topic;
      topicsWrap.appendChild(tag);
    });
    footer.appendChild(topicsWrap);

    if (item.lang && item.lang !== "en") {
      var translateLink = document.createElement("a");
      translateLink.className = "translate-link";
      translateLink.target = "_blank";
      translateLink.rel = "noopener";
      translateLink.href =
        "https://translate.google.com/?sl=auto&tl=en&text=" +
        encodeURIComponent(item.title || "");
      translateLink.textContent = "EN ↻";
      translateLink.setAttribute("aria-label", "Translate title to English");
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
    wireEvents();
    loadData();
  });
})();
