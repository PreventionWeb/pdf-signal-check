# Application review against the UX reference

Reviewed 7 October 2026 against [UX-ARCHITECTURE.md](UX-ARCHITECTURE.md). This is an assessment of the current application, not an implementation receipt. No application code, analysis policy or sample assets were changed. The recommended changes below remain proposed.

The application now follows the requested workflow much more closely: an outcome headline, task-oriented inbox, yellow finding summary, relevant inspection modal and repair-first metadata stop screen. The main remaining problem is uneven translation at the evidence layer. Some comparisons still lead with internal PDF vocabulary; some bounded evidence is presented without telling the reader what was omitted; grouped heading findings lose a visible method section.

## Evidence and limits

- Used an isolated `agent-browser` session on the existing `http://127.0.0.1:5173` dev server. Exercised all four public samples with **No AI** selected: well prepared, partly prepared, poorly prepared and missing document information. Inspected desktop at 1280 × 720 and mobile at 390 × 844.
- Observed the well-prepared reading-order inspector, the partial sample's two-sequence diagram, and the poor sample's explicit no-sequence modal warning. Exercised Escape, focus restoration, review-list ArrowDown and Enter collapse/reopen. Mobile document width stayed 390px on the poor sample; the modal stayed inside the viewport and locked background scrolling.
- Rendered the actual `Checks` component with synthetic progress, timeout and cancellation states, and the actual `Review` component with two synthetic heading findings of different outcomes. Controllers were inert stubs; these were presentation checks, **not model execution or end-to-end recovery tests**. No model assets were requested by these fixtures.
- Inspected the relevant presentation, provenance, runtime timeout, controller/export interfaces and existing contract tests. Did not execute real inference, reproduce a live stalled external download, test assistive technology, exercise every keyboard path, test batch flows, or test a production repository-prefixed build. No PDF export layout changes were made; exported PDF pages were not downloaded/rendered in this review. Findings concerning states not available in the public samples are explicitly source-backed below.
- Screenshots were temporary local review artifacts, not repository deliverables. The review browser was closed; the existing dev server was left running. Tests/build were not rerun because this assessment changes documentation only.

## Behavior to retain

| Surface | Conforming behavior and evidence |
| --- | --- |
| Intake and setup | Your PDF / Try a sample use Mangrove-styled native tabs. Four samples provide distinct preparation states. Model choice and download permission are explicit; the no-AI path ran without model downloads. Costs and language coverage remain available in setup. |
| Outcome and workspace | Filename stays small; outcome is the H1; Recheck / Choose another PDF sit beside it on desktop and wrap on mobile. Desktop has approximately one-third task list and two-thirds analysis. Mobile bounds list scrolling and provides Back to review items. |
| Finding detail | A yellow summary leads the selected analysis. Correction instructions are secondary. Method/evidence and Why this matters remain visible for individual findings. Empty page locations and irrelevant crop placeholders are omitted. |
| Navigation and annotation | Native flush accordions collapse and reopen. Reviewed checkboxes are independent of disclosure/selection. ArrowDown changes the selected task. Grouping retains original heading members, and its checkbox updates their annotations rather than engine outcomes. |
| Missing information | The fourth sample shows only the stop headline, critical-information warning, visible repair guidance, official authoring-tool links and updated-file intake. The checklist, exports and technical record are suppressed even without AI. |
| Reading-order inspection | Inspect opens a modal rather than an embedded generic viewer. Reading-order overlay is selected initially. No recovered sequence produces a warning above the page. Default zoom is capped at 100% and fits narrow viewports. Escape restores trigger focus; background scrolling is locked. |
| Progress and recovery | Stage details are visible small text, without a Progress details accordion. The runtime uses an idle-data timeout rather than a cosmetic timer. Synthetic timeout UI names the download problem, says the PDF stayed on the device and offers explicit retry. Cancellation retains completed results. |
| Technical inventory and reports | The technical analysis record is a secondary native Mangrove accordion. JSON and PDF exports remain separate, with session/download privacy explained. Export ownership captures source/report state through its controller rather than changing findings when review markers change. |

