# PDF Signal Check — independent technical review

Date: 8 October 2026  
Reviewed commit: `33ed03f` on `feature/initial-implementation`  
Profile: technical architecture, correctness, resource safety, privacy, evidence and export delivery  
Mode: review only; no product changes, paid model calls, secret inspection, push or deployment

## Assessment

The project has unusually clear boundaries for a browser PDF tool: structural acceptance is separate from AI advice; source identities and attempt epochs protect against stale work; cancellation terminates workers; exports capture a fixed report; batch retention pauses for an explicit decision rather than silently discarding evidence. These are worth preserving.

Four confirmed issues deserve follow-up. The highest priority is a resource cap missing from the automatically rendered page images. The others concern About-page keyboard navigation, the accessibility of the tool’s own PDF output, and disagreement between batch and individual report summaries. No PDF upload or unexpected model download was found in the reviewed code or sampled no-AI browser flow. That finding is bounded by the review coverage below, not a security certification.

## Confirmed findings

### T1 — P1: Apply the canvas limits to pinned whole-page images

**Evidence:** `src/evidence/crops.js:44`–55, especially the scale calculation at line 48. `renderWholePage()` limits width and magnification but has no height or total-pixel cap. The other crop path already enforces both at `src/evidence/crops.js:23`; the larger preview also caps them at `src/evidence/preview-session.js:116`–124. `src/review/PagePins.jsx:173` and `:180` invoke this uncapped path automatically as a page approaches the viewport.

**Safe reproduction:** Execute the exact `renderWholePage()` method with a fake page viewport and a recording canvas, avoiding a large real allocation. A 450 × 14,400 point page at the normal 900px requested width produces a **900 × 28,800px canvas: 25,920,000 pixels, approximately 99 MiB for RGBA alone**. This exceeds both the documented 4,096px side and 8-million-pixel budgets. The PDF need not be a large file or have many pages. A larger `/UserUnit` can increase the dimensions further.

**Impact:** Tall diagrams, posters, unusual page boxes or adversarial input can create substantial UI-thread raster allocations, fail to render or destabilize a memory-constrained browser. The evidence service serializes rendering, which helps, but does not impose the missing allocation bound.

**Suggested solution:** Share one viewport-budget calculation across page pins, crop rendering and the large preview. Enforce finite positive dimensions, the maximum side, total pixels and requested resolution before assigning canvas dimensions. Preserve the viewport transform used for fractional pin positions.

**Validation:** Add a meaningful geometry/allocation contract test using tall, wide, rotated and large-UserUnit pages. Assert every renderer stays within the same limits and pins retain correct locations. Then render an unusual but harmless page in a mobile-size browser. A test should inspect the dimensions passed to the renderer, not just duplicate a scale formula.

### T2 — P2: The generated fix-list PDF lacks the document semantics the project promotes

**Evidence:** `src/export/report.js:20`–30 creates pages and draws text/images, while `:92` sets title, subject and creator only. The fresh browser download `/tmp/astra-technical-fix-list.pdf` has **no `/Lang`, `/StructTreeRoot` or `/MarkInfo`**; Poppler reports `Tagged: no`. This is confirmed output behavior, not an inference from an omitted test. The unsupported-character fallback at `src/export/report.js:27` rasterizes text; the output already explains this limitation and preserves exact Unicode in JSON.

**Reproduction:** Choose “Partly prepared”, select no AI, finish analysis, download the fix list. Inspect the PDF catalog or run `pdfinfo`. The result reviewed here is 11 pages and 90,409 bytes, titled “PDF Signal Check - fix list for partly-prepared.pdf”.

**Impact:** A recipient of the recommended hand-off PDF gets no explicit language, heading/list hierarchy, semantic reading order or figure alternatives. Some readers may infer usable text order, but it is not represented reliably. The on-screen React report provides a stronger semantic structure than the downloadable PDF. JSON is useful for exact data, but does not replace a readable hand-off for someone using a screen reader.

**Suggested solution:** Set the generated report’s language to English immediately. Plan semantic tags for headings, paragraphs, lists and source images, with artifact treatment for repeating page furniture. Preserve Unicode as actual text wherever practical. If fully tagged PDF generation needs more work, offer an accessible HTML hand-off alongside PDF and describe the PDF’s current limitation beside the download action. Do not imply that adding language alone establishes accessible output.

**Validation:** Inspect the actual exported catalog and structure, verify logical reading order and image alternatives, and test representative Latin/non-Latin source excerpts with a screen reader. Continue visual render checks: semantic validity and visual layout are separate contracts.

