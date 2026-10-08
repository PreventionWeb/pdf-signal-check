import { it, expect } from 'vitest';
import { createDevicePreferences, rateDevice } from '../src/calibration/preferences.js';
import { getSemanticModel } from '../src/engine/models.js';
import { WORKLOAD } from '../src/calibration/workload.js';
const receipt = (ms = 1244) => ({ workloadId: WORKLOAD.id, model: getSemanticModel('minilm'), warm: { medianMs: ms }, workload: { tokenCap: 256 }, conditions: { startedHidden: false, visibilityChanges: 0, possibleSleepOrSchedulingGap: false } });
const memory = () => { let value = null; return { getItem: () => value, setItem: (_, s) => { value = s; }, removeItem: () => { value = null; } }; };
it('uses transparent speed bands and abstains when timing conditions changed', () => {
  expect(rateDevice(receipt(1500)).key).toBe('great');
  expect(rateDevice(receipt(1501)).key).toBe('ok');
  expect(rateDevice(receipt(5000)).key).toBe('ok');
  expect(rateDevice(receipt(5001)).key).toBe('slow');
  expect(rateDevice({ ...receipt(), conditions: { visibilityChanges: 1 } }).key).toBe('unrated');
  expect(rateDevice(receipt(NaN)).key).toBe('unrated');
});
it('persists isolated per-model receipts, expires stale and incompatible results, and tolerates blocked storage', () => {
  const storage = memory(); let now = 1000;
  const prefs = createDevicePreferences({ storage, browser: 'test-browser', now: () => now });
  expect(prefs.save(receipt())).toBe(true);
  expect(prefs.load('minilm').receipt.warm.medianMs).toBe(1244);
  expect(prefs.load('granite-r2')).toBe(null);
  expect(createDevicePreferences({ storage, browser: 'new-browser', now: () => now }).load('minilm')).toBe(null);
  const changed = receipt(); changed.model = { ...changed.model, revision: 'old' }; prefs.save(changed);
  expect(prefs.load('minilm')).toBe(null);
  prefs.save(receipt()); now += 31 * 86400000;
  expect(prefs.load('minilm')).toBe(null);
  const blocked = createDevicePreferences({ storage: { getItem() { throw Error(); }, setItem() { throw Error(); } } });
  expect(blocked.load('minilm')).toBe(null); expect(blocked.save(receipt())).toBe(false);
});
