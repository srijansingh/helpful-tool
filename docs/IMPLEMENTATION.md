# Approved implementation roadmap

Baseline restore tag: `pre-mobile-roadmap-2026-10-10` (`4c5ae02`).

All four phases approved on 10 October 2026. Validate, commit and push each phase separately on main, the existing Vercel development branch. Advanced features retain feasibility and correctness gates; prototypes are not finished tools.

## Phase 1
Mobile destinations, compact dashboard, Tools, Settings, opt-in local Files, shared document/result actions, automatic tool handoff, PWA update prompt, installation guidance, system fonts, signature-based file validation, bounded range parsing and export guards.

Temporary source files remain in memory. Saved Files persist Blobs in IndexedDB; existing scan library remains accessible without mutating its data. No document data is uploaded.

Physical Android/iOS, user studies and Vercel checks require target devices/deployment access; do not claim those from desktop responsive testing.

## Phase 2
Implemented: lazy page reader with page navigation, zoom, text search and selectable extracted text; PDF annotation/visual signature editor with selection/move/resize/delete and session undo/redo; text/checkbox/dropdown/radio form values and optional flatten; mixed PDF/photo merge; image PDF paper, orientation, margins, fit and JPEG quality; selected-page/resolution/quality image exports with cancellation; watermark ranges/placement/color/repeat/logo and bundled English/Devanagari font; page number ranges/skip cover/prefix/margin; duplicate/blank/insert/replace/crop/paper-fit page actions; image trim/rotate/resize/format/quality; explicit raster scan compression and best-effort upload limits.

Checks: 9 Node tests pass; production build passes; lint has warnings but no errors. Responsive editor at 320px has no horizontal overflow. Added text exported, reopened by the reader and verified in extracted page text; undo/redo worked in the browser.

Limits: existing PDF text is not replaced. Signatures are visual marks, not certificate signatures. Image crop currently trims all edges by a percentage. PDF crop hides content and is not redaction. Paper fitting does not preserve interactive forms/links/annotations. Unicode coverage is English and Devanagari; unsupported glyphs are rejected. Exact upload size is not guaranteed. PDFs with unsupported dynamic/XFA forms are outside the form editor scope. Device camera and touch behavior remain to be checked on physical phones.
