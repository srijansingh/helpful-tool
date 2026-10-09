# LocalPDF

A free, no-login PDF toolkit: merge PDFs, split/extract pages, organize
(reorder/delete/rotate) pages, watermark, add page numbers, convert
images to PDF, export PDF pages as images, and scan physical documents
with your camera — crop, flatten perspective, filter, and build a
multi-page PDF. Everything runs in the browser — no file is ever
uploaded to a server — and it installs as an offline-capable PWA.

Unlike server-based competitors (Smallpdf, iLovePDF and similar), there's
no daily-use cap and no account wall — every tool is fully usable, every
time, because nothing is metered server-side in the first place.

## Homepage (`/`)

A real landing page, not a redirect — hero pitch, three trust callouts
(no upload, no daily limits/account, works offline), and a grid linking
to every tool (`src/routes/HomePage.tsx`, `src/lib/tools.ts`).

## Desktop and keyboard, not just mobile

An enterprise-UX audit (research against Linear/Stripe/Carbon/Maersk
design-system patterns, plus a live audit of this app) found the desktop
layout was a mobile layout stretched onto a wide monitor — a single
narrow column leaving most of a 1536px-wide screen empty — and that
several interactions (page reordering, destructive deletes) had no
keyboard path and no confirmation. Addressed directly:

- **Main container widened** (`max-w-3xl` → `max-w-6xl`, `App.tsx`).
  Merge and Images→PDF get a real two-pane desktop layout: file list on
  the left, a **live-updating preview pane** on the right
  (`LivePreviewPane.tsx`) that rebuilds the actual output PDF (debounced
  500ms) and renders every page as you add/reorder/remove files — not a
  modal you have to ask for. Falls back to the modal-based "Preview PDF"
  on mobile, where there's no width to spare.
- **Split PDF got a real feature, not just more width**: every page
  renders as a clickable thumbnail (`PageRangePicker.tsx`) that toggles
  in/out of the extraction range, synced both ways with the range text
  field (`stringifyPageRanges` in `src/lib/pdf/pageRanges.ts` is the
  inverse of the existing parser). Previously the only way to pick pages
  was typing numbers blind against a single first-page thumbnail.
- **Command palette** (`CommandPalette.tsx`): Cmd/Ctrl+K from any screen,
  or the "Jump to…" trigger in the sidebar / search icon on mobile.
  Type to filter, arrow keys + Enter to navigate, Escape to dismiss.
