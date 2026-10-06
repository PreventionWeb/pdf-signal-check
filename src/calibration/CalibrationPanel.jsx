import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "../ui/react.jsx";
import { getSemanticModel } from "../engine/models.js";
import { downloadJson } from "../export/download.js";
import { CalibrationController } from "./controller.js";

export const CalibrationPanel = forwardRef(function CalibrationPanel(
  {
    modelId = "minilm",
    disabled = false,
    onBusy = () => {},
    canRun = () => true,
    timeoutMs,
  },
  ref,
) {
  const callbacks = useRef({ onBusy, canRun });
  callbacks.current = { onBusy, canRun };
  const [controller] = useState(
    () =>
      new CalibrationController({
        onBusy: (value) => callbacks.current.onBusy(value),
        canRun: () => callbacks.current.canRun(),
        ...(timeoutMs ? { timeoutMs } : {}),
      }),
  );
  const state = useSyncExternalStore(
      controller.subscribe,
      controller.getSnapshot,
    ),
    model = getSemanticModel(modelId || "minilm");
  useEffect(() => () => controller.dispose(), [controller]);
  useEffect(() => {
    controller.cancel();
  }, [controller, modelId]);
  useImperativeHandle(
    ref,
    () => ({
      cancel: () => controller.cancel(),
      get receipt() {
        return controller.receipt;
      },
    }),
    [controller],
  );
  const receipt = state.receipt;
  return (
    <section className="calibration-panel">
      <h3>Optional: test this browser</h3>
      <p>
        {model.label}: up to {(model.graphBytes / 1e6).toFixed(2)} MB model +{" "}
        {(model.tokenizerBytes / 1e6).toFixed(2)} MB tokenizer, plus runtime
        (~26.86 MB uncompressed). Asset transfer/cache cost varies. Running
        explicitly permits these downloads.
      </p>
      <p>
        This uses a tiny public synthetic PDF and fixed text, never your
        uploaded document. Timing is not a device requirement or document ETA.
        Its separate encoder is released after completion; screening cannot run
        simultaneously. This optional attempt has a five-minute time limit.
      </p>
      <div className="flow-actions mg-u-flex mg-u-flex-wrap mg-u-gap-100">
        <Button
          disabled={disabled || state.busy}
          onClick={() => controller.start(model.key)}
        >
          Test selected model locally
        </Button>
        {state.busy && (
          <Button onClick={() => controller.cancel()}>
            Cancel device test
          </Button>
        )}
      </div>
      <p role="status">{state.message}</p>
      {receipt && (
        <div className="calibration-result">
          <h4>Measured: {receipt.model.label}</h4>
          <p>
            Synthetic {receipt.fixture.pages}-page parse:{" "}
            {Math.round(receipt.fixture.parseMs)} ms. Encoder load and
            initialization: {Math.round(receipt.load.loadAndInitMs)} ms (
            {receipt.load.state}; asset network/cache source{" "}
            {receipt.load.assetSource}).
          </p>
          <p>
            Three warm sample runs: median {Math.round(receipt.warm.medianMs)}{" "}
            ms; range {Math.round(receipt.warm.minimumMs)}–
            {Math.round(receipt.warm.maximumMs)} ms. Four fixed text inputs per
            run; {receipt.workload.tokenCap}-token cap.
          </p>
          <p>{receipt.note}</p>
          {(receipt.conditions.startedHidden ||
            receipt.conditions.visibilityChanges ||
            receipt.conditions.possibleSleepOrSchedulingGap) && (
            <p>
              Timing conditions changed or a scheduling gap was observed. This
              may affect measurements; rerun in a visible, active tab. Sleep
              itself cannot be confirmed.
            </p>
          )}
          <Button
            onClick={() =>
              downloadJson(receipt, "synthetic-device-timing.json")
            }
          >
            Download device timing receipt
          </Button>
        </div>
      )}
    </section>
  );
});
