# Numerical consistency screening

Deterministic identical-wording warnings identify potential numerical disagreements for human inspection. Embedding-retrieved `semantic.factPairs` are retained only as experimental technical evidence. Neither path establishes measurement identity, verifies factual correctness, or changes deterministic text-profile acceptance. No flag means neither numerical consistency nor positive AI support. Embedding scores are relatedness measurements, not confidence probabilities.

## Presentation gate after fresh synthetic confirmation

The fresh 24-case assistant-authored synthetic confirmation adds three useful embedding-retrieved findings for MiniLM and four for Granite beyond reviewed identical wording, but each adds four unsupported concerns (one clean false flag and three ambiguous cases). These observations do not establish real-document accuracy; see [the experiment record](experiments/NUMERICAL-CONSISTENCY.md). The release decision keeps this expansion out of ordinary review tasks.

Original `semantic.factPairs` receipts remain unchanged in the captured report and JSON. They appear as explicitly labelled experimental numerical evidence in Technical details → AI coverage and the full PDF technical appendix, with exact original statements, source context, statement pages and recorded similarity. Context is not assigned an invented location. Similarity is relatedness, not a confidence probability, and unresolved measurement identity is explicit. The disclosure does not suggest automatic correction or trigger inference. Before setup or a run, the optional AI offer identifies eligible numerical statements as experimental and explains that candidates appear only in Technical details/full report, without adding fix/check tasks, headline counts or score effects. Eligibility, downloads and consent are unchanged.

These AI-only candidates are excluded from normalized findings, Fix/Check groups, headline counts, scores and the concise PDF fix list. They give neither penalties nor empty-positive credit. Deterministic identical-wording `consistency.items` warnings keep the normal Check path and zero-credit numerical review signal; an empty numerical screen still earns no credit. The image candidate path and generic compatibility helpers are unchanged. This is a presentation/export gate only: source policy, models, thresholds, source/report identity and frozen evaluation snapshots are unchanged.

## Stages and retained evidence

Eligible 40–320-character sentences retain their original text, page, block IDs and supplied source context. References, captions and contents-like lines are excluded. Rules group wording that differs only in numbers; optional embeddings retrieve differently worded related sentences on different pages. Both paths apply the same English quantity/scope vetoes. Embeddings cannot override those vetoes. Original statements and context are never rewritten into synthesized facts.

The encoder receives the original sentence first and up to 480 characters of source context. Existing model configuration, thresholds, language consent and consumed-token receipts remain unchanged. A normalized value used internally is not substituted into the source evidence. Pair values retain the `{unit, a, b}` shape; parser offsets and scope caches remain internal and are released after each selection.

## Quantity and scope policy

- Consume the whole numeric token before validating it. Supported comma- or space-grouped decimal amounts, such as `$1,200.50`, normalize to the same amount as `$1200.50`; malformed grouping/decimal forms abstain rather than accepting a truncated numeric prefix.
- Normalize explicit magnitude words against recognized units. Distinguish USD/EUR and percentage points (including hyphenated percentage-point modifiers) from relative percentages. Bare magnitudes without a recognized counted dimension cannot establish a comparable measurement.
- Compare clause-owned measurements. A repeated value suppresses a disagreement only when it is comparable within the same scoped measurement; swapping affected/displaced counts no longer hides both conflicts.
- Veto conflicting recognized measures, hazards, populations, denominators, locations, dates, observation times, reporting basis and change direction. Quarter spellings such as `Q1` and `first quarter` share a key; differing or one-sided quarter/recognized period scope abstains.
- Distinct retained short heading paths conservatively veto pairing, including opaque or bare place headings such as `Nairobi / Flood assessment`. This does not classify the heading as a known place. Identical headings remain eligible; unequal headings can hide legitimate paraphrases.
- Approximate, estimated or rounded wording abstains without inventing a tolerance, including exact-looking parenthetic values inside approximate prose. Subsets, explicit intervals, signed/rate notation and unresolved dimensions also abstain. The detector does not determine whether an interval and a point estimate actually conflict.

These changes address the seven confirmed red-team findings: grouped decimal truncation, quarter omission, ignored bare-heading scopes, rounding false flags, percentage-point conflation, cross-clause suppression, and matching work continuing after the output cap. Intended positive test fixtures now use exact percentages rather than “nearly nine in ten”; separate regressions retain approximation abstention. Useful exact-count and shared-measure paraphrases remain covered.

## Work bounds, ordering and coverage

Default limits in `FACT_LIMITS` are six findings, 50,000 pair visits, 50,000 scoped pair checks and 20,000,000 vector multiplications per selection. Scopes are parsed once per source candidate as needed. Group construction uses append operations rather than repeatedly copying a growing group. Candidate/source collection is retained; it is not silently truncated by the pair matcher.

