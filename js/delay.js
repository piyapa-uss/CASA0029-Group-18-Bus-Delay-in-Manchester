// ================================
// DELAY & RELIABILITY DASHBOARD (MING)
// Mirrors data/delay/sample/map3.html, driven by real stop-level metrics
// processed through data/delay/process_delay_data.ipynb.
// ================================

const DELAY_PATHS = {
  network: "data/delay/network_routes.json",
  details: "data/delay/route_details.json",
  lad:     "data/delay/gm_lad.geojson",
};

const DELAY_PERIODS = [
  { key: "am_off",  lbl: "AM off-peak", s: 5,  e: 7,  c: "#5DCAA5" },
  { key: "am_peak", lbl: "AM peak",     s: 7,  e: 9,  c: "#378ADD" },
  { key: "midday",  lbl: "Midday",      s: 9,  e: 16, c: "#B4B2A9" },
  { key: "pm_peak", lbl: "PM peak",     s: 16, e: 19, c: "#D85A30" },
  { key: "pm_off",  lbl: "PM off-peak", s: 19, e: 23, c: "#7F77DD" },
];
const DELAY_PERIOD_KEYS = DELAY_PERIODS.map(p => p.key);

const GM_NEIGHBOURHOODS = [
  { lat0: 53.470, lat1: 53.500, lng0: -2.265, lng1: -2.205, name: "City Centre" },
  { lat0: 53.470, lat1: 53.505, lng0: -2.320, lng1: -2.265, name: "Salford" },
  { lat0: 53.430, lat1: 53.470, lng0: -2.255, lng1: -2.185, name: "Rusholme / Longsight" },
  { lat0: 53.400, lat1: 53.435, lng0: -2.255, lng1: -2.200, name: "Didsbury" },
  { lat0: 53.440, lat1: 53.480, lng0: -2.210, lng1: -2.120, name: "Gorton / Levenshulme" },
  { lat0: 53.440, lat1: 53.500, lng0: -2.120, lng1: -2.020, name: "Droylsden / Fairfield" },
  { lat0: 53.470, lat1: 53.535, lng0: -2.400, lng1: -2.310, name: "Eccles / Salford West" },
  { lat0: 53.500, lat1: 53.560, lng0: -2.400, lng1: -2.300, name: "Swinton / Walkden" },
  { lat0: 53.555, lat1: 53.620, lng0: -2.470, lng1: -2.370, name: "Bolton" },
  { lat0: 53.390, lat1: 53.430, lng0: -2.200, lng1: -2.120, name: "Stockport North" },
  { lat0: 53.355, lat1: 53.395, lng0: -2.180, lng1: -2.080, name: "Hazel Grove / Offerton" },
  { lat0: 53.440, lat1: 53.480, lng0: -2.430, lng1: -2.340, name: "Stretford / Sale" },
  { lat0: 53.430, lat1: 53.460, lng0: -2.440, lng1: -2.360, name: "Urmston" },
  { lat0: 53.375, lat1: 53.415, lng0: -2.310, lng1: -2.215, name: "Wythenshawe" },
  { lat0: 53.490, lat1: 53.540, lng0: -2.460, lng1: -2.370, name: "Boothstown / Worsley" },
  { lat0: 53.490, lat1: 53.520, lng0: -2.530, lng1: -2.440, name: "Leigh" },
  { lat0: 53.445, lat1: 53.480, lng0: -2.090, lng1: -1.980, name: "Hyde / Tameside" },
  { lat0: 53.435, lat1: 53.470, lng0: -1.980, lng1: -1.890, name: "Mottram / Glossop" },
];

function getNeighbourhood(lat, lng) {
  for (const n of GM_NEIGHBOURHOODS) {
    if (lat >= n.lat0 && lat <= n.lat1 && lng >= n.lng0 && lng <= n.lng1) return n.name;
  }
  return "Greater Manchester";
}

// Stable colour per route (deterministic from name).
const ROUTE_PALETTE = [
  "#1D9E75", "#378ADD", "#D85A30", "#7F77DD", "#BA7517",
  "#0F6E56", "#639922", "#533490", "#B73D70", "#3D7BB7",
  "#C9602D", "#4D8E2E", "#7F2D88", "#8E2E4D", "#2E5F8E",
];
function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}
function routeColor(name) {
  return ROUTE_PALETTE[djb2(name) % ROUTE_PALETTE.length];
}

// Discrete delay colour for line + chip.
function delayColor(v) {
  if (v == null) return "#a8a8a0";
  if (v <= 2) return "#1D9E75";
  if (v <= 5) return "#EF9F27";
  return "#E24B4A";
}

function lerpHex(c1, c2, t) {
  const p = n => parseInt(n, 16);
  const r1 = p(c1.slice(1, 3)), g1 = p(c1.slice(3, 5)), b1 = p(c1.slice(5, 7));
  const r2 = p(c2.slice(1, 3)), g2 = p(c2.slice(3, 5)), b2 = p(c2.slice(5, 7));
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}
function lsoaFillColor(v) {
  const c = Math.max(0, Math.min(8, v));
  if (c <= 2) return lerpHex("#5DCAA5", "#EF9F27", c / 2);
  if (c <= 5) return lerpHex("#EF9F27", "#E24B4A", (c - 2) / 3);
  return            lerpHex("#E24B4A", "#8B1A1A", Math.min(1, (c - 5) / 3));
}

// Robust delay clip for charts/heatmaps so a few extreme outliers
// (e.g. 1440-min entries from missed trips) do not blow up axes.
function clipDelay(v, lim = 60) {
  if (v == null || isNaN(v)) return null;
  if (v >  lim) return  lim;
  if (v < -lim) return -lim;
  return v;
}

// ================================
// DEPENDENCY LOADING (Leaflet + Chart.js)
// ================================
function loadDelayDependencies() {
  return Promise.all([
    loadDelayStylesheet("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"),
    loadDelayScript("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"),
    loadDelayScript("https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"),
  ]);
}
function loadDelayScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load",  () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload  = () => { s.dataset.loaded = "1"; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
function loadDelayStylesheet(href) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) return resolve();
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = href;
    l.onload = resolve; l.onerror = reject;
    document.head.appendChild(l);
  });
}

