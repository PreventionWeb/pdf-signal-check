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
| Intake | A full-bleed Mangrove split hero (no `--contained`; a nested `mg-container--slim` aligns its copy with the page; `html { overflow-x: clip }` absorbs the 100vw escape) that says what the tool is for and why it matters (the H1), with a linked still-image video preview on the right. The preview opens and focuses the paused player on About at `#about-video`; the landing page does not load the player or its audio. Copy explains people seeing, listening and using research/search/AI tools, and connects lost chart meaning, mixed-up steps and conflicting dates to source-document repairs. Then a “Check your own PDF” upload card in the same book-card shape (illustration, dashed drop border, primary Choose a PDF button; the whole card accepts a dropped file), followed by “Or try a sample report”: native Mangrove horizontal book cards with original SVG covers, where the whole card starts the check (the title is a stretched button). | Local processing/capabilities explanation; Settings and Check several PDFs as separate actions. | Technical results, parser vocabulary and startup model downloads. |
| About (`#about`) | “Making PDFs work for people and AI”: the narrative from the UNDRR–OCHA guidance, the GAR2025 two-readings example, the five-step production flow with what this tool checks at each step, where the tool fits, UNDRR/PreventionWeb’s reasons for keeping shared risk knowledge clear, origins and privacy. The video is embedded near the top, with accessible controls, captions and transcript. Practical repairs precede optional wider reuse, with no guarantee of accessibility, search visibility or AI accuracy. Reached from the navigation and the landing hero’s “Why this matters”; the app stays mounted underneath. | Link to the AI and privacy notice. | Personal contact details from the source guidance. |
| Story (embedded on About at `#about-video`) | “Your report says it. But can everyone understand it?”: an eighteen-scene, four-chapter, about 214-second cut-paper collage (hand-authored SVG tiles, strips, sheets and stamps with AI-generated cut-paper figures and icons; stop-motion Web Animations) following one finding (“South is highest”) through a PDF’s hidden layers (what people see, the text tools pull out, the tags screen readers follow) to people who see the page, people who listen with a screen reader, data tools, web search and AI chatbots. A garbage-in/garbage-out bridge explains that missing or misleading inputs can lead to misleading answers. It shows how findings can reach fewer people or arrive changed, then separates direct repairs from the optional “passport” extras that help findings travel further, before a cameo of the real result and a 20-second closing scene naming the free UNDRR and PreventionWeb service, private on-device processing and launch URL. Loaded on About only; leaving About unmounts and stops playback. Existing `story.html?scene=n` links forward to the About player, preserving scene selection and repository prefix. Opens paused, never autoplays; persistent dark video control bar with a full-width seek track, central initial Play button, labelled icon buttons for Play/Pause, Previous/Next chapters, Mute and fullscreen, elapsed/total time, desktop volume, and native Settings disclosure for speed, volume and separate chapter/scene selection; chapter navigation and timeline markers follow four narrative phases; Left/Right seek five seconds, J/L seek ten seconds, Home/End seek to the beginning/end, Space/K play or pause, M mutes and F opens fullscreen; Escape closes settings and restores focus, with `?scene=n` chapter links. Reduced motion shows each scene’s composed still. Captions are HTML with bold coloured key words, always visible and announced on scene change, plus a transcript with caption, narration and a description of each scene. One locally assembled synthetic-narration/music soundtrack loads only after Play or seeking. Sound starts on and can be muted. Its media time drives the visuals; buffering, pause, seeking and speed changes remain synchronized. Reduced motion uses the same timeline with composed stills. Stage values come from `src/story/snapshot.json` (real engine output on the synthetic samples); words live in `src/story/script.js`; drift tests guard both the snapshot and the narration clips. | Synthetic-example note, a link to About for the guidance behind it, and a note that the narration, music and figure illustrations are AI-generated. | Real-publication claims; credibility rests on the About page and the source guidance. Audio is never required to follow the story. |
| First-use setup | Purpose-first choice: standard checks, or standard checks plus multilingual AI (recommended) or English AI. Keep supported languages and model/tokenizer/runtime download costs visible before explicit consent. Stack the choices on phones. | Model identifiers; a technical disclosure for excerpt limits and speed details; an optional device speed test with its limitations. | PDF processing before setup completion; fake speed or cache certainty; treating standard checks as a failed or inappropriate choice. |
| Structural analysis | A checking heading and observed page progress. | Relevant preparation status and cancellation/recovery. | Provisional final results competing with ongoing work. |
| AI analysis | “Checking your PDF”; a stable progress notice, plain stage text, visible small progress detail and Cancel AI checks. | Short explanation that cancellation retains completed checks. | Fix list, headline, exports and technical record while processing is active. |
| Missing document information | No separate gate (removed October 2026). The missing saved title is a Fix item like any other, and every other result is shown. When AI was selected, a plain notice explains that AI comparisons need a saved title, description or keywords, with the saved values and Word/Acrobat/InDesign steps. | Official authoring-tool guidance. | Hiding other findings; useless repeat-analysis actions. |
| Completed review | Small filename; outcome H1; Choose another PDF beside the headline on desktop; review task list and selected analysis. | Specific scope caveat, limitations, explanations and report downloads. | Redundant overview paragraphs, separate full-findings browser, successful checks competing with actions. |
| AI failure, cancellation or no usable comparisons | Plain recovery notice identifying what stopped and what remains available. A useful retry or corrective action. | Technical error reference and settings. | Indefinite preparation state; raw exception as the only explanation; retry for identical known unusable inputs. |

