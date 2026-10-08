import React, { useEffect, useRef, useState } from 'react';
import { previewAccess } from './preview-access.js';
import './preview-gate.css';

/** Published Mangrove PreviewAccess markup, with React and a native dialog owning its lifetime. */
export function PreviewGate({ children, access: suppliedAccess }) {
  const [access] = useState(() => suppliedAccess || previewAccess());
  const [unlocked, setUnlocked] = useState(() => access.isUnlocked());
  const [error, setError] = useState('');
  const dialog = useRef(null), input = useRef(null);
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
      <p className="mg-preview-access__eyebrow">UNDRR &amp; PreventionWeb · Preview</p>
      <h1 className="mg-preview-access__title" id="preview-access-title">Preview access required</h1>
      <p className="mg-preview-access__body" id="preview-access-body">PDF Signal Check is in preview and is not yet ready for general distribution. Enter the access PIN provided by the project team to continue.</p>
      <form className="mg-preview-access__form" noValidate onSubmit={event => {
        event.preventDefault();
        if (access.unlock(input.current.value)) setUnlocked(true);
        else { setError('That PIN is not correct. Please try again.'); input.current.focus(); input.current.select(); }
      }}>
        <label className="mg-preview-access__label" htmlFor="preview-access-pin">Access PIN</label>
        <div className="mg-preview-access__field">
          <input ref={input} className="mg-preview-access__input" id="preview-access-pin" type="text" inputMode="numeric"
            autoComplete="off" autoCapitalize="off" spellCheck={false} aria-invalid={Boolean(error)} aria-describedby="preview-access-error"
            onChange={() => { if (error) setError(''); }} />
          <button className="mg-preview-access__submit" type="submit">Unlock</button>
        </div>
        <p className="mg-preview-access__error" id="preview-access-error" role="alert">{error}</p>
      </form>
      <p className="mg-preview-access__contact">Need the PIN? Contact the person who shared this preview with you.</p>
    </section>
  </dialog>;
}
