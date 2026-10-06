# Feature 02: issue-first review and guided problem frames

Status: first issue-review slice delivered in app 0.5; independent integration review passed (74 tests and focused browser QA). Owner: review UI. Dependency: normalized issue/report presentation. Companion: [guided onboarding](01-guided-onboarding.md).

Delivered slice: normalized stable findings, separate problems/uncertainty/positives, Previous/Next and session-only Reviewed controls, concrete title/author/order comparisons, bounded required/model evidence, source-tool guidance, and the existing full-page preview with highlights. App 0.6 adds bounded evidence crops and PDF/PNG snapshots; revised-file comparisons and verified software-specific repair recipes remain follow-ups.

## Outcome

Help users understand a concrete problem and its next step, rather than asking them to interpret a wall of check statuses. After processing, lead with detected defects and suspected mismatches; keep scope limitations and uncertain/unsupported findings visible in their own group. Offer optional views of what passed and the complete evidence.

The design borrows the reassuring pacing of guided tax preparation: one question or problem at a time, understandable comparison, explanation, and next action. It remains PDF Signal Check, with evidence and bounded claims rather than product promises to prevent hallucinations.

## User stories

- As someone seeing “suspected mismatch,” I can immediately see exactly which metadata and recovered publication text disagree.
- As someone seeing an order warning, I can compare the recorded tagged sequence with stream/visual evidence without mistaking valid links for correct order.
- As someone fixing a source document, I receive concrete source-level correction steps and a way to retest, rather than a generic warning.
- As someone with a passing structural profile, I still see metadata issues and unassessed scope rather than an overall “AI-ready” message.
- As someone inspecting uncertainty, I can understand why evidence is insufficient, what was actually checked, and when the tool cannot recommend a correction.

## Issue-first overview

Show selected filename, profile-qualified structural verdict, and a short completion/scope sentence. Present three distinct groups:

1. **Problems to inspect**: required failures and suspected metadata/model mismatches, with concrete issue titles and provenance.
2. **Checks needing more evidence**: unsupported content, incomplete analysis, uncertain semantic results, and required review scope. Do not describe all uncertainty as a PDF defect.
3. **What worked**: collapsed or secondary positive checks, bounded matches, and completed operations. No confetti or blanket all-clear.

Primary action: **Review findings**. Secondary actions: **What worked**, **Full evidence**, **Download report**. If no concrete problems were found, state that precisely and offer review of remaining uncertainty; do not replace profile-qualified acceptance with a universal readiness badge.

Keep independent counts: required checks needing inspection, advisory findings, and unassessed/uncertain checks. A structural “0 required checks to inspect” must not conceal author/model/order warnings.

## Problem-frame anatomy

Each frame has a stable issue ID and accessible heading, position within the review queue, and these sections:

| Section | Contents |
| --- | --- |
| What needs attention | Plain-language issue title and outcome: demonstrated defect, suspected mismatch, or not established. Identify traditional rule, structural check, heuristic, or local model. |
| Compare the evidence | Exact metadata/text/order values with provenance; page/node/content references where available. Source metadata is document-level and receives no invented page location. |
| See it on the page | Trustworthy highlighted region or optional rendered crop, with page and approximate-bounds caption. Provide full-page inspection and text evidence as fallbacks. |
| Why it matters | Explain the specific downstream ambiguity: wrong publication context, omitted/unstructured text, order-dependent meaning, or topical metadata with insufficient support. Avoid claims that this particular file will cause hallucinations or a measured compute cost. |
| How to address it | Source-level fix steps or bounded manual-review instructions. Do not imply the app has repaired the PDF. |
| Next action | `Next finding`, `Back`, `Return to overview`, and optional `Recheck a revised PDF`. A local `Reviewed` marker records inspection, not compliance or proof of resolution. |

Unknown source authoring software gets generic repair guidance. Tailored instructions for Word, InDesign, Acrobat, etc. require separate verified documentation and must not be inferred merely from a software Creator string.

## Representative frames and copy

### Title mismatch

Heading: **The document title describes a different publication** or, when uncertainty is higher, **Check the publication title**.

