# Numerical consistency: frozen assistant evaluation

The reviewed final snapshot adds useful paraphrased numerical findings in a sealed synthetic confirmation set, but **conservative precision is only 60.0% for MiniLM and 63.6% for Granite**. Four of ten MiniLM concerns and four of eleven Granite concerns are unsupported under the frozen labels, including flags on ambiguous evidence. This is useful additional synthetic retrieval, not reliable contradiction detection, and there is no independent human real-report validation. Historical phase 1 results below are preserved separately.

## Frozen protocol and scope

The 40 labels in [`challenge.json`](../../evaluation/numerical-consistency/challenge.json) were authored and sealed before running either code snapshot or inspecting its outputs. [`seal.json`](../../evaluation/numerical-consistency/seal.json) records SHA-256 `0ecae577021a02ae634ec8516e1d7d8b337a8659b386e68cfd5a0ddbb784560b`. Labels have not changed in response to outputs. The evaluator is an assistant, not a human reviewer. Production source was read while establishing the harness, so this is independent label authorship within a development exercise, not a blinded external benchmark.

Each synthetic document contains two pre-extracted statements on different pages, sometimes with source heading context. Delta is development (16 documents: 4 contradictions, 10 clean, 2 ambiguous); Atlas and Beacon are held-out (24 documents: 8 contradictions, 13 clean, 3 ambiguous). Document IDs and scenario groups do not cross splits. Shared linguistic templates do cross groups, limiting transfer independence. No real PDF is represented by these fixtures.

Labels mean:

- **Contradiction:** useful incompatible quantities for the same stated claim, population and period.
- **Clean:** compatible values or legitimate differences in dates, hazards, places, denominators or scales; ranges, subsets and rounding also appear.
- **Ambiguous:** evidence does not establish the same claim or excludes a plausible revision; a concern is unsupported and should abstain.

Coverage also includes paraphrase, multiple quantities and headings. No threshold was tuned. All inputs are English and below the shipped token caps. Two candidates per document stay below both models' fact budgets. This does not test PDF parsing, sentence segmentation, layout, real-document retrieval crowding, budget saturation, multilingual performance or UI integration.

## Exact snapshots and execution

Production is `origin/main` commit `4170bf3eb8345696fc3786760ee50e4b5e53fa2b`, with evaluation copy [`production-facts.mjs`](../../evaluation/numerical-consistency/production-facts.mjs), SHA-256 `00207848c3e07ef43a355b518ed45dfdad11cc94bef2f0e62a858499ac7248dc`.

Phase 1 modified source was frozen by the implementation worker at 22:05:42 UTC, 22 October 2026. Evaluation copies retain exact source bytes:

| Module | SHA-256 |
| --- | --- |
| `modified-facts.mjs` | `2660a195e3acda629773937c511a853610c088389afe01f47e2ddc74f5fb5ab9` |
| `facts-scope.js` | `a21299961450e9101315027f3a991882f5a9e7ef497198775c94262ec3e09942` |

These are measured snapshots, not a claim that later working-tree code has the same behavior. No production files were edited by this evaluation worker.

Both shipped pinned models ran in actual browser WASM through `EmbeddingRunner`, using agent-browser 0.37.1 and a private local Vite developer page. MiniLM uses its shipped 0.88 fact threshold, mean pooling and 256-token cap; Granite uses 0.95, CLS pooling and 512-token cap. Both use shipped q8 graph/model revision pins. Full model receipts and consumed-token provenance are retained. Cache/network source is unknown. CLI invocation explicitly requests model assets; no PDF data was uploaded.

All modified candidate embedding texts matched production inputs exactly. Modified policy replay therefore reused the same observed vectors and provenance, with exact dataset/text/model matching enforced. It did not run another encoder or substitute a model. This isolates policy changes from encoder variation. The baseline is identical-wording detection; retrieval excludes identical-wording pairs; combined is the union of both. Candidate and embedding coverage were 100% on both splits for both models, with zero truncated inputs.

