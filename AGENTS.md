# Working on PDF Signal Check

## Product and privacy

- This is a static React 19 + Vite browser app intended for GitHub Pages; no backend or API key.
- PDF bytes, extracted text, model inputs, and results stay on the device. Do not add uploads or telemetry containing PDF data.
- Optional model/tokenizer assets may download only after explicit user consent. Keep costs, supported languages, and limitations visible.
- Deterministic text-profile acceptance is independent of AI advisories, previews, and review annotations. A pass does not guarantee AI accuracy; reviewed does not mean fixed.

## Architecture

- Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing ownership or module boundaries.
- Keep structural rules in `src/engine`, inference ownership in `src/runtime`/workers, and DOM-free scheduling/retention in `src/batch`.
- Keep presentation/guidance in `src/review`, rendering/crops in `src/evidence`, captured reports in `src/export`, and fixed device workloads in `src/calibration`.
- React owns UI; keep observable controller snapshots stable and effect cleanup/remount safe. Canvas/SVG geometry may use isolated refs.
- Preserve source identity, attempt epochs, cancellation, stale-callback guards, and worker/document/canvas disposal. Export a fixed source/report snapshot.
- Do not silently substitute models, evict report details, or imply serialized report size measures browser RAM.
- Keep changes modular; consult [profile scope](docs/PROFILE.md) and [evaluation limits](docs/EVALUATION.md) when changing outcomes or claims.

## Presentation

- Consult [the UX reference architecture](docs/UX-ARCHITECTURE.md) for the information hierarchy, explicit user preferences, derived guidance and unresolved policy questions.
- The audience includes people with limited technical proficiency. Lead results with a plain-language explanation and a clear next action. Keep technical terminology, method details and deeper controls secondary, with accessible ways to learn more.

- Follow [docs/MANGROVE.md](docs/MANGROVE.md): pinned Mangrove 2.0 React components and documented native adaptations, semantic font roles, correctly wrapped sRGB tokens, and local bundled assets; no external startup scripts/fonts.
- Keep brand/theme adaptation separate from PDF outcomes. A future PreventionWeb change needs its pinned theme bundle, not a class on the UNDRR-only stylesheet.

## Repository and delivery

- Private remote: `https://github.com/PreventionWeb/pdf-signal-check`.
- `main` is the empty baseline; initial implementation is on `feature/initial-implementation` for a squash PR.
- Make focused, reviewable commits. Do not add `Co-authored-by` lines.
- Create goals, push, merge, deploy, or publish only when the user's request authorizes that action. Do not introduce extra approval steps for ordinary authorized local work.

## Verification

- Run appropriate tests for behavior changes; `npm test` and `npm run build` are the standard checks.
- Add tests for meaningful risks and contracts, not assertions that merely mirror implementation or label changes.
- Verify UI changes in a real browser, including mobile and a repository-prefixed URL when relevant.
- For PDF exports, download, render, and visually inspect affected pages; extracted text alone does not prove layout or crop correctness.
- Record material limitations and delivered-versus-planned status honestly. Keep the workflow lightweight.