// ================================
// SCOPED STYLES
// ================================
function injectDelayStyles() {
  if (document.getElementById("delay-dashboard-styles")) return;
  const s = document.createElement("style");
  s.id = "delay-dashboard-styles";
  s.textContent = `
    .dly-shell {
      --dly-bg-primary:   #ffffff;
      --dly-bg-secondary: #f5f5f0;
      --dly-bg-tertiary:  #eeebe3;
      --dly-text-primary:   #1a1a18;
      --dly-text-secondary: #5f5e5a;
      --dly-text-tertiary:  #88877f;
      --dly-border-light:  rgba(90,88,80,0.13);
      --dly-border-mid:    rgba(90,88,80,0.26);
      --dly-border-strong: rgba(90,88,80,0.40);
      --dly-success-bg: #eaf3de; --dly-success-fg: #3b6d11;
      --dly-warning-bg: #faeeda; --dly-warning-fg: #854f0b;
      --dly-danger-bg:  #fcebeb; --dly-danger-fg:  #a32d2d;
      --dly-radius-sm: 6px; --dly-radius-md: 8px; --dly-radius-lg: 12px;
      background: var(--dly-bg-tertiary);
      color: var(--dly-text-primary);
      border-radius: 14px;
      padding: 22px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.55;
      border: 0;
      min-height: 0;
      display: block;
      align-items: stretch;
      box-shadow: var(--shadow-soft, 0 10px 30px rgba(0,0,0,.05));
    }
    .dly-shell *, .dly-shell *::before, .dly-shell *::after {
      box-sizing: border-box;
    }

    .dly-tab-bar {
      display:flex; align-items:center; gap:4px;
      border-bottom:0.5px solid var(--dly-border-light);
      padding-bottom:10px; margin-bottom:16px; flex-wrap:wrap;
    }
    .dly-tab {
      padding:6px 14px; border-radius:var(--dly-radius-md);
      border:none; background:transparent; cursor:pointer;
      font-size:13px; font-weight:500; color:var(--dly-text-secondary);
      transition:background .12s; font-family:inherit;
    }
    .dly-tab.on  { background:var(--dly-bg-secondary); color:var(--dly-text-primary); }
    .dly-tab.dim { opacity:.38; cursor:default; pointer-events:none; }
    .dly-breadcrumb { margin-left:auto; font-size:11px; color:var(--dly-text-tertiary); }

    .dly-period-bar { display:flex; align-items:center; gap:5px; flex-wrap:wrap; margin-bottom:14px; }
    .dly-ptab {
      padding:5px 12px; border-radius:20px;
      border:0.5px solid var(--dly-border-mid); background:transparent;
      cursor:pointer; font-size:12px; font-weight:500;
      color:var(--dly-text-secondary); white-space:nowrap;
      transition:all .12s; font-family:inherit;
    }
    .dly-ptab.on { background:var(--dly-bg-secondary); color:var(--dly-text-primary); border-color:transparent; }

    .dly-kpi-grid {
      display:grid; grid-template-columns:repeat(4,minmax(0,1fr));
      gap:8px; margin-bottom:14px;
    }
    @media(max-width:560px){ .dly-kpi-grid{grid-template-columns:repeat(2,1fr);} }
    .dly-mc {
      background:var(--dly-bg-secondary);
      border-radius:var(--dly-radius-md);
      padding:10px 12px; min-width:0;
    }
    .dly-mc-lbl { font-size:11px; color:var(--dly-text-secondary); margin-bottom:3px; }
    .dly-mc-val { font-size:20px; font-weight:600; color:var(--dly-text-primary); }
    .dly-mc-val.sm { font-size:13px; line-height:1.5; font-weight:500; }

    .dly-net-layout {
      display:grid; grid-template-columns:1fr 280px;
      gap:14px; align-items:start;
    }
    @media(max-width:760px){ .dly-net-layout{grid-template-columns:1fr;} }

    .dly-mapN, .dly-mapR {
      width:100%;
      border-radius:var(--dly-radius-lg);
      border:0.5px solid var(--dly-border-mid);
      overflow:hidden;
    }
    .dly-mapN { height:420px; }
    .dly-mapR { height:260px; margin-bottom:14px; }
    .dly-map-note { font-size:11px; color:var(--dly-text-tertiary); margin-bottom:4px; }
    .dly-shell .leaflet-container { background:#e8e3d9; font-family:inherit; }
    .dly-shell .leaflet-control-zoom a {
      background:var(--dly-bg-primary)!important;
      color:var(--dly-text-primary)!important;
      border-color:var(--dly-border-mid)!important;
    }
    .dly-tt {
      background:var(--dly-bg-primary)!important;
      border:0.5px solid var(--dly-border-light)!important;
      border-radius:5px!important;
      padding:3px 8px!important;
      font-size:11px!important;
      color:var(--dly-text-primary)!important;
      box-shadow:none!important;
      white-space:nowrap; line-height:1.5;
    }
    .dly-tt::before { display:none!important; }

    .dly-map-toolbar {
      display:flex; align-items:center; gap:6px;
      flex-wrap:wrap; margin-top:7px;
    }
    .dly-map-legend { display:flex; gap:12px; flex-wrap:wrap; }
    .dly-leg-item {
      font-size:11px; color:var(--dly-text-secondary);
      display:flex; align-items:center; gap:4px;
    }
    .dly-leg-line {
      width:22px; height:3px; border-radius:2px;
      display:inline-block; flex-shrink:0;
    }

    .dly-lsoa-btn {
      padding:4px 11px; border-radius:20px;
      border:0.5px solid var(--dly-border-mid);
      background:transparent; cursor:pointer;
      font-size:11px; font-weight:500;
      color:var(--dly-text-secondary);
      transition:all .15s; white-space:nowrap;
      margin-left:auto; font-family:inherit;
    }
    .dly-lsoa-btn.on {
      background:var(--dly-bg-secondary);
      color:var(--dly-text-primary);
      border-color:var(--dly-border-strong);
    }

    .dly-lsoa-legend {
      display:none; align-items:center; gap:8px;
      margin-top:6px; flex-wrap:wrap;
    }
    .dly-lsoa-grad {
      width:110px; height:7px; border-radius:4px;
      background:linear-gradient(to right,#5DCAA5,#EF9F27,#E24B4A,#8B1A1A);
      flex-shrink:0;
    }
    .dly-lsoa-leg-lbl { font-size:11px; color:var(--dly-text-secondary); }

    .dly-lsoa-info {
      display:none; margin-top:8px;
      padding:10px 14px; border-radius:var(--dly-radius-md);
      background:var(--dly-bg-secondary);
      border-left:3px solid #EF9F27;
    }
    .dly-lsoa-info-head { font-size:11px; color:var(--dly-text-secondary); margin-bottom:5px; }
    .dly-lsoa-info-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; }
    .dly-lsoa-info-cell .label { font-size:10px; color:var(--dly-text-tertiary); }
    .dly-lsoa-info-cell .value { font-size:14px; font-weight:600; color:var(--dly-text-primary); }

    .dly-league-hdr {
      display:flex; align-items:center; justify-content:space-between;
      margin-bottom:6px;
    }
    .dly-sort-sel {
      font-size:11px; border:0.5px solid var(--dly-border-mid);
      border-radius:5px; padding:2px 5px;
      background:var(--dly-bg-primary);
      color:var(--dly-text-primary);
      font-family:inherit;
    }
    .dly-league {
      max-height:420px; overflow-y:auto; padding-right:4px;
    }
    .dly-lrow {
      display:flex; align-items:center; gap:8px;
      padding:7px 8px; border-radius:var(--dly-radius-md);
      cursor:pointer; transition:background .1s;
    }
    .dly-lrow:hover { background:var(--dly-bg-secondary); }
    .dly-lrow-bar {
      height:3px; border-radius:2px;
      background:var(--dly-border-light);
      margin-top:3px; position:relative;
    }
    .dly-lrow-fill {
      position:absolute; left:0; top:0; height:100%; border-radius:2px;
    }

    .dly-back-btn {
      display:inline-flex; align-items:center; gap:5px;
      font-size:12px; color:var(--dly-text-secondary);
      cursor:pointer; padding:4px 0;
      border:none; background:transparent;
      margin-bottom:8px; font-family:inherit;
    }
    .dly-back-btn:hover { color:var(--dly-text-primary); }
    .dly-route-hdr {
      display:flex; align-items:center; gap:10px;
      margin-bottom:14px; flex-wrap:wrap;
    }
    .dly-route-title { font-size:15px; font-weight:600; }
    .dly-route-op    { font-size:12px; color:var(--dly-text-secondary); }

    .dly-srch-wrap { position:relative; margin-bottom:12px; }
    .dly-srch-input {
      width:100%; padding:8px 12px;
      border:0.5px solid var(--dly-border-mid);
      border-radius:var(--dly-radius-md);
      font-size:13px;
      background:var(--dly-bg-primary);
      color:var(--dly-text-primary);
      font-family:inherit;
    }
    .dly-srch-input:focus { outline:none; border-color:var(--dly-border-strong); }
    .dly-srch-wrap.is-open { z-index:9999; }
    .dly-srch-drop {
      display:none; position:absolute;
      top:calc(100% + 3px); left:0; right:0; z-index:9999;
      background:#ffffff;
      border:0.5px solid var(--dly-border-mid);
      border-radius:var(--dly-radius-md);
      max-height:280px; overflow-y:auto;
      box-shadow:0 8px 24px rgba(0,0,0,0.12);
    }
    .dly-srow {
      padding:6px 12px; cursor:pointer;
      font-size:13px; color:var(--dly-text-primary);
      background:#ffffff;
    }
    .dly-srow:hover, .dly-srow.hl { background:var(--dly-bg-secondary); }

    .dly-dir-toggle {
      display:inline-flex; gap:4px; align-items:center;
      margin-left:6px;
    }
    .dly-dir-pill {
      padding:3px 10px; border-radius:14px;
      border:0.5px solid var(--dly-border-mid);
      background:transparent; cursor:pointer;
      font-size:11px; font-weight:500;
      color:var(--dly-text-secondary);
      font-family:inherit; transition:all .12s;
    }
    .dly-dir-pill.on {
      background:var(--dly-bg-secondary);
      color:var(--dly-text-primary);
      border-color:var(--dly-border-strong);
    }
    .dly-dir-pill:not(.on):hover { color:var(--dly-text-primary); }

    .dly-rbar {
      display:flex; align-items:center;
      overflow-x:auto; padding:3px 0; margin-bottom:12px;
      gap:0; scrollbar-width:none;
    }
    .dly-rbar::-webkit-scrollbar { display:none; }

    .dly-stop-meta {
      display:flex; align-items:baseline;
      gap:10px; margin-bottom:14px;
    }
    .dly-stop-name { font-size:15px; font-weight:600; }
    .dly-stop-sub  { font-size:12px; color:var(--dly-text-secondary); }

    .dly-scatter-ctrl {
      display:flex; align-items:center; justify-content:space-between;
      margin-bottom:6px; flex-wrap:wrap; gap:6px;
    }
    .dly-pleg-row { display:flex; flex-wrap:wrap; gap:10px; }
    .dly-pleg {
      font-size:11px; color:var(--dly-text-secondary);
      display:flex; align-items:center; gap:4px;
    }
    .dly-pleg-dot {
      width:8px; height:8px; border-radius:2px;
      display:inline-block; flex-shrink:0;
    }
    .dly-day-btns { display:flex; gap:4px; flex-shrink:0; }
    .dly-dt {
      padding:4px 10px; border-radius:var(--dly-radius-sm);
      border:0.5px solid var(--dly-border-mid);
      font-size:12px; cursor:pointer;
      background:transparent;
      color:var(--dly-text-secondary);
      font-family:inherit;
    }
    .dly-dt.on {
      background:var(--dly-bg-secondary);
      color:var(--dly-text-primary);
      border-color:var(--dly-border-strong);
    }
    .dly-chart-wrap {
      position:relative; width:100%; height:240px; margin-bottom:4px;
    }
    .dly-chart-note {
      font-size:11px; color:var(--dly-text-tertiary); margin-bottom:20px;
    }

    .dly-hm-title {
      font-size:12px; font-weight:600;
      color:var(--dly-text-secondary); margin-bottom:8px;
    }
    .dly-hm { overflow-x:auto; }
    .dly-hm table {
      width:100%; border-collapse:separate;
      border-spacing:3px; min-width:360px;
    }
    .dly-hm th {
      font-size:11px; font-weight:500;
      color:var(--dly-text-secondary); padding:0 4px 8px;
    }
    .dly-hm th:first-child { text-align:left; width:130px; }
    .dly-hm th:last-child  { width:55px; text-align:center; }
    .dly-hm th:not(:first-child):not(:last-child) { text-align:center; }
    .dly-hm-cell { padding:7px 10px; border-radius:var(--dly-radius-sm); }
    .dly-hm-val  { font-size:13px; font-weight:600; }
    .dly-hm-bar  { height:3px; border-radius:2px; margin-top:5px; opacity:.35; }
    .dly-hml { display:flex; gap:12px; flex-wrap:wrap; margin-top:10px; margin-bottom:8px; }
    .dly-hml-item {
      display:flex; align-items:center; gap:5px;
      font-size:11px; color:var(--dly-text-secondary);
    }
    .dly-hml-swatch {
      width:10px; height:10px; border-radius:2px;
      display:inline-block; flex-shrink:0; opacity:.75;
    }

    .dly-loading {
      padding:60px 20px; text-align:center;
      color:var(--dly-text-secondary); font-size:13px;
    }
    .dly-spinner {
      width:28px; height:28px; margin:0 auto 12px;
      border:3px solid var(--dly-border-light);
      border-top-color:var(--dly-text-primary);
      border-radius:50%;
      animation:dly-spin .8s linear infinite;
    }
    @keyframes dly-spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(s);
}

// ================================
// MAIN ENTRY
// ================================
function initDelaySection() {
  const root = document.getElementById("delay-dashboard");
  if (!root) return;
  injectDelayStyles();
  root.classList.add("dly-shell");
  root.innerHTML = `<div class="dly-loading"><div class="dly-spinner"></div>Loading delay dashboard…</div>`;

  loadDelayDependencies()
    .then(() => fetch(DELAY_PATHS.network).then(r => {
      if (!r.ok) throw new Error("Failed to load " + DELAY_PATHS.network);
      return r.json();
    }))
    .then(data => bootDelayDashboard(root, data))
    .catch(err => {
      console.error("[delay] init failed:", err);
      root.innerHTML = `<div class="dly-loading">Delay dashboard failed to load.<br><small>${err.message || err}</small></div>`;
    });
}

// ================================
// DASHBOARD BOOT
// ================================
function bootDelayDashboard(root, payload) {
  const ROUTES_LIST = payload.routes;
  if (!ROUTES_LIST || ROUTES_LIST.length === 0) {
    root.innerHTML = `<div class="dly-loading">No routes available.</div>`;
    return;
  }

  // v4 emits one record per (route_short_name, direction_id) and ships a
  // composite `key`. Older v2/v3 payloads are keyed by short_name only.
  const ROUTES = {};
  ROUTES_LIST.forEach(r => { ROUTES[r.key || r.name] = r; });

  // Display helpers ------------------------------------------------
  function routeLabel(r) {
    if (!r) return "—";
    return r.direction_id != null ? `Route ${r.name} · dir ${r.direction_id}` : `Route ${r.name}`;
  }
  function fmtMin(v)  { return v == null ? "—" : v.toFixed(1) + " min"; }
  function fmtPct(v)  { return v == null ? "—" : v.toFixed(0) + "%"; }

  root.innerHTML = `
    <div class="dly-tab-bar">
      <button class="dly-tab on"  id="dly-tN">Network overview</button>
      <button class="dly-tab dim" id="dly-tR">Route detail</button>
      <span class="dly-breadcrumb" id="dly-breadcrumb">GM network · all routes</span>
    </div>

    <div id="dly-layerN">
      <div class="dly-period-bar">
        <span style="font-size:12px;color:var(--dly-text-secondary);margin-right:2px">period:</span>
        <button class="dly-ptab on" data-pi="-1">all day</button>
        <button class="dly-ptab" data-pi="0">AM off-peak</button>
        <button class="dly-ptab" data-pi="1">AM peak</button>
        <button class="dly-ptab" data-pi="2">Midday</button>
        <button class="dly-ptab" data-pi="3">PM peak</button>
        <button class="dly-ptab" data-pi="4">PM off-peak</button>
      </div>

      <div class="dly-kpi-grid">
        <div class="dly-mc"><div class="dly-mc-lbl">network median delay</div><div class="dly-mc-val" id="dly-kpi1">—</div></div>
        <div class="dly-mc"><div class="dly-mc-lbl">routes on-time &gt; 30%</div><div class="dly-mc-val" id="dly-kpi2">—</div></div>
        <div class="dly-mc"><div class="dly-mc-lbl">worst route</div><div class="dly-mc-val sm" id="dly-kpi3">—</div></div>
        <div class="dly-mc"><div class="dly-mc-lbl">best route</div><div class="dly-mc-val sm" id="dly-kpi4">—</div></div>
      </div>

      <div class="dly-srch-wrap" style="margin-bottom:14px">
        <input class="dly-srch-input" id="dly-netSrch" type="text"
               placeholder="Search any route or stop…" autocomplete="off">
        <div class="dly-srch-drop" id="dly-netSdrop"></div>
      </div>

      <div class="dly-net-layout">
        <div>
          <div class="dly-map-note">routes coloured by median delay · click route or LSOA to drill in</div>
          <div class="dly-mapN" id="dly-mapN"></div>

          <div class="dly-map-toolbar">
            <div class="dly-map-legend">
              <span class="dly-leg-item"><span class="dly-leg-line" style="background:#1D9E75"></span>≤ 2 min</span>
              <span class="dly-leg-item"><span class="dly-leg-line" style="background:#EF9F27"></span>2 – 5 min</span>
              <span class="dly-leg-item"><span class="dly-leg-line" style="background:#E24B4A"></span>&gt; 5 min</span>
            </div>
            <button class="dly-lsoa-btn" id="dly-lsoaToggle">+ heatmap overlay</button>
          </div>

          <div class="dly-lsoa-legend" id="dly-lsoaLegend">
            <span class="dly-lsoa-leg-lbl">heatmap median delay:</span>
            <span class="dly-lsoa-leg-lbl">0 min</span>
            <div class="dly-lsoa-grad"></div>
            <span class="dly-lsoa-leg-lbl">7+ min</span>
            <span style="font-size:11px;color:var(--dly-text-tertiary);margin-left:4px">(opacity = stop coverage)</span>
          </div>

          <div class="dly-lsoa-info" id="dly-lsoaInfo">
            <div class="dly-lsoa-info-head" id="dly-lsoaInfoHead">click a heatmap cell for details</div>
            <div class="dly-lsoa-info-grid" id="dly-lsoaInfoGrid"></div>
          </div>
        </div>

        <div>
          <div class="dly-league-hdr">
            <span style="font-size:12px;font-weight:600;color:var(--dly-text-secondary)">route ranking</span>
            <select class="dly-sort-sel" id="dly-sortSel">
              <option value="delay">by delay</option>
              <option value="otp">by on-time %</option>
              <option value="name">by route number</option>
            </select>
          </div>
          <div class="dly-league" id="dly-league"></div>
        </div>
      </div>
    </div>

    <div id="dly-layerR" style="display:none">
      <button class="dly-back-btn" id="dly-backBtn">← back to network</button>

      <div class="dly-route-hdr">
        <span class="dly-route-title" id="dly-rTitle">—</span>
        <span class="dly-dir-toggle" id="dly-dirToggle"></span>
        <span class="dly-route-op"    id="dly-rOp">—</span>
      </div>

      <div class="dly-srch-wrap">
        <input class="dly-srch-input" id="dly-sinput" type="text"
               placeholder="Search or click a stop on the map…" autocomplete="off">
        <div class="dly-srch-drop" id="dly-sdrop"></div>
      </div>

      <div class="dly-mapR" id="dly-mapR"></div>
      <div class="dly-rbar" id="dly-rbar"></div>

      <div class="dly-stop-meta">
        <span class="dly-stop-name" id="dly-cs">—</span>
        <span class="dly-stop-sub"  id="dly-csub">—</span>
      </div>

      <div class="dly-kpi-grid">
        <div class="dly-mc"><div class="dly-mc-lbl">median delay</div><div class="dly-mc-val" id="dly-m1">—</div></div>
        <div class="dly-mc"><div class="dly-mc-lbl">on-time ≤ 2 min</div><div class="dly-mc-val" id="dly-m2">—</div></div>
        <div class="dly-mc"><div class="dly-mc-lbl">worst period</div><div class="dly-mc-val sm" id="dly-m3">—</div></div>
        <div class="dly-mc"><div class="dly-mc-lbl">best period</div><div class="dly-mc-val sm" id="dly-m4">—</div></div>
      </div>

      <div class="dly-scatter-ctrl">
        <div class="dly-pleg-row">
          ${DELAY_PERIODS.map(p =>
            `<span class="dly-pleg"><span class="dly-pleg-dot" style="background:${p.c}"></span>${p.lbl}</span>`
          ).join("")}
        </div>
        <div class="dly-day-btns">
          <button class="dly-dt on" id="dly-bWD">weekday</button>
          <button class="dly-dt"    id="dly-bWE">weekend</button>
        </div>
      </div>

      <div class="dly-chart-wrap"><canvas id="dly-sc"></canvas></div>
      <div class="dly-chart-note">y = 0 on-time · + delayed · − early · each dot = a sampled trip · clipped to ±60 min</div>

      <div class="dly-hm-title">median delay by period × week type (min)</div>
      <div class="dly-hm" id="dly-hm"></div>
      <div class="dly-hml" id="dly-hml"></div>
    </div>
  `;

  const $ = id => root.querySelector("#" + id);

  // ---------------- network state ----------------
  let curPeriod = -1;
  let mapN = null;
  const routeLayersN = {};
  let lsoaLayer = null;
  let lsoaVisible = false;

  function periodKey(pi) { return pi < 0 ? "all" : DELAY_PERIOD_KEYS[pi]; }

  function getRouteMean(key, pi) {
    // The JSON stores the route-level value as `median` (v4); v2/v3 used `mean`.
    const p = ROUTES[key]?.periods?.[periodKey(pi)];
    return p ? (p.median ?? p.mean ?? null) : null;
  }
  function getRouteOTP(key, pi) {
    return ROUTES[key]?.periods?.[periodKey(pi)]?.otp ?? null;
  }

  function setPeriod(pi) {
    curPeriod = pi;
    root.querySelectorAll(".dly-ptab").forEach(b => {
      const match = parseInt(b.dataset.pi, 10) === pi;
      b.classList.toggle("on", match);
      if (match && pi >= 0) {
        const c = DELAY_PERIODS[pi].c;
        b.style.cssText = `background:${c}33;color:var(--dly-text-primary);border-color:${c}77`;
      } else if (match) {
        b.style.cssText = "background:var(--dly-bg-secondary);color:var(--dly-text-primary);border-color:transparent";
      } else {
        b.style.cssText = "";
      }
    });
    updateNetworkKPIs();
    renderLeague();
    updateNetworkMapColors();
    if (lsoaVisible) renderLSOALayer();
  }

  function updateNetworkKPIs() {
    const keys = Object.keys(ROUTES);
    // Routes with data in the current period.
    const active = keys.filter(k => getRouteMean(k, curPeriod) != null);
    if (!active.length) {
      ["dly-kpi1","dly-kpi2","dly-kpi3","dly-kpi4"].forEach(id => $(id).textContent = "—");
      return;
    }
    const means = active.map(k => getRouteMean(k, curPeriod));
    const avg = means.reduce((a, b) => a + b, 0) / means.length;
    const otps = active.map(k => getRouteOTP(k, curPeriod)).filter(v => v != null);
    const goodCount = otps.filter(v => v >= 30).length;

    let wk = active[0], bk = active[0];
    active.forEach(k => {
      const m = getRouteMean(k, curPeriod);
      if (m > getRouteMean(wk, curPeriod)) wk = k;
      if (m < getRouteMean(bk, curPeriod)) bk = k;
    });
    $("dly-kpi1").textContent = avg.toFixed(1) + " min";
    $("dly-kpi2").textContent = `${goodCount} / ${active.length}`;
    $("dly-kpi3").textContent = `${routeLabel(ROUTES[wk])} · ${getRouteMean(wk, curPeriod).toFixed(1)} min`;
    $("dly-kpi4").textContent = `${routeLabel(ROUTES[bk])} · ${getRouteMean(bk, curPeriod).toFixed(1)} min`;

    const k1 = document.getElementById("delay-kpi-1");
    const k2 = document.getElementById("delay-kpi-2");
    const k3 = document.getElementById("delay-kpi-3");
    if (k1) k1.textContent = avg.toFixed(1) + " min";
    if (k2) k2.textContent = routeLabel(ROUTES[wk]);
    if (k3) k3.textContent = routeLabel(ROUTES[bk]);
  }

  function renderLeague() {
    const sort = $("dly-sortSel").value;
    const rows = Object.keys(ROUTES).map(key => ({
      key,
      name: ROUTES[key].name,
      dirId: ROUTES[key].direction_id,
      m:   getRouteMean(key, curPeriod),
      otp: getRouteOTP(key, curPeriod),
    }));
    // Records with no data in this period sink to the bottom of delay/otp
    // sorts; the alphabetical/numeric sort always orders strictly by name.
    const cmpDelay = (a, b) => (b.m   ?? -Infinity) - (a.m   ?? -Infinity);
    const cmpOtp   = (a, b) => (a.otp ??  Infinity) - (b.otp ??  Infinity);
    const cmpName  = (a, b) => {
      const byName = String(a.name).localeCompare(String(b.name),
        undefined, { numeric: true, sensitivity: "base" });
      if (byName !== 0) return byName;
      // Tie-break on direction so 192-0 comes before 192-1.
      return String(a.dirId ?? "").localeCompare(String(b.dirId ?? ""),
        undefined, { numeric: true });
    };
    const cmp = sort === "delay" ? cmpDelay
              : sort === "otp"   ? cmpOtp
              :                    cmpName;
    rows.sort(cmp);
    const mx = Math.max(0.5, ...rows.map(r => r.m ?? 0));
    $("dly-league").innerHTML = rows.map((r, rank) => {
      const dc = delayColor(r.m);
      const bw = r.m == null ? 0 : Math.round(r.m / mx * 100);
      const rc = routeColor(r.name);
      const dirBadge = r.dirId != null
        ? `<span style="font-size:10px;color:var(--dly-text-tertiary);font-weight:500">dir ${r.dirId}</span>`
        : "";
      const otpStr = r.otp == null ? "no service" : `${r.otp.toFixed(0)}% on-time`;
      const valStr = r.m == null ? "—" : r.m.toFixed(1);
      return `<div class="dly-lrow" data-key="${r.key}">
        <span style="font-size:11px;color:var(--dly-text-tertiary);width:18px;text-align:right;flex-shrink:0">${rank + 1}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:12px;font-weight:600;color:${rc}">Route ${r.name}</span>
            ${dirBadge}
            <span style="font-size:11px;color:var(--dly-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${otpStr}</span>
          </div>
          <div class="dly-lrow-bar"><div class="dly-lrow-fill" style="width:${bw}%;background:${dc}"></div></div>
        </div>
        <span style="font-size:12px;font-weight:600;color:${dc};flex-shrink:0;min-width:42px;text-align:right">${valStr}</span>
      </div>`;
    }).join("");
    $("dly-league").querySelectorAll(".dly-lrow").forEach(el => {
      el.addEventListener("click", () => goRoute(el.dataset.key));
    });
  }

  function initNetworkMap() {
    if (mapN) return;
    mapN = L.map($("dly-mapN"), { zoomControl: true, attributionControl: false });
    mapN.setView([53.49, -2.26], 10);
    L.tileLayer(
      "https://basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, opacity: 0.65 }
    ).addTo(mapN);
    L.tileLayer(
      "https://basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, opacity: 0.85, pane: "shadowPane" }
    ).addTo(mapN);

    // GM Local Authority Districts — context layer underneath the routes.
    loadLAD().then(() => {
      if (!ladFeatures || !ladFeatures.length) return;
      ladLayer = L.geoJSON({ type: "FeatureCollection", features: ladFeatures }, {
        style: () => ({
          color:       "#5f5e5a",
          weight:      0.8,
          opacity:     0.55,
          fillColor:   "#d8d3c5",
          fillOpacity: 0.18,
        }),
        onEachFeature: (f, layer) => {
          const nm = f.properties && f.properties.LADNM;
          if (nm) layer.bindTooltip(nm, { className: "dly-tt", sticky: true });
        },
      }).addTo(mapN);
      // Make sure routes (and any heatmap cells) sit above the LAD fill.
      Object.values(routeLayersN).forEach(({ pl, endM }) => { pl.bringToFront(); endM.bringToFront(); });
    });

    Object.keys(ROUTES).forEach(key => {
      const r = ROUTES[key];
      const m = getRouteMean(key, curPeriod);
      const dc = delayColor(m);
      const coords = (r.path && r.path.length >= 2)
        ? r.path
        : r.stops.map(s => [s.lat, s.lon]);
      if (coords.length < 2) return;
      const pl = L.polyline(coords, { color: dc, weight: 4, opacity: 0.85 }).addTo(mapN);
      const endCoord = r.stops.length
        ? [r.stops[r.stops.length - 1].lat, r.stops[r.stops.length - 1].lon]
        : coords[coords.length - 1];
      const dirLine = r.direction
        ? `<span style="color:var(--dly-text-secondary)">dir ${r.direction_id ?? "—"} · ${r.direction}</span><br>`
        : "";
      pl.bindTooltip(
        `<b>${routeLabel(r)}</b><br>${dirLine}${r.stops.length} stops<br>median delay: ${fmtMin(m)}`,
        { className: "dly-tt", sticky: true }
      );
      pl.on("click", () => goRoute(key));
      const endM = L.circleMarker(endCoord, {
        radius: 4, fillColor: dc, color: "#fff", weight: 1.5, fillOpacity: 1,
      }).addTo(mapN);
      routeLayersN[key] = { pl, endM };
    });
  }

  function updateNetworkMapColors() {
    if (!mapN) return;
    Object.keys(ROUTES).forEach(key => {
      const m = getRouteMean(key, curPeriod);
      const dc = delayColor(m);
      const lyr = routeLayersN[key];
      if (!lyr) return;
      lyr.pl.setStyle({ color: dc });
      lyr.endM.setStyle({ fillColor: dc });
      const r2 = ROUTES[key];
      const dirLine2 = r2.direction
        ? `<span style="color:var(--dly-text-secondary)">dir ${r2.direction_id ?? "—"} · ${r2.direction}</span><br>`
        : "";
      lyr.pl.setTooltipContent(
        `<b>${routeLabel(r2)}</b><br>${dirLine2}${r2.stops.length} stops<br>median delay: ${fmtMin(m)}`
      );
    });
  }

  // ---------------- LAD context layer ----------------
  // Local Authority Districts (10 GM districts) — light boundary layer used
  // as geographic context behind the routes, and as the source of the
  // place name shown on each heatmap cell.
  let ladFeatures = null;     // raw geojson features (lng,lat coords)
  let ladLayer    = null;     // leaflet layer
  let ladLoading  = null;

  function loadLAD() {
    if (ladFeatures) return Promise.resolve(ladFeatures);
    if (ladLoading)  return ladLoading;
    ladLoading = fetch(DELAY_PATHS.lad)
      .then(r => r.ok ? r.json() : null)
      .then(gj => { ladFeatures = (gj && gj.features) || []; return ladFeatures; })
      .catch(() => { ladFeatures = []; return ladFeatures; });
    return ladLoading;
  }

  function pointInRing(pt, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > pt[1]) !== (yj > pt[1])) &&
        (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
  function ladForPoint(lng, lat) {
    if (!ladFeatures) return null;
    const pt = [lng, lat];
    for (const f of ladFeatures) {
      const g = f.geometry;
      if (!g) continue;
      if (g.type === "Polygon") {
        if (pointInRing(pt, g.coordinates[0])) return f.properties.LADNM;
      } else if (g.type === "MultiPolygon") {
        for (const poly of g.coordinates) {
          if (pointInRing(pt, poly[0])) return f.properties.LADNM;
        }
      }
    }
    return null;
  }

  // ---------------- heatmap grid overlay ----------------
  const LSOA_LAT_MIN = 53.34, LSOA_LAT_MAX = 53.64, LSOA_DLAT = 0.022;
  const LSOA_LNG_MIN = -2.78, LSOA_LNG_MAX = -1.88, LSOA_DLNG = 0.036;
  const LSOA_RADIUS_KM = 3.2;

  function getAllStopsWithDelay() {
    const out = [];
    Object.keys(ROUTES).forEach(key => {
      const r = ROUTES[key];
      const m = getRouteMean(key, curPeriod);
      if (m == null) return;
      r.stops.forEach(s => {
        out.push({ lat: s.lat, lng: s.lon, delay: m, route: r.name });
      });
    });
    return out;
  }

  function buildLSOAFeatures() {
    const stops = getAllStopsWithDelay();
    const features = [];
    for (let lat = LSOA_LAT_MIN; lat < LSOA_LAT_MAX; lat += LSOA_DLAT) {
      for (let lng = LSOA_LNG_MIN; lng < LSOA_LNG_MAX; lng += LSOA_DLNG) {
        const cLat = lat + LSOA_DLAT / 2;
        const cLng = lng + LSOA_DLNG / 2;
        let wSum = 0, dSum = 0, count = 0;
        const contributing = [];
        for (const s of stops) {
          const dlat = (s.lat - cLat) * 111.0;
          const dlng = (s.lng - cLng) * 66.5;
          const dist = Math.sqrt(dlat * dlat + dlng * dlng);
          if (dist < LSOA_RADIUS_KM) {
            const w = 1 / Math.max(0.15, dist);
            dSum += s.delay * w;
            wSum += w;
            count++;
            if (!contributing.includes(s.route)) contributing.push(s.route);
          }
        }
        if (wSum === 0) continue;
        const delay = dSum / wSum;
        const opacity = Math.min(0.68, 0.28 + count * 0.012);
        // Prefer the actual LAD name from gm_lad; fall back to the
        // hand-curated neighbourhood lookup if the LAD layer hasn't loaded.
        const area = ladForPoint(cLng, cLat) || getNeighbourhood(cLat, cLng);
        features.push({
          type: "Feature",
          properties: {
            area, delay, count, opacity,
            routes: contributing.slice(0, 8).join(", ") + (contributing.length > 8 ? `, +${contributing.length - 8}` : ""),
          },
          geometry: {
            type: "Polygon",
            coordinates: [[
              [lng,             lat],
              [lng + LSOA_DLNG, lat],
              [lng + LSOA_DLNG, lat + LSOA_DLAT],
              [lng,             lat + LSOA_DLAT],
              [lng,             lat],
            ]],
          },
        });
      }
    }
    return features;
  }

  function renderLSOALayer() {
    if (lsoaLayer) { mapN.removeLayer(lsoaLayer); lsoaLayer = null; }
    const features = buildLSOAFeatures();
    const gj = { type: "FeatureCollection", features };
    lsoaLayer = L.geoJSON(gj, {
      style: f => ({
        fillColor:   lsoaFillColor(f.properties.delay),
        fillOpacity: f.properties.opacity,
        weight:      0.4,
        color:       "#ffffff",
        opacity:     0.5,
      }),
      onEachFeature: (f, layer) => {
        const p = f.properties;
        const tip = `<b>${p.area}</b><br>`
                  + `Median delay: <b>${p.delay.toFixed(1)} min</b><br>`
                  + `Stops within ${LSOA_RADIUS_KM} km: ${p.count}<br>`
                  + `Routes: ${p.routes || "—"}`;
        layer.bindTooltip(tip, { className: "dly-tt", sticky: true });
        layer.on("click", () => showLSOAInfo(p));
      },
    }).addTo(mapN);
    Object.values(routeLayersN).forEach(({ pl, endM }) => {
      pl.bringToFront(); endM.bringToFront();
    });
  }

  function toggleLSOA() {
    lsoaVisible = !lsoaVisible;
    const btn = $("dly-lsoaToggle");
    const leg = $("dly-lsoaLegend");
    const inf = $("dly-lsoaInfo");
    if (lsoaVisible) {
      // Wait for LAD features so cells get a real LAD name instead of the
      // fallback neighbourhood label.
      loadLAD().then(() => renderLSOALayer());
      btn.textContent = "× heatmap overlay";
      btn.classList.add("on");
      leg.style.display = "flex";
      inf.style.display = "block";
    } else {
      if (lsoaLayer) { mapN.removeLayer(lsoaLayer); lsoaLayer = null; }
      btn.textContent = "+ heatmap overlay";
      btn.classList.remove("on");
      leg.style.display = "none";
      inf.style.display = "none";
    }
  }

  function showLSOAInfo(p) {
    $("dly-lsoaInfoHead").textContent = p.area;
    $("dly-lsoaInfoGrid").innerHTML = `
      <div class="dly-lsoa-info-cell">
        <div class="label">median delay</div>
        <div class="value" style="color:${lsoaFillColor(p.delay)}">${p.delay.toFixed(1)} min</div>
      </div>
      <div class="dly-lsoa-info-cell">
        <div class="label">nearby stops</div>
        <div class="value">${p.count}</div>
      </div>
      <div class="dly-lsoa-info-cell">
        <div class="label">routes</div>
        <div class="value" style="font-size:12px">${p.routes || "—"}</div>
      </div>`;
  }

  // ---------------- route detail state ----------------
  let curRoute = null;
  let curSI = 0;
  let curDay = "weekday";
  let chartObj = null;
  let mapR = null, rPolyline = null, rStopMarkers = [];
  let detailsCache = null;
  let detailsLoading = null;

  function loadDetails() {
    if (detailsCache) return Promise.resolve(detailsCache);
    if (detailsLoading) return detailsLoading;
    detailsLoading = fetch(DELAY_PATHS.details)
      .then(r => {
        if (!r.ok) throw new Error("Failed to load " + DELAY_PATHS.details);
        return r.json();
      })
      .then(d => { detailsCache = d; return d; });
    return detailsLoading;
  }

  function goNetwork() {
    $("dly-layerN").style.display = "";
    $("dly-layerR").style.display = "none";
    $("dly-tN").className = "dly-tab on";
    $("dly-tR").className = "dly-tab dim";
    $("dly-breadcrumb").textContent = "GM network · all routes";
    setTimeout(() => { initNetworkMap(); if (mapN) mapN.invalidateSize(); }, 60);
  }

  function goRoute(key) {
    if (!ROUTES[key]) return;
    curRoute = key; curSI = 0;
    $("dly-layerN").style.display = "none";
    $("dly-layerR").style.display = "";
    $("dly-tN").className = "dly-tab";
    $("dly-tR").className = "dly-tab on";
    const r = ROUTES[key];
    const rc = routeColor(r.name);
    const dirLabel = r.direction || (r.terminus_from && r.terminus_to
                       ? `${r.terminus_from} → ${r.terminus_to}` : null);
    $("dly-breadcrumb").textContent = `${routeLabel(r)} · ${r.stops.length} stops`;
    $("dly-rTitle").textContent = routeLabel(r);
    $("dly-rTitle").style.color = rc;
    $("dly-rOp").textContent =
      (dirLabel ? `${dirLabel} · ` : "")
      + `${r.stops.length} stops · median delay ${fmtMin(r.periods.all.median ?? r.periods.all.mean)}`;
    renderDirToggle(r);
    $("dly-sinput").value = r.stops[0].name;
    setTimeout(() => { initRouteMap(); }, 60);
    loadDetails()
      .then(() => refreshStopData())
      .catch(err => {
        console.error("[delay] details load failed:", err);
        $("dly-cs").textContent = "—";
        $("dly-csub").textContent = "Detail data failed to load.";
      });
  }

  function initRouteMap() {
    const r = ROUTES[curRoute];
    const rc = routeColor(r.name);
    if (!mapR) {
      mapR = L.map($("dly-mapR"), { zoomControl: false, attributionControl: false });
      L.tileLayer(
        "https://basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
        { maxZoom: 19, opacity: 0.65 }
      ).addTo(mapR);
    }
    if (rPolyline) mapR.removeLayer(rPolyline);
    rStopMarkers.forEach(m => mapR.removeLayer(m));
    rStopMarkers = [];
    const coords = (r.path && r.path.length >= 2)
      ? r.path
      : r.stops.map(s => [s.lat, s.lon]);
    rPolyline = L.polyline(coords, { color: rc, weight: 4, opacity: 0.9 }).addTo(mapR);
    r.stops.forEach((s, i) => {
      const sel = i === curSI;
      const m = L.circleMarker([s.lat, s.lon], {
        radius: sel ? 7 : 4, fillColor: sel ? rc : "#fff",
        color: rc, weight: 2, fillOpacity: 1,
      }).addTo(mapR);
      m.bindTooltip(s.name, {
        permanent: sel, direction: "right",
        className: "dly-tt", offset: [4, 0],
      });
      if (sel) m.openTooltip();
      m.on("click", () => pickStop(i));
      rStopMarkers.push(m);
    });
    mapR.fitBounds(rPolyline.getBounds(), { padding: [22, 22] });
    setTimeout(() => mapR.invalidateSize(), 60);
  }

  function refreshMapMarkers() {
    if (!mapR) return;
    const r = ROUTES[curRoute];
    const rc = routeColor(r.name);
    rStopMarkers.forEach((m, i) => {
      const sel = i === curSI;
      m.setRadius(sel ? 7 : 4);
      m.setStyle({ fillColor: sel ? rc : "#fff" });
      m.unbindTooltip();
      m.bindTooltip(r.stops[i].name, {
        permanent: sel, direction: "right",
        className: "dly-tt", offset: [4, 0],
      });
      if (sel) m.openTooltip();
    });
  }

  function renderRouteBar() {
    const r = ROUTES[curRoute];
    const rc = routeColor(r.name);
    const stops = r.stops;
    let h = "";
    stops.forEach((s, i) => {
      if (i > 0) {
        h += `<div style="flex:1;height:2px;background:${i <= curSI ? rc : "var(--dly-border-light)"};min-width:3px;max-width:24px"></div>`;
      }
      h += `<div title="${s.name}" data-i="${i}" style="width:9px;height:9px;border-radius:50%;background:${i === curSI ? rc : i < curSI ? rc + "77" : "var(--dly-border-light)"};flex-shrink:0;cursor:pointer"></div>`;
    });
    const bar = $("dly-rbar");
    bar.innerHTML = h;
    bar.querySelectorAll("[data-i]").forEach(el => {
      el.addEventListener("click", () => pickStop(parseInt(el.dataset.i, 10)));
    });
  }

  function filterSD(q) {
    const stops = ROUTES[curRoute].stops;
    const rows = (q ? stops.filter(s => s.name.toLowerCase().includes(q.toLowerCase())) : stops)
                  .slice(0, 80);
    const drop = $("dly-sdrop");
    drop.innerHTML = rows.length
      ? rows.map(s => {
          const i = stops.indexOf(s);
          return `<div class="dly-srow${i === curSI ? " hl" : ""}" data-i="${i}">${s.name}</div>`;
        }).join("")
      : `<div style="padding:8px 12px;font-size:12px;color:var(--dly-text-secondary)">no stops found</div>`;
    drop.querySelectorAll("[data-i]").forEach(el => {
      el.addEventListener("click", () => pickStop(parseInt(el.dataset.i, 10)));
    });
  }

  function pickStop(i) {
    curSI = i;
    $("dly-sinput").value = ROUTES[curRoute].stops[i].name;
    $("dly-sdrop").style.display = "none";
    refreshMapMarkers();
    refreshStopData();
  }

  function setDay(d) {
    curDay = d;
    $("dly-bWD").className = "dly-dt" + (d === "weekday" ? " on" : "");
    $("dly-bWE").className = "dly-dt" + (d === "weekend" ? " on" : "");
    renderScatter();
  }

  function getStopRec() {
    if (!detailsCache) return null;
    const sid = ROUTES[curRoute].stops[curSI].id;
    return detailsCache[curRoute]?.[sid] ?? null;
  }

  // Synthesize x-positions (hour of day) for sampled trips, distributing them
  // uniformly across each period window so the scatter shows time-of-day shape.
  function buildScatterPoints(stopRec, day) {
    const block = stopRec?.[day];
    if (!block) return [];
    const out = [];
    DELAY_PERIODS.forEach((p, pi) => {
      const arr = block[p.key]?.d || [];
      if (!arr.length) return;
      const span = p.e - p.s;
      arr.forEach((d, j) => {
        const x = p.s + (arr.length === 1 ? span / 2 : (j / (arr.length - 1)) * span);
        const y = clipDelay(d);
        if (y == null) return;
        out.push({ x, y, pi });
      });
    });
    return out;
  }

  function refreshStopData() {
    if (!detailsCache) {
      $("dly-cs").textContent = ROUTES[curRoute].stops[curSI].name;
      $("dly-csub").textContent = "Loading detail…";
      return;
    }
    const r = ROUTES[curRoute];
    const stop = r.stops[curSI];
    $("dly-cs").textContent = stop.name;
    $("dly-csub").textContent = `${routeLabel(r)} · stop ${curSI + 1} of ${r.stops.length}`;
    renderRouteBar();
    renderMetrics();
    renderScatter();
    renderHM();
  }

  function periodMeans(stopRec, day) {
    if (!stopRec) return DELAY_PERIODS.map(() => null);
    return DELAY_PERIODS.map(p => {
      const c = stopRec[day]?.[p.key];
      return c ? (c.median ?? c.mean ?? null) : null;
    });
  }

  function renderMetrics() {
    const rec = getStopRec();
    if (!rec) {
      ["dly-m1", "dly-m2", "dly-m3", "dly-m4"].forEach(id => $(id).textContent = "—");
      return;
    }
    const wd = periodMeans(rec, "wd");
    const we = periodMeans(rec, "we");
    // Arrivals-weighted median across all (period × day-type) cells.
    const samples = [];
    DELAY_PERIODS.forEach((p, i) => {
      ["wd", "we"].forEach(d => {
        const c = rec[d]?.[p.key];
        const v = c ? (c.median ?? c.mean ?? null) : null;
        if (v != null && c?.n) samples.push({ v, w: c.n });
      });
    });
    let median = null;
    if (samples.length) {
      samples.sort((a, b) => a.v - b.v);
      const total = samples.reduce((s, x) => s + x.w, 0);
      let cum = 0;
      for (const s of samples) {
        cum += s.w;
        if (cum >= total / 2) { median = s.v; break; }
      }
    }

    let onTime = 0, total = 0;
    DELAY_PERIODS.forEach(p => {
      ["wd", "we"].forEach(d => {
        const cell = rec[d]?.[p.key];
        if (cell?.n && cell.otp != null) {
          onTime += (cell.otp / 100) * cell.n;
          total += cell.n;
        }
      });
    });
    const otp = total > 0 ? Math.round(onTime / total * 100) : null;

    let wi = -1, bi = -1;
    wd.forEach((v, i) => {
      if (v == null) return;
      if (wi < 0 || v > wd[wi]) wi = i;
      if (bi < 0 || v < wd[bi]) bi = i;
    });
    $("dly-m1").textContent = median == null ? "—" : median.toFixed(1) + " min";
    $("dly-m2").textContent = otp  == null ? "—" : otp + "%";
    $("dly-m3").textContent = wi < 0 ? "—" : DELAY_PERIODS[wi].lbl;
    $("dly-m4").textContent = bi < 0 ? "—" : DELAY_PERIODS[bi].lbl;
  }

  function renderScatter() {
    const rec = getStopRec();
    const day = curDay === "weekday" ? "wd" : "we";
    const pts = buildScatterPoints(rec, day);
    const ds = DELAY_PERIODS.map((p, pi) => ({
      label: p.lbl,
      data:  pts.filter(pt => pt.pi === pi).map(pt => ({ x: pt.x, y: pt.y })),
      backgroundColor: p.c + "bb",
      pointRadius: 4,
      pointHoverRadius: 6,
    }));
    if (chartObj) {
      chartObj.data.datasets = ds;
      chartObj.update();
      return;
    }
    chartObj = new Chart($("dly-sc").getContext("2d"), {
      type: "scatter",
      data: { datasets: ds },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: it => {
                const h = Math.floor(it.parsed.x);
                const mn = Math.round((it.parsed.x - h) * 60);
                const sign = it.parsed.y >= 0 ? "+" : "";
                return `${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")} · ${sign}${it.parsed.y.toFixed(1)} min · ${it.dataset.label}`;
              },
            },
          },
        },
        scales: {
          x: {
            type: "linear", min: 5, max: 23,
            ticks: {
              stepSize: 2,
              callback: v => `${String(v).padStart(2, "0")}:00`,
              font: { size: 11 }, color: "rgba(136,135,128,0.75)",
            },
            grid:   { color: "rgba(136,135,128,0.1)" },
            border: { color: "rgba(136,135,128,0.3)" },
          },
          y: {
            min: -10, max: 30,
            ticks: {
              callback: v => v === 0 ? "±0" : v + " min",
              font: { size: 11 }, color: "rgba(136,135,128,0.75)",
            },
            grid: {
              color:     c => c.tick.value === 0 ? "rgba(136,135,128,0.5)" : "rgba(136,135,128,0.1)",
              lineWidth: c => c.tick.value === 0 ? 1.5 : 1,
            },
            border: { color: "rgba(136,135,128,0.3)" },
          },
        },
      },
    });
  }

  function dclr(v) {
    if (v == null)  return { bg: "var(--dly-bg-secondary)", fg: "var(--dly-text-tertiary)" };
    if (v <= 1)     return { bg: "var(--dly-success-bg)",   fg: "var(--dly-success-fg)"   };
    if (v <= 3.5)   return { bg: "var(--dly-warning-bg)",   fg: "var(--dly-warning-fg)"   };
    return                  { bg: "var(--dly-danger-bg)",   fg: "var(--dly-danger-fg)"    };
  }

  function renderHM() {
    const rec = getStopRec();
    const wd = periodMeans(rec, "wd");
    const we = periodMeans(rec, "we");
    const allVals = [...wd, ...we].filter(v => v != null).map(v => Math.abs(v));
    const mx = Math.max(0.5, ...allVals);
    let h = `<table><thead><tr>
      <th>period</th><th>weekday median</th><th>weekend median</th><th>WD − WE</th>
    </tr></thead><tbody>`;
    DELAY_PERIODS.forEach((p, i) => {
      const w = wd[i], e = we[i];
      const wC = dclr(w), eC = dclr(e);
      const diff = w != null && e != null ? w - e : null;
      const wb = w != null ? Math.round(Math.abs(w) / mx * 100) : 0;
      const eb = e != null ? Math.round(Math.abs(e) / mx * 100) : 0;
      const dc = diff == null ? "var(--dly-text-tertiary)"
              : diff >  0.3   ? "var(--dly-danger-fg)"
              : diff < -0.3   ? "var(--dly-success-fg)"
              :                 "var(--dly-text-secondary)";
      const fmt = v => v == null ? "—" : v.toFixed(1) + " min";
      h += `<tr>
        <td><span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--dly-text-secondary)">
              <span style="width:7px;height:7px;border-radius:50%;background:${p.c};display:inline-block;flex-shrink:0"></span>${p.lbl}</span></td>
        <td><div class="dly-hm-cell" style="background:${wC.bg}">
              <div class="dly-hm-val" style="color:${wC.fg}">${fmt(w)}</div>
              <div class="dly-hm-bar" style="background:${wC.fg};width:${wb}%"></div></div></td>
        <td><div class="dly-hm-cell" style="background:${eC.bg}">
              <div class="dly-hm-val" style="color:${eC.fg}">${fmt(e)}</div>
              <div class="dly-hm-bar" style="background:${eC.fg};width:${eb}%"></div></div></td>
        <td style="text-align:center;font-size:12px;font-weight:600;color:${dc}">${diff == null ? "—" : (diff >= 0 ? "+" : "") + diff.toFixed(1)}</td>
      </tr>`;
    });
    h += "</tbody></table>";
    $("dly-hm").innerHTML = h;
    $("dly-hml").innerHTML = [
      ["var(--dly-success-bg)", "var(--dly-success-fg)", "≤ 1 min"],
      ["var(--dly-warning-bg)", "var(--dly-warning-fg)", "1 – 3.5 min"],
      ["var(--dly-danger-bg)",  "var(--dly-danger-fg)",  "> 3.5 min"],
    ].map(([bg, fg, lbl]) =>
      `<span class="dly-hml-item"><span class="dly-hml-swatch" style="background:${bg};border:0.5px solid ${fg}"></span>${lbl}</span>`
    ).join("");
  }

  // ---------------- direction toggle ----------------
  function renderDirToggle(r) {
    const holder = $("dly-dirToggle");
    if (!holder) return;
    // Find every (route, direction) record sharing this short_name.
    const sibs = Object.values(ROUTES)
      .filter(x => x.name === r.name)
      .sort((a, b) => String(a.direction_id ?? "")
                          .localeCompare(String(b.direction_id ?? "")));
    if (sibs.length < 2) { holder.innerHTML = ""; return; }
    holder.innerHTML = sibs.map(s => {
      const k = s.key || s.name;
      const cur = (curRoute === k);
      const lbl = s.direction_id != null ? `dir ${s.direction_id}` : "—";
      return `<button class="dly-dir-pill${cur ? " on" : ""}" data-rk="${k}"
                title="${(s.direction || "").replace(/"/g,"&quot;")}">${lbl}</button>`;
    }).join("");
    holder.querySelectorAll("[data-rk]").forEach(el => {
      el.addEventListener("click", () => {
        const k = el.dataset.rk;
        if (k !== curRoute) goRoute(k);
      });
    });
  }

  // ---------------- network-wide search (routes + stops) ----------------
  // Two flat indexes — routes first (small), stops second (~10k). Built once.
  let netRouteIndex = null;
  let netStopIndex  = null;
  function buildNetSearchIndex() {
    if (netRouteIndex && netStopIndex) return;
    const routes = [];
    const stops = [];
    Object.keys(ROUTES).forEach(rk => {
      const r = ROUTES[rk];
      routes.push({
        kind:      "route",
        routeKey:  rk,
        routeName: r.name,
        dirId:     r.direction_id,
        direction: r.direction || "",
        nameLC:    String(r.name).toLowerCase(),
      });
      r.stops.forEach((s, i) => {
        stops.push({
          kind:       "stop",
          stopName:   s.name,
          stopNameLC: s.name.toLowerCase(),
          routeKey:   rk,
          routeName:  r.name,
          dirId:      r.direction_id,
          stopIdx:    i,
        });
      });
    });
    netRouteIndex = routes;
    netStopIndex  = stops;
  }

  function renderNetSearch(q) {
    const drop = $("dly-netSdrop");
    buildNetSearchIndex();
    const needle = (q || "").trim().toLowerCase();
    if (!needle) {
      drop.innerHTML = `<div style="padding:8px 12px;font-size:12px;color:var(--dly-text-secondary)">type a route number or stop name</div>`;
      return;
    }

    // Route matches: prefix preferred, substring fallback.
    const routePrefix = netRouteIndex.filter(r => r.nameLC.startsWith(needle));
    const routeSubstr = netRouteIndex.filter(r =>
      !r.nameLC.startsWith(needle) && r.nameLC.includes(needle));
    const routeMatches = [...routePrefix, ...routeSubstr];
    // Stop matches.
    const stopMatches = netStopIndex.filter(s => s.stopNameLC.includes(needle));

    if (!routeMatches.length && !stopMatches.length) {
      drop.innerHTML = `<div style="padding:8px 12px;font-size:12px;color:var(--dly-text-secondary)">no routes or stops match</div>`;
      return;
    }

    const sectionHeader = lbl => `<div style="padding:6px 12px;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:var(--dly-text-tertiary);background:var(--dly-bg-secondary)">${lbl}</div>`;
    const dirBadge = d => d != null ? ` · dir ${d}` : "";

    let html = "";
    if (routeMatches.length) {
      html += sectionHeader(`routes (${routeMatches.length})`);
      html += routeMatches.slice(0, 30).map(r => `
        <div class="dly-srow" data-rk="${r.routeKey}" data-si="">
          <div style="font-size:13px;color:var(--dly-text-primary);font-weight:600">Route ${r.routeName}${dirBadge(r.dirId)}</div>
          <div style="font-size:11px;color:var(--dly-text-secondary)">${r.direction || "—"}</div>
        </div>`).join("");
    }
    if (stopMatches.length) {
      html += sectionHeader(`stops (${stopMatches.length})`);
      html += stopMatches.slice(0, 80).map(s => `
        <div class="dly-srow" data-rk="${s.routeKey}" data-si="${s.stopIdx}">
          <div style="font-size:13px;color:var(--dly-text-primary)">${s.stopName}</div>
          <div style="font-size:11px;color:var(--dly-text-secondary)">Route ${s.routeName}${dirBadge(s.dirId)}</div>
        </div>`).join("");
    }
    drop.innerHTML = html;
    drop.querySelectorAll("[data-rk]").forEach(el => {
      el.addEventListener("click", () => {
        const rk = el.dataset.rk;
        const siStr = el.dataset.si;
        drop.style.display = "none";
        drop.closest(".dly-srch-wrap").classList.remove("is-open");
        $("dly-netSrch").value = "";
        goRoute(rk);
        // Stop click jumps to that stop; route click stays on stop 0.
        if (siStr !== "") {
          const si = parseInt(siStr, 10);
          loadDetails().then(() => pickStop(si));
        }
      });
    });
  }

  // ---------------- wire-up ----------------
  root.querySelectorAll(".dly-ptab").forEach(b =>
    b.addEventListener("click", () => setPeriod(parseInt(b.dataset.pi, 10)))
  );
  $("dly-sortSel").addEventListener("change", renderLeague);
  $("dly-lsoaToggle").addEventListener("click", toggleLSOA);
  $("dly-tN").addEventListener("click", goNetwork);
  $("dly-backBtn").addEventListener("click", goNetwork);

  $("dly-sinput").addEventListener("input",  e => { filterSD(e.target.value); $("dly-sdrop").style.display = "block"; });
  $("dly-sinput").addEventListener("focus",  () => { filterSD($("dly-sinput").value); $("dly-sdrop").style.display = "block"; });
  $("dly-bWD").addEventListener("click", () => setDay("weekday"));
  $("dly-bWE").addEventListener("click", () => setDay("weekend"));

  function openNetSearch() {
    renderNetSearch($("dly-netSrch").value);
    $("dly-netSdrop").style.display = "block";
    $("dly-netSrch").closest(".dly-srch-wrap").classList.add("is-open");
  }
  function closeNetSearch() {
    $("dly-netSdrop").style.display = "none";
    $("dly-netSrch").closest(".dly-srch-wrap").classList.remove("is-open");
  }
  $("dly-netSrch").addEventListener("input", openNetSearch);
  $("dly-netSrch").addEventListener("focus", openNetSearch);

  document.addEventListener("click", ev => {
    if (!root.contains(ev.target)) return;
    if (!ev.target.closest("#dly-sinput") && !ev.target.closest("#dly-sdrop")) {
      $("dly-sdrop").style.display = "none";
    }
    if (!ev.target.closest("#dly-netSrch") && !ev.target.closest("#dly-netSdrop")) {
      closeNetSearch();
    }
  });

  setPeriod(-1);
  setTimeout(() => initNetworkMap(), 80);
}

// ================================
// INIT
// ================================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDelaySection);
} else {
  initDelaySection();
}
