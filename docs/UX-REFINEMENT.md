## Model comparison clarity — 7 October 2026

The model matrix uses bold Yes entries, including tagged heading comparisons (enabled in check settings). Processing speed uses Good / OK / Fast labels, with saved per-model benchmarks taking precedence over explicitly marked expectations. The no-AI fallback has no inference overhead; its speed label is not a guarantee for PDF parsing. Granite expectations are not presented as a MiniLM-derived device benchmark.

Excerpt limit has the existing JavaScript help popover, explaining tokens as pieces of text, shorter versus longer passages, and per-input rather than whole-document coverage. Verified desktop and 390px mobile, popover viewport placement, Escape dismissal, all Yes cells using emphasis, and production build.

# Results-first UX refinement

## Benchmark fine print — 7 October 2026

Benchmark methods, measured timings and limitations are always visible as
14px fine print beneath the result, without a disclosure or technical heading.
The timing receipt is a native inline JSON download link. Desktop/mobile layout,
receipt download and production build were verified.

## Final verification — 6 October 2026

191 tests pass and production build passes with the existing large-chunk warning.
Real browser checks cover desktop/mobile setup, model/no-AI paths, automatic
MiniLM inference, missing-language pause, processing viewer, reading-order page
context, navigation/search/zoom and a repository-prefixed build. The new source
PDF pages were rendered and inspected; corresponding PNG hashes are identical
across all three preparation variants. Earlier captured AI reports and PDF pages
were also rendered and inspected in this refinement pass.

## Three matched samples — 6 October 2026

The public sample picker now contains only Well prepared, Partly prepared and
Poorly prepared versions of the same two-page fictional report. Each has authors,
a year/title, descriptive paragraphs, a multi-column procedure and a vector
figure. Their visible page render hashes match across all three versions; only
metadata, tags and alternate text differ. The broad calibration corpus remains
a developer test asset. The well-prepared figure still requires manual inspection
under the existing profile scope; sample labels do not predeclare a pass.

## PDF-A-go-go page context — 6 October 2026

Processing now shows the original PDF in a locally bundled PDF-A-go-go viewer.
Reading-order review opens that viewer on the finding page alongside the existing
recovered sequences. Zoom, search and page navigation provide whole-page context;
the existing evidence preview still owns located overlays. Viewer layout is not
a reading-order verdict. When a diagram is unavailable, the UI distinguishes
recovered tagged text from an unrecovered sequence and explains the limits of
the check separately from successful page rendering. The frame loads only same-origin scripts, worker and
fonts, and receives a local object URL rather than a remote PDF URL. Epoch checks
reject late results, instance IDs prevent stale disposal from unregistering a
replacement, and source URLs/frames are released when leaving the screen.

Independent walkthrough feedback fixed zero-sized navigation icons, added
visible fit/zoom controls that preserve the viewed page, made the PDF scroll
region keyboard-focusable, and labeled search totals as matching pages.

## Product comparison presentation — 6 October 2026

The model table no longer sits inside a fieldset panel. Product headings state
the recommended use, the selected column has a subtle blue emphasis, and rows
use horizontal dividers without vertical grid borders. The scroll region and
radio names remain accessible on mobile.

## Visual benchmark timings and fallback ordering — 6 October 2026

The saved result now includes three horizontal timing bars for PDF preparation,
AI model startup and median AI comparison time, with actual seconds on a fixed
five-second scale. Longer bars mean faster completion (full at zero seconds,
empty at five seconds or more); only the AI
comparison uses the existing Great/OK/Not recommended rating colors. No invented
percentage score or accuracy rating is displayed. The model matrix orders MiniLM,
Granite R2, then No AI as an explicitly limited fallback; MiniLM is the initial
selection. Selection alone does not authorize downloads.

## Two-step setup and model comparison — 6 October 2026

Setup now separates the optional MiniLM baseline benchmark from a model feature
matrix. MiniLM is selected by default; No AI is the last option and presented
as a fallback. Choosing a model explicitly enables its
session-wide downloads and screening. The MiniLM result does not rate Granite.
After a benchmark result exists, the bottom Skip benchmark action becomes Check
again, and the duplicate retry action inside the result box disappears.

