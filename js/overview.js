// ================================
// OVERVIEW: D3 stacked area + mini England region map
// ================================

document.addEventListener("DOMContentLoaded", () => {
  initBusJourneyChart();
  initMiniMap();
});

let highlightChartAreas = null;

const AREA_COLORS = {
  "Greater Manchester": "#ff4b25",
  "West Midlands": "#9f9f9f",
  "West Yorkshire": "#b8b8b8",
  "Merseyside": "#d0d0d0",
  "South Yorkshire": "#e5e5e5"
};

const AREAS = [
  "Merseyside",
  "South Yorkshire",
  "West Yorkshire",
  "West Midlands",
  "Greater Manchester"
];

// NUTS1 region → selected city-regions shown in the chart
const REGION_TO_AREAS = {
  "North West": ["Greater Manchester", "Merseyside"],
  "West Midlands": ["West Midlands"],
  "Yorkshire and The Humber": ["West Yorkshire", "South Yorkshire"]
};

async function initBusJourneyChart() {
  const container = d3.select("#bus-journey-chart");
  const slider = d3.select("#bus-year-slider");
  const yearLabel = d3.select("#bus-year-label");

  if (container.empty()) return;

  const data = await d3.csv("data/overview/bus_journeys_cityregions.csv", d => ({
    year: +d.year,
    area: d.area,
    journeys: +d.journeys
  }));

  const margin = { top: 28, right: 28, bottom: 42, left: 54 };
  const width = 720;
  const height = 380;

  container.selectAll("*").remove();

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", "Stacked area chart showing bus journeys by selected English city-regions from 2010 to 2025");

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const wideData = Array.from(
    d3.group(data, d => d.year),
    ([year, rows]) => {
      const obj = { year };
      rows.forEach(r => {
        obj[r.area] = r.journeys;
      });
      return obj;
    }
  ).sort((a, b) => a.year - b.year);

  const x = d3.scaleLinear()
    .domain(d3.extent(wideData, d => d.year))
    .range([0, chartWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(wideData, d => d3.sum(AREAS, area => d[area] || 0))])
    .nice()
    .range([chartHeight, 0]);

  const stack = d3.stack()
    .keys(AREAS)
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone);

  const stacked = stack(wideData);

  const area = d3.area()
    .x(d => x(d.data.year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveMonotoneX);

  // Grid
  g.append("g")
    .attr("class", "bus-grid")
    .call(
      d3.axisLeft(y)
        .ticks(5)
        .tickSize(-chartWidth)
        .tickFormat("")
    );

  // Areas
  const paths = g.selectAll(".bus-area")
    .data(stacked)
    .join("path")
    .attr("class", d => `bus-area area-${slugify(d.key)}`)
    .attr("fill", d => AREA_COLORS[d.key])
    .attr("opacity", d => d.key === "Greater Manchester" ? 0.96 : 0.62)
    .attr("stroke", d => d.key === "Greater Manchester" ? "rgba(255,75,37,0.75)" : "rgba(0,0,0,0.06)")
    .attr("stroke-width", d => d.key === "Greater Manchester" ? 1.2 : 0.35)
    .attr("d", area);

  // Reveal animation
  const clipId = "bus-chart-reveal";
  const clip = g.append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("width", 0)
    .attr("height", chartHeight);

  paths.attr("clip-path", `url(#${clipId})`);

  // Axes
  g.append("g")
    .attr("class", "bus-axis bus-axis-x")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(
      d3.axisBottom(x)
        .tickValues([2010, 2015, 2020, 2025])
        .tickFormat(d3.format("d"))
    );

  g.append("g")
    .attr("class", "bus-axis bus-axis-y")
    .call(
      d3.axisLeft(y)
        .ticks(5)
        .tickFormat(d => `${d}M`)
    );

  // Year marker
  const marker = g.append("line")
    .attr("class", "bus-year-marker")
    .attr("y1", 0)
    .attr("y2", chartHeight)
    .attr("x1", x(2025))
    .attr("x2", x(2025));

  const tooltip = container
    .append("div")
    .attr("class", "bus-tooltip");

  let currentFocusArea = "Greater Manchester";

  function updateTooltip(year, focusArea) {
    const focus = data.find(d => d.year === year && d.area === focusArea);
    const ranked = data
      .filter(d => d.year === year)
      .sort((a, b) => b.journeys - a.journeys);

    const rank = ranked.findIndex(d => d.area === focusArea) + 1;

    tooltip.html(`
      <strong>${year}</strong>
      <span>${focusArea}</span>
      <b>${focus ? focus.journeys.toFixed(1) : "--"}M journeys</b>
      <em>${rank > 0 ? `Rank ${rank} of ${ranked.length}` : "Not shown in selected chart"}</em>
    `);
  }

  function updateYear(selectedYear) {
    yearLabel.text(selectedYear);

    const revealWidth = x(selectedYear);

    clip.transition()
      .duration(220)
      .ease(d3.easeCubicOut)
      .attr("width", revealWidth);

    marker.transition()
      .duration(220)
      .attr("x1", revealWidth)
      .attr("x2", revealWidth);

    updateTooltip(selectedYear, currentFocusArea);
  }

  slider.on("input", function () {
    updateYear(+this.value);
  });

  highlightChartAreas = function (areasToHighlight, label) {
    const selectedYear = +slider.property("value");
    const activeAreas = areasToHighlight.length ? areasToHighlight : ["Greater Manchester"];
    currentFocusArea = activeAreas[0];

    paths.transition()
      .duration(280)
      .attr("opacity", d => activeAreas.includes(d.key) ? 0.96 : 0.18)
      .attr("stroke-width", d => activeAreas.includes(d.key) ? 1.4 : 0.3)
      .attr("stroke", d => activeAreas.includes(d.key) ? "rgba(255,75,37,0.75)" : "rgba(0,0,0,0.06)");

    updateTooltip(selectedYear, currentFocusArea);

    console.log("Map selected:", label, "→ chart areas:", activeAreas);
  };

  updateYear(+slider.property("value"));

  // Initial chart focus = Greater Manchester only, not the whole North West
  highlightChartAreas(["Greater Manchester"], "Greater Manchester");
}