**Layout observation, separate from the defect:** All 11 pages were rendered and the first two fix-list pages inspected at larger size. The content and source crops were readable, with no text overlap or missing target text observed. The third fix-list page holds only one “Couldn’t check” item, and eight pages are a technical appendix. That is an editorial opportunity to make the default hand-off shorter; it is not an accessibility substitute or an established rendering failure.

### T3 — P2: Batch headline counts use an older presentation model

**Evidence:** `src/batch/queue.js:10` derives `presentationCounts` directly from `findingGroups(normalizeFindings(...))`; `src/batch/BatchPanel.jsx:93` displays “detected concerns”, “human-review items” and “tool limits”. Individual reports and exports additionally group related heading/figure findings and derive the Fix/Check buckets; see `src/export/snapshot.js:28`–39 and the corresponding review workspace functions.

**Reproduction:** Analyze the shipped fixtures with the real engine, pass each report through a real `createSequentialQueue`, and compare its compact presentation counts with `fixSheet(captureSnapshot(...))`:

| Shipped sample | Batch concerns / human-review | Individual Fix / Check |
| --- | --- | --- |
| Partly prepared | 4 / 3 | 1 / 4 |
| Graphics and decoration | 2 / 5 | 2 / 4 |
| Well prepared | 0 / 4 | 0 / 3 |

The browser independently confirmed “1 thing to fix, 4 to check” for Partly prepared. These are different taxonomies, so the engine outcomes are not changing; the visible summary is inconsistent across workflows.

**Impact:** People triaging many files can overestimate the number of actionable tasks or be confused when opening a report appears to change its result. The compact JSON also preserves the older presentation counts after detailed reports are released.

**Suggested solution:** Expose a shared pure presentation summary used by batch, the individual report and the fix-list export. Keep detailed finding counts and profile acceptance as separate technical fields. Adopt the same Fix/Check vocabulary in the batch summary. Version the compact presentation fields if their meaning changes rather than silently reinterpreting old saved JSON.

**Validation:** Add a cross-surface contract test using real sample reports with multiple grouped figures and heading findings. Confirm batch counts, opened report counts and captured fix-list counts agree while required check outcomes and original member IDs stay unchanged.

### T4 — P2: The About-page skip link changes the route instead of skipping to its content

**Evidence:** `src/app/App.jsx:42` recognizes only `#about` and `#about-video` as About routes. Its `hashchange` listener at `:47` reapplies that decision for every fragment change. The shared “Skip to content” link points to `#main` (`src/app/App.jsx:115`), which is consequently interpreted as the app route.

**Reproduction:** The independent editorial browser reviewer confirmed keyboard activation of “Skip to content” while on the About movie. The URL changed from `?scene=8#about-video` to `?scene=8#main`, and About was replaced by the intake page. The source logic independently explains the observed result. This reproduction is credited to the parallel reviewer rather than claimed as a second independent browser test.

**Impact:** The accessibility shortcut unexpectedly leaves the page it is meant to help navigate. It can also unmount the player. Ordinary heading anchors and application routing should not compete for the same fragment semantics.

**Suggested solution:** Make the skip action focus/scroll the currently visible main region without changing the application route, or use routing that distinguishes page identity from an in-page target. Preserve history/deep links and focus on back/forward navigation.

**Validation:** Keyboard-test the skip link from intake, results, About and About video. Assert that the visible page and loaded report stay the same, focus reaches its main region, and any paused movie position is retained.

## Further recommendations

### R1 — P2: Automate a small production-browser release smoke suite

`.github/workflows/pages.yml:26`–27 runs unit tests and build, which passed in this review. Browser checks and exported-PDF rendering remain manual receipts. Protect the most valuable end-to-end contracts with a small suite at the repository-prefixed URL: first-use consent/no model request; no-AI sample analysis; cancel/source replacement; report→About→report ownership; story seek/pause/unmount; JSON/PDF download. Include mobile viewport, keyboard navigation and one offline/lazy-asset failure case. Keep expensive model accuracy evaluation separate from these smoke tests.

This is a coverage recommendation, not a claim that the existing 299 tests are superficial. Their worker, queue, provenance, geometry and policy coverage is a substantial strength.

### R2 — P2: Expand semantic evaluation before using AI recommendations as operational gates

