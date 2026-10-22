import { describe, it, expect } from 'vitest';
import { quantities, conflictingValues, similarPairs, identicalWordingPairs, factCandidates, factEmbeddingText, identicalWordingSelection, similarPairSelection, FACT_LIMITS } from '../src/engine/facts.js';

const fact = (page, text, context) => ({ page, text, quantities: quantities(text), blockIds: [page], ...(context ? { context } : {}) });
const compare = (a, b) => conflictingValues(fact(1, a), fact(2, b));
import { inspectConsistency } from '../src/engine/consistency.js';
import { assessSemantic } from '../src/engine/semantic.js';

const screened = (a, b) => similarPairs([a, b], [[1, 0], [1, 0]], 0.88);

describe('grounded numerical screening: positive paraphrases', () => {
  it.each([
    ['Floods affected 1200 people in Kenya in 2024.', 'In Kenya in 2024, flooding impacted 1500 persons.'],
    ['The earthquake caused 120 deaths in Nepal in 2024.', 'In Nepal in 2024, the earthquake killed 150 people.'],
    ['In Kenya, floods displaced 1200 people during 2024.', 'Flood displacement in Kenya during 2024 reached 1500 persons.'],
    ['In 2024, the likelihood of flooding was 40% for adults.', 'Adults faced a 55% chance of flooding in 2024.'],
  ])('finds a bounded shared-measure paraphrase: %s', (a, b) => {
    expect(screened(fact(1, a), fact(2, b))).toHaveLength(1);
    expect(similarPairs([fact(1, a), fact(2, b)], [[1, 0], [0, 1]], 0.88)).toEqual([]);
  });
  it('normalizes scale for equivalent counts and differently scaled disagreements', () => {
    expect(compare('Floods affected 1 million people in Kenya.', 'In Kenya, flooding impacted 1000000 people.')).toBeNull();
    expect(compare('Floods affected 1 million people in Kenya.', 'In Kenya, flooding impacted 1200000 people.')).toEqual([{ unit: 'people', a: 1000000, b: 1200000 }]);
    expect(compare('Floods affected 1.2 million people in Kenya.', 'In Kenya, flooding impacted 1500000 people.')).toEqual([{ unit: 'people', a: 1200000, b: 1500000 }]);
  });
  it('retains rate notation only when it really means percent', () => {
    expect(quantities('Coverage was 40 per cent of households.')).toEqual([{ value: 40, unit: '%' }]);
    expect(quantities('Coverage was 40 percent of households.')).toEqual([{ value: 40, unit: '%' }]);
    expect(quantities('Mortality was 40 per 100000 people.')).not.toContainEqual({ value: 40, unit: '%' });
    expect(compare('Coverage was 40 per cent of households in Kenya.', 'Coverage was 55% of households in Kenya.')).toEqual([{ unit: '%', a: 40, b: 55 }]);
  });
  it('does not treat separate clause values as the endpoints of a range', () => {
    expect(compare('Floods affected 20 people and displaced 80 people in Kenya.', 'Floods affected 40 people and displaced 90 people in Kenya.')).toEqual([
      { unit: 'people', a: 20, b: 40 }, { unit: 'people', a: 80, b: 90 },
    ]);
  });
});

