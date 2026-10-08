import { getSemanticModel } from '../engine/models.js';

/** A recorded no-input result applies only to the exact model/check/language selection. */
export function hasUnchangedNoInputs(report, { modelId, checks = [], languageAssumption = null } = {}) {
  const semantic = report?.semantic;
  if (semantic?.notRun?.code !== 'no-comparable-inputs' || !modelId) return false;
  const model = getSemanticModel(modelId);
  const requested = new Set(semantic.requestedChecks || []);
  const selected = new Set(checks);
  return semantic.model?.id === model.id && semantic.model?.revision === model.revision
    && requested.size === selected.size && [...selected].every(check => requested.has(check))
    && semantic.languageContext?.screening === (languageAssumption || report.metadata?.language || null);
}

/** Presentation prerequisite only; does not alter the structural profile or recorded report. */
export function needsDocumentInformation(report) {
  const metadata = report?.metadata;
  const present = value => Array.isArray(value) ? value.some(present) : Boolean(String(value ?? '').trim());
  return Boolean(report?.analysisComplete && metadata
    && !present(metadata.infoTitle) && !present(metadata.xmpTitles?.map(item => typeof item === 'string' ? item : item?.text))
    && !present(metadata.subject) && !present(metadata.keywords));
}