Successful checks remain represented in reports and the secondary technical record. Removing a full-findings browser must not remove report data. “No problems detected” describes completed detection, not certification that the PDF is accessible, factually accurate or suitable for every AI system. Scope limitations must remain understandable even in this state.

### Missing document information

Until October 2026, `needsDocumentInformation(report)` hid all results when a completed analysis had no saved title, subject or keywords. In a set of 20 real public reports, 11 had none of these, so the gate hid most results, including consistency findings that need no saved metadata. It was removed at the product owner's request. The function remains: it now only decides whether to show the “AI comparisons need a saved title, description or keywords” notice when AI was selected. A missing saved title is still a required-check Fix item. This does not claim the three fields are mandatory under a PDF standard.

The separate `hasUnchangedNoInputs` guard concerns a recorded AI attempt with the same pinned model, selected checks and language. It prevents a pointless repeat attempt; it must not become a structural failure or silently change the selected model.

## Review workspace

The results screen has two tabs: **What to fix** (the pages view) and **Technical details**. A separate list view was removed in 2026-10: the grouped legend is the list, and it shares the item detail, so a second layout added a choice without adding function.

**What to fix** places the fix list on the PDF. A sticky side panel holds a grouped legend (Fix / Check with numbered pins, Couldn’t check collapsed with no pins) above the selected item’s full detail, the same detail the list view shows. The pages column starts with a **Document properties** tile: the saved values, with pins beside related rows and an explanation when the description repeats the title. A **Whole document** sheet follows for issues with no reliable position. Then come the pages that have issues, each with numbered pins and dashed boxes and a Show larger action that opens the zoomable preview. A Mangrove switch overlays the recovered reading order and adds every page that has one. Pages render lazily, 20 at a time. Show the whole PDF opens the preview for pages without issues. Pins are buttons, and the legend is the complete text equivalent. Numbers match the PDF download. Entries without a trustworthy position are never given an invented pin.

### Inbox layout (October 2026)

The issue list works like an inbox. Its first entry, **Overview**, is selected when results open and shows the results summary in the detail pane: headline, filename, the “Start with” line, then one small receipt line (“Checked with…” followed by the scope caveat), then the downloads and the scores. Fix, Check, Make it travel further and Couldn’t check follow. The last entry, **Technical details**, behaves like every other entry: the detail pane holds “How this PDF was checked” (receipt, text-profile result, AI coverage, “What this tool cannot check”) and the wide right pane holds the technical analysis record alone in place of the pages. There are no What to fix / Technical details tabs.

From 1200 px the workspace spans the full window as three docked panes: list, detail, then pages (or the technical record); each scrolls on its own. Below 1200 px there is no third pane, so the summary leads the main column and the Overview entry is omitted. From 820 to 1199 px the list and detail stack in one docked column beside that main column. Below 820 px the list and detail become a bottom sheet: a persistent “Issues (n)” bar opens it, choosing a pin, item or Technical details opens it, and Close or Escape returns to the pages.

The same words and numbers describe an item everywhere it appears: list entry, page pin or Whole document card, detail pane and the fix-list PDF. A Whole document card is a pointer like a pin (title, where it applies, a one-line brief); the full summary and “What to change” live in the detail pane. “This tool doesn’t change your PDF” is said once, under the list.

### Scores (October 2026)