describe('source scope vetoes even maximally similar vectors', () => {
  it.each([
    ['Floods affected 1 million people in Kenya.', 'Floods affected 2 million households in Kenya.'],
    ['Flood losses reached 2 billion dollars in Kenya.', 'Flood losses reached 3 billion euros in Kenya.'],
    ['Floods affected 1200 people in Kenya.', 'Floods displaced 1500 people in Kenya.'],
    ['Floods killed 120 people in Kenya.', 'Floods injured 150 people in Kenya.'],
    ['Flood coverage reached 40% of rural households.', 'Flood coverage reached 55% of urban households.'],
    ['Flood coverage reached 40% of households.', 'Flood coverage reached 55% of people.'],
    ['Flood coverage reached 40% among surveyed households.', 'Flood coverage reached 55% among registered households.'],
    ['In Kenya, floods affected 1200 people in 2024.', 'In Uganda, floods affected 1500 people in 2024.'],
    ['Floods affected 1200 people in the Philippines.', 'Floods affected 1500 people in the Netherlands.'],
    ['Floods affected 1200 people in January 2024.', 'Floods affected 1500 people in February 2024.'],
    ['Floods affected 1200 people on 1 June 2024.', 'Floods affected 1500 people on 2 June 2024.'],
    ['Floods affected 1200 people on 2024-06-01.', 'Floods affected 1500 people on 2024-06-02.'],
    ['Floods affected 1200 people in 2023 and 2024.', 'Floods affected 1500 people in 2024.'],
    ['Floods affected 1200 people annually in Kenya.', 'Floods affected 1500 people monthly in Kenya.'],
    ['Projected flood losses reached 2 billion dollars.', 'Observed flood losses reached 3 billion dollars.'],
    ['Flood exposure increased by 40% for households.', 'Flood exposure decreased by 55% for households.'],
    ['Flood losses reached 40% of household income.', 'Drought losses reached 55% of household income.'],
    ['Floods and droughts affected 1200 people in Kenya.', 'Floods affected 1500 people in Kenya.'],
    ['Mortality reached 40 per 100000 people in Kenya.', 'Mortality reached 55 per 100000 people in Kenya.'],
    ['The station recorded wind speeds of 40 km/h.', 'The station recorded wind speeds of 55 km/h.'],
    ['Flood exposure changed by -40% for households.', 'Flood exposure changed by 55% for households.'],
    ['Floods affected 2,5 million people in Kenya.', 'Floods affected 3,5 million people in Kenya.'],
    ['Flood losses reached 2 billion in Kenya.', 'Flood losses reached 3 billion in Kenya.'],
    ['Flood exposure increased by 40% for households.', 'Flood exposure was 55% for households.'],
    ['Floods affected at least 1200 people in Kenya.', 'Floods affected 1500 people in Kenya.'],
    ['Floods affected 1200 people in Kenya.', 'Floods did not affect 1500 people in Kenya.'],
    ['Floods and droughts affected 1200 people in Kenya.', 'Droughts affected 1500 people in Kenya.'],
    ['Floods affected 1200 people in Kenya and Uganda.', 'Floods affected 1500 people in Kenya.'],
  ])('abstains for incompatible or unsupported scope: %s', (a, b) => {
    expect(screened(fact(1, a), fact(2, b))).toEqual([]);
  });
  it('keeps heading-owned measures separate when the sentence is generic', () => {
    const a = fact(1, 'The reported share reached 40% during the reporting period.', 'Flood risk: land area');
    const b = fact(2, 'The reported share reached 55% during the reporting period.', 'Flood risk: population');
    expect(identicalWordingPairs([a, b])).toEqual([]);
    expect(identicalWordingPairs([a, { ...b, context: a.context }])).toHaveLength(1);
  });
  it('abstains on missing, mismatched or non-finite vectors', () => {
    const a = fact(1, 'Floods affected 1200 people in Kenya.'), b = fact(2, 'In Kenya, flooding impacted 1500 persons.');
    for (const vectors of [[[1, 0]], [[1, 0], [1]], [[1, 0], [NaN, 0]], [[], []]]) {
      expect(similarPairs([a, b], vectors, 0.88)).toEqual([]);
    }
  });
  it('uses source context for dates, location and hazard on both pairing paths', () => {
    for (const [a, b] of [
      ['Flood impacts in Kenya in 2023', 'Flood impacts in Kenya in 2024'],
      ['Flood impacts in Kenya in 2024', 'Flood impacts in Uganda in 2024'],
      ['Flood impacts in Kenya in 2024', 'Drought impacts in Kenya in 2024'],
    ]) {
      const left = fact(1, 'The disaster affected 1200 people during the reporting period.', a);
      const right = fact(2, 'The disaster affected 1500 people during the reporting period.', b);
      expect(screened(left, right)).toEqual([]);
      expect(identicalWordingPairs([left, right])).toEqual([]);
      expect(identicalWordingPairs([left, { ...right, context: a }])).toHaveLength(1);
    }
  });
  it('does not treat a shared total as a disagreement with a subset or a range', () => {
    expect(compare('124 countries report early warning systems, 77 of which were supported.', '80 countries received support for early warning systems.')).toBeNull();
    expect(compare('Flood losses reached $100 billion in Kenya.', 'Flood losses reached $76 billion to $131 billion in Kenya.')).toBeNull();
    expect(compare('Flood losses reached $100 billion in Kenya.', 'Flood losses ranged between $76 billion and $131 billion in Kenya.')).toBeNull();
  });
  it('keeps exact source evidence and bounded embedding context without mutation', () => {
    const text = 'In Kenya, floods affected 1200 people during the reporting period.';
    const source = [{ page: 1, sentences: [{ text, blockIds: [4, 5], context: 'Original heading '.repeat(60) }] }];
    const before = structuredClone(source);
    const [candidate] = factCandidates(source);
    expect(candidate).toEqual({ page: 1, ...source[0].sentences[0], quantities: [{ value: 1200, unit: 'people' }] });
    expect(factEmbeddingText(candidate)).toBe(`${text}\nContext: ${candidate.context.slice(0, 480)}`);
    compare(text, text.replace('1200', '1500'));
    expect(source).toEqual(before);
  });
});


