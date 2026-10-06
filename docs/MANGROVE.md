# Mangrove presentation migration

PDF Signal Check uses the UNDRR theme of Mangrove **2.0.0**, provisionally. Product name, PDF/profile identifiers, source ownership, local processing and optional AI consent remain independent of presentation. This is a static React 19 + Vite application using published Mangrove React modules and documented native adaptations. It does not use Drupal, Gutenberg, server hydration, analytics, cookie scripts or remote footer widgets. Historical receipts below describe earlier vanilla implementation checkpoints.

## Primary specifications

The implementation follows the [Mangrove guide](https://mangrove.undrr.org/llms.txt), [component catalog](https://mangrove.undrr.org/ai-components/index.json), [token dictionary](https://mangrove.undrr.org/tokens.json), [utilities](https://mangrove.undrr.org/ai-components/utilities.json), [editorial manual](https://mangrove.undrr.org/llms-editorial-manual.txt), and [shared-asset guidance](https://assets.undrr.org/AGENTS.md). The asset repository's GitLab commit hook applies to that repository, not this one. Application privacy requirements take precedence over the institutional analytics/footer recommendations.

| Before | After |
| --- | --- |
| Cream/olive/orange application palette with a serif tagline | Existing layout uses published UNDRR interactive, neutral, positive, warning and negative color sources. The first pass mapped old declarations and used `src/ui/theme.css` for app-specific adaptation; the consolidation below removes that layer. |
| System-font chrome and hardcoded Georgia/code faces | Local Roboto/Roboto Condensed and Mangrove semantic font roles; code uses the code role. Small labels remain readable. |
| Custom identity mark and olive/orange favicon | Blue/white product favicon, local authentic UNDRR logo and documented four-part page-header decoration, alongside the unchanged PDF Signal Check name. No account or language features are implied. |
| Independently styled controls | Shared `src/ui/element.js` applies [button](https://mangrove.undrr.org/ai-components/components-buttons-buttons.json), select, checkbox, table and label classes across guided review, queue, calibration and exports. Dynamic state and listeners stay in their existing modules. |
| Text-based help symbols and custom input arrows | Local Mangrove SVG-mask icons with meaningful button names and 40px help targets; hover, focus, click, Escape and placement behavior remain application-owned. |
| Custom review-empty and completion presentation | Native app outcomes use Mangrove [empty-state](https://mangrove.undrr.org/ai-components/components-empty-state.json) and [notice](https://mangrove.undrr.org/ai-components/components-notice-notice.json) presentation. Status words and rule/AI attribution remain explicit. |
| Unrelated export colors | PDF headings and dedicated PNG accents/background share `PRESENTATION_BRAND.exportPalette`; captured data, original crops and inference receipts stay unchanged. |
| Potential CDN font/image requests | Pinned CSS and all referenced non-data assets are local, with relative URL rewrites and a provenance/hash manifest. No new runtime dependency. |

The native privacy dialog, actual-progress bars, step navigation, queue rows, publication cards, reading-order illustration and evidence crops remain app-specific components. There is no Mangrove JavaScript initializer or global DOM observer; a view rebuild cannot add independent listeners or replace ownership/cancellation policy. Model selection still makes no download request.

## Tokens and brand boundaries

Color channels use `rgb(var(--mg-...))`; full-color exceptions such as button backgrounds, raised surfaces and modal scrims use `var(--mg-...)` directly. Fonts use `--mg-font-family-text`, `-ui`, `-display` and `-code`. Modal/help behavior uses native top-layer elements. App spacing and source geometry stay with the application; component controls use the published classes and theme radius/focus sources.

`src/brand.js` owns product strings and `PRESENTATION_BRAND`: identity, stylesheet/logo paths, browser theme color, and resolved export colors. `index.html` includes the local theme stylesheet before app styles to avoid an unstyled startup; the initialization adapter keeps its path and logo aligned with brand configuration. A theme change does not change the notice key, profile result, PDF data, queue attempt, model choice or report filename stem.

The bundled Noto Sans report font is a functional exception to Mangrove web typography. Retaining its tested embedding and Unicode/raster fallback protects report fidelity. PDF/PNG exports adopt colors, not a different font or an institutional certification mark.

## Local assets, licenses and refresh

`public/vendor/mangrove/2.0.0/manifest.json` records the upstream URL, size and SHA-256 for every asset. The official [UNDRR stylesheet](https://assets.undrr.org/mangrove/2.0.0/css/style.css) is preserved as `upstream.css`; derived `style.css` changes only CSS URL references to bundled paths. The complete vendored inventory is about 3.84 MB, including CSS source/copy and unused font variants; browsers request only the fonts used by rendered content.

| Asset | SHA-256 |
| --- | --- |
| Original CSS | `1a6c63d258c88d6d4ef2e1e0cb5318dcc6e1f0ec7716803facc0c3d91b71bb76` |
| Local CSS | `5fff59982c599768d828de4efd20c65b7fc3c892e527e9ac673db3d0f091d8fe` |
| UNDRR blue logo | `e05a3b32ee677ac7d7ff5347eb0259e394b3e4a836966ee25e0e9556cc3b4e7c` |

Mangrove and the shipped Roboto fonts use Apache 2.0; full license text is bundled. Noto Arabic fonts use SIL OFL 1.1, with both exact family notices. The icon-font attribution includes Font Awesome and Entypo under SIL, plus the common full OFL legal text. See [third-party notices](../THIRD-PARTY-NOTICES.md). The [UNDRR logo usage guide](https://assets.undrr.org/logos/undrr/README.md) and source SVG are preserved separately: the institutional identity is provisional and is not represented as an MIT-licensed product logo. Future distribution must retain applicable institutional usage constraints and font notices.

To refresh: deliberately select the version/theme in `scripts/vendor-mangrove.py`, run `python3 scripts/vendor-mangrove.py`, review source/derived hashes and license changes, then run tests/build and actual root/Pages-prefix desktop/mobile and export QA. Do not fetch presentation assets at runtime or copy upstream analytics scripts. Versioned CDN paths are pinned, but hashes provide the recorded byte identity if upstream content changes.

For a future PreventionWeb build, set the script theme to `preventionweb`, refresh its pinned bundle/logo, then update `PRESENTATION_BRAND.id`, logo alternative text and export palette from that theme's official tokens. Keep the local stylesheet alias and deliberately select the appropriate logo aliases (`toolbar-logo.svg` for the current institutional toolbar). Review logo source, contrast, dimensions/crop and header decoration for the adopted identity. The current single-theme stylesheet has no runtime theme overrides: adding a `mg-theme-*` class alone does not switch brands. A runtime picker would need the all-theme bundle and separate UX work; it is not implemented.

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