`docs/EVALUATION.md` correctly states that the 18 authored cases are illustrative, with only six held-out known mismatches. Both models had one false topical-support result in that held-out group; their language and uncertainty behavior differ. Preserve the current advisory labels and independent structural profile. Prioritize independently labelled real reports, multilingual titles, legitimate edition variations, long/complex section text and missing/contradictory metadata. Record actual consumed spans and abstentions. Broader language support is a valid model-choice property; it is not evidence of more accurate PDF judgments.

No model downloads or inference were repeated in this review. Existing evaluation records were reviewed as records, not recast as new measurements.

### R3 — P3: Consolidate rendering configuration and improve failure cleanup tests

The analysis loader explicitly sets `isEvalSupported: false` and `useSystemFonts: false` (`src/engine/analyze.js:64`), while the evidence loaders have separate option lists (`src/evidence/crops.js:14`, `src/evidence/preview-session.js:50`). This is not a demonstrated exploit. A shared local rendering configuration would make security/resource intent and local asset paths easier to audit and prevent future drift. Keep the worker-analysis configuration distinct where its ownership requires it.

Exercise cancellation during file read, document load, page acquisition, rendering and image encoding. The current lifetime guards are valuable; tests focused only on computed geometry do not prove actual loader/canvas cleanup. In particular, prove standalone service destruction settles queued work even when loading or rendering stalls.

### R4 — P3: Make critical modules easier to inspect without altering policy

Several high-value modules (`src/batch/queue.js`, `src/engine/semantic.js`, parts of `src/export/report.js`) compress substantial branching into long lines. A formatting-only commit and a few named intermediate functions would reduce review cost for cancellation, support/abstention rules and report layout. Avoid refactoring ownership or changing thresholds in that cleanup. Keep behavior-focused tests, and avoid adding tests that only mirror new helper names.

### R5 — P3: Give the new About lazy-load path its own recoverable failure surface

`src/app/AboutPage.jsx` uses Suspense for the movie module, while the report loader has an explicit failure/retry design. A failed About-story chunk request should leave the text guidance available and expose a retry action. Test an aborted or missing story chunk. This is a reliability recommendation; a failure was not injected during this review.

## Product decisions to settle separately

- Is the downloadable PDF expected to be a genuinely accessible primary hand-off, or a visual companion to an accessible HTML version? The former requires semantic PDF work, not just clearer caveats.
- Should batch display exactly the same action counts as individual review? The current product information hierarchy strongly suggests yes; raw detector totals can remain in technical evidence.
- Is the all-missing-document-information gate intended to prevent access to already-completed findings? This is a product-policy choice with editorial implications, and should not be changed covertly as a technical fix.

## Verification and limitations

Completed in this review:

- Read the project instructions and architecture/profile/evaluation/theme documents; traced the engine, worker/runtime, single-source controller, queue/store, calibration, evidence and export boundaries.
- Fresh `npm test`: **42 files, 299 tests passed**.
- Fresh `npm run build`: **passed**, 286 modules; existing large-chunk warning remains. Main bundle 489.09 kB before gzip, lazily loaded review 587.96 kB, export 1,143.72 kB, About story 89.97 kB. These sizes alone do not establish a performance regression.
- Used an isolated `astra-technical-review` browser session on `http://127.0.0.1:5202/pdf-signal-check/` for first-visit notice, setup/no-AI consent, Partly prepared analysis, result inspection and PDF download. No browser errors were reported in that sampled path.
- Browser resource observation showed institutional theme/logo/font assets and no model/Transformers/WASM request in the no-AI flow. Local storage contained the evaluation-settings key, not PDF/report data. Source review found no PDF upload or telemetry endpoint. Worker requests are not all represented in a page’s Performance API, so this is combined code-and-browser evidence, not an exhaustive packet capture.
- Downloaded, structurally inspected and rendered the current 11-page PDF. All pages were reviewed in a contact sheet, with larger inspection of the first two fix-list pages.
- Executed a safe mock allocation probe against the exact whole-page rendering method and real-engine cross-surface count probes against three shipped PDFs.

Not completed: cross-browser Safari/Firefox runs; assistive-technology testing; fresh MiniLM/Granite inference or device benchmarking; an independent real-world corpus evaluation; hostile-PDF fuzzing; production-host configuration/security assessment; a dependency-vulnerability audit. No claim of complete security, accessibility or model accuracy follows from this review.

Local scratch evidence: `/tmp/astra-technical-fix-list.pdf`, `/tmp/astra-technical-contact.png`, `/tmp/astra-technical-report-01.png` through `-11.png`. These are verification artifacts for synthetic samples, not shipped assets.
