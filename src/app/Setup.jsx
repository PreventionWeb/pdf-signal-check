import React, { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { getSemanticModel } from '../engine/models.js';
import { Help } from '../help/Help.jsx';
import { CalibrationPanel } from '../calibration/CalibrationPanel.jsx';
import { createDevicePreferences } from '../calibration/preferences.js';
import { Button, Actions, Checkbox } from '../ui/react.jsx';
import { IMAGE_MODEL } from '../engine/image-model.js';
import './setup.css';

const model = getSemanticModel('granite-r2');
export function Setup({ controller, calibrationRef, batchBusy, canCalibrate }) {
  const [step, setStep] = useState(1);
  const [receipt, setReceipt] = useState(null);
  const snapshot = controller.getSnapshot();
  const [imageAI, setImageAI] = useState(() => snapshot.setupComplete ? snapshot.imageAI : true);
  const [busy, setBusy] = useState(false);
  const [preferences] = useState(() => createDevicePreferences());
  useEffect(() => {
    document.getElementById(step === 1 ? 'setup-model-title' : 'setup-speed-title')?.focus({ preventScroll: true });
  }, [step]);
  const consentAndTest = () => {
    const saved = preferences.load(model.key);
    flushSync(() => { setReceipt(saved?.receipt || null); setStep(2); });
    if (!saved) calibrationRef.current?.start();
  };
  const skipIntake = () => {
    calibrationRef.current?.cancel();
    controller.skipSetupForCurrentIntake();
  };
  return <div className="setup-screen">
    {step === 2 ? <>
      <h2 id="setup-speed-title" tabIndex={-1}>Text AI speed</h2>
      <p>A short sample test. You can cancel it and still use AI.</p>
      <CalibrationPanel ref={calibrationRef} modelId={model.key} showStartAction={false} disabled={batchBusy} canRun={canCalibrate}
        onResult={setReceipt} onBusy={value => { setBusy(value); controller.calibrationBusy(value); }} />
      <p>AI will run automatically on this and later PDFs when suitable evidence is available. You can skip it while scanning.</p>
      <Actions>
        <Button variant="primary" disabled={busy || batchBusy} onClick={() => controller.completeSetup(model.key, { imageAI })}>Continue with AI</Button>
        {snapshot.pendingSetupLabel && <Button disabled={batchBusy} onClick={skipIntake}>Skip AI this time</Button>}
      </Actions>
      {!busy && <details className="mg-details setup-technical"><summary>Speed test options</summary>
        <p>The test measures fixed sample text, not image speed, accuracy, memory capacity or the time needed for your PDF.</p>
        <Actions>
          <Button disabled={batchBusy} onClick={() => calibrationRef.current?.start()}>{receipt ? 'Test again' : 'Retry test'}</Button>
          <Button disabled={batchBusy} onClick={() => setStep(1)}>Change download options</Button>
        </Actions>
      </details>}
    </> : <>
      <h2 id="setup-model-title" className="mg-u-sr-only" tabIndex={-1}>Add AI checks</h2>
      <p>Compare titles, descriptions and headings with your PDF’s text. Everything runs on your device.</p>
      <div className="setup-text-option">
        <h3>Text comparisons</h3>
        <p>Granite R2, 52 supported languages. <strong>123.16 MB</strong> download. <Help topic="ai" label="Supported languages" extraText={model.languages.map(code => new Intl.DisplayNames(['en'], { type: 'language' }).of(code)).join(', ')} /></p>
      </div>
      <div className="setup-image-option">
        <Checkbox id="setup-image-ai" name="setup-image-ai" checked={imageAI} disabled={batchBusy} onChange={event => setImageAI(event.target.checked)} label="Include image checks" />
        <p className="model-note">{IMAGE_MODEL.download} download, plus {IMAGE_MODEL.descriptionDownload} for photo-description comparisons.</p>
      </div>
      <p className="model-note">Runtime files add approximately 26.86 MB uncompressed, plus JavaScript. Cached files may be reused.</p>
      <details className="mg-details setup-technical">
        <summary>What AI can and cannot check</summary>
        <p>AI compares limited excerpts, up to 512 tokens each. It may miss errors or raise false alarms. <Help topic="excerptLimit" label="About excerpt limits" /></p>
        <p>Image checks classify some graphics and compare photo descriptions with pictures. They cannot read chart values or judge chart meaning, and can be wrong.</p>
        <p>AI can also compare keywords, image descriptions with captions, contents entries with headings, and statements with numbers. Number comparisons are experimental evidence only; AI cannot check whether those numbers are true. They appear only in Technical details and the full report; they do not add things to fix or check, change headline counts or affect scores.</p>
      </details>
      <p>Next: a skippable text speed test. Continuing afterward saves permission for automatic AI checks.</p>
      <Actions>
        <Button variant="primary" disabled={batchBusy} onClick={consentAndTest}>Allow downloads</Button>
        {snapshot.pendingSetupLabel && <Button disabled={batchBusy} onClick={skipIntake}>Skip AI this time</Button>}
      </Actions>
    </>}
  </div>;
}
