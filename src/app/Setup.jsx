import React, { useEffect, useState } from 'react';
import { SEMANTIC_MODELS } from '../engine/models.js';
import { Help } from '../help/Help.jsx';
import { CalibrationPanel } from '../calibration/CalibrationPanel.jsx';
import { createDevicePreferences, rateDevice } from '../calibration/preferences.js';
import { Card, Button, Radio, Actions } from '../ui/react.jsx';
import './setup.css';

export function Setup({ controller, calibrationRef, batchBusy, canCalibrate }) {
  const [step, setStep] = useState(1);
  const [modelId, setModelId] = useState(() => controller.getSnapshot().setupComplete ? controller.getSnapshot().evaluationModel : 'granite-r2');
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resetStatus, setResetStatus] = useState('');
  const [preferences] = useState(() => createDevicePreferences());
  useEffect(() => {
    const heading = document.getElementById(step === 1 ? "setup-model-title" : "setup-speed-title");
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [step, resetStatus]);
  const options = [
    { ...SEMANTIC_MODELS[1], purpose: 'Standard checks + multilingual AI', note: 'Recommended · 52 languages', description: 'Adds text comparisons in supported languages.', download: '123.16 MB' },
    { ...SEMANTIC_MODELS[0], purpose: 'Standard checks + English AI', note: 'Smaller download · English only', description: 'Adds English text comparisons with a compact model.', download: '23.68 MB' },
    { key: null, purpose: 'Standard checks', note: 'No model download', description: 'Checks text, tags and saved details. Skips AI text comparisons; you can add them later.' },
  ];
  const selected = options.find(option => option.key === modelId);
  const downloadNote = modelId ? `${selected.label}: ${selected.download} for model and tokenizer files, plus approximately 26.86 MB of uncompressed runtime files and JavaScript. Actual transfer varies; your browser may reuse cached files.` : '';
  const speed = model => {
    const measured = model.key === modelId && receipt ? receipt : preferences.load(model.key)?.receipt;
    if (!measured) return <span><strong>{model.key === 'minilm' ? 'Good' : 'OK'}</strong><br /><small>Expected · not benchmarked</small></span>;
    const rating = rateDevice(measured);
    const label = { great: 'Good', ok: 'OK', slow: 'Not recommended', unrated: 'Check again' }[rating.key];
    return <span><strong>{label}</strong><br /><small>Measured on this device</small></span>;
  };
  return <div className="setup-screen">
    <nav className="flow-steps" aria-label="Setup steps"><ol>
      <li aria-current={step === 1 ? 'step' : undefined}><span>1 · Choose how to check</span></li>
      <li aria-current={step === 2 ? 'step' : undefined}><span>2 · Optional speed test</span></li>
    </ol></nav>
    {resetStatus && <p role="status">{resetStatus}</p>}
    {step === 2 ? <>
      <h2 id="setup-speed-title" tabIndex={-1}>Check {SEMANTIC_MODELS.find(model => model.key === modelId)?.label} speed on your device</h2>
      <p>This optional test uses a synthetic PDF and fixed text. It measures this model’s speed, not accuracy or memory capacity. You can continue without testing.</p>
      <Card><CalibrationPanel ref={calibrationRef} modelId={modelId} showStartAction={!receipt} disabled={batchBusy} canRun={canCalibrate} onResult={setReceipt} onBusy={value => { setBusy(value); controller.calibrationBusy(value); }} /></Card>
      <p className="model-note">{downloadNote}</p>
      <p>Continuing saves your choice and allows these downloads for future PDF checks. Your PDF stays on this device. AI comparisons can be wrong.</p>
      <Actions>
        <Button variant="primary" disabled={busy || batchBusy} onClick={() => controller.completeSetup(modelId)}>{receipt ? 'Use this model and continue' : 'Continue without speed test'}</Button>
        {receipt && <Button disabled={busy || batchBusy} onClick={() => calibrationRef.current?.start()}>Check again</Button>}
        <Button disabled={busy} onClick={() => setStep(1)}>Back to check options</Button>
      </Actions>
    </> : <>
      <h2 id="setup-model-title" tabIndex={-1}>Choose your checks</h2>
      <p>Every option checks text, tags and saved document details. Optional AI also compares short passages with titles, descriptions, keywords and tagged headings. Your PDFs stay on this device.</p>
      <fieldset className="setup-options">
        <legend className="mg-u-sr-only">Check options</legend>
        <div className="setup-option-grid">
          {options.map(option => <Card as="div" key={option.key || 'none'} className={`setup-option${modelId === option.key ? ' is-selected' : ''}`}>
            <Radio id={`setup-${option.key || 'none'}`} name="setup-model" value={option.key || 'none'} label={option.purpose} checked={modelId === option.key} disabled={batchBusy} onChange={() => { setModelId(option.key); setReceipt(null); }} />
            <p className="setup-option-note">{option.note}{option.key === 'granite-r2' && <> <Help topic="ai" label="Granite R2 supported languages" extraText={SEMANTIC_MODELS[1].languages.map(code => new Intl.DisplayNames(['en'], { type: 'language' }).of(code)).join(', ')} /></>}</p>
            {option.key && <p className="model-note">{option.label}</p>}
            <p>{option.description}</p>
            {option.download && <p><strong>{option.download}</strong> model and tokenizer download, plus runtime files below.</p>}
          </Card>)}
        </div>
      </fieldset>
      <p className="model-note">Both AI options also need approximately 26.86 MB of uncompressed runtime files, plus JavaScript. Actual transfer varies; your browser may reuse cached files. Choose multilingual AI for broader language coverage or English AI for a smaller download. AI comparisons can be wrong.</p>
      <details className="mg-details setup-technical">
        <summary>Compare technical details</summary>
        <p>AI compares limited excerpts, not every word in the PDF. Tagged heading comparisons are included in the default AI checks; your saved check choices are kept.</p>
        <p>Excerpt limit <Help topic="excerptLimit" label="What the excerpt limit means" /></p>
        <dl className="setup-model-details">
          {options.filter(option => option.key).map(option => <React.Fragment key={option.key}>
            <dt>{option.label}</dt>
            <dd>{option.key === 'minilm' ? '256' : '512'} tokens per excerpt. Processing speed: {speed(option)}</dd>
          </React.Fragment>)}
        </dl>
        <p className="model-note">Speed is a general estimate until that model is tested on this device. The optional speed test uses fixed sample text; it does not measure accuracy or predict the time for your PDF. A test of one model does not rate the other.</p>
      </details>
      <p>{modelId ? 'Next, you can try an optional speed test or continue. At that step, you will confirm permission for the displayed downloads. You can change your choice later in Settings.' : 'Standard checks run without model downloads. Continuing saves this choice in your browser. You can add AI comparisons later in Settings.'}</p>
      <Actions>
        <Button variant="primary" disabled={batchBusy} onClick={() => modelId ? setStep(2) : controller.completeSetup(null)}>{modelId ? 'Next: optional speed test' : 'Continue with standard checks'}</Button>
        <Button disabled={batchBusy} onClick={() => controller.cancelSetup()}>Back to PDF selection</Button>
      </Actions>
    </>}
    <div className="setup-reset">
      <Button disabled={busy || batchBusy} onClick={() => { if (controller.resetSetup()) { setModelId('granite-r2'); setReceipt(null); setStep(1); setResetStatus(controller.getSnapshot().message); } }}>Reset saved setup</Button>
      <p className="model-note">Forget model selection, download permission and saved speed tests. Your next PDF will ask you to set up again. Downloaded model files remain in the browser cache.</p>
    </div>
  </div>;
}