The Overview shows Lighthouse-style 0–100 gauges (red below 50, amber below 90, green from 90). **Overall**, the mean of **People**, **AI and search** and **Consistency**, leads the card with a band word (Good / Needs work / Poor) and a note on how many checks could be decided; the three categories and the **Travels further** bonus share one even four-column row (two columns under 420 px). The bonus never enters the overall and is drawn in one neutral colour behind a dashed rule whatever its value, so a zero reads as a bar to strive for rather than a defect. Each category is a weighted share of its checks that passed (`src/review/scores.js`). Checks the tool couldn’t decide are left out and reported (“Uses 15 of 20 checks”), so uncertainty never moves a score. The product owner chose *checks* (October 2026) as the plainer word, accepting that the technical record also counts the profile’s required checks. A “How the scores are worked out” disclosure lists every check with Passed / Partly / Not passed / Not checked. The copy says scores are not an accessibility certificate. Weights are hand-set product judgements, not calibrated measurements.

### Publishing details as a fix (October 2026)

A PDF with no saved publisher or publication date gets “Add publishing details” in **Fix**, ranked after the structural fixes (review priority `important`, between Critical and Warning). The product owner treats it as a fix because catalogues, search and AI tools otherwise have to guess who issued a report and which edition it is. The card says that PDF/UA does not require these details. A missing licence or identifier alone, or no attached schema.org description, stays in Make it travel further.

### Page pins and reading order

Hovering or focusing a pin (on a page, in Document properties or on a Whole document card), or hovering a page outline, shows a tooltip with the item's number, bucket, title and a one-line summary (Escape hides it); clicking selects the item, as does clicking anywhere on a Whole document card. The reading-order switch is disabled when the PDF has no tagged text, with a caution notice explaining that adding tags gives it a reading order.

### Buckets

Items are grouped into four buckets, decided by recorded category and review priority (`fixBucket` in `src/review/workspace.js`), never by a confidence score:

- **Fix** — confirmed defects: required-check failures, missing descriptions on labelled images, and an unrecovered reading sequence.
- **Check** — suspected problems (advisory concerns such as a title or author mismatch, or an out-of-order sequence) and human-judgement tasks (image descriptions, unlabelled or decorative graphics, attachments). A detected reading-order problem appears here. When a sequence exists and no problem was detected, it is not counted: a short tip under the list suggests listening to a page with a screen reader and links to the recovered order (October 2026).
- **Couldn’t check** — collapsed by default. Undecided results (`uncertain`, `required-indeterminate`) and AI results the model could not judge, with the tool’s standing limits (image meaning, AI not run) as an uncounted “Not checked by this tool” footnote. The count in the heading, the fix-list PDF and the batch summary is undecided items only. These are never shown as tasks: titles say what the tool couldn’t decide (“The tool couldn’t check whether…”, “The AI couldn’t judge…”), never “Check…” or “Compare…”. The intro says they are limits of the tool, not problems found in the PDF.

- **Make it travel further** — collapsed by default, after Check and before Couldn’t check. Opportunities, not problems (`category: 'opportunity'`, `fixBucket` → `travel`): no bookmarks, a missing licence or identifier or attached schema.org description, and figures with no nearby data table or attached data file. The intro says they are not problems. Entries carry a “+” marker instead of a number, get no page pins, and never count towards the headline, so the numbered Fix and Check list and the PDF download keep their numbering. Each card uses “Add” or “Share” and one authoring-tool step.

Consistency advisories ([CONSISTENCY.md](CONSISTENCY.md)) go under **Check**: concerns (a year that differs between titles, a leftover Draft label, figures older than the first-page date, a wrong declared language, placeholder saved values, maps or charts marked as decoration) rank as Warning; minor differences (punctuation, word order, spelling, a saved title missing words) rank last as Minor, and title differences are grouped into one “Tidy small differences in the title” task. Maps and charts marked as decoration are grouped into one task with each page listed; when present, the page-by-page “graphics marked as decorative” list folds into it as context instead of being a second card. Title pairs the rules cannot classify go in **Couldn’t check** unless a completed AI comparison settles them.

Cross-references that aren’t links moved to **Make it travel further** in October 2026: linking them is a bar to strive for, and they had outranked real concerns. A short value drawn apart from its tagged label stays under **Check** with page pins (“‘+0.7 m’ is drawn apart from its label”, pinned across the value and its label). Successful link, bookmark, metadata and figure-data results stay in the technical record.

