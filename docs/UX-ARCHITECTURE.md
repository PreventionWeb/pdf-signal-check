# UX and information architecture reference

This document guides implementation and review of PDF Signal Check for people with limited technical proficiency. Its central contract is: **tell the person what the result means for their document, show the relevant evidence, and make the next useful action clear.** Internal check names and the analysis record serve that experience; they do not define its navigation.

Use this reference alongside [module ownership](ARCHITECTURE.md), [Mangrove integration](MANGROVE.md), [profile scope](PROFILE.md), and [evaluation limits](EVALUATION.md). This document defines the continuing design rules; [VALIDATION.md](VALIDATION.md) records how changes were verified. It is a reference architecture, not a claim that every current surface complies.

## Authority and interpretation

**Explicit preferences** below come from the user's guidance in this project. **Derived rules** translate that guidance into repeatable implementation decisions; they are recommendations to assess, not additional user mandates.

| Explicit preference | Derived implementation rule |
| --- | --- |
| Results should make sense to people with limited technical proficiency. | Describe the affected part of this PDF and its practical consequence before terminology, method or score. |
| The result should be the headline; the filename stays small. | Use one outcome H1. Remove generic “Your PDF results” and introductory instructions that repeat the interface. |
| The person’s job is to open a PDF, see what is broken and hand a fix list back to the designer (2026-10 direction). | The default screen is a fix list, not a list of checks. A row is a change someone can make. Everything about the tool’s own method is reachable but not shown by default. |
| Heading checks should be a general class of things to review. | Group heading/text pairs in one task, retaining each heading, comparison and underlying outcome inside the analysis. |
| Remove the Reviewed checkbox (2026-10). | No session annotations on review items. Selection is the only per-item state. |
| Lead the analysis with a status-matched notice; explain saved properties plainly. | State the actual affected value or its absence. Explain uncertainty without presenting it as a confirmed error. |
| Hide other analysis while AI runs; show progress details as small text. | Present one stable waiting surface with actual progress and cancellation, retaining results behind it. |
| Missing document information should produce a repair-first stop screen. | Use a presentation gate, not an invented engine outcome; provide repair guidance and updated-file intake without a distracting checklist. |
| Inspect should open a modal without scrolling the results. | Keep review position mounted; manage focus, scroll locking and preview resource disposal explicitly. |
| Reading order must be visible or clearly unavailable; default zoom is the smaller of 100% and fit width. | Select the relevant overlay initially. State missing recovered sequence before the page image, not only below it. |
| Omit zero page locations and irrelevant preview prose. | Absent optional evidence is omitted. Evidence absence essential to understanding the finding gets a short, explicit explanation. |
| Technical detail must stay available but must not be put in front of a semi-technical user (2026-10; supersedes the earlier “keep method, why and locations out of details elements” preference). | Three tiers: card → plain detail (summary, evidence picture, one “What to change” line, Show on page) → Technical evidence drawer (detailed steps, method/source, AI inputs, recovered sequences, page locations). “Why this matters” is a disclosure in the detail. The full technical record lives in a Technical details tab. |
| Remove the custom gray body background; use Mangrove patterns. | Use the pinned theme and documented native adaptations, with custom layout only for application-specific needs. |

## Workflow and information hierarchy

Choose the workflow state before rendering content. A later section must not compete with the current decision.

