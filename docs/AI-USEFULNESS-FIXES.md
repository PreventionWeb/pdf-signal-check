# AI evidence and optional workload follow-up

22 October 2026. Follows the diagnostic findings in [draft research PR #8](https://github.com/PreventionWeb/pdf-signal-check/pull/8). This production change adds no model or threshold change and does not expand the deterministic acceptance profile.

Delivered:

- Numeric statements retain bounded source heading/paragraph context, with the original statement first in model input. Explicitly different single hazards or observation times cannot become a numeric conflict merely because their wording is similar. Conflicting tagged owners abstain.
- Wrapped heading fragments recover context only with close, aligned, same-size physical evidence. Unresolved connector fragments and disjoint-column bodies are excluded from section comparison. Original tags and structural findings remain intact.
- Photo blank rejection checks every pixel of the already bounded crop for uniformity. CLIP's plain-panel guess cannot discard a photograph. Unknown pixel inspection retains the crop; fewer than five usable descriptions starts neither description encoder. Receipts record actual encoded work, not just completed comparisons.
- Single PDFs and samples show standard results first. A collapsed optional offer uses the same task preparation as inference to list available work before download consent. An empty workload has no download action or model worker. Saved settings still require a per-PDF request. Batch processing retains its explicit configuration/consent flow.

Verification:

- 416 unit/contract tests and the production build passed. Tests cover genuine same-context conflicts alongside different hazards/times, wrapped and cross-column geometry, tiny nonblank pixel marks, no-input worker prevention, saved settings, language decisions, source replacement, cancellation and stale callbacks.
- Actual browser-WASM CLIP smoke: five uniform controls caused zero encoded crops and no inference; five nonuniform public illustrations completed five description comparisons with consumed-token/truncation receipts. The public synthetic execution receipt is in `evaluation/clip-execution-smoke.json`.
- Native browser pixel inspection retained all seventeen available real photo crops from the earlier pilot, including the four formerly rejected by semantic blank classification. The earlier source-specific heading and hazard cases now prepare source-correct evidence or abstain. These are development regressions, **not fresh held-out quality evidence**. Source material and detailed outputs remain ignored/local.
- Browser checks at `/pdf-signal-check/` exercised first-use standard results, optional setup without a download before confirmation, a completed MiniLM request, saved settings followed by a new PDF without a model worker, no-input explanation and desktop/mobile layouts. Existing source/worker contract tests cover error/cancel recovery. No export layout changed.

Limits:

The English context guards do not resolve every hazard, location, denominator, scope or date. Missing/malformed tags can leave context unavailable. The uniform-pixel gate deliberately retains noise, gradients and visually unclear crops; it is not a content classifier or a crop-completeness guarantee. Retaining a crop changes CLIP's relative ranking pool and does not establish improved description precision. Duplicate-image triage still uses semantic similarity, not a pixel identity proof. Institution-versus-publication title ambiguity remains possible. Independent human labels, OCR comparison, real-chart VLM quality and controlled device measurements remain research work; keep #8 a draft.
