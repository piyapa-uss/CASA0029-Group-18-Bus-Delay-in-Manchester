// ================================
// IMPACT SECTION (JACOB)
// ================================

async function initImpactSection() {
  const mobilityEl = document.getElementById("impact-mobility");
  const socioEl = document.getElementById("impact-socioeconomic");
  const mapEl = document.getElementById("impact-map");

  if (!mobilityEl || !socioEl || !mapEl) return;

  renderMobilityImpact(mobilityEl);
  renderSocioeconomicContext(socioEl);
  renderImpactMap(mapEl);

  await loadMapboxAssets(); //wait until mapbox assets are loaded before initializing map

  mapboxgl.accessToken = "pk.eyJ1IjoiamFjb2JlY2hlbGUiLCJhIjoiY21rbWw5d2tlMGpqZjNjcjJxNGQ4aWIyOCJ9.4MTt2ZvJTS94BZmLwdhQsA"; //set access token for mapbox

  // add mapbox map
const impactMap = new mapboxgl.Map({
  container: "impact-map-canvas",
  style: "mapbox://styles/jacobechele/cmoaelnx0002j01s7135lclbz",
  center: [-2.2426, 53.4808], //centered on Greater Manchester
  zoom: 9.5
});

impactMap.addControl(new mapboxgl.NavigationControl(), "top-right"); //adds navigation controls for map

setTimeout(() => {
  impactMap.resize();
}, 100);

const hoverInfo = document.getElementById("impact-hover-info"); //get hover info element to update with LSOA statistics on hover

impactMap.on("load", () => {
  impactMap.resize();

  impactMap.addSource("lsoa-data", {
    type: "geojson",
    data: "data_raw/gm/impact_lsoa.geojson"
  });

impactMap.addLayer({ //add delay layer, filling LSOA polygons with color based on average delay
  id: "lsoa-delay-fill",
  type: "fill",
  source: "lsoa-data",
  paint: {
      "fill-color": [
        "step",
        ["min", ["coalesce", ["get", "avg_delay.x"], -1], 12], //colors all values above 12min the same as 12, prevent extreme outliers from dominating color scheme, coalesce treats NAs as -1 so they can be colored separately

        "#E0E0E0",  //fills NAs with light gray to reduce clutter but not ignore

        0, "#F6F7F1",
        2, "#f7d8d4",
        4, "#f29b99",
        6, "#f0625d",
        8, "#eb4e43"
      ],
    "fill-opacity": 0.65
  }
});

impactMap.addLayer({ //thin border layer to outline LSOA boundaries improving readability of map
  id: "lsoa-deprivation-outline",
  type: "line",
  source: "lsoa-data",
  paint: {
    "line-color": "#A5A5A1",
    "line-width": 0.5,
    "line-opacity": 0.5
  }
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
});

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

function renderImpactMap(container) {
  container.innerHTML = `
    <div class="impact-map-wrapper">
      <div class="impact-map-header">
        <div>
          <h5>Delay Exposure vs Socioeconomic Context</h5>
          <p>Overlay of delay intensity and deprivation indicators</p>
        </div>

        <div class="impact-legend">
          <div class="legend-item">
            <span class="legend-dot high"></span>
            High delay
          </div>
          <div class="legend-item">
            <span class="legend-dot medium"></span>
            Medium
          </div>
          <div class="legend-item">
            <span class="legend-dot low"></span>
            Low
          </div>
          <div class="legend-item">
            <span class="legend-dot nodata"></span>
             No Data
            </div>
        </div>
      </div>

      <div id="impact-hover-info" class="impact-hover-info">
        Hover over LSOA to see statistics
      </div>

      <div 
        id="impact-map-canvas" class="impact-map-canvas"
      ></div>
    </div>
  `;
}

// -------------------------------
// INIT
// -------------------------------
initImpactSection(); //calls function to load mapbox assets before rendering map, ensures map is ready when section is initialized

window.addEventListener("resize", () => {
  impactMap.resize();
});