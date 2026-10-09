import { computePanchang } from "./panchang.js";
import { CITIES } from "./cities.js";
import { nextFestival } from "./festivals.js";

const IST_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

function fmtTime(date) {
  return date ? IST_FORMATTER.format(date) : "—";
}

function fmtRange(range) {
  if (!range) return "—";
  return `${fmtTime(range.start)} – ${fmtTime(range.end)}`;
}

const citySelect = document.getElementById("city-select");
const useLocationBtn = document.getElementById("use-location");
const locationLabel = document.getElementById("location-label");
const resultsEl = document.getElementById("results");
const festivalBanner = document.getElementById("festival-banner");

function populateCities() {
  for (const city of CITIES) {
    const opt = document.createElement("option");
    opt.value = `${city.lat},${city.lon}`;
    opt.textContent = city.name;
    citySelect.appendChild(opt);
  }
}

function renderFestivalBanner() {
  const upcoming = nextFestival();
  if (!upcoming) {
    festivalBanner.hidden = true;
    return;
  }
  const target = new Date(`${upcoming.date}T00:00:00+05:30`);
  const now = new Date();
  const daysLeft = Math.ceil((target - now) / 86400000);
  festivalBanner.hidden = false;
  festivalBanner.textContent = daysLeft > 0
    ? `${upcoming.name} is in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${upcoming.date})`
    : `${upcoming.name} is today!`;
}

function renderResults(panchang, locationName) {
  resultsEl.hidden = false;
  resultsEl.innerHTML = `
    <div class="card-grid">
      <div class="card"><h3>Location</h3><p>${locationName}</p></div>
      <div class="card"><h3>Tithi</h3><p>${panchang.tithi.paksha} ${panchang.tithi.name}</p></div>
      <div class="card"><h3>Nakshatra</h3><p>${panchang.nakshatra.name} (Pada ${panchang.nakshatra.pada})</p></div>
      <div class="card"><h3>Yoga</h3><p>${panchang.yoga.name}</p></div>
      <div class="card"><h3>Karana</h3><p>${panchang.karana.name}</p></div>
      <div class="card"><h3>Sunrise</h3><p>${fmtTime(panchang.sunrise)}</p></div>
      <div class="card"><h3>Sunset</h3><p>${fmtTime(panchang.sunset)}</p></div>
      <div class="card warn"><h3>Rahu Kaal</h3><p>${fmtRange(panchang.rahuKaal)}</p></div>
      <div class="card good"><h3>Abhijit Muhurat</h3><p>${fmtRange(panchang.abhijit)}</p></div>
    </div>

    <h3 class="section-title">Choghadiya — Day</h3>
    <div class="choghadiya-row">
      ${panchang.choghadiyaDay.map(renderChoghadiyaCell).join("")}
    </div>

    <h3 class="section-title">Choghadiya — Night</h3>
    <div class="choghadiya-row">
      ${panchang.choghadiyaNight.map(renderChoghadiyaCell).join("")}
    </div>

    <p class="disclaimer">
      Computed from Sun/Moon positions using the Lahiri ayanamsa (approximate).
      Cross-check with a trusted panchang before relying on these timings for rituals.
    </p>
  `;
}

function renderChoghadiyaCell(seg) {
  return `
    <div class="chog-cell ${seg.type}">
      <strong>${seg.name}</strong>
      <span>${fmtTime(seg.start)} – ${fmtTime(seg.end)}</span>
    </div>
  `;
}

function update(lat, lon, locationName) {
  const panchang = computePanchang(new Date(), lat, lon);
  renderResults(panchang, locationName);
}

function useCitySelection() {
  const [lat, lon] = citySelect.value.split(",").map(Number);
  const cityName = citySelect.options[citySelect.selectedIndex].textContent;
  locationLabel.textContent = cityName;
  update(lat, lon, cityName);
}

useLocationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    useCitySelection();
    return;
  }
  useLocationBtn.textContent = "Locating…";

  // navigator.geolocation's own `timeout` option only bounds how long
  // position acquisition takes *after* the permission prompt is answered —
  // if the prompt itself is never answered (ignored, or silently blocked by
  // the browser), neither callback fires and the button would hang on
  // "Locating…" forever. This timer forces a fallback regardless.
  let settled = false;
  const fallbackTimer = setTimeout(() => {
    if (settled) return;
    settled = true;
    useLocationBtn.textContent = "Use my location";
    useCitySelection();
  }, 8000);

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (settled) return;
      settled = true;
      clearTimeout(fallbackTimer);
      useLocationBtn.textContent = "Use my location";
      locationLabel.textContent = "Your location";
      update(pos.coords.latitude, pos.coords.longitude, "Your location");
    },
    () => {
      if (settled) return;
      settled = true;
      clearTimeout(fallbackTimer);
      useLocationBtn.textContent = "Use my location";
      useCitySelection();
    },
    { timeout: 8000 }
  );
});

citySelect.addEventListener("change", useCitySelection);

populateCities();
renderFestivalBanner();
useCitySelection();
