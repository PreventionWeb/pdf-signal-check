# Experiment: show supporting passages, not opaque similarity judgments

Status: uncommitted prototype following checkpoint `af656c9`. Normal application behavior is unchanged unless `?experiment=semantic-evidence` is present. The flag applies to single-document subject and keyword comparisons; title, heading, batch, and deterministic profile checks keep their existing behavior. Model downloads still require the existing explicit consent.

## What we are trying to learn

The current MiniLM and Granite models encode text into vectors; cosine similarity is already the comparison mechanism. They do not generate explanations, interpret figures, or establish factual correctness. The useful question is whether meaning-based matching improves on literal word matching enough to justify its download, runtime, and uncertainty.

The normal subject/keyword comparison reads bounded opening excerpts. A topic covered later can therefore look unsupported. The prototype collects excerpts of at most 800 characters across extracted page blocks, retains at most 240 evenly distributed excerpts, and selects up to eight per metadata value. Selection combines weighted literal matches, opening excerpts, and distributed samples. The existing embedding comparison ranks those candidates. It records candidate coverage and the strongest literal match alongside the actual AI evidence.

The intake explicitly labels experiment mode. A dedicated panel directly below the result hero lets users select saved descriptions and keywords, including successful checks that never appear in the review checklist. It shows word-matched evidence even with No AI selected, and the passage ranked highest by AI when a recorded experimental comparison exists, with page links. Missing AI results are labelled Not run rather than hidden. It distinguishes literal overlap, semantic similarity, and document correctness. Broader evidence receipts change guidance to describe the selected excerpts instead of claiming the model only inspected the opening.

## Limits and risks

- Candidate selection can miss paraphrases, short-range context, or text excluded by the 240-excerpt bound. It is not whole-document validation.
- Word selection favors literal wording. AI ranks only selected candidates; this is not exhaustive semantic retrieval.
- More candidates can increase maximum similarity and false reassurance. Existing provisional thresholds have not been recalibrated for this strategy.
- Character splitting may divide words or sentences. Geometry identifies source blocks, not an exact substring crop.
- Existing tokenizer truncation and model language limits still apply; the displayed AI passage uses recorded consumed text when available.
- No new model, cloud service, uploads, telemetry, generated explanation, or acceptance-policy change was added.

## Decision before committing

Compare three approaches on the same independently labelled real reports: existing opening-only embeddings, document word matching alone, and this candidate-selection plus embedding method. Include genuine later-page support, paraphrases with no literal overlap, irrelevant metadata, multilingual reports, repeated boilerplate, negation, and absent metadata. Record false concerns, false reassurance, omitted evidence, model truncation, runtime, and download costs. Split calibration and evaluation documents. Keep the experiment only if it improves useful evidence and reduces mistakes without hiding uncertainty; do not infer an accuracy percentage from a similarity score.

A separate future experiment could group headings into a navigable outline or identify unsupported metadata values across sections. Generative metadata drafting or image interpretation would require a different model, separate consent/cost design, and independent evaluation.

## Verification

Unit tests cover bounded retention, later-page source identity, long-block tails, no-overlap behavior, original-request isolation, and runtime receipt propagation using synthetic vectors. The component was checked with a labelled synthetic ranking fixture. The full application was also checked at desktop and mobile widths using the actual Well prepared sample with No AI: metadata selection changes the word evidence, and Inspect opens the existing PDF modal. The experiment-mode intake was checked at the repository-prefixed production URL. These checks establish plumbing and presentation, not model accuracy. No actual model inference has been run for this prototype yet. No PDF export layout was changed or visually revalidated for this experiment.

References: [MiniLM model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2), [Granite embedding model card](https://huggingface.co/ibm-granite/granite-embedding-97m-multilingual-r2).
