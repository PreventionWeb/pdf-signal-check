import { formatProgress } from '../ui/progress.js';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button, ProgressBar } from "../ui/react.jsx";
import { getSemanticModel } from "../engine/models.js";
import { TIMING_GUIDES, observedDuration } from './timing-guide.js';
import { rateDevice } from "./preferences.js";
import { CalibrationController } from "./controller.js";

export const CalibrationPanel = forwardRef(function CalibrationPanel(
  {
    modelId = "granite-r2",
    onResult = () => {},
    showStartAction = true,
    showHeading = true,
    disabled = false,
    onBusy = () => {},
    canRun = () => true,
    timeoutMs,
  },
  ref,
) {
  const callbacks = useRef({ onBusy, canRun, onResult });
  callbacks.current = { onBusy, canRun, onResult };
  const [controller] = useState(
    () =>
      new CalibrationController({
        modelId,
        onBusy: (value) => callbacks.current.onBusy(value),
        canRun: () => callbacks.current.canRun(),
        ...(timeoutMs ? { timeoutMs } : {}),
      }),
  );
  const state = useSyncExternalStore(
      controller.subscribe,
      controller.getSnapshot,
      controller.getSnapshot,
    ),
    model = getSemanticModel(modelId || "granite-r2");
  useEffect(() => () => controller.dispose(), [controller]);
  useEffect(() => {
    controller.selectModel(modelId);
  }, [controller, modelId]);
  useEffect(() => { callbacks.current.onResult(state.receipt); }, [state.receipt]);
  useImperativeHandle(
    ref,
    () => ({
      cancel: () => controller.cancel(),
      start: () => controller.start(model.key),
      get receipt() {
        return controller.receipt;
      },
    }),
    [controller, model.key],
  );
  const receipt = state.receipt, rating = rateDevice(receipt);
  const resultTitle = `Sample text speed: ${{ great: 'Fast', ok: 'OK', slow: 'Slow', unrated: 'Check again' }[rating.key]}`;
  const resultDescription = {
    great: 'The sample text comparisons ran quickly.',
    ok: 'The sample text comparisons ran at a usable pace.',
    slow: 'The sample text comparisons were slow. You can continue with standard checks or try another device.',
    unrated: 'A usable speed result is not available. Keep this tab visible and active, then check again.',
  }[rating.key];
  const timings = receipt ? [
    ['preparation', receipt.fixture?.parseMs],
    ['startup', receipt.load?.loadAndInitMs],
    ['comparison', receipt.warm?.medianMs],
  ] : [];
  const progress = state.progress;
  const determinate = progress?.total > 0 && Number.isFinite(progress.completed);
  const progressLabel = progress?.stage === "benchmark" ? "Speed checks completed"
    : progress?.stage === "asset-download" ? "Current model asset download" : "Device benchmark progress";
  const phase = progress?.stage === "benchmark" ? `Running speed check ${Math.min(progress.completed + 1, 3)} of 3…`
    : progress?.stage === "asset-download" ? "Downloading model assets…"
    : progress?.stage === "fixture" ? "Preparing the sample PDF…"
    : progress?.stage === "model-init" ? "Preparing the AI model…" : "Warming up the benchmark…";
  if (state.busy) return (
    <section className="calibration-panel" aria-busy="true">
      {showHeading && <h2 className="mg-card__title">Testing speed on your device</h2>}
      <p>Testing {model.label.replaceAll(' · ', ', ')} with sample text. Keep this tab open and visible.</p>
      <p role="status">{phase}</p>
      <ProgressBar label={progressLabel} hideLabel max={determinate ? progress.total : undefined} value={determinate ? progress.completed : undefined} valueText={determinate ? formatProgress(progress) : undefined} />
      {progress?.unit === "bytes" && Number.isFinite(progress.completed) && <p className="model-note">{formatProgress(progress)}</p>}
      <div className="flow-actions"><Button onClick={() => controller.cancel()}>Cancel speed test</Button></div>
    </section>
  );
  return (
    <section className="calibration-panel">
      {showHeading ? <h2 className="mg-card__title">{receipt ? resultTitle : "Test speed on your device"}</h2>
        : receipt && <p className="benchmark-result-title">{resultTitle}</p>}
      <p>{receipt ? resultDescription : "Run a short sample test to see how quickly this model works on your device. Your PDFs are not used."}</p>
      {receipt && <>
        <dl className="benchmark-timings" aria-label="Observed sample timings">
          {timings.map(([kind, ms]) => <div className="benchmark-timing" key={kind}>
            <dt>{TIMING_GUIDES[kind].label}</dt>
            <dd>{observedDuration(kind, ms)}</dd>
          </div>)}
        </dl>
      </>}
      {showStartAction && <div className="flow-actions"><Button disabled={disabled} onClick={() => controller.start(model.key)}>
        {receipt ? "Check again" : "Download files and test speed"}
      </Button></div>}
      {state.message && state.message !== "Device check complete." && <p role="status">{state.message}</p>}

    </section>
  );
});