Verification: 186 tests and production build pass (existing large-chunk warning).
A real browser rerun from the new bottom Check again action completed and restored
the saved speed result. Desktop/mobile walkthrough found no must-fix confusion. The matrix scrolls in
its own region on mobile, supports keyboard scrolling, and the no-AI
sample path completed without model downloads. This supersedes the mandatory-AI
setup described in the earlier iteration below.

## Focused benchmark states — 6 October 2026

| Before | After |
| --- | --- |
| The benchmark box repeated setup/download prose, two technical disclosures and an old rating during a new run. | Idle shows a short benchmark explanation and download cost; running shows only the model, current step, progress bar and cancellation; completion shows the saved rating, short guidance and one technical disclosure. |
| Worker progress was reduced to changing messages. | The controller retains actual progress. Asset downloads show their own bounded progress; measured runs advance from 0 to 3 without resetting between encoder batches. Unknown-duration preparation stays indeterminate. Terminal/canceled states clear progress and stale callbacks cannot restore it. |

Verification: 185 tests pass and build passes with the existing chunk warning.
A real MiniLM benchmark exercised the compact mobile running box and saved
result. The current run hides the previous grade and all technical disclosures.
No PDF data or export formatting changed. Screenshots use
`/tmp/pdf-signal-benchmark-*`.

## Saved device setup and AI-first evaluations — 6 October 2026

| Before | After |
| --- | --- |
| Device timing was a repeated optional step after PDF checks, with technical results leading. | Initial model setup measures speed once and leads with Great, OK or Not recommended. Detailed timings and a downloadable receipt remain in a disclosure. Synthetic receipts persist per model in local storage; PDF data and download consent do not. |
| Each PDF offered a separate choice to add AI. | Explicit session setup consent enables automatic text checks followed by local AI for each PDF, including batch defaults. Missing/unsupported language pauses single-document screening; failures retain clearly partial results. |
| Exact matches or rule-settled wrong years could skip all model work. | Required-AI mode additionally records title relatedness as a separate `titleAI` result when comparison evidence is available. Identity rules and profile outcomes remain unchanged. Captured reports and compact batch summaries retain this actual AI result. |

Speed bands are product responsiveness guidance: ≤1.5 seconds Great, ≤5 seconds
OK, >5 seconds Not recommended, for the fixed four-input warm workload. They
are not validated device requirements or document/accuracy predictions.
Interrupted/hidden runs are unrated. Saved receipts expire after 30 days or
browser/pinned model changes; storage failure permits current-session use.
Reload restores the most recently tested compatible model, and requires fresh
session consent before any PDF evaluation. Slow results can be explicitly
accepted. Unsupported or evidence-free screening never fabricates model use.

Verification: 184 tests pass and the production build passes with its existing
chunk-size warning. New contracts cover automatic inference after consent,
missing-language pause, rule-settled title model work without identity override,
rating boundaries, persistence/expiry/incompatibility/storage failure and
canceled/stale benchmark writes. Real browser MiniLM testing measured about
1.35 seconds for four inputs (Great), persisted across reload, and started no
asset requests when opening saved setup. A user-requested subagent independently
verified saved setup, automatic single-PDF inference, missing-language completion
with accurate provenance, two-PDF model-backed batch and mobile evidence (zero
sampled accessibility violations). Its copy corrections are incorporated.
Production `/pdf-signal-check/` exercised benchmark, saved setup and automatic
inference. Desktop/mobile views fit without horizontal overflow. Actual JSON
records five embedded inputs and separate deterministic title / AI title
relatedness results. PDF receipt and the new AI advisory pages were downloaded,
rendered and visually checked. Local artifacts use `/tmp/pdf-signal-auto-ai*`
and `/tmp/pdf-signal-setup-*`.

This workflow supersedes the earlier “review without AI” choice documented
below. Historical developer-corpus metrics are unchanged and have not been
rerun for required-AI mode.

