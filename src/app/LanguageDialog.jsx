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
          AI is waiting for the document language
        </h2>
        <Button aria-label="Close dialog" onClick={handleContinueWithoutAI}>
          Close
        </Button>
      </div>
      <div className="language-dialog-body">
        <p>Completed text checks are retained. You can inspect them while resolving AI coverage.</p>
        <p>This PDF does not declare a document language in its metadata. Missing language declarations can confuse semantic models.</p>
        <p className="model-note">
          Choosing to assume English applies only to this PDF’s local AI checks; it does not fix the PDF’s metadata declaration or change the required rule defect.
        </p>
        {model && (
          <p className="model-note">
            {model.label}: {((model.graphBytes + model.tokenizerBytes) / 1e6).toFixed(2)} MB model/tokenizer if needed, plus runtime assets (approximately 26.86 MB uncompressed WASM and JavaScript). Running permits these downloads. Your PDF text stays on this device.
          </p>
        )}
      </div>
      <Actions className="language-dialog-actions">
        <Button variant="primary" onClick={handleAssumeEnglish}>
          Assume English &amp; run AI checks
        </Button>
        <Button variant="secondary" onClick={handleContinueWithoutAI}>
          Continue without AI checks
        </Button>
        <Button onClick={handleChangeSettings}>
          Change check settings
        </Button>
      </Actions>
    </dialog>
  );
}
