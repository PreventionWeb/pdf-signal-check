import { it, expect, vi } from 'vitest';
import { sectionEvidence, assessSemantic } from '../src/engine/semantic.js';
import { quantities, conflictingValues, identicalWordingPairs } from '../src/engine/facts.js';
import { factSentences } from '../src/engine/consistency.js';
import { uniformPixels } from '../src/runtime/image-pixels.js';
import { screeningAvailability } from '../src/runtime/screening-availability.js';
const quad = (x, y) => [[x,y], [x+100,y], [x+100,y+10], [x,y+10]];
it('recovers aligned wrapped heading context without changing original tags and rejects cross-column joins', () => {
  const page = { number: 1, logicalBlocks: [{ key: 'a', role: 'P', text: 'Contributors and reviewers' }, { key: 'b', role: 'H2', text: 'for this publication' }, { key: 'c', role: 'P', text: 'The following contributors provided evidence and reviewed the analysis for publication. '.repeat(2) }],
    blocks: [{ key: 'a', quad: quad(20, 100), locationSafe: true }, { key: 'a', quad: quad(120, 100), locationSafe: true }, { key: 'b', quad: quad(20, 89), locationSafe: true }] };
  const before = structuredClone(page);
  expect(sectionEvidence([page])[0].heading).toMatchObject({ text: 'Contributors and reviewers for this publication', keys: ['a','b'], recoveredHeadingContext: true });
  expect(page).toEqual(before);
  page.blocks[2].quad = quad(320, 89);
  expect(sectionEvidence([page])[0].heading).toMatchObject({ headingFragment: true, text: 'for this publication' });
});
it('preserves heading and preceding-sentence context and refuses a false different-hazard conflict despite identical vectors', async () => {
  const makePage = (number, hazard, value) => ({ number, logicalBlocks: [{ key: `${number}:h`, role: 'H2', text: `Future ${hazard} risk` }, { key: `${number}:p`, role: 'P', text: `The lifetime ${hazard} probability is estimated. That probability rises to nearly nine in ten (${value}%) for someone born in 2025.` }],
    blocks: [{ id: 0, key: `${number}:h`, text: `Future ${hazard} risk` }, { id: 1, key: `${number}:p`, text: `The lifetime ${hazard} probability is estimated. That probability rises to nearly nine in ten (${value}%) for someone born in 2025.` }] });
  const facts = factSentences({ pages: [makePage(1, 'flood', 82), makePage(2, 'drought', 88)] });
  expect(facts).toHaveLength(2);
  expect(facts[0].context).toContain('Future flood risk');
  expect(facts[0].context).toContain('lifetime flood probability');
  const embed = vi.fn(async texts => texts.map(() => [1,0]));
  const result = await assessSemantic({ checks: ['sections'], metadata: { language: 'en' }, facts }, embed);
  expect(embed.mock.calls[0][0][0]).toContain('Future flood risk');
  expect(result.factPairs).toEqual([]);
  const same = { ...facts[1], context: facts[0].context };
  expect(conflictingValues(facts[0], same)).toEqual([{ unit: '%', a: 82, b: 88 }]);
  expect(identicalWordingPairs([facts[0], facts[1]])).toEqual([]);
});
it('keeps different observation times separate while retaining genuine same-time conflicts', () => {
  const make = (page, time, value) => ({ page, context: `Weather observed at ${time}`, text: `The station recorded sustained wind speeds of ${value} km in the reporting interval.`, quantities: quantities(`wind speeds of ${value} km`) });
  expect(conflictingValues(make(1,'12:30',20), make(2,'19:30',40))).toBeNull();
  expect(conflictingValues(make(1,'12:30',20), make(2,'12:30',40))).not.toBeNull();
});
it('uses every pixel: even a tiny visible mark on a large white crop is not blank', () => {
  const pixels = new Uint8ClampedArray(40000).fill(255);
  expect(uniformPixels(pixels)).toBe(true);
  pixels[pixels.length - 4] = 254;
  expect(uniformPixels(pixels)).toBe(false);
  expect(uniformPixels(new Uint8ClampedArray([10,20,30,0,100,120,160,0]))).toBe(true);
});
it('preflights actual bounded tasks, missing-language decisions and empty selections without inference', () => {
  const report = { analysisComplete: true, metadata: { language: null, subject: 'River flood preparedness' }, metadataConsistency: { candidates: [] }, pages: [{ number: 1, logicalBlocks: [], blocks: [{ id: 0, text: 'River flood preparedness includes monitoring water levels and training local responders to protect communities from disasters.' }] }] };
  expect(screeningAvailability(report)).toMatchObject({ textAvailable: true, languageSupported: false, missingLanguage: true });
  expect(screeningAvailability(report, { checks: [] })).toMatchObject({ textAvailable: false });
  expect(screeningAvailability({ ...report, analysisComplete: false })).toMatchObject({ textAvailable: false, imagesAvailable: false });
});
it('does not attach an adjacent column to a heading when safe geometry proves they are separate', () => {
  const page = { number: 1, logicalBlocks: [{ key: 'h', role: 'H2', text: 'Investment in resilience' }, { key: 'p', role: 'P', text: 'Countries supported to improve infrastructure resilience and national regulations. '.repeat(2) }], blocks: [{ key: 'h', quad: quad(20,100) }, { key: 'p', quad: quad(320,80) }] };
  expect(sectionEvidence([page])).toEqual([]);
});
it('does not merge distinct same-level headings merely because no paragraph lies between them', () => {
  const page = { number: 1, logicalBlocks: [{ key: 'a', role: 'H2', text: 'Regional investments' }, { key: 'b', role: 'H2', text: 'Local partnerships' }, { key: 'c', role: 'P', text: 'Local partners collaborate with governments and community organizations to strengthen disaster preparedness. '.repeat(2) }], blocks: [{ key: 'a', quad: quad(20,100) }, { key: 'b', quad: quad(320,100) }, { key: 'c', quad: quad(320,80) }] };
  expect(sectionEvidence([page]).map(s=>s.heading.text)).toEqual(['Local partnerships']);
});