Rules preserve group insertion order, then source `i,j` order, and stop after the requested findings. The semantic stage visits source `i,j` pairs, calculates eligible cosine scores within the work limits, sorts scores descending with stable source-order ties, and then applies scope checks until the requested findings or scope limit. Thus an early mediocre flag cannot crowd out a later higher-scoring candidate within a completed score scan. A capped score scan cannot promise global top results outside the visited prefix.

The normal largest shipped workload is 300 facts with 384-dimensional vectors: 44,850 pairs and at most 17,222,400 vector multiplications, fully within these work bounds. The 160-fact workload also fits. Normal result-limit stopping still leaves remaining comparisons unassessed. Oversized inputs can exhaust a work bound; this produces an explicit coverage receipt, not an exception or a document-analysis failure. Sorting/retained score candidates are bounded by pair visits; initial source collection/grouping remains linear in supplied candidates. These are operation bounds, not browser RAM or timing guarantees.

Existing `identicalWordingPairs` and `similarPairs` array APIs remain available. Detailed `identicalWordingSelection` and `similarPairSelection` helpers return `{pairs, coverage}`. Application callers preserve coverage in `report.consistency.factCoverage` and `report.semantic.factCoverage`:

| Field | Meaning |
| --- | --- |
| `candidates` | Supplied candidate count; semantic reports preserve the original pre-model-budget count. |
| `totalPairs` | All unordered pairs in this selection's candidate pool, including pairs later excluded by page/wording/vector guards. |
| `pairVisits` | Pairs visited by the rules groups or semantic score scan. |
| `pairChecks` | Pairs passed to the scoped disagreement policy. |
| `similarityChecks`, `vectorOperations` | Cosine dot products attempted and their vector element multiplications. |
| `capped`, `reason` | Incomplete work and first stopping reason: `result-limit`, `pair-visit-limit`, `scope-check-limit`, or `vector-work-limit`; otherwise false/null. |

Semantic coverage retains `compared` (embedded candidate count), plus `selectedCandidates`, `skippedCandidates`, `factBudget` and `selectionReason` (`model-fact-budget`, `insufficient-cross-page-candidates`, or null). Model-budget selection keeps the existing evenly spread document sampling. Pair counters describe the selected pool, not every original candidate. A receipt's completed scan is not a claim that every source quantity was understood.

## Limits and verification

English heuristics do not establish support for other languages. Unknown or missing scope, age bands, revisions, synonyms, complex clauses, unrecognized periods, currencies and dimensions can still cause false positives or misses. Year-like counts can be mistaken for dates. Approximation and opaque-heading vetoes deliberately sacrifice some recall; no arbitrary numeric tolerance is inferred. Multilingual encoders do not make these English scope rules multilingual.

Fresh regression tests exercise the seven reproducers, true-positive paraphrases, ordering, caps, report coverage and source evidence retention. Injected vectors test policy, not measured model accuracy. A 1,000-candidate rules regression establishes six scoped checks before result-limit stopping; local Node timing is functional performance evidence only. Frozen confirmation labels and outputs were not inspected during this remediation. Independent evaluator observations belong in separate evaluation receipts and do not establish full-document or real-world accuracy.

Functional scale probe on Node v24.18.0 (one local run, 23 October 2026): 1,000 same-wording candidates with conflicts took 12 ms and six scope checks; 1,000 candidates with distinct heading scopes took 159 ms and stopped at 50,000 visits; a 300-candidate, 384-dimension semantic workload with distinct headings took 208 ms and completed all 44,850 score/scope checks. These synthetic local timings exclude inference, parsing, UI and browser overhead and are not device-performance promises.

Remediation verification: 507/507 tests across 64 files passed with `npm test`; `npm run build` passed (existing large-bundle warnings remain); `git diff --check` passed. The focused numerical/context/consistency/flag suite passed 104/104. That remediation verification preceded the presentation gate above. Gate browser/PDF checks use injected synthetic receipts and do not measure model quality.


Presentation-gate verification (23 October 2026): all 509 tests across 64 files and the production build passed; existing large-chunk warnings remain. Regressions prove AI candidates do not enter normalized numerical findings, Check/headline/score/concise-sheet outputs, while exact captured receipts survive; actual generated PDF text includes long original context and unrounded similarity only in the full appendix, and deterministic warnings remain in both PDF variants. An isolated browser checked desktop (1440×1000), mobile (390×844) and `/pdf-signal-check/`, including the numerical-only offer before consent. Four browser-downloaded PDFs (AI-only and mixed rule/AI, full and concise) were rendered with Poppler; all pages were visually inspected with readable wrapping and no clipping/overlap. Ignored evidence is in `dev-corpus/experimental-gate/REPORT.md` and `proof/`. Saved actual-worker outputs from three tiny synthetic tagged PDFs were replayed through the final presentation gate without new inference; raw candidates, captured source evidence and acceptance remained unchanged, with no AI-only tasks or score effect. This verifies presentation/export contracts, not real-world accuracy, crop fidelity, browser coverage beyond Chromium or PDF/UA certification.
