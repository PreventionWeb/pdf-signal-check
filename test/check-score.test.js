import { describe, it, expect } from 'vitest';
import { requiredCheckScore } from '../src/review/check-score.js';
const check = status => ({ required: true, status });
describe('required check score', () => {
  it('counts unresolved and failed checks while excluding inapplicable and optional checks', () => {
    const report = { analysisComplete: true, checks: [check('pass'), check('fail'), check('indeterminate'), check('not-applicable'), { required: false, status: 'pass' }] };
    const original = structuredClone(report);
    expect(requiredCheckScore(report)).toEqual({ passed: 1, total: 3, percent: 33, openEnded: false });
    expect(report).toEqual(original);
  });
  it('shows a lower bound only when unresolved required checks remain without failures', () => {
    const report = { analysisComplete: true, checks: [check('pass'), check('indeterminate')] };
    expect(requiredCheckScore(report).openEnded).toBe(true);
    expect(requiredCheckScore({ ...report, checks: [check('pass'), check('fail'), check('indeterminate')] }).openEnded).toBe(false);
    expect(requiredCheckScore({ ...report, checks: [check('pass')] }).openEnded).toBe(false);
  });
  it('does not give incomplete, empty or wholly inapplicable reports a score', () => {
    expect(requiredCheckScore({ analysisComplete: false, checks: [check('pass')] })).toBeNull();
    expect(requiredCheckScore({ analysisComplete: true, checks: [] })).toBeNull();
    expect(requiredCheckScore({ analysisComplete: true, checks: [check('not-applicable')] })).toBeNull();
  });
  it('keeps AI outcomes and review annotations separate and cannot round partial results to 100%', () => {
    const report = { analysisComplete: true, checks: [...Array.from({ length: 200 }, () => check('pass')), check('indeterminate')], semantic: { status: 'pass' }, reviewed: ['all'] };
    expect(requiredCheckScore(report).percent).toBe(99);
    expect(requiredCheckScore({ ...report, checks: [check('pass')] }).percent).toBe(100);
  });
});
