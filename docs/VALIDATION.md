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


## Intake tabs, recovery and startup loading — 7 October 2026

All 213 tests across 27 files, the production build and `git diff --check` passed. A controller regression covers replacing a source during a pending language decision, canceling the replacement and rejecting its late response. Current-language decisions are cleared on source replacement and analysis cancellation.

Browser verification covered desktop and 390px intake tabs, Left/Right and Home/End selection with focus retained on the selected tab, sample selection, Settings dialog, missing-language decision/continue-without-AI, and batch entry. Controlled preview failures showed a usable unavailable message and successful retry after restoring fetch. Held preview fetches were aborted when the sample tab unmounted, including StrictMode cleanup. A controlled local-storage write failure showed feedback after closing the notice and restored focus to the footer link.

Production assets `index-D6Sl47gh`, `Review-DaSXAiNo` and `report-DNLAQJ8h` were checked under `/pdf-signal-check/`. The intake loaded only the entry JavaScript; the results renderer loaded after analysis. Entry JavaScript fell from 944.86 kB / 290.93 kB gzip to 413.75 kB / 129.60 kB gzip. This moves renderer cost to review; parser, inference and export chunks remain large, and no measured load-time claim follows. No external asset requests were observed in the no-AI flow. Mobile results and the author evidence crop rendered with no horizontal page overflow. Screenshots: `/tmp/pdf-signal-fixes-tabs-desktop.png`, `/tmp/pdf-signal-fixes-tabs-mobile.png` and `/tmp/pdf-signal-fixes-crop-mobile.png`.

An intentionally blocked review chunk showed the results-interface fallback while retaining completed analysis. Its JSON download preserved the source filename, SHA-256, profile and all nine checks. Since browsers may retain failed module imports, the fallback offers a record download before reload and a route back to intake. PDF report generation/layout was unchanged and was not re-rendered in this pass; no new inference or accuracy evaluation was performed. Changes remain local for draft PR #1; this pass did not publish or deploy the app.


## Plain-language inbox and focused AI waiting — 7 October 2026

All 216 tests across 27 files and the production build passed. Presentation regressions verify priority ordering without changing acceptance, incomplete versus complete reports, graphics-only explanations and abstention when other scope/completion exclusions also exist. Final assets are `index-9E7Jcg8K`, `Review-Bx0_2M0e`, `index-3knvbLOG.css` and `report-_iQA4UIb`. A final prefixed production smoke verified the well-prepared sample’s single outcome heading and selected-row inset indicator; selected rows have a stronger fill/edge than pointer hover.

Real-browser checks verified the small filename above the single outcome H1, automatic first-item selection, mouse selection, arrow-key navigation with list focus retained, independent desktop scrolling, explicit reviewed/unreviewed state, mobile Back to review items, crops and full-page preview. At 390px the page had no horizontal overflow. Final prefixed production checks used the poor sample and rendered the inbox under `/pdf-signal-check/`; artifacts include `/tmp/pdf-signal-inbox-production-desktop.png`, `/tmp/pdf-signal-inbox-mobile.png` and `/tmp/pdf-signal-inbox-wait-mobile.png`.

Actual MiniLM screening completed through the unchanged development worker. A controlled model-worker post failure on rerun kept the completed inference receipt and exposed the new error. A separately held request verified that the inbox was not visible or interactive while AI ran and that cancel restored the selected reading-order item plus the earlier reviewed author marker. Model/engine policy, report generation and export layout were unchanged. PDF exports were not re-rendered in this presentation pass; the earlier export-layout receipts remain historical evidence.

## Plain-language findings and modal evidence inspection — 7 October 2026

The presentation pass explains missing versus broken PDF structure labels, saved metadata versus page text, bounded AI comparisons, uncertain reading order, hidden text and graphic descriptions. Inbox actions stay short; the analysis pane supplies explanation and practical steps. Keyword comparisons explicitly compare meaning against opening excerpts rather than exact word presence. Both redundant result-introduction paragraphs and the full findings browser were removed; complete results remain available in JSON and the existing concise PDF report. No outcome policy or export generation changed.

Page locations, method evidence and why-it-matters text are visible. Inspect opens a native modal with the selected page and evidence overlay; Close/Escape restore trigger focus without moving the underlying page. Preview sessions dispose on modal unmount. Desktop, 390 px mobile and a production `/pdf-signal-check/` URL were exercised. Actual MiniLM inference supplied semantic findings for the copy review. Desktop scroll coordinates stayed unchanged before opening and after closing; mobile dialog width stayed within the viewport. All 222 tests and the production build passed; existing large-chunk warnings remain. This receipt verifies the implemented presentation and resource/focus behavior, not real-world AI accuracy.