The harness pattern was inspected using `git show spike/chart-description-vlm:scripts/evaluate-models.mjs` and `src/evaluation/run.js`; no branch was switched and no unrelated spike changes were imported. The standalone developer worker avoids production module-boundary changes.

## Phase 1 held-out results

Precision = TP/(TP + clean false flags), excluding ambiguity only for this secondary metric. **Conservative precision = TP/(all flags)**, including ambiguous flags as unsupported. Recall = TP/8 known contradictions. No flag is not affirmative evidence of consistency or a recorded abstention. There are 13 clean and 3 ambiguous documents.

| Snapshot / path | TP | Clean false flags | Ambiguous flags | Conservative precision | Secondary precision | Recall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Production identical wording | 4 | 1 | 1 | 66.7% | 80.0% | 50.0% |
| Production MiniLM retrieval only | 1 | 4 | 1 | 16.7% | 20.0% | 12.5% |
| Production MiniLM combined | 5 | 5 | 2 | 41.7% | 50.0% | 62.5% |
| Production Granite retrieval only | 0 | 3 | 1 | 0.0% | 0.0% | 0.0% |
| Production Granite combined | 4 | 4 | 2 | 40.0% | 50.0% | 50.0% |
| Modified identical wording | 3 | 0 | 1 | 75.0% | 100.0% | 37.5% |
| Modified MiniLM retrieval only | 4 | 1 | 1 | 66.7% | 80.0% | 50.0% |
| Modified MiniLM combined | 7 | 1 | 2 | **70.0%** | 87.5% | 87.5% |
| Modified Granite retrieval only | 3 | 1 | 1 | 60.0% | 75.0% | 37.5% |
| Modified Granite combined | 6 | 1 | 2 | **66.7%** | 85.7% | 75.0% |

Incremental useful retrieval over each snapshot's identical-wording baseline: production MiniLM adds 1 useful and 4 clean false findings; production Granite adds 0 useful and 3 clean false findings. Modified MiniLM adds 4 useful and 1 clean false finding; modified Granite adds 3 useful and 1 clean false finding. Both modified paths additionally flag one ambiguous retrieval case. Compared with production combined, modified combined gains 2 useful cases for each model and removes 4 MiniLM / 3 Granite clean false flags.

## Phase 1 development and overall results

Development has 4 contradictions, 10 clean, 2 ambiguous documents. Overall totals are descriptive only; held-out observations above remain separate.

| Split / snapshot / path | TP | Clean false flags | Ambiguous flags | Conservative precision | Recall |
| --- | ---: | ---: | ---: | ---: | ---: |
| Development production identical | 3 | 1 | 0 | 75.0% | 75.0% |
| Development production MiniLM combined | 3 | 2 | 0 | 60.0% | 75.0% |
| Development production Granite combined | 3 | 4 | 1 | 37.5% | 75.0% |
| Development modified identical | 3 | 1 | 0 | 75.0% | 75.0% |
| Development modified MiniLM combined | 4 | 2 | 0 | 66.7% | 100.0% |
| Development modified Granite combined | 4 | 2 | 2 | 50.0% | 100.0% |
| All production MiniLM combined | 8 | 7 | 2 | 47.1% | 66.7% |
| All production Granite combined | 7 | 8 | 3 | 38.9% | 58.3% |
| All modified MiniLM combined | 11 | 3 | 2 | 68.8% | 91.7% |
| All modified Granite combined | 10 | 3 | 4 | 58.8% | 83.3% |

## Useful findings and remaining errors

The modified MiniLM path adds held-out paraphrase findings `h02`, `h03`, `h04`, `h21` beyond its identical baseline; Granite adds `h03`, `h04`, `h21`. These involve changed exact school, hospital, vaccination and municipal warning-system counts. The unchanged-vector comparison supports a policy effect on these examples, not a general model ranking.

Both modified models still flag clean rounding cases (`d10`, `h14`), and a development place contrast expressed only in headings (`d14`). Both flag a plausibly revised register (`h18`) and identical wording without enough heading context to establish one inspection (`h20`). Granite additionally flags development ambiguity (`d11`, `d16`). These ambiguous flags are not useful contradictions and are included in the conservative denominator.

