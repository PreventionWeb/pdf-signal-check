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
import { timingGuide } from './timing-guide.js';
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
  const resultTitle = {
    great: 'Your device: great for local AI',
    ok: 'Your device: OK for local AI',
    slow: 'Your device: not recommended for local AI',
    unrated: 'Your device: check again',
  }[rating.key];
  const timings = receipt ? [
    timingGuide('preparation', receipt.fixture.parseMs),
    timingGuide('startup', receipt.load.loadAndInitMs),
    timingGuide('comparison', receipt.warm.medianMs),
  ].filter(Boolean) : [];
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
      <p>{receipt ? rating.description : "Run a short sample test to see how quickly this model works on your device. Your PDFs are not used."}</p>
      {receipt && <div className="benchmark-timings" aria-label="Measured benchmark times">
        <p className="model-note">Elapsed time, shorter is faster. Each step has its own guide.</p>
        {timings.map(item => <div className="benchmark-timing" key={item.label}>
          <div className="benchmark-timing-label"><span>{item.label}</span><span>{(item.ms / 1000).toFixed(2)} s, {item.rating}</span></div>
          <div className="benchmark-timing-track" aria-hidden="true"><span className={`benchmark-timing-fill ${item.rating === 'Slow' ? 'is-slow' : 'is-great'}`} style={{ width: `${item.percent}%` }} /></div>
          <div className="benchmark-timing-scale"><span>0 s</span><span>OK up to {item.targetMs / 1000} s</span></div>
        </div>)}
      </div>}
      {receipt && <p className="model-note">{model.label.replaceAll(' · ', ', ')}, {state.saved ? `Saved ${new Date(state.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : "Not saved on this browser"}. Measured text speed only; image-model speed, full-PDF time, accuracy and memory capacity are not measured.</p>}
      <p className="model-note">Download if needed: {((model.graphBytes + model.tokenizerBytes) / 1e6).toFixed(2)} MB model/tokenizer assets, plus runtime (~26.86 MB uncompressed WASM and JavaScript).</p>
      {showStartAction && <div className="flow-actions"><Button disabled={disabled} onClick={() => controller.start(model.key)}>
        {receipt ? "Check again" : "Download files and test speed"}
      </Button></div>}
      {state.message && state.message !== "Device check complete." && <p role="status">{state.message}</p>}
      <Details summary="Speed test details" className="benchmark-details">
        <div className="benchmark-fine-print">
        <p className="model-note">Each bar shows elapsed time against its own responsiveness guide: 2 seconds for preparing the sample PDF, 30 seconds for model startup and 5 seconds for text comparisons. Bars stop at the guide; longer times are still shown exactly. Text comparisons up to 1.5 seconds are Fast. Startup includes any downloads and cache effects. These guides are product targets, not validated device requirements.</p>

        <p>The test reads a fictional two-page PDF, prepares the model and times three runs of four fixed text inputs. The test has a five-minute limit and cannot run alongside PDF screening.</p>
        <p>Asset transfer/cache cost varies. Running or checking again permits the downloads listed above.</p>
        {receipt && <>
          <p>Measured model: {receipt.model.label.replaceAll(' · ', ', ')}.</p>
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
          <p><a href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(receipt, null, 2))}`} download="synthetic-device-timing.json">Download device timing receipt</a></p>
          <p className="model-note">Rating guide: Great ≤ 1.5 seconds; OK ≤ 5 seconds; Not recommended above 5 seconds, for four fixed inputs. These are product responsiveness bands, not validated device requirements. Saved results expire after 30 days or when browser/model settings change.</p>
        </>}
        </div>
      </Details>
    </section>
  );
});
