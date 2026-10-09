// Core Panchang computation — pure astronomy, computed client-side.
// No data is fetched from or sent to any server. Everything below is derived
// from Sun/Moon positions via the Astronomy Engine library (MIT licensed),
// vendored locally in vendor/astronomy-engine.js so the page has no runtime
// dependency on a third-party CDN.
import * as Astronomy from "../vendor/astronomy-engine.js";

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];

const YOGAS = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
  "Sukarma", "Dhriti", "Shoola", "Ganda", "Vriddhi", "Dhruva",
  "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana",
  "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla",
  "Brahma", "Indra", "Vaidhriti",
];

const TITHI_NAMES = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi",
  "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi",
  "Trayodashi", "Chaturdashi",
];

const KARANA_MOVABLE = ["Bava", "Balava", "Kaulava", "Taitila", "Garija", "Vanija", "Vishti"];
const KARANA_FIXED_TAIL = ["Shakuni", "Chatushpada", "Naga"];

// Planetary-hour (Chaldean) order used to assign Choghadiya lords.
const CHALDEAN_ORDER = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"];
const CHOGHADIYA_INFO = {
  Sun: { name: "Udveg", type: "bad" },
  Venus: { name: "Chal", type: "good" },
  Mercury: { name: "Labh", type: "good" },
  Moon: { name: "Amrit", type: "good" },
  Saturn: { name: "Kaal", type: "bad" },
  Jupiter: { name: "Shubh", type: "good" },
  Mars: { name: "Rog", type: "bad" },
};
// Date.getDay(): 0=Sunday ... 6=Saturday
const WEEKDAY_DAY_LORD = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const RAHU_KAAL_SEGMENT = [8, 2, 7, 5, 6, 4, 3]; // 1-indexed segment of the 8-part day, by weekday
const GULIKA_KAAL_SEGMENT = [7, 6, 5, 4, 3, 2, 1];
const YAMAGANDA_SEGMENT = [5, 4, 3, 2, 1, 7, 6];
const DISHA_SHOOL = ["West", "East", "North", "North", "South", "West", "East"];

const RITU_NAMES = ["Vasant", "Grishma", "Varsha", "Sharad", "Hemant", "Shishir"];

function norm360(deg) {
  return ((deg % 360) + 360) % 360;
}

// Linear approximation of the Lahiri (Chitrapaksha) ayanamsa, the convention
// used by most Indian panchang publishers. Anchored at J2000.0 = 23.8427778deg
// with a precession rate of 0.0139644 deg/year. This is accurate to within a
// few arcseconds for the current era, which is well inside the precision
// needed for tithi/nakshatra boundaries, but it is an approximation — Swiss
// Ephemeris' true Lahiri model includes nutation terms this does not.
function lahiriAyanamsa(date) {
  const decimalYear = date.getUTCFullYear() + date.getUTCMonth() / 12;
  return 23.8427778 + 0.0139644 * (decimalYear - 2000);
}

const IST_OFFSET_MS = 5.5 * 3600 * 1000;

// Anchors a search instant at local (IST) midnight of the given date's
// calendar day. Sunrise/sunset searches must start from here rather than
// from "now" — Astronomy Engine's SearchRiseSet walks forward in time, so
// searching from the current moment would skip past today's sunrise once
// it has already happened (rolling over to tomorrow's) while sunset search
// from the same moment still finds today's, producing a corrupted,
// inverted day window.
function startOfDayIST(date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return new Date(Date.UTC(y, m, d, 0, 0, 0) - IST_OFFSET_MS);
}

function siderealLongitudes(date) {
  const ayanamsa = lahiriAyanamsa(date);
  const sunTropical = Astronomy.SunPosition(date).elon;
  const moonTropical = Astronomy.EclipticGeoMoon(date).lon;
  return {
    ayanamsa,
    sun: norm360(sunTropical - ayanamsa),
    moon: norm360(moonTropical - ayanamsa),
  };
}

function computeTithi(sunSid, moonSid) {
  const elong = norm360(moonSid - sunSid);
  const index = Math.floor(elong / 12); // 0-29
  const paksha = index < 15 ? "Shukla" : "Krishna";
  const inPaksha = index % 15; // 0-14
  const name = inPaksha === 14
    ? (paksha === "Shukla" ? "Purnima" : "Amavasya")
    : TITHI_NAMES[inPaksha];
  return { number: index + 1, paksha, name, elongation: elong };
}

function computeNakshatra(moonSid) {
  const span = 360 / 27;
  const index = Math.floor(moonSid / span);
  const pada = Math.floor((moonSid % span) / (span / 4)) + 1;
  return { name: NAKSHATRAS[index], pada };
}

function computeYoga(sunSid, moonSid) {
  const span = 360 / 27;
  const value = norm360(sunSid + moonSid);
  const index = Math.floor(value / span);
  return { name: YOGAS[index] };
}

