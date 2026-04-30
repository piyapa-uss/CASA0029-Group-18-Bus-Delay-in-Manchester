// ================================
// ACCESSIBILITY SECTION (MING)
// ================================

function initAccessibilitySection() {
  const mapEl        = document.getElementById("accessibility-map");
  const controlsEl   = document.getElementById("accessibility-controls");
  const sidepanelEl  = document.getElementById("accessibility-sidepanel");
  const heatmapEl    = document.getElementById("gmal-lad-heatmap");

  if (mapEl)       renderMacroAccessibilityMap(mapEl);
  if (controlsEl)  renderAccessibilityControls(controlsEl);
  if (sidepanelEl) renderAccessibilitySidepanel(sidepanelEl);
  if (heatmapEl)   renderGmalLadHeatmap(heatmapEl);
}

// -------------------------------
// 1. LAYER CONTROLS (LEFT CARD) — placeholder
// -------------------------------
function renderAccessibilityControls(container) {
  container.innerHTML = `
    <div class="impact-block">
      <h5>Network Layers</h5>
      <p>
        Ming: layer toggles for bus stops, rail stations, and metro lines will appear here.
      </p>
    </div>

    <div class="impact-block">
      <h5>Network Summary</h5>
      <p>
        Ming: short summary of stop counts, route counts, and coverage by mode.
      </p>
    </div>
  `;
}

// -------------------------------
// 2. SIDE PANEL (RIGHT CARD) — placeholder
// -------------------------------
function renderAccessibilitySidepanel(container) {
  container.innerHTML = `
    <div class="impact-block">
      <h5>2016 vs 2026 Comparison</h5>
      <p>
        Ming: comparison of GMAL accessibility scores between 2016 and 2026 will go here.
      </p>
    </div>

    <div class="impact-block">
      <h5>Mode Composition</h5>
      <p>
        Ming: breakdown of accessibility contribution by bus, rail, and metro modes.
      </p>
    </div>
  `;
}

// -------------------------------
// 3. MACRO ACCESSIBILITY MAP — GMAL 3D
// -------------------------------
function renderMacroAccessibilityMap(container) {
  // Reset the embed-shell placeholder styling and prepare a positioned map shell
  container.innerHTML = "";
  container.classList.add("gmal-3d-shell");
  container.style.padding = "0";
  container.style.display = "block";
  container.style.position = "relative";
  container.style.minHeight = "620px";
  container.style.height = "620px";
  container.style.overflow = "hidden";
  container.style.borderStyle = "solid";

  injectGmalStyles();

  container.innerHTML = `
    <div id="gmal-loading">
      <div class="gmal-spinner"></div>
      <h2>Greater Manchester Accessibility Levels</h2>
      <p>Loading Greater Manchester Accessibility data…</p>
    </div>

    <div id="gmal-map"></div>
    <canvas id="gmal-deck-canvas"></canvas>

    <div class="gmal-panel" id="gmal-info">
      <h4>Greater Manchester Accessibility Levels</h4>
      <p class="gmal-info-desc">Higher values indicate higher accessibility.</p>
      <p class="gmal-info-cap" id="gmal-metric-cap">Combined accessibility across all modes.</p>
      <p class="gmal-info-src">
        Source:
        <a href="https://www.data.gov.uk/dataset/d9dfbf0a-3cd7-4b12-a39f-0ec717423ee4/gm-accessibility-levels"
           target="_blank" rel="noopener">Transport for Greater Manchester</a>
      </p>
    </div>

    <button class="gmal-icon-btn" id="gmal-fs-btn" title="Toggle fullscreen" aria-label="Toggle fullscreen">
      <span id="gmal-fs-icon">⛶</span>
    </button>

    <div id="gmal-controls">
      <div class="gmal-ctrl-group">
        <label>Year</label>
        <div class="gmal-btn-row">
          <button class="gmal-btn active" id="gmal-btn-2016" data-year="2016">2016</button>
          <button class="gmal-btn"        id="gmal-btn-2026" data-year="2026">2026</button>
        </div>
      </div>

      <div class="gmal-ctrl-sep"></div>

      <div class="gmal-ctrl-group">
        <label>Metric</label>
        <div class="gmal-btn-row gmal-metric-row">
          <button class="gmal-btn active" id="gmal-btn-overall"   data-mode="overall">Overall</button>
          <button class="gmal-btn"        id="gmal-btn-bus"       data-mode="bus">Bus</button>
          <button class="gmal-btn"        id="gmal-btn-rail"      data-mode="rail">Rail</button>
          <button class="gmal-btn"        id="gmal-btn-metro"     data-mode="metro">Metro</button>
          <button class="gmal-btn"        id="gmal-btn-locallink" data-mode="locallink">Local Link</button>
        </div>
        <select class="gmal-metric-select" id="gmal-metric-select" aria-label="Metric">
          <option value="overall" selected>Overall</option>
          <option value="bus">Bus</option>
          <option value="rail">Rail</option>
          <option value="metro">Metro</option>
          <option value="locallink">Local Link</option>
        </select>
      </div>

      <div class="gmal-ctrl-sep"></div>

      <div class="gmal-ctrl-group">
        <label>Height scale</label>
        <div class="gmal-slider-wrap">
          <input type="range" id="gmal-h-slider" min="0.2" max="5" step="0.2" value="1">
          <span id="gmal-h-val">1.0×</span>
        </div>
      </div>
    </div>

    <div class="gmal-hint" id="gmal-hint">
      Click a borough to zoom in · Drag to pan · Right-drag to rotate
    </div>

    <button class="gmal-reset-btn" id="gmal-reset-btn" type="button" style="display:none">
      <span class="gmal-reset-arrow">&larr;</span>
      <span>Back to Greater Manchester</span>
      <span class="gmal-reset-name"></span>
    </button>

    <div class="gmal-panel" id="gmal-level-legend">
      <h4>GMAL Level</h4>
      <div class="gmal-lgd-row"><div class="gmal-lgd-box" style="background:#67001f"></div><span class="gmal-lgd-txt">1 – Very Low</span></div>
      <div class="gmal-lgd-row"><div class="gmal-lgd-box" style="background:#b2182b"></div><span class="gmal-lgd-txt">2 – Low</span></div>
      <div class="gmal-lgd-row"><div class="gmal-lgd-box" style="background:#d6604d"></div><span class="gmal-lgd-txt">3 – Low-Med</span></div>
      <div class="gmal-lgd-row"><div class="gmal-lgd-box" style="background:#f4a582"></div><span class="gmal-lgd-txt">4 – Medium</span></div>
      <div class="gmal-lgd-row"><div class="gmal-lgd-box" style="background:#92c5de"></div><span class="gmal-lgd-txt">5 – Med-High</span></div>
      <div class="gmal-lgd-row"><div class="gmal-lgd-box" style="background:#4393c3"></div><span class="gmal-lgd-txt">6 – High</span></div>
      <div class="gmal-lgd-row"><div class="gmal-lgd-box" style="background:#2166ac"></div><span class="gmal-lgd-txt">7 – Very High</span></div>
      <div class="gmal-lgd-row"><div class="gmal-lgd-box" style="background:#053061"></div><span class="gmal-lgd-txt">8 – Excellent</span></div>
    </div>

    <div class="gmal-panel" id="gmal-grad-legend">
      <h4 id="gmal-grad-title">Score</h4>
      <div class="gmal-grad-bar"></div>
      <div class="gmal-grad-labels"><span>Low</span><span>High</span></div>
    </div>

    <div class="gmal-panel" id="gmal-stats-panel">
      <h4>Dataset</h4>
      <div class="gmal-stat-row"><span class="gmal-stat-k">Year</span>       <span class="gmal-stat-v" id="gmal-s-year">—</span></div>
      <div class="gmal-stat-row"><span class="gmal-stat-k">Grid cells</span> <span class="gmal-stat-v" id="gmal-s-cells">—</span></div>
      <div class="gmal-stat-row"><span class="gmal-stat-k">Mean score</span> <span class="gmal-stat-v" id="gmal-s-avg">—</span></div>
      <div class="gmal-stat-row"><span class="gmal-stat-k">Max score</span>  <span class="gmal-stat-v" id="gmal-s-max">—</span></div>
      <div class="gmal-stat-row"><span class="gmal-stat-k">Min score</span>  <span class="gmal-stat-v" id="gmal-s-min">—</span></div>
    </div>

    <div id="gmal-tooltip"></div>
  `;

  loadGmalDependencies()
    .then(() => bootGmal3DMap(container))
    .catch(err => {
      console.error("[accessibility] Failed to load GMAL 3D map:", err);
      const loading = container.querySelector("#gmal-loading");
      if (loading) {
        loading.innerHTML = `<h2>Map failed to load</h2><p>${err.message || err}</p>`;
      }
    });
}