describe('red-team numerical scope regressions', () => {
  it.each(['$1,200.50', '$1 200.50', '$1,200,000.50'])('consumes the whole grouped currency decimal: %s', amount => {
    const plain = amount.replace(/[, ]/g, '');
    const a = fact(1, `Flood losses reached ${amount} in Kenya.`), b = fact(2, `Flood losses reached ${plain} in Kenya.`);
    expect(quantities(a.text)[0].value).toBe(Number(plain.slice(1)));
    expect(conflictingValues(a, b)).toBeNull();
    expect(identicalWordingPairs([a, b])).toEqual([]);
  });
  it('keeps fractional counts and refuses malformed numeric prefixes', () => {
    expect(quantities('Floods affected 1,200.50 people in Kenya.')).toEqual([{ value: 1200.5, unit: 'people' }]);
    expect(compare('Flood losses reached $1,200.50 in Kenya.', 'Flood losses reached $1,200.75 in Kenya.')).toEqual([{ unit: 'usd', a: 1200.5, b: 1200.75 }]);
    expect(quantities('Flood losses reached $1,20.50 in Kenya.')).toEqual([]);
    expect(compare('Flood losses reached $1,20.50 in Kenya.', 'Flood losses reached $150 in Kenya.')).toBeNull();
  });
  it.each([
    ['Q1 2024', 'Q2 2024'], ['first quarter of 2024', 'second quarter of 2024'],
    ['1st quarter of 2024', '2nd quarter of 2024'], ['first half of 2024', 'second half of 2024'],
    ['Q1 2024', '2024'], ['fiscal year 2024', 'calendar year 2024'],
  ])('does not merge different or incomplete reporting periods: %s / %s', (left, right) => {
    const a = fact(1, `Floods affected 1200 people in Kenya in ${left}.`), b = fact(2, `Floods affected 1500 people in Kenya in ${right}.`);
    expect(conflictingValues(a, b)).toBeNull();
    expect(identicalWordingPairs([a, b])).toEqual([]);
    expect(screened(a, b)).toEqual([]);
  });
  it('preserves same-quarter paraphrases', () => {
    expect(compare('Floods affected 1200 people in Kenya in Q1 2024.', 'In Kenya, flooding impacted 1500 persons in the first quarter of 2024.')).toEqual([{ unit: 'people', a: 1200, b: 1500 }]);
  });
  it.each([['Nairobi / Flood assessment', 'Mombasa / Flood assessment'], ['Zone Alpha / Flood assessment', 'Zone Beta / Flood assessment']])('vetoes distinct opaque heading scopes: %s / %s', (left, right) => {
    const a = fact(1, 'The assessment found 200 households were displaced by flooding.', left);
    const b = fact(2, 'The assessment found 300 households were displaced by flooding.', right);
    expect(identicalWordingPairs([a, b])).toEqual([]);
    expect(conflictingValues(a, b)).toBeNull();
    expect(identicalWordingPairs([a, { ...b, context: left }])).toHaveLength(1);
  });
  it.each(['Around', 'About', 'Approximately', 'Roughly', 'Nearly', 'An estimated', 'Rounded to', 'Some', '≈'])('abstains on approximate quantities without assigning tolerance: %s', qualifier => {
    const a = fact(1, `${qualifier} 700 people were affected by flooding in Kenya.`);
    const b = fact(2, 'Exactly 698 people were affected by flooding in Kenya.');
    expect(conflictingValues(a, b)).toBeNull();
    expect(identicalWordingPairs([a, { ...b, text: a.text.replace('700', '698') }])).toEqual([]);
  });
  it('abstains on rounded prose even beside an exact-looking parenthetic value', () => {
    expect(compare('Flood probability was nearly nine in ten (86%) in Kenya.', 'Flood probability was nearly nine in ten (89%) in Kenya.')).toBeNull();
    expect(compare('Exactly 700 people were affected by flooding in Kenya.', 'Exactly 698 people were affected by flooding in Kenya.')).not.toBeNull();
  });
  it('distinguishes percentage-point change from relative percent and compares matching dimensions', () => {
    expect(quantities('Coverage increased by 4 percentage points.')).toEqual([{ value: 4, unit: 'percentage-points' }]);
    expect(compare('Flood coverage increased by 4 percentage points in Kenya.', 'Flood coverage increased by 5 percent in Kenya.')).toBeNull();
    expect(compare('Flood coverage increased by 4 percentage points in Kenya.', 'Flood coverage increased by 5 percentage points in Kenya.')).toEqual([{ unit: 'percentage-points', a: 4, b: 5 }]);
  });
  it.each(['-', '‐', '‑', '–'])('keeps hyphenated percentage-point modifiers dimensionally separate: %s', hyphen => {
    const left = `Flood coverage recorded a 4 percentage${hyphen}point increase in Kenya.`;
    expect(quantities(left)).toEqual([{ value: 4, unit: 'percentage-points' }]);
    expect(compare(left, 'Flood coverage recorded a 5 percent increase in Kenya.')).toBeNull();
    expect(compare(left, 'Flood coverage recorded a 5 percentage-point increase in Kenya.')).toEqual([{ unit: 'percentage-points', a: 4, b: 5 }]);
  });
  it('finds swapped clause values without suppressing them using a different measure', () => {
    const a = fact(1, 'Floods affected 20 people and displaced 80 people in Kenya.');
    const b = fact(2, 'Floods affected 80 people and displaced 20 people in Kenya.');
    expect(conflictingValues(a, b)).toEqual([{ unit: 'people', a: 20, b: 80 }, { unit: 'people', a: 80, b: 20 }]);
    expect(identicalWordingPairs([a, b])).toHaveLength(1);
    expect(conflictingValues(a, { ...b, text: 'Floods displaced 80 people and affected 20 people in Kenya.' })).toBeNull();
  });
});

