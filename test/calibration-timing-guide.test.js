import { it, expect } from 'vitest';
import { timingGuide, observedDuration, exactDuration } from '../src/calibration/timing-guide.js';

it('presents sample milliseconds as plain observed durations with a per-run comparison scope', () => {
  expect(observedDuration('preparation', 240)).toBe('Took less than 1 second');
  expect(observedDuration('startup', 15880)).toBe('Took about 16 seconds');
  expect(observedDuration('comparison', 2420)).toBe('About 2 seconds per sample run');
  expect(observedDuration('comparison', 999)).toBe('Less than 1 second per sample run');
  expect(observedDuration('preparation', 0)).toBe('Took less than 1 second');
  expect(observedDuration('preparation', 1000)).toBe('Took about 1 second');
  expect(observedDuration('comparison', 1500)).toBe('About 1.5 seconds per sample run');
  expect(exactDuration(1000)).toBe('1 second (1000 ms)');
  expect(exactDuration(2420)).toBe('2.42 seconds (2420 ms)');
  expect(exactDuration(240.125)).toBe('0.240125 seconds (240.125 ms)');
});

it('retains guide boundaries and never rounds a slow result back onto its boundary', () => {
  for (const [kind, boundary] of [['preparation', 2000], ['startup', 30000], ['comparison', 5000]]) {
    expect(timingGuide(kind, boundary - 1).rating).toBe('OK');
    expect(timingGuide(kind, boundary).rating).toBe('OK');
    expect(timingGuide(kind, boundary + 1)).toMatchObject({ ms: boundary + 1, rating: 'Slow' });
    expect(observedDuration(kind, boundary + 1).toLowerCase()).toContain(`just over ${boundary / 1000} seconds`);
    expect(exactDuration(boundary + 1)).toContain(`${boundary + 1} ms`);
  }
  expect(timingGuide('comparison', 1499).rating).toBe('Fast');
  expect(timingGuide('comparison', 1500).rating).toBe('Fast');
  expect(timingGuide('comparison', 1501).rating).toBe('OK');
  expect(observedDuration('comparison', 6000)).toBe('About 6 seconds per sample run');
});

it('does not turn missing or invalid measurements into observed timings', () => {
  for (const value of [undefined, null, NaN, Infinity, -Infinity, -1, '240']) {
    expect(timingGuide('startup', value)).toBeNull();
    expect(observedDuration('startup', value)).toBe('Not measured');
    expect(exactDuration(value)).toBe('Not measured');
  }
  expect(timingGuide('unknown', 100)).toBeNull();
  expect(observedDuration('unknown', 100)).toBe('Not measured');
});
