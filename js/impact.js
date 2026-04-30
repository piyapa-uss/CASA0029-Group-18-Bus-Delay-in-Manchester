// ================================
// IMPACT SECTION (JACOB)
// ================================

// metric configurations: each defines the field, units, color steps and legend rows
// shared red ramp across metrics so "darker = higher exposure / more deprived" reads consistently
const IMPACT_METRICS = {
  delay: {
    field: "avg_delay.x",
    label: "Average bus delay",
    unit: "min",
    nodataValue: -1,
    clampMax: 12,
    // mapbox step expression stops (threshold, color)
    stops: [
      [0, "#F6F7F1"],
      [2, "#f7d8d4"],
      [4, "#f29b99"],
      [6, "#f0625d"],
      [8, "#eb4e43"]
    ],
    legend: [
      { color: "#eb4e43", label: "8+ min" },
      { color: "#f0625d", label: "6 – 8 min" },
      { color: "#f29b99", label: "4 – 6 min" },
      { color: "#f7d8d4", label: "2 – 4 min" },
      { color: "#F6F7F1", label: "0 – 2 min" },
      { color: "#E0E0E0", label: "No data" }
    ]
  },
  imd: {
    field: "index_of_multiple_deprivation_imd_score",
    label: "IMD score",
    unit: "",
    nodataValue: -1,
    clampMax: 200,
    stops: [
      [0,  "#F6F7F1"],
      [10, "#f7d8d4"],
      [20, "#f29b99"],
      [30, "#f0625d"],
      [40, "#eb4e43"]
    ],
    legend: [
      { color: "#eb4e43", label: "40+ (most deprived)" },
      { color: "#f0625d", label: "30 – 40" },
      { color: "#f29b99", label: "20 – 30" },
      { color: "#f7d8d4", label: "10 – 20" },
      { color: "#F6F7F1", label: "0 – 10 (least deprived)" },
      { color: "#E0E0E0", label: "No data" }
    ]
  },
  percentile: {
    // lower percentile = more deprived in the IoD convention; flip the ramp so darkest = lowest percentile
    field: "deprivation_percentile",
    label: "Deprivation percentile",
    unit: "%",
    nodataValue: -1,
    clampMax: 200,
    stops: [
      [0,  "#eb4e43"],
      [20, "#f0625d"],
      [40, "#f29b99"],
      [60, "#f7d8d4"],
      [80, "#F6F7F1"]
    ],
    legend: [
      { color: "#eb4e43", label: "0 – 20% (most deprived)" },
      { color: "#f0625d", label: "20 – 40%" },
      { color: "#f29b99", label: "40 – 60%" },
      { color: "#f7d8d4", label: "60 – 80%" },
      { color: "#F6F7F1", label: "80 – 100% (least deprived)" },
      { color: "#E0E0E0", label: "No data" }
    ]
  }
};

// build a mapbox `fill-color` step expression from a metric config
function buildFillExpression(metric) {
  const input = ["min", ["coalesce", ["get", metric.field], metric.nodataValue], metric.clampMax];
  const expr = ["step", input, "#E0E0E0"];
  metric.stops.forEach(([threshold, color]) => {
    expr.push(threshold, color);
  });
  return expr;
}

