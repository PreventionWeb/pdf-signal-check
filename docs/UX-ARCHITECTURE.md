# UX and information architecture reference

This document guides implementation and review of PDF Signal Check for people with limited technical proficiency. Its central contract is: **tell the person what the result means for their document, show the relevant evidence, and make the next useful action clear.** Internal check names and the analysis record serve that experience; they do not define its navigation.

Use this reference alongside [module ownership](ARCHITECTURE.md), [Mangrove integration](MANGROVE.md), [profile scope](PROFILE.md), and [evaluation limits](EVALUATION.md). [UX refinement](UX-REFINEMENT.md) records historical changes and verification; this document defines the continuing design rules. It is a reference architecture, not a claim that every current surface complies. The [application review](UX-ARCHITECTURE-REVIEW.md) records an independent assessment against this reference.

## Authority and interpretation

**Explicit preferences** below come from the user's guidance in this project. **Derived rules** translate that guidance into repeatable implementation decisions; they are recommendations to assess, not additional user mandates.

| Explicit preference | Derived implementation rule |
| --- | --- |
| Results should make sense to people with limited technical proficiency. | Describe the affected part of this PDF and its practical consequence before terminology, method or score. |
| The result should be the headline; the filename stays small. | Use one outcome H1. Remove generic “Your PDF results” and introductory instructions that repeat the interface. |
| Use an email-style inbox: actions on the left, analysis on the right. | Navigate by tasks a person can perform, rather than one row per detector output. Maintain a stable selected task. |
| Heading checks should be a general class of things to review. | Group heading/text pairs in one task, retaining each heading, comparison and underlying outcome inside the analysis. |
| Reviewed should be a checkbox in the left column; remove previous/next and count instructions. | Selection and annotation are independent controls. **Reviewed means looked at, not fixed or passed.** |
| Lead the analysis with a status-matched notice; explain saved properties plainly. | State the actual affected value or its absence. Explain uncertainty without presenting it as a confirmed error. |
| Hide other analysis while AI runs; show progress details as small text. | Present one stable waiting surface with actual progress and cancellation, retaining results behind it. |
| Missing document information should produce a repair-first stop screen. | Use a presentation gate, not an invented engine outcome; provide repair guidance and updated-file intake without a distracting checklist. |
| Inspect should open a modal without scrolling the results. | Keep review position mounted; manage focus, scroll locking and preview resource disposal explicitly. |
| Reading order must be visible or clearly unavailable; default zoom is the smaller of 100% and fit width. | Select the relevant overlay initially. State missing recovered sequence before the page image, not only below it. |
| Omit zero page locations and irrelevant preview prose. | Absent optional evidence is omitted. Evidence absence essential to understanding the finding gets a short, explicit explanation. |
| Keep correction guidance, method/evidence, why-it-matters and page locations out of details elements. Use accordions for review navigation; show the technical record directly. | Progressive disclosure is selective: correction guidance and essential evidence remain visible; optional technical inventories can collapse. |
| Remove the custom gray body background; use Mangrove patterns. | Use the pinned theme and documented native adaptations, with custom layout only for application-specific needs. |

## Workflow and information hierarchy

Choose the workflow state before rendering content. A later section must not compete with the current decision.

