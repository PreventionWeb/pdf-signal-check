# PDF Signal Check

The UI uses React 19 with Vite and published Mangrove 2.0 components. PDF analysis, optional local inference and captured exports remain separate browser-local modules; GitHub Pages requires no server runtime. See [architecture](docs/ARCHITECTURE.md) and [component coverage](docs/MANGROVE.md).

Find what stops people and AI from understanding a PDF, see it on the pages, and get a fix list for whoever made it.

PDFs remain one of the UN’s most common publishing formats, but search engines, chatbots and document assistants are increasingly their first readers. They turn layouts into raw text before a person sees them. Good structure gives screen readers and other tools clearer information to work with. Missing or misleading structure can make information harder to follow or extract. Human review is still needed. PDF Signal Check checks text, tags, reading order, image descriptions, document properties, attachments and hidden instructions aimed at AI, locally in the browser. Passing does not guarantee that a downstream AI system will avoid mistakes.

The framing and production flow come from *Making PDFs work for Humans and AI* (UNDRR and OCHA, version 1, September 2025). The tool builds on [PDF-A-go-actionable](https://github.com/khawkins98/PDF-A-go-actionable). The in-app About page (`#about`) presents both.

## Project status

The preview uses the Mangrove PIN blocker (default **5498**), with tab-session unlock and no app processing before access. See [preview access and launch removal](docs/PREVIEW-ACCESS.md).

Early implementation, app version 0.8.0 with text actionability profile 0.3. The product is PDF Signal Check; the local repository and package are named `pdf-signal-check`. Created October 5, 2026 as a fresh project with independent application code and git history.

Follow a guided single-PDF review: drop a PDF on the upload card or choose one of eight sample reports, confirm check settings on first use, then work through the fix list on the pages. Settings opens a dialog; batch review is a separate flow. Standard checks run before optional AI text comparisons. Setup presents standard checks on their own, or with multilingual AI (Granite R2, recommended) or compact English AI (MiniLM). Language coverage and download costs are visible before consent; excerpt limits and speed details remain in a technical disclosure. Missing document language prompts an explicit, source-specific decision before AI can run. Full evidence and JSON export remain accessible without finishing the review queue. Optional [local semantic screening](docs/SEMANTIC.md) offers pinned MiniLM and multilingual Granite choices, selectable title/subject/per-keyword checks, and bounded tagged-heading/section comparisons. PDF processing stays on the user's device. Model and runtime assets download only when screening is requested. The model picker explains language support, model/tokenizer downloads, and limitations before an explicit run. Per-model advisory thresholds require calibration; opt-in fixed-workload browser tests report observed timings without hardware or document-speed guarantees.

Batch queues remain in this browser session only. Traditional checks are the default; optional AI downloads require explicit authorization. Closing or reloading loses queue data. A serialized report budget is an estimate, not a browser RAM limit. See [architecture and lifetimes](docs/ARCHITECTURE.md).

## What the result means

- **Text actionability profile 0.3: Yes or No.** Deterministic checks establish whether the document meets the [implemented profile](docs/PROFILE.md). Required checks that cannot complete produce No with a reason distinguishing a defect from compliance not established. This initial text profile is narrower than the proposed profile v1.
- **Deterministic title consistency: Match, Suspected mismatch, or Uncertain.** Rules compare metadata with extracted title candidates and preserve Info/XMP and identity conflicts.
- **Optional semantic screening: Match, Related—identity unconfirmed, Suspected mismatch, or Uncertain.** Local embeddings screen titles, subjects, and keywords against bounded evidence. Provisional similarity thresholds produce advisory findings; they never change structural acceptance or override deterministic title warnings.

The project prioritizes machine consumption over a full human accessibility audit. Unicode text, logical structure, relationships, and reading order remain relevant to both.

## Features

- Foreground batch review of up to 20 PDFs with frozen optional-screening settings, sequential workers, explicit cancellation/recovery, and bounded retained reports. Open a retained attempt without rerunning it, export its captured evidence, or download a compact batch JSON.

- PDF intake, first-use setup in a dialog, observed processing progress, and a fix list beside the pages. Fix and Check lead; optional wider-reuse suggestions and Couldn’t check remain collapsed, with the method in Technical details.
- Browser-local analysis in workers, with actual page/batch/asset progress where available and cancellation.
- Independent PDF object inspection and text extraction using pdf-lib and PDF.js.
- Structure parent links, parent-tree associations, text coverage, and basic list/table relationships.
- Separate Info/XMP publication metadata, namespace-aware XMP parsing, language checks, title candidates, and advisory author identity comparison.
- Explicit reading-order and text-visibility review findings, separate from structural acceptance.
- Optional model choice and check selection, pinned revisions, per-model provisional thresholds, per-keyword and bounded heading/section advisories, and consumed-input provenance.
- Cancel AI screening without losing structural analysis or any previous completed screening.
- One-page PDF preview with navigation, zoom, issue highlights, and a separate logical tag-tree order overlay.
- Extraction rehearsal: switch bounded transcripts between tagged and content-stream order; compare paired author and reading-order examples.
- A SHA-256 receipt of original input bytes where browser cryptography is available.
- Interactive term explanations with reference links, and finding-source labels separating extracted rules, heuristics, completed local AI, and unassessed checks.
- Data-driven reading-order illustrations compare matched headings from tag-tree and page-drawing sequences, with detected jumps and explicit uncertainty.
- Captured PDF signal-check reports and detailed JSON exports generated locally; cancel exports without losing analysis.
- Bounded source evidence crops shared by guided review and PDF reports, independent of preview state.
- Optional synthetic browser timing tests with explicit download costs; timings are observations, never hardware grades or document estimates.
- Eight public sample reports (including a PDF with missing document information) and [twenty representative calibration PDFs](docs/CALIBRATION.md), including original logos, charts, metadata defects, title mismatches, German text, and embedded spreadsheets/Word files with and without declared guidance.
- Bounded embedded/associated-file inventory records declared names, media types, descriptions, relationships, and unresolved payload contexts without opening attachments. Payloads and incomplete inventories prevent text-profile acceptance.

Meaningful graphics, forms, annotations, Form XObjects, optional layers, and ActualText replacements currently prevent acceptance because their analysis is outside the supported profile. A No in these cases means not established, rather than a defect in the PDF. Extracted Unicode indicators do not establish visually correct text; reading order and tag meaning are not proven correct by structural checks. Author and order findings are bounded advisories, not universal identity/order validation.

## Development

Requires Node.js 24 or later.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

The preparation step copies PDF.js fonts, character maps, and decoder assets into the build. Generated copies are ignored by git. Model inference is lazy; the application does not fetch model weights when running structural checks.

Regenerate simple examples with `npm run samples`, or the richer original corpus with `npm run calibration`. Sample PDFs are committed so deployments do not depend on regeneration.

## GitHub Pages

Version 1 is intended for GitHub Pages. [The workflow](.github/workflows/pages.yml) runs tests and builds on pull requests, and deploys successful builds from `main`. In the GitHub repository, choose **Settings → Pages → Source → GitHub Actions**.

Vite uses relative asset URLs so the build works under a repository project path or a custom domain. PDF.js assets are bundled with the site. Optional models use Hugging Face for pinned model/tokenizer files; the inference runtime is bundled with the site. No backend or API key is required.

The private repository is [PreventionWeb/pdf-signal-check](https://github.com/PreventionWeb/pdf-signal-check). `main` is an empty baseline; the initial implementation lives on `feature/initial-implementation` for [draft PR #1](https://github.com/PreventionWeb/pdf-signal-check/pull/1), intended for a squash merge. GitHub Pages has not been deployed. See [AGENTS.md](AGENTS.md) for concise contributor instructions.

## Planning documents

- [Interface brand](docs/BRAND.md): working label, positioning, and evidence-focused result hierarchy.
- [Mangrove presentation](docs/MANGROVE.md): Pinned PreventionWeb theme loaded from assets.undrr.org, component mapping, licenses and refresh instructions.
- [UX reference architecture](docs/UX-ARCHITECTURE.md): the results design (fix list on the pages, buckets, evidence drawer), workflow hierarchy, component responsibilities and a review rubric.
- [Validation record](docs/VALIDATION.md): browser, export and test verification, newest entries last.
- [Naming options](docs/NAMING.md): UN-first, cross-industry naming recommendations and observed name conflicts.
- [Implementation plan](docs/PLAN.md): scope, acceptance rules, architecture, milestones, and evaluation.
- [Model options](docs/MODEL-OPTIONS.md): compact English and multilingual candidates, deployment considerations, and benchmark requirements.
- [Implemented profile](docs/PROFILE.md): exact current checks, supported scope, and limitations.
- [Semantic screening](docs/SEMANTIC.md): model configuration, evidence bounds, provisional thresholds, and limitations.
- [Validation](docs/VALIDATION.md): automated and browser checks.
- [Calibration corpus](docs/CALIBRATION.md): original examples and expected observable properties.

## Reference and credit

This project draws on [PDF-A-go-actionable](https://github.com/khawkins98/PDF-A-go-actionable), also by Ken Hawkins, as a reference for browser-local PDF analysis, worker orchestration, structure traversal, findings, and test cases. Its accessibility checks informed this project's direction.

The local reference repository is `../PDF-A-go-actionable`. The initial review used commit `c3f122a0cac2bff76e5384a12c609196a97d641e`.

The initial implementation is independently authored; no source modules were copied. Any later reuse of code must preserve applicable license notices and record the source. PDF-A-go-actionable is MIT licensed.

## Product name

**PDF Signal Check** is the adopted product name. The current repository slug is `pdf-signal-check`; its former local folder/package name was `pdfs-for-ai-actionability`.

**Text, structure, and metadata for machine use.**

**Inspect the PDF. Understand the input.**

The name describes a check of document signals rather than a guarantee of AI accuracy. It has not received trademark or domain clearance.

## License

[MIT](LICENSE), copyright 2026 Ken Hawkins. Model weights and third-party dependencies retain their own license terms.

The visual evidence viewer also draws on [pdf-a-go-go](https://github.com/khawkins98/pdf-a-go-go), another project by Ken Hawkins. The new viewer is independently authored. Click title candidates, extracted text, or finding evidence to locate trustworthy regions; metadata-only findings have no page location.

Profile 0.3 extends the earlier marked-content integrity checks with bounded embedded-file inventory and conservative attachment scope handling. Profile results remain separate from metadata, author, reading-order, and visibility advisories. Known example ground-truth labels appear only for examples loaded through the app, never inferred from an uploaded filename.

A first-visit notice explains local processing, external asset downloads, AI limitations, and AI-assisted development. “I understand” or Escape dismisses it; an optional browser-local preference suppresses future automatic notices. The footer’s “About AI & privacy” link reopens it. Notice preferences, confirmed check settings/download consent, and synthetic benchmark receipts may be saved locally; PDF content and document-specific language assumptions are not saved. A failed notice-preference save produces visible feedback.