Both modified models miss disjoint same-claim ranges (`h24`), which production identical wording did flag. Granite also misses paraphrase `h02` at its fixed threshold. The more guarded identical path thus trades a positive away while removing one held-out clean flag. Retaining all first-phase errors is intentional: labels were not repaired or exceptions added after outputs.

## Private real-report development diagnostic

The ignored local `dev-corpus/real-evaluation` directory contains existing model-output receipts, previously exposed during development. It does not contain reusable original candidate vectors. [`real-development-flag-replay.json`](../../evaluation/numerical-consistency/real-development-flag-replay.json) publishes only aggregate counts and code hashes; no report text, names, PDF bytes, vectors or private labels are copied into tracked files.

Across five existing output records per model, four have fact coverage. MiniLM compared 377 of 384 candidates and retained one numerical pair; the production guard retains that pair and the phase 1 modified guard removes it. Granite compared 237 of 384 candidates and retained zero pairs; both guard replays therefore retain zero. These are filters of old retained flags only: they cannot discover new pairs, measure full-policy recall or establish that removal is correct. No new human review or real-document accuracy claim is made. A fresh independently labelled real-report evaluation remains outstanding.

## Final confirmation: useful additions, substantial unsupported burden

**The reported reviewed-final confirmation receipts are [`confirmation/final-reviewed-minilm.json`](../../evaluation/numerical-consistency/confirmation/final-reviewed-minilm.json) and [`confirmation/final-reviewed-granite-r2.json`](../../evaluation/numerical-consistency/confirmation/final-reviewed-granite-r2.json). Both use scope SHA-256 `119f7e09d4155be349d8480aae2d8c746bed3921ee5980a7ebaf75bc525e7271`. Files named `final-*.json` are preserved pre-hyphen-review observations, not the reviewed shipping-policy snapshot.**

A second set of 24 assistant-authored synthetic documents was sealed after phase 1 outputs but before the subsequent source-review fixes. [`confirmation/seal.json`](../../evaluation/numerical-consistency/confirmation/seal.json) records SHA-256 `cd525e20d5b9d5d098ca290d53660ccbb000cb3a5c3aaca7372f771f59f4d6ca`. It has 8 contradictions, 12 clean and 4 ambiguous documents across Harbor water, Mesa energy and Orchid finance scenario families. Every case is confirmation-held-out. Patterns and author remain related to phase 1; this is not independent human or real-document validation.

Both production baselines ran in actual browser WASM. Reviewed policy replay reused those exact observed vectors, after complete input/configuration/hash checks. All reviewed confirmation runs finished before the assistant inspected their aggregate or per-case outputs. Labels were not shared with implementers during iteration, and no labels, thresholds or policy were changed in response to these results.

| Confirmation snapshot / path | TP / 8 | Clean false flags / 12 | Ambiguous flags / 4 | Conservative precision | Secondary precision | Recall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Production identical wording | 4 | 1 | 0 | 80.0% | 80.0% | 50.0% |
| Production MiniLM retrieval | 1 | 2 | 2 | 20.0% | 33.3% | 12.5% |
| Production MiniLM combined | 5 | 3 | 2 | 50.0% | 62.5% | 62.5% |
| Production Granite retrieval | 2 | 3 | 2 | 28.6% | 40.0% | 25.0% |
| Production Granite combined | 6 | 4 | 2 | 50.0% | 60.0% | 75.0% |
| Reviewed identical wording | 3 | 0 | 0 | 100.0% | 100.0% | 37.5% |
| Reviewed MiniLM retrieval | 3 | 1 | 3 | 42.9% | 75.0% | 37.5% |
| Reviewed MiniLM combined | 6 | 1 | 3 | **60.0%** | 85.7% | 75.0% |
| Reviewed Granite retrieval | 4 | 1 | 3 | 50.0% | 80.0% | 50.0% |
| Reviewed Granite combined | 7 | 1 | 3 | **63.6%** | 87.5% | 87.5% |

