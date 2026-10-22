import { it, expect } from 'vitest';
import { evaluateDataset, summarizeUsefulness, thresholdSensitivity } from '../src/evaluation/run.js';
import { getSemanticModel } from '../src/engine/models.js';
import cases from '../evaluation/consistency-cases.json' with { type: 'json' };
const model = getSemanticModel('minilm');
it('selects labelled targets by identity, and keeps unsupported-language cases unassessed', async () => {
  const selected = [cases.find(c => c.id === 'figure-wrong-topic'), cases.find(c => c.id === 'contents-good-exact'), cases.find(c => c.id === 'figure-french-good')];
  const result = await evaluateDataset(selected, model, async texts => texts.map(() => [1, 0]));
  expect(result.rows[0]).toMatchObject({ outcome: 'semantically-related', rulesOutcome: 'no-flag', inferencePerformed: true });
  expect(result.rows[1]).toMatchObject({ outcome: 'semantically-related', inferencePerformed: true });
  expect(result.rows[2]).toMatchObject({ outcome: 'unassessed', inferencePerformed: false, score: null });
  expect(result.usefulness[0].tasks.find(t => t.task === 'figure')).toMatchObject({ falseReassurance: 1, missedConcerns: 1, precision: null });
});
it('retains rule-only fact detections and distinguishes no flag from no inference', async () => {
  const result = await evaluateDataset(cases.filter(c => c.id === 'fact-rule-exact' || c.id === 'fact-different-years'), model, async texts => texts.map(() => [1, 0]));
  expect(result.rows[0]).toMatchObject({ rulesOutcome: 'suspected-mismatch', outcome: 'no-flag', inferencePerformed: true });
  expect(result.usefulness[0].tasks[0]).toMatchObject({ ruleConcerns: 1, combinedTrueConcerns: 1, combinedFalseFlags: 0, additionalTrueConcerns: 0 });
  expect(result.rows[1]).toMatchObject({ outcome: 'no-flag', inferencePerformed: true });
});
it('counts false flags, false reassurance and missed concerns with explicit denominators', () => {
  const result = summarizeUsefulness([
    { expected: 'support', outcome: 'suspected-mismatch', inferencePerformed: true, rulesOutcome: 'no-flag' },
    { expected: 'mismatch', outcome: 'semantically-related', inferencePerformed: true, rulesOutcome: 'no-flag' },
    { expected: 'mismatch', outcome: 'uncertain', inferencePerformed: true, rulesOutcome: 'no-flag' },
    { expected: 'mismatch', outcome: 'suspected-mismatch', inferencePerformed: true, rulesOutcome: 'no-flag' },
  ]);
  expect(result).toMatchObject({ goodInputs: 1, badInputs: 3, concerns: 2, falseFlags: 1, falseReassurance: 1, missedConcerns: 2, abstained: 1, precision: 0.5, additionalTrueConcerns: 1, additionalFalseFlags: 1 });
  expect(thresholdSensitivity([{ task: 'figure', score: 0.1, split: 'held-out', expected: 'support' }], model)[1].rows.every(r => r.scoredTopicCases === 0)).toBe(true);
});
