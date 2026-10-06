# Mangrove presentation migration

PDF Signal Check uses the UNDRR theme of Mangrove **2.0.0**, provisionally. Product name, PDF/profile identifiers, source ownership, local processing and optional AI consent remain independent of presentation. This is a first migration of a static Vite application; it does not use Drupal, Gutenberg, React hydration, analytics, cookie scripts or remote footer widgets.

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

For a future PreventionWeb build, set the script theme to `preventionweb`, refresh its pinned bundle/logo, then update `PRESENTATION_BRAND.id`, logo alternative text and export palette from that theme's official tokens. Keep the aliased local `style.css`/`logo.svg` paths. Review logo sizing and header decoration for the adopted identity. The current single-theme stylesheet has no runtime theme overrides: adding a `mg-theme-*` class alone does not switch brands. A runtime picker would need the all-theme bundle and separate UX work; it is not implemented.

## Delivered scope and limits

The guided single-PDF flow, model controls, review/evidence, contextual help, privacy dialog, actual progress, batch controls and captured exports have a coherent Mangrove presentation. Existing detector limitations, provisional AI thresholds, privacy preference and source/cancellation protections are preserved.

Bundled Arabic fonts do not imply a translated Arabic interface, right-to-left product QA, or expanded model/PDF language support. This is not an assertion of complete Mangrove conformity or accessibility certification. The component consolidation below replaces much of that initial custom spacing/chrome. Future richer navigation or status components must preserve current semantics and compact evidence-first review.

## Verification receipt — 6 October 2026

All 153 tests passed and the production build completed; the pre-existing large-chunk warning remains. Final application assets: `index-DV7M90BA.js`, `index-CmkM5fFC.css`, `report-qsWucw0i.js`. Root and repository-prefixed cold browser checks loaded only local presentation assets. Desktop 1280px and mobile 390px reviews retained source-first identity comparisons and showed no horizontal overflow. Independent checks covered actual author mismatch, reading-order illustration, declared attachment inventory, contextual-help Escape and model/batch consent boundaries.

An actual author-14 captured PDF and dedicated PNG were downloaded from the final browser build. All five PDF pages were rendered and visually inspected: the new blue headings, unchanged source byline crop, original metadata values, source hash/profile receipt, and limitations fit without clipping or overlaps. The PNG's blue accent and neutral surface fit with no omitted layout lines. Noto embedding and the actual AI-not-run receipt remained intact.

Local QA screenshots: `/tmp/pdf-signal-mangrove-entry-desktop.png`, `/tmp/pdf-signal-mangrove-modal-desktop.png`, `/tmp/pdf-signal-mangrove-author-desktop.png`, `/tmp/pdf-signal-mangrove-final-author-mobile.png`. PDF render set: `/tmp/pdf-signal-mangrove-exports/report-{1..5}.png`; downloaded PNG: `/Users/khawkins/Downloads/14-author-mismatch-pdf-signal-check (1).png`. These are uncommitted verification artifacts, not production document data.

## Component consolidation — 6 October 2026

The second pass adopts complete vanilla structures rather than applying theme classes to bespoke surfaces. `src/ui/patterns.js` provides explicit card/content, notice/header/description/actions and form-field/check-row constructors; it attaches no listeners. Views continue to own state, source handles and cancellation. `src/ui/element.js` applies documented control, utility and standalone `mg-details` classes. Common presentation is consolidated in `src/style.css`; the separate `src/ui/theme.css` override layer was removed.

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
