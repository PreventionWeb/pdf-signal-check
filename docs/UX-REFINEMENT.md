# Results-first UX refinement

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
