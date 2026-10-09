# LocalPDF

A free, no-login PDF toolkit: merge PDFs, split/extract pages, convert
images to PDF, and export PDF pages as images. Everything runs in the
browser — no file is ever uploaded to a server — and it installs as an
offline-capable PWA.

Named deliberately: "Local" is the whole pitch, not just a tagline — every
operation runs in your browser's own JavaScript engine, and the UI
reinforces that at every step (a persistent trust badge, "processed
entirely on this device" in every success message) rather than stating it
once and hoping it's believed.

## What makes a file feel trustworthy to hand to this tool

- **Real previews, not just filenames.** Merge and Images→PDF render an
  actual thumbnail of each file (first PDF page, or the image itself) —
  see `src/hooks/usePdfThumbnails.ts` / `useImageThumbnails.ts`. Split and
  PDF→Images show a thumbnail + page count of the loaded file. You're
  looking at what you're about to process, not trusting a filename.
- **Rename before you download**, on every tool (`FilenameInput`) —
  sanitized against characters that break filenames cross-platform, with
  the extension shown but not editable (so it can't produce a file your
  OS won't open).
- **Sizes shown throughout**: per-file size in every list, a running total
  while you're adding files, and the actual output size in the success
  message after conversion — so there's no mystery about what you're
  about to get.
- **A persistent trust badge** (`TrustBadge`) stays visible near the top
  of every page, not just stated once in a footer nobody reads.

## Stack

- **Vite + React 19 + TypeScript** — app shell and build tooling.
- **Tailwind CSS v4** — styling, via the CSS-first `@theme` config in
  `src/index.css` (no `tailwind.config.js` needed).
- **React Router** — one real route per tool (`/merge`, `/split`,
  `/images-to-pdf`, `/pdf-to-images`), each with its own `<title>`/meta
  description via `useSeo`, which is better for search than a single
  tabbed page.
- **pdf-lib** (MIT) — merge, split, and images→PDF.
- **pdf.js** (Apache-2.0) — PDF→images rendering.
- **fflate** (MIT) — zipping multi-file outputs (split pages, exported
  images).
- **idb-keyval** (Apache-2.0) — the "recent activity" log (see
  Persistence below).
- **vite-plugin-pwa** (Workbox) — service worker + manifest for
  install-to-homescreen and offline use.
- **lucide-react** — icon set.

All three PDF libraries are real npm dependencies bundled by Vite — no
manual vendoring, unlike an earlier iteration of this project.

### Why route-level code splitting matters here

`pdf.js`'s worker alone is over 1MB. It's only needed on `/pdf-to-images`,
so that route (and `pdf-lib`-using routes) are lazy-loaded
(`src/main.tsx`) — the initial JS payload is ~270KB gzipped instead of
~390KB with everything bundled together.

## Persistence — scoped deliberately

Two things are persisted on-device, and nothing else:

- **Theme choice** (`src/hooks/useTheme.ts`) — `localStorage`.
- **Recent activity** (`src/hooks/useRecentActivity.ts`) — an IndexedDB
  log of *metadata only*: which tool was used, a short label, and a
  timestamp. The last 8 entries show under "Recent on this device" on
  each tool page.

**The actual PDF/image bytes are never persisted.** Storing raw files
would bloat browser storage and directly contradict the tool's own
privacy pitch ("nothing about your files is kept anywhere"). If a
"resume my last file across a reload" feature is wanted later, that's a
deliberately different, bigger tradeoff — flag it explicitly rather than
assuming it's wanted.

## PWA / offline support

Verified end-to-end (not just configured): after a first visit, the
service worker precaches the app shell, every route's JS, and — critically
— `pdf.worker.min.mjs` (the Workbox `globPatterns` had to be widened to
include `.mjs`; by default it only grabs `.js`, which silently drops the
pdf.js worker and breaks `/pdf-to-images` offline). All four tools were
tested with the browser context set fully offline, including actually
running a conversion and getting a real downloaded file back, not just
confirming the page loads.

## SEO

- Per-route `<title>` and meta description (`useSeo` hook).
- `public/robots.txt` and `public/sitemap.xml` — **update the placeholder
  domain in both before deploying.**
- Each tool page carries real explanatory content (`ToolContent`
  component): a "why this instead of an upload-based converter" section
  and tool-specific FAQs. This isn't filler — a bare tool widget has
  nothing for search engines to match against and no context for a
  first-time visitor; this was a real gap in an earlier iteration of this
  project that got caught and fixed.
- **Not done**: true prerendering (static HTML snapshots per route for
  crawlers that don't execute JS). Google renders JS-heavy pages fine
  today, so this is a reasonable phase-2 item, not a v1 blocker — noted
  here rather than silently skipped.

## Known gaps / deliberately out of scope

- **Compress PDF** — a real compressor (recompressing embedded images,
  subsetting fonts) is a much bigger effort than the other four tools and
  was left out rather than shipping something that barely shrinks files.
- **Resuming an in-progress file across a reload** — see Persistence
  above.

## Running locally

```
npm install
npm run dev       # dev server with HMR
npm run build     # type-check + production build to dist/
npm run preview   # serve the production build locally
```

## Deploying

Static output (`dist/`) — deploys as-is to Vercel, Netlify, GitHub Pages,
Cloudflare Pages, etc. No environment variables, secrets, or backend
needed. Before going live:

1. Replace `YOUR-DOMAIN-HERE` in `public/robots.txt` and
   `public/sitemap.xml`.
2. Confirm your host serves `/sw.js` and `/manifest.webmanifest` with the
   correct MIME types (most static hosts do this automatically for
   Vite's output).

## Monetization

Two `AdSlot` placeholders per page (`src/components/AdSlot.tsx`) — one
above the tool (in `App.tsx`, shared across all routes) and one
in-content, between the tool and the explanatory/FAQ section. No ad
script is wired in yet; drop an AdSense (or similar) unit into
`AdSlot` when ready.
