import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/react.jsx';
import { Preview } from './Preview.jsx';

/** Preview resources live only while this native top-layer dialog is open. */
export function PreviewDialog({ file, report, selection, onClose }) {
  const dialog = useRef(null), title = useRef(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    title.current?.focus({ preventScroll: true });
    return () => {
      if (element.open) element.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog ref={dialog} className="preview-dialog" aria-labelledby="preview-dialog-title"
      onCancel={event => { event.preventDefault(); onClose(); }}>
      <div className="preview-dialog-header">
        <h2 id="preview-dialog-title" ref={title} tabIndex={-1}>{selection?.overlay === 'order' ? 'Inspect reading order' : 'Inspect your PDF'}</h2>
        <Button aria-label="Close PDF preview" onClick={onClose}>Close</Button>
      </div>
      {selection?.label && selection?.overlay !== 'order' && <p className="model-note">Selected evidence: {selection.label}</p>}
      <Preview file={file} report={report} selection={selection} />
    </dialog>, document.body,
  );
}
