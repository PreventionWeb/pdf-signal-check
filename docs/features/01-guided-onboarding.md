# Feature 01: guided onboarding and analysis flow

Status: first single-PDF slice delivered in app 0.5; independent integration review passed (74 tests and focused browser QA). Owner: UI flow. Companion: [issue review](02-issue-review.md).

Delivered slice: existing acknowledgement and preference, Document → Checks → Processing → Review, explicit supported recommendation or no-AI route, alternate model/check selection, retained-file navigation, cancel/retry, and full evidence access. The brief also describes follow-ups; resumable sessions, persistent workflow preferences, device performance estimates, and crop/export additions are not implemented.

## Outcome and design direction

Help someone choose a PDF, understand optional AI costs, and reach a reviewable result without navigating a diagnostic dashboard. Use the approachable sequence and clear next action common to tax preparation software: one decision per frame, short explanations, visible progress, and reversible navigation. Keep this tool's own name, visual style, and language; do not copy another product's branding or interfaces.

Preferred desktop/mobile stages: **Start → Document → Checks → Processing → Review**. Processing is a transient state, not a completed step users must click through. Keep the selected filename and a compact step indicator visible after document selection. Show one main action and one secondary action per frame. Advanced evidence, configuration details, and the complete report remain available without crowding the primary journey.

## User stories

- As a first-time visitor, I understand that PDF analysis and optional AI run on my device, that external assets still download, and that the tool was built with AI and can make mistakes before I proceed.
- As a visitor trying the tool, I can choose a labeled example and see the same journey I would use for my own file.
- As someone with a PDF, I can upload it, retain my chosen file while moving backward, and see understandable loading/error states.
- As someone avoiding unnecessary downloads, I can review traditional findings without AI or deliberately accept a visible recommended model and selected checks.
- As a multilingual user, I see supported model choices informed by explicit document language rather than an assumed English default.
- As a returning visitor, I can skip only the introductory notice using my acknowledgement preference, then reopen it whenever needed.

## State flow

| State | Contents and actions | Transition / safeguards |
| --- | --- | --- |
| Start | Four plain-language points: local PDF processing; optional local AI with external app/model/tokenizer assets; AI/rules can make mistakes; built with AI assistance. `I understand` plus `Don't show again`. | Reuse the existing explicit acknowledgement and its notice-only storage key. Escape/backdrop never acknowledges. A saved suppression preference skips this frame only. Header `About AI & privacy` always reopens the information. |
| Document: empty | `Choose your PDF` and `Try an example`; upload/drop affordance; limits; two approachable example pairs. | Single file only. The user makes no model-download commitment here. Loading an example may fetch the PDF from the site. |
| Document: selected / reading | Filename, size, `Change PDF`, and real traditional-analysis progress. | Start existing browser-local traditional analysis as soon as the file is chosen. Retain the original File separately from the transferred worker buffer. No model is fetched. Read explicit language to inform the next decision. |
| Checks | `Choose how to check this PDF`. Traditional checks are already included. Offer `Review without AI` and `Use recommended settings`, with `Choose another model` and editable check selection. | The recommendation names the exact selected model, language compatibility, model/tokenizer download, separate runtime cost, and unmeasured performance. Accepting the recommendation is an explicit run action, never a silent download. Unknown/unsupported language produces uncertainty and no forced English inference. |
| Processing | Explain actual phases: reading structure, applying traditional rules, downloading selected assets when needed, running bounded AI checks. `Cancel` remains visible. | Progress comes from actual worker messages; do not fabricate elapsed-time estimates. Settled title-only checks can finish with rules and no model download. |
| Review | Issue-first overview and `Review findings`, plus secondary `What worked` and `Full evidence`. | The structural Yes/No stays qualified by profile. Metadata/order/model findings remain separate; a profile pass is not overall AI readiness. |

The first implementation should use traditional analysis to discover language before confirming the recommended model. Do not add a second full parse merely to create a separate preflight stage. If reading is still active, the checks frame can explain that recommendations will be available when the file finishes loading; retain real progress and cancellation.

## Suggested copy

- Start heading: **Before you begin**.
- Document heading: **Which PDF would you like to check?**
- Checks heading: **Choose how to check this PDF**.
- Traditional option: **Review without AI** — “Text, tags, metadata rules, and bounded order/visibility checks run locally without a model download.”
- Recommended option: **Use MiniLM for this English document** / **Use Granite for this supported language**. Display costs and limitations beside the action.
- Missing language: “The PDF does not declare a usable language. Semantic compatibility is uncertain; you can review the traditional findings now.”
- Processing: “Your PDF stays on this device. We will show the evidence behind each finding.”
- Review: **Here is what needs your attention**. For a clear report with no flagged findings: **No concrete problems were found in the completed checks** — followed by unassessed/uncertain scope rather than a universal all-clear.