## Visible AI choices and normal-user walkthrough — 6 October 2026

| Before | After |
| --- | --- |
| Suggested AI and its action were inside disclosures, with a model select, comparison table and nested language lists. | Results expose local AI and review without AI as cards. The model, selected checks, costs and explicit download action are visible; alternate models use Mangrove radios with compact tradeoffs and language help. |
| Mobile users with missing language met disabled AI before finding a valid review path. | Review without AI comes first on mobile, followed by optional AI and a separate “Check local AI speed” card. Desktop retains AI on the left with the other choices alongside it. |
| Welcome’s sample action silently analyzed a clean fixture. | It opens and focuses the sample gallery so users choose a scenario. |
| AI prose promised unchecked sections and “Text profile Yes” looked inconsistent with metadata findings. | The selected checks are named explicitly; evidence review says which required text checks passed and how many findings still need inspection. Language guidance gives concrete source/PDF-property and re-export steps. |

A user-requested subagent independently walked welcome, samples, author and
reading-order findings, language warnings, settings, evidence and the speed-check
entry on desktop and mobile. The revisions above incorporate that feedback;
retesting found no remaining must-fix confusion. No model downloads were
consented to during this walkthrough. The benchmark measures observed synthetic
workload speed, not document accuracy or certified machine suitability.

Verification: all 178 tests pass and the production build passes with the
existing large-chunk warning. Desktop 1280px, mobile 390px and 320px layout
checks show no horizontal overflow. Changing models updates displayed costs
and benchmark model without downloading assets. The English assumption remains
explicit and separate from PDF metadata. The production repository-prefixed URL
loads and analyzes the missing-language fixture. A fresh four-page PDF report
was downloaded; its changed language guidance was rendered and visually checked
across pages 1–2, with all text retained and no clipping. Sampled mobile evidence
accessibility audit found zero WCAG 2A/AA violations; decorative sequence arrows
still require manual contrast inspection. Screenshots are local QA artifacts
under `/tmp/pdf-signal-checks-*` and `/tmp/pdf-signal-user-*`.

This section supersedes the older collapsed-AI/benchmark presentation recorded
in the takeover notes below. No dependency versions changed: the registry check
found patch updates for Transformers 4.3.0 → 4.3.1 and Vite 8.3.2 → 8.3.3.

## Missing language and explicit screening assumption — 6 October 2026

| Before | After |
| --- | --- |
| Missing and unsupported declarations shared an opaque model recommendation message. | A Mangrove warning explains that missing language can cause unsuitable reading/processing choices and recommends correcting the source export. Unsupported or invalid declarations receive separate guidance. |
| Missing language prevented inference with no user-controlled path forward. | A source-scoped “Assume English for optional AI screening” checkbox explicitly enables English eligibility, without changing PDF metadata or starting downloads. Existing declarations cannot be overridden; new sources reset the choice. |
| There was no assumption provenance. | Requests carry `languageAssumption` separately from metadata. Semantic results record declared/screening language and assumption source; review and captured PDF/PNG/JSON receipts state that the PDF declaration remains missing. Prior completed results retain their actual context when preferences change. |

Verification: 178 tests pass, including explicit versus default eligibility,
refused declaration overrides, source reset, stale result rejection and captured
provenance. Production build passes with the existing chunk-size warning. A
synthetic PDF with its catalog language removed exercised the warning, checkbox,
model eligibility and title-only rules path in the actual browser; acceptance
remained No and the language finding remained failed. Selecting the assumption
and running rules-only screening requested no model assets. Mobile review axe
sampling reported zero violations and zero incomplete checks. Five downloaded
report pages and the dedicated PNG were rendered/visually inspected; the
assumption fits, while source language remains “Not set”. JSON retains the null
declaration and separate user-assumption context. Local QA artifacts use the
`/tmp/pdf-signal-language-*` prefix. Inference policy tests use injected vectors;
this pass does not establish model accuracy on documents with missing language.