## Prioritized findings

Severity reflects user impact, not structural-profile severity. **Medium** means a plausible wrong interpretation or obstructed review; **Low** means avoidable complexity or misleading guidance. “Explicit” identifies a direct reference preference; “Derived” identifies an architectural simplification/accessibility recommendation. Quick corrections are presentation-only; structural corrections require preserving evidence/state contracts.

### 1. Title and author comparisons still lead with Info/XMP terminology

**Medium · Explicit plain-language preference · Bounded presentation change.**

**Trigger/evidence:** Select Check the author names or Compare the saved title with the publication title on the partial/poor sample. `IdentityComparison` presents separate cards titled **Info metadata** and **XMP metadata**, plus explanations such as “candidacy is heuristic.” The affected values are present, but a person must understand two internal stores to decide what is wrong.

**Reference:** Selected analysis hierarchy; Copy rules: describe the affected saved property/value before method vocabulary.

**Impact:** Readers may mistake these stores for different user-editable properties, or fail to distinguish saved information from text printed on the page.

**Correction:** Lead with “Saved author names” / “Saved document title” and “Names/title found on the page.” Where stores agree, show the shared value once with source-specific evidence immediately below under a small visible heading. Where stores conflict, show both values explicitly with a plain “Two saved versions disagree” explanation. Keep Info/XMP attribution and original language variants available in the technical evidence; never silently pick a canonical value. Replace heuristic jargon with “Possible title found on the first page” and an appropriately bounded authorship caveat.

**Source:** [IdentityComparison.jsx](../src/review/IdentityComparison.jsx), [workspace.js](../src/review/workspace.js).

### 2. Page-location totals hide an undisclosed display limit

**Medium · Derived truthful bounded-evidence rule; retain explicit visible locations · Quick first step, bounded follow-up.**

**Trigger/evidence:** The poor sample's first task says **Page locations (37)** but renders `targets.slice(0, 12)` with no omitted-count message or way to reveal the rest.

**Reference:** Relevant comparison/evidence; visible populated locations; preserve complete underlying evidence.

**Impact:** A reader can think all affected locations are listed, or search in vain for the remaining 25. It is unclear whether the count represents distinct pages or text regions.

**Correction:** Keep the section visible. State “Showing 12 of 37 text locations” and provide Show more / a bounded continuation for the remaining locations, retaining each Inspect action and original target identity. Label these as locations rather than distinct pages. Preserve full report data and resource limits; do not remove the total or hide the entire section in a disclosure.

**Source:** [Review.jsx](../src/review/Review.jsx), `targets.slice(0, 12)` in Page locations.

### 3. Grouped headings omit the visible method/evidence section

**Medium · Explicit visible method/evidence preference · Bounded grouping correction.**

**Trigger/evidence:** A synthetic mixed group containing one suspected mismatch and one unresolved comparison correctly showed distinct heading summaries and excerpts. However, `!finding.members` excludes Method and recorded evidence entirely for the group. `ScreeningInputs` shows the model and compared text, but no member source label or method receipt. String evidence is also omitted from this branch.

**Reference:** Grouping must retain member evidence/outcomes/provenance; method/evidence stays visible rather than disappearing through grouping.

**Impact:** The grouped review is easier to navigate, but less explicit about which method actually produced each answer. Future mixed-member or partial-inference cases could be misread as uniform AI execution.

**Correction:** Add a compact visible per-member method/source receipt alongside each heading's existing comparison, derived through `findingProvenance(member, report)`. Include useful recorded evidence without a second raw outcome/method paragraph. Share common model/excerpt-limit prose once only where all members have the same recorded receipt; keep exceptional member states individually visible. Preserve member IDs, outcomes, queries and reviewed annotations.

**Source:** [Review.jsx](../src/review/Review.jsx), grouped member branch and `!finding.members`; [provenance.js](../src/review/provenance.js).

### 4. Recovered text without located regions is not an explicit modal state

