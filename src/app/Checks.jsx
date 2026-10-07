import React from 'react';
import { SEMANTIC_MODELS, getSemanticModel, supportsLanguage } from '../engine/models.js';
import { formatProgress } from '../ui/progress.js';
import { Button, Details, Notice, Checkbox, Radio, FormGroup } from '../ui/react.jsx';

const choices = [['title', 'Publication title'], ['subject', 'Subject'], ['keywords', 'Each keyword'], ['sections', 'Tagged headings and section text']];
/** Coverage and explicit recovery, alongside the completed document findings. */
export function Checks({ state, controller, batchBusy, coverage = [] }) {
  const declared = state.report.metadata?.language;
  const missing = declared == null || !String(declared).trim();
  const language = state.languageAssumption || declared;
  const model = state.selectedModel ? getSemanticModel(state.selectedModel) : null;
  const eligible = model && supportsLanguage(model, language);
  const busy = state.modelBusy || state.calibrationBusy || batchBusy;
  const semantic = state.report.semantic;
  const completed = semantic?.inferencePerformed;
  const attempt = state.screeningAttempt || (semantic?.notRun ? { status: 'not-run', message: semantic.notRun.reason, reasons: semantic.notRun.checks } : null);
  const stopped = attempt && ["error", "not-run", "canceled"].includes(attempt.status);
  if (state.modelBusy) return <Notice title="Local AI checks are running" headingLevel="h3"><p role="status">{state.message}</p><progress aria-label="Local AI processing" max={state.progress?.total || undefined} value={state.progress?.total > 0 ? state.progress.completed : undefined} /><p className="model-note">{state.progress?.completed != null ? formatProgress(state.progress) : "Preparing or processing locally…"}</p><Button onClick={() => controller.cancelScreening()}>Cancel AI checks</Button><p>Completed text checks remain available below.</p></Notice>;
  return <section className="check-coverage" aria-label="Check coverage">
    {(!completed || stopped) && <Notice headingLevel="h3" variant={attempt?.status === 'error' ? 'negative' : state.aiEnabled ? 'warning' : 'info'} title={stopped ? attempt.status === 'error' ? 'AI checks failed' : attempt.status === 'canceled' ? 'AI checks were canceled' : 'AI could not run these comparisons' : !state.aiEnabled ? 'AI comparisons were not selected' : missing && !state.languageAssumption ? 'AI is waiting for the document language' : !eligible ? 'The selected model does not support this language' : semantic?.status === 'error' ? 'AI checks did not complete' : 'AI checks have not completed'}>
      <p>{!state.aiEnabled ? 'Text, tags and metadata rules ran. Enable a local model in settings to add AI text comparisons.' : 'Completed text checks are retained. You can inspect them while resolving AI coverage.'}</p>
      {stopped && <div role="status"><p><strong>{attempt.message}</strong></p>{attempt.reasons?.length > 0 && <ul>{attempt.reasons.map(reason => <li key={reason.check}><strong>{choices.find(([key]) => key === reason.check)?.[1] || reason.check}:</strong> {reason.reason}</li>)}</ul>}
        <p>{attempt.status === 'not-run' ? 'Repeating the same checks will produce the same result. Add missing metadata or tags in your source document, export again and recheck; or select checks with usable evidence.' : attempt.status === 'error' ? 'Retry the checks, or choose the compact model in settings. Any previous completed AI results remain in this report.' : 'Run the checks again when ready.'}</p>
        {attempt.code && <p className="model-note">Error reference: {attempt.stage ? `${attempt.stage} · ` : ''}{attempt.code}</p>}
      </div>}
      {semantic?.error && <p>{semantic.error}</p>}
      {state.aiEnabled && missing && <><Checkbox id="assume-english" label="Assume English for this PDF’s AI checks" checked={state.languageAssumption === 'en'} disabled={busy} onChange={e => controller.setLanguageAssumption(e.target.checked ? 'en' : null)} /><p className="model-note">Missing language can confuse machines. Choose this only for English text; it does not fix the PDF’s language declaration or change the required check.</p></>}
      {state.aiEnabled && !missing && !eligible && <p>Declared language: {declared}. Choose a supported model or correct the declaration in your source document.</p>}
      {state.aiEnabled && model && <p className="model-note">{model.label}: {((model.graphBytes + model.tokenizerBytes) / 1e6).toFixed(2)} MB model/tokenizer if needed, plus runtime assets (approximately 26.86 MB uncompressed WASM and JavaScript). Running permits these downloads.</p>}
      {state.aiEnabled && eligible && <Button variant="primary" disabled={busy || !state.checks.length} onClick={() => controller.runScreening()}>Run local AI checks</Button>}
      <Button disabled={busy} onClick={() => controller.openSetup('checks')}>Change check settings</Button>
    </Notice>}
    <Details summary="Check coverage and AI settings">
      <p>Model: {model?.label || 'No AI model selected for new checks'}. Actual completed AI execution is recorded separately above.</p>
      {coverage.map(f => <p key={f.id}><strong>{f.title}:</strong> {f.summary}</p>)}
      <p className="model-note">Unscreened excerpts are coverage limits, not evidence of a document defect. AI relatedness is advisory; it does not verify facts or image meaning.</p>
      {state.aiEnabled && <>
        <FormGroup legend="Model for rerunning this PDF" disabled={busy}>{SEMANTIC_MODELS.map(option => <Radio key={option.key} id={`screening-model-${option.key}`} name="screening-model" value={option.key} label={`${option.label} · ${((option.graphBytes + option.tokenizerBytes) / 1e6).toFixed(2)} MB`} checked={model?.key === option.key} disabled={busy || !supportsLanguage(option, language)} onChange={() => controller.setModel(option.key)} />)}</FormGroup>
        <FormGroup legend="AI checks" disabled={busy}>{choices.map(([key, label]) => <Checkbox key={key} id={`single-check-${key}`} label={label} checked={state.checks.includes(key)} disabled={busy} onChange={e => controller.setChecks(e.target.checked ? [...state.checks, key] : state.checks.filter(check => check !== key))} />)}</FormGroup>
        <p className="model-note">Rerunning may download the selected model and tokenizer, plus runtime assets (approximately 26.86 MB uncompressed WASM and JavaScript). Your PDF text stays on this device.</p>
        <Button disabled={busy || !eligible || !state.checks.length} onClick={() => controller.runScreening()}>Rerun selected AI checks</Button>
      </>}
      <Button disabled={busy} onClick={() => controller.openSetup('checks')}>Change saved defaults</Button>
    </Details>
  </section>;
}
