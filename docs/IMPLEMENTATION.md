# Approved implementation roadmap

Baseline restore tag: `pre-mobile-roadmap-2026-10-10` (`4c5ae02`).

All four phases approved on 10 October 2026. Validate, commit and push each phase separately on main, the existing Vercel development branch. Advanced features retain feasibility and correctness gates; prototypes are not finished tools.

## Phase 1
Mobile destinations, compact dashboard, Tools, Settings, opt-in local Files, shared document/result actions, automatic tool handoff, PWA update prompt, installation guidance, system fonts, signature-based file validation, bounded range parsing and export guards.

Temporary source files remain in memory. Saved Files persist Blobs in IndexedDB; existing scan library remains accessible without mutating its data. No document data is uploaded.

Physical Android/iOS, user studies and Vercel checks require target devices/deployment access; do not claim those from desktop responsive testing.
