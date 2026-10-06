# Implementation validation record

Recorded October 5, 2026 across app versions 0.1-0.3. The initial implementation receipts below are historical; later sections record subsequent profiles and features. These checks verify the implemented text profile and application flow, not full PDF conformance or real-world model accuracy.

## Automated checks

Run `npm test` and `npm run build` from the repository root. The initial suite has 28 passing tests covering tagged text acceptance, partial and empty tags, broken parent-tree links, dangling MCIDs, suspicious Unicode mapping output, metadata omissions, unsupported forms/graphics/Form XObjects/ActualText, analysis limits, XML title alternatives, title comparison, and the original calibration corpus.

The calibration controls establish these behaviors:

- Clean text, decorative artifact logos, and German text with matching metadata pass the text profile.
- Missing titles, untagged documents, empty trees, and partial coverage fail required checks.
- A meaningful figure with alternate text returns not established for this profile.
- Wrong years, a near-identical title with a changed organization term, and conflicting metadata are suspected mismatches without changing structural acceptance.

## Browser checks

The production build was exercised in Chromium using agent-browser, at the root path and under `/pdfs-for-ai-actionability/` to simulate a GitHub Pages project URL.

- Clean sample analysis returned Yes; untagged sample analysis returned No.
- Wrong-year metadata returned a separate suspected mismatch.
- A non-PDF uploaded through the file input produced a clear parsing failure.
- Canceling a sample load prevented its pending response from starting analysis. The meaningful-figure sample returned compliance not established in the browser.
- Optional pinned MiniLM inference completed through WASM and returned finite similarity scores. Ranking did not change the verdict.
- JSON export contained the profile, required checks, acceptance, and model configuration/scores.
- A 390 px viewport had no horizontal overflow; desktop and mobile layouts were inspected.
- The automated accessibility check reported no violations. Contrast assessment of status glyphs remained a manual-review item; automated results are not a full accessibility audit.

The calibration generator also reopened all twelve PDFs with PDF.js. All 24 pages were rendered and visually inspected during corpus generation.

## Remaining evaluation

GitHub-hosted deployment has not run yet because no remote repository is configured. Test other intended browsers/devices, larger and more varied PDFs, scans, and a held-out multilingual metadata dataset before broadening the profile or calibrating semantic thresholds. Current synthetic samples establish behavior, not population-level accuracy.

## Visual preview 0.2

Geometry tests exercise full matrix projection for rotated/cropped pages, skewed text quadrilaterals, unknown/vertical text fallback, stable IDs for repeated title text, and document-only findings. Existing profile/calibration tests continue to pass without altered acceptance semantics.

Browser smoke checks on the production build verified root and `/pdfs-for-ai-actionability/` subpath asset loading, untagged text overlays and title candidate selection, figure page navigation with amber graphic regions, and a 390-pixel viewport with fit-width rendering and no horizontal overflow after layout. The viewer uses independent original File bytes, so analysis buffer transfer does not detach preview data. Optional model rerender preserves the existing preview controller and selected page.

## Semantic screening 0.2

The current suite has 42 passing tests, including semantic policy checks with injected vectors; the production build passes. These checks establish evidence bounds, identity guards, and result behavior, not model accuracy.

A separate browser WASM smoke run on synthetic title/subject/keyword metadata recorded `inferencePerformed: true` and `embeddedTextCount: 5`. The wrong-year title remained a suspected mismatch despite cosine similarity 0.9635. Subject (0.6480) and keywords (0.6077) were semantically related. Page/block evidence and the rendered canvas survived screening. The clean sample retained a title match (1.000) and its structural Yes. These are synthetic smoke results, not calibrated accuracy or confidence estimates; see [semantic screening](SEMANTIC.md) for the provisional thresholds and evidence limits.

Independent review also verified desktop-to-mobile resizing after a PDF was rendered: at a 390 px viewport, document width stayed 390 px and the fitted canvas shrank to 298 px. Deliberate 200% zoom retained the 390 px document width and scrolled inside the viewer. A rotated 90° page with a CropBox was visually checked; rapid file replacement left exactly one preview and one canvas for the latest file with no browser errors. The responsive containment fix passed the production build.

## App 0.3 and text profile 0.2

The coordinated integration suite has 63 passing tests and the production build passes. Profile 0.2 adds required marked-content integrity checks; author identity, numbered reading-order findings, and text-visibility findings remain separate advisories. The interface qualifies its Yes/No with the reported profile version and displays publication/order status beside it.