| State | Primary information and action | Secondary information | Suppress or omit |
| --- | --- | --- | --- |
| Intake | “Check a PDF”; Mangrove tabs for Your PDF / Try a sample; upload or sample selection. Sample choices use horizontal button-and-description rows. | Local processing/capabilities explanation; Settings and Check several PDFs as separate actions. | Technical results, parser vocabulary and startup model downloads. |
| First-use setup | Model/no-AI choice, explicit download consent and clear continuation. | Supported languages, asset costs, device benchmark and its limitations. | PDF processing before setup completion; fake speed or cache certainty. |
| Structural analysis | A checking heading and observed page progress. | Relevant preparation status and cancellation/recovery. | Provisional final results competing with ongoing work. |
| AI analysis | “Checking your PDF”; a stable progress notice, plain stage text, visible small progress detail and Cancel AI checks. | Short explanation that cancellation retains completed checks. | Inbox, headline verdict, exports and technical record while processing is active. |
| Repair-first gate | “This PDF needs basic fixes first”; critical missing-information notice, practical repair instructions and Choose an updated PDF. | Official Word, Acrobat and InDesign guidance. | Checklist, other findings, technical record, exports and useless repeat-analysis actions. |
| Completed review | Small filename; outcome H1; Choose another PDF beside the headline on desktop; review task list and selected analysis. | Specific scope caveat, limitations, explanations and report downloads. | Redundant overview paragraphs, separate full-findings browser, successful checks competing with actions. |
| AI failure, cancellation or no usable comparisons | Plain recovery notice identifying what stopped and what remains available. A useful retry or corrective action. | Technical error reference and settings. | Indefinite preparation state; raw exception as the only explanation; retry for identical known unusable inputs. |

Successful checks remain represented in reports and the secondary technical record. Removing a full-findings browser must not remove report data. “No problems detected” describes completed detection, not certification that the PDF is accessible, factually accurate or suitable for every AI system. Scope limitations must remain understandable even in this state.

### Repair gate policy

The current `needsDocumentInformation(report)` gate applies to a **completed analysis with no nonblank saved Info/XMP title, subject or keywords**. It applies in the no-AI workflow too. It hides presentation, while the original report and structural acceptance remain intact. A subsequent analysis with any of these values present ends this specific gate; remaining defects still require review.

This is a product prerequisite requested for the missing-information case. It does **not** establish that all three fields are mandatory under a PDF standard, that every PDF lacking them is unreadable, or that AI cannot compare tagged section text without them. Keep “cannot be evaluated” tied to continuing this application's evaluation, rather than a universal statement about the file.

The separate `hasUnchangedNoInputs` guard concerns a recorded AI attempt with the same pinned model, selected checks and language. It prevents a pointless repeat attempt; it must not become a structural failure or silently change the selected model.

## Review workspace

On desktop, use approximately one third of the workspace for the task list and two thirds for analysis, with independently scrollable panes. The first useful task opens automatically. Selecting another task resets its analysis scroll, preserves list position and clears unrelated preview selection. Ordinary rerenders preserve selection, explicit disclosure choices and reviewed markers. Reset source-specific state when source identity changes.

Task labels describe actions: “Check the reading order”, “Check the PDF’s saved description”, or “Check that headings describe their sections”. A task may contain several findings, but grouping must preserve member evidence, outcomes and provenance. A grouped checkbox marks its original members reviewed together; do not overwrite their check results or falsely merge unlike severities. Grouping repeated headings is explicit policy; extending grouping to images, keywords or other findings requires assessing whether the same corrective action and evidence presentation remain clear.

Use the Mangrove flush accordion for review rows. Each summary can open **and close**. Collapsing the selected row's short guidance need not clear its analysis. Keep Reviewed outside the collapsing body and independently operable. Keyboard navigation and the selection cue must work without colour alone. Do not recreate previous/next controls or progress-count prose merely to explain a list people can already use.

On mobile, stack the list above analysis, bound list scrolling, let analysis use document scrolling, and provide a reachable return to the list. Header actions wrap without obscuring the outcome. Long filenames, saved values and quoted excerpts wrap; tables and PDF geometry may scroll locally without widening the page.

### Selected analysis hierarchy

