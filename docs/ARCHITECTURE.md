# Architecture and ownership

The application is a static browser client. PDF bytes, extracted text, model inputs and analysis records stay in the browser unless the user downloads a record. Site assets and explicitly requested model/runtime assets can require network requests. GitHub Pages needs no application server or API key.

## Module boundaries

| Boundary | Responsibility | Refactor constraint |
| --- | --- | --- |
| `src/engine` | One-document structural checks, metadata rules, bounded advisories and semantic policy | Keep profile acceptance independent of optional inference, preview and user review annotations. |
| `src/engine/attachments.js` | Bounded file-declaration inventory and unresolved payload context | Never decode or return attachment contents. Keep active declarations separate from possible remnants; incomplete inventory prevents acceptance. |
| `src/engine/figures.js` | Bounded Figure-tag/alternate-text presence advisories and graphic associations; no pixel interpretation or profile acceptance changes. | Keep description presence separate from its semantic quality. |
| `src/analysis.worker.js` | Run one document off the UI thread and emit observed page progress | Dispose the worker per document; do not decode every queued file at admission. |
| `src/runtime` and `src/model.worker.js` | Build bounded screening requests and own the selected encoder | Reuse the same model across sequential jobs; cancellation terminates work and invalidates request identity. Do not silently substitute models. |
| `src/batch/queue.js` | DOM-free scheduling, admission, attempts, configuration snapshots and recovery | Inject analysis, screening, hashing, disposal and observation services. Exactly one active item; pause finishes the current file and stop cancels it. |
| `src/batch/report-store.js` | Estimate serialized detail size and retain independent report copies | A serialized-byte budget is not a RAM cap. Never evict details without an explicit user choice. |
| `src/batch/client.js` | Adapt worker requests to the queue's service and AbortSignal contract | Cancellation must settle pending promises and stop workers. Old callbacks must not update newer attempts. |
| `src/app/controller.js` and `src/review` | Navigation, normalized findings, source-edit guidance and session review annotations | Display concerns first; keep success, uncertainty and unassessed scope distinct. Reviewed does not mean fixed. |
| `src/app/SetupDialog.jsx` | Native modal setup over a shared intake page; controller holds pending file/sample selection in memory until explicit setup completion. | Cancellation releases pending intake and stops calibration; help popovers stay inside the dialog’s accessible subtree. |
| `src/help` and `src/review/provenance.js` | Local term explanations and recorded finding-source labels | Opening help must not start inference or asset downloads. Infer AI attribution from completed per-check execution, never model selection alone. |
| React component state and stable finding IDs | Preserve disclosure choices and review position across ordinary rerenders | Reset source-specific review state only when source identity changes; browser-native disclosures do not own PDF data. |
| `src/brand.js` and `src/ui` | Product identity, pinned Mangrove adaptation, published React components and composable native adaptations and export palette | Presentation is separate from stable repository/profile/preference identifiers and analysis state. Local assets only; component classes never take ownership of workers or PDF data. |
| `src/evidence/Preview.jsx`, `preview-session.js` and `src/evidence` | Full-page inspection and independent bounded source crops | Render the original File; use the full viewport transform, trustworthy geometry and explicit unavailable states. |
| `src/evidence/GoGoViewer.jsx` and locally bundled PDF-A-go-go | Isolated same-origin sample context viewer; the processing-time viewer is removed. Pass only a local object URL; validate frame origin/source, dispose source/instances on replacement and unmount. This renderer does not own findings or profile acceptance. |
| `src/export` | Capture and generate PDF, dedicated PNG and detailed JSON records | Export one fixed report/source snapshot. Preview state or later inference must not relabel an export. |
| `src/calibration` and `src/evaluation` | Fixed-workload resource measurements and labeled semantic evaluation | Device timing is separate from detection accuracy. Keep cache/RAM unknowns and small-corpus limits visible. |
| `src/main.jsx` and `src/app/App.jsx` | React root, declarative guided surfaces and controller subscriptions | Keep policy DOM-free; StrictMode cleanup must cancel resources and permit a fresh mount. Completed batch reports are detached presentation copies. |
| `src/batch/controller.js`, `src/calibration/controller.js`, `src/export/controller.js` | Cached observable stores and explicit resource ownership | Constructors do not start work. Controllers settle cancellation and ignore stale generations; React panels subscribe and render. |

## Identity and lifetime

Queue IDs identify session items even when filenames repeat. Attempt epochs and worker request nonces reject late messages. Original-byte SHA-256 receipts identify source data when hashing is available; they do not validate publication content. Requested model/check settings and actual completed inference provenance are separate fields.

Only one document analysis and one inference request run at a time. A warm batch encoder may span completed files; stopping, clearing or switching ownership must dispose it. Device benchmarking owns a separate encoder and cannot overlap PDF screening. Preview and crop documents/canvases have their own cancellation and pixel limits.

