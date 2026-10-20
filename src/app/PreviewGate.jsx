import React, { useEffect, useRef, useState } from 'react';
import { PREVIEW_MAX_AGE_DAYS, previewAccess } from './preview-access.js';
import './preview-gate.css';

/** Published Mangrove PreviewAccess markup, with React and a native dialog owning its lifetime. */
export function PreviewGate({ children, access: suppliedAccess }) {
  const [access] = useState(() => suppliedAccess || previewAccess());
  const [unlocked, setUnlocked] = useState(() => access.isUnlocked());
  const [error, setError] = useState('');
  const [entered, setEntered] = useState(false);
  const dialog = useRef(null), input = useRef(null);
  // As in Mangrove 2.2, a PIN unlock moves focus into the revealed page rather than leaving it on body.
  // The app loads lazily, so wait for its main landmark; restored unlocks keep normal page-load focus.
  useEffect(() => {
    if (!entered) return;
    const focusMain = () => {
      const main = document.getElementById('main');
      if (!main) return false;
      if (document.activeElement === document.body || !document.activeElement) main.focus({ preventScroll: true });
      return true;
    };
    if (focusMain()) return;
    const observer = new MutationObserver(() => { if (focusMain()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = setTimeout(() => observer.disconnect(), 10000);
    return () => { observer.disconnect(); clearTimeout(timeout); };
  }, [entered]);
  useEffect(() => {
    if (unlocked) return;
    const element = dialog.current;
    element.showModal();
    input.current?.focus();
    return () => { if (element.open) element.close(); };
  }, [unlocked]);
  if (unlocked) return children;
  return <dialog ref={dialog} className="preview-gate mg-preview-access__overlay"
    aria-labelledby="preview-access-title" aria-describedby="preview-access-body"
    onCancel={event => event.preventDefault()}>
    <section className="mg-preview-access__modal">
      <p className="mg-preview-access__eyebrow">UNDRR &amp; PreventionWeb · preview</p>
      <h1 className="mg-preview-access__title" id="preview-access-title">Enter the preview PIN</h1>
      <p className="mg-preview-access__body" id="preview-access-body">PDF Signal Check is a preview version for testing. It is not ready for general distribution. Enter the access PIN provided by the project team to continue.</p>
      <form className="mg-preview-access__form" noValidate onSubmit={event => {
        event.preventDefault();
        if (access.unlock(input.current.value)) { setUnlocked(true); setEntered(true); }
        else { setError('Incorrect PIN. Try again.'); input.current.focus(); input.current.select(); }
      }}>
        <label className="mg-preview-access__label" htmlFor="preview-access-pin">Access PIN</label>
        <div className="mg-preview-access__field">
          <input ref={input} className="mg-preview-access__input" id="preview-access-pin" type="text" inputMode="numeric"
            autoComplete="off" autoCapitalize="off" spellCheck={false} aria-invalid={Boolean(error)} aria-describedby="preview-access-error"
            onChange={() => { if (error) setError(''); }} />
          <button className="mg-preview-access__submit" type="submit">Open preview</button>
        </div>
        <p className="mg-preview-access__error" id="preview-access-error" role="alert">{error}</p>
      </form>
      <p className="mg-preview-access__contact">To get the PIN, contact the person who shared this preview with you. After you enter it, this browser stays unlocked for {PREVIEW_MAX_AGE_DAYS} days.</p>
    </section>
  </dialog>;
}
