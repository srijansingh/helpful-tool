# LocalPDF

A free, no-login PDF toolkit: merge PDFs, split/extract pages, convert
images to PDF, export PDF pages as images, and scan physical documents
with your camera — crop, flatten perspective, filter, and build a
multi-page PDF. Everything runs in the browser — no file is ever
uploaded to a server — and it installs as an offline-capable PWA.

## Document scanner (`/scan`, `/scans`)

Opens on a choice, not a camera permission prompt: **Use Camera** or
**Upload Photos** (`src/components/scan/CameraCapture.tsx`), the latter
accepting one file or a whole batch at once.

- **Single photo** (camera shot, or one uploaded file) → drag-corner
  perspective crop → filter presets → added as a page.
- **Batch upload** (multiple files at once) skips the per-image editor
  entirely — cropping five photos one at a time isn't what picking a
  batch is for — and lands straight in the page filmstrip, ready to
  reorder and export.
- **Drag-to-reorder** (`src/components/scan/PageFilmstrip.tsx`) uses the
  Pointer Events API, not HTML5 drag-and-drop — HTML5 DnD barely works on
  touch, and this is a touch-first feature.
- **PDF preview** (`src/components/PdfPreview.tsx`) renders the actual
  built PDF, page by page, via pdf.js, in a vertically scrollable modal —
  so you see what you're about to download, not just the last page you
  edited.
- **No OpenCV.js / jscanify.** Auto edge-detection needs real computer
  vision, which means either an 8-10MB WASM dependency or `jscanify`
  (which ships `canvas`/`jsdom` — Node-only packages — as hard
  dependencies, a real risk for a browser bundle). Manual corner-dragging
  ships instead, as the actual feature rather than a lesser fallback —
  it's also how you'd fix CamScanner's own auto-detection when it's
  wrong. Auto-detection is a documented, not abandoned, v2 addition.
- **Perspective correction** (`src/lib/scan/perspective.ts`) is Heckbert's
  square-to-quad projective mapping, implemented from scratch and
  numerically verified against known corner/midpoint cases before it
  touched any UI.
- **The scan library persists real image bytes** in IndexedDB
  (`src/hooks/useScanLibrary.ts`) — a deliberate exception to the
  metadata-only rule the PDF tools' "recent activity" follows (see
  Persistence below): there, keeping files would contradict the "nothing
  is stored" pitch; here, persistence is the whole point of a document
  library, and the UI says so explicitly.
- **Global state**: scan session pages live in `useScanStore` (Zustand),
  same pattern as the four PDF tools — switching tabs mid-scan doesn't
  lose your pages.

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
- **A persistent trust badge** (`TrustBadge`) stays visible on every page
  (in the sidebar on desktop, the top bar on mobile), not just stated once
  in a footer nobody reads.

## App shell, not a webpage with a tool embedded in it

A pill-tab row that scrolls off and a loose stack of elements on a page
background reads as a website. This instead uses a real application
shell:

- **A persistent left sidebar** (`Sidebar.tsx`) on tablet/desktop — brand,
  nav, trust badge and theme toggle all stay in view; `position: sticky`
  with its own scroll, so it never scrolls away even on a long page. On
  mobile, a **fixed bottom tab bar** (`BottomTabBar.tsx`) takes over —
  native-app navigation, not a website's. Both share one source of truth
  for the tool list (`src/lib/tools.ts`).
- **Elevated workspace panels** (`Card.tsx`) — each tool's dropzone, file
  list, rename field and action button sit inside one bounded, shadowed
  panel, not loose on the page background. The trust note stays outside
  it, as ordinary page content below.
- **Real drag-and-drop reordering** (`FileList.tsx`, native HTML5 DnD) via
  a grip handle, alongside the up/down buttons (kept for accessibility
  and because HTML5 drag-and-drop isn't usable on touch — the handle is
  hidden below the `sm` breakpoint for that reason, not by oversight).
- **Skeleton loading states** for thumbnails (a pulsing placeholder) while
  pdf.js renders the first page, instead of a static icon that gives no
  sense that something is happening.

## Stack

- **Vite + React 19 + TypeScript** — app shell and build tooling.
- **Tailwind CSS v4** — styling, via the CSS-first `@theme` config in
  `src/index.css` (no `tailwind.config.js` needed).
- **React Router** — one real route per tool (`/scan`, `/scans`, `/merge`,
  `/split`, `/images-to-pdf`, `/pdf-to-images`), each with its own
  `<title>`/meta description via `useSeo`, which is better for search than
  a single tabbed page.
- **Zustand** — one small store per tool (`src/store/`). A Zustand store is
  a module-level singleton that lives outside the route tree, so switching
  tabs — intentionally or by accident — doesn't unmount-and-lose whatever
  files/settings were in progress, which plain component `useState` did.
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

On-device only, nothing sent anywhere, but two different rules apply
depending on the tool:

- **Theme choice** (`src/hooks/useTheme.ts`) — `localStorage`.
- **Recent activity** (`src/hooks/useRecentActivity.ts`) — an IndexedDB
  log of *metadata only*: which tool was used, a short label, and a
  timestamp. The last 8 entries show under "Recent on this device" on
  each PDF tool page.
- **Scan library** (`src/hooks/useScanLibrary.ts`) — the one deliberate
  exception: real image bytes, in IndexedDB. See Document scanner above
  for why.
- **In-memory tool state** (`src/store/`, Zustand) — files/settings
  survive switching tabs within a session, but not a full page reload
  (Zustand state is plain memory here, no persistence middleware).

**For the four PDF tools specifically, the actual PDF/image bytes are
never persisted.** Storing raw files there would bloat browser storage
and directly contradict those tools' privacy pitch ("nothing about your
files is kept anywhere"). If a "resume my last file across a reload"
feature is wanted for them too, that's a
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
- Each tool page carries a one-line trust note (`ToolContent` component)
  under the tool itself, so there's some real text for search engines to
  match against beyond the UI chrome — kept short deliberately; an
  earlier version padded this out with a formal intro paragraph and a
  full FAQ block per page, which read like a terms-of-service page and
  made every tool a long scroll on mobile for no real benefit.
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
in-content, between the tool and the trust note. No ad
script is wired in yet; drop an AdSense (or similar) unit into
`AdSlot` when ready.
