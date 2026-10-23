import React, { useMemo } from 'react';
import { screeningAvailability } from '../runtime/screening-availability.js';
import { imageVerdict, IMAGE_MODEL } from '../engine/image-model.js';
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
  const available = useMemo(() => screeningAvailability(state.report, { modelId: state.selectedModel || 'minilm', checks: state.checks, languageAssumption: state.languageAssumption }), [state.report, state.selectedModel, state.checks, state.languageAssumption]);
  const eligible = model && supportsLanguage(model, language) && available.textAvailable;
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
  const imageRecovery = state.aiEnabled && state.imageAI && available.imagesAvailable && !state.report.imageScreening
    && ["error", "canceled"].includes(attempt?.status) && (attempt.stage === "image" || !available.textAvailable);
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
  return <section className="check-coverage" aria-label="Check coverage">
    {showStatus && !imageRecovery && needsDocumentInformation(state.report) && <Notice headingLevel="h2" variant="info" title="Some saved document details are missing">
      <p>This PDF has no saved title, description or keywords for AI to compare with its text. Other eligible AI comparisons can still run; their coverage is recorded below.</p>
      <DocumentProperties metadata={state.report.metadata} />
      <MetadataGuidance headingLevel="h3" />
    </Notice>}
    {showStatus && imageRecovery && <Notice headingLevel="h3" variant={attempt.status === 'error' ? 'negative' : 'info'} title={attempt.status === 'error' ? 'Image comparisons did not finish' : 'Image comparisons were skipped'}>
      <p>Your standard results and any earlier AI results are still available.</p>
      <p role="status">{attempt.message}</p>
      <p className="model-note">Running permits the previously selected image-model downloads: {IMAGE_MODEL.download}, plus {IMAGE_MODEL.descriptionDownload} for photo descriptions, plus about 26.86 MB of uncompressed runtime files and JavaScript if needed. Cached files may be reused. Your PDF stays on this device.</p>
      <Button variant="primary" disabled={busy} onClick={() => controller.runImageScreening()}>{attempt.status === 'error' ? 'Try image comparisons again' : 'Run image comparisons'}</Button>
      <Button disabled={busy} onClick={() => controller.openSetup('checks')}>Change check settings</Button>
    </Notice>}
    {showStatus && !imageRecovery && noInputs && <Notice headingLevel="h3" variant="warning" title={metadataHelp ? 'Add document information before running AI checks' : 'AI needs usable text to compare'}>
      <p>This PDF does not provide the information needed for the selected AI comparisons. Running those checks again on the same file will not help.</p>
      <ul>{reasons.map(item => <li key={item.check}><strong>{choices.find(([key]) => key === item.check)?.[1] || item.check}:</strong> {plainReason(item)}</li>)}</ul>
      {metadataHelp ? <MetadataGuidance headingLevel="h4" /> : <p>Check that the PDF contains selectable text and usable heading labels. Correct or export the source document again, then choose the updated PDF.</p>}

      <Button onClick={() => controller.go('document')} disabled={busy}>Choose an updated PDF</Button>
    </Notice>}
    {showStatus && !imageRecovery && !noInputs && (!completed || stopped) && <Notice headingLevel="h3" variant={attempt?.status === 'error' ? 'negative' : state.aiEnabled ? 'warning' : 'info'} title={stopped ? attempt.status === 'error' ? attempt.code === 'MODEL_ASSET_TIMEOUT' ? 'The AI download stopped responding' : /network|fetch|download|MODEL_ASSET/i.test(`${attempt.message} ${attempt.code}`) ? 'The AI model could not be downloaded' : 'AI checks failed' : attempt.status === 'canceled' ? 'AI checks were skipped' : 'AI could not run these comparisons' : !state.aiEnabled ? 'AI comparisons were not selected' : missing && !state.languageAssumption ? 'AI is waiting for the document language' : !eligible ? 'The selected model does not support this language' : semantic?.status === 'error' ? 'AI checks did not complete' : 'AI checks have not completed'}>
      <p>{!state.aiEnabled ? 'Text, tags and metadata rules ran. Enable a local model in settings to add AI text comparisons.' : 'Your completed text checks are still available. You can review them while deciding how to continue with AI checks.'}</p>
      {stopped && <div role="status"><p><strong>{attempt.status === 'error' && /network|fetch|download|MODEL_ASSET/i.test(`${attempt.message} ${attempt.code}`) ? 'The AI model files could not be downloaded. Check your connection, then try again. Your PDF has stayed on this device.' : attempt.message}</strong></p>{attempt.reasons?.length > 0 && <ul>{attempt.reasons.map(reason => <li key={reason.check}><strong>{choices.find(([key]) => key === reason.check)?.[1] || reason.check}:</strong> {reason.reason}</li>)}</ul>}
        <p>{attempt.status === 'not-run' ? 'Repeating the same checks will produce the same result. Add the missing document details or tags in your source document, then export and check again. You can also select checks that have usable text to compare.' : attempt.status === 'error' ? 'Retry the checks, skip AI, or use another device. Any previous completed AI results remain in this report.' : 'Run the checks again when ready.'}</p>
        {attempt.code && <p className="model-note">Error reference: {attempt.stage ? `${attempt.stage} · ` : ''}{attempt.code}</p>}
      </div>}
      {semantic?.error && <p>{semantic.error}</p>}
      {state.aiEnabled && missing && <><Checkbox id="assume-english" label="Assume English for this PDF’s AI checks" checked={state.languageAssumption === 'en'} disabled={busy} onChange={e => controller.setLanguageAssumption(e.target.checked ? 'en' : null)} /><p className="model-note">Missing language can confuse machines. Choose this only for English text; it does not fix the PDF’s language declaration or change the required check.</p></>}
      {state.aiEnabled && !missing && model && !supportsLanguage(model, language) && <p>Declared language: {declared}. Granite R2 supports 52 languages. Correct an inaccurate language declaration in your source document, or continue with standard checks for an unsupported language.</p>}
      {state.aiEnabled && model && <p className="model-note">{model.label}: {((model.graphBytes + model.tokenizerBytes) / 1e6).toFixed(2)} MB model/tokenizer if needed, plus runtime assets (approximately 26.86 MB uncompressed WASM and JavaScript). Running permits these downloads.</p>}
      {state.aiEnabled && eligible && <Button variant="primary" disabled={busy || !state.checks.length} onClick={() => controller.runScreening()}>{attempt?.status === 'error' ? 'Try AI checks again' : 'Run local AI checks'}</Button>}
      {state.aiEnabled && missing && !state.languageAssumption && <Button disabled={busy} onClick={() => controller.promptLanguageDecision()}>Decide document language…</Button>}
      <Button disabled={busy} onClick={() => controller.openSetup('checks')}>Change check settings</Button>
    </Notice>}
    {showSettings && <section aria-label="AI coverage">
      <h3>AI coverage</h3>
      <p>Caption, contents and experimental numerical comparisons accompany any selected AI text check when evidence is available. Clearing all text checks also turns off these comparisons.</p>
      <ul>
        <li>Selected model: {model?.label || 'No AI model selected for new checks'}. Completed AI checks are recorded above.</li>
        {coverage.map(f => <li key={f.id}><strong>{f.title}:</strong> {f.summary}</li>)}
        {state.report.imageScreening?.skipped && <li><strong>Image check:</strong> {imageSkipNote(state.report)}</li>}
        {state.report.imageScreening?.inferencePerformed && <li><strong>Image check:</strong> {(() => {
          const items = state.report.imageScreening.items || [], count = verdict => items.filter(item => imageVerdict(item, state.report.decorative?.items?.[item.index]) === verdict).length;
          const described = state.report.imageScreening.descriptions || [];
          return [`${state.report.imageScreening.model?.label || 'The image model'} looked at`,
            state.report.imageScreening.execution ? `${state.report.imageScreening.execution.encodedCrops} crops; ${state.report.imageScreening.execution.usableDescriptions} usable photo crops, ${state.report.imageScreening.execution.comparedDescriptions} descriptions compared${state.report.imageScreening.execution.descriptionSkipReason ? ' (at least 5 usable photo crops are needed for comparison)' : ''};` : null,
            items.length ? `${items.length} graphic${items.length === 1 ? '' : 's'} marked as decoration (${count('content')} look like content, ${count('decoration')} like decoration, ${count('unclear')} unclear)` : null,
            described.length ? `${items.length ? 'and ' : ''}${described.length} photo description${described.length === 1 ? '' : 's'} against ${described.length === 1 ? 'its picture' : 'their pictures'} (${described.filter(item => item.mismatch).length} may not match)` : null,
          ].filter(Boolean).join(' ') + '.';
        })()}</li>}
        {state.report.imageScreening?.descriptionInputs?.some(input => input.truncated) && <li><strong>Photo description scope:</strong> {state.report.imageScreening.descriptionInputs.filter(input => input.truncated).length} descriptions were shortened to the image model’s token limit. The detailed JSON records the text actually compared.</li>}
        {semantic?.inferencePerformed && <li><strong>Consistency comparisons:</strong> {[
          semantic.factCoverage && `${semantic.factCoverage.compared} of ${semantic.factCoverage.candidates} statements encoded (${(semantic.factPairs || []).length} experimental candidate pair${(semantic.factPairs || []).length === 1 ? '' : 's'}; excluded from tasks and scores)`,
          // Only comparisons that actually ran: most PDFs have no captioned descriptions or unmatched contents entries.
          semantic.sectionCoverage?.evaluatedPairs > 0 && `${semantic.sectionCoverage.evaluatedPairs} of ${semantic.sectionCoverage.suppliedPairs} headings compared with the text under them`,
          semantic.figureCoverage ? semantic.figureCoverage.candidates > 0 && `${semantic.figureCoverage.evaluated} of ${semantic.figureCoverage.candidates} eligible image descriptions compared with captions` : (semantic.figureItems || []).length > 0 && `${semantic.figureItems.length} image descriptions compared with captions`,
          semantic.contentCoverage ? semantic.contentCoverage.candidates > 0 && `${semantic.contentCoverage.evaluated} of ${semantic.contentCoverage.candidates} eligible contents entries compared with headings` : (semantic.contentItems || []).length > 0 && `${semantic.contentItems.length} contents entries compared with headings`,
          (semantic.nameItems || []).length > 0 && `${semantic.nameItems.length} differently worded title${semantic.nameItems.length === 1 ? '' : 's'} compared`,
        ].filter(Boolean).join('; ')}.</li>}
        {(state.report.figureDescriptions?.items || []).some(item => item.contextStatus && item.contextStatus !== 'paired') && <li><strong>Caption scope:</strong> {(state.report.figureDescriptions.items || []).filter(item => item.contextStatus && item.contextStatus !== 'paired').length} image descriptions had no safely associated caption and were excluded from caption comparison.</li>}
        <li>Text the AI did not check is a limit of this evaluation, not evidence of a PDF problem.</li>
        <li>AI compares how closely texts relate. It does not verify facts or the meaning of images.</li>
      </ul>
      {(semantic?.factPairs || []).length > 0 && <details>
        <summary>Experimental numerical evidence ({semantic.factPairs.length} candidate pair{semantic.factPairs.length === 1 ? '' : 's'})</summary>
        <p>These are experimental related-statement candidates, not established disagreements. They do not count as things to fix or check and do not affect scores. Measurement identity may be unresolved; similarity is not a confidence probability. No candidates does not prove numerical consistency.</p>
        {semantic.factPairs.map((pair, index) => <section key={index} aria-label={`Experimental numerical candidate ${index + 1}`}>
          <h4>Candidate {index + 1}</h4>
          <p>Recorded similarity: {String(pair.similarity ?? 'Not recorded')} (relatedness, not confidence). Pair inference recorded: {pair.inferencePerformed === true ? 'yes' : 'no'}.</p>
          {[pair.a, pair.b].map((statement, side) => <div key={side} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            <p><strong>Original statement on page {statement.page}:</strong> {statement.text}</p>
            {statement.context && <p><strong>Original context (statement on page {statement.page}; context location not established):</strong> {statement.context}</p>}
          </div>)}
        </section>)}
      </details>}
    </section>}
  </section>;
}
