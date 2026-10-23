import { getSemanticModel } from '../engine/models.js';
const KEY = 'pdf-signal-check:evaluation-settings:v2';
const LEGACY_KEY = 'pdf-signal-check:evaluation-settings:v1';
const POLICY = 'automatic-granite-v2';
const CHECKS = ['title', 'subject', 'keywords', 'sections'];
const defaultStorage = () => { try { return globalThis.localStorage; } catch { return null; } };
// Persist only configuration and its explicit download consent, never source data or language assumptions.
export function createEvaluationPreferences({ storage = defaultStorage() } = {}) {
  const fingerprint = modelId => {
    if (modelId === null) return null;
    if (typeof modelId !== 'string') throw Error('Invalid model choice');
    return JSON.stringify(getSemanticModel(modelId));
  };
  return {
    clear() { try { storage?.removeItem(KEY); storage?.removeItem(LEGACY_KEY); return Boolean(storage); } catch { return false; } },
    load() {
      try {
        const value = JSON.parse(storage?.getItem(KEY) || 'null');
        if (value?.version !== 2 || value.policy !== POLICY || value.modelId !== 'granite-r2' || value.confirmed !== true ||
            !Array.isArray(value.checks) || !value.checks.every(check => CHECKS.includes(check)) ||
            value.modelFingerprint !== fingerprint(value.modelId)) return null;
        return { modelId: value.modelId, checks: [...CHECKS], imageAI: value.imageAI === true };
      } catch { return null; }
    },
    save({ modelId, checks, imageAI = false }) {
      try {
        if (modelId !== 'granite-r2') return false;
        storage?.setItem(KEY, JSON.stringify({ version: 2, policy: POLICY, confirmed: true, modelId,
          modelFingerprint: fingerprint(modelId), checks: [...CHECKS], imageAI: imageAI === true }));
        return Boolean(storage);
      } catch { return false; }
    },
  };
}
