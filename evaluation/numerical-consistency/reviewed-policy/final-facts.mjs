/**
 * "Same fact, different numbers": sentences that state a quantity, and pairs that measure the same thing differently.
 * Rules pick candidate sentences and screen differing quantities against bounded source scope; optional
 * embeddings screen relatedness, not measurement identity. Years alone never count as a different number.
 */
export const FACT_LIMITS = Object.freeze({ minCharacters: 40, maxCharacters: 320, maxPairs: 6, maxPairVisits: 50_000, maxPairChecks: 50_000, maxVectorOperations: 20_000_000 });

import { readQuantities, scopedQuantities, comparableQuantities, hasRange } from './facts-scope.js';

const CITATION = /\bet al\b|\bibid\b|\bdoi\b|https?:|www\.|\bvol\.|\bpp?\.\s*\d|isbn|issn|\(\s*(?:19|20)\d{2}[a-z]?\s*\)|,\s*(?:19|20)\d{2}[a-z]?\.?$/i;
const CAPTION = /^\s*(figure|fig\.|table|box|map|chart|graph|source|sources|note|notes)\b/i;
const LEADERS = /[._·…]{4,}|\s\d{1,3}$/;
/** Public receipts retain the original value/unit shape; internal parsing also keeps offsets and scale. */
export function quantities(text) {
  return readQuantities(text).map(({ value, unit }) => ({ value, unit }));
}

/** Sentences stating a quantity, outside references, captions and contents lines. */
export function factCandidates(sentencesByPage, limits = FACT_LIMITS) {
  const candidates = [];
  for (const { page, sentences } of sentencesByPage) for (const sentence of sentences) {
    const text = sentence.text;
    if (text.length < limits.minCharacters || text.length > limits.maxCharacters || CITATION.test(text) || CAPTION.test(text) || LEADERS.test(text)) continue;
    const stated = quantities(text);
    if (stated.length) candidates.push({ page, text, blockIds: sentence.blockIds, quantities: stated, ...(sentence.context ? { context: sentence.context } : {}) });
  }
  return candidates;
}


/** Context is source evidence, not a model-generated interpretation; keep the measured sentence verbatim. */
export function factEmbeddingText(fact) {
  return fact.context ? `${fact.text}\nContext: ${fact.context.slice(0, 480)}` : fact.text;
}
/**
 * Candidate numerical disagreements, grounded in bounded source scope. This is a flag-only
 * screen, never verification of measurement identity. Original sentences/context are untouched.
 */
export function conflictingValues(a, b) {
  return conflicts(a, scopedQuantities(a), b, scopedQuantities(b));
}
function conflicts(a, qa, b, qb) {
  // Subsets and explicit intervals need richer relation handling than these bounded heuristics.
  if (qa.some(q => q.subset) || qb.some(q => q.subset) || hasRange(a.text) || hasRange(b.text)) return null;
  const differ = [];
  for (const x of qa) for (const y of qb) {
    if (!comparableQuantities(a, x, b, y)) continue;
    const av = x.value * x.scale, bv = y.value * y.scale;
    if (av === bv) continue;
    // Repeated values in either source are restatements, not evidence of a discrepancy.
    if (qb.some(q => q.value * q.scale === av && comparableQuantities(a, x, b, q))
      || qa.some(q => q.value * q.scale === bv && comparableQuantities(a, q, b, y))) continue;
    const sameScale = x.scale === y.scale && x.unit === y.unit;
    const value = { unit: sameScale ? x.unit : x.dimension, a: sameScale ? x.value : av, b: sameScale ? y.value : bv };
    if (!differ.some(v => v.unit === value.unit && v.a === value.a && v.b === value.b)) differ.push(value);
  }
  return differ.length ? differ.slice(0, 3) : null;
}

