import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/react.jsx';

/** Side drawer for technical evidence: a native modal dialog that restores focus to its trigger. */
export function EvidenceDrawer({ title, onClose, children }) {
  const dialog = useRef(null), heading = useRef(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => {
      if (element.open) element.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog ref={dialog} className="evidence-drawer" aria-labelledby="evidence-drawer-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === dialog.current) onClose(); }}>
      <div className="evidence-drawer-header">
        <div>
          <p className="evidence-drawer-eyebrow">Technical evidence</p>
          <h2 id="evidence-drawer-title" ref={heading} tabIndex={-1}>{title}</h2>
        </div>
        <Button aria-label="Close technical evidence" onClick={onClose}>Close</Button>
      </div>
      <div className="evidence-drawer-body">{children}</div>
    </dialog>, document.body,
  );
}