| State | Primary information and action | Secondary information | Suppress or omit |
| --- | --- | --- | --- |
| Intake | A full-bleed Mangrove split hero (no `--contained`; a nested `mg-container--slim` aligns its copy with the page; `html { overflow-x: clip }` absorbs the 100vw escape) that says what the tool is for and why it matters (the H1), with three value points: problems shown on the pages, a fix list for the designer, private by design. Then a “Check your own PDF” upload card in the same book-card shape (illustration, dashed drop border, primary Choose a PDF button; the whole card accepts a dropped file), followed by “Or try a sample report”: native Mangrove horizontal book cards with original SVG covers, where the whole card starts the check (the title is a stretched button). | Local processing/capabilities explanation; Settings and Check several PDFs as separate actions. | Technical results, parser vocabulary and startup model downloads. |
| About (`#about`) | “Making PDFs work for people and AI”: the narrative from the UNDRR–OCHA guidance, the GAR2025 two-readings example, the five-step production flow with what this tool checks at each step, where the tool fits, origins and privacy. Reached from the navigation and the landing hero’s “Why this matters”; the app stays mounted underneath. | Link to the AI and privacy notice. | Personal contact details from the source guidance. |
| Story (`story.html`, standalone while refined) | “Your report says it. Does everyone understand it?”: seven viewer-paced scenes following one finding (“South is highest”) through a PDF’s hidden layers to a person reading, a person using a screen reader and an AI assistant. Opens paused; Play/Pause, Previous/Next, scene slider, arrow keys, `?scene=n`. Reduced motion shows each scene’s final frame. Captions are HTML and announced on scene change, with a full transcript. Stage text comes from `src/story/snapshot.json`, real engine output on the synthetic samples, guarded by a drift test. The two assistant answers in scene 5 are labelled illustrations. | Synthetic-example note and a link to About for the guidance behind it. | Real-publication claims; credibility rests on the About page and the source guidance. |
| First-use setup | Model/no-AI choice, explicit download consent and clear continuation. | Supported languages, asset costs, device benchmark and its limitations. | PDF processing before setup completion; fake speed or cache certainty. |
| Structural analysis | A checking heading and observed page progress. | Relevant preparation status and cancellation/recovery. | Provisional final results competing with ongoing work. |
| AI analysis | “Checking your PDF”; a stable progress notice, plain stage text, visible small progress detail and Cancel AI checks. | Short explanation that cancellation retains completed checks. | Fix list, headline, exports and technical record while processing is active. |
| Repair-first gate | “This PDF needs basic fixes first”; critical missing-information notice, practical repair instructions and Choose an updated PDF. | Official Word, Acrobat and InDesign guidance. | Checklist, other findings, technical record, exports and useless repeat-analysis actions. |
| Completed review | Small filename; outcome H1; Choose another PDF beside the headline on desktop; review task list and selected analysis. | Specific scope caveat, limitations, explanations and report downloads. | Redundant overview paragraphs, separate full-findings browser, successful checks competing with actions. |
| AI failure, cancellation or no usable comparisons | Plain recovery notice identifying what stopped and what remains available. A useful retry or corrective action. | Technical error reference and settings. | Indefinite preparation state; raw exception as the only explanation; retry for identical known unusable inputs. |

Successful checks remain represented in reports and the secondary technical record. Removing a full-findings browser must not remove report data. “No problems detected” describes completed detection, not certification that the PDF is accessible, factually accurate or suitable for every AI system. Scope limitations must remain understandable even in this state.

### Repair gate policy

The current `needsDocumentInformation(report)` gate applies to a **completed analysis with no nonblank saved Info/XMP title, subject or keywords**. It applies in the no-AI workflow too. It hides presentation, while the original report and structural acceptance remain intact. A subsequent analysis with any of these values present ends this specific gate; remaining defects still require review.

This is a product prerequisite requested for the missing-information case. It does **not** establish that all three fields are mandatory under a PDF standard, that every PDF lacking them is unreadable, or that AI cannot compare tagged section text without them. Keep “cannot be evaluated” tied to continuing this application's evaluation, rather than a universal statement about the file.

The separate `hasUnchangedNoInputs` guard concerns a recorded AI attempt with the same pinned model, selected checks and language. It prevents a pointless repeat attempt; it must not become a structural failure or silently change the selected model.

## Review workspace

The results screen has two tabs: **What to fix** (the pages view) and **Technical details**. A separate list view was removed in 2026-10: the grouped legend is the list, and it shares the item detail, so a second layout added a choice without adding function.

**What to fix** places the fix list on the PDF. A sticky side panel holds a grouped legend (Fix / Check with numbered pins, Couldn’t check collapsed with no pins) above the selected item’s full detail, the same detail the list view shows. The pages column starts with a **Document properties** tile: the saved values, with pins beside related rows and an explanation when the description repeats the title. A **Whole document** sheet follows for issues with no reliable position. Then come the pages that have issues, each with numbered pins and dashed boxes and a Show larger action that opens the zoomable preview. A Mangrove switch overlays the recovered reading order and adds every page that has one. Pages render lazily, 20 at a time. Show the whole PDF opens the preview for pages without issues. Pins are buttons, and the legend is the complete text equivalent. Numbers match the PDF download. Entries without a trustworthy position are never given an invented pin.

### Buckets

Items are grouped into three buckets, decided by recorded category and review priority (`fixBucket` in `src/review/workspace.js`), never by a confidence score:

- **Fix** — confirmed defects: required-check failures, missing descriptions on labelled images, and an unrecovered reading sequence.
- **Check** — suspected problems (advisory concerns such as a title or author mismatch, or an out-of-order sequence) and human-judgement tasks (image descriptions, unlabelled or decorative graphics, attachments). Reading order always appears here when a sequence exists, because the tool can never confirm intended order.
- **Couldn’t check** — collapsed by default. Undecided results (`uncertain`, `required-indeterminate`), AI results the model could not judge, and tool limits. These are never shown as tasks to fix. The intro says they are limits of the tool, not problems found in the PDF.

The verb carries the certainty: Add / Set / Export for confirmed defects, “doesn’t match” or “may” for suspected ones, and “could not judge” for undecided ones. Do not flatten confirmed, suspected and undecided into one status.

Grouping preserves member evidence, outcomes and provenance. Images group by corrective action. Headings split into suspected mismatches (Check) and pairs the AI could not judge (Couldn’t check).

### Item detail

1. **Eyebrow and title:** the bucket and where to look (“Page 2”, “Pages 1, 2”, “Document properties”, “Whole document”), then a card title that names the change or the problem in plain words.
2. **Plain notice:** one sentence that states the actual values where possible, such as “The title saved in the PDF is ‘…2024’, but the first page shows ‘…2025’.”
3. **Evidence picture:** crop, saved value beside page text, or the reading-order comparison. Omit it when no reliable geometry exists.
4. **What to change:** one sentence in authoring-tool terms. For undecided items, label it “To check it yourself”.
5. **Actions:** Show on page (when located) and Technical evidence.
6. **Why this matters:** a closed disclosure.

The Technical evidence drawer is a native modal dialog docked to the side. It holds detailed steps, method and source labels, AI inputs and truncation receipts, recovered order sequences and page locations. Say “this tool doesn’t change your PDF” once under the list, not in every item.

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
| `Review`, `EvidenceDrawer`, comparison components, `MetadataGuidance` | Fix list, item detail, evidence drawer, Technical details tab and repair help. | Workers, asset downloads or alteration of report data. |
| `Checks` with runtime/controller | Progress, eligible actions, recovery explanation, visible download consent/cost context. | New structural failure outcomes or implicit consent. |
| `PreviewDialog`, `Preview`, `PreviewSession`, `Crop` | Modal lifecycle, original-page rendering, actual overlays, bounded crops and unavailable evidence. | Repairs, semantic interpretation of pixels or inferred intended order. |
| `AdvancedReport`, export components | Secondary technical inventory and captured records, including successful checks. | A changing live snapshot relabelled as a fixed export. |
| `src/ui`, brand configuration | Mangrove components/adaptations, tokens, semantic font roles and local assets. | Analysis policy, source ownership or model substitution. |

Use published Mangrove 2.0 React components where their APIs fit. Use documented native buttons, `details/summary`, dialogs and tabs when package string/link APIs cannot own interactive application content. The technical analysis record and its finding collections use `mg-accordion`; the fix list uses native buttons inside bucket sections, with Couldn’t check as a native `details`. React owns state; no external initializer or DOM observer may acquire parallel ownership. Use correctly wrapped sRGB tokens and bundled fonts/assets. A custom gray body background is not part of the requested presentation.

## Non-negotiable boundaries

PDF bytes, text, model inputs and results remain on the device. Model/tokenizer assets download only with explicit consent; opening help, a preview, a disclosure or a saved configuration must not start downloads. Costs, supported languages and limitations remain available and visible at the decision to run. External authoring-tool guidance links carry no PDF contents.

Deterministic acceptance is independent of AI advisories and UI grouping. An AI execution label requires recorded execution, not model selection. Retain source identity, attempt epochs, cancellation, stale-callback rejection and worker/document/canvas disposal. Exports capture a fixed source/report snapshot; simplifying the screen must not silently discard underlying evidence.

## Open decisions and tradeoffs

- **Gate scope:** the current all-metadata-absent gate is deliberately narrower than “every title defect” and independent of AI eligibility. Adding only keywords currently unblocks it. Whether a usable saved title should instead be required is unresolved product policy; do not change the threshold during a copy/layout audit.
- **Gate wording:** “cannot be evaluated” is the requested stop headline, but parsing has already occurred and some checks may be possible. Supporting copy must make the application's repair prerequisite clear without asserting a universal PDF requirement.
- **Disclosure:** correction guidance stays visible as one “What to change” line; full steps, method, AI inputs and locations sit one click away in the drawer. Repair instructions on the blocking metadata screen stay visible.
- **Task grouping:** headings are explicitly grouped. Other repeated findings may benefit from grouping, but an audit should recommend the grouping boundary and preserve member contracts before changing it.
- **Review priority:** Fix, then Check, then Couldn’t check; within a bucket, Critical before Warning before manual. Grouped tasks use the highest urgency of their members. This presentation does not change engine outcomes or acceptance.