The extraction rehearsal switches bounded transcripts between tagged and content-stream order while preserving the single-page preview. Paired author and reading-order examples display authored ground truth only when explicitly loaded through the app. Arbitrary uploads cannot acquire these labels from their filenames. Where browser cryptography is available, the input receipt exports SHA-256 of the original source-file bytes; hashing failures do not prevent analysis. The receipt identifies the input and does not validate its content.

Independent app 0.3 browser review verified root and GitHub Pages subpath loading, mobile containment, paired author examples, and current MiniLM inference. Exported SHA-256 matched the original source-file bytes. The flawed-order example displayed tagged steps 3, 4, 1, 2 versus content-stream steps 1, 2, 3, 4; clicking its evidence selected the corresponding region on page 2. Known-example labels were absent for arbitrary uploads. Holding a sample fetch, canceling, and releasing its response left the report hidden with no canvas; a subsequent clean upload succeeded without browser errors. The final initials-ambiguity policy received an additional regression test and a successful production rebuild.

Final-build smoke review confirmed the latest Pages-subpath bundle, matching-author control (Match), flawed-order control (Requires review), rendered canvas, and no browser errors. Independent final verification counted 63 passing tests. Identical initialed author names conservatively remain uncertain rather than establishing identity; this focused policy change leaves the full-name controls unchanged.

## Summary comparison disclosures

All three summary cards open inline comparisons without model inference. Independent browser review verified the author mismatch example's Info/XMP Iris Hale and Owen Brooks against the page-1 tagged byline Maya Chen and Leo Martin; the title example's Annual Summary against the tagged Annual Report; and the order example's tagged steps 3, 4, 1, 2 against content-stream steps 1, 2, 3, 4. Evidence actions highlighted the corresponding page regions.

Native Enter/Space interactions, expanded state, controlled-region labels, and focus were checked. Actual model screening preserved the expanded author panel, focused trigger, and single preview canvas. Author/order panels fit a 390 px viewport and stack their comparisons; changing files clears the previous expanded panel. The 63-test suite and production build passed for this UI change.

## App 0.4 selective hybrid screening

The coordinated suite has 68 passing tests and the production build passes. The picker exposes pinned MiniLM and Granite model/tokenizer sizes, explicit language coverage, input caps, and the additional runtime cost before an explicit run. Selection alone does not trigger model downloads. Browser speed and memory are labeled unmeasured.

Engine browser verification ran actual Granite, MiniLM, and Granite again through a warm worker, including model switches and request nonces. Truncation provenance recorded MiniLM consuming 256 of 602 tokens and Granite consuming 512 of 1,562 tokens. These are functional inference receipts, not accuracy calibration or comparative performance measurements.

The report exports current `screeningSelection` separately from the completed `semantic.model` and `requestedChecks`. A completed result keeps its original model identity when the picker changes. Per-check methods distinguish traditional rules, model inference, unsupported language, missing evidence, and unrequested work. A settled title-only run can complete without model inference. Generic no-inference copy directs reviewers to each check’s reason rather than treating abstention as a successful rules result.

Independent final UI review verified actual MiniLM and Granite inference, German language guards, the title rules-only path, cancellation retaining an earlier completed result, current selection versus completed-result JSON, token decoding and evidence, a 390 px viewport, and actual MiniLM inference from the Pages subpath. The reviewer independently confirmed 68 passing tests.

A German per-keyword probe using “Wasserqualität” and “außerirdische Raumschiffe” produced separate Uncertain scores of 0.766 and 0.670 with an Uncertain aggregate. Individual scoring prevents averaging the keywords into one verdict, but this functional probe does not demonstrate reliable rejection of unrelated terms. Model thresholds remain uncalibrated; uncertainty and evidence must remain visible.

## Introductory AI and privacy notice

The production build passed. Independent browser review verified first-visit presentation, explicit “I understand” acknowledgement, blocked Escape dismissal, inert background controls, native keyboard/focus behavior, and a 390 px mobile layout. Checking “Don't show again” persists suppression only on acknowledgement; manual reopening reflects the preference, and unchecking then acknowledging restores automatic presentation.

