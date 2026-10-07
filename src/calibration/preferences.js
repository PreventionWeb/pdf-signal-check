import { getSemanticModel } from '../engine/models.js';
import { WORKLOAD } from './workload.js';

const KEY = 'pdf-signal-check:device-setup:v1';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const SPEED_POLICY = Object.freeze({ version: 1, greatMs: 1500, okMs: 5000 });

/** Product responsiveness bands, not measured accuracy or a hardware certification. */
export function rateDevice(receipt) {
  const ms = receipt?.warm?.medianMs;
  if (receipt?.workloadId !== WORKLOAD.id || !Number.isFinite(ms) || ms < 0 ||
      receipt.conditions?.startedHidden || receipt.conditions?.visibilityChanges ||
      receipt.conditions?.possibleSleepOrSchedulingGap) {
    return { key: 'unrated', label: 'Check again', description: 'Keep this tab visible and active to get a usable speed result.' };
  }
  if (ms <= SPEED_POLICY.greatMs) return { key: 'great', label: 'Great for local AI', description: 'The sample checks ran quickly. This model should feel responsive for short comparisons.' };
  if (ms <= SPEED_POLICY.okMs) return { key: 'ok', label: 'OK for local AI', description: 'The sample checks completed at a usable pace. Expect pauses, especially with more checks or larger documents.' };
  return { key: 'slow', label: 'Not recommended for local AI', description: 'The sample checks were slow. Try the compact model or another device before evaluating many PDFs.' };
}

const defaultStorage = () => { try { return globalThis.localStorage; } catch { return null; } };
export function createDevicePreferences({ storage = defaultStorage(), browser = globalThis.navigator?.userAgent || 'unknown', now = () => Date.now() } = {}) {
  const readAll = () => {
    try {
      const stored = JSON.parse(storage?.getItem(KEY) || 'null');
      return stored?.version === 1 && stored.browser === browser ? stored.results || {} : {};
    } catch { return {}; }
  };
  return {
    load(modelId) {
      const result = readAll()[modelId];
      if (!result || !Number.isFinite(result.savedAt) || result.savedAt > now() || now() - result.savedAt > MAX_AGE_MS) return null;
      try {
        const model = getSemanticModel(modelId), receipt = result.receipt;
        if (receipt?.model?.key !== model.key || ["id", "revision", "dtype", "device", "pooling", "maxTokens"].some(key => receipt.model[key] !== model[key]) ||
            receipt.workload?.tokenCap !== model.maxTokens ||
            rateDevice(receipt).key === 'unrated') return null;
        return structuredClone(result);
      } catch { return null; }
    },
    latest() {
      return Object.keys(readAll()).map(modelId => this.load(modelId)).filter(Boolean).sort((a, b) => b.savedAt - a.savedAt)[0] || null;
    },
    save(receipt) {
      if (rateDevice(receipt).key === 'unrated') return false;
      try {
        const results = readAll();
        results[receipt.model.key] = { savedAt: now(), receipt: structuredClone(receipt), speedPolicyVersion: SPEED_POLICY.version };
        storage?.setItem(KEY, JSON.stringify({ version: 1, browser, results }));
        return Boolean(storage);
      } catch { return false; }
    },
    clear() { try { storage?.removeItem(KEY); return Boolean(storage); } catch { return false; } },
  };
}
