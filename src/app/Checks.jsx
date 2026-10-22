import React from 'react';
import { imageVerdict } from '../engine/image-model.js';
import { imageSkipNote } from '../review/provenance.js';
import { hasUnchangedNoInputs, needsDocumentInformation } from '../runtime/screening-recovery.js';
import { MetadataGuidance } from '../review/MetadataGuidance.jsx';
import { DocumentProperties } from '../review/DocumentProperties.jsx';
import { getSemanticModel, supportsLanguage } from '../engine/models.js';
import { formatProgress } from '../ui/progress.js';
import { ScanVisual } from '../ui/ScanVisual.jsx';
import { Button, Notice, Checkbox, ProgressBar } from '../ui/react.jsx';

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
  if (showStatus && state.modelBusy) return <Notice title={state.modelTask === "image" ? "AI image checks are running" : "AI text checks are running"} headingLevel="h2">
    <p role="status">{state.modelTask === "image"
      ? "Please wait while the image model looks at graphics marked as decoration and compares photo descriptions with their pictures. Your results will appear when it finishes."
      : `Please wait while the selected model compares this PDF’s text.${state.imageAI ? " Image checks follow." : ""} Your results will appear when the checks finish.`}</p>
    {state.progress?.stage === 'inference' && state.progress.total > 0 && (state.modelTask === 'image'
      ? <ScanVisual kind="images" completed={state.progress.completed} total={state.progress.total} previews={state.imagePreviews} />
      : <ScanVisual kind="text" completed={state.progress.completed} total={state.progress.total} />)}
    <ProgressBar label="AI check progress" hideLabel max={state.progress?.total > 0 ? state.progress.total : undefined} value={state.progress?.total > 0 ? state.progress.completed : undefined} valueText={state.progress?.total > 0 && Number.isFinite(state.progress.completed) ? formatProgress(state.progress) : undefined} />
    <p className="progress-text">{state.progress?.stage === 'asset-download' ? Number.isFinite(state.progress.completed) ? `Downloading model files: ${formatProgress(state.progress)}` : 'Waiting for model files…'
      : state.progress?.stage === 'inference' && state.progress.total > 0 ? (state.modelTask === 'image' || state.progress.unit === 'images'
        ? `Looking at images: ${state.progress.completed} of ${state.progress.total} done`
        : Number.isFinite(state.progress.totalTexts) ? `Comparing passages: ${state.progress.completedTexts ?? 0} of ${state.progress.totalTexts}`
          : `Comparing text: ${state.progress.completed} of ${state.progress.total} steps done`)
        : 'Preparing the model on this device…'}</p>
    <Button onClick={() => controller.cancelScreening()}>Skip AI checks</Button>
    <p className="model-note">Skipping shows the standard results now, with any earlier AI results.</p>
    {state.message && state.progress?.stage !== 'inference' && <p className="model-note">{state.message}</p>}
  </Notice>;
  // Missing document information no longer hides results: the title Fix item leads, and AI comparisons explain why they could not run.
  if (showStatus && needsDocumentInformation(state.report)) return <Notice headingLevel="h2" variant="info" title="AI comparisons need a saved title, description or keywords">
    <p>No title, description or keywords are saved in this PDF’s document properties, so there was nothing for the AI to compare with the text. All the other checks ran, and their results are below.</p>
    <DocumentProperties metadata={state.report.metadata} />
    <MetadataGuidance headingLevel="h3" />
  </Notice>;
  return <section className="check-coverage" aria-label="Check coverage">
    {showStatus && noInputs && <Notice headingLevel="h3" variant="warning" title={metadataHelp ? 'Add document information before running AI checks' : 'AI needs usable text to compare'}>
      <p>This PDF does not provide the information needed for the selected AI comparisons. Running those checks again on the same file will not help.</p>
      <ul>{reasons.map(item => <li key={item.check}><strong>{choices.find(([key]) => key === item.check)?.[1] || item.check}:</strong> {plainReason(item)}</li>)}</ul>
      {metadataHelp ? <MetadataGuidance headingLevel="h4" /> : <p>Check that the PDF contains selectable text and usable heading labels. Correct or export the source document again, then choose the updated PDF.</p>}

      <Button onClick={() => controller.go('document')} disabled={busy}>Choose an updated PDF</Button>
    </Notice>}
    {showStatus && !noInputs && (!completed || stopped) && <Notice headingLevel="h3" variant={attempt?.status === 'error' ? 'negative' : state.aiEnabled ? 'warning' : 'info'} title={stopped ? attempt.status === 'error' ? attempt.code === 'MODEL_ASSET_TIMEOUT' ? 'The AI download stopped responding' : /network|fetch|download|MODEL_ASSET/i.test(`${attempt.message} ${attempt.code}`) ? 'The AI model could not be downloaded' : 'AI checks failed' : attempt.status === 'canceled' ? 'AI checks were skipped' : 'AI could not run these comparisons' : !state.aiEnabled ? 'AI comparisons were not selected' : missing && !state.languageAssumption ? 'AI is waiting for the document language' : !eligible ? 'The selected model does not support this language' : semantic?.status === 'error' ? 'AI checks did not complete' : 'AI checks have not completed'}>
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
        {state.report.imageScreening?.skipped && <li><strong>Image check:</strong> {imageSkipNote(state.report)}</li>}
        {state.report.imageScreening?.inferencePerformed && <li><strong>Image check:</strong> {(() => {
          const items = state.report.imageScreening.items || [], count = verdict => items.filter(item => imageVerdict(item, state.report.decorative?.items?.[item.index]) === verdict).length;
          const described = state.report.imageScreening.descriptions || [];
          return [`${state.report.imageScreening.model?.label || 'The image model'} looked at`,
            items.length ? `${items.length} graphic${items.length === 1 ? '' : 's'} marked as decoration (${count('content')} look like content, ${count('decoration')} like decoration, ${count('unclear')} unclear)` : null,
            described.length ? `${items.length ? 'and ' : ''}${described.length} photo description${described.length === 1 ? '' : 's'} against ${described.length === 1 ? 'its picture' : 'their pictures'} (${described.filter(item => item.mismatch).length} may not match)` : null,
          ].filter(Boolean).join(' ') + '.';
        })()}</li>}
        {semantic?.inferencePerformed && <li><strong>Consistency comparisons:</strong> {[
          semantic.factCoverage && `${semantic.factCoverage.compared} of ${semantic.factCoverage.candidates} sentences stating a figure compared (${(semantic.factPairs || []).length} pair${(semantic.factPairs || []).length === 1 ? '' : 's'} with different numbers)`,
          // Only comparisons that actually ran: most PDFs have no captioned descriptions or unmatched contents entries.
          semantic.sectionCoverage?.evaluatedPairs > 0 && `${semantic.sectionCoverage.evaluatedPairs} of ${semantic.sectionCoverage.suppliedPairs} headings compared with the text under them`,
          (semantic.figureItems || []).length > 0 && `${semantic.figureItems.length} image description${semantic.figureItems.length === 1 ? '' : 's'} compared with ${semantic.figureItems.length === 1 ? 'its caption' : 'their captions'}`,
          (semantic.contentItems || []).length > 0 && `${semantic.contentItems.length} contents entr${semantic.contentItems.length === 1 ? 'y' : 'ies'} compared with headings`,
          (semantic.nameItems || []).length > 0 && `${semantic.nameItems.length} differently worded title${semantic.nameItems.length === 1 ? '' : 's'} compared`,
        ].filter(Boolean).join('; ')}.</li>}
        <li>Text the AI did not check is a limit of this evaluation, not evidence of a PDF problem.</li>
        <li>AI compares how closely texts relate. It does not verify facts or the meaning of images.</li>
      </ul>
    </section>}
  </section>;
}
