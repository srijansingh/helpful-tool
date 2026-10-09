# Aaj Ka Panchang

A daily Panchang / Shubh Muhurat checker for Indian users: Tithi, Nakshatra,
Yoga, Karana, sunrise/sunset, Rahu Kaal, Abhijit Muhurat, and a Choghadiya
table — for your city or current location. No login, no account, no backend.

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
- Rahu Kaal and the Choghadiya table come from dividing the sunrise–sunset
  (and sunset–next-sunrise) window into 8 segments, assigned by weekday using
  the standard planetary-hour (Chaldean) sequence.
- Location is either the browser's geolocation API (used only in-browser,
  never sent anywhere) or a bundled static list of ~45 Indian cities
  (`src/cities.js`) — no geocoding API or key required.
- Festival dates for the current season are hardcoded in `src/festivals.js`
  and need a manual update each year (deriving them astronomically would
  require a full luni-solar calendar, which is out of scope for v1).

**No user data is collected, stored, or transmitted.** There is no backend,
no database, and no account system.

## Known limitations (read before treating this as authoritative)

- The ayanamsa formula is a linear approximation, not the full Swiss
  Ephemeris nutation-aware model — expect boundary times to be off by at most
  a few minutes versus a reference panchang.
- Sunrise/sunset use geometric astronomical rise/set, not necessarily the
  exact convention (atmospheric refraction, observer altitude) that a given
  regional panchang uses — this can shift every downstream timing slightly.
- The Choghadiya algorithm is a commonly published method but hasn't been
  cross-validated against a reference site for this project yet.
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