The subsequent inbox refinement replaces previous/next and mark-reviewed buttons with independent Mangrove checkboxes in the left-hand items. Checking an unselected item preserves the selected analysis; Space toggles the checkbox, and arrow keys still navigate the review items. The reviewed-count instruction was removed. The tool-limit section now remains visible under a normal heading. Desktop and 390 px mobile browser checks passed, as did all 222 tests and the build.

The result-header actions now align beside the headline on desktop and stack below it on mobile. Scope exclusions use bullet lists; graphic drawing-operation counts are not presented as counts of distinct images. The technical record uses the pinned Mangrove accordion markup, initially collapsed, with Space toggling checked in-browser. All 223 tests and the production build pass; desktop/mobile widths remain within the viewport.

The review list now uses flush accordion rows. Mouse selection and ArrowUp switch the open row and analysis together; checking a closed row leaves selection unchanged. Reviewed checkboxes stay visible for all rows. Desktop and 390 px mobile layouts were visually checked without horizontal overflow. All 223 tests and the build passed.

Accordion collapse is independent of review selection: mouse and Space can close/reopen the selected row while preserving its analysis and reviewed checkbox. Changing a checkbox does not reopen a collapsed row. Mouse and mobile collapse were exercised. Technical metadata/advisory disclosures now use grouped Mangrove accordion styling with native expand/collapse. Desktop/mobile widths remain within the viewport; all 223 tests and build passed.


### Repair-first metadata screen and fourth sample

226 tests across 28 files pass; production build passes with the existing large-chunk warning. Regression coverage analyzes the committed fourth sample, confirms the missing-information gate and no-comparable-input result without calling inference, and ensures incomplete analyses and usable Info/XMP metadata do not trigger the gate. Controller tests verify unchanged no-input retries do not launch another worker while new settings/source can retry.

Real browser verification: the local HIPs report and fourth sample show only the critical information warning and repair guidance, with no inbox or technical record. Desktop and 390px mobile screenshots were inspected; no horizontal overflow. The fourth sample also loads and reaches the stop screen at /pdf-signal-check/ in the production build with no AI selected. Original PDF and generated reports were not modified. Export layout is unchanged.


### Reading-order overlay, grouped review and clearer feedback

232 tests across 29 files pass; build passes with the existing large-chunk warning. New regressions cover stalled asset response headers/bodies, progressing streamed downloads, immediate network failures, timer cleanup, preserving timeout codes through initialization, grouped heading outcomes, and explaining the actual saved description without treating uncertainty as an error.

Real desktop/mobile checks verified the reading-order modal opens in order mode: a tagged sample renders numbered regions (21 located text regions on page 1), while the untagged sample shows a prominent warning above the page and a “Reading order (none found)” option. Default fit zoom renders the untagged sample at its 595px original width on desktop and 296px on a 390px viewport, with no modal horizontal overflow. Empty page locations and irrelevant crop placeholders are omitted. The detail pane starts with a yellow summary warning; correction guidance is a secondary disclosure, while method and why-it-matters sections remain visible.

Synthetic browser fixtures verified one heading checklist entry retains both member outcomes and marks both underlying findings reviewed; the subject advisory displays its actual document-property value, with correction guidance available on expansion. A simulated stalled asset request using a shortened test timeout exits the waiting screen, retains structural results, and shows the timeout message and retry button on desktop/mobile. No real model inference or browser network-reset reproduction is claimed for these synthetic fixtures. The production default idle timeout is 30 seconds. Export layout was not changed.


### UX architecture audit follow-up

240 tests across 31 files pass; production build passes with its existing large-chunk warning. Tests cover source-preserving identity deduplication, grouped execution provenance, recovered-versus-located reading-order geometry and urgency sorting without changing outcomes. The eight audit corrections are recorded in UX-ARCHITECTURE-REVIEW.md.

Actual browser checks confirmed Critical/red, Warning/yellow and Needs manual check/blue notices, visible correction guidance and technical record, removed advisory model/check controls and header recheck button, desktop/mobile layout without horizontal overflow, and keyboard selection/collapse at the repository-prefixed production URL. No new real model inference or screen-reader testing is claimed. Export layout is unchanged.

### Results hero and navigation