The fix-list PDF lists Make it travel further entries in an unnumbered “Optional” section after Fix and Check, then “Couldn’t check” with the undecided items and the standing limits labelled “Not checked by this tool” (October 2026). Not yet done: the Technical evidence drawer shows them through the generic method/evidence view, without a dedicated link or bookmark inventory.

The verb carries the certainty: Add / Set / Export / Fix for confirmed defects (a failed text check is “Fix text that doesn’t copy out correctly” or “Add real text to the pages”, not “Check the words machines can read”), “doesn’t match” or “may” for suspected ones, and “could not judge” or “couldn’t check” for undecided ones. Do not flatten confirmed, suspected and undecided into one status.

Grouping preserves member evidence, outcomes and provenance. Images group by corrective action. Headings split into suspected mismatches (Check) and pairs the AI could not judge (Couldn’t check).

### Image model consent (October 2026)

Setup shows a separate checkbox under the AI options, ticked by default for first-time setup (saved choices are kept): “Also look at images with an on-device image model (89.12 MB, plus 64.50 MB when a PDF has photo descriptions to check)”, with what it does and its limits. Consent is saved with the other settings and resets with them. The image check runs after the text AI (or on its own when the text AI can’t run for the document’s language), with the same waiting surface, progress (“Looked at 25 of 40 graphics”) and Cancel. Its results only remove graphics from the “can’t tell” list, add AI-tagged “marked as decoration” concerns, or move photo descriptions that may not match their picture to the front of “Review image descriptions” with a plain note; the receipt line says “…and an image model”.

### AI-decided items

Cards whose bucket was decided by the on-device AI carry a small “AI” tag in the list, and concerns the AI decided rank as “Warning (AI)” after rule-based warnings. Rule findings never carry the tag, even when AI ran. Image descriptions that are authoring-tool placeholders, generic words or file names count as missing descriptions (Fix); within “Review image descriptions”, shared descriptions and descriptions the AI found unrelated to their caption are listed first with a one-line reason.

### Headline lead and receipt

Under the count headline, one bold sentence names where to start (“Start with: Add a document title.”), taken from the first Fix item (or Check item if there is no Fix), with how many other items it should also fix. It stops the count being read as a severity score and comes before any caveat. A small receipt line follows: “Checked with standard checks”, “…and on-device AI (MiniLM)”, or that AI was selected but had nothing to compare, with the scope caveat (such as image and chart meaning) appended to it rather than placed above the action. A saved-title or author comparison is not listed when nothing is saved, because the missing value is already its own Fix item.

### Page viewer (October 2026)

The main column is the PDF viewer; there is no preview modal. A sticky toolbar holds page navigation (‹ Page [n] of N ›, type a number and press Enter), All pages / With issues, Issues / Reading order / Page only (Mangrove segmented controls; Reading order is disabled with a note when the PDF has no tags), and zoom (− Fit + up to 200%, re-rendered sharply). All pages show by default and load as you scroll. Every “Show on page” action scrolls the viewer to the page and outlines the spot with a brief pulse (no pulse with reduced motion). The detail pane no longer renders its own page crops or thumbnails: image groups are a short list (page, kind, saved description, any note) with a “Show on page” action per image, and title or author comparisons show the recovered text without a crop. In Reading order mode each page has a “Text in reading order” disclosure.

### Document properties entry (October 2026)

Document properties is an inbox entry after Overview. It opens in the detail pane with every saved value (title, description, keywords, author, language, publisher, publication date) and pins for the issues about each one. The pages column no longer repeats a Document properties sheet or a Whole document sheet: those items are in the list, and their detail opens in the detail pane. The site header shows the wordmark only, without the tagline.

### For the person fixing it (October 2026)

The former Technical evidence drawer opens from a “Details for whoever fixes it” link and is headed “For the person fixing it”. It has four parts and does not repeat the card: **What the tool found** (for document-property and language items, every saved property with its value or “Not saved”; for hidden text, each match with where and why; otherwise the recorded evidence, plus page links); **Where to change it** (the longer step text when it differs from the card, then one line each for Word, InDesign and Acrobat Pro); **PDF fields, for developers** (the exact dictionary, XMP or structure names); and **How the tool decided** (the source label and one sentence). Tool steps live in `src/review/fixer.js` and are general guidance for current tool versions.

### Quiet detail pane (October 2026)

