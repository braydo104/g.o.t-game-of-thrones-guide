import { GOT_GUIDE } from "./data.js";

const els = {
  seasonList: document.getElementById("seasonList"),
  episodeList: document.getElementById("episodeList"),
  episodeListLabel: document.getElementById("episodeListLabel"),
  title: document.getElementById("title"),
  summary: document.getElementById("summary"),
  summaryWrap: document.getElementById("summaryWrap"),
  revealRow: document.getElementById("revealRow"),
  revealBtn: document.getElementById("revealBtn"),
  crumbs: document.getElementById("crumbs"),
  air: document.getElementById("air"),
  heroImg: document.getElementById("heroImg"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  randomBtn: document.getElementById("randomBtn"),
  copyBtn: document.getElementById("copyBtn"),
  search: document.getElementById("search"),
  searchMeta: document.getElementById("searchMeta"),
  aboutBtn: document.getElementById("aboutBtn"),
  aboutDialog: document.getElementById("aboutDialog"),
  installBtn: document.getElementById("installBtn"),
  spoilerHiddenBtn: document.getElementById("spoilerHiddenBtn"),
  spoilerTeaserBtn: document.getElementById("spoilerTeaserBtn"),
  spoilerFullBtn: document.getElementById("spoilerFullBtn")
};

const STORAGE_KEY = "got-episode-guide:v1";
const PREFS_KEY = "got-episode-guide:prefs:v1";

const SPOILER = {
  HIDDEN: "hidden",
  TEASER: "teaser",
  FULL: "full"
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getAllEpisodes() {
  const rows = [];
  for (const season of GOT_GUIDE.seasons) {
    for (const ep of season.episodes) {
      rows.push({
        season: season.season,
        episode: ep.episode,
        title: ep.title,
        summary: ep.summary,
        seasonImage: season.image
      });
    }
  }
  return rows;
}

const ALL = getAllEpisodes();

function parseHash() {
  const m = (location.hash || "").match(/^#s(\d+)-e(\d+)$/i);
  if (!m) return null;
  return { season: Number(m[1]), episode: Number(m[2]) };
}

function setHash(season, episode) {
  history.replaceState(null, "", `#s${season}-e${episode}`);
}

function loadState() {
  const fromHash = parseHash();
  if (fromHash) return fromHash;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { season: 1, episode: 1 };
    const parsed = JSON.parse(raw);
    const season = Number(parsed?.season ?? 1);
    const episode = Number(parsed?.episode ?? 1);
    return { season, episode };
  } catch {
    return { season: 1, episode: 1 };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

let state = loadState();

let prefs = loadPrefs();
let revealOnce = false;

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { spoilerLevel: SPOILER.TEASER };
    const parsed = JSON.parse(raw);
    const spoilerLevel = String(parsed?.spoilerLevel ?? SPOILER.TEASER);
    if (![SPOILER.HIDDEN, SPOILER.TEASER, SPOILER.FULL].includes(spoilerLevel)) {
      return { spoilerLevel: SPOILER.TEASER };
    }
    return { spoilerLevel };
  } catch {
    return { spoilerLevel: SPOILER.TEASER };
  }
}

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function getSeason(seasonNumber) {
  return GOT_GUIDE.seasons.find((s) => s.season === seasonNumber) ?? GOT_GUIDE.seasons[0];
}

function getEpisode(seasonNumber, episodeNumber) {
  const season = getSeason(seasonNumber);
  return season.episodes.find((e) => e.episode === episodeNumber) ?? season.episodes[0];
}

function getEpisodeImage(seasonNumber, episodeNumber) {
  // Local placeholder artwork generated in assets/episodes/
  return `./assets/episodes/s${seasonNumber}-e${episodeNumber}.svg`;
}

function makeTeaser(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  // Prefer first sentence; otherwise trim to ~110 chars.
  const sentence = s.split(/(?<=[.!?])\s+/)[0];
  const base = sentence && sentence.length >= 40 ? sentence : s;
  if (base.length <= 110) return base;
  const cut = base.slice(0, 110);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, Math.max(70, lastSpace))}…`;
}

function setSpoilerButtons() {
  const level = prefs.spoilerLevel;
  els.spoilerHiddenBtn.setAttribute("aria-pressed", String(level === SPOILER.HIDDEN));
  els.spoilerTeaserBtn.setAttribute("aria-pressed", String(level === SPOILER.TEASER));
  els.spoilerFullBtn.setAttribute("aria-pressed", String(level === SPOILER.FULL));
}

function renderSeasons() {
  els.seasonList.innerHTML = "";
  for (const season of GOT_GUIDE.seasons) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "item";
    btn.setAttribute("aria-current", String(season.season === state.season));
    btn.innerHTML = `
      <div class="item__left">
        <div class="item__title">Season ${season.season}</div>
        <div class="item__meta">${season.episodes.length} episodes • ${season.year}</div>
      </div>
      <div class="item__badge">›</div>
    `;

    btn.addEventListener("click", () => {
      state.season = season.season;
      state.episode = 1;
      sync();
    });

    els.seasonList.appendChild(btn);
  }
}

function renderEpisodes(filtered = null) {
  const season = getSeason(state.season);
  els.episodeListLabel.textContent = filtered ? "Search results" : `Episodes (Season ${season.season})`;

  els.episodeList.innerHTML = "";

  const rows = filtered ?? season.episodes.map((ep) => ({
    season: season.season,
    episode: ep.episode,
    title: ep.title,
    summary: ep.summary,
    seasonImage: season.image
  }));

  for (const row of rows) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "item";

    const isCurrent = row.season === state.season && row.episode === state.episode;
    btn.setAttribute("aria-current", String(isCurrent));

    const prefix = `S${String(row.season).padStart(2, "0")}E${String(row.episode).padStart(2, "0")}`;

    btn.innerHTML = `
      <div class="item__left">
        <div class="item__title">${prefix} — ${escapeHtml(row.title)}</div>
        <div class="item__meta">${escapeHtml(row.summary)}</div>
      </div>
      <div class="item__badge">›</div>
    `;

    btn.addEventListener("click", () => {
      state.season = row.season;
      state.episode = row.episode;
      els.search.value = "";
      els.searchMeta.textContent = "";
      sync();
    });

    els.episodeList.appendChild(btn);
  }
}

function renderDetails() {
  const season = getSeason(state.season);
  const ep = getEpisode(state.season, state.episode);

  const maxEp = season.episodes.length;
  state.episode = clamp(state.episode, 1, maxEp);

  const prefix = `Season ${season.season} • Episode ${ep.episode}`;
  els.crumbs.textContent = prefix;
  els.title.textContent = ep.title;
  setSpoilerButtons();

  const level = prefs.spoilerLevel;
  const full = ep.summary;
  const teaser = makeTeaser(full);

  if (level === SPOILER.HIDDEN && !revealOnce) {
    els.summary.textContent = "Summary hidden.";
    els.revealRow.hidden = false;
  } else {
    els.revealRow.hidden = true;
    if (level === SPOILER.TEASER && !revealOnce) {
      els.summary.textContent = teaser;
    } else {
      els.summary.textContent = full;
    }
  }

  els.air.textContent = season.year ? `Originally aired during ${season.year}${season.season === 8 ? "" : ""}` : "";

  els.heroImg.src = getEpisodeImage(state.season, state.episode);
  els.heroImg.onerror = () => {
    els.heroImg.onerror = null;
    els.heroImg.src = season.image || "./assets/hero.svg";
  };

  els.prevBtn.disabled = state.season === 1 && state.episode === 1;
  const lastSeason = GOT_GUIDE.seasons[GOT_GUIDE.seasons.length - 1];
  els.nextBtn.disabled = state.season === lastSeason.season && state.episode === lastSeason.episodes.length;
}

function move(delta) {
  const season = getSeason(state.season);
  let episode = state.episode + delta;
  let seasonNumber = state.season;

  if (episode < 1) {
    seasonNumber = clamp(seasonNumber - 1, 1, GOT_GUIDE.seasons.length);
    const prevSeason = getSeason(seasonNumber);
    episode = prevSeason.episodes.length;
  } else if (episode > season.episodes.length) {
    seasonNumber = clamp(seasonNumber + 1, 1, GOT_GUIDE.seasons.length);
    episode = 1;
  }

  state.season = seasonNumber;
  state.episode = episode;
  sync();
}

function doSearch(text) {
  const q = text.trim().toLowerCase();
  if (!q) {
    els.searchMeta.textContent = "";
    renderEpisodes(null);
    return;
  }

  const hits = ALL.filter((row) => {
    return row.title.toLowerCase().includes(q) || row.summary.toLowerCase().includes(q);
  }).slice(0, 60);

  els.searchMeta.textContent = `${hits.length}${hits.length === 60 ? "+" : ""} match${hits.length === 1 ? "" : "es"}`;
  renderEpisodes(hits);
}

function randomEpisode() {
  const i = Math.floor(Math.random() * ALL.length);
  const pick = ALL[i];
  state.season = pick.season;
  state.episode = pick.episode;
  sync();
}

async function copyLink() {
  const url = new URL(location.href);
  url.hash = `s${state.season}-e${state.episode}`;
  try {
    await navigator.clipboard.writeText(url.toString());
    els.copyBtn.textContent = "Copied!";
    setTimeout(() => (els.copyBtn.textContent = "Copy episode link"), 900);
  } catch {
    // fallback: select text prompt
    prompt("Copy this link:", url.toString());
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sync() {
  const season = getSeason(state.season);
  state.episode = clamp(state.episode, 1, season.episodes.length);
  setHash(state.season, state.episode);
  saveState(state);

  revealOnce = false;

  renderSeasons();
  renderEpisodes(null);
  renderDetails();
}

// Events
els.prevBtn.addEventListener("click", () => move(-1));
els.nextBtn.addEventListener("click", () => move(1));
els.randomBtn.addEventListener("click", randomEpisode);
els.copyBtn.addEventListener("click", copyLink);
els.search.addEventListener("input", (e) => doSearch(e.target.value));
els.aboutBtn.addEventListener("click", () => els.aboutDialog.showModal());
els.revealBtn.addEventListener("click", () => {
  revealOnce = true;
  renderDetails();
});

els.spoilerHiddenBtn.addEventListener("click", () => {
  prefs.spoilerLevel = SPOILER.HIDDEN;
  revealOnce = false;
  savePrefs();
  renderDetails();
});
els.spoilerTeaserBtn.addEventListener("click", () => {
  prefs.spoilerLevel = SPOILER.TEASER;
  revealOnce = false;
  savePrefs();
  renderDetails();
});
els.spoilerFullBtn.addEventListener("click", () => {
  prefs.spoilerLevel = SPOILER.FULL;
  revealOnce = true;
  savePrefs();
  renderDetails();
});

window.addEventListener("hashchange", () => {
  const fromHash = parseHash();
  if (!fromHash) return;
  state = fromHash;
  sync();
});

// PWA install
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  els.installBtn.hidden = false;
});

els.installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  els.installBtn.hidden = true;
});

// Service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch {
      // ignore
    }
  });
}

sync();
