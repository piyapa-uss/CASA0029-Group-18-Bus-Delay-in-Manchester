// ================================
// OVERVIEW MINI MAP (PUK)
// Real MapLibre intro map using GMAL bus accessibility data
// Editorial point-map version, not heatmap
// ================================

initOverviewSection();

function initOverviewSection() {
  const mapEl = document.getElementById("overview-map");
  if (!mapEl) return;

  loadOverviewMapDependencies()
    .then(() => renderOverviewMiniMap(mapEl))
    .catch((err) => {
      console.error("[overview] map failed:", err);
      mapEl.innerHTML = `
        <div style="padding:24px;color:white;">
          Overview map failed to load.
        </div>
      `;
    });
}

function loadOverviewMapDependencies() {
  return Promise.all([
    loadOverviewStylesheet("https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css"),
    loadOverviewScript("https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js"),
  ]);
}

function loadOverviewScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);

    if (existing) {
      if (window.maplibregl) return resolve();
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadOverviewStylesheet(href) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) return resolve();

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
}

async function renderOverviewMiniMap(container) {
  const response = await fetch("data/accessibility/gmal_2016.json");

  if (!response.ok) {
    throw new Error("Could not load data/accessibility/gmal_2016.json");
  }

  const gmal = await response.json();

  const points = gmal.data.map((d) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [d[0], d[1]],
    },
    properties: {
      overall: d[2],
      level: d[3],
      bus: d[4],
      rail: d[5],
      metro: d[6],
      locallink: d[7],
    },
  }));

  const geojson = {
    type: "FeatureCollection",
    features: points,
  };

  const map = new maplibregl.Map({
    container,
    style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    center: [-2.245, 53.475],
    zoom: 9.45,
    pitch: 0,
    bearing: 0,
    attributionControl: false,
  });

  map.scrollZoom.disable();
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();

  map.addControl(
    new maplibregl.AttributionControl({ compact: true }),
    "bottom-right"
  );

  setTimeout(() => map.resize(), 250);

  map.on("load", () => {
    // Muted basemap: make the map feel like an editorial background
    const style = map.getStyle();

    style.layers.forEach((layer) => {
      if (layer.type === "symbol") {
        map.setPaintProperty(layer.id, "text-opacity", 0.45);
        map.setPaintProperty(layer.id, "icon-opacity", 0.35);
      }

      if (layer.type === "line") {
        map.setPaintProperty(layer.id, "line-opacity", 0.38);
      }

      if (layer.type === "fill") {
        map.setPaintProperty(layer.id, "fill-opacity", 0.72);
      }
    });

    map.addSource("overview-gmal-bus", {
      type: "geojson",
      data: geojson,
    });

    // Soft background field: very subtle, not a heatmap blob
    map.addLayer({
      id: "overview-bus-field",
      type: "circle",
      source: "overview-gmal-bus",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "bus"],
          0, 0.8,
          8, 1.4,
          18, 2.4,
          30, 3.4
        ],
        "circle-color": [
          "interpolate",
          ["linear"],
          ["get", "bus"],
          0, "rgba(170,170,170,0.16)",
          8, "rgba(255,170,130,0.38)",
          18, "rgba(255,110,70,0.62)",
          30, "rgba(255,80,40,0.88)"
        ],
        "circle-opacity": [
          "interpolate",
          ["linear"],
          ["get", "bus"],
          0, 0.18,
          8, 0.36,
          18, 0.58,
          30, 0.78
        ],
        "circle-stroke-width": 0
      }
    });

    // Stronger dots for high bus accessibility cells
    map.addLayer({
      id: "overview-bus-highlights",
      type: "circle",
      source: "overview-gmal-bus",
      filter: [">=", ["get", "bus"], 18],
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "bus"],
          18, 2.8,
          30, 5.4
        ],
        "circle-color": "#ff5a2f",
        "circle-opacity": 0.72,
        "circle-stroke-color": "rgba(255,255,255,0.75)",
        "circle-stroke-width": 0.45
      }
    });

    // Manchester focal point
    const markerEl = document.createElement("div");
    markerEl.className = "overview-centre-marker";
    markerEl.innerHTML = `<span></span>`;

    new maplibregl.Marker({ element: markerEl, anchor: "center" })
      .setLngLat([-2.245, 53.48])
      .addTo(map);

    map.resize();
  });
}