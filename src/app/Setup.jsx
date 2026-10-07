import React, { useEffect, useState } from 'react';
import { SEMANTIC_MODELS } from '../engine/models.js';
import { Help } from '../help/Help.jsx';
import { CalibrationPanel } from '../calibration/CalibrationPanel.jsx';
import { createDevicePreferences, rateDevice } from '../calibration/preferences.js';
import { Card, Button, Radio, Actions } from '../ui/react.jsx';

export function Setup({ controller, calibrationRef, batchBusy, canCalibrate }) {
  const [step, setStep] = useState(() => controller.getSnapshot().setupComplete ? 2 : 1);
  const [modelId, setModelId] = useState(() => controller.getSnapshot().setupComplete ? controller.getSnapshot().evaluationModel : 'minilm');
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [preferences] = useState(() => createDevicePreferences());
  useEffect(() => {
    const heading = document.getElementById(step === 2 ? "setup-model-title" : "setup-modal-title");
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [step]);
  const ready = receipt && rateDevice(receipt).key !== 'unrated';
  const options = [...SEMANTIC_MODELS, { key: null, label: 'No AI model · fallback' }];
  const speed = model => {
    const measured = model.key === 'minilm' && receipt ? receipt : preferences.load(model.key)?.receipt;
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
      <li aria-current={step === 1 ? 'step' : undefined}><span>1 · Benchmark device</span></li>
      <li aria-current={step === 2 ? 'step' : undefined}><span>2 · Choose a model</span></li>
    </ol></nav>
    {step === 1 ? <>
      <p>First, test this device with the compact MiniLM model. Then compare models and choose one for your PDFs. This benchmark measures MiniLM only.</p>
      <Card><CalibrationPanel ref={calibrationRef} modelId="minilm" showStartAction={!receipt} disabled={batchBusy} canRun={canCalibrate} onResult={setReceipt}
        onBusy={value => { setBusy(value); controller.calibrationBusy(value); }} /></Card>
      <Actions>
        <Button variant="primary" disabled={!ready || busy || batchBusy} onClick={() => setStep(2)}>Continue to model selection</Button>
        <Button disabled={busy || batchBusy} onClick={() => receipt ? calibrationRef.current?.start() : setStep(2)}>{receipt ? "Check again" : "Skip benchmark"}</Button>
        <Button disabled={busy} onClick={() => controller.cancelSetup()}>Back to PDF selection</Button>
      </Actions>
      <p className="model-note">{receipt ? "Saved results contain synthetic timings only. The next step includes a no-AI fallback if needed." : "You can skip the benchmark. A no-AI fallback is available if local AI cannot run. Saved results contain synthetic timings only."}</p>
    </> : <>
      <h2 id="setup-model-title" tabIndex={-1}>Choose a model for your PDFs</h2>
      <p>Use MiniLM for English PDFs, or Granite R2 for its supported languages. Both add local AI comparisons to text, structure and metadata checks. Use no AI model only as a fallback if local AI cannot run on your device. Your PDFs stay on this device.</p>
        <p className="matrix-scroll-hint">Scroll across to compare all three options.</p>
        <div className="mg-table-scroll-region setup-matrix-scroll" role="region" aria-label="Model feature comparison" tabIndex={0}>
          <table className="mg-table setup-matrix">
            <caption className="mg-u-sr-only">Features of MiniLM, Granite R2 and the no-AI fallback</caption>
            <thead><tr><th scope="col">Compare options</th>{options.map(option => <th scope="col" key={option.key || 'none'} className={modelId === option.key ? 'is-selected' : undefined}>
              <Radio id={`setup-${option.key || 'none'}`} name="setup-model" value={option.key || 'none'} label={option.label}
                checked={modelId === option.key} disabled={batchBusy} onChange={() => setModelId(option.key)} />
              <p className="setup-product-note">{option.key === 'minilm' ? 'Recommended for English' : option.key ? 'For multilingual PDFs' : 'Fallback only'}</p>
            </th>)}</tr></thead>
            <tbody>{features.map(([feature, ...values], rowIndex) => <tr key={rowIndex}><th scope="row">{feature}</th>{[values[1], values[2], values[0]].map((value, i) => <td key={i} className={modelId === options[i].key ? 'is-selected' : undefined}>{value === 'Yes' ? <strong>Yes</strong> : value}</td>)}</tr>)}</tbody>
          </table>
        </div>
      <p className="model-note">AI options also use runtime assets: approximately 26.86 MB uncompressed WASM, plus JavaScript. Transfer/cache cost varies. Token limits bound each excerpt; they do not describe whole-document coverage. Processing speed is a general estimate of AI overhead until that model is benchmarked on this device; actual speed varies with your PDF. A MiniLM benchmark does not rate Granite R2. Tagged heading comparisons can be enabled in check settings.</p>
      <p>{modelId ? 'Continuing saves your model and check settings in this browser and permits the displayed model, tokenizer and runtime downloads for future PDF checks. You can change these settings on the PDF selection screen. AI findings are advisory and can be wrong.' : 'Fallback selected: this choice is saved in this browser. AI comparisons will be skipped. Text, structure and metadata rules still run, without model downloads. Enable AI later in setup when it is available.'}</p>
      <Actions>
        <Button variant="primary" disabled={batchBusy} onClick={() => controller.completeSetup(modelId)}>{modelId ? 'Use selected model and continue' : 'Continue without AI'}</Button>
        <Button disabled={batchBusy} onClick={() => setStep(1)}>Back to benchmark</Button>
      </Actions>
    </>}
  </div>;
}