Storage read/write failures do not prevent continuing. A failed preference update after an existing report produces visible feedback while retaining the report and exact preview canvas; closing the notice restores focus to its opener. Only the notice preference is stored, and no model requests were observed during notice interactions. The copy distinguishes local PDF analysis from external app/model asset downloads and discloses AI-assisted development and possible mistakes.

## Guided single-PDF review: app 0.5

The integrated build (`index-Bp-U_HJ3`, analysis worker `D4TZtJmo`, model worker `9SvyqYgE`) passed 74 automated tests and a production build. Independent browser review covered root and GitHub Pages subpath loading, existing privacy acknowledgement, traditional analysis followed by explicit optional screening choices, title/author/order and positive fixtures, 390 px layout, and full evidence/JSON access while retaining exactly one preview canvas.

Issue frames exposed concrete metadata versus tagged text/order comparisons, required-check raw evidence, inspection guidance, and actual completed model/token provenance. A targeted XMP-indeterminate frame retained parser evidence, used XML-specific source/export guidance, and offered no invented page location. Actual MiniLM inference showed real batch completion from 0/1 to 1/1; preparation remained indeterminate rather than showing fabricated elapsed-time progress.

Focused Cancel survived actual analysis and model progress rerenders. Cancellation ignored held stale results and retained the selected input for retry; navigation preserved completed report identity and preferences. Session-only Reviewed annotations left machine outcomes unchanged. These are functional integration receipts, not evidence of calibrated detection accuracy or overall AI readiness. Dedicated crops, PDF review exports, revised-file comparison, and resumable sessions remain outside this slice.

## Captured report and evidence exports: app 0.6

Owner QA authored browser PDF reports for author mismatch 14, German control 12, reading-order mismatch 17, and an export-only Unicode metadata probe. The PDF skill operation marker ran successfully once immediately before the first PDF authoring operation. Final concise outputs had 4, 4, 5, and 5 pages respectively; all 18 final pages were rendered with Poppler and visually inspected for clipping, overlap, missing glyphs, crop placement, captions, and scope notices. A dedicated 1200×1600 PNG summary was also inspected; it reserves its omission/privacy footer and does not capture the application screen.

Extracted report text preserved original-file SHA-256 receipts, separate Info/XMP author names, title/year values, and tag order 3→4→1→2 versus stream order 1→2→3→4. A regression covers non-numbered heading-reversal comparisons as well. The Unicode export probe substituted metadata in a captured synthetic report solely to exercise rendering; it is not an input-analysis accuracy test. `Wasserqualität Müller Straße` remained extractable, while Chinese names/title and Arabic text were visibly retained via browser-font raster fallback. The report explicitly labels that fallback as nonselectable/nonextractable and points to exact Unicode in JSON; this does not establish universal browser-font coverage.

Exports capture the original File and a cloned completed report, distinguishing current selection preferences from completed inference configuration and session-only Reviewed annotations. Crops use a fresh source-page renderer independent of preview zoom/page, full viewport transforms, one trustworthy region per image, six-image/one-megapixel caps, and explicit missing-geometry/unsupported-Form behavior. Focused tests cover snapshot isolation, filename handling, Unicode wrapping, rotated/CropBox geometry, outside/invalid regions, direct graphic quads, and source comparisons.

Noto Sans is vendored with its OFL license and recorded SHA-256. The fontkit dependency is pinned, loaded through the export module, and its upstream README/bundled legal notices are copied into site license assets. No external font service is used during report generation. Generated reports are human analysis receipts about unchanged inputs, not repaired PDFs or conformance certificates.

Independent review inspected all 18 final owner pages and a separately downloaded five-page rotated/CropBox report, including both embedded crops and exact source SHA-256. Export cancellation and source replacement during a held font request produced no stale download. The dedicated PNG retained its omission and privacy footer. An actual MiniLM device run released its encoder and terminated the completed worker; cancellation, stale callbacks, visibility caveats and source-independent inputs passed. Device receipts keep unknown memory/cache information explicit.

The final wave-1 suite has 88 passing tests across nine test files; the simultaneously developed, separate batch core contributes another 11 tests. Production build passed after correcting invalid sensitivity cutoffs below Granite's fixed mismatch threshold. Both pinned models have actual browser-WASM development/held-out evaluation receipts. Each produced one wrong topical-support outcome in the small held-out set; these results cannot establish calibrated accuracy, and no thresholds were tuned. See [evaluation limitations](EVALUATION.md).