function computeKarana(elongation) {
  const index = Math.floor(elongation / 6); // 0-59
  if (index === 0) return { name: "Kimstughna" };
  if (index >= 57) return { name: KARANA_FIXED_TAIL[index - 57] };
  return { name: KARANA_MOVABLE[(index - 1) % 7] };
}

// Season (Ritu), derived purely from the Sun's sidereal longitude: each
// ritu spans two sidereal rashis (60deg), starting with Vasant at the
// Meena/Mesha (Pisces/Aries) boundary.
function computeRitu(sunSid) {
  const shifted = norm360(sunSid - 330);
  return RITU_NAMES[Math.floor(shifted / 60) % 6];
}

// Ayana, using the sidereal (not tropical) solstice convention most Indian
// panchang publishers use: Uttarayana runs from Makar Sankranti (Sun
// entering sidereal Capricorn, ~270deg) to just before Karka Sankranti
// (Sun entering sidereal Cancer, 90deg).
function computeAyana(sunSid) {
  return (sunSid >= 270 || sunSid < 90) ? "Uttarayana" : "Dakshinayana";
}

function buildChoghadiya(startTime, segmentMs, startLordIndex) {
  const segments = [];
  for (let i = 0; i < 8; i++) {
    const lord = CHALDEAN_ORDER[(startLordIndex + i) % 7];
    segments.push({
      lord,
      ...CHOGHADIYA_INFO[lord],
      start: new Date(startTime.getTime() + i * segmentMs),
      end: new Date(startTime.getTime() + (i + 1) * segmentMs),
    });
  }
  return segments;
}

/**
 * Computes the full panchang for a given date and location.
 * @param {Date} date - any JS Date on the day of interest.
 * @param {number} lat
 * @param {number} lon
 */
export function computePanchang(date, lat, lon) {
  const { ayanamsa, sun: sunSid, moon: moonSid } = siderealLongitudes(date);
  const tithi = computeTithi(sunSid, moonSid);
  const nakshatra = computeNakshatra(moonSid);
  const yoga = computeYoga(sunSid, moonSid);
  const karana = computeKarana(tithi.elongation);
  const ritu = computeRitu(sunSid);
  const ayana = computeAyana(sunSid);

  const observer = new Astronomy.Observer(lat, lon, 0);
  const dayAnchor = startOfDayIST(date);
  const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, 1, dayAnchor, 1);
  const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, dayAnchor, 1);
  // The Moon rises ~50min later each day, so it doesn't always cross the
  // horizon within a given calendar day — these can legitimately come back
  // null (e.g. around the new moon, moonrise can land just past midnight).
  const moonrise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, 1, dayAnchor, 1);
  const moonset = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, dayAnchor, 1);

  const weekday = date.getDay();
  const dishaShool = DISHA_SHOOL[weekday];

  let rahuKaal = null;
  let gulikaKaal = null;
  let yamaganda = null;
  let abhijit = null;
  let choghadiyaDay = [];
  let choghadiyaNight = [];

  if (sunrise && sunset) {
    const dayStart = sunrise.date;
    const dayEnd = sunset.date;
    const dayMs = dayEnd.getTime() - dayStart.getTime();
    const segLen = dayMs / 8;

    const segmentWindow = (segmentTable) => {
      const seg = segmentTable[weekday];
      return {
        start: new Date(dayStart.getTime() + (seg - 1) * segLen),
        end: new Date(dayStart.getTime() + seg * segLen),
      };
    };
    rahuKaal = segmentWindow(RAHU_KAAL_SEGMENT);
    gulikaKaal = segmentWindow(GULIKA_KAAL_SEGMENT);
    yamaganda = segmentWindow(YAMAGANDA_SEGMENT);

    const muhurtaLen = dayMs / 15;
    abhijit = {
      start: new Date(dayStart.getTime() + 7 * muhurtaLen),
      end: new Date(dayStart.getTime() + 8 * muhurtaLen),
    };

    const dayLord = WEEKDAY_DAY_LORD[weekday];
    const startLordIndex = CHALDEAN_ORDER.indexOf(dayLord);
    choghadiyaDay = buildChoghadiya(dayStart, segLen, startLordIndex);

    const nextSunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, 1, dayEnd, 1);
    if (nextSunrise) {
      const nightMs = nextSunrise.date.getTime() - dayEnd.getTime();
      const nightSegLen = nightMs / 8;
      choghadiyaNight = buildChoghadiya(dayEnd, nightSegLen, (startLordIndex + 1) % 7);
    }
  }

  return {
    ayanamsa,
    tithi,
    nakshatra,
    yoga,
    karana,
    ritu,
    ayana,
    dishaShool,
    sunrise: sunrise ? sunrise.date : null,
    sunset: sunset ? sunset.date : null,
    moonrise: moonrise ? moonrise.date : null,
    moonset: moonset ? moonset.date : null,
    rahuKaal,
    gulikaKaal,
    yamaganda,
    abhijit,
    choghadiyaDay,
    choghadiyaNight,
  };
}