// -------------------------------
// DEPENDENCY LOADING (deck.gl + maplibre-gl)
// -------------------------------
function loadGmalDependencies() {
  return Promise.all([
    loadStylesheet("https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css"),
    loadScript("https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js"),
    loadScript("https://unpkg.com/deck.gl@9/dist.min.js"),
  ]);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => { s.dataset.loaded = "1"; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) return resolve();
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    l.onload = () => resolve();
    l.onerror = reject;
    document.head.appendChild(l);
  });
}

// -------------------------------
// GMAL 3D MAP — initialisation
// -------------------------------
function bootGmal3DMap(root) {
  const $ = (id) => root.querySelector("#" + id);

  // ---- Data ----
  const DATA  = { "2016": [], "2026": [] };
  const STATS = {
    "2016": { count: 0, min: 0, max: 0, avg: 0 },
    "2026": { count: 0, min: 0, max: 0, avg: 0 },
  };
  let MAX_SCORE = 1;
  let LAD_GEOJSON = null;

  async function loadData() {
    const [d16, d26, lads] = await Promise.all([
      fetch("data/accessibility/gmal_2016.json").then(r => r.json()),
      fetch("data/accessibility/gmal_2026.json").then(r => r.json()),
      fetch("data/accessibility/gm_lad.geojson").then(r => r.json()),
    ]);
    DATA["2016"]  = d16.data;  STATS["2016"] = d16.stats;
    DATA["2026"]  = d26.data;  STATS["2026"] = d26.stats;
    MAX_SCORE = Math.max(STATS["2016"].max, STATS["2026"].max);
    LAD_GEOJSON = lads;
  }

  // ---- Initial view + bbox helper ----
  const INIT_VIEW = { center: [-2.24, 53.48], zoom: 10.2, pitch: 52, bearing: -12 };
  function geomBBox(geom) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    (function walk(c) {
      if (typeof c[0] === "number") {
        if (c[0] < minX) minX = c[0];
        if (c[1] < minY) minY = c[1];
        if (c[0] > maxX) maxX = c[0];
        if (c[1] > maxY) maxY = c[1];
      } else for (const x of c) walk(x);
    })(geom.coordinates);
    return [[minX, minY], [maxX, maxY]];
  }

  // ---- Colours ----
  const LEVEL_COLORS = [
    [100, 100, 100],
    [103,   0,  31],
    [178,  24,  43],
    [214,  96,  77],
    [244, 165, 130],
    [146, 197, 222],
    [ 67, 147, 195],
    [ 33, 102, 172],
    [  5,  48,  97],
  ];
  const LEVEL_NAMES = ["Unknown","Very Low","Low","Low-Med","Medium","Med-High","High","Very High","Excellent"];
  const BADGE_BG    = ["#555","#67001f","#b2182b","#d6604d","#f4a582","#92c5de","#4393c3","#2166ac","#053061"];

  const GRADIENT = [
    [107,   0,   0],
    [215,  48,  39],
    [253, 174,  97],
    [166, 217, 106],
    [ 26, 152,  80],
    [  0, 104,  55],
  ];
  function interpGrad(t) {
    const n = GRADIENT.length - 1;
    const i = Math.min(n - 1, Math.floor(t * n));
    const f = t * n - i;
    const a = GRADIENT[i], b = GRADIENT[i + 1];
    return [
      Math.round(a[0] + (b[0] - a[0]) * f),
      Math.round(a[1] + (b[1] - a[1]) * f),
      Math.round(a[2] + (b[2] - a[2]) * f),
    ];
  }

  // ---- State ----
  let currentYear  = "2016";
  let currentMode  = "overall";
  let heightScale  = 1.0;

  function getData()    { return DATA[currentYear]; }
  function getScore(d)  {
    if (currentMode === "bus")       return d[4];
    if (currentMode === "rail")      return d[5];
    if (currentMode === "metro")     return d[6];
    if (currentMode === "locallink") return d[7];
    return d[2];
  }
  function getColor(d) {
    if (currentMode === "overall") return LEVEL_COLORS[d[3]] || LEVEL_COLORS[0];
    const t = Math.min(1, Math.max(0, getScore(d) / MAX_SCORE));
    return interpGrad(t);
  }

  // ---- Map + Deck ----
  const map = new maplibregl.Map({
    container: $("gmal-map"),
    style:  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    center: [-2.24, 53.48],
    zoom:   10.2,
    pitch:  52,
    bearing: -12,
    antialias: true,
  });

  const { Deck, ColumnLayer } = deck;
  let deckgl = null;

  function buildLayer() {
    return new ColumnLayer({
      id: "gmal-columns",
      data: getData(),
      diskResolution: 4,
      radius: 65,
      angle: 45,
      extruded: true,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 60],
      getPosition: d => [d[0], d[1]],
      getElevation: d => Math.max(0, getScore(d) / MAX_SCORE) * 2800 * heightScale,
      getFillColor: d => { const c = getColor(d); return [c[0], c[1], c[2], 215]; },
      material: { ambient: 0.25, diffuse: 0.85, shininess: 18 },
      transitions: {
        getElevation: { duration: 700, easing: x => x < 0.5 ? 2*x*x : 1-Math.pow(-2*x+2,2)/2 },
        getFillColor: { duration: 500 },
      },
      updateTriggers: {
        getElevation: [currentMode, heightScale, currentYear],
        getFillColor:  [currentMode, currentYear],
      },
    });
  }

  map.on("load", async () => {
    try {
      await loadData();
    } catch (err) {
      console.error("[accessibility] Failed to load GMAL JSON:", err);
      $("gmal-loading").innerHTML = `<h2>Data failed to load</h2><p>Check data/accessibility/gmal_*.json</p>`;
      return;
    }

    deckgl = new Deck({
      canvas: $("gmal-deck-canvas"),
      width:  "100%",
      height: "100%",
      viewState: {
        longitude: -2.24, latitude: 53.48,
        zoom: 10.2, pitch: 52, bearing: -12,
      },
      controller: false,
      layers: [buildLayer()],
    });

    function syncDeckToMap() {
      const { lng, lat } = map.getCenter();
      deckgl.setProps({
        viewState: {
          longitude: lng,
          latitude:  lat,
          zoom:      map.getZoom(),
          bearing:   map.getBearing(),
          pitch:     map.getPitch(),
        },
      });
    }
    map.on("move", syncDeckToMap);

    // ---- LAD click-to-zoom layer ----
    if (LAD_GEOJSON) {
      map.addSource("gm-lad", { type: "geojson", data: LAD_GEOJSON, promoteId: "LADNM" });
      map.addLayer({
        id: "gm-lad-fill",
        type: "fill",
        source: "gm-lad",
        paint: {
          "fill-color": "#58a6ff",
          "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.18, 0.0],
        },
      });
      map.addLayer({
        id: "gm-lad-line",
        type: "line",
        source: "gm-lad",
        paint: {
          "line-color": "rgba(255,255,255,0.30)",
          "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.0, 1.0],
        },
      });

      const ladByName = {};
      LAD_GEOJSON.features.forEach(f => { ladByName[f.properties.LADNM] = f; });

      let hoveredLad = null;
      map.on("mousemove", "gm-lad-fill", (e) => {
        if (!e.features.length) return;
        const id = e.features[0].id;
        if (hoveredLad !== null && hoveredLad !== id) {
          map.setFeatureState({ source: "gm-lad", id: hoveredLad }, { hover: false });
        }
        hoveredLad = id;
        map.setFeatureState({ source: "gm-lad", id }, { hover: true });
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "gm-lad-fill", () => {
        if (hoveredLad !== null) {
          map.setFeatureState({ source: "gm-lad", id: hoveredLad }, { hover: false });
        }
        hoveredLad = null;
        map.getCanvas().style.cursor = "";
      });

      map.on("click", "gm-lad-fill", (e) => {
        if (!e.features.length) return;
        const name = e.features[0].properties.LADNM;
        const full = ladByName[name];
        if (!full) return;
        const bbox = geomBBox(full.geometry);
        map.fitBounds(bbox, {
          padding: 40,
          pitch: INIT_VIEW.pitch,
          bearing: INIT_VIEW.bearing,
          duration: 900,
          maxZoom: 13.5,
        });
        const btn = $("gmal-reset-btn");
        btn.style.display = "inline-flex";
        btn.querySelector(".gmal-reset-name").textContent = name;
      });

      $("gmal-reset-btn").addEventListener("click", () => {
        map.flyTo({
          center: INIT_VIEW.center,
          zoom: INIT_VIEW.zoom,
          pitch: INIT_VIEW.pitch,
          bearing: INIT_VIEW.bearing,
          duration: 900,
        });
        $("gmal-reset-btn").style.display = "none";
      });
    }

    const mapEl = $("gmal-map");
    mapEl.addEventListener("mousemove", (e) => {
      const rect = mapEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const info = deckgl.pickObject({ x, y, radius: 4 });
      showTooltip({ object: info ? info.object : null, clientX: e.clientX, clientY: e.clientY });
    });
    mapEl.addEventListener("mouseleave", () => showTooltip({ object: null }));

    $("gmal-loading").style.display = "none";
    updateStats();
  });

  // ---- Tooltip ----
  function showTooltip({ object, clientX, clientY }) {
    const el = $("gmal-tooltip");
    if (!object) { el.style.display = "none"; return; }
    const rect = root.getBoundingClientRect();
    const d = object;
    const lv = d[3];
    el.style.display = "block";
    el.style.left = (clientX - rect.left + 16) + "px";
    el.style.top  = (clientY - rect.top  + 16) + "px";
    el.innerHTML = `
      <div class="gmal-tt-head">Grid Cell &nbsp;·&nbsp; ${currentYear}</div>
      <span class="gmal-tt-badge" style="background:${BADGE_BG[lv]||"#555"}">
        Level ${lv} &ndash; ${LEVEL_NAMES[lv] || "?"}
      </span>
      <div class="gmal-tt-row"><span class="gmal-tt-k">GMAL Score</span>       <span class="gmal-tt-v">${d[2].toFixed(2)}</span></div>
      <div class="gmal-tt-row"><span class="gmal-tt-k">Bus Score</span>        <span class="gmal-tt-v">${d[4].toFixed(2)}</span></div>
      <div class="gmal-tt-row"><span class="gmal-tt-k">Rail Score</span>       <span class="gmal-tt-v">${d[5].toFixed(2)}</span></div>
      <div class="gmal-tt-row"><span class="gmal-tt-k">Metro Score</span>      <span class="gmal-tt-v">${d[6].toFixed(2)}</span></div>
      <div class="gmal-tt-row"><span class="gmal-tt-k">Local Link Score</span> <span class="gmal-tt-v">${(d[7] ?? 0).toFixed(2)}</span></div>
    `;
  }

  // ---- Stats ----
  function updateStats() {
    const s = STATS[currentYear];
    $("gmal-s-year").textContent  = currentYear;
    $("gmal-s-cells").textContent = s.count.toLocaleString();
    $("gmal-s-avg").textContent   = s.avg.toFixed(2);
    $("gmal-s-max").textContent   = s.max.toFixed(2);
    $("gmal-s-min").textContent   = s.min.toFixed(2);
  }

  // ---- Controls ----
  function redraw() {
    if (deckgl) deckgl.setProps({ layers: [buildLayer()] });
  }

  function setYear(yr) {
    currentYear = yr;
    ["2016","2026"].forEach(y =>
      $("gmal-btn-"+y).classList.toggle("active", y === yr));
    updateStats();
    redraw();
  }

  const METRIC_CAPS = {
    overall:   "Combined accessibility across all modes.",
    bus:       "Bus-only accessibility (higher = better service).",
    rail:      "National rail accessibility score.",
    metro:     "Metrolink tram accessibility score.",
    locallink: "Local Link demand-responsive transport score.",
  };
  const METRIC_LABELS = {
    bus: "Bus Score",
    rail: "Rail Score",
    metro: "Metro Score",
    locallink: "Local Link Score",
  };

  function setMode(mode) {
    currentMode = mode;
    ["overall","bus","rail","metro","locallink"].forEach(m =>
      $("gmal-btn-"+m).classList.toggle("active", m === mode));
    const sel = $("gmal-metric-select");
    if (sel && sel.value !== mode) sel.value = mode;
    const isOverall = mode === "overall";
    $("gmal-level-legend").style.display = isOverall ? "" : "none";
    $("gmal-grad-legend").style.display  = isOverall ? "none" : "";
    if (!isOverall) $("gmal-grad-title").textContent = METRIC_LABELS[mode];
    $("gmal-metric-cap").textContent = METRIC_CAPS[mode] || "";
    redraw();
  }

  function setHeight(val) {
    heightScale = parseFloat(val);
    $("gmal-h-val").textContent = parseFloat(val).toFixed(1) + "\u00d7";
    redraw();
  }

  // Wire up controls
  root.querySelectorAll("[data-year]").forEach(btn =>
    btn.addEventListener("click", () => setYear(btn.dataset.year)));
  root.querySelectorAll("[data-mode]").forEach(btn =>
    btn.addEventListener("click", () => setMode(btn.dataset.mode)));
  $("gmal-h-slider").addEventListener("input", (e) => setHeight(e.target.value));
  const metricSel = $("gmal-metric-select");
  if (metricSel) metricSel.addEventListener("change", (e) => setMode(e.target.value));

  // ---- Fullscreen ----
  function isFullscreen() {
    const el = document.fullscreenElement || document.webkitFullscreenElement;
    return el === root;
  }
  function enterFullscreen() {
    const fn = root.requestFullscreen || root.webkitRequestFullscreen;
    if (fn) fn.call(root);
  }
  function exitFullscreen() {
    const fn = document.exitFullscreen || document.webkitExitFullscreen;
    if (fn) fn.call(document);
  }
  function syncFsUi() {
    const fs = isFullscreen();
    root.classList.toggle("gmal-fs", fs);
    $("gmal-fs-icon").textContent  = fs ? "⤫" : "⛶";
    $("gmal-fs-btn").setAttribute("title", fs ? "Exit fullscreen" : "Toggle fullscreen");
    // Resize map + deck after layout settles
    setTimeout(() => { if (map) map.resize(); }, 60);
  }
  $("gmal-fs-btn").addEventListener("click", () => {
    isFullscreen() ? exitFullscreen() : enterFullscreen();
  });
  document.addEventListener("fullscreenchange", syncFsUi);
  document.addEventListener("webkitfullscreenchange", syncFsUi);
}

