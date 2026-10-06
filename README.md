# PDF Signal Check

Check whether a PDF provides usable text, connected semantic structure, and metadata that describes its content before sending it into an AI workflow.

The aim is to reduce avoidable extraction errors, misleading context, and wasted processing. The checker assesses document inputs; passing it does not guarantee that a downstream AI system will avoid hallucinations.

## Project status

Early implementation, app version 0.7.0 with text actionability profile 0.2. The product is PDF Signal Check; the local repository and package are named `pdf-signal-check`. Created October 5, 2026 as a fresh project with independent application code and git history.

Follow a guided single-PDF review: choose a document, inspect optional screening choices, then review concrete problems and uncertain scope against the rendered page. Traditional analysis runs once before model selection; “Review without AI” is always available. Full evidence and JSON export remain accessible without finishing the review queue. Optional [local semantic screening](docs/SEMANTIC.md) offers pinned MiniLM and multilingual Granite choices, selectable title/subject/per-keyword checks, and bounded tagged-heading/section comparisons. PDF processing stays on the user's device. Model and runtime assets download only when screening is requested. The model picker explains language support, model/tokenizer downloads, and limitations before an explicit run. Per-model advisory thresholds require calibration; opt-in fixed-workload browser tests report observed timings without hardware or document-speed guarantees.

Batch queues remain in this browser session only. Traditional checks are the default; optional AI downloads require explicit authorization. Closing or reloading loses queue data. A serialized report budget is an estimate, not a browser RAM limit. See [architecture and lifetimes](docs/ARCHITECTURE.md).

## What the result means

- **Text actionability profile 0.2: Yes or No.** Deterministic checks establish whether the document meets the [implemented profile](docs/PROFILE.md). Required checks that cannot complete produce No with a reason distinguishing a defect from compliance not established. This initial text profile is narrower than the proposed profile v1.
- **Deterministic title consistency: Match, Suspected mismatch, or Uncertain.** Rules compare metadata with extracted title candidates and preserve Info/XMP and identity conflicts.
- **Optional semantic screening: Match, Related—identity unconfirmed, Suspected mismatch, or Uncertain.** Local embeddings screen titles, subjects, and keywords against bounded evidence. Provisional similarity thresholds produce advisory findings; they never change structural acceptance or override deterministic title warnings.

The project prioritizes machine consumption over a full human accessibility audit. Unicode text, logical structure, relationships, and reading order remain relevant to both.

## Features

- Foreground batch review of up to 20 PDFs with frozen optional-screening settings, sequential workers, explicit cancellation/recovery, and bounded retained reports. Open a retained attempt without rerunning it, export its captured evidence, or download a compact batch JSON.

- Guided Document → Checks → Processing → Review stages, issue frames with inspection guidance, and separate problems, uncertainty, and positives.
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
- Captured PDF signal-check reports, dedicated PNG summaries, and detailed JSON exports generated locally; cancel exports without losing analysis.
- Bounded source evidence crops shared by guided review and PDF reports, independent of preview state.
- Optional synthetic browser timing tests with explicit download costs; timings are observations, never hardware grades or document estimates.
- Three simple examples and [eighteen representative calibration PDFs](docs/CALIBRATION.md), including original logos, charts, metadata defects, title mismatches, and German text.

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

This repository is currently local only. The planned future GitHub location is `preventionweb/pdf-signal-check`, with GitHub Pages hosting. Creating that repository, adding a remote, pushing, and publishing are deferred until requested.

## Planning documents

- [Feature roadmap](docs/features/README.md): delivered onboarding, issue review, exports, device calibration and foreground batch processing, with deferred capabilities identified separately.
- [Delivery audit](docs/DELIVERY.md): implementation and verification evidence for the local V1 roadmap.
- [Interface brand](docs/BRAND.md): working label, positioning, and evidence-focused result hierarchy.
- [UX refinement](docs/UX-REFINEMENT.md): results-first flow changes and desktop/mobile browser verification.
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

Profile 0.2 strengthens structural analysis with marked-content integrity checks. Profile results remain separate from metadata, author, reading-order, and visibility advisories. Known example ground-truth labels appear only for examples loaded through the app, never inferred from an uploaded filename.

A first-visit notice explains local processing, external asset downloads, AI limitations, and AI-assisted development. “I understand” continues; an optional browser-local preference suppresses future automatic notices. The header’s “About AI & privacy” control reopens it. Only that preference is saved, not PDF content.