MiniLM adds 3 useful findings beyond reviewed identical wording; Granite adds 4. Each model also adds 1 clean false flag and 3 flags on ambiguous evidence. That makes **4 of 10 MiniLM concerns and 4 of 11 Granite concerns unsupported** under the frozen labels. Compared with each production combined path, reviewed combined adds one useful case and removes two MiniLM / three Granite clean false flags, while adding one ambiguous flag. This is useful additional synthetic retrieval, **not reliable contradiction detection**.

The coordinator reported the resulting shipping decision: optional `semantic.factPairs` stay behind a technical-only experimental gate and contribute no Check task, headline count or score. The evaluated retrieval policy, models and thresholds remain unchanged. These combined-path metrics describe a diagnostic union of raw numerical findings, not shipped Check-task counts; this evaluator did not independently verify the presentation gate.

Useful incremental MiniLM examples are `c01`, `c09`, `c17`; Granite also finds `c02`. Both models miss the changed school quantity among several quantities in `c10`; MiniLM additionally misses paraphrase `c02`. Both wrongly flag a legitimate approved-project/completed-project denominator contrast (`c19`), and both flag an updated inspection (`c08`), a separate report with unresolved period/scope (`c16`), and proposed versus approved budget amounts (`c23`). These ambiguous alarms are not counted as useful contradictions. There was no follow-up tuning or rerun in response to these errors.

Candidate-pair and pair-encoding coverage are **23/24 (95.8%)**; encoded-sentence coverage is **47/48 (97.9%)**. One clean count-equivalence case (`c14`, “systems”) lacks a supported quantity unit in one statement, so no pair is compared. The direct harness encodes its one remaining candidate; production semantic scheduling would omit a one-candidate fact job. The legacy any-encoding coverage field is therefore 100%, and must not be read as complete comparison coverage. No input was truncated and no pair-selection cap was reached. Two statements per document do not exercise production retrieval saturation.

## Preserved source versions and exposure

| Version | Facts SHA-256 | Scope SHA-256 |
| --- | --- | --- |
| Phase 1 modified | `2660a195e3acda629773937c511a853610c088389afe01f47e2ddc74f5fb5ab9` | `a21299961450e9101315027f3a991882f5a9e7ef497198775c94262ec3e09942` |
| Pre-hyphen-review candidate, frozen 22:14:46 UTC | `ed73108a065ebe4be3c5b36ab1efea1a6ef5522be4fb4620665fafdeca582831` | `dad6fb215621d5c2ae52d3d31ef87dc066f3da9419c092cddee24eb0f500d34e` |
| Reviewed final, frozen 22:17:06 UTC | `ed73108a065ebe4be3c5b36ab1efea1a6ef5522be4fb4620665fafdeca582831` | `119f7e09d4155be349d8480aae2d8c746bed3921ee5980a7ebaf75bc525e7271` |

The pre-review snapshot remains in [`final-policy/manifest.json`](../../evaluation/numerical-consistency/final-policy/manifest.json); reviewed final is in [`reviewed-policy/manifest.json`](../../evaluation/numerical-consistency/reviewed-policy/manifest.json). Both pin copied semantic, consistency and screening-request integration source as well. The harness directly evaluates fact candidates and pair selection; those integration copies are provenance, not evidence of end-to-end PDF execution.

An independent source review found hyphenated percentage-point dimensional conflation while the first candidate confirmation runs were in progress. A batched inbox-read/replay command let the last queued replay run before the pause was processed. All pre-review snapshots and receipts were preserved, and no confirmation outputs were inspected or disclosed before the reviewed refreeze and replay. The narrow independent source fix produced identical confirmation rows/metrics on this set, which does not include that dimensional variant. Pre-review observations are retained under `final-*.json`; reviewed observations are distinct `final-reviewed-*.json`. Neither replaces phase 1 data.

