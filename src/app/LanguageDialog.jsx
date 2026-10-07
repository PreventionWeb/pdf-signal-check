import React, { useEffect, useRef } from 'react';
import { getSemanticModel } from '../engine/models.js';
import { Actions, Button } from '../ui/react.jsx';

/** Native top-layer dialog for document language decision when AI checks are enabled. */
export function LanguageDialog({ controller, state }) {
  const dialog = useRef(null);
  const title = useRef(null);
  const model = state.selectedModel
    ? getSemanticModel(state.selectedModel)
    : state.evaluationModel
      ? getSemanticModel(state.evaluationModel)
      : null;

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) {
      element.showModal();
      title.current?.focus({ preventScroll: true });
    }
    return () => {
      if (element?.open) element.close();
    };
  }, []);

  const handleAssumeEnglish = () => {
    controller.setLanguageAssumption('en');
    controller.runScreening();
  };

  const handleContinueWithoutAI = () => {
    controller.dismissLanguageDecision();
  };

  const handleChangeSettings = () => {
    controller.dismissLanguageDecision();
    controller.openSetup('checks');
  };

  return (
    <dialog
      ref={dialog}
      className="language-dialog"
      aria-labelledby="language-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        handleContinueWithoutAI();
      }}
    >
      <div className="language-dialog-header">
        <h2 id="language-modal-title" ref={title} tabIndex={-1}>
          Is this PDF in English?
        </h2>
        <Button aria-label="Close dialog" onClick={handleContinueWithoutAI}>
          Close
        </Button>
      </div>
      <div className="language-dialog-body">
        <p>This PDF doesn’t say what language it is in. The AI checks need to know the language to compare text correctly.</p>
        <p>The other checks have already finished. If the PDF is in English, the AI checks can run now.</p>
        <p className="model-note">
          This only applies to this check. The missing language setting is still listed as something to fix.
        </p>
        {model && (
          <p className="model-note">
            If {model.label} isn’t downloaded yet, this downloads about {((model.graphBytes + model.tokenizerBytes) / 1e6 + 26.86).toFixed(0)} MB once (the model and the files that run it). Your PDF stays on this device.
          </p>
        )}
      </div>
      <Actions className="language-dialog-actions">
        <Button variant="primary" onClick={handleAssumeEnglish}>
          Yes, it’s in English
        </Button>
        <Button variant="secondary" onClick={handleContinueWithoutAI}>
          Skip AI checks
        </Button>
        <Button onClick={handleChangeSettings}>
          Change check settings
        </Button>
      </Actions>
    </dialog>
  );
}