243 tests across 32 files and the production build pass. The score contract excludes optional/inapplicable checks, counts unresolved checks in the denominator, refuses incomplete/empty reports, and leaves original report data and AI outcomes unchanged. Browser desktop and 390px mobile screenshots show the contained split hero and its 8/9 (88%) well-prepared sample receipt with no horizontal overflow. The obsolete step navigation is absent. Presentation uses local Mangrove assets; no model downloads were needed.

The built hero also loads at `/pdf-signal-check/`, retaining the same score and no step navigation. The poorly prepared sample displays 5/9 (55%); changing samples updates the score without changing engine findings.

### Open-ended required-check score

244 tests across 32 files and the build pass. A regression verifies the + appears only for unresolved applicable checks with no required failures, and never for fully passed checks. Actual browser samples show “No problems auto-detected” with 88%+ for the well-prepared document and a plain 55% for the poorly prepared document. The mobile screenshot retains the explicit + explanation and passed/applicable count. This presentation does not change structural outcomes or AI reports.

### Missing reading sequence priority

245 tests and the build pass. The completed-analysis/no-recovered-sequence case now sorts with Critical items and uses a red notice; a recovered-but-unconfirmed sequence and incomplete analysis remain manual checks. The regression preserves the original report and uncertain outcome. Actual browser verification selected the poorly prepared sample’s missing-sequence task and confirmed its Critical badge, placement before warnings and red detail notice. Structure-coverage guidance now plainly says the PDF’s structure leaves out some of its text.

### Figure context, hero actions and mega menu

248 tests across 32 files and the build pass. Geometry regressions cover full-page figure context without fabricated highlights for absent/unsafe geometry, and finding tests cover per-page image identity and critical issue counts. Actual browser review shows the sample chart and missing-alt-text message before repair guidance; Inspect centers the selected chart in its modal. Missing reading order has no inspector button; the poorly prepared sample hero displays four Critical issues rather than a percentage. The processing-time viewer is removed.

The filename and PDF/JSON actions are inside the hero on desktop/mobile without duplicate filename or horizontal overflow. The JSON action requests a captured-report download using the existing export controller. No PDF-export layout change is claimed. The metadata stop copy now says “This PDF needs basic fixes first” and explains the prerequisite to detailed analysis.

The published MegaMenu was checked for desktop and mobile navigation, upload/sample tab routing, Settings, and opening/closing the existing About modal. Mobile dialog close restores focus to the menu trigger and releases body scroll lock. All assets remain local. No model inference or screen-reader testing is claimed for this pass.

Final checkpoint also verifies the built navigation, hero filename/download actions and figure crop at `/pdf-signal-check/` on desktop/mobile. The metadata-only sample reaches the revised repair-first heading. No real model downloads were requested during UI QA.

## Per-page reading-order placement — 7 October 2026 (uncommitted)

The exact local 71-page `UNDRR-Work-Programme-2026-2027.pdf` reproduces the document-wide Form-XObject overlay restriction. Page 2 has zero Form invocations and 32 recovered entries with valid matching geometry. After recording per-page operator usage, all 32 entries are located; pages invoking Forms remain unavailable for geometry. Unit coverage includes nested invocation counting, unaffected versus affected pages, explicit crop targets, and legacy reports without the new inventory. Profile checks remain unchanged. PDF-A-go-actionable’s extraction-order overlay was reported separately in https://github.com/khawkins98/PDF-A-go-actionable/issues/27; no source PDF was uploaded to the issue.

Browser verification used the local source file with No AI selected: page 2 showed 32 numbered regions, page 4 retained the scoped text-only limitation, and returning to page 2 restored all 32 regions. Desktop and 390px mobile were visually inspected. The downloaded 29-page PDF report was rendered; all image-bearing pages (3, 4, 9, 14) were inspected for crop placement and layout. Small vector-region crops retain the existing low-resolution enlargement limitation. Standard checks: 258 tests passed; production build passed with the existing large-chunk warning. Changes remain uncommitted.

### Mixed pages and repeated sequence labels (supersedes the page-wide fallback above)

New reports distinguish safe direct-page text from reusable-stream text using operator-level ownership. MCIDs seen in both scopes are excluded from location joins; unidentified text on mixed pages remains unlocated. Reusable graphics stay skipped without blocking safely located page text. Legacy reports lacking scoped block data remain conservative. On the local 71-page source, page 6 now shows 42 entries, page 7 shows 88, and page 69 shows 75. Page 5 has 370 fragment outlines and exactly 174 distinct sequence labels, one per entry. Desktop and 390px mobile page 6 were visually checked. The updated 30-page export was downloaded and all image-bearing pages (3, 4, 6, 7) rendered and inspected; the existing small-vector-crop enlargement limitation remains. Tests cover cross-stream MCID collisions, safe versus unsafe targets at coincident geometry, sequence gaps, and single labels. 260 tests and build passed; changes remain uncommitted.

