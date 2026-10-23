import { it, expect } from 'vitest';
import { timingGuide } from '../src/calibration/timing-guide.js';

it('shows increasing elapsed time with longer bars and caps the display without losing the exact value', () => {
  expect(timingGuide('startup', 15000).percent).toBeLessThan(timingGuide('startup', 25000).percent);
  expect(timingGuide('startup', 45000)).toMatchObject({ ms: 45000, percent: 100, rating: 'Slow' });
});
it('rates startup against 30 seconds and text comparisons against their separate workload guide', () => {
  expect(timingGuide('startup', 15880)).toMatchObject({ rating: 'OK', targetMs: 30000 });
  expect(timingGuide('startup', 30000).rating).toBe('OK');
  expect(timingGuide('startup', 30001).rating).toBe('Slow');
  expect(timingGuide('comparison', 2420)).toMatchObject({ rating: 'OK', targetMs: 5000 });
  expect(timingGuide('comparison', 1000).rating).toBe('Fast');
  expect(timingGuide('preparation', 240)).toMatchObject({ rating: 'OK', targetMs: 2000 });
});
it('does not turn missing or invalid measurements into observed timings', () => {
  for (const value of [undefined, null, NaN, Infinity, -1]) expect(timingGuide('startup', value)).toBeNull();
});
