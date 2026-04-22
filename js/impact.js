// ================================
// IMPACT SECTION (JACOB)
// ================================

function initImpactSection() {
  const mobilityEl = document.getElementById("impact-mobility");
  const socioEl = document.getElementById("impact-socioeconomic");
  const mapEl = document.getElementById("impact-map");

  if (!mobilityEl || !socioEl || !mapEl) return;

  renderMobilityImpact(mobilityEl);
  renderSocioeconomicContext(socioEl);
  renderImpactMap(mapEl);
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
        </div>
      </div>

      <div class="impact-map-canvas">
        Jacob: Choropleth / overlay map goes here
      </div>
    </div>
  `;
}

// -------------------------------
// INIT
// -------------------------------
initImpactSection();