async function initMiniMap() {
  const svg = d3.select("#overview-mini-map");
  if (svg.empty()) return;

  const node = svg.node();
  const width = node.clientWidth || 260;
  const height = node.clientHeight || 250;

  svg.selectAll("*").remove();

  const geo = await d3.json("data/overview/regions_england.geojson");

  const projection = d3.geoMercator()
    .fitSize([width, height], geo);

  const path = d3.geoPath().projection(projection);

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "mini-map-tooltip")
    .style("position", "fixed")
    .style("pointer-events", "none")
    .style("opacity", 0);

  function updateMapNote(region, chartAreas) {
    const note = document.getElementById("mini-map-note");
    if (!note) return;

    if (region === "North West") {
      note.textContent =
        "Greater Manchester CA sits within the North West region. The chart highlights selected city-regions in this regional context.";
      return;
    }

    if (chartAreas.length) {
      note.textContent =
        `${region} is linked to selected city-regions included in the chart.`;
      return;
    }

    note.textContent =
      `${region} is outside the selected chart scope. The chart focuses on Greater Manchester CA and comparable combined authorities.`;
  }

  function setActive(region) {
    const chartAreas = REGION_TO_AREAS[region] || [];

    svg.selectAll(".mini-region")
      .classed("active-focus", d => d.properties.region_clean === "North West")
      .classed("active-linked", d =>
        d.properties.region_clean === region &&
        region !== "North West" &&
        chartAreas.length > 0
      )
      .classed("active-outscope", d =>
        d.properties.region_clean === region &&
        chartAreas.length === 0
      );

    if (highlightChartAreas) {
      if (chartAreas.length) {
        highlightChartAreas(chartAreas, region);
      } else {
        highlightChartAreas(["Greater Manchester"], "Greater Manchester");
      }
    }

    updateMapNote(region, chartAreas);
  }

  svg.selectAll("path")
    .data(geo.features)
    .join("path")
    .attr("class", "mini-region")
    .attr("d", path)
    .attr("data-region", d => d.properties.region_clean)
    .on("click", function (event, d) {
      setActive(d.properties.region_clean);
    })
    .on("mouseover", function (event, d) {
      d3.select(this).classed("hovered", true);

      tooltip
        .style("opacity", 1)
        .html(`<strong>${d.properties.region_clean}</strong>`);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", `${event.clientX + 12}px`)
        .style("top", `${event.clientY + 12}px`);
    })
    .on("mouseout", function () {
      d3.select(this).classed("hovered", false);
      tooltip.style("opacity", 0);
    });

  // Default visual map focus = North West, because Greater Manchester is located there
  setActive("North West");
}

function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, "-");
}