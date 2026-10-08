import React, { useEffect, useRef } from 'react';
import { Setup } from './Setup.jsx';
import { Button } from '../ui/react.jsx';

/** Native top-layer dialog owns focus containment; pending intake stays with the controller. */
export function SetupDialog({ controller, state, calibrationRef, batchBusy, canCalibrate }) {
  const dialog = useRef(null), title = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    title.current?.focus({ preventScroll: true });
    return () => { if (element.open) element.close(); };
  }, []);
  return <dialog ref={dialog} className="setup-dialog" aria-labelledby="setup-modal-title"
    onCancel={event => { event.preventDefault(); controller.cancelSetup(); }}>
    <div className="setup-dialog-header">
      <h1 id="setup-modal-title" ref={title} tabIndex={-1}>Set up PDF checks</h1>
      <Button aria-label="Close setup" onClick={() => controller.cancelSetup()}>Close</Button>
    </div>
    {state.pendingSetupLabel && <p className="model-note">Selected: {state.pendingSetupLabel}. Your selection stays on this device and will be checked after setup.</p>}
    <Setup controller={controller} calibrationRef={calibrationRef} batchBusy={batchBusy} canCalibrate={canCalibrate} />
  </dialog>;
}