- **Keyboard-accessible reordering**: the Pointer-Events drag handles in
  the scan filmstrip and Organize's page grid were plain `<div>`s with no
  way to focus or activate them from a keyboard. Both now have real
  Move-earlier/Move-later `<button>`s alongside the drag handle — same
  pattern `FileList` already used, which was itself rebuilt onto Pointer
  Events (from HTML5 drag-and-drop, which doesn't work well on touch) so
  dragging behaves identically everywhere in the app.
- **ConfirmDialog** for genuinely hard-to-recover actions (deleting a
  saved scan, discarding every edit in Organize via "Start Over") and an
  **undo toast** (`useToastStore` + `ToastViewport`) for frequent,
  low-consequence ones (removing a single page or file) — a blocking
  dialog on every page removal would be its own kind of friction.
- **One global `:focus-visible` style** (`index.css`) instead of relying
  on each browser's inconsistent default, and `role="status"
  aria-live="polite"` on `StatusMessage` so success/error messages are
  actually announced to screen readers.

## Organize PDF (`/organize`)

Reorder, delete, and rotate pages in one editor. Page tiles render via
pdf.js (`src/lib/pdf/pageThumbnails.ts`); dragging a tile uses the same
Pointer-Events pattern as the scan filmstrip, generalized to a wrapping
grid via `document.elementFromPoint` instead of a single-row midpoint
check (`src/components/organize/PageGrid.tsx`). Rotation is tracked as a
delta on top of each page's existing `/Rotate` value (read once at load,
in `src/lib/pdf/organize.ts`) — not a replacement for it, so a PDF that
already has rotated pages keeps that rotation and layers the new one on
top.

**Bulk selection**: click a page's number badge to select it (it becomes
a checkmark), shift-click another to select the whole range between —
the standard Gmail-style selection convention. A contextual toolbar
appears with the selection count plus Rotate/Delete for the whole
selection at once, matching the Carbon/Maersk bulk-action-toolbar
pattern (a toolbar that only exists once something's selected, rather
than disabled buttons sitting there all the time). Bulk delete confirms
first (multi-page loss is a bigger deal than one); bulk rotate doesn't,
same as the single-page version. Catching a real bug here is worth
noting: the first version of shift-click range-select was broken because
the "anchor" index was read from a ref *inside* `setState`'s updater
function, but the ref got mutated by a line immediately after the
`setState` call — and since React defers calling that updater until
reconciliation, it ran after the mutation, so the anchor was always
stale. Fixed by capturing the anchor into a local `const` before the
`setState` call. Found by actually testing shift-click range selection
and checking which pages ended up rotated, not by reading the code.

## Watermark PDF (`/watermark`) and Page Numbers (`/page-numbers`)

Two more pdf-lib based tools, both with the live-preview-pane layout from
above. Watermark (`src/lib/pdf/watermark.ts`) stamps centered, rotated,
semi-transparent text across every page — getting that actually centered
under rotation took real geometry: pdf-lib's `drawText` rotates around
its unrotated baseline-left draw origin, not the text's visual center, so
naively centering for 0° and then rotating swings the text off the page.
The fix computes where the rotated center of the text lands relative to
its draw origin and solves backward for the origin that puts that center
at the page's actual center. Page Numbers (`src/lib/pdf/pageNumbers.ts`)
places `n` or `n of total` at any of 6 corners/edges, with a configurable
start number for documents that aren't paginated from 1.

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
- **A persistent trust badge** (`TrustBadge`) stays visible on every page —
  the full pill in the sidebar on desktop, an icon-only `compact` variant
  in the mobile top bar so it costs a badge, not a whole line of text, on
  every screen — not just stated once in a footer nobody reads.

## Visual design

Cool neutral grays + a single indigo accent (`src/index.css`), not the
warm cream/orange this started with — reads as a product, not a craft
project, and leaves room to grow into an AI-tool direction without a
second palette change later. No per-page explanatory paragraphs or FAQ
blocks, and no inline ad placeholders (see Monetization) — on a tool
people open to do one thing quickly, a dashed "AD SPACE" box and a wall
of boilerplate text cost more in perceived quality than they'd ever earn
back before a real ad unit exists.

## App shell, not a webpage with a tool embedded in it

A pill-tab row that scrolls off and a loose stack of elements on a page
background reads as a website. This instead uses a real application
shell:

- **A persistent left sidebar** (`Sidebar.tsx`) on tablet/desktop — brand,
  nav, trust badge and theme toggle all stay in view; `position: sticky`
  with its own scroll, so it never scrolls away even on a long page. On
  mobile, a **fixed bottom tab bar** (`BottomTabBar.tsx`) takes over —
  native-app navigation, not a website's. The bar caps itself at the 4
  most-used tools (`PRIMARY_MOBILE_TOOLS`) plus a "More" tab that opens
  the command palette, rather than cramming every tool in as the list
  grows. Both share one source of truth for the tool list
  (`src/lib/tools.ts`).
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
- **React Router** — a real homepage plus one real route per tool (`/`,
  `/scan`, `/scans`, `/merge`, `/split`, `/organize`, `/images-to-pdf`,
  `/pdf-to-images`), each with its own `<title>`/meta description via
  `useSeo`, which is better for search than a single tabbed page.
- **Zustand** — one small store per tool (`src/store/`). A Zustand store is
  a module-level singleton that lives outside the route tree, so switching
  tabs — intentionally or by accident — doesn't unmount-and-lose whatever
  files/settings were in progress, which plain component `useState` did.
- **pdf-lib** (MIT) — merge, split, organize, watermark, page numbers,
  and images→PDF.
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
  each PDF tool page, and unfiltered (every tool together) on the
  homepage as a returning-user dashboard. Each entry links back to its
  tool (`RecentActivity.tsx`) — that's the honest version of "resume,"
  since the actual file bytes are never kept (next point): no thumbnail,
  no restored file, just a fast way back to the right tool.
- **Scan library** (`src/hooks/useScanLibrary.ts`) — the one deliberate
  exception: real image bytes, in IndexedDB. See Document scanner above
  for why.
- **In-memory tool state** (`src/store/`, Zustand) — files/settings
  survive switching tabs within a session, but not a full page reload
  (Zustand state is plain memory here, no persistence middleware).

**For the non-scan PDF tools specifically, the actual PDF/image bytes are
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
- **Not done**: true prerendering (static HTML snapshots per route for
  crawlers that don't execute JS). Google renders JS-heavy pages fine
  today, so this is a reasonable phase-2 item, not a v1 blocker — noted
  here rather than silently skipped.

## Known gaps / deliberately out of scope

- **Compress PDF** — a real compressor (recompressing embedded images,
  subsetting fonts) is a much bigger effort than the other tools here and
  was left out rather than shipping something that barely shrinks files.
- **Protect/Unlock (password)** — pdf-lib has no built-in PDF encryption;
  doing this properly needs its own scoping pass, not a bolt-on.
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

Deliberately not inline ad slots — a dashed "AD SPACE" placeholder block
on every page read as unfinished and ate real screen space for nothing
shown. The plan instead: ads triggered by an action (e.g. shown briefly
around a download) or floating/dismissible, added once there's an actual
ad unit to wire in rather than reserving layout space for one today.