The first 40 documents were also replayed against reviewed final source. These are **development-exposed replays**, even where their original split field says held-out; they are not fresh confirmation. Across all 40, reviewed identical wording has TP 6/12, zero clean false flags and one ambiguous flag (conservative precision 85.7%, recall 50%). Reviewed combined MiniLM has TP 11/12, zero clean false flags, two ambiguous flags (84.6%, 91.7% recall); Granite has TP 10/12, zero clean false flags, four ambiguous flags (71.4%, 83.3% recall). Both still miss the disjoint-range contradiction; Granite additionally misses one paraphrase. Zero clean false flags on this exposed set does not remove the confirmation errors above.

## Reproduce and inspect

[`aggregate.json`](../../evaluation/numerical-consistency/aggregate.json) indexes 14 distinct observations with receipt hashes, per-split metrics and exposure notes. It deliberately does not pool repeated documents across snapshots. Each individual receipt retains rows, model settings, token provenance, incremental IDs and source hashes.

From the repository root with dependencies, installed agent-browser and its browser available (choose new output paths; existing files are refused):

```sh
# Fresh production encoders; invocation explicitly requests model downloads if absent.
node scripts/evaluate-numerical-consistency.mjs --snapshot production --model minilm --output /tmp/numeric-production-minilm.json
node scripts/evaluate-numerical-consistency.mjs --snapshot production --model granite-r2 --output /tmp/numeric-production-granite.json

# Reproduce reviewed confirmation policy using observed browser vectors.
node scripts/evaluate-numerical-consistency.mjs --data-dir evaluation/numerical-consistency/confirmation --source-dir evaluation/numerical-consistency/reviewed-policy --snapshot final --model minilm --reuse-embeddings evaluation/numerical-consistency/confirmation/production-minilm-embeddings.json --reuse-receipt evaluation/numerical-consistency/confirmation/production-minilm.json --output /tmp/numeric-confirmation-reviewed-minilm.json
node scripts/evaluate-numerical-consistency.mjs --data-dir evaluation/numerical-consistency/confirmation --source-dir evaluation/numerical-consistency/reviewed-policy --snapshot final --model granite-r2 --reuse-embeddings evaluation/numerical-consistency/confirmation/production-granite-r2-embeddings.json --reuse-receipt evaluation/numerical-consistency/confirmation/production-granite-r2.json --output /tmp/numeric-confirmation-reviewed-granite.json

node scripts/check-numerical-consistency.mjs
node scripts/aggregate-numerical-consistency.mjs --output /tmp/numeric-aggregate.json
# Optional: requires ignored private development artifacts, never runs inference.
node scripts/replay-numerical-real-flags.mjs --output /tmp/numeric-real-development.json
```

The current CLI requires complete shipped model settings (revision, precision, pooling, token cap and other configuration), matching recorded runner/model-config hashes, and a companion observation binding the exact vector-file hash. Legacy phase 1 embeddings can use the historical modified receipt as `--reuse-receipt`, without changing the older embedding bytes. Outputs use exclusive creation and refuse existing paths before inference. The worker reports errors and has a fifteen-minute model deadline; incomplete inference is not successful evaluation.

Exact historical harness bytes are archived in `harnesses/phase1-production.mjs`, `phase1-modified.mjs` and `phase2-selection.mjs`, with hashes matching all 14 receipts. These are provenance archives, including historical write behavior; use the current CLI for safe replay. Model config, runner, asset-fetch and worker bytes are also retained. None of the historical receipts or source snapshots was overwritten.

Verification completed: two actual WASM encoders on each sealed set; strict vector reuse for policy comparisons; all 14 receipt seals, split isolation, source/integration/harness/vector/observation hashes, unchanged labels, union flags and precision/recall arithmetic audited; refusal probes for existing output, changed model revision and changed runner hash; private aggregate replay reproduced without publishing source-derived input hashes. No production files or production tests were changed by this worker.

Delivered: 64 sealed assistant-authored synthetic documents, all requested descriptive metrics and incremental findings, observed browser-WASM vectors/provenance, distinct historical/final source receipts, and a limited private retained-flag diagnostic. Not delivered: independent human real-report validation, general contradiction accuracy, multilingual/extraction/layout/saturation validation or calibrated thresholds. Deterministic profile acceptance is unaffected; numerical advisories remain review clues.
