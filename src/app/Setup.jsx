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
  const [textAI, setTextAI] = useState(true);
  const [remember, setRemember] = useState(snapshot.reuseSettings === true);
  const [imageAI, setImageAI] = useState(() => snapshot.setupComplete ? snapshot.imageAI : true);
  const [busy, setBusy] = useState(false);
  const [preferences] = useState(() => createDevicePreferences());
  useEffect(() => {
    document.getElementById(step === 1 ? 'setup-model-title' : 'setup-speed-title')?.focus({ preventScroll: true });
  }, [step]);
  const consentAndTest = () => {
    if (!textAI) { controller.skipSetupForCurrentIntake(); return; }
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
      <h2 id="setup-speed-title" className="mg-u-sr-only" tabIndex={-1}>Device speed test</h2>
      <CalibrationPanel ref={calibrationRef} modelId={model.key} showStartAction={false} showHeading={false} disabled={batchBusy} canRun={canCalibrate}
        onResult={setReceipt} onBusy={value => { setBusy(value); controller.calibrationBusy(value); }} />
      <Actions>
        <Button variant="primary" disabled={busy || batchBusy} onClick={() => controller.completeSetup(model.key, { imageAI, remember })}>Continue with AI</Button>
        {snapshot.pendingSetupLabel && <Button disabled={batchBusy} onClick={skipIntake}>Skip AI this time</Button>}
      </Actions>
      {!busy && <Actions>
          <Button disabled={batchBusy} onClick={() => calibrationRef.current?.start()}>{receipt ? 'Test again' : 'Retry test'}</Button>
          <Button disabled={batchBusy} onClick={() => setStep(1)}>Change download options</Button>
      </Actions>}
    </> : <>
      <h2 id="setup-model-title" className="mg-u-sr-only" tabIndex={-1}>Add AI checks</h2>
      <div className="setup-check-option">
        <Checkbox id="setup-standard" name="setup-standard" checked disabled label="Standard checks (always on)" />
        <div className="setup-check-description">
          <p>Looks for missing document details, broken text structure, reading-order clues, missing image descriptions and inconsistent values. Uses fixed rules, with no AI download.</p>
        </div>
      </div>
      <div className="setup-check-option">
        <Checkbox id="setup-text-ai" name="setup-text-ai" checked={textAI} disabled={batchBusy}
          onChange={event => { setTextAI(event.target.checked); if (!event.target.checked) setImageAI(false); }} label="AI text checks" />
        <div className="setup-check-description">
          <p className="setup-check-meta">Granite R2, <Help topic="ai" label="About 52 supported languages" extraText={model.languages.map(code => new Intl.DisplayNames(['en'], { type: 'language' }).of(code)).join(', ')}>52 supported languages</Help>. <strong>123.16 MB</strong> download.</p>
          <p>AI compares limited excerpts, up to <Help topic="excerptLimit" label="What 512 tokens means">512 tokens</Help> each. It may miss errors or raise false alarms.</p>
        </div>
      </div>
      <div className="setup-check-option">
        <Checkbox id="setup-image-ai" name="setup-image-ai" checked={imageAI} disabled={batchBusy}
          onChange={event => { setImageAI(event.target.checked); if (event.target.checked) setTextAI(true); }} label="AI image checks" />
        <div className="setup-check-description">
          <p className="setup-check-meta"><strong>{IMAGE_MODEL.download}</strong> download, plus <strong>{IMAGE_MODEL.descriptionDownload}</strong> for photo-description comparisons.</p>
          <p>Image checks classify some graphics and compare photo descriptions with pictures. They cannot read chart values or judge chart meaning, and can be wrong.</p>
        </div>
      </div>
      <Checkbox id="setup-remember" name="setup-remember" checked={remember} disabled={batchBusy || !textAI}
        onChange={event => setRemember(event.target.checked)} label="Use these settings each time" />
      {textAI && <p className="model-note">Next: a skippable device speed test.</p>}
      <Actions>
        <Button variant="primary" disabled={batchBusy || (!textAI && !snapshot.pendingSetupLabel)} onClick={consentAndTest}>{textAI ? 'Allow downloads' : 'Continue without AI'}</Button>
        {textAI && snapshot.pendingSetupLabel && <Button disabled={batchBusy} onClick={skipIntake}>Skip AI this time</Button>}
      </Actions>
    </>}
  </div>;
}