### Concrete attachment review and decoration samples

The local 71-page Work Programme inventory contains no file declarations or orphan streams; its traversal-limit warning does not establish absence or presence. That limit alone no longer creates a review task. The original inventory and deterministic outcomes remain intact. Regression coverage retains tasks for concrete declarations, including unresolved files. The new With attachments sample contains a CSV and text guide with descriptions and relationships; both were displayed by the actual app without opening their contents.

Page 31 has seven Artifact-labelled sections, which are excluded. The orange background shapes and footer rectangle that produced its advisory are outside those labels. Unlabelled items now ask whether graphics are content or decoration rather than implying a confirmed image without alt text. The new Graphics and decoration sample deliberately retains an unlabelled chart while excluding an Artifact-marked logo and running furniture. Tests analyze the generated PDF and verify every retained graphic lies inside the chart and page 2 has no figure-review items. Existing samples retain described and missing-description Figure cases.

264 tests across 36 files and the production build pass. Both new two-page sample PDFs were rendered and visually inspected. Browser QA confirmed the attachment names, the chart crop and its single graphics task, desktop and 390px mobile layout without horizontal overflow, and loading the graphics sample from the built `/pdf-signal-check/` path. No AI model downloads were requested. All changes after the checkpoint remain uncommitted.

### Image review groups (supersedes per-image tasks and decorative review exclusion)

266 tests across 36 files and the production build pass. Four presentation classes retain original findings and reviewed IDs, including successful description-presence checks. Missing descriptions have Critical review priority without changing deterministic acceptance. A 120-member regression verifies four tasks preserve all evidence and outcomes. Artifact graphics are inventoried separately (at most 16 drawing operations per page); they stay excluded from coverage and ordinary Figure checks. Full-page decorative previews outline only safely located declared regions. Geometry coverage verifies reusable content is skipped and full-page context does not invent a crop region.

The Graphics and decoration sample now includes an unlabelled chart, a described chart, a tagged chart without alt text, and an Artifact-marked logo/furniture. Both pages were rendered and inspected after regeneration. Browser QA verified four groups, the red missing-description notice, per-member review contributing to Reviewed all, page selection and previous/next, and decorative outlines on desktop and 390px mobile. The local 71-page Work Programme now has 21 described-image members, 68 unlabelled-page members and 13 decorative-page members in three tasks; selecting page 32 retains its photograph and exact alt text while rendering one crop. Grouped sample loading was also checked at the built repository prefix. No model downloads or source uploads occurred; changes remain uncommitted.

### Single-image review simplification

Single-member groups omit their progress count, selector and navigation. Located crop captions remain available to screen readers without occupying visible space; missing-location previews retain a short visible explanation. Browser QA verified the single-image crop on desktop and 390px mobile and confirmed two-member groups retain their selector. All 266 tests and the production build pass. The accumulated work, including the URL-gated semantic-evidence experiment, is ready for the user-requested commit and push.

### Fix-list review (2026-10)

The results screen was rebuilt around a fix list: Fix / Check / Couldn’t check buckets, item detail with one “What to change” line, a Technical evidence drawer and a Technical details tab. The Reviewed checkbox and the hero percentage were removed. The metadata stop screen is unchanged. Headless Chromium QA at 1440px covered all six samples, and at 390px covered Partly prepared. It checked every card, opening the drawer and closing it with Escape, the Technical tab, the stop screen for Missing document information, and no horizontal page overflow. Visible text on the Partly prepared results dropped from about 740 to 240 words. A follow-up agent-browser pass with MiniLM checked the AI heading buckets (“Headings that may not match their sections” in Check, “Headings the AI could not judge” in Couldn’t check) and their drawer evidence.

The PDF download is now a fix list. It contains the headline, numbered Fix and Check items with where to look, the actual values, what to change and a framed crop, then a Couldn’t check list. The previous analysis receipt follows as a technical appendix. The downloaded Partly prepared PDF was rendered and inspected. Its first pass placed crops apart from their items, so items now reserve space for their crop. Reading-order and decorative items carry no crop, because one region cannot show a sequence or page-wide decoration.