The detail pane has no card chrome. The plain notice is shown as larger lead text with a thin rule in the bucket colour (red Fix, gold Check), not a tinted box. Evidence is plain text and quotes without nested cards; a single hidden-instruction match is quoted once (in the lead), not again in the evidence. “What to change” keeps its heading without a panel. There is one main action (“Show on page”); “Details for whoever fixes it” is a text link.

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
| `src/ui`, brand configuration | Mangrove components/adaptations, tokens, semantic font roles and approved versioned UNDRR assets. | Analysis policy, source ownership or model substitution. |

Use published Mangrove 2.0 React components where their APIs fit. Use documented native buttons, `details/summary`, dialogs and tabs when package string/link APIs cannot own interactive application content. The technical analysis record and its finding collections use `mg-accordion`; the fix list uses native buttons inside bucket sections, with Couldn’t check as a native `details`. React owns state; no external initializer or DOM observer may acquire parallel ownership. Use correctly wrapped sRGB tokens and bundled fonts/assets. A custom gray body background is not part of the requested presentation.

## Non-negotiable boundaries

PDF bytes, text, model inputs and results remain on the device. Model/tokenizer assets download only with explicit consent; opening help, a preview, a disclosure or a saved configuration must not start downloads. Costs, supported languages and limitations remain available and visible at the decision to run. External authoring-tool guidance links carry no PDF contents.

Deterministic acceptance is independent of AI advisories and UI grouping. An AI execution label requires recorded execution, not model selection. Retain source identity, attempt epochs, cancellation, stale-callback rejection and worker/document/canvas disposal. Exports capture a fixed source/report snapshot; simplifying the screen must not silently discard underlying evidence.

## Open decisions and tradeoffs

- **Missing document information:** the results gate was removed in October 2026 (see above). Whether a missing description or keywords should rank higher than other fixes is still open.
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

“How this PDF was checked”, “AI coverage” and “What this tool cannot check” live in the detail pane of the Technical details entry; the technical analysis record fills the wide pane beside it.

The results hero is a contained Mangrove hero with a count headline (“2 things to fix, 3 to check”; “Nothing confirmed to fix, 2 things to check”), the filename, the Start with line, the receipt with at most one scope sentence, and the downloads: a filled “Download fix list (PDF)” button beside an outlined “Download full report (PDF)” button, with the JSON record as a small text link (October 2026; the More downloads disclosure was removed). Choosing another PDF uses the site navigation. The required-check percentage is removed from the hero (2026-10); pass counts remain in the Technical details record. The Select PDF / Results step navigation is removed.

Use “No problems auto-detected” only when nothing is in Fix or Check and no required check failed.

An unrecovered machine-readable reading sequence in a completed analysis is a Critical review priority, with a red detail notice. Recovered sequences whose correctness remains uncertain stay manual checks. This explicit presentation policy preserves the underlying uncertain detector outcome and does not infer a missing sequence merely from an incomplete analysis.

The filename and file size sit beneath the result headline inside the hero. The concise PDF fix list is the primary handoff download; the full PDF sits beside it and the JSON record is a text link, with the captured-report/source ownership retained. Offer no reading-order inspector when no sequence was recovered.

Figure review starts with the numbered image/page, a located crop and its exact saved alt text or explicit missing-description message, before repair guidance. When geometry cannot isolate the figure, show labelled full-page context without fabricated highlights. Keep Inspect beside the preview/description and center a located region inside the modal. The processing-time PDF viewer and the sample preview are removed.

Group image review by corrective action: missing descriptions have Critical review priority; saved descriptions, unlabelled graphics and graphics declared decorative require manual review. Keep source outcomes independent of this priority. A description-presence success still needs human review of its quality. Render one member at a time with previous/next and a selector. Decorative content remains excluded from machine-readable coverage but has a separate review inventory, with safely located regions outlined in full-page context. Counts for unlabelled and decorative graphics represent pages, not inferred distinct images.

The pinned Mangrove MegaMenu contains the project wordmark/tagline and core local actions: Upload a PDF, Try a sample, Settings, Check several PDFs, About this tool and AI, and What this tool checks. Existing controller flows and the About modal remain owners; navigation does not start inference or authorize downloads. Mobile menu closes before opening another dialog and restores focus to a visible trigger. The tagline expresses assistance, not a promise to prevent hallucinations.

The results download area explains the repair handoff and session lifetime: send the fix list to the source-document editor, request a new PDF and check it again. The full technical PDF and the JSON link stay visibly secondary to the concise tagged fix list. About and video Skip to content moves focus to the visible main region without changing the route or unmounting the movie.