## Sample cards — 6 October 2026

| Before | After |
| --- | --- |
| Sample shortcuts were buttons, while the full library required a long native select and a separate analysis action. | Three featured Mangrove cards have short descriptions and direct sample actions. The expandable full library shows all 20 manifest examples as the same responsive card pattern. |
| The sample area nested one large card around controls with little context. | A named section contains documented no-link vertical cards, semantic H3 titles, summaries and native action buttons with unique accessible names. Equal-height rows align actions; headings and descriptions use balanced/pretty wrapping. |
| A redundant label on the generic intake div required manual accessibility review. | Removed the unsupported generic-div label; the page heading and named samples section provide the context. |

Sample presentation lives in `src/app/Samples.jsx`; fetching, source ownership
and analysis remain with the existing controller. Full-library descriptions
come from the manifest and remain authored scenario labels, independent of
check results. A failed manifest load keeps the featured examples available
and explains the unavailable library.

Verification: 173 tests passed and production build passed with the existing
chunk-size warning. Headed agent-browser checks covered desktop 1280px and
mobile 390px, all 20 library entries, direct analysis from a gallery card and
no horizontal overflow. Local screenshots:
`/tmp/pdf-signal-sample-cards-desktop.png` and
`/tmp/pdf-signal-sample-cards-mobile.png`.

## Takeover browser review — 6 October 2026

Reviewed the React 0.8 app against the pinned Mangrove 2.0 Hero, card, button,
notice, disclosure and segmented-control guidance. This is a focused local
presentation refinement, not a detector or model evaluation.

| Before | After |
| --- | --- |
| Welcome repeated its primary action below four introductory cards and led with “Powered by AI”. | Published Hero actions offer PDF selection, a sample and batch review once. Three documented Mangrove cards explain checks without AI, evidence review and optional AI; headings use H2 and balanced wrapping. AI-assisted development remains disclosed in About AI & privacy. |
| The profile introduction repeated the product tagline. | “Understand the result’s limits” introduces the existing separate profile scope and acceptance limits. |
| Five numbered stages included welcome and a non-interactive processing step. | Single-PDF navigation has three task stages; processing belongs to check results. Batch has two stages. The product home link returns to welcome, which has no stage navigation. Navigation targets are at least 40px high. |
| The toolbar reused footer layout, with a decorative status dot and several mobile rows. | A dedicated responsive toolbar retains product identity, version, local-processing text and the Mangrove privacy button in two mobile rows; desktop keeps one row. Local-processing text uses the UI font role and the page enables font smoothing. |
| Intake copy repeated single versus batch choices. | Shorter selection guidance explains that several files create a batch queue; the batch action uses the same “Check several PDFs” wording as welcome. |
| The result notice’s primary AI action started downloads before its cost explanation; optional AI was expanded and repeated the review action. | Evidence review is the primary notice action. Optional screening starts collapsed, with model/tokenizer sizes, separate runtime cost, language eligibility and limitations before the explicit “Download assets and run local AI” action. Alternate-model execution also names downloads. |
| Browser calibration prose competed with the model choices. | The unchanged fixed-workload calibration controls have their own optional disclosure. |
| Report/scope disclosure panels and wrapped finding-group controls delayed mobile evidence. | Scoped compact disclosure padding keeps 44px targets and space for the Mangrove disclosure icon. Native Mangrove radio groups remain adjacent and equally sized on mobile, with balanced labels and preserved arrow-key selection. |

Verification: all 173 tests passed; production build passed with the existing
large-chunk warning. Headed agent-browser checks covered desktop 1280×900,
mobile 390×844 and 320×740, author evidence, reading-order evidence, a two-file
traditional batch and retained review. The production app was served under
`/pdf-signal-check/`; presentation assets, sample analysis and queue workers
resolved under that prefix. No horizontal overflow was observed in checked
views. Opening optional AI made no model/tokenizer/WASM requests. Native radio
arrow-key navigation changed the selected group. Sampled checks and review
axe audits reported zero violations and zero incomplete checks; the welcome
Hero had zero violations with gradient contrast requiring manual inspection.

