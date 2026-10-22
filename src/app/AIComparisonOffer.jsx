import React from 'react';
import { screeningAvailability } from '../runtime/screening-availability.js';
import { getSemanticModel } from '../engine/models.js';
import { IMAGE_MODEL } from '../engine/image-model.js';
import { Button } from '../ui/react.jsx';

/** Results-first, source-specific offer. Computing or opening it never starts a worker/download. */
export function AIComparisonOffer({ state, controller }) {
  if (!state.report?.analysisComplete || state.modelBusy || state.report.semantic?.inferencePerformed || state.report.imageScreening?.inferencePerformed || ["error", "not-run", "canceled"].includes(state.screeningAttempt?.status)) return null;
  const available = screeningAvailability(state.report, { modelId: state.selectedModel || 'granite-r2', checks: state.checks, languageAssumption: state.languageAssumption });
  const any = available.textAvailable || available.imagesAvailable;
  const busy = state.calibrationBusy || state.batchBusy;
  return <details className="mg-details ai-comparison-offer">
    <summary>{any ? 'Optional: add AI comparisons for this PDF' : 'Why AI comparisons are unavailable for this PDF'}</summary>
    <p>{any ? 'Your standard results are ready. Optional AI can compare the evidence below on this device. It may miss errors or raise false alarms.' : 'Your standard results are ready. This PDF does not provide the paired evidence these AI checks need.'}</p>
    {available.text.length > 0 && <ul>{available.text.map(item => <li key={item.label}>{item.count} {item.label}</li>)}</ul>}
    {any && !available.textAvailable && <p>No usable text pairs were recovered for the selected checks and model.</p>}
    {available.textAvailable && available.missingLanguage && <p>This PDF has no saved language. Before text comparisons, you’ll need to confirm whether it is in English.</p>}
    {available.textAvailable && !available.missingLanguage && !available.languageSupported && <p>The selected text model does not support this PDF’s declared language. {available.alternativeModel ? `Choose ${available.alternativeModel} in Settings.` : 'Choose a supported model in Settings.'}</p>}
    {available.imagesAvailable && <p>{available.graphics} graphics eligible for image classification; {available.photos} photo descriptions eligible before cropping. Photo comparison needs at least five usable crops; missing or blank crops can reduce coverage.</p>}
    {!any && <p>No paired text, eligible graphics or enough photo descriptions were recovered for the selected checks. No AI download is needed.</p>}
    {any && <>
      {state.aiEnabled && state.selectedModel ? <>
        <p>{getSemanticModel(state.selectedModel).label}: {((getSemanticModel(state.selectedModel).graphBytes + getSemanticModel(state.selectedModel).tokenizerBytes) / 1e6).toFixed(2)} MB model/tokenizer files if text comparisons can run{state.imageAI ? `; image model ${IMAGE_MODEL.download}, plus ${IMAGE_MODEL.descriptionDownload} for photo descriptions` : ''}. Runtime files add about 26.86 MB uncompressed, plus JavaScript. Cached files may be reused. Supported languages, model choices and download permission are in Settings. Your PDF stays on this device.</p>
        <Button disabled={busy} onClick={() => available.languageSupported || available.missingLanguage || state.imageAI ? controller.requestAIComparisons() : controller.openSetup('review')}>{available.languageSupported || available.missingLanguage || state.imageAI ? 'Run local AI comparisons' : 'Choose a supported model…'}</Button>
      </> : <Button disabled={busy} onClick={() => controller.openSetup('review')}>Choose AI comparisons…</Button>}
    </>}
  </details>;
}
