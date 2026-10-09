# PDF Toolkit

A free, no-login PDF toolkit: merge PDFs, split/extract pages, convert
images to PDF, and export PDF pages as images. Everything runs in the
browser — no file is ever uploaded to a server.

## Why this exists

Most free PDF tools (iLovePDF, Smallpdf, etc.) work by uploading your file
to a server for processing. That's a real privacy cost for documents with
personal details (IDs, forms, contracts), and it also means the tool is
only as fast as your upload speed. Doing the same operations client-side
removes both problems, and it's a genuinely "boring but useful" tool
people reopen constantly — exactly the kind of site that works well
ad-supported with no account system.

## How it works

Everything runs in the browser via vendored, locally-hosted open-source
libraries — no CDN dependency, no runtime network calls:

- **[pdf-lib](https://github.com/Hopding/pdf-lib)** (MIT) — creating,
  merging, and splitting PDF documents. Used for Merge, Split, and
  Images → PDF.
- **[pdf.js](https://github.com/mozilla/pdf.js)** (Apache-2.0) — rendering
  PDF pages to a canvas. Used for PDF → Images.
- **[fflate](https://github.com/101arrowz/fflate)** (MIT) — zipping
  multiple output files (split pages, exported images) into one download.

All three are vendored as their browser ESM builds in `vendor/` — see
`src/merge.js`, `src/split.js`, `src/imagesToPdf.js`, and
`src/pdfToImages.js` for how each is used.

### Tools

- **Merge PDFs** — pick multiple PDFs, reorder them, combine into one.
- **Split PDF** — either extract a page range (e.g. `1-3,5,8`) into one
  PDF, or split every page into its own file (downloaded as a zip).
- **Images → PDF** — combine JPG/PNG/WebP/etc. images into a single PDF,
  one image per page.
- **PDF → Images** — export every page of a PDF as a JPG or PNG
  (downloaded as a zip when there's more than one page).

### Not included (yet)

- **Compress PDF** — genuinely compressing a PDF (recompressing embedded
  images, subsetting fonts) well is a much bigger effort than the other
  four tools and was left out of v1 rather than shipping something that
  barely shrinks files.
- A page-reorder/delete tool for a *single* PDF (distinct from Split) —
  Split's "extract pages" can emulate reordering by listing pages in the
  wanted order, but a dedicated drag-to-reorder editor is a reasonable
  v2 addition.

## Running locally

No build step. Serve the folder as static files:

```
npm run dev
```

or open `index.html` directly (file inputs and canvas rendering work fine
without a server, unlike the geolocation-dependent tools in some other
projects).

## Deploying

Static site — deploys as-is to Vercel, Netlify, GitHub Pages, etc. No
environment variables, secrets, or backend needed.

## Monetization

Two ad slot placeholders (`.ad-slot` divs in `index.html`) are left empty
for an AdSense (or similar) unit — intentionally no ad script wired in yet.