At 390px, the author finding heading now appears about 707px from the top of
the page. Local screenshots include `/tmp/pdf-signal-before-home.png`,
`/tmp/pdf-signal-after-home-desktop.png` and
`/tmp/pdf-signal-final-review-mobile.png`. These are uncommitted QA artifacts.
No optional inference or export generation was run in this presentation pass.
Detection accuracy and full accessibility conformity are not established by
these sampled checks.

Implemented against local v0.7.0 with agent-browser. At the time of this UX slice the working name was PDF Input Check. PDF Signal Check was adopted in the subsequent naming pass. Neither pass includes external publication.

Primary needs: find problems quickly, compare metadata with publication text and approximate page evidence, inspect extracted order against the visual page, understand what to change in the authoring source, and retain the report. Successes remain available as a secondary group. Traditional checks require no model; optional AI remains local, advisory, and gated by the displayed download action or explicit batch consent.

| Before | After |
| --- | --- |
| Seven sample buttons and a full 18-item gallery competed with upload and a separate document heading. | Upload is the primary entry, with a nearby several-PDF action; author, order, and title defects are the three visible samples. Controls and the complete gallery sit in a disclosure. (`index.html`) |
| Completed traditional results led with a large model recommendation. | A count of findings and a primary “Review findings without AI” action lead. Optional AI, its model choices, costs, languages, and benchmark remain available in a disclosure. (`src/main.js`) |
| Profile details, synthetic labels, and three tall category buttons delayed evidence on mobile. | A compact profile receipt keeps its separate scope explicit; counts/labels are expandable, and compact group buttons keep problems, uncertainty, and successes accessible. (`src/main.js`, `src/review/view.js`, `src/style.css`) |
| Finding status displayed raw method keys; comparison repeated the finding heading and reason. | A readable outcome leads; comparison values come before explanation. Technical method, raw evidence, and consumed-model-input receipts are expandable. (`src/review/view.js`, `src/main.js`) |
| A located crop appeared after repair instructions and navigation. | The crop appears directly after the comparison, before method details and fix guidance. Its approximate-region caption and text equivalent are preserved. (`src/main.js`) |
| Full-page preview always occupied a large section; evidence clicks selected it without bringing it into view. | Full-page evidence starts collapsed; choosing an evidence location opens it, selects the region, and scrolls to the preview. Tagged/content-stream sequences are still labeled accurately, without claiming intended visual order is certified. (`src/main.js`) |
| Report actions appeared after the full-page preview. | A “Keep this report” disclosure is near the result heading. The complete export/share notice, all three formats, cancellation, and download-request receipt remain intact. (`src/main.js`) |
| Clean controls showed an empty problem group with general advice. | An explicit action takes users to uncertain/unassessed findings. (`src/review/view.js`) |
| Batch used the single-PDF stage labels. | Batch queue and PDF evidence have their own navigation labels, including detached retained-review context. (`src/main.js`) |
| Frozen batch upload/settings/resource prose appeared above finished outcomes. | Starting a queue folds admission and settings; after start, setup follows outcome cards. Recovery/retention decisions remain prominent. Each retained row offers a primary “Review findings” action; identity, timing, compact outcomes, and retry/release/remove controls are secondary disclosures. (`src/batch/view.js`) |
| View rebuilds could collapse open detail controls. | A shared, source-independent disclosure-state helper preserves explicit choices, and batch summaries have stable focus IDs. An active export keeps its menu open so cancellation/status stay reachable. (the former `src/view-state.js` and DOM views; React now preserves component/native disclosure state) |
| First source selection claimed an export had been canceled even when none existed. | Cancellation is reported only when an export was active; source changes clear an old receipt. (`src/export/controller.js`) |
| New primary actions inherited a light secondary hover background. | Primary actions retain a dark, contrasting hover state. Font smoothing, compact mobile controls, and tabular result/progress numbers are explicit. (`src/style.css`) |

## Verification

