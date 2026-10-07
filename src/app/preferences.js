import { getSemanticModel } from '../engine/models.js';
const KEY = 'pdf-signal-check:evaluation-settings:v1';
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
    load() {
      try {
        const value = JSON.parse(storage?.getItem(KEY) || 'null');
        if (value?.version !== 1 || value.confirmed !== true ||
            !Array.isArray(value.checks) || !value.checks.every(check => CHECKS.includes(check)) ||
            value.modelFingerprint !== fingerprint(value.modelId)) return null;
        return { modelId: value.modelId, checks: [...new Set(value.checks)] };
      } catch { return null; }
    },
    save({ modelId, checks }) {
      try {
        storage?.setItem(KEY, JSON.stringify({ version: 1, confirmed: true, modelId,
          modelFingerprint: fingerprint(modelId), checks: checks.filter(check => CHECKS.includes(check)) }));
        return Boolean(storage);
      } catch { return false; }
    },
  };
}
