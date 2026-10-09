# Aaj Ka Panchang

A daily Panchang / Shubh Muhurat checker for Indian users: Tithi, Nakshatra,
Yoga, Karana, Ritu, Ayana, Disha Shool, sunrise/sunset, moonrise/moonset,
Rahu Kaal, Gulika Kaal, Yamaganda, Abhijit Muhurat, and a full day+night
Choghadiya table — for your city (searchable, ~140 towns) or current
location. No login, no account, no backend.

## Why this exists

Panchang/muhurat checking is a daily habit for a large Indian audience (not
just during festivals), which makes it a good fit for a simple, ad-supported,
no-auth site: people reopen it every day rather than once.

## How the data works

Everything is **computed, not fetched**:

- Sun and Moon ecliptic longitudes come from [Astronomy Engine](https://github.com/cosinekitty/astronomy)
  (MIT licensed), loaded from a CDN as an ES module (`src/panchang.js`).
- Sidereal positions use the **Lahiri (Chitrapaksha) ayanamsa**, approximated
  with a linear formula anchored at J2000.0. This is the convention most
  Indian panchang publishers use, but it's an approximation — see
  "Known limitations" below.
- Tithi, Nakshatra, Yoga, and Karana are derived from those positions using
  the standard classical formulas (12°/tithi, 13°20′/nakshatra, etc).
- Rahu Kaal, Gulika Kaal, Yamaganda, and the Choghadiya table all come from
  dividing the sunrise–sunset (and sunset–next-sunrise) window into 8
  segments, assigned by weekday using standard published tables (the
  planetary-hour/Chaldean sequence for Choghadiya; separate weekday tables
  for the three inauspicious kaal periods).
- Ritu (season) and Ayana (Uttarayana/Dakshinayana) are both derived
  directly from the Sun's sidereal longitude — no extra lookups needed.
- Disha Shool (the direction considered inauspicious to travel in today) is
  a fixed weekday lookup table, independent of location.
- Moonrise/moonset use the same Astronomy Engine rise/set search as
  sunrise/sunset. These can legitimately be blank on some days — the Moon
  rises about 50 minutes later each day, so it doesn't always cross the
  horizon within a given calendar day.
- Location is either the browser's geolocation API (used only in-browser,
  never sent anywhere) or a searchable bundled list of ~140 Indian cities
  and towns (`src/cities.js`), weighted toward Tier-2/3 coverage rather than
  just the usual eight metros — no geocoding API or key required.
- Festival dates for the full year are hardcoded in `src/festivals.js`,
  sourced from several 2026 Hindu calendar publishers (cross-checked for
  agreement), and need a manual update each year (deriving them
  astronomically would require a full luni-solar calendar with regional
  Amanta/Purnimanta rules, which is out of scope for v1). A couple of dates
  (Janmashtami, Ganesh Chaturthi) vary by a day between publishers — the
  most commonly cited date was used in each case.
- **Not included on purpose: daily horoscope/rashifal predictions.** Every
  major panchang site has these, but they're either written by an
  astrologer or sourced from a paid content API — generating "today's
  prediction" algorithmically would just be fabricated content, so it's
  left out rather than faked.

**No user data is collected, stored, or transmitted.** There is no backend,
no database, and no account system.

## Known limitations (read before treating this as authoritative)

- The ayanamsa formula is a linear approximation, not the full Swiss
  Ephemeris nutation-aware model — expect boundary times to be off by at most
  a few minutes versus a reference panchang.
- Sunrise/sunset use geometric astronomical rise/set, not necessarily the
  exact convention (atmospheric refraction, observer altitude) that a given
  regional panchang uses — this can shift every downstream timing slightly.
- The Choghadiya, Gulika Kaal, Yamaganda, and Disha Shool tables are all
  commonly published methods but haven't been cross-validated against a
  reference site for this project yet.
- **Before relying on this for an actual ritual/ceremony, cross-check the
  output against a trusted panchang (e.g. Drik Panchang) for your date and
  city.** The in-app disclaimer says the same thing.

## Running locally

No build step. Serve the folder as static files:

```
npm run dev
```

or simply open `index.html` in a browser (geolocation requires `https://` or
`localhost`, so prefer serving it over opening the file directly).

## Deploying

Static site — deploys as-is to Vercel, Netlify, GitHub Pages, etc. No
environment variables or secrets needed.

## Monetization

Two ad slot placeholders (`.ad-slot` divs in `index.html`) are left empty for
an AdSense (or similar) unit — intentionally no ad script wired in yet.