Full reports are bounded by estimated UTF-8 JSON size, with one explicitly identified pending report allowed while scheduling pauses at budget pressure. Copies, source File handles, parsed documents, canvases and model/runtime heaps are additional allocations. Browser garbage collection and total RAM are not controlled by this estimate. Releasing details keeps compact outcomes but deliberately removes recoverable full evidence; it requires an explicit choice.

Queue state and document review annotations are foreground, in-session data. Reloading or closing the tab loses them. The app does not promise background execution, persistent source access or resumable parser/model state. The notice preference and per-model synthetic device benchmark receipts persist in local storage, separately from document storage. Device receipts expire after 30 days and are invalidated when browser or pinned model settings change. Confirmed model/check settings and their download consent persist separately in local storage; an unknown or changed pinned model configuration requires setup again. Reload restores configuration without starting workers or downloads. PDF evaluation state and document-specific language assumptions remain session-only.

## Verification boundaries

Pure policy and queue tests establish deterministic scheduling and outcome behavior. Worker-adapter tests exercise termination, settlement and stale-message handling. Browser runs establish actual WASM inference, queue reuse, cancellation and Pages-path behavior. PDF exports must also be downloaded, rendered and visually inspected; text extraction alone cannot establish layout or crop fidelity.

The recorded model evaluation is a small synthetic development/held-out corpus. Its false support and abstention observations do not establish real-world accuracy, universal reading order, hallucination prevention or tuned thresholds. See [profile scope](PROFILE.md), [evaluation limits](EVALUATION.md), and [validation receipts](VALIDATION.md).

Presentation uses the published Mangrove React modules through `src/ui/react.jsx` and direct shell imports. Native action buttons, composable no-link cards, disclosures, empty states, dialog and popover use documented CSS structures where the package has no fitting React API. React owns controls, state and layout; only canvas/SVG geometry and parser resource lifetimes are imperative in `preview-session.js`. The former DOM entry/view constructors were removed. `src/style.css` retains PDF geometry and workflow layout. See [the React migration](MANGROVE.md#react-ui-migration--6-october-2026).

Single-file UI screening attempts record running, completed, not-run, failed and canceled states separately from retained report inference. Failed reruns preserve earlier completed model receipts; their latest failure remains visible even when those receipts exist. Source replacement clears attempt state and request epochs still reject stale callbacks. Semantic no-input outcomes carry per-check reasons without claiming model execution. Untagged opening blocks include page references so bounded opening evidence is eligible for comparison.

The results interface loads on demand through `src/review/ReviewLoader.jsx`; its PDF.js rendering dependencies are absent from the intake startup bundle. The app controller retains the report while loading or recovering from an interface asset failure. Intake tabs use Mangrove 2.0 horizontal rail/panel markup with React-owned selection, keyboard focus and panel content; the published Tab component accepts HTML strings and cannot own these interactive panels. Inactive sample panels are unmounted, canceling pending preview fetches. Settings remains a modal action and batch review a separate workflow.

The review inbox is presentation-owned. Its initial item is pinned to the existing controller cursor, and reviewed markers remain controller-owned session annotations. The two panes have independent desktop scrolling; mobile uses a bounded list and document scrolling for analysis. While inference runs, the completed-result subtree stays mounted but hidden/inert, preserving export snapshots and review state. A separate visible waiting surface owns progress/cancel presentation; it does not own the worker.

Evidence inspection opens `src/evidence/PreviewDialog.jsx` as a native top-layer modal. The review pane and cursor stay mounted. Closing or unmounting releases the preview session and restores focus to the triggering button without scrolling the review page; source bytes and report outcomes remain unchanged. Page-location actions are visible rather than collapsed.

Reading-order review uses the evidence preview modal with the logical-order overlay enabled initially. Numbered regions and an accessible recovered-text list use the report’s actual tag-tree sequence; missing tags and unsupported locations remain unavailable. Heading/text AI findings are grouped into one presentation task, retaining the original member findings and per-member reviewed annotations. Normalization, profile outcomes and exports remain independent of this grouping.

The embedding runner wraps Transformers.js’s supported env.fetch hook for model assets. Pending response headers and streamed bodies time out after 30 seconds without data. Progressing downloads reset that idle timer; completed requests clear it. Asset failures retain model-init recovery codes through the worker and controller. This adds no downloads or document transfers, and consent rules are unchanged.

`FigureContext.jsx` presents source crops and saved descriptions before correction guidance. Figure-only full-page context uses the crop service’s independent lifecycle and pixel limits and never invents a figure rectangle. Generic irrelevant previews remain omitted. `SiteNavigation.jsx` maps local menu actions to existing controller/modal owners; the entry source tab is UI state owned by App.
