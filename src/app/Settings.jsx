import React, { useState } from 'react';
import { CalibrationPanel } from '../calibration/CalibrationPanel.jsx';
import { Button, Actions } from '../ui/react.jsx';

/** Saved browser preferences, separate from consent for a pending PDF. */
export function Settings({ controller, state, calibrationRef, batchBusy, canCalibrate }) {
  const [status, setStatus] = useState('');
  const busy = batchBusy || state.analysisBusy || state.modelBusy || state.calibrationBusy;
  return <div className="settings-screen">
    <h2>AI checks</h2>
    <p>{state.setupComplete ? `Granite R2 text checks are enabled. Image checks are ${state.imageAI ? 'enabled' : 'off'}.` : 'AI download permission has not been saved.'}</p>
    <p>PDFs and results stay on your device.</p>
    <Actions><Button disabled={busy} onClick={() => controller.openSetup(state.setupDestination)}>{state.setupComplete ? 'Change AI permissions' : 'Set up AI checks'}</Button></Actions>
    {state.setupComplete && <details className="mg-details setup-technical"><summary>Device speed test</summary>
      <CalibrationPanel ref={calibrationRef} modelId="granite-r2" disabled={batchBusy || state.analysisBusy || state.modelBusy} canRun={canCalibrate}
        onBusy={value => controller.calibrationBusy(value)} />
    </details>}
    <details className="mg-details setup-technical"><summary>Reset saved settings</summary>
      <p>Forget download permission and speed tests. Your next PDF will ask again. Cached model files remain in the browser.</p>
      <Button disabled={busy} onClick={() => { if (controller.resetSetup()) setStatus(controller.getSnapshot().message); }}>Reset saved settings</Button>
    </details>
    {status && <p role="status">{status}</p>}
  </div>;
}