// render the legend swatches into a container element based on metric config
function renderImpactLegend(container, metric) {
  container.innerHTML = metric.legend.map(item => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${item.color}"></span>
      ${item.label}
    </div>
  `).join("");
}

// inject impact-section styles via JS so style.css stays untouched
// every selector is scoped under #impact to avoid leaking into other sections
function injectImpactStyles() {
  if (document.getElementById("impact-injected-styles")) return;

  const css = `
    #impact .impact-controls {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    #impact .metric-toggle {
      display: inline-flex;
      background: #f3f1ea;
      border: 1px solid #e6e3d8;
      border-radius: 999px;
      padding: 3px;
    }

    #impact .metric-btn {
      border: 0;
      background: transparent;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      color: var(--grey-mid);
      border-radius: 999px;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }

    #impact .metric-btn:hover {
      color: var(--ink);
    }

    #impact .metric-btn.is-active {
      background: #1f1f1f;
      color: #fff;
    }

    #impact .lad-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--grey-mid);
      cursor: pointer;
      user-select: none;
    }

    #impact .lad-toggle input {
      margin: 0;
      cursor: pointer;
      accent-color: #1f1f1f;
    }

    #impact .impact-legend { flex-wrap: wrap; }

    #impact .impact-map-wrapper:fullscreen {
      background: #fff;
      padding: 20px;
      overflow: auto;
    }

    #impact .impact-map-wrapper:fullscreen .impact-map-canvas {
      height: calc(100vh - 280px);
      min-height: 420px;
    }
  `;

  const styleEl = document.createElement("style");
  styleEl.id = "impact-injected-styles";
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}

async function initImpactSection() {
  const mobilityEl = document.getElementById("impact-mobility");
  const socioEl = document.getElementById("impact-socioeconomic");
  const mapEl = document.getElementById("impact-map");

  if (!mobilityEl || !socioEl || !mapEl) return;

  injectImpactStyles();
  renderMobilityImpact(mobilityEl);
  renderSocioeconomicContext(socioEl);
  renderImpactMap(mapEl);

  await loadMapboxAssets(); //wait until mapbox assets are loaded before initializing map
  await loadChartAssets(); //wait until chart assets are loaded before initializing charts

  mapboxgl.accessToken = "pk.eyJ1IjoiamFjb2JlY2hlbGUiLCJhIjoiY21rbWw5d2tlMGpqZjNjcjJxNGQ4aWIyOCJ9.4MTt2ZvJTS94BZmLwdhQsA"; //set access token for mapbox

  // add mapbox map
const impactMap = new mapboxgl.Map({
  container: "impact-map-canvas",
  style: "mapbox://styles/jacobechele/cmoaelnx0002j01s7135lclbz",
  center: [-2.2426, 53.4808], //centered on Greater Manchester
  zoom: 9.5
});

impactMap.addControl(new mapboxgl.NavigationControl(), "top-right"); //adds navigation controls for map

// fullscreen toggle — targets the whole wrapper so toggle / legend / charts stay visible in fullscreen
const mapWrapper = mapEl.querySelector(".impact-map-wrapper");
impactMap.addControl(new mapboxgl.FullscreenControl({ container: mapWrapper }), "top-right");

setTimeout(() => {
  impactMap.resize();
}, 100);

window.addEventListener("resize", () => {
  impactMap.resize();
});

// keep map sized correctly when entering / exiting fullscreen on the wrapper
document.addEventListener("fullscreenchange", () => {
  setTimeout(() => impactMap.resize(), 50);
});

let currentMetric = IMPACT_METRICS.delay;
const legendEl = document.getElementById("impact-legend");
renderImpactLegend(legendEl, currentMetric);

const hoverInfo = document.getElementById("impact-hover-info"); //get hover info element to update with LSOA statistics on hover
const stopDelayData = await loadCSV("data_raw/gm/impact_stop_delays.csv"); //load stop delay data for histogram, this is a separate CSV from the geojson used for the map to allow for more detailed delay distribution data at stop level

const lsoaResponse = await fetch("data_raw/gm/impact_lsoa.geojson"); //load in geojson but as normal JS data
const lsoaGeojson = await lsoaResponse.json();

const ladResponse = await fetch("data/impact/gm_lad.geojson"); //load LAD boundaries for optional overlay
const ladGeojson = await ladResponse.json();

const allLsoaDelays = lsoaGeojson.features //extracts average delay values for all LSOAs to use in system comparison chart, filters out NAs to prevent issues with chart
  .map(feature => Number(feature.properties["avg_delay.x"]))
  .filter(value => !Number.isNaN(value));

const charts = createImpactCharts(allLsoaDelays); //creates charts and passes in all LSOA delay data to system comparison chart, this function is called here to ensure charts are created before map hover events try to update them

function addLsoaLayer() {
  impactMap.resize();

  //add source data for LSOA polygons
  impactMap.addSource("lsoa-data", {
    type: "geojson",
    data: lsoaGeojson
  });

  //choropleth layer driven by current metric (default: avg delay)
  impactMap.addLayer({
    id: "lsoa-delay-fill",
    type: "fill",
    source: "lsoa-data",
    paint: {
      "fill-color": buildFillExpression(currentMetric),
      "fill-opacity": 0.65
    }
  });

  // outline layer
  impactMap.addLayer({
    id: "lsoa-deprivation-outline",
    type: "line",
    source: "lsoa-data",
    paint: {
      "line-color": "#A5A5A1",
      "line-width": 0.5,
      "line-opacity": 0.5
    }
  });

  // LAD boundary overlay — added on top, hidden by default until user toggles it on
  impactMap.addSource("lad-data", {
    type: "geojson",
    data: ladGeojson
  });

  impactMap.addLayer({
    id: "lad-outline",
    type: "line",
    source: "lad-data",
    layout: { visibility: "none" },
    paint: {
      "line-color": "#1f1f1f",
      "line-width": 1.4,
      "line-opacity": 0.85
    }
  });
}

if (impactMap.loaded()) {
  addLsoaLayer();
} else {
  impactMap.on("load", addLsoaLayer);
}

// metric toggle — repaint choropleth + redraw legend on selection
const metricButtons = document.querySelectorAll(".metric-btn");
metricButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.metric;
    if (!IMPACT_METRICS[key] || currentMetric === IMPACT_METRICS[key]) return;

    currentMetric = IMPACT_METRICS[key];

    metricButtons.forEach(b => {
      const active = b === btn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });

    if (impactMap.getLayer("lsoa-delay-fill")) {
      impactMap.setPaintProperty("lsoa-delay-fill", "fill-color", buildFillExpression(currentMetric));
    }
    renderImpactLegend(legendEl, currentMetric);
  });
});

// LAD overlay toggle
const ladToggle = document.getElementById("impact-lad-toggle");
ladToggle.addEventListener("change", () => {
  if (!impactMap.getLayer("lad-outline")) return;
  impactMap.setLayoutProperty("lad-outline", "visibility", ladToggle.checked ? "visible" : "none");
});

//reacts to mouse movement from whole map, not just when hovering over LSOA polygons, allows for hover info to update when moving on and off polygons without needing to move mouse
impactMap.on("mousemove", (e) => { 
  const features = impactMap.queryRenderedFeatures(e.point, { //sees if mouse is currently hovering over LSOA polygon, if so gets properties to display in hover info box
    layers: ["lsoa-delay-fill"]
  });

  if (!features.length) { //if not hovering over polygon, there is no info and cursor is reset to default
    impactMap.getCanvas().style.cursor = "";
    hoverInfo.innerHTML = `Hover over an LSOA to see delay and deprivation statistics`;
    return;
  }

  const properties = features[0].properties; //if hovering over polygon, cursor changes to pointer to show interactivity
  impactMap.getCanvas().style.cursor = "pointer";

  hoverInfo.innerHTML = `
    <strong>${properties.lsoa_name_2021 || "Unknown LSOA"}</strong>
    | Average Delay: ${properties["avg_delay.x"] != null ? Number(properties["avg_delay.x"]).toFixed(2) : "No data"} mins
    | Deprivation Score: ${properties.index_of_multiple_deprivation_imd_score != null ? Number(properties.index_of_multiple_deprivation_imd_score).toFixed(2) : "No data"}
    | Deprivation Percentile: ${properties.deprivation_percentile != null ? Number(properties.deprivation_percentile).toFixed(2) : "No data"}%
  `;

  //update histogram and system comparison chart with delay distribution for selected LSOA
  const selectedLsoa = properties.lsoa21cd;

  const selectedStopDelays = stopDelayData
    .filter(row => row.lsoa21cd === selectedLsoa) //filters stop delay data to only include stops within selected LSOA
    .map(row => Number(row.mean_delay)) //converts delay values to numbers for use in histogram 
    .filter(value => !Number.isNaN(value)); //filters out NAs to prevent issues with charts

  const bins = buildDelayBins(selectedStopDelays);

  charts.histogramChart.data.labels = bins.labels;
  charts.histogramChart.data.datasets[0].data = bins.counts;
  charts.histogramChart.update(); //updates histogram with new data for selected LSOA

  const selectedDelay = Number(properties["avg_delay.x"]); //gets average delay for selected LSOA to plot on system comparison chart

  charts.systemChart.data.datasets[1].data = [{ //updates system comparison chart to plot selected LSOA against all LSOAs, x position is average delay and y position is arbitrary to spread points out, only one point for selected LSOA which is highlighted in red
    x: selectedDelay,
    y: 4
  }];

  charts.systemChart.update(); //updates system comparison chart with new data for selected LSOA
  });

}

// -------------------------------
// 1. MOBILITY IMPACT (LEFT CARD)
// -------------------------------
function renderMobilityImpact(container) {
  container.innerHTML = `
    <div class="impact-block">
      <h5>Travel Time Uncertainty</h5>
      <p>
        Bus delays increase variability in travel time, making daily journeys less predictable.
        This affects commute planning and reduces reliability of public transport.
      </p>
    </div>

    <div class="impact-block">
      <h5>Time Loss Accumulation</h5>
      <p>
        Repeated small delays accumulate into significant weekly time loss,
        particularly for frequent bus users.
      </p>
    </div>

    <div class="impact-block">
      <h5>Accessibility Reduction</h5>
      <p>
        Delays effectively shrink accessible urban space within fixed time budgets,
        limiting access to jobs, services, and opportunities.
      </p>
    </div>
  `;
}

// -------------------------------
// 2. SOCIOECONOMIC CONTEXT (RIGHT CARD)
// -------------------------------
function renderSocioeconomicContext(container) {
  container.innerHTML = `
    <div class="impact-block">
      <h5>Uneven Exposure</h5>
      <p>
        Areas with higher reliance on bus transport are more exposed to delay impacts,
        especially where alternative modes are limited.
      </p>
    </div>

    <div class="impact-block">
      <h5>Deprivation Link</h5>
      <p>
        Preliminary comparison suggests that delay-heavy areas may overlap with
        socioeconomically disadvantaged neighbourhoods.
      </p>
    </div>

    <div class="impact-block">
      <h5>Mobility Inequality</h5>
      <p>
        This creates uneven mobility conditions across the city, where some populations
        experience greater friction in accessing everyday urban activities.
      </p>
    </div>
  `;
}

// -------------------------------
// 3. IMPACT MAP (BOTTOM)
// -------------------------------

function loadMapboxAssets() { //calls function before loading map to ensure assets are ready
  return new Promise((resolve, reject) => { //tells JS to wait until assets are loaded before continuing
    if (window.mapboxgl) { //ensures mapbox is only loaded once, if already loaded it just exits the function
      resolve();
      return;
    }

    const css = document.createElement("link"); //loads mapbox CSS from impact.js file without editing index.html file
    css.rel = "stylesheet";
    css.href = "https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css"; //load mapbox stylesheet
    document.head.appendChild(css); //adds css to head of document

    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js"; //load mapbox stylesheet, map functionality
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script); //adds script to body of document, loads mapbox functionality
  });
}

function loadChartAssets() { //calls function before loading charts to ensure assets are ready
  return new Promise((resolve, reject) => { //tells JS to wait until assets are loaded before continuing
    if (window.Chart) { //ensures chart.js is only loaded once, if already loaded it just exits the function
      resolve();
      return;
    }

    const script = document.createElement("script"); //load chart.js from CDN, allows for charts to be created without editing index.html file, also ensures charts are only loaded when impact section is initialized
    script.src = "https://cdn.jsdelivr.net/npm/chart.js"; //load chart.js library
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function renderImpactMap(container) {
  container.innerHTML = `
    <div class="impact-map-wrapper">
      <div class="impact-map-header">
        <div>
          <h5>Delay Exposure vs Socioeconomic Context</h5>
          <p>Switch between delay intensity and deprivation indicators</p>
        </div>

        <div class="impact-controls">
          <div class="metric-toggle" role="tablist" aria-label="Map metric">
            <button type="button" class="metric-btn is-active" data-metric="delay" role="tab" aria-selected="true">Average Delay</button>
            <button type="button" class="metric-btn" data-metric="imd" role="tab" aria-selected="false">IMD Score</button>
            <button type="button" class="metric-btn" data-metric="percentile" role="tab" aria-selected="false">Deprivation Percentile</button>
          </div>

          <label class="lad-toggle">
            <input type="checkbox" id="impact-lad-toggle" />
            <span>Show LAD boundaries</span>
          </label>
        </div>
      </div>

      <div id="impact-legend" class="impact-legend"></div>

      <div id="impact-hover-info" class="impact-hover-info">
        Hover over an LSOA to see delay and deprivation statistics
      </div>

      <div class="impact-visual-row">
        <div id="impact-map-canvas" class="impact-map-canvas"></div>

        <div class="impact-chart-panel">
          <div class="impact-chart-card">
            <h5>Delay Buckets in Selected LSOA</h5>
            <canvas id="lsoa-delay-histogram"></canvas>
          </div>

          <div class="impact-chart-card">
            <h5>Selected LSOA vs System</h5>
            <canvas id="system-delay-comparison"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;
}