describe('bounded numerical selection and explicit coverage', () => {
  const many = count => Array.from({ length: count }, (_, i) => fact(i % 500 + 1, `Floods affected ${i + 1000} people in Kenya during 2024.`));
  it('stops deterministic scope work after the requested findings, keeping source ordering', () => {
    const candidates = many(1000), before = structuredClone(candidates);
    const { pairs, coverage } = identicalWordingSelection(candidates);
    expect(pairs.map(pair => [pair.a, pair.b])).toEqual(candidates.slice(1, 7).map(b => [candidates[0], b]));
    expect(coverage).toMatchObject({ candidates: 1000, pairVisits: 6, pairChecks: 6, capped: true, reason: 'result-limit' });
    expect(candidates).toEqual(before);
  });
  it('bounds unsuccessful rules work and exposes the reason instead of implying complete screening', () => {
    const candidates = many(30).map(a => ({ ...a, context: `Zone ${a.page}` }));
    expect(identicalWordingSelection(candidates, { maxPairChecks: 7 })).toMatchObject({ pairs: [], coverage: { pairChecks: 7, capped: true, reason: 'scope-check-limit' } });
    expect(identicalWordingSelection(candidates.map(a => ({ ...a, page: 1 })), { maxPairVisits: 9 })).toMatchObject({ pairs: [], coverage: { pairVisits: 9, pairChecks: 0, capped: true, reason: 'pair-visit-limit' } });
  });
  it('ranks all semantic similarities before spending scope work, retaining late best results and stable ties', () => {
    const candidates = many(4);
    candidates[1].text = 'In Kenya during 2024, flooding impacted 2500 persons.';
    candidates[2].text = 'During 2024, floods impacted 3000 people in Kenya.';
    candidates[3].text = 'Flooding impacted 4000 persons during 2024 in Kenya.';
    const vectors = [[1, 0], [0.9, Math.sqrt(0.19)], [0, 1], [0, 1]];
    const result = similarPairSelection(candidates, vectors, 0.88, { maxPairs: 1 });
    expect(result.pairs.map(({ a, b }) => [a.page, b.page])).toEqual([[3, 4]]);
    expect(result.coverage).toMatchObject({ pairVisits: 6, pairChecks: 1, capped: true, reason: 'result-limit' });
    const tied = similarPairSelection(candidates, candidates.map(() => [1, 0]), 0.88, { maxPairs: 2 });
    expect(tied.pairs.map(({ a, b }) => [a.page, b.page])).toEqual([[1, 2], [1, 3]]);
  });
  it('bounds cosine and semantic scope work separately', () => {
    const candidates = many(8).map((a, i) => ({ ...a, text: `${a.text} ${'Extra '.repeat(i)}`, context: `Zone ${i}` }));
    const vectors = candidates.map(() => [1, 0]);
    expect(similarPairSelection(candidates, vectors, 0.88, { maxVectorOperations: 4 })).toMatchObject({ coverage: { vectorOperations: 4, capped: true, reason: 'vector-work-limit' } });
    expect(similarPairSelection(candidates, vectors, 0.88, { maxPairChecks: 3 })).toMatchObject({ pairs: [], coverage: { pairChecks: 3, capped: true, reason: 'scope-check-limit' } });
    expect(FACT_LIMITS.maxPairVisits).toBeGreaterThanOrEqual(300 * 299 / 2);
    expect(FACT_LIMITS.maxPairChecks).toBeGreaterThanOrEqual(300 * 299 / 2);
    expect(FACT_LIMITS.maxVectorOperations).toBeGreaterThanOrEqual(300 * 299 / 2 * 384);
  });
  it('retains rules and semantic coverage in reports while preserving pair evidence shape', async () => {
    const rules = inspectConsistency({ metadata: {}, pages: [] });
    expect(rules.factCoverage).toMatchObject({ candidates: 0, pairChecks: 0, capped: false });
    const facts = [fact(1, 'Floods affected 1200 people in Kenya in 2024.'), fact(2, 'In Kenya in 2024, flooding impacted 1500 persons.')];
    const result = await assessSemantic({ metadata: { language: 'en' }, checks: ['title'], facts }, async texts => texts.map(() => [1, 0]));
    expect(result.factCoverage).toMatchObject({ candidates: 2, compared: 2, selectedCandidates: 2, pairChecks: 1, capped: false });
    expect(Object.keys(result.factPairs[0]).sort()).toEqual(['a', 'b', 'inferencePerformed', 'method', 'similarity', 'values']);
    expect(result.factPairs[0].a).toEqual({ page: facts[0].page, text: facts[0].text, blockIds: facts[0].blockIds });
  });
});
