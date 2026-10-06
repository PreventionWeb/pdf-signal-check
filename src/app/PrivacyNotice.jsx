import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button, Checkbox } from "../ui/react.jsx";
const KEY = "pdf-input-check.hide-ai-notice.v1";
/** Only notice preference is persistent. Native dialog owns the focus trap/top layer. */
export function PrivacyNotice({ openerRef, onStorageFailure = () => {}, ref }) {
  const read = () => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  };
  const [open, setOpen] = useState(false),
    [suppressed, setSuppressed] = useState(read),
    dialog = useRef(null),
    understand = useRef(null),
    returnFocus = useRef(null);
  useImperativeHandle(
    ref,
    () => ({
      open(opener) {
        returnFocus.current = opener || document.activeElement;
        setSuppressed(read());
        setOpen(true);
      },
    }),
    [],
  );
  useEffect(() => {
    if (open && !dialog.current.open) {
      if (!returnFocus.current) returnFocus.current = document.activeElement;
      dialog.current.showModal();
      understand.current?.focus({ preventScroll: true });
    } else if (!open && dialog.current.open) dialog.current.close();
    return () => {
      if (dialog.current?.open) dialog.current.close();
    };
  }, [open]);
  const close = () => {
    try {
      suppressed
        ? localStorage.setItem(KEY, "1")
        : localStorage.removeItem(KEY);
    } catch {
      onStorageFailure(
        "Notice preference could not be saved. You can continue; this notice may appear again.",
      );
    }
    setOpen(false);
    dialog.current.close();
    const target =
      returnFocus.current?.isConnected && returnFocus.current !== document.body
        ? returnFocus.current
        : openerRef.current;
    target?.focus({ preventScroll: true });
  };
  return (
    <dialog
      ref={dialog}
      id="ai-info-dialog"
      closedby="none"
      aria-labelledby="ai-info-title"
      aria-describedby="ai-info-description"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      }}
    >
      <div className="ai-info-content">
        <p className="eyebrow">Before you begin</p>
        <h2 id="ai-info-title">About AI and your PDF</h2>
        <div id="ai-info-description">
          <p>
            This tool checks PDFs in your browser. Your PDF contents stay on
            this device and are not uploaded for analysis.
          </p>
          <p>
            Optional AI screening also runs locally. It downloads model and
            tokenizer assets from external hosts; those requests do not include
            your PDF text. The app and runtime assets load from the site hosting
            this tool.
          </p>
          <p>
            AI can make mistakes. This tool was built with AI assistance, and
            its rules and models can miss issues or flag legitimate content.
            Review the evidence before relying on a result.
          </p>
        </div>
        <Checkbox
          id="ai-info-suppress"
          label="Don’t show again"
          checked={suppressed}
          onChange={(e) => setSuppressed(e.target.checked)}
        />
        <p id="ai-info-preference-note" className="model-note">
          Only this notice preference is saved in your browser; no PDF data are
          saved with it. You can reopen this information using “About AI &amp;
          privacy.”
        </p>
        <Button
          variant="primary"
          id="ai-info-understand"
          ref={understand}
          onClick={close}
        >
          I understand
        </Button>
      </div>
    </dialog>
  );
}
