import React from 'react';
import { screeningAvailability } from '../runtime/screening-availability.js';
import { Button } from '../ui/react.jsx';

/** Recover a dismissed source-specific language decision for automatic AI checks. */
export function AIComparisonOffer({ state, controller }) {
  if (!state.aiEnabled || !state.setupComplete || state.selectedModel !== 'granite-r2'
    || state.batchId != null || state.screeningAttempt || !state.report?.analysisComplete
    || state.analysisBusy || state.modelBusy || state.calibrationBusy || state.batchBusy
    || state.awaitingLanguageDecision || state.report.semantic?.inferencePerformed
    || state.report.imageScreening?.inferencePerformed) return null;
  const available = screeningAvailability(state.report, { modelId: state.selectedModel, checks: state.checks, languageAssumption: state.languageAssumption });
  if (!available.textAvailable || !available.missingLanguage) return null;
  return <div className="ai-comparison-offer">
    <p>This PDF has no saved language. AI text checks are waiting for you to confirm whether it is in English.</p>
    <Button onClick={() => controller.promptLanguageDecision()}>Confirm PDF language</Button>
  </div>;
}