**Medium · Explicit reading-order clarity preference · Structural evidence-state correction.**

**Trigger/evidence:** Source inspection: `Preview` treats any nonblank `logicalBlocks` text as `hasReadingOrder`; the SVG renderer needs matching keyed `page.blocks` with quads. Recovered logical text can therefore exist while no numbers can be drawn, yet the modal still says numbers show the sequence. This state was not produced by the four public samples.

**Reference:** Distinguish absent sequence, recovered text without located regions and unavailable comparison diagram. Do not imply an overlay is working when no regions can be placed.

**Impact:** A blank overlay can look like a rendering failure or a clean result, reproducing the user's original confusion for a different evidence-availability case.

**Correction:** Derive a bounded placement receipt from the same joins used by the renderer: recovered text count, located entries and unlocated entries. If none are located, say above the image, “Reading-order text was recovered, but it could not be placed on this page,” and direct attention to the ordered text equivalent. For partial placement, state how many entries lack locations. Keep every recovered entry in that text list; never infer geometric order or invent rectangles. Preserve unsafe Form-XObject scope behavior and resource limits.

**Source:** [Preview.jsx](../src/evidence/Preview.jsx), [preview-session.js](../src/evidence/preview-session.js), `draw()` order branch.

### 5. Selected review task is not exposed independently of disclosure state

**Medium · Derived accessible-selection rule · Quick semantic correction.**

**Trigger/evidence:** Enter successfully collapses the selected row while leaving its analysis active. The summary then exposes the same native closed disclosure state as unselected rows; selection is represented by classes/background/inset border. There is no semantic current-item relationship to the analysis.

**Reference:** Selection and disclosure are independent; keyboard navigation and selection cues must be understandable without colour alone.

**Impact:** A screen-reader user can know a row is closed but not which task still controls the analysis, particularly after collapsing its short instructions.

**Correction:** Expose selected-task state with an appropriate current-item cue and a stable relationship to the analysis, independent of `open`. Preserve native summary Enter/Space behavior and existing arrow navigation. Verify how the resulting semantics are announced with a screen reader; do not replace native summaries with faux tabs or reintroduce previous/next buttons.

**Source:** [Review.jsx](../src/review/Review.jsx), review summary attributes; [style.css](../src/style.css), selected item styles.

### 6. Reading-order detail spends too much attention explaining a missing diagram

**Low · Derived density rule · Quick copy/layout correction.**

**Trigger/evidence:** Well-prepared sample: after the yellow summary, Reading-order evidence adds a bold availability statement, a paragraph on the conditions for a supported diagram, another paragraph explaining inspector numbers, and then the Inspect button. These are correct distinctions, but the internals precede the useful comparison action.

**Reference:** Lead with relevant evidence and next action; remove duplication while keeping essential evidence-availability distinctions visible.

**Impact:** Readers must understand the diagram detector before they can inspect the actual reading sequence.

**Correction:** Keep one concise visible receipt: “Tagged text was recovered. Inspect its reading sequence on the page; a comparison diagram is unavailable.” Place Inspect immediately after it. Retain the crucial statement that recovered order is not proof of intended order. Put the diagram's detector prerequisites in the existing secondary technical detail, rather than deleting truth/provenance limits or hiding method/evidence/locations.

**Source:** [OrderComparison.jsx](../src/review/OrderComparison.jsx), unavailable branch.

### 7. Setup describes default heading checks as something to enable

**Low · Explicit default-check preference · Quick copy correction.**

**Trigger/evidence:** First-use model setup's runtime/cost paragraph says “Tagged heading comparisons can be enabled in check settings.” These checks now default on for new preferences. Saved user choices still legitimately differ.

**Reference:** Default heading checks and truthful configuration; setup should describe the user's actual choice.

**Impact:** A person may assume heading checks are off and search for an unnecessary enabling step.

**Correction:** Say new defaults include heading comparisons and that check settings can change them, or describe the actual current check selection. Retain saved opt-outs. Consider using “No AI comparisons” without treating a privacy/download preference as a deficient fallback; that latter wording is an inferred opportunity, not a changed model policy.

