import React from 'react';
import { hasUnchangedNoInputs, needsDocumentInformation } from '../runtime/screening-recovery.js';
import { MetadataGuidance } from '../review/MetadataGuidance.jsx';
import { DocumentProperties } from '../review/DocumentProperties.jsx';
import { getSemanticModel, supportsLanguage } from '../engine/models.js';
import { formatProgress } from '../ui/progress.js';
import { Button, Notice, Checkbox } from '../ui/react.jsx';

const choices = [['title', 'Publication title'], ['subject', 'Subject'], ['keywords', 'Each keyword'], ['sections', 'Tagged headings and section text']];
/** Coverage and explicit recovery, alongside the completed document findings. */
export function Checks({ state, controller, batchBusy, coverage = [], showStatus = true, showSettings = true }) {
  const declared = state.report.metadata?.language;
  const missing = declared == null || !String(declared).trim();
  const language = state.languageAssumption || declared;
  const model = state.selectedModel ? getSemanticModel(state.selectedModel) : null;
  const eligible = model && supportsLanguage(model, language);
  const busy = state.modelBusy || state.calibrationBusy || batchBusy;
  const semantic = state.report.semantic;
  const completed = semantic?.inferencePerformed;
  const noInputs = hasUnchangedNoInputs(state.report, { modelId: state.selectedModel, checks: state.checks, languageAssumption: state.languageAssumption });
  const reasons = semantic?.notRun?.checks || [];
  const metadataHelp = reasons.some(item => ['title', 'subject', 'keywords'].includes(item.check)
    && /no title metadata|no subject description|no keyword metadata|metadata title is too short|metadata value exceeds/i.test(item.reason));
  const plainReason = item => {
    if (item.check === 'title' && /no title metadata/i.test(item.reason)) return 'No title is saved in the PDF’s document properties.';
    if (item.check === 'subject' && /no subject description/i.test(item.reason)) return 'No subject description is saved in the PDF’s document properties.';
    if (item.check === 'keywords' && /no keyword metadata/i.test(item.reason)) return 'No keywords are saved in the PDF’s document properties.';
    if (item.check === 'sections' && /No eligible tagged heading/i.test(item.reason)) return 'No labelled heading with enough following text was found. Use heading styles and export with PDF tags enabled; very short or generic headings may still need human review.';
    return item.reason;
  };
  const attempt = state.screeningAttempt || (semantic?.notRun ? { status: 'not-run', message: semantic.notRun.reason, reasons: semantic.notRun.checks } : null);
  const stopped = attempt && ["error", "not-run", "canceled"].includes(attempt.status);
  if (showStatus && state.modelBusy) return <Notice title="AI text checks are running" headingLevel="h2">
    <p role="status">Please wait while the selected model compares this PDF’s text. Your results will appear when the checks finish.</p>
    <progress aria-label="AI check progress" max={state.progress?.total || undefined} value={state.progress?.total > 0 ? state.progress.completed : undefined} />
    <p>{state.progress?.stage === 'asset-download' ? Number.isFinite(state.progress.completed) ? `Downloading model files: ${formatProgress(state.progress)}` : 'Waiting for model files…'
      : state.progress?.stage === 'inference' && state.progress.total > 0 ? `Comparing text: ${state.progress.completed} of ${state.progress.total} groups completed`
        : 'Preparing the model on this device…'}</p>
    <Button onClick={() => controller.cancelScreening()}>Cancel AI checks</Button>
    <p className="model-note">Cancelling keeps the completed text checks and any previous AI results.</p>
    {state.message && <p className="model-note">{state.message}</p>}
  </Notice>;
  if (showStatus && needsDocumentInformation(state.report)) return <Notice headingLevel="h2" variant="negative" title="Critical document information is missing">
    <p>No title, subject description or keywords are saved in this PDF’s document properties. This basic information is needed before continuing with more detailed analysis.</p>
    <p>A title printed on the page or used as the file name does not supply the saved document title that software needs.</p>
    <DocumentProperties metadata={state.report.metadata} />
    <MetadataGuidance headingLevel="h3" />
    <Button onClick={() => controller.go('document')} disabled={busy}>Choose an updated PDF</Button>
  </Notice>;
  return <section className="check-coverage" aria-label="Check coverage">
    {showStatus && noInputs && <Notice headingLevel="h3" variant="warning" title={metadataHelp ? 'Add document information before running AI checks' : 'AI needs usable text to compare'}>
      <p>This PDF does not provide the information needed for the selected AI comparisons. Running those checks again on the same file will not help.</p>
      <ul>{reasons.map(item => <li key={item.check}><strong>{choices.find(([key]) => key === item.check)?.[1] || item.check}:</strong> {plainReason(item)}</li>)}</ul>
      {metadataHelp ? <MetadataGuidance headingLevel="h4" /> : <p>Check that the PDF contains selectable text and usable heading labels. Correct or export the source document again, then choose the updated PDF.</p>}

      <Button onClick={() => controller.go('document')} disabled={busy}>Choose an updated PDF</Button>
    </Notice>}
    {showStatus && !noInputs && (!completed || stopped) && <Notice headingLevel="h3" variant={attempt?.status === 'error' ? 'negative' : state.aiEnabled ? 'warning' : 'info'} title={stopped ? attempt.status === 'error' ? attempt.code === 'MODEL_ASSET_TIMEOUT' ? 'The AI download stopped responding' : /network|fetch|download|MODEL_ASSET/i.test(`${attempt.message} ${attempt.code}`) ? 'The AI model could not be downloaded' : 'AI checks failed' : attempt.status === 'canceled' ? 'AI checks were cancelled' : 'AI could not run these comparisons' : !state.aiEnabled ? 'AI comparisons were not selected' : missing && !state.languageAssumption ? 'AI is waiting for the document language' : !eligible ? 'The selected model does not support this language' : semantic?.status === 'error' ? 'AI checks did not complete' : 'AI checks have not completed'}>
      <p>{!state.aiEnabled ? 'Text, tags and metadata rules ran. Enable a local model in settings to add AI text comparisons.' : 'Your completed text checks are still available. You can review them while deciding how to continue with AI checks.'}</p>
      {stopped && <div role="status"><p><strong>{attempt.status === 'error' && /network|fetch|download|MODEL_ASSET/i.test(`${attempt.message} ${attempt.code}`) ? 'The AI model files could not be downloaded. Check your connection, then try again. Your PDF has stayed on this device.' : attempt.message}</strong></p>{attempt.reasons?.length > 0 && <ul>{attempt.reasons.map(reason => <li key={reason.check}><strong>{choices.find(([key]) => key === reason.check)?.[1] || reason.check}:</strong> {reason.reason}</li>)}</ul>}
        <p>{attempt.status === 'not-run' ? 'Repeating the same checks will produce the same result. Add the missing document details or tags in your source document, then export and check again. You can also select checks that have usable text to compare.' : attempt.status === 'error' ? 'Retry the checks, or choose the compact model in settings. Any previous completed AI results remain in this report.' : 'Run the checks again when ready.'}</p>
        {attempt.code && <p className="model-note">Error reference: {attempt.stage ? `${attempt.stage} · ` : ''}{attempt.code}</p>}
      </div>}
      {semantic?.error && <p>{semantic.error}</p>}
      {state.aiEnabled && missing && <><Checkbox id="assume-english" label="Assume English for this PDF’s AI checks" checked={state.languageAssumption === 'en'} disabled={busy} onChange={e => controller.setLanguageAssumption(e.target.checked ? 'en' : null)} /><p className="model-note">Missing language can confuse machines. Choose this only for English text; it does not fix the PDF’s language declaration or change the required check.</p></>}
      {state.aiEnabled && !missing && !eligible && <p>Declared language: {declared}. Choose a supported model or correct the declaration in your source document.</p>}
      {state.aiEnabled && model && <p className="model-note">{model.label}: {((model.graphBytes + model.tokenizerBytes) / 1e6).toFixed(2)} MB model/tokenizer if needed, plus runtime assets (approximately 26.86 MB uncompressed WASM and JavaScript). Running permits these downloads.</p>}
      {state.aiEnabled && eligible && <Button variant="primary" disabled={busy || !state.checks.length} onClick={() => controller.runScreening()}>{attempt?.status === 'error' ? 'Try AI checks again' : 'Run local AI checks'}</Button>}
      {state.aiEnabled && missing && !state.languageAssumption && <Button disabled={busy} onClick={() => controller.promptLanguageDecision()}>Decide document language…</Button>}
      <Button disabled={busy} onClick={() => controller.openSetup('checks')}>Change check settings</Button>
    </Notice>}
    {showSettings && <section aria-label="AI coverage">
      <h3>AI coverage</h3>
      <ul>
        <li>Selected model: {model?.label || 'No AI model selected for new checks'}. Completed AI checks are recorded above.</li>
        {coverage.map(f => <li key={f.id}><strong>{f.title}:</strong> {f.summary}</li>)}
        <li>Text the AI did not check is a limit of this evaluation, not evidence of a PDF problem.</li>
        <li>AI compares how closely texts relate. It does not verify facts or the meaning of images.</li>
      </ul>
    </section>}
  </section>;
}