Independent final-asset smoke loaded `index-F-W5wcmi` at both the root and GitHub Pages prefix. An actual four-page PDF download from the prefixed URL loaded local font/crop assets and preserved author comparisons and the source receipt.

Independent wave 1 review passed snapshot identity, original-source hashes, author/order comparisons, every final report page, Unicode fallback disclosure, viewport-aware rotated/CropBox and out-of-bounds evidence handling, export cancellation/source replacement, and benchmark cancellation/visibility/lifecycle behavior. Final wave 1 checks passed 88 tests across 9 files and a production build. A final 390 px GitHub Pages-subpath smoke on `index-F-W5wcmi` downloaded and inspected an actual four-page author report and dedicated PNG: page width remained 390 px, one preview canvas remained, the 334 px evidence crop rendered, exact source/name comparisons survived, and no browser errors appeared. No detection-accuracy, RAM, or universal device-speed claim follows from these functional receipts.

## Foreground batch review: app 0.7

The pre-final owner suite passed 121 tests across 14 files and the production build. Seven injected-worker adapter tests cover per-document analyzer disposal, active disposal/AbortSignal settlement, same-worker model reuse, stale request nonces, primitive bootstrap error classification, callback/post failures, initialization versus inference errors, and a digest finishing after cancellation. Native cryptographic work itself cannot be interrupted; canceled results are not published.

Owner browser QA on `index-CTx3Ny2T` completed traditional analysis of author fixtures 14 and 18 sequentially. Opening retained attempts did not reparse the files; their detailed JSON preserved distinct SHA-256 receipts, queue IDs, attempt epochs and frozen original configuration, with the expected suspected-mismatch versus matching author outcomes. A 390 px layout retained a 390 px document width and one preview canvas. Native Enter opened a retained review and moved focus to the stage heading.

An actual five-page PDF export of retained fixture 14 was rendered with Poppler and every page visually inspected; the source hash, separate Info/XMP/byline names, original frozen batch attempt, detached current preferences and no-inference receipt survived. Its dedicated PNG retained the omission/privacy footer. A separate 390 px GitHub Pages-prefix queue and actual PNG download loaded the final prefixed assets and evidence crop, with one preview canvas and no browser errors. These are functional receipts, not background-execution, total-RAM, speed, or calibrated-accuracy guarantees.

Independent full-PDF spatial-order integration tests also use three real tagged PDFs: correct aligned unnumbered headings stayed Uncertain; reversing the middle tag groups triggered the bounded single-alignment heading-geometry advisory; a reordered two-column control stayed Uncertain. All three still passed the structural profile. Poppler inspection and actual browser comparisons/crops confirmed the named sequences and reliable regions; this does not establish global reading-order correctness.

Engine-owner actual WASM batch receipts used MiniLM on two English files plus the German control: one encoder initialization, four embedded inputs per English report, and zero inference inputs for unsupported German. Granite used one initialization across English and German documents, with finite outputs, bounded 512-token consumption, and bounded section pairs. Tracked analysis/model workers were released at queue idle and clearing removed the rows. These runs verify same-model reuse, language abstention and completed-result provenance; they do not establish model accuracy or a total memory bound.

Independent Pages-prefix QA admitted 15 files: calibration fixtures 01–12, two different-source files sharing `same.pdf`, and a malformed PDF. The duplicated names retained distinct queue IDs/source hashes and correct copied JSON; the malformed input stayed failed/incomplete with an inspectable report. Native-keyboard recovery, pause-after-current, cancellation/worker termination, held late-result rejection and retry epochs passed. A held digest from an old cleared queue did not terminate a replacement queue’s worker.

Focused failure/pressure QA injected a model-initialization error to verify explicit Retry versus Continue without AI, and padded reports to approximately 12 MB to exercise the serialized-budget boundary. Pending detail was exported as actual JSON before an explicit release/retain decision; compact summaries remained. These controlled injections test recovery and retention behavior, not an observed production download failure or browser RAM ceiling.

Final root verification passed 122 tests across 14 files and the production build (`index-CBTdKkCd`, `report-HcTO1w05`). Independent root/Pages narrow smoke verified accurate started/completed queue status. Rules-only title screening and unsupported German subject screening retained requested MiniLM settings while reporting `actualModel: null` and no inference; no model/tokenizer/ONNX requests occurred. Earlier full export/mobile/adversarial receipts remain applicable; no export geometry or rendering policy changed in this final refinement.
