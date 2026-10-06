import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button, Details } from "../ui/react.jsx";
import { getSemanticModel } from "../engine/models.js";
import { downloadJson } from "../export/download.js";
import { rateDevice } from "./preferences.js";
import { CalibrationController } from "./controller.js";

export const CalibrationPanel = forwardRef(function CalibrationPanel(
  {
    modelId = "minilm",
    onResult = () => {},
    showStartAction = true,
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
    ),
    model = getSemanticModel(modelId || "minilm");
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
  const timings = receipt ? [
    { label: "PDF preparation", ms: receipt.fixture.parseMs },
    { label: "AI model startup", ms: receipt.load.loadAndInitMs },
    { label: "AI comparison speed", ms: receipt.warm.medianMs, rating },
  ].filter(item => Number.isFinite(item.ms) && item.ms >= 0) : [];
  const timingScale = 5000;
  const progress = state.progress;
  const determinate = progress?.total > 0 && Number.isFinite(progress.completed);
  const progressLabel = progress?.stage === "benchmark" ? "Speed checks completed"
    : progress?.stage === "asset-download" ? "Current model asset download" : "Device benchmark progress";
  const phase = progress?.stage === "benchmark" ? `Running speed check ${Math.min(progress.completed + 1, 3)} of 3…`
    : progress?.stage === "asset-download" ? "Downloading model assets…"
    : progress?.stage === "fixture" ? "Preparing the sample PDF…"
    : progress?.stage === "model-init" ? "Preparing the AI model…" : "Warming up the benchmark…";
  const downloadCost = `${(model.graphBytes / 1e6).toFixed(2)} MB model + ${(model.tokenizerBytes / 1e6).toFixed(2)} MB tokenizer, plus runtime (~26.86 MB uncompressed).`;
  if (state.busy) return (
    <section className="calibration-panel" aria-busy="true">
      <h2 className="mg-card__title">Benchmarking your device</h2>
      <p>Testing {model.label} with sample text. Keep this tab open and visible.</p>
      <p role="status">{phase}</p>
      <progress aria-label={progressLabel} max={determinate ? progress.total : undefined} value={determinate ? progress.completed : undefined} />
      <div className="flow-actions"><Button onClick={() => controller.cancel()}>Cancel benchmark</Button></div>
    </section>
  );
  return (
    <section className="calibration-panel">
      <h2 className="mg-card__title">{receipt ? rating.label : "Benchmark your device"}</h2>
      <p>{receipt ? rating.description : "Run a short sample test to see how quickly this model works on your device. Your PDFs are not used."}</p>
      {receipt && <div className="benchmark-timings" aria-label="Measured benchmark times">
        <p className="model-note">Relative speed · longer bars are faster</p>
        {timings.map(item => <div className="benchmark-timing" key={item.label}>
          <div className="benchmark-timing-label"><span>{item.label}</span><span>{(item.ms / 1000).toFixed(2)} s{item.rating ? ` · ${item.rating.key === 'great' ? 'Great' : item.rating.key === 'ok' ? 'OK' : item.rating.key === 'slow' ? 'Not recommended' : 'Unrated'}` : ''}</span></div>
          <div className="benchmark-timing-track" aria-hidden="true"><span className={`benchmark-timing-fill ${item.rating ? `is-${item.rating.key}` : ''}`} style={{ width: `${100 * Math.max(0, 1 - item.ms / timingScale)}%` }} /></div>
        </div>)}
        <p className="model-note">Bars use a 0–5 second scale: full at 0 seconds, empty at 5 seconds or more. AI speed is the median of three sample runs. Great: ≤ 1.5 s · OK: ≤ 5 s · Not recommended: &gt; 5 s. Startup varies with downloads and cache.</p>
      </div>}
      {receipt && <p className="model-note">{model.label} · {state.saved ? `Saved ${new Date(state.savedAt).toLocaleDateString()}` : "Not saved on this browser"}. Speed guidance, not an accuracy or memory rating.</p>}
      <p className="model-note">Download if needed: {((model.graphBytes + model.tokenizerBytes) / 1e6).toFixed(2)} MB model/tokenizer assets, plus runtime (~26.86 MB uncompressed WASM and JavaScript).</p>
      {showStartAction && <div className="flow-actions"><Button disabled={disabled} onClick={() => controller.start(model.key)}>
        {receipt ? "Check again" : "Download assets and benchmark"}
      </Button></div>}
      {state.message && state.message !== "Device check complete." && <p role="status">{state.message}</p>}
      <Details summary={receipt ? "Technical benchmark details" : "About this benchmark"}>
        <p>We parse a synthetic two-page PDF, warm up the model, and time three runs of four fixed text inputs. The test has a five-minute limit and cannot run alongside PDF screening.</p>
        <p>Downloads if needed: {downloadCost} Asset transfer/cache cost varies. Running or checking again permits these downloads.</p>
        {receipt && <>
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
          <p className="model-note">Rating guide: Great ≤ 1.5 seconds; OK ≤ 5 seconds; Not recommended above 5 seconds, for four fixed inputs. These are product responsiveness bands, not validated device requirements. Saved results expire after 30 days or when browser/model settings change.</p>
        </>}
      </Details>
    </section>
  );
});
