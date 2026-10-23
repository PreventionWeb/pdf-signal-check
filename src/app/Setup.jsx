import React, { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { getSemanticModel } from '../engine/models.js';
import { Help } from '../help/Help.jsx';
import { CalibrationPanel } from '../calibration/CalibrationPanel.jsx';
import { createDevicePreferences } from '../calibration/preferences.js';
import { Card, Button, Actions, Checkbox } from '../ui/react.jsx';
import { screeningAvailability } from '../runtime/screening-availability.js';
import { IMAGE_MODEL } from '../engine/image-model.js';
import './setup.css';

const model = getSemanticModel('granite-r2');
export function Setup({ controller, calibrationRef, batchBusy, canCalibrate }) {
  const [step, setStep] = useState(1);
  const [receipt, setReceipt] = useState(null);
  const snapshot = controller.getSnapshot();
  const [imageAI, setImageAI] = useState(() => snapshot.setupComplete ? snapshot.imageAI : true);
  const [busy, setBusy] = useState(false);
  const [resetStatus, setResetStatus] = useState('');
  const [preferences] = useState(() => createDevicePreferences());
  useEffect(() => {
    const heading = document.getElementById(step === 1 ? 'setup-model-title' : 'setup-speed-title');
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [step, resetStatus]);
  const available = snapshot.report ? screeningAvailability(snapshot.report, { modelId: model.key, checks: snapshot.checks, languageAssumption: snapshot.languageAssumption }) : null;
  const downloadNote = `Granite R2: 123.16 MB for model and tokenizer files${imageAI ? `; image model: ${IMAGE_MODEL.download}, plus ${IMAGE_MODEL.descriptionDownload} when photo descriptions can be compared` : ''}. Runtime files add approximately 26.86 MB uncompressed, plus JavaScript. Actual transfer varies; your browser may reuse cached files.`;
  const consentAndTest = () => {
    // Only this explicit consent action starts a benchmark; mounting or remounting never does.
    const saved = preferences.load(model.key);
    flushSync(() => { setReceipt(saved?.receipt || null); setStep(2); });
    if (!saved) calibrationRef.current?.start();
  };
  const skipIntake = () => {
    calibrationRef.current?.cancel();
    controller.skipSetupForCurrentIntake();
  };
  return <div className="setup-screen">
    <nav className="flow-steps" aria-label="Setup steps"><ol>
      <li aria-current={step === 1 ? 'step' : undefined}><span>1 · Allow AI downloads</span></li>
      <li aria-current={step === 2 ? 'step' : undefined}><span>2 · Optional speed test</span></li>
    </ol></nav>
    {resetStatus && <p role="status">{resetStatus}</p>}
    {step === 2 ? <>
      <h2 id="setup-speed-title" tabIndex={-1}>Check text AI speed on your device</h2>
      <p>This optional test uses a fictional PDF and fixed text before your selected PDF is opened. It measures Granite R2 text speed, not image-model speed, accuracy, memory capacity or the time needed for your PDF.</p>
      <Card><CalibrationPanel ref={calibrationRef} modelId={model.key} showStartAction={false} disabled={batchBusy} canRun={canCalibrate} onResult={setReceipt} onBusy={value => { setBusy(value); controller.calibrationBusy(value); }} /></Card>
      <p className="model-note">{downloadNote}</p>
      <p>Continue to save download permission and check your PDF. AI comparisons run automatically after standard checks on this and later PDFs when evidence and supported language are available. Your PDF stays on this device. AI comparisons can be wrong.</p>
      <Actions>
        <Button variant="primary" disabled={busy || batchBusy} onClick={() => controller.completeSetup(model.key, { imageAI })}>{receipt ? 'Continue with AI checks' : 'Skip speed test and continue with AI'}</Button>
        <Button disabled={busy || batchBusy} onClick={() => calibrationRef.current?.start()}>{receipt ? 'Test text speed again' : 'Retry speed test'}</Button>
        <Button disabled={busy || batchBusy} onClick={() => setStep(1)}>Back to download options</Button>
        {snapshot.pendingSetupLabel && <Button disabled={batchBusy} onClick={skipIntake}>Skip AI for this intake</Button>}
      </Actions>
    </> : <>
      <h2 id="setup-model-title" tabIndex={-1}>Add on-device AI checks</h2>
      <p>Add AI comparisons of titles, descriptions and headings to the standard text and tag checks. Your PDFs stay on this device.</p>
      <Card>
        <h3>Granite R2 · 52 supported languages</h3>
        <p><strong>123.16 MB</strong> model and tokenizer download. <Help topic="ai" label="Granite R2 supported languages" extraText={model.languages.map(code => new Intl.DisplayNames(['en'], { type: 'language' }).of(code)).join(', ')} /></p>
        <p>AI compares limited excerpts, up to 512 tokens each, rather than every word. It may miss errors or raise false alarms.</p>
      </Card>
      <div className="setup-image-option">
        <Checkbox id="setup-image-ai" name="setup-image-ai" checked={imageAI} disabled={batchBusy} onChange={event => setImageAI(event.target.checked)}
          label={`Also look at images with an on-device image model (${IMAGE_MODEL.download}, plus ${IMAGE_MODEL.descriptionDownload} when a PDF has photo descriptions to check)`} />
        <p className="model-note">It sorts graphics marked as decoration that the rules can’t place into types such as chart, map, photo or plain panel, and checks whether photo descriptions match their pictures. It can’t read text in images and can be wrong. The speed test does not measure these image checks.</p>
      </div>
      <p className="model-note">{downloadNote}</p>
      <details className="mg-details setup-technical">
        <summary>AI limits and speed test details</summary>
        <p>When evidence is available, AI also compares image descriptions with captions, contents entries with headings, and statements with numbers. Number comparisons are experimental evidence only; AI cannot check whether those numbers are true. They appear only in Technical details and the full report; they do not add things to fix or check, change headline counts or affect scores.</p>
        {available && <p>For this PDF: {available.text.map(item => `${item.count} ${item.label}`).join('; ') || 'no usable text pairs'}; {available.graphics} graphics and {available.photos} photo descriptions before cropping. {available.missingLanguage ? 'Text comparisons need an explicit English-language decision.' : !available.languageSupported ? 'Granite R2 does not support the declared language.' : ''}</p>}
        <p>AI compares titles, descriptions, keywords and tagged headings when usable evidence is available. <Help topic="excerptLimit" label="What the excerpt limit means" /></p>
        <p>No speed rating is available until Granite R2 is measured on this device. A valid saved Granite R2 result may be reused. The test uses synthetic text and measures neither AI accuracy nor full-PDF processing time.</p>
      </details>
      <p>Allowing downloads starts the optional text speed test. You can cancel or skip the test and still continue with AI, or skip AI for this intake. Permission is saved only when you continue from the speed-test step.</p>
      <Actions>
        <Button variant="primary" disabled={batchBusy} onClick={consentAndTest}>Allow downloads and continue</Button>
        {snapshot.pendingSetupLabel && <Button disabled={batchBusy} onClick={skipIntake}>Skip AI for this intake</Button>}
        <Button disabled={batchBusy} onClick={() => controller.cancelSetup()}>{snapshot.report ? 'Back to results' : 'Back to PDF selection'}</Button>
      </Actions>
    </>}
    <div className="setup-reset">
      <Button disabled={busy || batchBusy} onClick={() => { if (controller.resetSetup()) { setReceipt(null); setImageAI(true); setStep(1); setResetStatus(controller.getSnapshot().message); } }}>Reset saved setup</Button>
      <p className="model-note">Forget download permission, check preferences and saved speed tests. The next intake will ask again. Downloaded model files remain in the browser cache.</p>
    </div>
  </div>;
}
