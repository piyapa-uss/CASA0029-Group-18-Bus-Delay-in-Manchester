// ================================
// OVERVIEW STACKED AREA CHART (PUK)
// D3 macro context: bus journeys by major English city-region
// ================================

document.addEventListener("DOMContentLoaded", () => {
  initBusJourneyChart();
});

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

  const areas = [
    "Merseyside",
    "South Yorkshire",
    "West Yorkshire",
    "West Midlands",
    "Greater Manchester"
  ];

  const areaColors = {
    "Greater Manchester": "#ff4b25",
    "West Midlands": "#b8b8b8",
    "West Yorkshire": "#c9c9c9",
    "Merseyside": "#dddddd",
    "South Yorkshire": "#eeeeee"
  };

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

  const g = svg
    .append("g")
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
    .domain([0, d3.max(wideData, d =>
      d3.sum(areas, area => d[area] || 0)
    )])
    .nice()
    .range([chartHeight, 0]);

  const stack = d3.stack()
    .keys(areas)
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
    .attr("class", d => `bus-area ${d.key === "Greater Manchester" ? "is-manchester" : ""}`)
    .attr("fill", d => areaColors[d.key])
    .attr("opacity", d => d.key === "Greater Manchester" ? 0.96 : 0.72)
    .attr("stroke", d => d.key === "Greater Manchester" ? "#d83f1f" : "rgba(0,0,0,0.08)")
    .attr("stroke-width", d => d.key === "Greater Manchester" ? 2.2 : 0.7)
    .attr("d", area);

  // Reveal animation
  const clip = g.append("clipPath")
    .attr("id", "bus-chart-reveal")
    .append("rect")
    .attr("width", 0)
    .attr("height", chartHeight);

  paths.attr("clip-path", "url(#bus-chart-reveal)");

  clip.transition()
    .duration(1400)
    .ease(d3.easeCubicOut)
    .attr("width", chartWidth);

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

  // Vertical year marker
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

    clip
        .transition()
        .duration(220)
        .ease(d3.easeCubicOut)
        .attr("width", revealWidth);
    
    marker
      .transition()
      .duration(220)
      .attr("x1", x(selectedYear))
      .attr("x2", x(selectedYear));

    const gm = data.find(d =>
      d.year === selectedYear && d.area === "Greater Manchester"
    );

    const ranked = data
      .filter(d => d.year === selectedYear)
      .sort((a, b) => b.journeys - a.journeys);

    const rank = ranked.findIndex(d => d.area === "Greater Manchester") + 1;

    tooltip.html(`
      <strong>${selectedYear}</strong>
      <span>Greater Manchester</span>
      <b>${gm ? gm.journeys.toFixed(1) : "--"}M journeys</b>
      <em>Rank ${rank} of ${ranked.length} selected city-regions</em>
    `);
  }

  slider.on("input", function () {
    updateYear(+this.value);
  });

  updateYear(+slider.property("value"));
}

// Mini map of UK city-regions (Macro context for bus journeys chart)
initMiniMap();

function initMiniMap() {
  const svg = d3.select("#overview-mini-map");
  if (!svg.node()) return;

  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  const projection = d3.geoMercator()
    .center([-2, 53])
    .scale(2200)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);

  d3.json("data/overview/regions_england.geojson").then(data => {

    let selected = "Greater Manchester"; // default

    svg.selectAll("path")
      .data(data.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", d =>
        d.properties.region_clean === selected ? "#ff4b25" : "#d9d9d9"
      )
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")

      // CLICK INTERACTION
      .on("click", function (event, d) {
        selected = d.properties.region_clean;

        // highlight map
        svg.selectAll("path")
          .transition()
          .duration(300)
          .attr("fill", p =>
            p.properties.region_clean === selected
              ? "#ff4b25"
              : "#d9d9d9"
          );

        // CONNECT TO CHART
        updateChart(selected);
      })

      // hover effect
      .on("mouseover", function () {
        d3.select(this).attr("opacity", 0.7);
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 1);
      });
  });
}

function updateChart(region) {
  console.log("Selected:", region);
}