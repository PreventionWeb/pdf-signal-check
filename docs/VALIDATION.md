# Implementation validation record

Entries are in date order and are not rewritten when the interface changes. Older entries describe interfaces since replaced: the inbox list, Reviewed checkboxes, the percentage hero and the repository copy of Mangrove. The latest entries describe the current fix-list-on-the-pages design.

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

An agent-browser QA pass across all six samples with MiniLM, at 1440px and 390px, led to further changes:
- Saved titles and authors beside unmatched page text now go to Check.
- Missing tags absorb their consequences into one fix.
- AI items show the saved value and the text they were compared with.
- Attachments show only names and descriptions.
- “Back to the list” restores focus to the opened card.

A later pass found decorative outlines invisible. The outline was drawn in the same blue as a thin decorative rule and on top of it. Decorative crops now use a padded, dashed orange box, and preview selections get the same halo. This was confirmed by extracting the rendered crop and screenshotting the preview. The language dialog and the stop-screen property table now use plain wording; the table merges PDF-properties and XMP values into one row per property. A live MiniLM run confirmed the heading excerpts and the new language dialog.

### Pages view as the default (2026-10)

The fix list is now shown on the PDF pages by default: numbered pins, a Document properties tile, a Whole document sheet and an optional reading-order overlay. The previous layout stays as List view. In agent-browser (Partly prepared, Well prepared, Poorly prepared and Graphics and decoration, at 1440px and 390px), I checked:
- Legend and pin selection, scrolling to the page, and the shared detail in the side panel: alt text, reading-order lanes, Technical evidence drawer.
- Show larger, which opens the preview on the right page.
- The reading-order switch (both instances synced, 27 regions on Well prepared).
- Selection kept across tabs, focus moving to the detail on mobile, and no horizontal overflow.

A crash on first toggling the reading order (a page rendered before the toggle had no overlay boxes yet) was found and fixed. The view has not yet been tried on a long real-world PDF.

The separate List view was then removed. The pages view’s legend and shared detail cover it, and Show the whole PDF keeps access to pages without issues. agent-browser re-checked the two remaining tabs, keyboard selection in the legend, focus return from the preview, and the mobile detail and Back to the list flow at 390px with no overflow.

### Mangrove from assets.undrr.org (2026-10)

The repository copy of the Mangrove theme (`public/vendor/mangrove`, about 3.8 MB of unmodified CSS, fonts and logos) and its vendoring script were removed. The stylesheet now loads from `https://assets.undrr.org/mangrove/2.0.0/css/style.css` with a SHA-384 integrity hash, and the logo from the UNDRR logo library. The CDN copy matched the previously vendored upstream byte for byte. The CDN sends `Access-Control-Allow-Origin: *`.

agent-browser checks on the dev server and on the production build served under `/pdf-signal-check/` both showed:
- 2,061 stylesheet rules applied.
- Roboto and Roboto Condensed loaded.
- The 300px logo from the CDN.
- No requests to the removed local paths.

The privacy notice now names assets.undrr.org and states that those requests never include the PDF. Without access to assets.undrr.org the app works unstyled. The PDF report font stays bundled.

### Hidden instructions and landing page (2026-10)

Hidden-instruction screening:
- Unit tests cover the patterns, zero-width obfuscation, channel attribution and benign OCR-style hidden text.
- End-to-end tests build PDFs with invisible (3 Tr), white, 0.4 pt and off-page instructions. Each is flagged with the right hiding method, and the same words in visible text are not flagged.
- The Poorly prepared sample now carries a white footer instruction. agent-browser confirmed the Check item, its pin on the page 1 footer, the detail (hiding method, snippet, intent) and Show on page.

The landing page:
- Intake tabs replaced by a drop zone followed by six native Mangrove horizontal book cards with original SVG covers.
- The pdf-a-go-go sample preview, its vendored viewer and test removed.
- agent-browser checked at 1440px and 390px: no tabs, six covers loaded, a card click opens setup, and no overflow.

### Story samples (2026-10)

Two samples were added for the educational story:
- **Chart as a picture, text out of order:** a raster chart with no description, values only as pixels; “+0.7 m” drawn apart from its label; procedure columns drawn right before left with tags in the intended order; “Map 2” as plain text. `pdftotext -raw` returns steps 3–4 before 1–2 and the number on its own at the end.
- **Built to travel:** a described vector chart, a tagged data table (Table/TR/TH/TD), the CSV attached (Data) with a schema.org Report/Dataset JSON-LD attached (Supplement), Dublin Core publisher, rights, date, format and identifier, a linked “Map 2” and heading bookmarks.

Both were rendered and inspected. A new `numbered-step-drawing-order` detector flags the failure sample (tag lane 1–4, drawing lane 3, 4, 1, 2). Tests cover both samples through the engine and presentation. agent-browser confirmed the “Text is drawn out of order” item and lanes, and the exemplar’s “Nothing confirmed to fix” with both attachments listed.

### Story page (2026-10)