## Navigation, cancellation, and retry

- Back preserves the File, completed report, chosen model/checks, and source hash in memory; it does not repeat completed work or initiate a new download.
- Changing the file ends active analysis and AI workers, invalidates job/run nonces, clears file-specific review state, and removes example ground-truth labels from arbitrary uploads.
- `Cancel` during traditional analysis returns to the selected-document frame with “Analysis canceled”; retry starts a fresh worker. Completed prior-file results must not be shown as the new file's results.
- `Cancel` during AI keeps the traditional report and previous completed AI result, if any. Offer `Review available findings` and `Retry selected checks`.
- A download/model error preserves traditional findings and explains retry versus review without AI. It never changes structural acceptance or invents a semantic result.
- Returning to Checks may edit preferences; the completed result retains the model/checks that actually produced it. A new explicit run is required to replace that result.
- Browser reload is not an in-memory session restore. If a later feature persists a report, it requires a separate privacy/product decision; the notice preference never authorizes PDF storage.

## Accessibility and mobile

Use semantic headings, an ordered step list with `aria-current="step"`, native buttons/inputs, and clear focus indicators. Move focus to the active frame heading after a deliberate stage transition; retain focus for local disclosures and control edits. Announce progress concisely through a status region without narrating every percentage update.

Keep primary controls at least 40 × 40 px, tabular progress/count numerals, balanced headings, and readable wrapping. On mobile, show a compact current-step label rather than forcing a wide breadcrumb. Model comparison details may expand beneath the chosen option; no page-level horizontal scrolling. Reduced motion removes slide/scale effects, and frames must remain usable without animation. Reuse the existing native modal focus trap and focus restoration for manual privacy reopening.

## Acceptance criteria

1. A first visit requires explicit `I understand` before document interaction; suppression is saved only when checked and acknowledged. Read/write failures still permit proceeding, with visible feedback.
2. A returning suppressed visit opens at Document, with the privacy control discoverable.
3. Example and upload paths share the same stages, but ground-truth labels appear only for explicitly loaded known examples.
4. No model/tokenizer/runtime inference download occurs on entering a frame, selecting a model, or changing checks. An explicit run/recommended-settings action is required.
5. Recommended settings disclose exact model, language coverage, downloads excluding runtime, additional runtime, and uncalibrated limitations before the action.
6. Review without AI works on every parseable supported input, including files with missing/unsupported language metadata.
7. Back, cancellation, retry, replacement, and stale responses preserve the existing job/nonce protections and single-canvas lifecycle.
8. Completed result identity and current selection remain distinct in the interface and export.
9. Keyboard-only and 390 px mobile users can complete the entire journey without inaccessible controls or page-level overflow.
10. First-visit, suppressed-visit, example, uploaded-file, rules-only, unsupported-language, canceled/error, and successful AI paths receive focused browser QA.

## Dependencies and implementation boundaries

- `src/main.js`: currently mixes worker orchestration, report rendering, selection, and upload events. Extract a small flow controller with explicit state; preserve existing analyzer/model contracts rather than rewriting them.
- `src/privacy-notice.js`, `index.html`: reuse acknowledgement preference and manual reopening; the intro can visually become the Start stage without weakening its acknowledgement semantics.
- `src/engine/models.js`, `src/model.worker.js`: reuse pinned registry, support checks, request nonces, warm worker, and per-check methods.
- `src/analysis.worker.js`: reuse real traditional-analysis progress and cancellation.
- `src/preview.js`: retain one page/canvas and the original File; do not reconstruct the viewer on every stage change.
- `src/style.css`: retain warm surfaces and typography; add frame layout and responsive step navigation with narrowly scoped styles.
- [Feature 02](02-issue-review.md) consumes the completed report; the issue normalization feature must supply stable issue IDs and explicit provenance.

## MVP and follow-ups

MVP: staged shell over the existing pipeline, reuse notice, retain upload/examples, explicit recommendation/manual choice, real processing state, and an issue-first handoff. No backend, persistent PDF session, new model, automatic repair, or authoring-software integration.

Follow-ups: recent non-content preferences, comparison of multiple runs, resumable reviews with separately approved storage, richer language selection/detection, and device performance measurements. None should block the first guided slice.

## First slice and estimate concerns

Preferred first slice is the staged shell plus existing controls: one implementation pass for state/navigation, one for responsive frame rendering, and one for cancellation/keyboard/browser QA. Treat this as a medium UI change, not a cosmetic rewrite. Avoid a calendar promise before the issue-schema dependency is agreed.

The main risk is duplicating state between the wizard, current report renderer, and workers. Keep one source of truth for the File/job/run/report, and make transitions explicit. Cropped evidence and tailored repair guidance belong to the companion feature and can ship incrementally after the shell.
