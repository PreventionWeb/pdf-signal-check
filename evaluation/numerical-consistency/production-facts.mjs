/**
 * "Same fact, different numbers": sentences that state a quantity, and pairs that measure the same thing differently.
 * Rules pick candidate sentences and decide whether two sentences give different values for the same unit; the optional
 * AI decides whether the two sentences are about the same thing. Years alone never count as a different number.
 */
export const FACT_LIMITS = Object.freeze({ minCharacters: 40, maxCharacters: 320, maxPairs: 6 });

const UNITS = /^(%|per|percent|million|billion|trillion|thousand|countries|country|people|persons|deaths|lives|households|cities|members|states|usd|us\$|dollars|euros|hectares|ha|km|km2|square|tonnes|tons|mw|gw|cases|events|disasters|hazards|reports|projects|partners|organizations|organisations|governments|municipalities|schools|hospitals|children|women|staff|participants|times|fold|years)$/i;
const CITATION = /\bet al\b|\bibid\b|\bdoi\b|https?:|www\.|\bvol\.|\bpp?\.\s*\d|isbn|issn|\(\s*(?:19|20)\d{2}[a-z]?\s*\)|,\s*(?:19|20)\d{2}[a-z]?\.?$/i;
const CAPTION = /^\s*(figure|fig\.|table|box|map|chart|graph|source|sources|note|notes)\b/i;
const LEADERS = /[._·…]{4,}|\s\d{1,3}$/;
const YEAR = /^(?:19|20)\d{2}$/;

/** The quantities a sentence states: a number and the word (or %) that says what it counts. */
export function quantities(text) {
  const found = [];
  for (const match of String(text).matchAll(/(?<![\w.])(\d{1,3}(?:[,\s]\d{3})+|\d+(?:\.\d+)?)\s?(%|[\p{L}$]+)?/gu)) {
    const raw = match[1].replace(/[,\s]/g, '');
    let unit = (match[2] || '').toLowerCase();
    // Explicit subset wording inherits the nearest stated unit: "124 countries, 77 of which ...".
    // Recovering that shared value prevents pairing the total with its own subset on another page.
    if (unit === 'of' && /^\s+(which|these|those|them)\b/i.test(String(text).slice(match.index + match[0].length)) && found.length) unit = found.at(-1).unit;
    if (YEAR.test(raw) && !UNITS.test(unit)) continue;
    if (!unit || !UNITS.test(unit)) continue;
    found.push({ value: Number(raw), unit: unit === 'percent' || unit === 'per' ? '%' : unit.replace(/^country$/, 'countries') });
  }
  return found;
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
const hazards = text => new Set((String(text).toLowerCase().match(/\b(?:floods?|droughts?|landslides?|earthquakes?|cyclones?|wildfires?|tsunamis?)\b/g) || []).map(word => word.replace(/s$/, '')));
function distinctHazards(a, b) {
  const left = hazards(`${a.context || ''} ${a.text}`), right = hazards(`${b.context || ''} ${b.text}`);
  // A list of several hazards is ambiguous, not evidence for rejecting a comparison.
  return left.size === 1 && right.size === 1 && [...left][0] !== [...right][0];
}

const STOP = new Set('a an the and or of to in on for by with from at as is are was were be been this that these those its their our its which who while than into over under about more less nearly around some per cent percent'.split(' '));
const stem = word => word.replace(/(ing|ed|es|s)$/, '');
/** Content words around the n-th number in a sentence: what that number measures. */
function around(text, value, unit) {
  const words = text.toLowerCase().replace(/(\d),(\d{3})/g, '$1$2').split(/[^\p{L}\p{N}.%$]+/u).filter(Boolean);
  const index = words.findIndex(word => Number(word.replace(/[%$]/g, '')) === value);
  if (index < 0) return new Set();
  return new Set(words.slice(Math.max(0, index - 5), index + 11).filter(word => !/\d/.test(word) && !STOP.has(word) && word.length > 2 && word !== unit).map(stem));
}
const yearsOf = text => new Set(String(text).match(/\b(?:19|20)\d{2}\b/g) || []);

/**
 * Two sentences give a different value for the same thing. Not a conflict: one repeating some of the other's values,
 * sentences about different years, a value inside the other's range, or numbers that describe different things.
 */
export function conflictingValues(a, b) {
  if (distinctHazards(a, b)) return null;
  // Sentences about entirely different years can rightly give different figures.
  const ya = yearsOf(a.text), yb = yearsOf(b.text);
  if (ya.size && yb.size && ![...ya].some(year => yb.has(year))) return null;
  const times = text => new Set(String(text).match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g) || []);
  const ta = times(`${a.context || ''} ${a.text}`), tb = times(`${b.context || ''} ${b.text}`);
  if (ta.size && tb.size && ![...ta].some(time => tb.has(time))) return null;
  const differ = [];
  for (const unit of new Set(a.quantities.map(x => x.unit))) {
    const va = a.quantities.filter(x => x.unit === unit).map(x => x.value), vb = b.quantities.filter(x => x.unit === unit).map(x => x.value);
    if (!vb.length) continue;
    const onlyA = va.filter(x => !vb.includes(x)), onlyB = vb.filter(x => !va.includes(x));
    if (!onlyA.length || !onlyB.length) continue;
    const inside = (x, list) => list.length > 1 && x >= Math.min(...list) && x <= Math.max(...list);
    for (const x of onlyA) for (const y of onlyB) {
      if (inside(x, vb) || inside(y, va)) continue;
      const left = around(a.text, x, unit), right = around(b.text, y, unit);
      const shared = [...left].filter(word => right.has(word)).length;
      if (shared / Math.max(1, Math.min(left.size, right.size)) >= 0.6 && shared >= 2) differ.push({ unit, a: x, b: y });
    }
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
    let similarity = 0;
    for (let k = 0; k < vectors[i].length; k++) similarity += vectors[i][k] * vectors[j][k];
    if (similarity < threshold) continue;
    const values = conflictingValues(a, b);
    if (values) pairs.push({ a, b, values, similarity, method: 'embedding-screening' });
  }
  return pairs.sort((x, y) => y.similarity - x.similarity).slice(0, limits.maxPairs);
}
