import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Notice } from "./react.jsx";

/**
 * Mangrove Snackbar (toast): the theme's fixed `mg-snackbar-wrapper` around a published Notice, as documented for the
 * pinned theme. Rendered into the body so transformed ancestors cannot break its fixed position. Progress stays open;
 * a finished message closes after `autoHideMs`; errors stay until dismissed.
 */
export function Toast({ message, variant = "info", busy = false, autoHideMs = 6000 }) {
  const [dismissed, setDismissed] = useState(null);
  const [expired, setExpired] = useState(null);
  const sticky = busy || variant === "negative";
  useEffect(() => {
    if (!message || sticky) return undefined;
    const timer = setTimeout(() => setExpired(message), autoHideMs);
    return () => clearTimeout(timer);
  }, [message, sticky, autoHideMs]);
  const open = Boolean(message) && dismissed !== message && expired !== message;
  if (typeof document === "undefined") return null;
  return createPortal(<div className={`mg-snackbar-wrapper ${open ? "mg-snackbar-wrapper__open" : ""}`} aria-hidden={open ? undefined : "true"}>
    {message && <Notice className="mg-snackbar" variant={variant} role={variant === "negative" ? "alert" : "status"}
      onDismiss={busy ? undefined : () => setDismissed(message)} dismissLabel="Close message">
      <p className="mg-snackbar__message">{message}</p>
    </Notice>}
  </div>, document.body);
}