- `npm test`: 122 tests passed; `npm run build`: successful. Existing Vite large-chunk warning remains; no dependency or engine changes.
- Actual agent-browser flows: author mismatch 14, flawed order 17, clean control, two-file traditional queue, add a third PDF and continue, open retained result, source switching, JSON export request.
- Desktop 1280×900 and mobile 390×844; both local preview and `/pdfs-for-ai-actionability/` Pages-style base path.
- Author metadata Iris Hale/Owen Brooks and publication Maya Chen/Leo Martin both appear within the first 390×844 review viewport. Located crop remains the byline, not a different source.
- Evidence action opens the full-page disclosure and scrolls it into view. Report-menu openness survives Mark reviewed; a per-item batch management disclosure survives admission and subsequent queue completion. No horizontal mobile overflow in checked views.
- axe-core checks: author review 0 violations/0 incomplete; completed batch including hovered primary action 0 violations/0 incomplete. This is sampled UI verification, not an accessibility certification.
- Optional AI downloads were not started by the traditional review or queue flows. Model calibration/evaluation accuracy claims were not altered.

Internal review screenshots: `/tmp/ux-before-authors.png`, `/tmp/ux-before-order-mobile.png`, `/tmp/ux-before-batch-mobile.png`; `/tmp/ux-after-entry-desktop.png`, `/tmp/ux-after-checks-desktop.png`, `/tmp/ux-after-authors-desktop.png`, `/tmp/ux-after-authors-mobile.png`, `/tmp/ux-after-order-mobile.png`, `/tmp/ux-after-batch-mobile.png`, `/tmp/ux-after-clean-uncertain-mobile.png`. These are local QA artifacts and are not committed source assets.

Independent read-only browser QA passed against build `index-D4e_apa3.js` / `index-Cgka1AMq.css`: Pages-path mobile author/order evidence, clean-control uncertainty navigation, keyboard report-menu access, and two-file traditional queue. Opening optional AI caused no model download; a fresh Granite batch with unchecked consent remained queued and started no analysis/model worker or model-asset download. Existing profile limitations, provisional AI thresholds, session-only queue retention, source identity, and local-processing/download-consent boundaries remain unchanged.

## Context help, execution provenance, and reading-order illustration

The subsequent October 6 pass explains the labels people see while preserving the distinction between extracted evidence, heuristic rules, and actual model inference.

| Before | After |
| --- | --- |
| Info, XMP, tagged roles and extraction order required prior PDF knowledge. | Small interactive help controls explain these terms, profile scope and bounded checks, with verified Adobe/PDF Association references where relevant. (`src/help/catalog.js`, `src/help/popover.js`) |
| Technical method was hidden in recorded evidence. | Each finding visibly names its source: PDF/rule checks, rule-based heuristic, local AI relatedness, or unassessed/unavailable provenance. (`src/review/provenance.js`, `src/review/view.js`) |
| Selected model configuration could resemble actual model use. | A compact execution receipt distinguishes AI not run, rules-only fast paths, skipped/error outcomes and recorded completed inference. Per-item flags, exact methods, successful envelope and model identity govern attribution; global inference alone does not label every check as AI. |
| Expanded unsupported checks could claim “Actual model configuration” and “Completed screening inputs.” | Only checks with recorded completed inference use those headings and consumed-input/score explanations. Other checks identify configured screening and explicitly state that inference was not completed for that check. |
| Reading order showed two long recovered lists first. | A same-page, data-driven illustration aligns uniquely located detector evidence and highlights the actual backward jump. Numbered cards show 3→4→1→2 beside 1→2→3→4 for sample 17, with the latter labeled drawing-instruction extraction rather than intended order. Full text remains in a stable disclosure. (`src/review/order-comparison.js`) |
| Order finding title was “Bounded semantic order review.” | Plain “Reading-order comparison”; detector bounds and limitations remain in the explanation and evidence. |
| Selected finding-group hover inherited a light background with white text. | The selected group retains a contrasting dark hover state. (`src/style.css`) |