1. **Plain warning:** one notice matching the task’s status (red for Critical, yellow for Warning, blue for Needs manual check), stating what was found, what part/value is involved, and whether it is a confirmed problem, a possible mismatch or an unresolved comparison. Preserve a semantic heading for focus and assistive technology even when a duplicate visible task title is omitted.
2. **Relevant comparison/evidence:** saved values beside the publication evidence; heading and checked excerpts for a grouped heading task; a located crop or reading-order illustration when meaningful. A visible title and a saved title are different facts.
3. **How to address this:** a normal small heading with visible correction guidance. Secondary placement does not mean collapsed content; repair instructions on a blocked screen also remain visible.
4. **Method and recorded evidence:** visible small heading, source label, useful recorded evidence and bounded AI comparison inputs. Do not repeat the same outcome/method in a second raw paragraph.
5. **Why this matters:** visible small heading and a practical explanation, without a nested disclosure.
6. **Page locations:** visible only when locations exist, with clear Inspect actions. Do not show a heading or “no trustworthy location” paragraph for zero locations.

Avoid repeated boilerplate under each section. Explain reviewed-not-fixed, lack of automatic repair and re-export/recheck where the person needs the distinction; repetition is not a substitute for a clear action. This is a derived simplification rule, not authorization to remove these safeguards everywhere.

### Copy rules

- Describe the document, not just the detector: “The PDF has no machine-readable structure labels…” is more useful than “No structure tree found.” Explain that a visible table of contents does not supply those labels.
- Introduce a saved property through its value and location: “The description saved in this PDF’s document properties is ‘…’.” Mention the editable **Subject** field when explaining how to fix it. Do not assume the user knows “saved subject”, Info, XMP, tag tree or relatedness.
- Display the actual keyword/title/description being questioned. AI compares bounded excerpts and meaning; low similarity does not establish that a keyword never appears anywhere in the document. Say what was checked and what the person should compare.
- Preserve epistemic distinctions: missing property, suspected mismatch, uncertain comparison, check not run, and tool limitation are different states. Avoid “fail” as the only user explanation.
- Use a brief summary followed by evidence or an action; remove introductory sentences that only say to review the items below. Put genuinely parallel limitations in bullets.
- Bound very long quotations honestly (“starts with…”); keep the full recorded value available in technical evidence or JSON. Never make a truncated value look complete.

## Inspection and evidence

`Crop` is optional contextual evidence. Render it only when reliable geometry is available and relevant to the selected task; otherwise render nothing. Do not display the removed “No trustworthy source region is available for a crop…” placeholder. A missing structure tree has no page rectangle to invent.

`PreviewDialog` provides full-page inspection while keeping the results in place. Open a native modal, focus its heading, trap interaction through native dialog semantics, lock background scrolling, support Escape and visible Close, restore focus to the trigger without scrolling, and dispose the preview session on close/unmount. Modal opening must not scroll the review page or select a different source.

For reading-order inspection:

- Open with the recovered tag-tree reading-order overlay, not a generic page viewer.
- Number regions from the actual recovered sequence. Provide an ordered text equivalent; do not infer a sequence from geometric position and call it the PDF's declared order.
- Distinguish no recovered tagged text, recovered text without located regions, and absence of a supported comparison diagram. None proves the intended order is correct.
- When no sequence is recovered on the selected page, place a short warning above the image. The image alone can otherwise falsely suggest that the overlay is working.
- Explain gaps or approximate bounds when present; retain unlocated text in the text equivalent. Page drawing order is a separate recovered sequence, not a certified intended order.
- Default scale is `min(100%, fit width)`; explicit zoom remains available. Preserve source transforms and cancellation/resource limits.

The person sees the original local PDF, not a repaired version. Preview selection, overlays and annotations cannot change engine outcomes or exported provenance.

## Progress and recovery

Progress must answer “what is happening?” and “what can I do if it stops?” Use actual completed/total units when known and an indeterminate indicator otherwise. Do not imply model preparation is measured download progress. Show small stage detail directly; avoid a Progress details accordion.

Keep the completed result subtree retained but hidden/inert during AI work so brief checks do not expose shifting provisional screens or discard review state. After success, cancellation or failure, restore the same source and useful review context. Cancellation and stale callbacks must settle cleanly; an older attempt cannot update a newer source.