Compare Info title, each relevant XMP title/language alternative, and credible first-page tagged/cover candidates. Sample 13 shows “Harbor Observatory Annual Summary 2025” against the tagged “Harbor Observatory Annual Report 2025.” Include page-1 evidence navigation; distinguish heuristic candidacy from verified publication identity.

Why: “An ingestion system may use metadata to identify or describe the document. A different year, organization, or publication title can attach the wrong context.”

Fix: verify the intended publication title; update document properties and XMP consistently in the source/export workflow; export a new tagged PDF; upload it again and compare the resulting evidence. Do not recommend changing metadata merely because an embedding score is low.

### Author mismatch

Heading: **The listed authors do not match the byline candidate**.

Show Info Author, XMP creator sequence, and explicit recovered first-page byline, with roles/provenance. Sample 14 shows Iris Hale / Owen Brooks versus tagged Maya Chen / Leo Martin. Display the actual reason and manual-review caveat for publisher, editor, abbreviated names, or ambiguous bylines.

Why: “A machine may attribute the publication using author metadata. Different names deserve inspection before that attribution is reused.”

Fix: confirm actual author versus editor/publisher roles; update the appropriate author fields in the source document/export settings; preserve intended ordering and spellings; regenerate and recheck. Missing or initialed names may require manual identity review rather than automatic correction.

### Numbered order anomaly

Heading: **The tagged sequence changes the order of these steps**.

Display actual tagged steps 3, 4, 1, 2 beside stream steps 1, 2, 3, 4 for sample 17, with the actual anomaly reason. Include the rendered two-column page or trustworthy step crops. Visual order and content-stream order are evidence, not an automatic ground truth for arbitrary PDFs. Explain that numbering can legitimately restart and that a syntactically correct tag tree can still encode the wrong procedure order.

Fix: verify intended sequence; adjust reading order in the source/export/tagging workflow; retain valid content associations and artifacts; regenerate and compare the sequence. The current tool cannot prove all column/prose/table order correctness.

### Untagged text / broken associations

Heading: **Some extracted text is not connected to the structure**.

Show relevant text and locations where trustworthy; use document/page fallback when raw structural references are dangling. Explain the precise detected link/coverage problem. Fix by restoring meaningful tags and correct content associations in the source/export process, then recheck. Never suggest adding an empty tag tree or merely setting the marked flag.

### Model subject, keyword, or heading suspicion

Heading: **This [subject / keyword / heading] has weak support in the checked excerpts**.

Show the individual metadata term or heading, bounded supporting/opposing excerpt, model actually used, field method, provisional result, and consumed-prefix/truncation note. Keep per-keyword results separate; a related keyword does not cancel a flagged one.

Fix: inspect document scope, alternate wording, and later sections omitted from the bounded sample. Change metadata only if the evidence and publication intent support it. Prefer “more review needed” to a definitive semantic-invalid conclusion. The German unrelated-keyword probe currently remains uncertain; do not present these models as reliably detecting all unrelated keywords.

## Cropped evidence contract

MVP can use the existing full-page preview and selected highlights plus the inline text/value comparison. Introduce crops only after a stable target contract is available:

- Derive every crop from the actual rendered page and complete PDF.js viewport matrix, including rotation and CropBox offsets.
- Use a trustworthy target quad/bounding region, a modest context margin, and bounds clamped to the viewport. Preserve approximate geometry captions; text bounds are not exact glyph outlines, and graphics clipping is not resolved.
- Share the one-page render/canvas and cap copied image pixels. Do not load/render a second full document or retain full-page canvases for every issue.
- Unknown target geometry, vertical text, unsupported Form XObject scope, and dangling references receive text/page fallback, not guessed pinpoint crops.
- Provide page number and a text equivalent; a screenshot is not the only accessible evidence.
- A crop is supporting evidence, not proof that extracted Unicode matches visible glyphs or that the byline/title was classified correctly.

## Queue, back, cancel, and review state

Order the queue with transparent categories: required defects first, then metadata identity warnings, then order/visibility/model advisories, then unsupported/uncertain scope. Within a category retain stable page/order sorting; avoid invented severity/confidence ranking.