// load CSV function to read in stop delay data for histogram and convert to JS objects
async function loadCSV(path) {
  const response = await fetch(path);
  const text = await response.text();

  const rows = text.trim().split("\n");
  const headers = rows[0].split(",");

  return rows.slice(1).map(row => {
    const values = row.split(",");
    const obj = {};

    headers.forEach((header, index) => {
      obj[header] = values[index];
    });

    return obj;
  });
}

// function to create delay bins for histogram, takes in array of delay values and counts how many fall into each bin, returns object with bin labels and counts for each bin
function buildDelayBins(values) {
  const binLabels = ["0-2min", "2-5min", "5-10min", "10+min"];
  const binCounts = [0, 0, 0, 0];

  values.forEach(value => {
    if (value >= 0 && value < 2) {
      binCounts[0]++;
    } else if (value >= 2 && value < 5) {
      binCounts[1]++;
    } else if (value >= 5 && value < 10) {
      binCounts[2]++;
    } else if (value >= 10) {
      binCounts[3]++;
    }
  });

  return {
    labels: binLabels,
    counts: binCounts
  };
}

 // creates histogram and system comparison charts using chart.js
function createImpactCharts(allLsoaDelays) {
  const histogramCanvas = document.getElementById("lsoa-delay-histogram");
  const systemCanvas = document.getElementById("system-delay-comparison");

  const histogramChart = new Chart(histogramCanvas, {
    type: "bar",
    data: {
      labels: ["0-2min", "2-5min", "5-10min", "10+min"],
      datasets: [{
        label: "Number of stops",
        data: [0, 0, 0, 0],
        backgroundColor: "#FD4B49"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });

  const systemChart = new Chart(systemCanvas, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "All LSOAs",
          data: allLsoaDelays.map((delay, index) => ({
            x: delay,
            y: index % 8
          })),
          pointRadius: 2,
          backgroundColor: "#A5A5A1"
        },
        {
          label: "Selected LSOA",
          data: [],
          pointRadius: 7,
          backgroundColor: "#FD4B49"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { //custom tooltip to show average delay value when hovering over selected LSOA point, legend is hidden since we have a custom legend in the HTML
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Average delay: ${context.parsed.x.toFixed(2)} mins`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Average delay (mins)"
          }
        },
        y: {
          display: false
        }
      }
    }
  });

  return {
    histogramChart: histogramChart,
    systemChart: systemChart
  };
}

// -------------------------------
// INIT
// -------------------------------
initImpactSection(); //calls function to load mapbox assets before rendering map, ensures map is ready when section is initialized

