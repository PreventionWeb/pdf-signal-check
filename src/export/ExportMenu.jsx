import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "../ui/react.jsx";
import { ExportController } from "./controller.js";

export const ExportMenu = forwardRef(function ExportMenu(
  { getState, sourceKey, disabled = false, secondary = false, compact = false },
  ref,
) {
  const latest = useRef({ getState, sourceKey });
  latest.current = { getState, sourceKey };
  const [controller] = useState(
    () =>
      new ExportController(() => ({
        ...latest.current.getState(),
        sourceKey: latest.current.sourceKey,
      })),
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  useEffect(() => () => controller.cancel(), [controller]);
  useEffect(() => {
    controller.cancel("The selected PDF changed. Any active export was cancelled.");
  }, [controller, sourceKey]);
  useImperativeHandle(
    ref,
    () => ({
      cancel: (message) => controller.cancel(message),
      run: (kind) => controller.run(kind),
    }),
    [controller],
  );
  return (
    <section className="review-export-menu" aria-label="Download this report">
      <div className="flow-actions mg-u-flex mg-u-flex-wrap mg-u-align-items-center mg-u-gap-100">
        <Button variant="primary" disabled={disabled || state.busy} onClick={() => controller.run('pdf')}>Download fix list (PDF)</Button>
        <Button variant="secondary" disabled={disabled || state.busy} onClick={() => controller.run('pdf-full')}>Download full report (PDF)</Button>
        {state.busy && <Button onClick={() => controller.cancel()}>Cancel export</Button>}
      </div>
      <p className="model-note">Send the fix list to whoever edits the original document, then check the updated PDF. The full report adds the technical evidence. This tool does not change your PDF.</p>
      <p className="review-export-json"><button type="button" className="review-export-link" disabled={disabled || state.busy} onClick={() => controller.run('json')}>Download detailed report (JSON)</button></p>
      <p className="model-note">Download the results to keep them after closing this tab.{!compact && ' Reports may contain document text and page images; downloads are generated on your device.'}</p>
        <p role="status">{state.message}</p>
    </section>
  );
});