Network recovery belongs to the runtime/controller, not a cosmetic UI timer. The current asset fetch wrapper fails after **30 seconds without received data**, for both response headers and streamed bodies; progressing downloads reset that timer. Present a connection/download explanation, an explicit retry after failure, and the fact that the PDF stayed on the device. Keep the technical code secondary. Never silently choose another model or claim total completion while loading stalled assets. An identical recorded no-input attempt needs changed input/settings, not another retry button.

## Component responsibilities

| Owner | UX responsibility | Must not own or change |
| --- | --- | --- |
| `App`, `ReviewLoader`, app controller | Workflow state, filename/shell, setup/language decisions, retained report, lazy-interface recovery and stable cursor. | Structural rules or preview geometry. |
| `workspace.js`, `findings.js`, `provenance.js` | Presentation summaries, plain tasks, grouping and accurate source attribution. | Raw outcomes, profile acceptance or claims of unrecorded inference. |
| `Review`, comparison components, `MetadataGuidance` | Inbox, warning/evidence hierarchy, repair help, visible locations and session annotations. | Workers, asset downloads or alteration of report data. |
| `Checks` with runtime/controller | Progress, eligible actions, recovery explanation, visible download consent/cost context. | New structural failure outcomes or implicit consent. |
| `PreviewDialog`, `Preview`, `PreviewSession`, `Crop` | Modal lifecycle, original-page rendering, actual overlays, bounded crops and unavailable evidence. | Repairs, semantic interpretation of pixels or inferred intended order. |
| `AdvancedReport`, export components | Secondary technical inventory and captured records, including successful checks. | A changing live snapshot relabelled as a fixed export. |
| `src/ui`, brand configuration | Mangrove components/adaptations, tokens, semantic font roles and local assets. | Analysis policy, source ownership or model substitution. |

Use published Mangrove 2.0 React components where their APIs fit. Use documented native buttons, `details/summary`, dialogs and tabs when package string/link APIs cannot own interactive application content. The technical analysis record and its finding collections use `mg-accordion`; review navigation uses `mg-accordion--flush`. React owns state; no external initializer or DOM observer may acquire parallel ownership. Use correctly wrapped sRGB tokens and bundled fonts/assets. A custom gray body background is not part of the requested presentation.

## Non-negotiable boundaries

PDF bytes, text, model inputs and results remain on the device. Model/tokenizer assets download only with explicit consent; opening help, a preview, a disclosure or a saved configuration must not start downloads. Costs, supported languages and limitations remain available and visible at the decision to run. External authoring-tool guidance links carry no PDF contents.

Deterministic acceptance is independent of AI advisories, UI grouping and reviewed markers. An AI execution label requires recorded execution, not model selection. Retain source identity, attempt epochs, cancellation, stale-callback rejection and worker/document/canvas disposal. Exports capture a fixed source/report snapshot; simplifying the screen must not silently discard underlying evidence.

## Open decisions and tradeoffs

- **Gate scope:** the current all-metadata-absent gate is deliberately narrower than “every title defect” and independent of AI eligibility. Adding only keywords currently unblocks it. Whether a usable saved title should instead be required is unresolved product policy; do not change the threshold during a copy/layout audit.
- **Gate wording:** “cannot be evaluated” is the requested stop headline, but parsing has already occurred and some checks may be possible. Supporting copy must make the application's repair prerequisite clear without asserting a universal PDF requirement.
- **Disclosure exceptions:** “secondary information” is not permission to collapse everything. Correction guidance, method/evidence, why-it-matters, populated locations, limitation bullets and progress detail remain visible by explicit preference. The technical record remains visible; “How to address this” must not use a details element. Assess density by removing duplication, not by hiding the requested evidence.
- **Task grouping:** headings are explicitly grouped. Other repeated findings may benefit from grouping, but an audit should recommend the grouping boundary and preserve member contracts before changing it.
- **Review priority:** sort required defects first (Critical), then advisory concerns (Warning), then uncertainty (Needs manual check). Grouped tasks use the highest urgency of their members. Match the detail notice to the row badge, preserve confirmed versus suspected versus unresolved wording, and never communicate status by colour alone. This UI priority does not change engine outcomes or acceptance.

