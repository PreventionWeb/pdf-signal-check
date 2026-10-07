# Mangrove presentation migration

PDF Signal Check uses the UNDRR theme of Mangrove **2.0.0**, provisionally. Product name, PDF/profile identifiers, source ownership, local processing and optional AI consent remain independent of presentation. This is a static React 19 + Vite application using published Mangrove React modules and documented native adaptations. It does not use Drupal, Gutenberg, server hydration, analytics, cookie scripts or remote footer widgets. Historical receipts below describe earlier vanilla implementation checkpoints.

## Primary specifications

The implementation follows the [Mangrove guide](https://mangrove.undrr.org/llms.txt), [component catalog](https://mangrove.undrr.org/ai-components/index.json), [token dictionary](https://mangrove.undrr.org/tokens.json), [utilities](https://mangrove.undrr.org/ai-components/utilities.json), [editorial manual](https://mangrove.undrr.org/llms-editorial-manual.txt), and [shared-asset guidance](https://assets.undrr.org/AGENTS.md). The asset repository's GitLab commit hook applies to that repository, not this one. Application privacy requirements take precedence over the institutional analytics/footer recommendations.

| Before | After |
| --- | --- |
| Cream/olive/orange application palette with a serif tagline | Existing layout uses published UNDRR interactive, neutral, positive, warning and negative color sources. The first pass mapped old declarations and used `src/ui/theme.css` for app-specific adaptation; the consolidation below removes that layer. |
| System-font chrome and hardcoded Georgia/code faces | Local Roboto/Roboto Condensed and Mangrove semantic font roles; code uses the code role. Small labels remain readable. |
| Custom identity mark and olive/orange favicon | Blue/white product favicon, authentic UNDRR logo from the UNDRR asset library and documented four-part page-header decoration, alongside the unchanged PDF Signal Check name. No account or language features are implied. |
| Independently styled controls | Shared `src/ui/element.js` applies [button](https://mangrove.undrr.org/ai-components/components-buttons-buttons.json), select, checkbox, table and label classes across guided review, queue, calibration and exports. Dynamic state and listeners stay in their existing modules. |
| Text-based help symbols and custom input arrows | Local Mangrove SVG-mask icons with meaningful button names and 40px help targets; hover, focus, click, Escape and placement behavior remain application-owned. |
| Custom review-empty and completion presentation | Native app outcomes use Mangrove [empty-state](https://mangrove.undrr.org/ai-components/components-empty-state.json) and [notice](https://mangrove.undrr.org/ai-components/components-notice-notice.json) presentation. Status words and rule/AI attribution remain explicit. |
| Unrelated export colors | PDF headings and dedicated PNG accents/background share `PRESENTATION_BRAND.exportPalette`; captured data, original crops and inference receipts stay unchanged. |
| Potential CDN font/image requests | The theme CSS, fonts and logo load from the versioned UNDRR asset library (assets.undrr.org), which sends `Access-Control-Allow-Origin: *`. The stylesheet carries a Subresource Integrity hash, so a changed file fails closed rather than silently restyling the app. These requests carry no PDF data. |

The native privacy dialog, actual-progress bars, step navigation, queue rows, publication cards, reading-order illustration and evidence crops remain app-specific components. There is no Mangrove JavaScript initializer or global DOM observer; a view rebuild cannot add independent listeners or replace ownership/cancellation policy. Model selection still makes no download request.

## Tokens and brand boundaries

Color channels use `rgb(var(--mg-...))`; full-color exceptions such as button backgrounds, raised surfaces and modal scrims use `var(--mg-...)` directly. Fonts use `--mg-font-family-text`, `-ui`, `-display` and `-code`. Modal/help behavior uses native top-layer elements. App spacing and source geometry stay with the application; component controls use the published classes and theme radius/focus sources.

`src/brand.js` owns product strings and `PRESENTATION_BRAND`: identity, stylesheet/logo paths, browser theme color, and resolved export colors. `index.html` includes the local theme stylesheet before app styles to avoid an unstyled startup; the initialization adapter keeps its path and logo aligned with brand configuration. A theme change does not change the notice key, profile result, PDF data, queue attempt, model choice or report filename stem.

The bundled Noto Sans report font is a functional exception to Mangrove web typography. Retaining its tested embedding and Unicode/raster fallback protects report fidelity. PDF/PNG exports adopt colors, not a different font or an institutional certification mark.

## Asset loading, licenses and refresh

Since 2026-10 the theme is not copied into the repository. Earlier builds copied the CSS, fonts and logos into `public/vendor/mangrove`; that copy was removed because the files were unmodified apart from URL rewrites. `index.html` links the [UNDRR stylesheet](https://assets.undrr.org/mangrove/2.0.0/css/style.css) with `integrity` and `crossorigin="anonymous"`. `src/brand.js` (`PRESENTATION_BRAND`) holds the same stylesheet URL and the [horizontal UNDRR logo](https://assets.undrr.org/logos/undrr/undrr-logo-horizontal.svg). Fonts and icon masks resolve from the stylesheet's own absolute URLs.

| Asset | Integrity / hash |
| --- | --- |
| Stylesheet (SRI) | `sha384-Lcz+c2JptHwxCU1/elBLGALjwHMFdEOMXKTZDeAZOMhJv+GnlS9Vi9vbSSqZygIM` |
| Stylesheet (SHA-256) | `1a6c63d258c88d6d4ef2e1e0cb5318dcc6e1f0ec7716803facc0c3d91b71bb76` |

Licensing is recorded in [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md): Mangrove and Roboto use Apache 2.0, and Noto Kufi Arabic uses SIL OFL 1.1. The UNDRR logo is an institutional asset, not relicensed.

Without network access to assets.undrr.org, the app still works but loses the theme styling and fonts. The bundled Noto Sans report font in `public/fonts` stays local, because PDF exports are generated on the device.

To refresh or change version: update the URL in `index.html` and `src/brand.js`, recompute the SRI with `openssl dgst -sha384 -binary style.css | openssl base64 -A`, and update the table above. Then run the tests and build, and check desktop, mobile and the repository-prefixed URL, plus a rendered export.

For a future PreventionWeb build, point both at `style-preventionweb.css` and the PreventionWeb logo, recompute the SRI, then update `PRESENTATION_BRAND.id`, the logo alternative text and the export palette from that theme’s official tokens.

## Delivered scope and limits

The guided single-PDF flow, model controls, review/evidence, contextual help, privacy dialog, actual progress, batch controls and captured exports have a coherent Mangrove presentation. Existing detector limitations, provisional AI thresholds, privacy preference and source/cancellation protections are preserved.

Bundled Arabic fonts do not imply a translated Arabic interface, right-to-left product QA, or expanded model/PDF language support. This is not an assertion of complete Mangrove conformity or accessibility certification. The component consolidation below replaces much of that initial custom spacing/chrome. Future richer navigation or status components must preserve current semantics and compact evidence-first review.

## Verification receipt — 6 October 2026

All 153 tests passed and the production build completed; the pre-existing large-chunk warning remains. Final application assets: `index-DV7M90BA.js`, `index-CmkM5fFC.css`, `report-qsWucw0i.js`. Root and repository-prefixed cold browser checks loaded only local presentation assets. Desktop 1280px and mobile 390px reviews retained source-first identity comparisons and showed no horizontal overflow. Independent checks covered actual author mismatch, reading-order illustration, declared attachment inventory, contextual-help Escape and model/batch consent boundaries.

An actual author-14 captured PDF and dedicated PNG were downloaded from the final browser build. All five PDF pages were rendered and visually inspected: the new blue headings, unchanged source byline crop, original metadata values, source hash/profile receipt, and limitations fit without clipping or overlaps. The PNG's blue accent and neutral surface fit with no omitted layout lines. Noto embedding and the actual AI-not-run receipt remained intact.

Local QA screenshots: `/tmp/pdf-signal-mangrove-entry-desktop.png`, `/tmp/pdf-signal-mangrove-modal-desktop.png`, `/tmp/pdf-signal-mangrove-author-desktop.png`, `/tmp/pdf-signal-mangrove-final-author-mobile.png`. PDF render set: `/tmp/pdf-signal-mangrove-exports/report-{1..5}.png`; downloaded PNG: `/Users/khawkins/Downloads/14-author-mismatch-pdf-signal-check (1).png`. These are uncommitted verification artifacts, not production document data.

## Component consolidation — 6 October 2026

At the second-pass checkpoint, complete vanilla structures replaced theme classes on bespoke surfaces. The former `src/ui/patterns.js` provided explicit card/content, notice/header/description/actions and form-field/check-row constructors; it attached no listeners. Views then owned state, source handles and cancellation. The former `src/ui/element.js` applied documented control, utility and standalone `mg-details` classes. Common presentation is consolidated in `src/style.css`; the separate `src/ui/theme.css` override layer was removed.

| Before | After |
| --- | --- |
| Independently styled upload, sample, finding, identity, attachment and batch surfaces | [Vertical cards](https://mangrove.undrr.org/ai-components/components-cards-vertical-card.json) with `mg-card__vc`, `mg-card--no-link` and explicit `mg-card__content`; each control remains independently operable. |
| Notice classes without their documented children | Complete [notice](https://mangrove.undrr.org/ai-components/components-notice-notice.json) headers, titles, descriptions and actions for completed traditional checks, queue decisions and unlinked attachment declarations; no new live-alert claims. |
| Custom borders, summary arrows and disclosure padding | Published [standalone details](https://mangrove.undrr.org/ai-components/components-typography.json) and grouped `mg-accordion` from [utilities](https://mangrove.undrr.org/ai-components/utilities.json), retaining native open state and existing disclosure keys. |
| Bespoke finding category buttons | Native [segmented radio controls](https://mangrove.undrr.org/ai-components/components-forms-segmented-control.json) with a named fieldset, checked state and arrow-key navigation. Re-render restores the checked radio's focus; explicit uncertainty CTA still focuses the finding. Long mobile labels wrap at words rather than gaining tab semantics. |
| Implicit checkbox labels and custom fieldset styling | Documented sibling input/label check rows and [FormGroup](https://mangrove.undrr.org/ai-components/components-forms-formgroup.json) legends, plus form-field label/control/help structure. Download authorization policy remains unchanged. |
| Partially styled empty states and inline count spans | Full empty-state title/description/actions and published [stats cards](https://mangrove.undrr.org/ai-components/components-cards-stats-card.json) in the secondary full-evidence report. |
| Custom layout, button-like preview controls and provenance pills | Published containers, grids, flex/gap utilities, shared preview button/select controls and subtle tags. Source attribution still states rules, heuristics, actual local inference or unassessed scope. |
| Hidden home H1 left review without a visible H1 | Current guided stage has a visible H1, with primary finding H2 and source/repair H3 sections; visual sizes remain component-owned. |
| Two overlapping custom style layers | One unminified custom stylesheet: 532 lines / 19,186 bytes / 254 rule-or-at-rule blocks, down from 1,086 lines / 41,506 bytes / 506 blocks (53.8% fewer bytes, 51.0% fewer lines). Counts use source newlines, UTF-8 bytes and opening braces; the pinned upstream stylesheet is unchanged and excluded from both totals. |

Retained custom boundaries are deliberate: institutional/product identity composition; PDF upload/drag states; stage indicators and conditional workspace tracks; approximate crop/canvas/SVG geometry; readable metadata values; the two recovered reading-order sequences and anomaly arrows; native help placement/40px targets; native privacy-dialog dimensions; long source names and serialized receipts; actual-progress geometry; and small session/queue layout adaptations. Native component padding, chevrons, card surfaces, typography and common controls are no longer duplicated. This does not assert complete Mangrove conformity. Compact evidence-first layout and translated/RTL interface QA remain separate product work.

Exports did not change in this pass: report content, source crops, PDF/PNG layout, colors and embedded Noto font remain the verified first-migration implementation. The browser report-menu and captured JSON download were checked; no redundant PDF layout render was needed for unchanged export code.

### Consolidation verification

All 153 tests passed after the final presentation cleanup; the final production build completed with the existing large-chunk warning. Final assets: `index-40o1Jv6q.js`, `index-Bx4p0fZv.css`, `report-4Hs5Kvl9.js`. Desktop 1280px, mobile 390px and the `/pdf-signal-check/` preview were exercised. Actual author-14 source crop/Info/XMP, order-17 sequence, clean-control uncertainty CTA, attachment-19 declarations, optional-model costs and unapproved-download guard, and two-file retained queue outcomes were inspected. Native radio arrow keys restore checked focus; disclosure openness persists through review rerenders; contextual-help Escape returns focus; privacy preference and Escape behavior remain intact. Opening controls did not request external presentation/model assets.

Artifacts: `/tmp/pdfai-patterns-final-home-desktop.png`, `/tmp/pdfai-patterns-final-author-desktop.png`, `/tmp/pdfai-patterns-final-author-mobile.png`, `/tmp/pdfai-patterns-final-author-crop-mobile.png`, and independently checked `/tmp/pdfai-patterns-final-outline-mobile.png`. These are local verification artifacts, not production data.

Independent final review confirmed source-first identity evidence, actual order/attachment findings, native radio focus, retained disclosure state, batch download consent and local-only asset loading. The sampled author review returned zero axe violations and zero incomplete checks after the bounded heading-outline correction; this sampled result is not full accessibility certification.

## Institutional shell and catalog coverage — local implementation

This validated follow-up replaced the bespoke institutional header/footer with published component contracts. At that checkpoint no React runtime migration had started. The subsequently authorized React migration is documented below.

| Before | After |
| --- | --- |
| Decoration-only stripe followed by a custom institutional header | Full [PageHeader](https://mangrove.undrr.org/ai-components/components-pageheader.json): decoration, toolbar wrapper, container, toolbar region and logo block. The documented `showAccount=false` and `showLanguage=false` variant omits unused controls. Product identity/privacy remain a separate utility row. |
| Blue logo on a custom white surface | Official white horizontal logo in the published dark toolbar, bundled locally as `toolbar-logo.svg`. Published Logo/autocrop classes and native dimensions are preserved. One narrow focus-visible rule restores the logo-anchor ring suppressed by upstream toolbar CSS. |
| Application footer built only from layout utilities | Published [Footer](https://mangrove.undrr.org/ai-components/components-footer.json) with `enableSyndication=false`, and site-specific children using the upstream `mg-footer-bar`, row/text/link structure. No external widget or analytics initializer. |
| Custom two-column introductory heading | Published [Hero](https://mangrove.undrr.org/ai-components/components-hero-hero.json), contained and without an image, with title/summary and real upload/sample links. The deprecated ChildHero was deliberately avoided. |
| Plain device-processing label and indeterminate progress bar | Neutral [StatusLabel](https://mangrove.undrr.org/ai-components/components-status-label.json) and a named [Loader](https://mangrove.undrr.org/ai-components/components-loader.json) for unknown preparation. Determinate progress still reports actual completed/total units. |
| Separate gallery selection/action and a plain scope callout | Published [FormAction](https://mangrove.undrr.org/ai-components/components-forms-form-action.json) joins example selection to its Analyze action; [HighlightBox](https://mangrove.undrr.org/ai-components/components-highlightbox.json) presents the scope caveat. |
| 532 lines / 19,186 bytes / 254 custom blocks | 521 lines / 18,332 bytes / 238 blocks. Common shell/intro/footer rules were removed; the necessary logo keyboard ring was added. Source counts exclude unchanged pinned upstream CSS. |

The footer's generic “do not omit elements” guidance applies to the selected variant. Its published `enableSyndication=false` option and [source implementation](https://raw.githubusercontent.com/PreventionWeb/undrr-mangrove/main/stories/Components/Footer/Footer.jsx) render a `footer.mg-footer` with provided site children, without a syndicated container/script. The footer-bar structure is defined in the [upstream footer stylesheet](https://raw.githubusercontent.com/PreventionWeb/undrr-mangrove/main/stories/Components/Footer/footer.scss). Header show/hide options preserve all required brand wrappers; their [source implementation](https://raw.githubusercontent.com/PreventionWeb/undrr-mangrove/main/stories/Components/PageHeader/PageHeader.jsx) confirms those conditions.

### Visible-surface coverage audit

| Visible surface | Actual component/pattern or justified custom boundary |
| --- | --- |
| Institutional identity | PageHeader + Logo; exact required wrappers and four stripe segments. |
| Product/privacy utility row | Published container, footer-bar row layout, subtle Tag, neutral StatusLabel and Button; no fictional institutional navigation slot. |
| Opening orientation | Hero, no-image/contained variant; functional upload/sample anchors. |
| Footer/attribution | Footer without syndication, with official footer-bar children; local static credit links. |
| Single-document upload/drop | Native file input/label plus Card and Icon. Catalog has no file-upload/drop-zone component; PDF admission/drag state remains application-owned. |
| Samples/gallery | Cards, Buttons, native Details and Select/FormAction. Analyzer state, sample bytes and manifest labels stay separate. |
| Guided process stages | Native ordered list and `aria-current=step`. Catalog has no wizard-stepper; breadcrumbs would imply a false page hierarchy. |
| Preparation/actual progress | Loader for unknown preparation; native progress for measured units. Catalog has no determinate-progress component. |
| Completed checks / queue decisions | Complete Notice header/title/description/actions; explicit profile scope and severity words. |
| Profile/model execution receipt | Text and subtle Tags with native Details; these receipt facts are not publication/editorial workflow statuses. |
| Finding category choice | Named native SegmentedControl radio group, with checked state and keyboard focus restoration. |
| Finding / identity / attachment / retained queue surfaces | Non-linked VerticalCards with explicit content children; controls are independent, not stretched card links. |
| No-problem/empty groups | Complete EmptyState title/description/actions and uncertainty CTA. |
| Model/configuration/consent controls | FormField, FormGroup, Checkbox and Select; optional network/download authorization remains in app policy. |
| Model tradeoffs / advanced check counts | Table with scroll-region utility and StatsCard; source receipts remain truthful and readable. |
| Disclosure/advanced evidence navigation | Standalone Details and grouped Accordion; native open state plus app disclosure keys. |
| Action rows / provenance badges / evidence controls | Buttons, Tags, Icons and published flex/gap utilities. Labels distinguish actual inference, rules, heuristics and unassessed scope. |
| Publication crop / page preview / SVG overlays | Custom source geometry, using component buttons/selects. No catalog component understands PDF coordinates, selection epochs or rendering disposal. |
| Reading-order comparison | Custom two recovered sequences, omission/uncertainty caveats and actual anomaly arrows. A generic gallery/tree would change the evidentiary meaning. |
| Privacy information modal | Native dialog with component typography/check/button controls. Catalog has no modal; existing Escape/focus/preference policy is retained. Drawer is a different interaction with its own lifecycle, not a modal substitute. |
| Interactive contextual help | Native popover plus Icon/Button/typography. Catalog has no tooltip/popover; help contains reachable external references, so it must not be a hover-only tooltip. |
| Calibration / raw receipts / export menu | Existing worker-owned calibration, native Details, Buttons and code font role. No new PDF/export generation or model execution behavior. |
| Captured PDF/PNG | Existing separate report layouts and shared export palette/Noto embedding; web component DOM does not control captured-report layout. |

The new toolbar logo is sourced from [the official horizontal SVG](https://assets.undrr.org/logos/undrr/undrr-logo-horizontal.svg), 26,830 bytes, SHA-256 `c48d269fc01cf87c8e89356f6bd404ba1d1df6f6c48a73ccdecc7dc2f7f92e80`. The manifest now has 63 records, all hashes verified. Existing logo usage guidance continues to apply. `PRESENTATION_BRAND` selects the toolbar logo and its dimensions/crop; the refresh script preserves its source. A future PreventionWeb build must deliberately choose a suitable toolbar logo, update both logo aliases/brand settings and review contrast/crop, in addition to swapping the theme bundle.

Shell verification: 153 tests and build passed (`index-D-GJEezr.js`, `index-D1584CCW.css`, `report-CSU0Gt5b.js`). Desktop 1280px and mobile 390px repository-prefixed startup displayed the real header/Hero, no horizontal overflow and no external asset requests. Independent review verified the header/footer, real Hero anchors, gallery analysis, author crop and provenance, reading-order comparison, attachment declarations, two-file queue, help/privacy Escape and focus. The product utility row is a named landmark. Home accessibility sampling found zero violations and one contrast item needing manual review on the official Hero gradient; it was visually reviewed, not certified. Screenshots: `/tmp/pdfai-shell-home-desktop.png`, `/tmp/pdfai-shell-final-home-mobile.png`, `/tmp/pdfai-shell-footer-desktop.png` and `/tmp/pdfai-shell-footer-mobile.png`. React UI migration was then authorized as the next step; this records the validated shell checkpoint, not a completed React migration or full Mangrove conformity.

## React UI migration — 6 October 2026

| Before | After |
| --- | --- |
| DOM entry rebuilds and separate view constructors | React 19 root and declarative App, Review, BatchPanel, CalibrationPanel and ExportMenu; obsolete DOM entry/views removed. |
| Shell markup implemented from catalog | Actual published PageHeader, Footer with `enableSyndication={false}`, and Hero React modules, with local identity assets. |
| Shared vanilla controls | Published Checkbox, Select, SegmentedControl, FormGroup, Notice, Loader, HighlightBox and FormAction modules. |
| UI-bound worker/export state | DOM-free cached external stores subscribed with `useSyncExternalStore`; explicit source/generation guards, cancellation and reusable mount/dispose. |
| Full page UI owned by imperative preview | React controls/status/layout around an isolated canvas/SVG PreviewSession. Source crops remain independently canceled and disposed. |

React and React DOM are pinned to 19.3.0, Mangrove to 2.0.0, Vite to 8.3.2 and its React plugin to 6.1.2. Dependencies were installed with lifecycle scripts disabled. Direct component subpaths are used because this Mangrove package has no root entry point. Package JSX uses React 19 element identity; hooks share the app React runtime.

The component catalog does not imply every package API accepts arbitrary app content. Mangrove CtaButton renders links, so disabled/Space-operable actions remain native React buttons with published classes. VerticalCard accepts string data rather than arbitrary children, so evidence/canvas/multi-control cards use the documented no-link/content structure in a composable React adapter. EmptyState, Icon, Details and Accordion are CSS-only patterns. Native measured progress, file input, ordered workflow navigation, privacy dialog and interactive help popovers retain the functional-fit exceptions in the coverage table above. Help uses a React portal to avoid nesting block content inside publication headings/paragraphs. No global widget or component initializer is imported.

Single-source state preserves stable finding IDs through model reruns. Original source identity and deterministic acceptance are unchanged; model selection is separate from actual inference. Batch scheduling retains one owner across stage changes. Constructors do not download models or create workers. StrictMode setup/cleanup/setup is supported through reusable controllers, cancellation, scoped listeners and stale-callback guards. Model bootstrapping failures preserve traditional results. Downloads capture a fixed report/source snapshot.

Verification: 173 tests across 20 files pass. Controller tests cover explicit start, cached subscriptions, remount, stale sample/digest/worker results, synchronous worker failures and captured export identity. Desktop and 390px browser checks cover identity source crops, order diagrams, canvas inspection/zoom/overlays, native radio keys, help and privacy Escape. Actual pinned MiniLM WASM inference completed; title remained rules-only while subject/keyword records prove inference. Downloaded PDF pages 1–5 and PNG were rendered and visually inspected; JSON captured stable source identity. Independent final production receipts follow below. This is a React migration with explicit adapters, not a claim of complete Mangrove conformity or completed Arabic UI support.

Final React receipt: root verified all 173 tests / 20 files, build and clean diff on `index-BVsiThlc.js`, `index-D1584CCW.css`, `report-BjZ-RG9j.js` and `benchmark.worker-DKgflZps.js`. Custom CSS remains 521 lines / 18,332 bytes; this React pass adds no styling layer. Source was conventionally formatted and the parallel legacy DOM views removed. The standard large-chunk warning remains for parser/runtime/report bundles; the main app is approximately 890 kB uncompressed and 273 kB gzip, with heavyweight report generation in a separate lazy chunk.

Artifacts: `/tmp/pdfai-react-author-desktop.png`, `/tmp/pdfai-react-author-mobile.png`, `/tmp/pdfai-react-final-order-mobile.png`, `/tmp/pdfai-react-order-preview-mobile.png`; rendered downloads at `/tmp/pdf-signal-react-qa/reading-order-report.pdf`, `report-page-1.png` through `report-page-5.png`, and `reading-order-summary.png`. Real Pages-prefix processing uses local worker/font/PDF assets. Model assets are requested only through an explicit screening/device-test action; PDF contents remain local.

Independent final review on BVsiThlc verified unsupported German remains unassessed/rules-only, actual MiniLM per-check provenance, no-metadata identity evidence, attachments 19/20, two-file queue retention, profile independence and mobile overflow/local resources. Diagram-focused artifact: `/tmp/pdfai-react-final-order-diagram-mobile.png`. A final attachment report PDF was downloaded and its rendered first page reviewed at `/tmp/pdfai-react-final19.pdf`. Device workload completion and cancellation were exercised on both development and prefixed production URLs after correcting fixture URLs to use an explicit site base. A final one-line context correction hides the previous single-PDF filename on the batch screen.

Final delivered assets after the filename-only batch-context correction are `index-eubInDrY.js`, `index-D1584CCW.css`, and `report-2DwsKV7D.js`. Comprehensive independent browser verification above used BVsiThlc; the final correction was checked separately in the development browser after loading author14, returning to Document, and opening Batch: heading “Review several PDFs” has no stale single-source filename. The production build passes; no engine/profile/inference policy changed.

## Mangrove 2.0 and Editorial Manual alignment

A subsequent alignment pass eliminated custom boilerplate and brought presentation and copy closer to Mangrove 2.0 published contracts and the UNDRR Editorial Manual:

1. **Published `StatsCard` Adoption**: Replaced hand-crafted `<div className="mg-stats-card"><div className="mg-grid mg-grid__col-3">...<article className="mg-card mg-stats-card-item">...` in `src/review/AdvancedReport.jsx` with Mangrove's published `StatsCard` component (`@undrr/undrr-mangrove/components/StatsCard.js`), cutting manual markup, and added an explicit descriptive `aria-label="Profile summary statistics"` attribute.
2. **Standardized `Tag` and `EmptyState` Components**: Added `<Tag>` in `src/ui/react.jsx` supporting `.mg-tag`, `.mg-tag--subtle`, and color variants, replacing ad-hoc `<span>` elements across headers and receipts. Enhanced `<EmptyState>` with a configurable `headingLevel` prop (`h2`/`h3`) to guarantee heading hierarchy.
3. **Accessible Table Markup & Font Utility**: Upgraded the model tradeoffs table to use standard accessible column scopes (`<th scope="col">`) and Mangrove's `mg-u-font-size-200` utility, removing custom `.model-tradeoffs` CSS.
4. **Style Consolidation & Dead Code Pruning**: Removed obsolete legacy selectors from the pre-React DOM era (`.review-status`, `button.review-status`, `.review-scope`, `.review-action`, `.model-result-identity`, `.review-counts`, `.selected-file`, `#status`, `.model-progress`, `.paired-examples`, `.summary-comparison`, `.verdict-row`). Custom CSS decreased to 442 lines / 15,640 bytes (down from 521 lines / 18,332 bytes).
5. **Editorial Manual Alignment**:
   - British English spelling rule: Oxford `-ize` with mandatory `-yse` for *analyse*, *analyser*, *analysed*, and *analysis*. Updated UI, document, and test copy across `index.html`, `App.jsx`, `Review.jsx`, `AttachmentInventory.jsx`, `findings.js`, `provenance.js`, `attachments.js`, and `catalog.js`.
   - UNDRR grammar rule: *data is plural* ("the data show", "data are"). Corrected `PrivacyNotice.jsx` ("no PDF data are saved with it") and `batch/controller.js` ("no data were saved").
   - Case & colon conventions: Maintained sentence-case buttons and headings with lowercase after colons where applicable.


## Information hierarchy — 7 October 2026

Following the independent Astra information-architecture review, the intake page leads with upload and three matched sample cards. Setup selects a model with Mangrove radio cards first, then offers an optional benchmark of that selected model. The full feature matrix remains supporting detail; no model download starts from simply selecting an option. Confirmed settings and synthetic timings remain browser-local preferences.

| Before | After |
| --- | --- |
| Separate check-results and evidence screens | One results workspace, including AI progress and recovery alongside completed text findings. |
| Scope exclusions and uncertain evidence mixed with problems | Detected concerns, human review, tool limits and successful checks have separate inventories. AI coverage is separate again. Formal profile acceptance and raw records remain unchanged. |
| First finding opened before the inventory; guidance below evidence | Visible inventory with page/type/review state, explicit selection, next/previous near the heading, and next actions before comparisons/crops. Full PDF context is optional. |
| MiniLM benchmark before choosing any model | Model-first choice cards and optional selected-model benchmark. A no-AI choice remains last and explicit. |
| Report download hidden with equal competing formats | Primary PDF report action, secondary PNG/JSON formats, and visible session lifetime. PDF/PNG profile wording distinguishes defects from unestablished checks. |
| Raw binary profile and five count classes in batch rows | Compact detected-concern, human-review and tool-limit counts; raw profile retained in technical details. Queue cleanup/download management is secondary. |

Verification: 205 tests passed; production build passed with the existing large-chunk warning. Actual MiniLM calibration and PDF inference completed; missing-language recovery required an explicit English assumption. Desktop and 390px mobile reviews and the repository-prefixed production URL were checked. Independent normal-user review covered fresh no-AI setup, all three samples, saved settings and a two-PDF batch; its empty-inventory feedback was implemented. Mobile results had no horizontal page overflow and axe reported zero WCAG A/AA violations; decorative reading-order arrows still require manual contrast assessment. Captured PDF and PNG exports were downloaded and visually inspected. Local artifacts are `/tmp/pdf-signal-ia-final-report.pdf`, `/tmp/pdf-signal-ia-final-summary.png`, and `/tmp/pdf-signal-ia-final-export-*.png`.

## Intake and setup refinement — 7 October 2026

| Before | After |
| --- | --- |
| Saved settings and configuration button above redundant selection instructions | Short capability description above the uploader; current model and Settings action below it. Batch entry is a compact secondary action. |
| Long “Same report, three ways” introduction | “Try a sample” with a short explanation and the same three preparation cards. |
| Radio cards plus collapsed feature comparison | Always-visible product comparison, with model selection in the column headers and the selected column highlighted. |
| Saved setup could only be replaced | Reset saved setup revokes future download consent, clears model/check preferences and per-model speed receipts, and restores first-use setup. Cached model files and current document evidence are retained. |

Reset refuses to run during analysis, inference, calibration or an active batch. It also releases deferred intake and reports storage-clear failures honestly. Verification: 207 tests passed, production build passed, desktop/mobile matrix selection and reset were exercised in-browser, and reload after reset reopened first-use setup. Mobile document/dialog widths stayed within the viewport; only the comparison table scrolls horizontally. The repository-prefixed production intake loaded successfully. No PDF export rendering changed.

## Model recommendation and progress — 7 October 2026

| Before | After |
| --- | --- |
| MiniLM selected first in new/reset setup | Granite R2 selected first and recommended for its 52-language coverage. Saved choices remain intact; MiniLM is the compact English option for smaller downloads, slower devices or high-volume processing. No AI is a last-resort fallback. |
| Native progress used the accent token | Native download/processing progress uses the same Mangrove interactive primary token as primary buttons. |

Verification: 208 tests passed and build passed. Browser inspection confirmed Granite's default selection and correct reordered feature values. During an actual MiniLM benchmark, the computed progress colour and primary button background both resolved to `rgb(0, 79, 145)`. Benchmark ratings remain model-specific; no Granite speed result is inferred from MiniLM timings.

## Secondary controls and first-visit notice — 7 October 2026

| Before | After |
| --- | --- |
| Long visible benchmark methodology and receipt text | Compact, initially closed Benchmark details disclosure; result, speed bars and download costs stay visible. |
| PNG export and secondary formats hidden in a disclosure | Primary PDF and secondary JSON buttons; PNG download removed from the interface. |
| Privacy/version/local-processing controls in the header; initial notice absent | Plain footer text and privacy link. The notice opens automatically unless Don’t show again was saved. |

Browser verification covered first-visit display, saved suppression across reload, manual reopening from the footer, keyboard disclosure operation, JSON download, repository-prefixed intake/results, and 390px viewport width. Build and all 212 tests passed.

## Visible AI recovery — 7 October 2026

AI attempts that cannot compare selected fields now show per-check reasons and next steps in the results workspace. Empty metadata, insufficient tagged section evidence and bounded input limits are distinguished from worker failures. Failed reruns show their message/error reference even when a previous successful AI receipt is retained; source changes clear the latest attempt. Repeated no-input runs explicitly explain that unchanged inputs will give the same result.

An untagged-input bug was fixed: content-stream opening text lacked its page reference and was filtered out by the bounded first-two-page evidence policy. The fix preserves that bound and all deterministic profile outcomes. Four new tests cover actual input eligibility/inference, no-input explanations without model loading, failed reruns retaining prior inference, stale callbacks, and actionable skipped results. All 212 tests passed. Browser verification used four-page untagged synthetic PDFs: empty comparison metadata produced visible reasons, while a subject description produced actual MiniLM inference. Results accessibility audit reported zero violations. Build passed with the existing chunk-size warning.

## Intake tabs — 7 October 2026

Your PDF and Try a sample use the pinned horizontal Tab rail, scroll, list and panel structures. `src/ui/Tabs.jsx` adapts the published pattern to React-owned interactive content because the package Tab accepts HTML strings. No Mangrove DOM initializer runs. Native buttons implement tab/tabpanel relationships, roving focus, Left/Right and Home/End selection; Settings and batch remain independent actions.

The evidence preview uses the existing documented native-dialog adaptation with bundled Mangrove controls, theme surface/radius/scrim tokens, responsive dimensions and native focus containment. It replaces the inline expanding preview without changing PDF rendering ownership.

The technical analysis record now uses the pinned `.mg-accordion > details > summary + div` typography accordion pattern. Native disclosure behavior retains keyboard operation and does not add a script or change report ownership.

The fix list uses native buttons with `aria-current` inside Fix / Check sections, with a native `details` for Couldn’t check. The selected item never relies on colour alone: it has a border, a background and `aria-current`. The Technical evidence drawer is a native modal `dialog` docked to the inline end, following the `PreviewDialog` focus and scroll-lock pattern. Results and technical record use the shared `Tabs` adapter. On/off view options use the native `mg-switch` markup via the `Switch` adapter in `src/ui/react.jsx` (a checkbox with `role="switch"`).

The publication-metadata advisory findings inside the technical record use a grouped native Mangrove accordion with one content wrapper per disclosure.

### Results hero

`src/review/ResultHero.jsx` uses the native `mg-hero` split/contained markup in a single column: the count headline, filename, scope sentence and report downloads. This adaptation keeps React text escaping, a focusable outcome H1 and native action buttons; the published Hero exposes raw HTML title/summary/media and anchor actions. No generated bitmap or remote asset is required. Brand colour is consistent across outcomes; the finding notices retain their independent severity colours.

### Project mega menu

`SiteNavigation.jsx` uses the published pinned MegaMenu, including desktop mega panels and the progressive mobile sidebar. Its local SVG wordmark carries the project title/tagline. Native local-action interception maps documented anchor targets to existing controller flows; the published component owns hover, keyboard behavior, mobile focus trapping and disclosure state. Scoped adaptations hide desktop items on mobile and place panels below the taller wordmark. No external navigation initializer, fonts or assets are added.
