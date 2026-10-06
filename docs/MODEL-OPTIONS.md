# Model options for metadata comparison

Research notes recorded October 5, 2026. These options support title similarity and subject relevance screening; they do not validate PDF structure or prove metadata identity. App 0.4 ships two pinned choices, MiniLM English and Granite R2 multilingual. Browser WASM smoke tests verify integration; they are not quality or speed benchmarks. See [shipped configuration and limits](SEMANTIC.md).

## Shipped choices and remaining shortlist

For English and a small download, compare MiniLM with mxbai-xsmall. For multilingual documents, compare Granite R2, Bekko, and E5-small. Include EmbeddingGemma as a higher-capacity comparator if the download budget allows it.

The approximate decimal MB figures below were recorded from model-host artifact sizes during research. They include the selected model graph and tokenizer unless noted, exclude the Transformers.js and ONNX runtime plus smaller configuration files, and are not peak RAM measurements. Recheck the pinned revision before implementation. Browser exports and examples establish an available integration path, not verified performance on our devices.

| Candidate | Scope and context | Recorded browser assets | Role and source |
| --- | --- | --- | --- |
| all-MiniLM-L6-v2 | English; about 23M parameters; default 256 word pieces; 384 dimensions | Quantized ONNX available; package size to record for pinned revision | Shipped compact English option (~23.68 MB model/tokenizer, q8). [Original](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2), [JS export](https://huggingface.co/Xenova/all-MiniLM-L6-v2) |
| mxbai-embed-xsmall-v1 | English; 24.1M; 4,096 tokens; 384 dimensions | q8 model 24.4 MB + tokenizer 0.7 MB, about 25.2 MB total | First compact English challenger; Apache 2.0. [Card](https://huggingface.co/mixedbread-ai/mxbai-embed-xsmall-v1), [official JS example](https://huggingface.co/docs/transformers.js/v3.8.1/guides/webgpu) |
| Granite embedding 97M multilingual R2 | Released April 2026; about 97M; 32,768 tokens; 384 dimensions; 52 languages enhanced explicitly, broader pretraining coverage | q8 model 97.9 MB + tokenizer 25.3 MB, about 123.2 MB total | Shipped multilingual option (~123.16 MB model/tokenizer, q8); Apache 2.0. [Original](https://huggingface.co/ibm-granite/granite-embedding-97m-multilingual-r2), [JS export](https://huggingface.co/onnx-community/granite-embedding-97m-multilingual-r2-ONNX) |
| Bekko embedding v1 a8m | Released July 2026; 106M total, about 7.7M active parameters; 8,192 tokens; 384 dimensions | Recommended graph 130.1 MB + tokenizer 34.4 MB, about 164.5 MB total | Emerging CPU-oriented challenger; MIT. Active parameters do not describe download size. [Author card and browser examples](https://huggingface.co/hotchpotch/bekko-embedding-v1-a8m), [paper](https://arxiv.org/abs/2607.25180) |
| multilingual E5-small | Established 2023 baseline; about 118M; 512 tokens; 384 dimensions | q8 model 118.3 MB + tokenizer 17.1 MB, about 135.4 MB total | Multilingual control; MIT. [Original](https://huggingface.co/intfloat/multilingual-e5-small), [JS export](https://huggingface.co/Xenova/multilingual-e5-small) |
| EmbeddingGemma 300M | Released September 2025; about 300M; multilingual; 2,048 tokens; 768 dimensions | q4 graph and external weights about 197.2 MB, plus tokenizer | Higher-capacity comparator; Gemma terms. [Original](https://huggingface.co/google/embeddinggemma-300m), [JS export](https://huggingface.co/onnx-community/embeddinggemma-300m-ONNX) |

## Configuration differences

- **MiniLM:** mean pooling and normalization; chunk passages to respect its short default context. English results do not establish multilingual suitability.
- **Granite R2:** CLS pooling; official examples use unprefixed input. Do not apply MiniLM mean pooling indiscriminately.
- **Bekko:** mean pooling and no query or document prefixes. The recommended graph quantizes vocabulary embeddings while retaining transformer layers at fp32. The author's JS example selects it with `dtype: "fp32"`; fully quantized alternatives are marked not recommended in the researched card.
- **E5:** prefixes are required. Use `query: ` on both titles for symmetric similarity; use `query: ` for metadata and `passage: ` for excerpts in retrieval. Its score distribution differs from MiniLM, so thresholds must be calibrated separately.
- **EmbeddingGemma:** use the task-specific similarity formatting described in its card. An [open issue at research time](https://github.com/huggingface/transformers.js/issues/1728) reported incorrect q4/q8 WebGPU embeddings on one Windows and Nvidia configuration. This is a reported configuration-specific problem, not established universal incompatibility. Recheck status and compare reference outputs before shipping.

Transformers.js supports browser CPU inference through WASM and optional WebGPU acceleration. Prefer a worker for model computation. [Official documentation](https://huggingface.co/docs/transformers.js/index)

Pin pooling, normalization, prefixes, precision, model revision, and tokenizer with evaluation results. Backend numeric differences can affect borderline scores; repeatability does not establish semantic correctness.

## Other models to watch

| Option | Reason to track or defer |
| --- | --- |
| [Jina embeddings v5 nano](https://huggingface.co/jinaai/jina-embeddings-v5-text-nano) and [small](https://huggingface.co/jinaai/jina-embeddings-v5-text-small) | February 2026; task-specific text matching is relevant. Nano is 239M and small 677M. CC-BY-NC-4.0 weight licensing and adapter/export complexity reduce convenience. An ONNX retrieval adapter is not automatically the text-matching model or a proven JS integration. |
| [Horizon multilingual-embedding-small](https://huggingface.co/Horizon-Labs/multilingual-embedding-small) | Created October 1, 2026; Apache 2.0; 141M; 512 tokens; browser example supplied. Recorded quantized graph about 269 MB. Very new and limited evaluation; monitor rather than prioritize. |
| [Harrier OSS 270M browser export](https://huggingface.co/onnx-community/harrier-oss-v1-270m-ONNX) | March 2026; MIT; instruction-sensitive comparator. Recorded q4 graph and weights about 206 MB plus roughly 20 MB tokenizer. Larger than the initial multilingual shortlist. |
| [paraphrase-multilingual-MiniLM-L12-v2](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2) | Symmetric multilingual baseline; about 118M, roughly 135 MB model and tokenizer package, default sentence-transformers limit 128 tokens. Not the same compact deployment class as English L6 MiniLM. |

## How to select a model

General retrieval and embedding benchmarks identify candidates. They do not establish sensitivity to wrong years, editions, organizations, or countries in similar titles. Neither a high similarity score nor a longer context window proves a metadata match.

Follow the [evaluation plan](PLAN.md#evaluation), keeping title identity separate from topical relevance. Compare rules alone, embeddings alone, and their combination. Select a default based on false acceptance, uncertainty, supported languages, and actual browser cost.

A compact reranker or generative model may be evaluated later for unresolved cases. No such model is selected. The first version should remain useful with deterministic checks alone.