const skeleton = text => text.toLowerCase().replace(/\d[\d,.]*/g, '#').replace(/[^\p{L}#]+/gu, ' ').trim();
/** Each selection owns parsed scopes; neither source candidates nor receipts are mutated. */
function selection(candidates, limits) {
  const bounds = { ...FACT_LIMITS, ...limits }, cache = new Map();
  const coverage = { candidates: candidates.length, totalPairs: candidates.length * (candidates.length - 1) / 2,
    pairVisits: 0, pairChecks: 0, similarityChecks: 0, vectorOperations: 0, capped: false, reason: null };
  const stop = reason => { coverage.capped = true; coverage.reason = reason; };
  const parsed = fact => {
    if (!cache.has(fact)) cache.set(fact, scopedQuantities(fact));
    return cache.get(fact);
  };
  const check = (a, b) => {
    coverage.pairChecks++;
    return conflicts(a, parsed(a), b, parsed(b));
  };
  return { bounds, coverage, stop, check };
}

/** Array API retained for consumers that only need flags; detailed API records incomplete work. */
export function identicalWordingPairs(candidates, limits = FACT_LIMITS) {
  return identicalWordingSelection(candidates, limits).pairs;
}

/** Rules preserve group insertion order, then source i/j order; stop as soon as maxPairs is met. */
export function identicalWordingSelection(candidates, limits = FACT_LIMITS) {
  const { bounds, coverage, stop, check } = selection(candidates, limits), groups = new Map(), pairs = [];
  for (const candidate of candidates) {
    const key = skeleton(candidate.text);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(candidate);
  }
  outer: for (const group of groups.values()) for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
    if (pairs.length >= bounds.maxPairs) { stop('result-limit'); break outer; }
    if (coverage.pairVisits >= bounds.maxPairVisits) { stop('pair-visit-limit'); break outer; }
    coverage.pairVisits++;
    if (group[i].page === group[j].page) continue;
    if (coverage.pairChecks >= bounds.maxPairChecks) { stop('scope-check-limit'); break outer; }
    const values = check(group[i], group[j]);
    if (values) pairs.push({ a: group[i], b: group[j], values, similarity: 1, method: 'identical-wording' });
  }
  return { pairs, coverage };
}

export function similarPairs(candidates, vectors, threshold, limits = FACT_LIMITS) {
  return similarPairSelection(candidates, vectors, threshold, limits).pairs;
}

/** Rank all bounded cosine candidates before scope work, preserving global top scores and stable ties.
 * Defaults cover all 44,850 pairs of the largest shipped 300-fact / 384-dimension workload.
 * Oversized direct callers receive an explicit cap receipt, never a claim of complete screening.
 */
export function similarPairSelection(candidates, vectors, threshold, limits = FACT_LIMITS) {
  const { bounds, coverage, stop, check } = selection(candidates, limits), ranked = [], pairs = [];
  const keys = candidates.map(candidate => skeleton(candidate.text));
  outer: for (let i = 0; i < candidates.length; i++) for (let j = i + 1; j < candidates.length; j++) {
    if (coverage.pairVisits >= bounds.maxPairVisits) { stop('pair-visit-limit'); break outer; }
    coverage.pairVisits++;
    const a = candidates[i], b = candidates[j];
    if (a.page === b.page || keys[i] === keys[j]) continue;
    if (!vectors[i]?.length || vectors[i].length !== vectors[j]?.length) continue;
    if (coverage.vectorOperations + vectors[i].length > bounds.maxVectorOperations) { stop('vector-work-limit'); break outer; }
    coverage.similarityChecks++;
    coverage.vectorOperations += vectors[i].length;
    let similarity = 0;
    for (let k = 0; k < vectors[i].length; k++) similarity += vectors[i][k] * vectors[j][k];
    if (Number.isFinite(similarity) && similarity >= threshold) ranked.push({ a, b, similarity });
  }
  ranked.sort((x, y) => y.similarity - x.similarity);
  for (const { a, b, similarity } of ranked) {
    if (pairs.length >= bounds.maxPairs) { if (!coverage.capped) stop('result-limit'); break; }
    if (coverage.pairChecks >= bounds.maxPairChecks) { if (!coverage.capped) stop('scope-check-limit'); break; }
    const values = check(a, b);
    if (values) pairs.push({ a, b, values, similarity, method: 'embedding-screening' });
  }
  return { pairs, coverage };
}