`story.html` is a standalone page for “Your report says it. Does everyone understand it?”. It has seven SVG scenes animated with the Web Animations API and CSS 3D (the exploded layers in scene 2). There are no new dependencies; the story script is about 8 KB gzipped. Stage values come from `scripts/snapshot-story.js` output, real engine results on the well-prepared, partly-prepared, picture-chart and built-to-travel samples; the attached CSV is read with pdf-lib, because PDF.js returned no attachments. `test/story-snapshot.test.js` fails on drift.

The first agent-browser pass found two defects: every entry animation frozen at frame 0, and SVG groups with a `transform` attribute jumping to the origin mid-animation. The first had two causes: pausing on mount, and React StrictMode running the guard effect twice. Both are fixed.

agent-browser then verified, at 1280px and 390px:
- all seven scenes render
- Play advances and Pause holds
- arrow keys change scene, with the `?scene=` URL kept in sync
- emulated reduced motion shows the note and runs no entry animations
- no horizontal overflow

### Story as a cut-paper collage, with optional audio (2026-10)

`story.html` was rebuilt as an eight-scene, caption-led collage in the style of UNDRR's explainer animations. The art is hand-authored SVG: cream paper ground with grain and creases, torn and cut edges from `feTurbulence` + `feDisplacementMap`, paper grain and soft shadows as filters, and big torn letter tiles. The PDF's three hidden layers recur as coloured sheets. Motion is stop-motion "on twos" (12 frames a second, held keyframes) with overshoot, settle and an idle wobble, all through the Web Animations API. There are no new dependencies; the story script is about 16 KB gzipped. Scene lengths follow the narration: about 57 s in all. The script is in `docs/story-script.md`.

