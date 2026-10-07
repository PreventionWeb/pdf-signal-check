import React, { useEffect, useState } from 'react';
import { SEMANTIC_MODELS } from '../engine/models.js';
import { Help } from '../help/Help.jsx';
import { CalibrationPanel } from '../calibration/CalibrationPanel.jsx';
import { createDevicePreferences, rateDevice } from '../calibration/preferences.js';
import { Card, Button, Radio, Actions } from '../ui/react.jsx';

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
  const options = [SEMANTIC_MODELS[1], SEMANTIC_MODELS[0], { key: null, label: 'No AI model · fallback' }];
  const speed = model => {
    const measured = model.key === modelId && receipt ? receipt : preferences.load(model.key)?.receipt;
    if (!measured) return <span><strong>{model.key === 'minilm' ? 'Good' : 'OK'}</strong><br /><small>Expected · not benchmarked</small></span>;
    const rating = rateDevice(measured);
    const label = { great: 'Good', ok: 'OK', slow: 'Not recommended', unrated: 'Check again' }[rating.key];
    return <span><strong>{label}</strong><br /><small>Measured on this device</small></span>;
  };
  const features = [
    ['Best for', 'Text and structure review', 'English PDF comparisons', 'Multilingual PDF comparisons'],
    ['Text, structure and metadata rules', 'Yes', 'Yes', 'Yes'],
    ['AI title, subject and keyword comparisons', 'No', 'Yes', 'Yes'],
    ['AI tagged heading comparisons', 'No', 'Yes', 'Yes'],
    ['AI language coverage', 'Not applicable', 'English', <span>52 supported languages <Help topic="ai" label="Granite R2 supported languages" extraText={SEMANTIC_MODELS[1].languages.map(code => new Intl.DisplayNames(['en'], { type: 'language' }).of(code)).join(', ')} /></span>],
    ['Model and tokenizer download', 'None', '23.68 MB', '123.16 MB'],
    [<span>Excerpt limit <Help topic="excerptLimit" label="What the excerpt limit means" /></span>, 'Not applicable', '256 tokens', '512 tokens'],
    ['Processing speed', <span><strong>Fast</strong><br /><small>No AI processing</small></span>, speed(SEMANTIC_MODELS[0]), speed(SEMANTIC_MODELS[1])],
  ];
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
      <p className="model-note">Continuing saves your model and check settings and permits its displayed downloads for future checks. Your PDF stays on this device.</p>
      <Actions>
        <Button variant="primary" disabled={busy || batchBusy} onClick={() => controller.completeSetup(modelId)}>{receipt ? 'Use this model and continue' : 'Continue without speed test'}</Button>
        {receipt && <Button disabled={busy || batchBusy} onClick={() => calibrationRef.current?.start()}>Check again</Button>}
        <Button disabled={busy} onClick={() => setStep(1)}>Back to model choice</Button>
      </Actions>
    </> : <>
      <h2 id="setup-model-title" tabIndex={-1}>Choose a model for your PDFs</h2>
      <p>Granite R2 is recommended for its broader language coverage. For English PDFs, choose compact MiniLM when smaller downloads, a slower device or high processing volumes matter. Use no AI model only if local AI cannot run; it skips AI text comparisons. Your PDFs stay on this device.</p>
        <p className="matrix-scroll-hint">Scroll across to compare all three options.</p>
        <div className="mg-table-scroll-region setup-matrix-scroll" role="region" aria-label="Model feature comparison" tabIndex={0}>
          <table className="mg-table setup-matrix">
            <caption className="mg-u-sr-only">Features of MiniLM, Granite R2 and the no-AI fallback</caption>
            <thead><tr><th scope="col">Compare options</th>{options.map(option => <th scope="col" key={option.key || 'none'} className={modelId === option.key ? 'is-selected' : undefined}>
              <Radio id={`setup-${option.key || 'none'}`} name="setup-model" value={option.key || 'none'} label={option.label} checked={modelId === option.key} disabled={batchBusy} onChange={() => { setModelId(option.key); setReceipt(null); }} />
              <p className="setup-product-note">{option.key === 'granite-r2' ? 'Recommended · 52 languages' : option.key ? 'Compact option · English only' : 'Fallback · no AI comparisons'}</p>
            </th>)}</tr></thead>
            <tbody>{features.map(([feature, ...values], rowIndex) => <tr key={rowIndex}><th scope="row">{feature}</th>{options.map(option => values[option.key === 'minilm' ? 1 : option.key === 'granite-r2' ? 2 : 0]).map((value, i) => <td key={i} className={modelId === options[i].key ? 'is-selected' : undefined}>{value === 'Yes' ? <strong>Yes</strong> : value}</td>)}</tr>)}</tbody>
          </table>
        </div>
      <p className="model-note">AI options also use runtime assets: approximately 26.86 MB uncompressed WASM, plus JavaScript. Transfer/cache cost varies. Token limits bound each excerpt; they do not describe whole-document coverage. Processing speed is a general estimate of AI overhead until that model is benchmarked on this device; actual speed varies with your PDF. A MiniLM benchmark does not rate Granite R2. Tagged heading comparisons can be enabled in check settings.</p>
      <p>{modelId ? 'Continuing saves your model and check settings in this browser and permits the displayed model, tokenizer and runtime downloads for future PDF checks. You can change these settings on the PDF selection screen. AI findings are advisory and can be wrong.' : 'No AI selected: this choice is saved in this browser. AI comparisons will be skipped. Text, structure and metadata rules still run, without model downloads. Enable AI later in setup when it is available.'}</p>
      <Actions>
        <Button variant="primary" disabled={batchBusy} onClick={() => modelId ? setStep(2) : controller.completeSetup(null)}>{modelId ? 'Continue with selected model' : 'Continue without AI'}</Button>
        <Button disabled={batchBusy} onClick={() => controller.cancelSetup()}>Back to PDF selection</Button>
      </Actions>
    </>}
    <div className="setup-reset">
      <Button disabled={busy || batchBusy} onClick={() => { if (controller.resetSetup()) { setModelId('granite-r2'); setReceipt(null); setStep(1); setResetStatus(controller.getSnapshot().message); } }}>Reset saved setup</Button>
      <p className="model-note">Forget model selection, download permission and saved speed tests. Your next PDF will ask you to set up again. Downloaded model files remain in the browser cache.</p>
    </div>
  </div>;
}