## Lightweight implementation review

For each changed surface, answer these questions using an actual document/state rather than labels alone:

1. Can a nontechnical person identify the outcome, affected document value and next action without opening technical details?
2. Does the visible warning accurately distinguish a defect, uncertainty, unavailable check and scope limit?
3. Does each task represent a useful action, with grouped members and reviewed-not-fixed semantics preserved?
4. Is evidence relevant and source-correct, with empty optional sections omitted and essential unavailable states explicit?
5. Can the person collapse disclosures, use the keyboard, open/close inspection and return to the same review position?
6. During processing and a stalled/failed download, is there one understandable state, a useful exit/recovery action and no stale updates?
7. Does the mobile layout remain readable without page overflow, while desktop panes and modal scrolling behave independently?
8. Are privacy, explicit downloads, profile/AI separation and fixed export snapshots unchanged?

Use the four public samples for well-prepared, partial, poor and missing-information states; also exercise absent reading-order evidence, meaningful located evidence, grouped headings and AI error/cancel recovery. Run appropriate contract tests and the build for behavioral changes. Verify UI changes in a real browser on desktop/mobile and a repository-prefixed URL when relevant. Render and inspect downloaded PDF pages if export layout changes. Record limitations and delivered-versus-planned status; this rubric is not accessibility or PDF certification.

Advisory coverage information contains no model selectors, checkboxes or rerun/default-setting actions. Configure checks in the dedicated setup flow. The results headline has Choose another PDF; it has no Recheck this PDF action. Explicit failure recovery remains available when useful.

“How this PDF was checked” and “AI coverage” use visible headings and bullet lists, without details boxes.

The results outcome uses a contained Mangrove split hero with a large required-check percentage and an explicit passed/applicable count. Exclude not-applicable and optional checks, retain unresolved checks in the denominator, and omit the score when analysis is incomplete or there are no applicable required checks. The percentage is presentation-only, rounded down; AI findings and Reviewed annotations cannot change it. It is not a letter grade, accessibility rating or certificate. The Select PDF / Results step navigation is removed; use Choose another PDF and the product home link for navigation.

Use “No problems auto-detected” for the no-detected-problem headline. Add a + to the check percentage only when applicable required checks remain unresolved and none failed. Explain that the + denotes checks that could not be confirmed; a fully confirmed score or any required failure keeps a plain percentage. The number remains the confirmed pass count, not a guarantee or an estimated final grade.

An unrecovered machine-readable reading sequence in a completed analysis is a Critical review priority, with a red detail notice. Recovered sequences whose correctness remains uncertain stay manual checks. This explicit presentation policy preserves the underlying uncertain detector outcome and does not infer a missing sequence merely from an incomplete analysis.

The filename and file size sit beneath the result headline inside the hero. PDF/JSON downloads are secondary hero actions with the captured-report/source ownership retained. If Critical review items exist, show their count instead of a large percentage. Offer no reading-order inspector when no sequence was recovered. The metadata gate explains that missing basic document information must be corrected before detailed analysis, rather than saying the PDF cannot be evaluated.

Figure review starts with the numbered image/page, a located crop and its exact saved alt text or explicit missing-description message, before repair guidance. When geometry cannot isolate the figure, show labelled full-page context without fabricated highlights. Keep Inspect beside the preview/description and center a located region inside the modal. The processing-time PDF viewer is removed; the sample preview remains.

The pinned Mangrove MegaMenu contains the project wordmark/tagline and core local actions: Upload a PDF, Try a sample, Settings, Check several PDFs, About this tool and AI, and What this tool checks. Existing controller flows and the About modal remain owners; navigation does not start inference or authorize downloads. Mobile menu closes before opening another dialog and restores focus to a visible trigger. The tagline expresses assistance, not a promise to prevent hallucinations.