## Lightweight implementation review

For each changed surface, answer these questions using an actual document/state rather than labels alone:

1. Can a nontechnical person identify the outcome, affected document value and next action without opening technical details?
2. Does the visible warning accurately distinguish a defect, uncertainty, unavailable check and scope limit?
3. Does each Fix or Check item represent a change someone can make, with grouped members preserved and undecided results kept out of Fix and Check?
4. Is evidence relevant and source-correct, with empty optional sections omitted and essential unavailable states explicit?
5. Can the person collapse disclosures, use the keyboard, open/close inspection and return to the same review position?
6. During processing and a stalled/failed download, is there one understandable state, a useful exit/recovery action and no stale updates?
7. Does the mobile layout remain readable without page overflow, while desktop panes and modal scrolling behave independently?
8. Are privacy, explicit downloads, profile/AI separation and fixed export snapshots unchanged?

Use the four public samples for well-prepared, partial, poor and missing-information states; also exercise absent reading-order evidence, meaningful located evidence, grouped headings and AI error/cancel recovery. Run appropriate contract tests and the build for behavioral changes. Verify UI changes in a real browser on desktop/mobile and a repository-prefixed URL when relevant. Render and inspect downloaded PDF pages if export layout changes. Record limitations and delivered-versus-planned status; this rubric is not accessibility or PDF certification.

Advisory coverage information contains no model selectors, checkboxes or rerun/default-setting actions. Configure checks in the dedicated setup flow. The results headline has Choose another PDF; it has no Recheck this PDF action. Explicit failure recovery remains available when useful.

“How this PDF was checked”, “AI coverage”, “What this tool cannot check” and the technical analysis record live in the Technical details tab.

The results hero is a contained Mangrove hero with a count headline (“2 things to fix, 3 to check”; “Nothing confirmed to fix, 2 things to check”), the filename, at most one scope sentence and the report downloads. Choosing another PDF uses the site navigation. The required-check percentage is removed from the hero (2026-10); pass counts remain in the Technical details record. The Select PDF / Results step navigation is removed.

Use “No problems auto-detected” only when nothing is in Fix or Check and no required check failed.

An unrecovered machine-readable reading sequence in a completed analysis is a Critical review priority, with a red detail notice. Recovered sequences whose correctness remains uncertain stay manual checks. This explicit presentation policy preserves the underlying uncertain detector outcome and does not infer a missing sequence merely from an incomplete analysis.

The filename and file size sit beneath the result headline inside the hero. PDF/JSON downloads are secondary hero actions with the captured-report/source ownership retained. Offer no reading-order inspector when no sequence was recovered. The metadata gate stays (2026-10 decision) and explains that missing basic document information must be corrected before detailed analysis, rather than saying the PDF cannot be evaluated.

Figure review starts with the numbered image/page, a located crop and its exact saved alt text or explicit missing-description message, before repair guidance. When geometry cannot isolate the figure, show labelled full-page context without fabricated highlights. Keep Inspect beside the preview/description and center a located region inside the modal. The processing-time PDF viewer and the sample preview are removed.

Group image review by corrective action: missing descriptions have Critical review priority; saved descriptions, unlabelled graphics and graphics declared decorative require manual review. Keep source outcomes independent of this priority. A description-presence success still needs human review of its quality. Render one member at a time with previous/next and a selector. Decorative content remains excluded from machine-readable coverage but has a separate review inventory, with safely located regions outlined in full-page context. Counts for unlabelled and decorative graphics represent pages, not inferred distinct images.

The pinned Mangrove MegaMenu contains the project wordmark/tagline and core local actions: Upload a PDF, Try a sample, Settings, Check several PDFs, About this tool and AI, and What this tool checks. Existing controller flows and the About modal remain owners; navigation does not start inference or authorize downloads. Mobile menu closes before opening another dialog and restores focus to a visible trigger. The tagline expresses assistance, not a promise to prevent hallucinations.
