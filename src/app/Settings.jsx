import React, { useState } from 'react';
import { CalibrationPanel } from '../calibration/CalibrationPanel.jsx';
import { Button, Actions } from '../ui/react.jsx';

/** Saved browser preferences, separate from consent for a pending PDF. */
export function Settings({ controller, state, calibrationRef, batchBusy, canCalibrate }) {
  const [status, setStatus] = useState('');
  const busy = batchBusy || state.analysisBusy || state.modelBusy || state.calibrationBusy;
  const reusing = state.reuseSettings && state.aiEnabled;
  return <div className="settings-screen">
    <section className="settings-task" aria-labelledby="settings-checks-title">
      <div className="settings-task-heading"><h2 id="settings-checks-title">AI checks</h2><span className="task-state">{state.settingsSaved ? 'Settings saved' : reusing ? 'This session only' : 'Not saved'}</span></div>
      <p>{reusing ? `Granite R2 text checks are enabled for each PDF${state.settingsSaved ? '' : ' in this session'}. Image checks are ${state.imageAI ? 'enabled' : 'off'}.` : 'No check settings are saved.'}</p>
      <p>PDFs and results stay on your device.</p>
      <Actions><Button disabled={busy} onClick={() => controller.openSetup(state.setupDestination)}>{state.setupComplete ? 'Change AI permissions' : 'Set up AI checks'}</Button></Actions>
    </section>
    <section className="settings-task" aria-label="Device speed test">
      <CalibrationPanel ref={calibrationRef} modelId="granite-r2" disabled={batchBusy || state.analysisBusy || state.modelBusy} canRun={canCalibrate}
        onBusy={value => controller.calibrationBusy(value)} />
    </section>
    <section className="settings-task" aria-labelledby="settings-reset-title">
      <h2 id="settings-reset-title">Reset saved settings</h2>
      <p>Forget download permission and speed tests. Your next PDF will ask again. Cached model files remain in the browser.</p>
      <Button disabled={busy} onClick={() => { if (controller.resetSetup()) setStatus(controller.getSnapshot().message); }}>Reset saved settings</Button>
    </section>
    {(status || state.message) && <p role="status">{status || state.message}</p>}
  </div>;
}
