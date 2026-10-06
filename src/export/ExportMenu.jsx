import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button, Details } from "../ui/react.jsx";
import { PRODUCT_NAME } from "../brand.js";
import { ExportController } from "./controller.js";

export const ExportMenu = forwardRef(function ExportMenu(
  { getState, sourceKey, disabled = false },
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
    <Details summary="Keep this report" className="review-export-menu">
      <section className="export-actions">
        <h3>Keep a captured report</h3>
        <p>
          Reports can include your document’s file name, metadata, text
          excerpts, and page images. Downloads are generated on this device;
          share only with intended recipients.
        </p>
        <div className="flow-actions mg-u-flex mg-u-flex-wrap mg-u-gap-100">
          {[
            ["pdf", `Download ${PRODUCT_NAME} report (PDF)`],
            ["png", "Download summary image (PNG)"],
            ["json", "Download detailed report (JSON)"],
          ].map(([kind, label]) => (
            <Button
              key={kind}
              disabled={disabled || state.busy}
              onClick={() => controller.run(kind)}
            >
              {label}
            </Button>
          ))}
          {state.busy && (
            <Button onClick={() => controller.cancel()}>Cancel export</Button>
          )}
        </div>
        <p role="status">{state.message}</p>
      </section>
    </Details>
  );
});
