import { describe, it, expect } from 'vitest';
import { CASES, scoreCase } from '../scripts/vlm-spike/cases.js';
describe('VLM spike evaluation accounting', () => {
  it('requires the value to belong to the correct label and rejects invented labels', () => {
    expect(scoreCase(CASES[0], '{"North":3.4,"Central":3.1,"South":2.8}')).toMatchObject({ correct: false, valuesCorrect: 1 });
    expect(scoreCase(CASES[3], '{"North":2.8}')).toMatchObject({ valid: true, correct: false, extraLabels: 1 });
    expect(scoreCase(CASES[3], '{}')).toMatchObject({ correct: true });
  });
  it('keeps malformed output separate from measured false flags and false reassurance', () => {
    expect(scoreCase(CASES[0], 'North is 2.8')).toMatchObject({ valid: false, correct: false, valuesCorrect: 0 });
    expect(scoreCase(CASES[3], 'null')).toMatchObject({ valid: false, correct: false });
    expect(scoreCase(CASES[4], 'probably MISMATCH')).toEqual({ valid: false, correct: false, falseFlag: false, falseReassurance: false });
    expect(scoreCase(CASES[4], 'MISMATCH')).toMatchObject({ valid: true, falseFlag: true });
    expect(scoreCase(CASES[5], 'MATCH')).toMatchObject({ valid: true, falseReassurance: true });
    expect(scoreCase(CASES[4], 'UNCERTAIN')).toMatchObject({ valid: true, correct: false, falseFlag: false });
  });
});