**Source:** [Setup.jsx](../src/app/Setup.jsx), runtime-assets paragraph.

### 8. Detail footer repeats two safeguards for every task

**Low · Derived simplification rule · Quick placement correction.**

**Trigger/evidence:** Every individual/grouped analysis ends with both the no-auto-repair paragraph and “This records that you looked at the item…” The latter is detached from the Reviewed checkbox it explains.

**Reference:** Explain reviewed-not-fixed and re-export/recheck where needed; avoid repeated boilerplate.

**Impact:** This adds another two paragraphs to already long detail panes without clarifying the actual evidence or next step.

**Correction:** Put one persistent compact reviewed-not-fixed explanation near the review-list checkbox context, and keep repair/re-export guidance in How to address this or relevant repair states. Retain the distinction in exports/technical receipts where annotations need interpretation. Do not remove the safeguards everywhere or restore the removed reviewed-count instructions.

**Source:** [Review.jsx](../src/review/Review.jsx), two final `model-note` paragraphs inside each problem frame.

## Product decisions to resolve separately

These are not defects to fix during a copy/layout pass:

- The gate currently requires all title/subject/keyword values to be absent. Any one nonblank value ends it, including keywords alone. Whether a usable saved title should instead be required remains product policy. Do not quietly change the threshold or claim a PDF standard mandates all fields.
- “This PDF cannot be evaluated” is the requested headline. Supporting copy correctly frames a prerequisite to continuing this application; preserve that distinction because parsing and structural checks have already occurred.
- Heading grouping is explicit policy. Grouping repeated graphics or keywords might reduce long inboxes, but should follow a separate decision about whether the corrective action and evidence remain coherent. Do not merge unlike severities or lose member annotation/export provenance.

## Recommended sequence

First address location truncation, stale setup text and semantic selected-task state. Then simplify the identity comparison and reading-order availability language. Treat grouped member provenance and placement receipts as bounded evidence/state work with meaningful contract tests and browser checks. Consolidate repeated footer safeguards after their replacement context is concrete.

For any implementation, verify all four samples again, add source-backed fixtures for mixed heading provenance and recovered-but-unlocated sequences, check desktop/mobile/keyboard and the repository-prefixed URL, and exercise real runtime failure/cancellation through controlled local network conditions without downloading real models. Keep structural acceptance, original reports, explicit download consent and resource disposal unchanged.


## Implemented follow-up

The findings above record the initial audit, before these local corrections:

- Saved title/author values lead identity comparisons; equal values are combined without losing their Info/XMP sources or language variants.
- Location lists report their visible/total count and offer successive batches until every target is accessible.
- Grouped headings retain each member’s method, outcome and evidence; a shared recorded model is shown only when every member actually used it.
- Reading-order placement counts use the same geometry joins as the overlay. Missing, unlocated and partially located sequences have separate receipts without invented page positions.
- Selected summaries expose aria-current and their status; collapsing preserves selection. Keyboard navigation and modal focus return remain supported.
- The reading-order inspector action precedes optional detector detail.
- Setup text reflects the enabled-by-default heading comparison.
- Reviewed-not-fixed guidance appears beside the review list; repair/re-export guidance remains visible under How to address this.

Later explicit preferences also added Critical / Warning / Needs manual check sorting and badges, corresponding red/yellow/blue detail notices, removed advisory settings controls and the header recheck button, and made the technical analysis record a normal visible section. The earlier yellow-only summary and collapsed technical-record descriptions are historical, superseded by these preferences.

Validation: 240 tests across 31 files and the production build pass. Actual browser checks verified desktop/mobile layout, all three priority notice variants, the repository-prefixed production URL, keyboard selection/collapse and the absence of removed controls. Geometry/provenance edge cases are covered by contract tests; this follow-up does not claim new real model inference or screen-reader testing. Structural acceptance and report/export source data remain unchanged.
