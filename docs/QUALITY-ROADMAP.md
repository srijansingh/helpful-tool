# Approved product-quality implementation

Approved 10 October 2026. Existing capabilities only. Baseline tag: `pre-quality-roadmap-2026-10-10` (`72d5998`).

## Phase 1 — reliability foundation

Implemented contextual encrypted-PDF import, password retries, owner authentication via file-based QPDF JSON (no password console output), permission-aware read text, corrupt/zero-page gates and preserved originals. Page-copy tasks explain interactive-form flattening and attachment/bookmark/metadata loss before accepting; visible form values are retained after consent.

Strict split validation rejects mixed invalid tokens. PDF writes run in cancellable workers; route changes terminate those workers. Lazy thumbnail rendering is serial, cached within bounds, and presents at most 36 page tiles per window, with explicit page navigation. Crop/rotation-aware stamping uses the same transform as the editor.

Scan crop/filter drafts survive navigation in memory; source pages and PDF save in one IndexedDB write. Backup export and restore share limits; complete records restore in one transaction. Repeated result saves use a stable identity. Larger compression candidates do not become default. Encoding MIME and image/page/input/output budgets prevent ambiguous or unbounded output.

Validated: production build, regression tests and browser password retry, owner-password retry, form-copy consent/reopen, strict split, 500-page bounded grid, retained scan crop and atomic scan-source save. Evidence lives outside the repository in the user's `quality-implementation-evidence` folder.

## Phase 2 — document workspaces

Watermark and page-number tools show a persistent document preview on mobile and a document/inspector layout on desktop. Options move into a focus-contained mobile sheet; export remains reachable outside it. Editor annotation controls use named icons and settings follow the page instead of pushing it below the fold. Merge and image-to-PDF previews are available at mobile widths. Task navigation includes an explicit return to Tools, tablet layouts retain full content width, and keyboard users can skip navigation.

Preview identity tracks actual source bytes, including equal-name/equal-size replacements. Changing settings clears the old preview immediately. Dialogs cover textarea/select/summary controls, isolate background focus, restore focus and handle Escape. Range and checkbox targets meet the chosen 44px touch target standard.

Validation: production build, existing regression tests, and mobile settings/preview browser checks. This is the shared workspace foundation; full editor mark interaction, richer contextual previews and every physical-device accessibility gate remain tracked for subsequent work.

## Phase 3 — existing-feature refinements

Form export clears choices, supports option lists, respects read-only controls and surfaces unsupported fields. Annotation size/movement controls work with keyboard input; clamped pen translation moves strokes by their actual allowed displacement. A named annotation list makes existing marks reachable without pointing at the canvas. Signature/logo imports use bounded decoding. Image editing previews crop/rotation/encoding with stale-preview cancellation and full-resolution export.

Filled form values update in a cancellable preview, and form/annotation controls share a contextual mobile sheet. Compression reuses raster sources and offers source/result review before download; larger candidates keep the original preferred. Redaction drafts survive navigation with live rectangle feedback and per-area review/removal.

Scan saves update the current document after an atomic library write. Saving an already saved document retains its scan sources and OCR text; reopening restores its saved identity. Backup scope follows the current search/folder so large libraries can be exported in smaller groups. OCR preparation is cancellable and rejects HTML fallback downloads. PDF CMaps, standard fonts and image decoders are packaged locally and precached. Share staging follows the same 100-file/50MB batch limit as import. Permission gates reflect the selected task, and booklet setup exposes front/back sheet order and blank-page count.

Validated: 31 regression tests including independent form clearing/read-only preservation, option-list filling and pen boundaries; production/PWA build. Local image-preview and form browser checks supplement library tests. Physical camera, cross-platform share and printer validation remain release gates.

## Phase 4 — consistency and release qualification

Tool groups are shared between navigation and discovery. Task-language search supports phrases such as “combine pages” and “extract pages”; keyboard search exposes the active option and a focus-contained close action. Nested dialogs respond to Escape only at the top of the stack. Action fills and accent text use separate dark-theme tokens; foreground colors stay legible across themes. Organize tiles reserve room for 44px controls. Tablet document previews use the available width rather than squeezing beside a desktop inspector.

Stale preview workers are aborted when settings change. Image-to-PDF settings survive navigation, and file order is frozen during export. Route/chunk failures offer original-file download and return-to-tools recovery. OCR exceptions are normalized, the worker uses a direct same-origin URL, and extracted text survives output publication and navigation. Update guidance covers temporary drafts and distinguishes OCR preparation from PDF app caching.

Validation evidence and remaining release gates: [QUALITY-RELEASE-CHECKS.md](./QUALITY-RELEASE-CHECKS.md).

## Release scope and remaining qualification

The four implementation milestones are delivered for the existing feature set. This does not certify every device, every PDF producer or enterprise readiness. Physical iOS/Android camera and installed share targets, screen-reader assessment, printed booklet folding and moderated usability remain required release qualification. Automated and desktop-browser checks do not substitute for those results.

Page-copy operations still use the disclosed form-flattening/catalog-loss fallback rather than a new native form/bookmark/attachment preservation engine. Scans and raster transformations retain their documented quality/page/pixel budgets. Page grids are bounded windows, not continuous virtualized scrolling. Some scan filters, archive encoding and fit/insert operations still run on the main thread; very large work should continue to use the visible bounds, and further worker migration remains a performance follow-up. These limitations are tracked explicitly rather than hidden behind a full-coverage claim.