// -------------------------------
// SCOPED STYLES FOR THE GMAL MAP
// -------------------------------
function injectGmalStyles() {
  if (document.getElementById("gmal-3d-styles")) return;
  const s = document.createElement("style");
  s.id = "gmal-3d-styles";
  s.textContent = `
    .gmal-3d-shell { background: #0d1117; border-radius: 14px; }
    .gmal-3d-shell #gmal-map         { position: absolute; inset: 0; border-radius: 14px; }
    .gmal-3d-shell #gmal-deck-canvas { position: absolute; inset: 0; pointer-events: none; }

    /* Fullscreen state — fill the entire screen, drop rounded corners */
    .gmal-3d-shell:fullscreen,
    .gmal-3d-shell.gmal-fs {
      width: 100vw !important;
      height: 100vh !important;
      min-height: 100vh !important;
      border-radius: 0 !important;
      border: 0 !important;
    }
    .gmal-3d-shell:fullscreen #gmal-map,
    .gmal-3d-shell.gmal-fs #gmal-map,
    .gmal-3d-shell:fullscreen #gmal-loading,
    .gmal-3d-shell.gmal-fs #gmal-loading { border-radius: 0; }

    .gmal-3d-shell #gmal-controls {
      position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
      z-index: 100; display: flex; align-items: center; gap: 14px;
      flex-wrap: wrap; justify-content: center;
      max-width: calc(100% - 100px);
      background: rgba(13,17,23,.90); border: 1px solid rgba(255,255,255,.10);
      border-radius: 14px; padding: 10px 20px;
      backdrop-filter: blur(14px); box-shadow: 0 4px 28px rgba(0,0,0,.45);
      font-family: 'Segoe UI', Roboto, sans-serif;
    }
    .gmal-3d-shell .gmal-metric-select { display: none; }
    .gmal-3d-shell #gmal-controls .gmal-ctrl-group { min-width: 0; }
    @media (max-width: 720px) {
      .gmal-3d-shell #gmal-controls { gap: 10px; padding: 8px 14px; }
      .gmal-3d-shell .gmal-ctrl-sep { display: none; }
      .gmal-3d-shell #gmal-controls .gmal-metric-row { display: none !important; }
      .gmal-3d-shell .gmal-metric-select {
        display: block; padding: 5px 8px; font-size: 11px;
        background: rgba(255,255,255,.06); color: #e6edf3;
        border: 1px solid rgba(255,255,255,.12); border-radius: 6px;
        font-family: inherit; cursor: pointer;
      }
      .gmal-3d-shell #gmal-info { display: none; }
      .gmal-3d-shell #gmal-stats-panel { display: none; }
      .gmal-3d-shell .gmal-hint { display: none; }
    }
    .gmal-3d-shell .gmal-icon-btn {
      position: absolute; top: 14px; right: 14px; z-index: 110;
      width: 34px; height: 34px; padding: 0; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      background: rgba(13,17,23,.90); color: #c9d1d9;
      border: 1px solid rgba(255,255,255,.12); border-radius: 8px;
      backdrop-filter: blur(14px); font-size: 15px;
      transition: background .15s, color .15s;
    }
    .gmal-3d-shell .gmal-icon-btn:hover { background: #1f6feb; color: #fff; }
    .gmal-3d-shell .gmal-hint {
      position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%);
      z-index: 90; padding: 5px 12px; pointer-events: none;
      background: rgba(13,17,23,.75); border: 1px solid rgba(255,255,255,.08);
      border-radius: 999px; backdrop-filter: blur(8px);
      font-size: 10px; color: #8b949e; letter-spacing: .3px;
      font-family: 'Segoe UI', Roboto, sans-serif;
    }
    .gmal-3d-shell .gmal-reset-btn {
      position: absolute; bottom: 16px; left: 16px; z-index: 110;
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; cursor: pointer;
      background: rgba(13,17,23,.92); color: #58a6ff;
      border: 1px solid rgba(88,166,255,.35); border-radius: 999px;
      backdrop-filter: blur(8px);
      font-size: 11px; font-weight: 600;
      font-family: 'Segoe UI', Roboto, sans-serif;
      transition: background .15s, color .15s;
    }
    .gmal-3d-shell .gmal-reset-btn:hover { background: #1f6feb; color: #fff; border-color: #1f6feb; }
    .gmal-3d-shell .gmal-reset-arrow { font-size: 13px; line-height: 1; }
    .gmal-3d-shell .gmal-reset-name {
      padding: 1px 7px; border-radius: 999px;
      background: rgba(88,166,255,.18); color: #c9d1d9;
      font-size: 10px; font-weight: 500;
    }
    .gmal-3d-shell .gmal-reset-name:empty { display: none; }
    .gmal-3d-shell .gmal-ctrl-title { font-size: 13px; font-weight: 700; color: #e6edf3; }
    .gmal-3d-shell .gmal-ctrl-title span { color: #58a6ff; }
    .gmal-3d-shell .gmal-ctrl-sep { width: 1px; height: 24px; background: rgba(255,255,255,.10); }
    .gmal-3d-shell .gmal-ctrl-group > label {
      display: block; font-size: 9px; color: #8b949e;
      text-transform: uppercase; letter-spacing: .9px; margin-bottom: 4px;
    }
    .gmal-3d-shell .gmal-btn-row { display: flex; border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,.12); }
    .gmal-3d-shell .gmal-btn {
      padding: 5px 13px; font-size: 11px; cursor: pointer; border: none;
      background: rgba(255,255,255,.04); color: #8b949e;
      transition: background .15s, color .15s; font-family: inherit;
    }
    .gmal-3d-shell .gmal-btn:hover:not(.active) { background: rgba(255,255,255,.09); color: #c9d1d9; }
    .gmal-3d-shell .gmal-btn.active { background: #1f6feb; color: #fff; font-weight: 700; }
    .gmal-3d-shell .gmal-btn + .gmal-btn { border-left: 1px solid rgba(255,255,255,.10); }

    .gmal-3d-shell .gmal-slider-wrap { display: flex; align-items: center; gap: 8px; }
    .gmal-3d-shell .gmal-slider-wrap span { font-size: 11px; color: #c9d1d9; min-width: 28px; }
    .gmal-3d-shell .gmal-slider-wrap input[type=range] { width: 80px; accent-color: #1f6feb; cursor: pointer; }

    .gmal-3d-shell .gmal-panel {
      position: absolute; z-index: 100;
      background: rgba(13,17,23,.90); border: 1px solid rgba(255,255,255,.10);
      border-radius: 10px; padding: 12px 15px;
      backdrop-filter: blur(14px); font-family: 'Segoe UI', Roboto, sans-serif;
    }
    .gmal-3d-shell .gmal-panel h4 { font-size: 9px; color: #8b949e; text-transform: uppercase; letter-spacing: .9px; margin: 0 0 9px; }

    .gmal-3d-shell #gmal-info { top: 16px; left: 16px; max-width: 240px; }
    .gmal-3d-shell #gmal-info h4 {
      font-size: 12px; color: #e6edf3; text-transform: none;
      letter-spacing: 0; font-weight: 700; margin: 0 0 6px;
    }
    .gmal-3d-shell .gmal-info-desc { font-size: 11px; color: #c9d1d9; margin: 0 0 4px; line-height: 1.4; }
    .gmal-3d-shell .gmal-info-cap  { font-size: 10px; color: #58a6ff; margin: 0 0 6px; line-height: 1.4; font-style: italic; }
    .gmal-3d-shell .gmal-info-src  { font-size: 10px; color: #8b949e; margin: 0; line-height: 1.4; }
    .gmal-3d-shell .gmal-info-src a { color: #58a6ff; text-decoration: none; }
    .gmal-3d-shell .gmal-info-src a:hover { text-decoration: underline; }

    .gmal-3d-shell #gmal-level-legend { bottom: 16px; right: 16px; }
    .gmal-3d-shell .gmal-lgd-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
    .gmal-3d-shell .gmal-lgd-box { width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0; }
    .gmal-3d-shell .gmal-lgd-txt { font-size: 10px; color: #c9d1d9; }

    .gmal-3d-shell #gmal-grad-legend { bottom: 16px; right: 16px; min-width: 160px; display: none; }
    .gmal-3d-shell .gmal-grad-bar {
      height: 12px; border-radius: 3px; margin: 5px 0 4px;
      background: linear-gradient(to right, #6b0000, #d73027, #fdae61, #a6d96a, #1a9850, #006837);
    }
    .gmal-3d-shell .gmal-grad-labels { display: flex; justify-content: space-between; font-size: 9px; color: #8b949e; }

    .gmal-3d-shell #gmal-stats-panel { top: 60px; right: 14px; min-width: 175px; }
    .gmal-3d-shell .gmal-stat-row { display: flex; justify-content: space-between; gap: 14px; margin-bottom: 4px; }
    .gmal-3d-shell .gmal-stat-k { font-size: 10px; color: #8b949e; }
    .gmal-3d-shell .gmal-stat-v { font-size: 10px; color: #e6edf3; font-weight: 700; }

    .gmal-3d-shell #gmal-tooltip {
      position: absolute; z-index: 200; pointer-events: none; display: none;
      background: rgba(13,17,23,.97); border: 1px solid rgba(255,255,255,.13);
      border-radius: 9px; padding: 10px 14px; min-width: 170px;
      font-family: 'Segoe UI', Roboto, sans-serif;
    }
    .gmal-3d-shell .gmal-tt-head { font-size: 11px; font-weight: 700; color: #e6edf3; margin-bottom: 6px; }
    .gmal-3d-shell .gmal-tt-badge {
      display: inline-block; margin-bottom: 7px; padding: 2px 9px;
      border-radius: 999px; font-size: 9px; font-weight: 700; letter-spacing: .4px; color: #fff;
    }
    .gmal-3d-shell .gmal-tt-row { display: flex; justify-content: space-between; gap: 14px; margin-bottom: 3px; }
    .gmal-3d-shell .gmal-tt-k { font-size: 10px; color: #8b949e; }
    .gmal-3d-shell .gmal-tt-v { font-size: 10px; color: #e6edf3; font-weight: 600; }

    .gmal-3d-shell #gmal-loading {
      position: absolute; inset: 0; z-index: 300; background: #0d1117;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 14px; border-radius: 14px;
      font-family: 'Segoe UI', Roboto, sans-serif;
    }
    .gmal-3d-shell #gmal-loading h2 { color: #e6edf3; font-size: 18px; margin: 0; }
    .gmal-3d-shell #gmal-loading p  { color: #8b949e; font-size: 12px; margin: 0; }
    .gmal-3d-shell .gmal-spinner {
      width: 38px; height: 38px;
      border: 3px solid rgba(255,255,255,.10); border-top-color: #1f6feb;
      border-radius: 50%; animation: gmal-spin .8s linear infinite;
    }
    @keyframes gmal-spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(s);
}

// -------------------------------
// BOROUGH-LEVEL GMAL HEATMAP
// -------------------------------
function renderGmalLadHeatmap(container) {
  injectGmalHeatmapStyles();
  container.classList.remove("large-shell");
  container.innerHTML = `<div class="gmal-hm-loading">Loading borough comparison&hellip;</div>`;
  fetch("data/accessibility/gmal_lad_means.csv")
    .then(r => r.text())
    .then(csv => drawGmalLadHeatmap(container, parseGmalLadCsv(csv)))
    .catch(err => {
      console.error("[gmal-lad-heatmap] failed:", err);
      container.innerHTML =
        `<div class="gmal-hm-loading">Failed to load borough comparison data.</div>`;
    });
}

function parseGmalLadCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const cols = lines.shift().split(",");
  const out = {};
  for (const line of lines) {
    const vals = line.split(",");
    const row = {};
    cols.forEach((c, i) => {
      row[c] = (i >= 2) ? parseFloat(vals[i]) : vals[i];
    });
    if (!out[row.LADNM]) out[row.LADNM] = {};
    out[row.LADNM][row.year] = row;
  }
  return out;
}

function drawGmalLadHeatmap(container, byLad) {
  const METRICS = [
    ["overall",   "Overall"],
    ["bus",       "Bus"],
    ["rail",      "Rail"],
    ["metro",     "Metro"],
    ["locallink", "Local Link"],
  ];
  const YEARS = ["2016", "2026"];

  const lads = Object.keys(byLad).sort(
    (a, b) => byLad[b]["2016"].overall - byLad[a]["2016"].overall
  );

  // per-metric max across both years for shared scale within each metric pair
  const maxOf = {};
  for (const [m] of METRICS) {
    let mx = 0;
    for (const l of lads) for (const y of YEARS) {
      const v = byLad[l][y][m];
      if (v > mx) mx = v;
    }
    maxOf[m] = mx || 1;
  }

  const colorFor = (val, max) => {
    const t = Math.max(0, Math.min(1, val / max));
    const r = Math.round(22  + (88  - 22)  * t);
    const g = Math.round(34  + (166 - 34)  * t);
    const b = Math.round(54  + (255 - 54)  * t);
    return `rgb(${r},${g},${b})`;
  };
  const textFor = (val, max) => (val / max) > 0.55 ? "#0d1117" : "#e6edf3";
  const fmt = v => (v < 1 ? v.toFixed(2) : v.toFixed(1));

  let html = `<div class="gmal-hm-wrap"><div class="gmal-hm">`;

  // row 1 — corner + metric group headers (each spanning 2 columns)
  html += `<div class="gmal-hm-corner">Borough</div>`;
  for (const [, label] of METRICS) {
    html += `<div class="gmal-hm-group" style="grid-column: span 2">${label}</div>`;
  }

  // row 2 — empty corner + year sub-headers
  html += `<div class="gmal-hm-spacer"></div>`;
  for (const _ of METRICS) {
    for (const y of YEARS) html += `<div class="gmal-hm-year">${y}</div>`;
  }

  // body rows
  for (const lad of lads) {
    html += `<div class="gmal-hm-lad">${lad}</div>`;
    for (const [m] of METRICS) {
      for (const y of YEARS) {
        const v = byLad[lad][y][m];
        const bg = colorFor(v, maxOf[m]);
        const fg = textFor(v, maxOf[m]);
        html += `<div class="gmal-hm-cell" style="background:${bg};color:${fg}" title="${lad} · ${y} · ${m}: ${v.toFixed(2)}">${fmt(v)}</div>`;
      }
    }
  }

  html += `</div>`; // .gmal-hm

  // legend
  html += `
    <div class="gmal-hm-legend">
      <div class="gmal-hm-lgd-block">
        <div class="gmal-hm-lgd-bar"></div>
        <div class="gmal-hm-lgd-labels"><span>Lower</span><span>Higher</span></div>
      </div>
      <div class="gmal-hm-lgd-note">
        Each metric is scaled independently across the two years, so colour
        intensity is comparable between 2016 and 2026 within the same column
        pair but not across different metrics.
      </div>
    </div>
  `;

  // ---- Δ panel (2026 minus 2016, diverging palette) ----
  // Per-metric symmetric scale around zero, so the neutral colour always means "no change".
  const absMaxOf = {};
  for (const [m] of METRICS) {
    let mx = 0;
    for (const l of lads) {
      const d = byLad[l]["2026"][m] - byLad[l]["2016"][m];
      if (Math.abs(d) > mx) mx = Math.abs(d);
    }
    absMaxOf[m] = mx || 1;
  }

  const divergingFor = (delta, absMax) => {
    const t = Math.max(-1, Math.min(1, delta / absMax));
    // -1 = red, 0 = neutral grey, +1 = green
    const neg = [220,  60,  60];   // red
    const mid = [ 60,  72,  92];   // dark slate (matches dark theme)
    const pos = [ 60, 200, 110];   // green
    let r, g, b;
    if (t >= 0) {
      r = Math.round(mid[0] + (pos[0] - mid[0]) * t);
      g = Math.round(mid[1] + (pos[1] - mid[1]) * t);
      b = Math.round(mid[2] + (pos[2] - mid[2]) * t);
    } else {
      const k = -t;
      r = Math.round(mid[0] + (neg[0] - mid[0]) * k);
      g = Math.round(mid[1] + (neg[1] - mid[1]) * k);
      b = Math.round(mid[2] + (neg[2] - mid[2]) * k);
    }
    return `rgb(${r},${g},${b})`;
  };
  const fmtDelta = v => (v > 0 ? "+" : "") + v.toFixed(2);

  html += `<div class="gmal-hm-delta-title">Change from 2016 to 2026 (2026 minus 2016)</div>`;
  html += `<div class="gmal-hm-wrap"><div class="gmal-hm gmal-hm-delta">`;
  html += `<div class="gmal-hm-corner">Borough</div>`;
  for (const [, label] of METRICS) {
    html += `<div class="gmal-hm-group gmal-hm-group-d">${label}</div>`;
  }
  for (const lad of lads) {
    html += `<div class="gmal-hm-lad">${lad}</div>`;
    for (const [m] of METRICS) {
      const d = byLad[lad]["2026"][m] - byLad[lad]["2016"][m];
      const bg = divergingFor(d, absMaxOf[m]);
      const intensity = Math.abs(d) / absMaxOf[m];
      const fg = intensity > 0.55 ? "#0d1117" : "#e6edf3";
      html += `<div class="gmal-hm-cell" style="background:${bg};color:${fg}" title="${lad} · Δ${m}: ${fmtDelta(d)}">${fmtDelta(d)}</div>`;
    }
  }
  html += `</div>`; // .gmal-hm-delta

  // diverging legend
  html += `
    <div class="gmal-hm-legend">
      <div class="gmal-hm-lgd-block">
        <div class="gmal-hm-lgd-bar gmal-hm-lgd-bar-d"></div>
        <div class="gmal-hm-lgd-labels"><span>Worse</span><span>No change</span><span>Better</span></div>
      </div>
      <div class="gmal-hm-lgd-note">
        Each metric uses a symmetric scale around zero, so deeper red marks
        the largest declines and deeper green the largest gains within that
        metric. Magnitudes between metrics are not directly comparable.
      </div>
    </div>
  `;

  html += `</div>`; // .gmal-hm-wrap (delta)

  container.innerHTML = html;
}

function injectGmalHeatmapStyles() {
  if (document.getElementById("gmal-hm-styles")) return;
  const s = document.createElement("style");
  s.id = "gmal-hm-styles";
  s.textContent = `
    #gmal-lad-heatmap {
      padding: 14px !important;
      display: block !important;
      min-height: 0 !important;
      height: auto !important;
      align-items: stretch !important;
      justify-content: flex-start !important;
      text-align: left !important;
    }
    .gmal-hm-loading { color: #8b949e; font-size: 12px; padding: 20px 0; text-align: center; }

    .gmal-hm-wrap { font-family: 'Segoe UI', Roboto, sans-serif; overflow-x: auto; }
    .gmal-hm {
      display: grid;
      grid-template-columns: 120px repeat(10, minmax(50px, 1fr));
      gap: 2px;
      padding: 4px;
      border-radius: 8px;
      background: rgba(255,255,255,.03);
      min-width: 680px;
    }
    .gmal-hm-corner, .gmal-hm-spacer, .gmal-hm-group,
    .gmal-hm-year, .gmal-hm-lad, .gmal-hm-cell {
      padding: 6px 4px;
      font-size: 11px;
      text-align: center;
      line-height: 1.15;
      border-radius: 3px;
    }
    .gmal-hm-corner {
      grid-row: span 2;
      display: flex; align-items: center;
      font-weight: 700; color: #8b949e;
      text-align: left; padding-left: 8px;
      letter-spacing: .3px;
    }
    .gmal-hm-spacer { display: none; }
    .gmal-hm-group {
      font-weight: 700; color: #e6edf3;
      background: rgba(31,111,235,.20);
      font-size: 10.5px; letter-spacing: .4px;
      text-transform: uppercase;
    }
    .gmal-hm-year {
      font-size: 10px; color: #8b949e; letter-spacing: .4px;
      padding-bottom: 4px;
    }
    .gmal-hm-lad {
      text-align: left; padding-left: 8px;
      font-weight: 600; color: #e6edf3; font-size: 11px;
      background: rgba(255,255,255,.04);
      display: flex; align-items: center;
    }
    .gmal-hm-cell {
      font-weight: 600;
      transition: transform .12s, box-shadow .12s;
      cursor: default;
    }
    .gmal-hm-cell:hover {
      transform: scale(1.07);
      box-shadow: 0 0 0 2px rgba(255,255,255,.18);
      z-index: 2;
    }

    .gmal-hm-legend {
      margin-top: 14px;
      display: flex; align-items: center; gap: 14px;
      flex-wrap: wrap;
      font-size: 10.5px; color: #8b949e;
    }
    .gmal-hm-lgd-block { display: flex; flex-direction: column; gap: 3px; }
    .gmal-hm-lgd-bar {
      width: 140px; height: 10px; border-radius: 999px;
      background: linear-gradient(to right, rgb(22,34,54), rgb(88,166,255));
    }
    .gmal-hm-lgd-labels {
      display: flex; justify-content: space-between;
      width: 140px; font-size: 9.5px;
    }
    .gmal-hm-lgd-note { flex: 1; min-width: 220px; line-height: 1.45; font-style: italic; }

    .gmal-hm-delta-title {
      margin: 26px 0 8px;
      font-size: 11px; font-weight: 700; color: #8b949e;
      text-transform: uppercase; letter-spacing: .8px;
    }
    .gmal-hm.gmal-hm-delta {
      grid-template-columns: 120px repeat(5, minmax(80px, 1fr));
      min-width: 540px;
    }
    .gmal-hm.gmal-hm-delta .gmal-hm-corner {
      grid-row: span 1;
    }
    .gmal-hm-group-d {
      background: rgba(255,255,255,.06) !important;
    }
    .gmal-hm-lgd-bar-d {
      background: linear-gradient(to right,
        rgb(220,60,60) 0%,
        rgb(60,72,92) 50%,
        rgb(60,200,110) 100%);
    }
    .gmal-hm-lgd-bar-d + .gmal-hm-lgd-labels {
      width: 140px;
    }

    @media (max-width: 720px) {
      .gmal-hm { grid-template-columns: 100px repeat(10, minmax(44px, 1fr)); min-width: 600px; }
      .gmal-hm.gmal-hm-delta { grid-template-columns: 100px repeat(5, minmax(70px, 1fr)); min-width: 480px; }
      .gmal-hm-corner, .gmal-hm-lad { font-size: 10px; padding-left: 6px; }
      .gmal-hm-cell { font-size: 10px; padding: 5px 2px; }
    }
  `;
  document.head.appendChild(s);
}

// -------------------------------
// INIT
// -------------------------------
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAccessibilitySection);
} else {
  initAccessibilitySection();
}
