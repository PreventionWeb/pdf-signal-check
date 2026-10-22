/**
 * "Same fact, different numbers": sentences that state a quantity, and pairs that measure the same thing differently.
 * Rules pick candidate sentences and screen differing quantities against bounded source scope; optional
 * embeddings screen relatedness, not measurement identity. Years alone never count as a different number.
 */
export const FACT_LIMITS = Object.freeze({ minCharacters: 40, maxCharacters: 320, maxPairs: 6 });

import { readQuantities, comparableQuantities, hasRange } from './facts-scope.js';

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
  const qa = readQuantities(a.text), qb = readQuantities(b.text);
  // Subsets and explicit intervals need richer relation handling than these bounded heuristics.
  if (qa.some(q => q.subset) || qb.some(q => q.subset) || hasRange(a.text) || hasRange(b.text)) return null;
  const differ = [];
  for (const x of qa) for (const y of qb) {
    if (!comparableQuantities(a, x, b, y)) continue;
    const av = x.value * x.scale, bv = y.value * y.scale;
    if (av === bv) continue;
    // Repeated values in either source are restatements, not evidence of a discrepancy.
    if (qb.some(q => q.dimension === x.dimension && q.value * q.scale === av)
      || qa.some(q => q.dimension === y.dimension && q.value * q.scale === bv)) continue;
    const sameScale = x.scale === y.scale && x.unit === y.unit;
    const value = { unit: sameScale ? x.unit : x.dimension, a: sameScale ? x.value : av, b: sameScale ? y.value : bv };
    if (!differ.some(v => v.unit === value.unit && v.a === value.a && v.b === value.b)) differ.push(value);
  }
  return differ.length ? differ.slice(0, 3) : null;
}

const skeleton = text => text.toLowerCase().replace(/\d[\d,.]*/g, '#').replace(/[^\p{L}#]+/gu, ' ').trim();
/** Pairs worded identically apart from their numbers: no AI needed. */
export function identicalWordingPairs(candidates, limits = FACT_LIMITS) {
  const groups = new Map();
  for (const candidate of candidates) groups.set(skeleton(candidate.text), [...(groups.get(skeleton(candidate.text)) || []), candidate]);
  const pairs = [];
  for (const group of groups.values()) for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
    const values = group[i].page !== group[j].page && conflictingValues(group[i], group[j]);
    if (values && pairs.length < limits.maxPairs) pairs.push({ a: group[i], b: group[j], values, similarity: 1, method: 'identical-wording' });
  }
  return pairs;
}

/** Given embeddings for the candidates, the most similar pairs on different pages that disagree on a value. */
export function similarPairs(candidates, vectors, threshold, limits = FACT_LIMITS) {
  const pairs = [];
  for (let i = 0; i < candidates.length; i++) for (let j = i + 1; j < candidates.length; j++) {
    const a = candidates[i], b = candidates[j];
    if (a.page === b.page || skeleton(a.text) === skeleton(b.text)) continue;
    if (!vectors[i]?.length || vectors[i].length !== vectors[j]?.length) continue;
    let similarity = 0;
    for (let k = 0; k < vectors[i].length; k++) similarity += vectors[i][k] * vectors[j][k];
    if (!Number.isFinite(similarity) || similarity < threshold) continue;
    const values = conflictingValues(a, b);
    if (values) pairs.push({ a, b, values, similarity, method: 'embedding-screening' });
  }
  return pairs.sort((x, y) => y.similarity - x.similarity).slice(0, limits.maxPairs);
}
