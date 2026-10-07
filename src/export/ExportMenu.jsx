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
    controller.cancel("Source changed; any active export was canceled.");
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
        <Button variant={secondary ? "secondary" : "primary"} disabled={disabled || state.busy} onClick={() => controller.run('pdf')}>Download fix list (PDF)</Button>
        <Button disabled={disabled || state.busy} onClick={() => controller.run('json')}>Download detailed report (JSON)</Button>
        {state.busy && <Button onClick={() => controller.cancel()}>Cancel export</Button>}
      </div>
      <p className="model-note">{compact ? 'Download to keep these results. Reports may include PDF text and images; generated on your device.' : 'This PDF and its results last only for this browser session. Download a report to keep them. Reports may contain document text and page images; downloads are generated on your device.'}</p>
        <p role="status">{state.message}</p>
    </section>
  );
});
