# Advanced tools: evidence and remaining gates

This is a development implementation, not a claim of CamScanner/Smallpdf parity. Physical Android/iOS camera, touch, memory, installation and share-target checks remain required before a public release.

| Capability | Result | Scope and next gate |
| --- | --- | --- |
| Password protection | Implemented | QPDF 12.2 WASM, AES-256, random owner password; known-password unlock only. 50 MB input limit. Node round-trip preserved fields and geometry; production browser protected/unlocked and independently reopened three pages with their text. Wrong password produced no output. Rewriting invalidates existing certificate signatures. |
| General PDF optimization | Implemented | Lossless stream/object recompression preserves text/forms and page quality in the fixture. No promised reduction; app keeps the original if output is larger. No aggressive image resampling in this mode. |
| Raster redaction | Implemented with explicit fidelity tradeoff | Every visible page is rendered, marked pixels overwritten, and a fresh PDF built from lossless PNGs. Original objects, text layers, attachments, fields, links and source metadata are never copied. Output is limited to 144 dpi/2600-pixel edge. An independent Node canvas harness exercised the actual exported function: secret-area pixels were black, public text/color remained visible, output contained no text/annotations/attachments/source author/subject/forms, rotated crop dimensions were preserved, and invalid/cancelled jobs rejected. Browser export was reopened by the reader. Users must review every page; older originals remain. Not vector-preserving redaction. |
| Booklet imposition | Implemented | A4/Letter landscape, padding to multiples of four, left/right binding, cropped/rotated page geometry, flattened field appearances. Other annotations/links/attachments omitted. Printer duplex orientation still needs a physical print check. This is not curved-book dewarping. |
| Repair | Withheld after failed probe | This QPDF WASM build returned exit 2 and no output for a deliberately broken startxref. The generic rewrite command is not evidence of repair. No repair button is advertised. Need another validated engine/build and a damaged-file corpus. |
| Vector-preserving redaction | Prototype only | Isolated MuPDF 1.28.1 removed visible secret text and retained public text, but retained secret metadata, an embedded file and a form. It is not a complete sanitization workflow. Not an app dependency. Requires metadata/attachment/annotation handling, adversarial tests and licensing decision. |
| Existing PDF text replacement | Not implemented | Current editor adds marks and fills fields; it does not rewrite existing glyph runs or reflow paragraphs. Need font/encoding/layout corpus and a validated editing engine. |
| Faithful PDF/Office conversion | Not implemented | No client-side engine/fidelity corpus has passed a gate. Plain text extraction/searchable OCR is not Word/Excel/PowerPoint conversion. Assess an engine against tables, fonts, images, pagination and mobile memory before offering these actions. |
| PDF/A | Not implemented | Needs selected conformance level, color/font/metadata handling and an independent validator. No PDF/A label appears in output. |
| Certificate signing | Not implemented | Drawn/typed/imported signatures are visual marks. Certificate signing needs key custody, certificate chain, timestamp and independent validation design. |
| Curved book flattening | Not implemented | Current scan pipeline is perspective correction and filters. Curved-page dewarping needs a validated algorithm and real capture corpus. |

## Engine and asset licensing

QPDF upstream Apache-2.0 license and notices are distributed in `public/licenses/qpdf`; the qpdf-wasm wrapper declares ISC. The WASM binary is from the published npm package, not a locally patched engine. The shipped worker isolates one job and is terminated on completion/cancellation. No passwords or document bytes are sent to a server.

The isolated MuPDF prototype declares AGPL-3.0-or-later. It was deliberately not added to the app. Choosing AGPL distribution obligations or a commercial license requires a separate product decision; no license purchase or project relicensing was made. OCR assets include Apache notices; bundled Devanagari font has its OFL notice.

Primary references: [QPDF wrapper source](https://github.com/neslinesli93/qpdf-wasm), [QPDF encryption CLI](https://qpdf.readthedocs.io/en/stable/cli.html#encryption), [QPDF 12.2 notices](https://github.com/qpdf/qpdf/blob/v12.2.0/NOTICE.md), [MuPDF licensing](https://mupdf.readthedocs.io/en/1.28.5/license.html), [pdf-lib limitations](https://github.com/Hopding/pdf-lib#limitations).

## Reproducible checks

20 tests pass. Production build passes; lint has warnings but no errors. `npm test` covers bounded ranges, signature-based imports, form editing, annotation coordinates at all right-angle rotations/crop origins, page organization, watermark/number ranges, auto-paper/corner validation, backup/restore, AES password round trips, lossless form preservation, repair rejection, and booklet order/geometry.

`scripts/qpdf-probe.mjs` identifies the actual WASM engine. `scripts/repair-probe.mjs` exercises broken cross references. `scripts/redaction-fixture.mjs` generates synthetic visible/form/attachment/metadata secrets for browser redaction inspection. These fixtures contain no personal information.

Responsive and desktop browser evidence is kept outside the repository in the task's implementation-evidence folder. Desktop viewport simulation does not establish physical-device compatibility. Offline OCR was checked by stopping the local server and successfully reopening the cached app and processing a saved scan; browser storage may still be evicted.