Back/Next preserves the current issue and any local Reviewed markers without re-running analysis or downloading a model. Return to overview exposes every category and direct navigation. A completed new AI run refreshes advisory issues using stable IDs and explains added/changed findings; structural issues remain independent. Canceling a run preserves the last completed review. Changing the file clears review markers and known-example origin labels; a corrected file gets fresh findings and source hash.

Do not use `Resolved` or silently upgrade acceptance when someone marks an item Reviewed. Actual resolution requires a revised PDF and completed analysis; even then a heuristic not reappearing is not proof of global correctness.

## Accessibility and mobile

Use semantic problem headings and bounded comparison lists; move focus to the active problem heading on deliberate Next/Back actions. Preserve focus for local evidence disclosures. Announce the frame position and outcome without repeatedly reading long excerpts.

Desktop compares values/sequences side by side. At 390 px, stack with persistent source labels rather than wide tables, and keep primary Next/Back controls reachable with 40 px minimum hit areas. The PDF/crop may scroll internally; the page itself must not overflow horizontally. Use color plus words/icons, clear focus outlines, optional motion with reduced-motion support, tabular counters, readable text wrapping, and no forced animation on first report load.

## Acceptance criteria

1. Sample 14 immediately explains metadata Iris/Owen versus byline Maya/Leo; sample 13 explains Summary versus Report; sample 17 explains the actual sequence anomaly.
2. Every issue shows method/provenance, precise outcome, comparison, why it matters, and fix/manual-review guidance.
3. Structural acceptance stays profile-qualified and unchanged by viewing, marking Reviewed, or model advisories.
4. Required defects, advisory warnings, uncertainty/unsupported scope, and positives have separate counts and visible routes.
5. Match and uncertain outcomes expose meaningful evidence/limitations through the optional views; no misleading blanket pass is introduced.
6. Page actions use only reliable targets; document-level metadata, unsupported scope, and unknown geometry never invent locations or crops.
7. Model cards show the completed run's model/checks and consumed-prefix limits independently of current picker preferences.
8. No model download occurs from navigating a frame or clicking evidence; only an explicit run starts AI work.
9. Back/Next/overview, file replacement, cancellation, retries, and new model results preserve stable issue identity and single-preview cleanup.
10. Keyboard, screen-reader structure, 390 px layout, rotated/cropped pages, and the positive/negative example pairs receive focused browser QA.

## Dependencies and scope

- `src/main.js`: reuse `summaryComparison`, `summaryEvidence`, `advisorySection`, semantic field methods, and current selection/result distinction. Extract frame presentation into a separate review module rather than growing the monolithic renderer indefinitely.
- `src/geometry.js`, `src/preview.js`: existing stable block IDs/content keys and viewport geometry provide targets. A later crop API should sit behind the preview controller.
- Report/issue normalization: needs stable ID, category, source/method, outcome, page/target references, compared values, reason, and remediation type. It must retain raw report/provenance for export.
- `src/engine/advisories.js`, `src/engine/titles.js`, `src/engine/semantic.js`: reuse results; do not invent new detection claims in presentation code.
- `public/calibration/manifest.json`: ground truth is shown only for app-loaded examples; never infer truth from an uploaded filename.
- [Feature 01](01-guided-onboarding.md) supplies the outer journey and cancellation/navigation state.

MVP: normalized issue-first overview, title/author/order/coverage frames using existing preview highlights, concise source-level guidance, optional positives/full evidence, and in-memory review navigation. Follow-ups: trustworthy crops, verified application-specific repair instructions, corrected-file comparison, richer section/evidence selection, and independently evaluated semantic detectors.

## First slice and estimate concerns

Start with the three demonstrable identity/order frames and existing full-page highlights. This is a medium UI slice once a stable issue adapter is agreed; building the crop pipeline at the same time makes it substantially larger. Plan separate implementation passes for normalization/queue, concrete problem frames, and accessibility/cancellation/fixture QA rather than promising a fixed date.

Main risks: semantic warnings presented as proven defects; overconfident fix instructions; duplicate findings from aggregate and per-term model results; unstable queue IDs after model reruns; and crops that imply precision the parser has not established. Preserve the raw evidence and keep unsupported cases honest.
