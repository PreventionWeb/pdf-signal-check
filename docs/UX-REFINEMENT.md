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
| View rebuilds could collapse open detail controls. | A shared, source-independent disclosure-state helper preserves explicit choices, and batch summaries have stable focus IDs. An active export keeps its menu open so cancellation/status stay reachable. (`src/view-state.js`, views) |
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
