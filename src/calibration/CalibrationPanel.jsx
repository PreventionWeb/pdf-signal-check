import { formatProgress } from '../ui/progress.js';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button, Details, ProgressBar } from "../ui/react.jsx";
import { getSemanticModel } from "../engine/models.js";
import { TIMING_GUIDES, observedDuration, exactDuration } from './timing-guide.js';
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
        <p className="model-note">Getting the model ready includes any downloads and cache effects, so it can vary.</p>
        <p className="model-note">{(receipt.model?.label || model.label).replaceAll(' · ', ', ')}, {state.saved ? `Saved ${new Date(state.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : "Not saved on this browser"}. Measured sample text speed only; image speed, full-PDF time, accuracy and memory capacity are not measured.</p>
      </>}
      <p className="model-note">Download if needed: {((model.graphBytes + model.tokenizerBytes) / 1e6).toFixed(2)} MB model/tokenizer assets, plus runtime (~26.86 MB uncompressed WASM and JavaScript).</p>
      {showStartAction && <div className="flow-actions"><Button disabled={disabled} onClick={() => controller.start(model.key)}>
        {receipt ? "Check again" : "Download files and test speed"}
      </Button></div>}
      {state.message && state.message !== "Device check complete." && <p role="status">{state.message}</p>}
      <Details summary="Speed test details" className="benchmark-details">
        <div className="benchmark-fine-print">
        {receipt && <>
          <h3>Measured in this test</h3>
          <dl className="benchmark-exact-timings">
            {timings.map(([kind, ms]) => <div key={kind}>
              <dt>{TIMING_GUIDES[kind].label}{kind === 'comparison' ? ' (median per sample run)' : ''}</dt>
              <dd>{exactDuration(ms)}</dd>
            </div>)}
          </dl>
          <p>Measured model: {(receipt.model?.label || 'Not recorded').replaceAll(' · ', ', ')}. Model startup: {receipt.load?.state || 'not recorded'}; asset network/cache source: {receipt.load?.assetSource || 'not recorded'}.</p>
          <p>Three warm sample runs, four fixed text inputs per run; {receipt.workload?.tokenCap ?? 'unknown'}-token cap. Run range: {exactDuration(receipt.warm?.minimumMs)} to {exactDuration(receipt.warm?.maximumMs)}. Sample PDF: {receipt.fixture?.pages ?? 'unknown'} pages.</p>
          <p>{receipt.note}</p>
          {(receipt.conditions?.startedHidden ||
            receipt.conditions?.visibilityChanges ||
            receipt.conditions?.possibleSleepOrSchedulingGap) && (
            <p>
              Timing conditions changed or a scheduling gap was observed. This
              may affect measurements; rerun in a visible, active tab. Sleep
              itself cannot be confirmed.
            </p>
          )}
          <p><a href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(receipt, null, 2))}`} download="synthetic-device-timing.json">Download device timing receipt</a></p>
        </>}
        <h3>Our responsiveness guide</h3>
        <p>Preparing the sample PDF: up to 2 seconds. Getting the AI model ready: up to 30 seconds. Comparing the sample text: Fast up to 1.5 seconds per run, OK up to 5 seconds, Slow above 5 seconds. The overall result uses the recorded comparison time rather than model startup or rounded durations.</p>
        <p>These are product responsiveness targets, not validated device requirements or hardware certification. They do not predict full-PDF time, image speed, accuracy or RAM capacity. {receipt && <>Exact measurements above and the receipt retain the recorded precision.</>}</p>
        <p>The test reads a fictional two-page PDF, prepares the model and times three runs of four fixed text inputs. The comparison time is the median per run, not the total for all three. The test has a five-minute limit and cannot run alongside PDF screening.</p>
        <p>Startup includes any downloads and cache effects and can vary. Running or checking again permits the downloads listed above. Saved results expire after 30 days or when browser/model settings change.</p>
        </div>
      </Details>
    </section>
  );
});
