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
  "West Midlands": "#b8b8b8",
  "West Yorkshire": "#c9c9c9",
  "Merseyside": "#dddddd",
  "South Yorkshire": "#eeeeee"
};

const AREAS = [
  "Merseyside",
  "South Yorkshire",
  "West Yorkshire",
  "West Midlands",
  "Greater Manchester"
];

// NUTS1 region → city-regions shown in the chart
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
    .attr("aria-label", "Stacked area chart showing bus journeys by city-region from 2010 to 2025");

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const wideData = Array.from(
    d3.group(data, d => d.year),
    ([year, rows]) => {
      const obj = { year };
      rows.forEach(r => obj[r.area] = r.journeys);
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

  g.append("g")
    .attr("class", "bus-grid")
    .call(
      d3.axisLeft(y)
        .ticks(5)
        .tickSize(-chartWidth)
        .tickFormat("")
    );

  const paths = g.selectAll(".bus-area")
    .data(stacked)
    .join("path")
    .attr("class", d => `bus-area area-${slugify(d.key)}`)
    .attr("fill", d => AREA_COLORS[d.key])
    .attr("opacity", d => d.key === "Greater Manchester" ? 0.96 : 0.72)
    .attr("stroke", d => d.key === "Greater Manchester" ? "#d83f1f" : "rgba(0,0,0,0.08)")
    .attr("stroke-width", d => d.key === "Greater Manchester" ? 2.2 : 0.7)
    .attr("d", area);

  const clipId = "bus-chart-reveal";
  const clip = g.append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("width", 0)
    .attr("height", chartHeight);

  paths.attr("clip-path", `url(#${clipId})`);

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

  const marker = g.append("line")
    .attr("class", "bus-year-marker")
    .attr("y1", 0)
    .attr("y2", chartHeight)
    .attr("x1", x(2025))
    .attr("x2", x(2025));

  const tooltip = container
    .append("div")
    .attr("class", "bus-tooltip");

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

    updateTooltip(selectedYear, "Greater Manchester");
  }

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

  slider.on("input", function () {
    updateYear(+this.value);
  });

  highlightChartAreas = function (areasToHighlight, label) {
    const selectedYear = +slider.property("value");

    paths.transition()
      .duration(280)
      .attr("opacity", d => areasToHighlight.includes(d.key) ? 0.96 : 0.16)
      .attr("stroke-width", d => areasToHighlight.includes(d.key) ? 2.4 : 0.4)
      .attr("stroke", d => areasToHighlight.includes(d.key) ? "#222" : "rgba(0,0,0,0.08)");

    const firstArea = areasToHighlight[0] || "Greater Manchester";
    updateTooltip(selectedYear, firstArea);

    console.log("Map selected:", label, "→ chart areas:", areasToHighlight);
  };

  updateYear(+slider.property("value"));
}

async function initMiniMap() {
  const svg = d3.select("#overview-mini-map");
  if (svg.empty()) return;

  const node = svg.node();
  const width = node.clientWidth || 260;
  const height = node.clientHeight || 260;

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

  function setActive(region) {
    svg.selectAll(".mini-region")
      .classed("active", d => d.properties.region_clean === region);

    const chartAreas = REGION_TO_AREAS[region] || [];

    if (highlightChartAreas && chartAreas.length) {
      highlightChartAreas(chartAreas, region);
    }
  }

  svg.selectAll("path")
    .data(geo.features)
    .join("path")
    .attr("class", d => `mini-region ${d.properties.region_clean === "North West" ? "active" : ""}`)
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

  // Default: North West because Greater Manchester is there
  setActive("North West");
}

function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, "-");
}