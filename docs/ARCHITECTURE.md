# Architecture and ownership

The application is a static browser client. PDF bytes, extracted text, model inputs and analysis records stay in the browser unless the user downloads a record. Site assets and explicitly requested model/runtime assets can require network requests. GitHub Pages needs no application server or API key.

## Module boundaries

| Boundary | Responsibility | Refactor constraint |
| --- | --- | --- |
| `src/engine` | One-document structural checks, metadata rules, bounded advisories and semantic policy | Keep profile acceptance independent of optional inference, preview and user review annotations. |
| `src/engine/attachments.js` | Bounded file-declaration inventory and unresolved payload context | Never decode or return attachment contents. Keep active declarations separate from possible remnants; incomplete inventory prevents acceptance. |
| `src/analysis.worker.js` | Run one document off the UI thread and emit observed page progress | Dispose the worker per document; do not decode every queued file at admission. |
| `src/runtime` and `src/model.worker.js` | Build bounded screening requests and own the selected encoder | Reuse the same model across sequential jobs; cancellation terminates work and invalidates request identity. Do not silently substitute models. |
| `src/batch/queue.js` | DOM-free scheduling, admission, attempts, configuration snapshots and recovery | Inject analysis, screening, hashing, disposal and observation services. Exactly one active item; pause finishes the current file and stop cancels it. |
| `src/batch/report-store.js` | Estimate serialized detail size and retain independent report copies | A serialized-byte budget is not a RAM cap. Never evict details without an explicit user choice. |
| `src/batch/client.js` | Adapt worker requests to the queue's service and AbortSignal contract | Cancellation must settle pending promises and stop workers. Old callbacks must not update newer attempts. |
| `src/app/controller.js` and `src/review` | Navigation, normalized findings, source-edit guidance and session review annotations | Display concerns first; keep success, uncertainty and unassessed scope distinct. Reviewed does not mean fixed. |
| `src/help` and `src/review/provenance.js` | Local term explanations and recorded finding-source labels | Opening help must not start inference or asset downloads. Infer AI attribution from completed per-check execution, never model selection alone. |
| React component state and stable finding IDs | Preserve disclosure choices and review position across ordinary rerenders | Reset source-specific review state only when source identity changes; browser-native disclosures do not own PDF data. |
| `src/brand.js` and `src/ui` | Product identity, pinned Mangrove adaptation, published React components and composable native adaptations and export palette | Presentation is separate from stable repository/profile/preference identifiers and analysis state. Local assets only; component classes never take ownership of workers or PDF data. |
| `src/evidence/Preview.jsx`, `preview-session.js` and `src/evidence` | Full-page inspection and independent bounded source crops | Render the original File; use the full viewport transform, trustworthy geometry and explicit unavailable states. |
| `src/export` | Capture and generate PDF, dedicated PNG and detailed JSON records | Export one fixed report/source snapshot. Preview state or later inference must not relabel an export. |
| `src/calibration` and `src/evaluation` | Fixed-workload resource measurements and labeled semantic evaluation | Device timing is separate from detection accuracy. Keep cache/RAM unknowns and small-corpus limits visible. |
| `src/main.jsx` and `src/app/App.jsx` | React root, declarative guided surfaces and controller subscriptions | Keep policy DOM-free; StrictMode cleanup must cancel resources and permit a fresh mount. Completed batch reports are detached presentation copies. |
| `src/batch/controller.js`, `src/calibration/controller.js`, `src/export/controller.js` | Cached observable stores and explicit resource ownership | Constructors do not start work. Controllers settle cancellation and ignore stale generations; React panels subscribe and render. |

## Identity and lifetime

Queue IDs identify session items even when filenames repeat. Attempt epochs and worker request nonces reject late messages. Original-byte SHA-256 receipts identify source data when hashing is available; they do not validate publication content. Requested model/check settings and actual completed inference provenance are separate fields.

Only one document analysis and one inference request run at a time. A warm batch encoder may span completed files; stopping, clearing or switching ownership must dispose it. Device benchmarking owns a separate encoder and cannot overlap PDF screening. Preview and crop documents/canvases have their own cancellation and pixel limits.

Full reports are bounded by estimated UTF-8 JSON size, with one explicitly identified pending report allowed while scheduling pauses at budget pressure. Copies, source File handles, parsed documents, canvases and model/runtime heaps are additional allocations. Browser garbage collection and total RAM are not controlled by this estimate. Releasing details keeps compact outcomes but deliberately removes recoverable full evidence; it requires an explicit choice.

Queue state and document review annotations are foreground, in-session data. Reloading or closing the tab loses them. The app does not promise background execution, persistent source access or resumable parser/model state. The existing notice preference is separate from document storage.

## Verification boundaries

Pure policy and queue tests establish deterministic scheduling and outcome behavior. Worker-adapter tests exercise termination, settlement and stale-message handling. Browser runs establish actual WASM inference, queue reuse, cancellation and Pages-path behavior. PDF exports must also be downloaded, rendered and visually inspected; text extraction alone cannot establish layout or crop fidelity.

The recorded model evaluation is a small synthetic development/held-out corpus. Its false support and abstention observations do not establish real-world accuracy, universal reading order, hallucination prevention or tuned thresholds. See [profile scope](PROFILE.md), [evaluation limits](EVALUATION.md), and [validation receipts](VALIDATION.md).

Presentation uses the published Mangrove React modules through `src/ui/react.jsx` and direct shell imports. Native action buttons, composable no-link cards, disclosures, empty states, dialog and popover use documented CSS structures where the package has no fitting React API. React owns controls, state and layout; only canvas/SVG geometry and parser resource lifetimes are imperative in `preview-session.js`. The former DOM entry/view constructors were removed. `src/style.css` retains PDF geometry and workflow layout. See [the React migration](MANGROVE.md#react-ui-migration--6-october-2026).