Audio (all AI-generated, off until **Audio on** is checked):
- Narration: ElevenLabs Multilingual v2, voice george, through OpenRouter. Seven voices were compared; two blind model-listening runs and the product owner chose george (owner's second choice: MAI-Voice-2.1 en-GB-Emily). See `docs/experiments/STORY-AUDIO.md`.
- Music: Lyria 3 Pro through OpenRouter, the vocal-free one of two candidates, mixed about 9 dB under the voice and ducked a further 6 dB while a clip plays. Prompt and processing are in `public/story/audio/README.md`.
- 808 KB of audio in total. OpenRouter spend for the whole exercise was about $0.45, including the listening panel.
- `test/story-narration.test.js` fails if `src/story/script.js` and the clips drift apart, or if the audio exceeds 1 MB.

agent-browser checks on the dev server and on the production build served under `/pdf-signal-check/`, at 1280px and 390px:
- all eight scenes render; mid-motion frames show the held, stepped poses; no horizontal overflow
- opens paused; Play advances; Pause freezes motion, narration and music; arrow keys and the slider change scene, with `?scene=` kept in sync
- no MP3 is requested before Audio on is checked; with it checked, narration follows the scene, the bed plays at 0.5 under speech, and turning audio off stops both
- emulated reduced motion shows the composed still for each scene, runs no animations and never loads the music
- only the page's origin and assets.undrr.org (Mangrove stylesheet, fonts, logo) are requested
- caption key words are bold and coloured, at 5.96:1 to 7.71:1 against the caption paper

Two automated "listening" checks transcribed the final clips. They found no wrong words, and a retake fixed one line's choppy intonation. Model ratings are a screening aid; a person confirmed the voice by ear. Known limits: SVG labels are small on phones (the captions and transcript carry the same words), iOS ignores media volume so the bed's level is baked into the file, and the music loops with its fades if the story runs past 60 s.

### Story revision after creative review (2026-10-08)

An independent creative-director review scored the first collage 6/10 for fidelity and craft (tiles 8, figures and icons 4), mobile 5 and narration 6, and asked for a revision that keeps SVG, with a small AI-generated hybrid. Changes:
- **Motion:** paper arrives fully opaque, from just beyond the visible stage edge (measured from each piece's laid-out position, so it also works on the cropped phone stage) or from scale. Only strings and marker lines fade.
- **Hybrid art:** the three figures, tick, no sign, warning triangle, question marks, folder, passport and laptop are cut-paper images from Nano Banana 2 (Gemini 3.1 Flash Image) via OpenRouter: 9 generations, $0.61, 13 WebP files, about 180 KB. They were generated on a chroma-key background with the figure sheet as the style reference and keyed locally. Rejected takes: a white-background sheet, and a passport with a printed date and stamp. Model, prompts and date are in `public/story/images/README.md`. Remaining small SVG icons use a crisper "scissor" filter. Captions, strips, tiles, the chart, extracted text, step tags, the saved title, pins, the cameo headline and the stamps stay as code.
- **Scenes:** scene 2's single bubble tours the three figures and leaves a tick with each; scene 4 shows only the chart, one empty frame with the no sign, and "Image."; scene 6 makes "+0.7 m" the hero and brings in the 2024 folder at the word "title"; scene 7 uses the passport image and moves the paper clip; scene 8 shows a torn screenshot with the real headline and two real pins.
- **Backdrop:** stronger creases, a diagonal fold and a deeper vignette.
- **Phones:** decorative extras drop out below 700px, and key pieces sit inside the central 4:3.
- **Narration:** a beat before each key phrase, and a warmer-delivery request to ElevenLabs (stability 0.3, style 0.45). A model listening check rated it 7.8/10 with every key phrase emphasised. The effect of the settings alone could not be measured.
- **Runtime:** 59.7 s. OpenRouter spend for the whole story is now $1.15 of the key's $12 limit.

agent-browser checks at 1280px and 390px, on the dev server and the production build under `/pdf-signal-check/`:
- all eight composed frames, and mid-motion frames showing the touring bubble and opaque entries
- reduced motion shows stills with no animation and no music
- keyboard and slider navigation, audio sync and ducking as before
- only the page's origin and assets.undrr.org are requested

`npm test` (292 tests) and `npm run build` pass.

### Story final round after second review (2026-10-08)

The second review recommended releasing the visuals (fidelity 8, craft 8, composition 7, typography 7, motion 8, story 8, mobile 7). It asked for two fixes: the scene 8 cameo's count, and the narration. Changes:
- **Scene 8:** the result sheet is pasted over the laptop screen. On wide screens it lists all five real pins under “1 thing to fix, 4 to check”; on narrow screens it shows two rows and “+ 3 more to check”. The list never contradicts the headline count.
- **Polish:** scene 4's listener and “Image.” are larger and centred; scene 6 loses the cover thumbnail and keeps the folder inside the phone crop; the passport pages have light grain; the backdrop creases are about 30% softer and fold differently per scene.
- **Narration:** the inserted beats were removed. A consistent check (one model, one prompt, temperature 0, two runs in reversed order) compared george on default and expressive settings, MAI-Voice-2.1 Emily and Harry, and the earlier sets on clips 02, 05 and 06. Emily led on every clip (8.31 mean, against 7.19 to 7.31 for george) and is now the narrator. A transcript check of the final set found no errors. Alternatives are kept outside the repository for the product owner to compare by ear.
- **Timing:** motion was re-timed to the new clips (scene 5's tags land on each spoken number; scene 6's folder arrives on “And the title”). The hold is now 0.9 s, for a 59.7 s total.

`npm test` (292) and `npm run build` pass. agent-browser checked all eight scenes at 1280px and 390px on the production build under `/pdf-signal-check/`, including reduced-motion stills and the audio controls. Total OpenRouter spend for the story is now $1.25 of the key's $12 limit.


## Story takeover and reach revision — 8 October 2026

Integrated the animator worktree's thirteen-scene revision into `feature/initial-implementation`, preserving the rendered-text word-strip fix. An Astra storyteller reviewed the opening and payoff; a dedicated Sol illustrator finished captions, illustrations, timing and audio. The story introduces people who see the page, people who listen with a screen reader, and machines (web search and AI chatbots). It identifies the water-clarity chart before explaining what other readers can miss, then shows wrong-year search results and a labelled possible wrong AI answer spreading. The reach payoff is visible with audio off.

The passport scene now names description, step-order, number-label and title repairs before showing optional data, summary, links and bookmarks. It no longer ticks every reader as though those extras guaranteed understanding or AI accuracy. Examples still come from different synthetic samples; “problems like these” preserves that distinction. Mobile refinements bring the layer listener and copied-text strips inside the crop.

Thirteen narration clips total 104.27 seconds; scene timing is about 109 seconds. Only the changed passport clip was regenerated during this takeover. The existing music was extended locally to 112 seconds with a 7.6-second crossfade and a final fade. All optional audio stays below the existing 1 MB asset budget. OpenRouter's key endpoint reported total usage of $1.3760221 against the $12 cap after generation (approximately $0.004 additional spend during this takeover). No credential or PDF data was added to browser code.

Root verification: all 293 tests across 41 files pass; `npm run build` passes with the existing large-chunk warning. All thirteen composed scenes were visually reviewed at 1280px and 390px in the development browser, including subsequent revised scenes 8, 11 and 12. The integrated production page was checked under `/pdf-signal-check/story.html`: artwork loaded, no audio requested before opting in, narration and music loaded from prefixed URLs, and Pause stopped both audio and stage motion. Desktop and mobile widths remained within the viewport. Reduced-motion stills were checked; this is browser playback verification, not an independent human listening assessment or a certified accessibility audit.

Production screenshots: `/tmp/pdf-story-final-production-desktop.png` and `/tmp/pdf-story-final-production-mobile.png`; revised mobile ending: `/tmp/pdf-story-passport-refined-mobile.png`. Story bundle: `story-CTewyxYp.js` (about 20 KB gzip). Work remains local; nothing was pushed or published.

## Single-clock story playback — 8 October 2026

Replaced the scene advance timer, separate narration clips and independent music player with one locally assembled 108.77-second soundtrack. `src/story/playback.js` owns media playback, seeking, rate, mute/volume, buffering, errors and disposal; stage Web Animations stay paused and sample that media position. A waiting or rejected media play cannot advance a separate visual clock. Reduced motion keeps the same timeline and shows composed stills.

Controls now provide a continuous time scrubber, elapsed/total time, chapter navigation, click-to-play/pause, volume/mute, 0.75–2× speed, fullscreen and keyboard shortcuts. Playback opens paused with a composed poster and sound enabled for the first explicit Play. No soundtrack is requested until Play or seeking. Music ducking is baked into the single mix, including for reduced-motion playback. `npm run story:audio` assembles existing clips locally with ffmpeg; no paid generation was used. The soundtrack is about 653 KB, under the existing 1 MB playback download budget; individual clips/music remain regeneration inputs.

All 298 tests across 42 files and the production build pass. New contracts cover no startup requests, metadata-delayed seeks, buffering, pause, clamped seeks, replay, mute/volume/rate changes, rejected and late play promises, listener disposal, scene boundary selection and source/output audio hash drift. Chrome checks at 1280px and 390px exercised seek, pause/resume, mute, volume, speed, keyboard controls and fullscreen. A prefixed production seek to 62.5 seconds displayed scene 9 with every animation held at its matching 4.62-second local position. Mobile width stayed at 390px with no horizontal overflow. A fresh offline attempt held at time zero, showed a retry message and recovered after restoring the network.

The production media check uses Vite's range-capable preview at `/pdf-signal-check/`; a basic Python HTTP server exposed only a zero-length seekable range and is unsuitable for native MP3 seeking previews. Browser playback verification was on Chromium, not an iOS/Safari hardware test. Screenshots: `/tmp/pdf-story-single-clock-prefixed-desktop.png`, `/tmp/pdf-story-single-clock-prefixed-mobile.png` and `/tmp/pdf-story-clock-fullscreen.png`. The current build uses `story-C_Qn6oM3.js`. No push or publication was performed.

The editable `docs/story-full-script.md` lists all thirteen narration passages, captions, visual descriptions and exact cue times. It includes the user's proposed scene 2 wording (“Every report has three types of readers”) as a review draft; the recorded voice and source script still retain the prior wording until the rest of the edits are settled.

## Holistic script polish and annotation alignment — 8 October 2026

Incorporated the owner's Markdown edits with an Astra storytelling review and a dedicated Sol illustrator. The fifteen-scene version opens with people who see, people who listen and machines, distinguishes data tools, web search and AI chatbots, and connects these readers to reach. The actual 3–4–1–2 method-step example remains distinct from chart labels. The possible wrong AI answer is explicitly hypothetical. A new garbage-in/garbage-out bridge acknowledges that AI can also make mistakes with good inputs; direct repairs now precede a separate optional passport scene.

Both reported pencil-ring defects are fixed. Static ellipse rotations belong to SVG parent groups so animation transforms do not shift their centres; the answer strip and its ring share geometry and a motion wrapper. Store and Collect rings now enclose their corresponding tags and labels. All fifteen scenes were visually reviewed at 1280px and 390px. Production checks used the range-capable Vite preview under `/pdf-signal-check/`, including paused seeks into scenes 7, 11 and 12. Media time 120 seconds sampled paused scene animations at 9.09 seconds, matching the scene's 110.91-second start. The single prefixed soundtrack remained the playback clock; no MP3 was requested at startup, desktop/mobile content stayed within the viewport, and the browser reported no errors.

All fifteen Emily clips were regenerated for the polished script, totalling 147.17 seconds. The locally assembled soundtrack is 151.67 seconds and 910,605 bytes, below the 1 MB playback budget. The existing music bed is extended locally with an 8-second crossfade and final fade; no new music or artwork generation was purchased. OpenRouter reported total key usage of $1.4241581 against the $12 cap, about $0.048 additional spend for this revision. No credential or PDF data is present in browser code.

`npm test`: 298 tests across 42 files pass. `npm run build` passes with the existing large-chunk warning; the story bundle is `story-BsQ5-ud7.js` (24.06 KB gzip). The narration test guards recorded text and nonempty assembly assets; the playback test guards the actual download budget, source hashes and timeline/controller contracts. `npm run story:script` exports the matching captions, narration, visual descriptions and cue times to `docs/story-full-script.md`; builds never overwrite human edits. Earlier validation entries describe previous versions.

Production screenshots: `/tmp/pdf-story-holistic-production-order-mobile.png`, `/tmp/pdf-story-holistic-production-answer-mobile.png` and `/tmp/pdf-story-holistic-production-gigo-mobile.png`. This is Chromium browser verification, not an independent human listening assessment or iOS/Safari hardware check. Work remains local; nothing was pushed or published.

## Familiar video controls and narration edit copy — 8 October 2026

Replaced the separate form-like control row with a persistent dark video bar, full-width seek track, central initial Play button and labelled local SVG controls. Speed, volume and chapter selection live in a native Settings disclosure; desktop also has inline volume. Buttons and slider hit areas are 44px. Settings closes on outside pointer input or Escape, which returns keyboard focus to its summary. J/L and Home/End supplement the existing shortcuts; input/select keyboard interactions retain native ownership. Unmuting after setting volume to zero restores audible volume. Captions and the transcript remain available; the single soundtrack still owns time.

All 298 tests across 42 files pass; the production build passes with the existing large-chunk warning. Chromium browser checks used the repository-prefixed Vite preview at desktop 1280px and mobile 390px/320px. No startup MP3 request occurred. Central Play/Pause, keyboard seek, chapter selection, speed changes, zero-volume/unmute recovery, fullscreen entry/exit, settings dismissal/focus return and reduced-motion playback were checked. Reduced-motion playback produced no stage animations. Content and Settings fit the mobile viewport; no browser errors were reported. Accessibility names, native control roles and disclosure state were inspected in the browser tree. This is not a screen-reader certification or Safari hardware test. Screenshots: `/tmp/pdf-story-controls-production-desktop.png`, `/tmp/pdf-story-controls-production-mobile.png`, `/tmp/pdf-story-controls-production-320-settings.png`.

Added `docs/story-narration.md`, containing only scene headings and current narration, for the owner's next pacing pass. No wording, recorded voice, cues or illustrations changed in this pass. Builds never overwrite the new editable file. No paid generation, push or publication occurred.

## Four-chapter review cut and clear reach endpoints — 8 October 2026

Astra reviewed the owner's pacing feedback and proposed four viewer-facing chapters: Who needs your report?; Where meaning gets lost; Why it matters; What you can do. Sol added three title cards before the demonstration, impact and repair phases. The opening hook remains the first chapter opener. Card paper, title and number are visible from frame zero, including paused chapter jumps; secondary motifs animate. Each card lasts at least 3.5 seconds, with measured narration allowed to extend it. The chart remains visible as its page fans into text and tags, and the narration explicitly connects the visible finding to other ways of accessing it.

Chapter buttons now jump between four actual phase boundaries (0, 32.15, 94.43 and 132.58 seconds); Settings offers separate Chapter and Scene selectors. Timeline markers, current-chapter status and grouped transcript headings expose the same structure without relying on visual cards alone. Root production browser checks confirmed these jumps, separate scene selection, paused exact-boundary card visibility, keyboard focus return from Settings, and the prefixed single-clock soundtrack. All changed cards and the chart/layers/GIGO scenes were inspected at 390px; desktop checks and the illustrator's intermediate/end checks also passed. Mobile content remains within the viewport.

The reported unfinished-looking reach lines were intentional short paths, not incomplete draw animations. Seven routes now finish at people; five end at visible coral X marks with faint dashed continuations and a “Some paths stop here” label. The illustrator verified all twelve draw offsets reached zero at the settled frame and inspected intermediate and settled desktop/mobile states. These marks preserve the finding's reduced reach while making the endpoint deliberate.

The GIGO narration adds restrained 1950s/early-computing context, following the history section of https://en.wikipedia.org/wiki/Garbage_in,_garbage_out#History (the owner's supplied source), which cites 1957 usage. A small history strip is visible, and the qualification that AI can err with good inputs remains. Only the three new bridges and the layers/GIGO passages were generated; thirteen content clips were reused. Eighteen clips total 157.85 seconds. The final mix is 165.02 seconds at 40 kbit/s, 825,597 bytes, retaining the 1 MB playback budget. OpenRouter reported $1.4350481 cumulative usage against the $12 cap, approximately $0.011 additional spend. No new music or raster artwork was purchased.

`npm test`: all 299 tests across 42 files pass, including the chapter reading-hold contract. `npm run build` passes with the existing large-chunk warning. `docs/story-narration.md` contains the chaptered narration-only edit copy; `docs/story-full-script.md` has matching captions, narration, visual descriptions and cues. Builds never overwrite these edit copies. Screenshots include `/tmp/pdf-story-chapters-final-card2-mobile.png`, `/tmp/pdf-story-chapters-final-card3-mobile.png`, `/tmp/pdf-story-chapters-final-card4-mobile.png`, `/tmp/pdf-story-chapters-final-layers-mobile.png` and `/tmp/pdf-story-chapters-final-gigo-mobile.png`. Browser verification is Chromium, not a human listening certification or Safari hardware test. Work remains local; no push or publication occurred.

## Narration-aligned labels, pointers and launch identity — 8 October 2026

Sol revised the reader headings to “People who see”, “People who listen” and “Machines that process”, with matching present-tense action labels. The chart bubble uses a targeted tail position/depth to point at South's upper-left bar shoulder while keeping “3.4 m” readable; default bubble tails elsewhere are unchanged. The AI consequence reference is explicitly headed “What the report actually says”, with the 2025/South finding underneath. Two hypothetical answer copies sit separately above it, with no reference overlap in intermediate or settled frames.

The final stage shows `PreventionWeb.net/signal-check` below the privacy strip, completing before the scene ends. The same URL is selectable HTML text beneath the final call to action. It is display text for the owner's planned launch redirect; no redirect or deployment was configured. PreventionWeb's official dark SVG logo loads beside UNDRR's from `https://assets.undrr.org/logos/pw/pw-logo.svg`, with an explicit image alternative. Both logos loaded in the production browser; there is no copied logo, new player dependency or theme switch. Narration, audio assets and all 18 cue times remain unchanged. The audio edit copy is still `docs/story-narration.md`; the full script's visual descriptions were refreshed.

Production checks under `/pdf-signal-check/` at 1280px and 390px covered the labels, chart pointer, correct-reference hierarchy and closing URL. Mobile content remained within the viewport; both official logo images loaded. Desktop/mobile and intermediate-frame stills were inspected. Screenshots: `/tmp/pdf-story-final-polish-readers-desktop.png`, `/tmp/pdf-story-final-polish-pointer-mid-desktop.png`, `/tmp/pdf-story-final-polish-answer-desktop.png`, and the corresponding mobile stills; ending: `/tmp/pdf-story-final-polish-ending-mobile.png`.

A same-scene backward-seek defect was found during this check: DOM `getAnimations()` omits finished effects with backwards-only fill, so querying it on each tick lost completed entries. The player now retains ownership of each scene's animation objects, samples that collection and cancels it on cleanup. Before the fix, seeking from 44.4 to 37.5 seconds left the chart bubble visible (opacity 1). After the fix it correctly hides (opacity 0) and the undrawn ring has dash offset 1; seeking forward restores opacity 1 and dash offset 0. Both checks were paused and used the same media clock. No independent visual timer was introduced.

All 299 tests across 42 files pass, including soundtrack/cue drift checks; `npm run build` passes with the existing large-chunk warning. Browser checks reported no errors. This remains Chromium verification, not Safari hardware or a certified screen-reader audit. No paid generation, push or publication occurred.

## Owner's revised narration, matched visual pacing — 8 October 2026

Read the owner's edits to `docs/story-narration.md` and retained a raw backup at `/tmp/pdf-story-user-narration-revision-2026-10-08.md`. Astra polished the grammar and transitions while preserving the expanded research audience, hidden-formatting error spread, explicit chart explanation, cake analogy, detached-number explanation, conflicting-year question and fuller AI consequence. “Errors” describes accidental formatting faults without implying intentional disinformation. The deliberate final-sentence cut to garbage-in/garbage-out is respected in narration, caption, strip and visual description. Eighteen scenes and four chapters remain; `docs/story-narration.md` is the refreshed narration-only edit copy, and `docs/story-full-script.md` contains the matching captions, descriptions and timings. Builds do not overwrite these files.

Sol added a restrained paper-error ripple, a small clearly labelled cake analogy, a “Which year?” prompt and two small input fragments approaching the AI chatbot. The chart's South emphasis, method sequence/rings and AI consequence now enter at the corresponding points in the longer spoken passages. The real method tags remain the main evidence; the cake is explicitly an analogy, not part of the report. Possible wrong answers remain distinct from the correct 2025/South reference. The second repeated answer was moved left to fit the mobile safe area, with cue times unchanged. The closing URL and official co-branding are retained.

Twelve changed clips were regenerated and six unchanged clips reused. The 18 voice clips total 196.35 seconds; the assembled timeline is 203.65 seconds (about 3:24). The existing music bed is extended locally, with no new paid music or images. The mix is 815,085 bytes, mono 24 kHz / 32 kbit/s MP3. The builder now selects 48 kbit/s through 164 seconds, 40 through 198 seconds, and 32 thereafter, preserving the current 1 MB playback budget without rushing the narration. OpenRouter reported $1.4859561 cumulative usage against the $12 cap, $0.050908 additional spend for this pass. The key remains outside app code.

Production Chromium checks under `/pdf-signal-check/` covered desktop 1280px and mobile 390px/320px. New composed and intermediate visuals were inspected, including the ripple, cake, AI reference and closing URL. Both official logos load and the 390px page has no horizontal overflow. Reduced motion uses composed stills with zero stage animations. Playback speed, paused chapter jumps, Home/End, Settings dismissal/focus return and same-scene backward seeking follow the single soundtrack clock: the South bubble is visible at 53.5 seconds and correctly hidden after seeking backward to 45 seconds. No browser errors were reported.

An axe check found the guidance link relied on colour alone; it is now underlined. The narrow-phone Settings panel previously extended above the viewport; its mobile height is now capped at 230px/45vh with internal scrolling. At 320px the panel spans x44–300 and y102.5–332.5, wholly within the viewport. Focusing the lower Scene selector scrolls the panel internally (scrollTop 217), leaving its 44px control fully visible. The follow-up WCAG A/AA automated check reports zero violations, with SVG/gradient contrast checks remaining incomplete. This is Chromium verification, not a certified screen-reader audit or Safari hardware test. Screenshots include `/tmp/pdf-story-v3-settings-320.png`, `/tmp/pdf-story-v3-final-cake-desktop.png`, `/tmp/pdf-story-v3-final-answer-desktop.png`, `/tmp/pdf-story-v3-final-answer-mobile.png`, and `/tmp/pdf-story-v3-final-ending-mobile.png`.

All 299 tests across 42 files pass against the completed assets. One overlapping run read the soundtrack while it was being rewritten and failed its hash contract; the subsequent run against stable files passed. `npm run build` passes with the existing large-chunk warning. Work remains local; no push, redirect configuration or publication occurred.

## Fuller service closing and consistent website narrative — 8 October 2026

The closing narration now names the free UNDRR and PreventionWeb service and gives private on-device processing a complete sentence. Only clip 18 was regenerated; it lasts 14.62 seconds. The closing scene lasts 20 seconds, leaving 5.38 seconds after the voice finishes. Sol added measured service, privacy and URL strips at 8, 11 and 14 seconds; the URL remains fully composed for more than five seconds. The soundtrack is now 213.94 seconds at 32 kbit/s, 856,269 bytes, still inside the 1 MB budget. Existing music covers the longer cut and fades out locally; no new music or images were purchased. OpenRouter reports $1.4902461 cumulative usage against the $12 cap, $0.00429 additional spend. Both script Markdown edit copies and audio documentation are current.

Astra carried the seeing/listening/machine-use narrative into landing, About, capabilities, sample descriptions, review guidance and header/wordmark/page-description copy. The site connects concrete missing chart meaning, mixed-up steps, detached values and conflicting editions to source-document repairs. Practical fixes precede optional wider reuse. Removed unsupported guarantees that well-structured PDFs make screen readers and AI get things right, that attached descriptions are necessarily read by search engines, and that screen-reader reading order is wholly sound when one numbered sequence agrees. Changes are presentation copy only: outcomes, categories, headline counts, consent, controllers and profile acceptance are unchanged. The story's final About action now says “Why this matters”.

About also explains why UNDRR and PreventionWeb care: PDFs underpin shared risk knowledge, and small omissions can travel through research, search, summaries and AI answers, affecting understanding and decisions about risk and resilience. The institutional mission statements link to verified official sources, https://www.undrr.org/our-work and https://www.preventionweb.net/about-preventionweb. The service rationale is a possible consequence, not a claim of observed harm or a new formal institutional policy.

Production Chromium checks used the repository-prefixed preview at desktop 1280px and mobile 390px. The revised wordmark fits its original dimensions; landing and the About mission passage remain readable with no horizontal overflow. The mobile closing shows all three strips and both logos clearly. Screenshots: `/tmp/pdf-story-service-close-mobile.png`, `/tmp/pdf-site-video-lens-landing-desktop.png`, `/tmp/pdf-site-video-lens-landing-mobile.png`, and `/tmp/pdf-site-video-lens-about-mission-mobile.png`. Browser errors were empty. These are Chromium checks, not a certified screen-reader audit or Safari hardware validation.

A fresh no-AI check of the scrambled chart sample still returns “1 thing to fix, 4 to check”. Downloaded its actual fix-list PDF to `/tmp/pdf-site-video-lens-fix-list.pdf`, rendered all 12 pages with Poppler, inspected the complete contact sheet and affected fix-list/description pages individually. Updated guidance wraps inside the margins, evidence crops remain distinct, and page headers/footers do not overlap. No export layout code changed. The 39 focused review tests passed, followed by the final standard suite: all 299 tests across 42 files pass. `npm run build` passes with the existing large-chunk warning, and `git diff --check` is clean. No push, deployment or redirect configuration occurred.


## About video embed and homepage preview — 8 October 2026

Moved the story player into About at `#about-video`, with a keyboard-accessible image link on the right side of the homepage hero. The 56 KB WebP is a composed frame from the existing animation, without copied institutional logos. The player and its CSS load lazily on About; the homepage does not request the story bundle or soundtrack. Opening the embed leaves audio paused and without a source until Play. Leaving About disposes the player and stops audio while retaining the app's PDF controller state. Existing `story.html?scene=…` links forward to About with the scene and repository prefix preserved. Narration, timeline and audio assets are unchanged.

Production Chromium checks under `/pdf-signal-check/` passed at desktop 1280px and mobile 390px: keyboard Enter opens the preview and focuses the video heading, the mobile page has no horizontal overflow, playing then returning home stops the detached media, and an old scene-13 link opens the correct paused scene. Browser errors were empty. Screenshots: `/tmp/pdf-about-video-hero-desktop.png`, `/tmp/pdf-about-video-player-desktop.png`, `/tmp/pdf-about-video-hero-mobile.png`, and `/tmp/pdf-about-video-player-mobile.png`. These are Chromium checks, not a certified screen-reader audit or Safari hardware validation.

All 299 tests across 42 files pass. `npm run build` passes with the existing large-chunk warning; the About story is a separate lazy chunk and the old story entry is a small forwarding script. `git diff --check` is clean. No paid generation, push, deployment or publication occurred.
## Review fixes, PreventionWeb theme and gated preview — 8 October 2026

Implemented the independent technical and editorial review priorities: bounded preview/crop canvas allocations, shared grouped Fix/Check/Couldn't check counts across review/batch/export, a skip link that focuses the current page without changing its route or disposing the movie, and semantic PDF export structure. The default PDF is a concise fix list; full technical PDF and JSON remain available under More downloads. Exports retain the captured source/report snapshot and add contextual figure alternatives, headings, lists, document language and Unicode replacement text. An invisible blank text carrier inside raster replacement spans makes non-Latin filenames extractable in Poppler without changing the visible page.

Setup now leads with the purpose of each option, keeps model names and deeper performance details secondary, and repeats costs and consent before optional downloads. Guidance explains handing fixes to the source-document editor and checking the revised PDF. Documentation reflects the current samples and separates deterministic profile acceptance from optional AI advice.

The pinned Mangrove 2.0.0 PreventionWeb stylesheet uses SRI and the `mg-theme-preventionweb` root class. The header retains the official UNDRR horizontal logo, as requested; the movie retains both institutional logos. The Mangrove PreviewAccess adaptation gates application mounting with PIN 5498, stores only a scoped session unlock marker and preserves forwarded story scenes. No external startup JavaScript, PDF uploads, telemetry or paid generation was added. See PREVIEW-ACCESS.md for limitations and launch removal; this static preview gate is not authentication.

Final local verification: all 317 tests across 46 files pass; the production build passes with the existing large-chunk warning; `git diff --check` is clean. Production Chromium checks at `/pdf-signal-check/` covered desktop 1280px and mobile 390px, the retained UNDRR logo and active PreventionWeb theme, setup/consent, batch counts, skip-link focus, movie disposal and the PIN gate. Locked bootstrap does not mount App or request sample/model assets; wrong codes announce an error, Escape retains the dialog, correct entry and reload work, and forwarded scenes remain paused after unlock. Mobile layouts have no horizontal overflow.

Downloaded and rendered actual concise (3 pages) and full (11 pages) PDFs, inspecting all pages for clipping, overlap and crop readability. Both are tagged with document language and logical structure. A final Unicode filename report renders correctly and extracts `水質💧.pdf` exactly once; Poppler `-raw` retains heading-to-filename order. Default spatial extraction order remains reader-dependent. These checks do not establish PDF/UA compliance, certified assistive-technology support, Safari/Firefox behavior or real-world AI accuracy. Optional broader corpus evaluation and About retry refinements remain outside this delivered review-fix scope.
## UNDRR editorial style pass — 8 October 2026

At the owner's request, the Astra editorial agent consulted the authoritative Mangrove editorial manual (https://mangrove.undrr.org/llms-editorial-manual.txt), writing-agent instructions (https://assets.undrr.org/docs/editorial-guides/ai-agent-instructions.md), guide index and recipes. Applied sentence-case UI headings, the guide's navigation capitalization, British spelling, concise action/status language, expanded institutional names and clearer model-cache/download wording. Explicit download consent, privacy explanations, technical limitations and outcome enums are retained. Recorded narration and its matched script/audio were not changed.

Final verification: all 317 tests across 46 files pass; production build passes with the existing large-chunk warning; diff whitespace checks are clean. Production Chromium at the repository-prefixed URL covered desktop 1280px and mobile 390px, incorrect/correct PIN, privacy dismissal, setup costs and standard checks, and About copy. The partly prepared sample remains 1 Fix and 4 Check. No horizontal overflow or model downloads; PreventionWeb theme and UNDRR header remain intact. The gate test now checks its accessible title relationship instead of coupling its bootstrap contract to an exact editorial phrase.

## Lightweight cleanup and Pages setup attempt — 8 October 2026

Removed the unused SegmentedControl re-export, Tick wrapper and obsolete findingTargets mapper (which was only exercised by its own test). Preserved the geometry assertions for active candidate selection. Corrected the story overview to the current 213.94-second timeline and 201.56 seconds of narration, consolidated duplicate README links and updated experimental status without restructuring working features or asset generation. All 317 tests across 46 files pass; build passes with the existing large-chunk warning; diff checks are clean. No visible UI or PDF layout changed.

The existing GitHub Actions workflow validates PRs and publishes only successful main builds. Pages and its deployment environment were not enabled. The authorized API request to enable Actions publishing returned HTTP 422: “Your current plan does not support GitHub Pages for this repository.” The repository remains private and the draft PR remains unmerged. Hosting requires a supported private-repository plan or an explicit visibility decision; the pending prerequisite is documented in README. No live deployment was claimed.

## Public repository and Pages activation — 8 October 2026

The owner explicitly authorized public visibility, Pages setup and squash merge of PR #1. Repository visibility is now public and the Pages API accepted Actions publishing at https://preventionweb.github.io/pdf-signal-check/. The preview PIN remains 5498; no PreventionWeb redirect or custom domain was configured. This entry records configuration, not a completed live-site validation; deployment verification follows the main build.