Help opens on hover, focus or explicit click/touch-compatible activation; pointer movement into a panel preserves its links. Escape and outside interaction dismiss it; keyboard Escape returns to its trigger. References explicitly open in new tabs with `noopener noreferrer`. Native popover lifecycle and local bounded timers avoid persistent document listeners retaining removed result DOM. Help itself does not request model assets or transmit PDF contents.

The reading-order illustration is a presentation of recovered evidence, not a repair, intended-order certification, or a prediction of every AI system’s extraction. Unaligned, missing or duplicated evidence gets an explicit unavailable state; matched controls do not invent an anomaly. Spatial detector evidence does not receive fabricated step numbers. Omission counts remain visible.

Verification in this pass: 133 tests passed, including provenance branches and actual sample 16/17 order alignment/abstention tests; production build passed. Browser checks use desktop and 390×844 production Pages-prefix views. Info/XMP help fits the viewport; keyboard reference activation opened Adobe documentation in a separate tab; links carry the required target/rel attributes. Hover-to-link, mobile click, outside dismissal and keyboard Escape were exercised. Opening these tips and traditional sample reviews produced zero model/runtime asset requests. A sampled open-panel axe run reported zero violations with color-contrast items requiring manual review; computed text `rgb(37,42,37)` on opaque `rgb(255,254,249)` and visual inspection verified readable contrast. Independent review covers mixed rules/actual MiniLM inference and unsupported-language configuration.

Internal screenshots: `/tmp/pdf-signal-help-desktop.png`, `/tmp/pdf-signal-help-mobile.png`, `/tmp/pdf-signal-help-provenance-mobile.png`, `/tmp/pdf-signal-order-illustration-mobile.png`. These are local QA artifacts, not application assets.

Final illustration QA used actual sample 17 at desktop and 390×844: both lanes show the four aligned steps, downward arrows follow the stacked sequence, and the 4→1 backstep is highlighted without marking the drawing lane as intended order. Sample 16 remains an unavailable/no-anomaly illustration rather than inventing a defect. Final screenshots: `/tmp/pdf-signal-order-final-desktop.png`, `/tmp/pdf-signal-order-final-mobile.png`. An actual five-page sample-17 PDF report was downloaded; its changed “Reading-order comparison” title on page 1 was extracted and visually verified in a fresh render (`/tmp/pdf-signal-order-export/title-page-1.png`). No export layout logic changed. Independent browser review confirmed mixed rules/AI attribution, German unsupported-model configuration wording, and both help/privacy Escape behavior.

## Publication-first identity review

A later user review changed title/author comparisons to one column. The publication card now shows its located source crop first, then the recovered candidate text; separate Info and XMP cards follow with readable full values and their contextual help. `src/review/identity-comparison.js` owns this presentation. `src/review/view.js` reuses its crop slot rather than adding a second image location.

The metadata-title absence finding also exposes the comparison. When a trustworthy publication candidate was independently recovered, its actual recorded key/block IDs provide a context crop; absent metadata itself still has no fabricated page location. Missing candidates, locations, or values remain explicit. Source candidacy stays heuristic, and neither declarations nor a visually matching crop authenticate identity.

Actual author 14, wrong-year title 08 and no-metadata 04 reviews passed desktop and mobile 390px checks. Independent review verified source identity, the first crop, original recovered and metadata values, Info→XMP order, readable values, and help keyboard/Escape behavior; no horizontal overflow. Screens: `/tmp/pdf-signal-identity-final-desktop.png`, `/tmp/pdf-signal-identity-final-mobile.png`. The separate reading-order illustration remains two recovered-sequence lanes.

## Embedded-file declarations and final provenance checks

| Before | After |
| --- | --- |
| Embedded spreadsheets/source documents were outside the visible review. | A declared inventory names each recovered file, MIME type, description, relationship and association, and lists missing guidance. `src/review/attachment-view.js` owns the cards; no payload is opened, fetched or extracted. |
| Unlinked stream records could be confused with active attachments. | A separate bounded section retains declared stream context and possible inactive-remnant status. Missing streams are distinguished from an embedded-file key alone. Normalized evidence carries filenames, missing guidance, warnings and orphan declarations into captured reports. |
| A configured model could be called completed in export receipts. | PDF and PNG receipts reuse pure execution provenance; per-finding exports require actual field inference rather than borrowing a sibling's inference. Unsupported or rules-only results retain configuration without claiming model use. |
| Tall hover help could overlap its trigger and intercept a click with a reference link. | `src/help/placement.js` keeps the entire panel above or below the trigger with a gap and bounds scrolling to the available side. Three invariant tests cover bottom, center and viewport-edge placement. |

Final integrated validation: all 153 tests passed after the isolated placement refactor; the focused placement/export run also passed 13 tests, including three new placement invariants. Production build passed (`index-Cw8UP0DH.js`, `index-BcE5gyPK.css`, `report-CSeXkoPU.js`); the existing large-chunk warning remains. Actual 19/20 browser reviews show profile 0.3 as No / scope not established and declared attachment metadata without AI. Independent mobile review checked guidance, MIME/relationship claims, empty-EF behavior, no attachment actions, and no model asset downloads. The exact bottom-of-screen help-click regression was retested: the panel ends above the trigger, no new tab opens, links remain separately reachable, and keyboard Escape returns focus. Center placement uses scrolling without overlap.

Actual report downloads for 19/20 were rendered and inspected: guided descriptions/relationships and both filenames fit; missing-description/relationship/MIME instructions remain visible in the negative report. The German control explicitly selecting English MiniLM produced a rules-only receipt. Its actual PDF and summary PNG were downloaded and visually inspected: configured model is clearly distinguished from inference; skipped per-check evidence does not say Actual/Completed model. No model download was required for that unsupported-language path.

Internal artifacts: `/tmp/pdf-signal-attachments-final-desktop.png`; report renders `/tmp/pdf-signal-attachment-exports/19-inventory-2.png`, `/tmp/pdf-signal-attachment-exports/20-start-1.png`, `/tmp/pdf-signal-attachment-exports/20-inventory-2.png`, `/tmp/pdf-signal-attachment-exports/12-receipt-1.png`. Downloads remain local QA artifacts, not committed application data.

Privacy Escape was independently tested on the first and manually reopened notice: dismissal preserves the existing suppression preference behavior and returns focus appropriately. This small modal change does not consent to or start model downloads.

## React ownership — 6 October 2026

The guided flow, findings, identity and attachment evidence, order diagram, queue, calibration and download controls now render declaratively in React 19. Mangrove's published PageHeader/Footer/Hero, form controls, notices and segmented radio group are imported directly. Composable evidence cards and native action buttons retain documented markup because package card/link APIs do not fit arbitrary PDF evidence or disabled actions. The legacy DOM UI constructors were removed.

Source-specific finding position survives optional screening reruns. Opening another finding clears the previous blue preview selection; the full-page inspector can remain open without presenting unrelated evidence as current. Popover content is portaled outside publication headings, with native light dismissal, scoped reposition listeners, trigger-safe placement, reachable external links and Escape focus return. Privacy uses the existing preference key, saves only that setting, and handles Escape with focus returned to the invoking control. StrictMode cleanup/remount cancels resources rather than starting downloads.

Initial integrated verification passed 173 tests across 20 files and a production build. Desktop and 390px identity/order inspection, real canvas rendering, 150% zoom, no-overlay selection, native radio arrow keys, help Escape and privacy preference/Escape were exercised. Author review accessibility sampling reported zero violations and zero incomplete checks. Independent agents verified actual pinned MiniLM WASM inference, rules-only title versus AI subject/keyword provenance, queue/consent/lifetime behavior and captured downloads. Five downloaded report pages and the dedicated PNG were rendered and visually reviewed at `/tmp/pdf-signal-react-qa`; JSON was checked independently. Final production asset receipts are recorded in [MANGROVE.md](MANGROVE.md). These checks are sampled verification, not full accessibility or Mangrove certification.
