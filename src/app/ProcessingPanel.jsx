import React from "react";
import { Button, ProgressBar } from "../ui/react.jsx";
import { ScanVisual } from "../ui/ScanVisual.jsx";
import { formatBytes } from "../ui/progress.js";

/**
 * One waiting screen for the whole check: every step listed (done, running, waiting or skipped, with why), one picture of
 * the running step and one progress bar. Shown while the PDF is read and while the optional AI steps run, so the reader
 * sees the same layout from start to finish instead of a different panel per stage.
 */
const count = (done, total, unit) => `${done} of ${total} ${unit}`;

/** Which step is running, and what part of it, from the controller's stage and the latest progress message. */
export function processingPhase(state) {
  const progress = state.progress;
  if (state.stage === "processing-analysis") return { step: "read", part: progress?.unit === "pages" ? "pages" : "open" };
  // The image step loads a second, smaller model to compare descriptions after looking at images: that is still "looking".
  if (state.modelTask === "image" && progress?.substage === "descriptions") return { step: "image", part: "run", descriptions: true };
  // A file that has finished downloading is waiting for the model to start: say that, not "89.1 MB of 89.1 MB".
  const downloaded = progress?.stage === "asset-download" && progress.total > 0 && progress.completed >= progress.total;
  const part = progress?.stage === "asset-download" && !downloaded ? "download" : progress?.stage === "inference" ? "run" : "prepare";
  return { step: state.modelTask === "image" ? "image" : "text", part };
}

/** The steps in order with their state: done, current, waiting or skipped (with a reason). */
export function processingSteps(state) {
  const { step, part } = processingPhase(state);
  const progress = state.progress || {};
  // While the PDF is read the selected model is cleared until analysis ends, so fall back to the saved choice.
  const textOn = Boolean(state.aiEnabled && (state.selectedModel || state.evaluationModel)), imageOn = Boolean(state.imageAI);
  const order = ["read", "text-model", "text", "image-model", "image"];
  const at = step === "read" ? 0 : step === "text" ? (part === "run" ? 2 : 1) : (part === "run" ? 4 : 3);
  const pages = state.report?.pages?.length;
  // Small configuration files download in a blink; only name sizes worth waiting for.
  const download = part === "download" && Number.isFinite(progress.completed) && progress.total >= 1e6
    ? `${formatBytes(progress.completed)}${progress.total > 0 ? ` of ${formatBytes(progress.total)}` : ""}` : null;
  const detail = {
    read: step === "read" ? (part === "pages" ? `Page ${Math.min(progress.completed + 1, progress.total)} of ${progress.total}` : "Opening the file…") : pages ? `${pages} page${pages === 1 ? "" : "s"}` : null,
    "text-model": step === "text" && part !== "run" ? download || (part === "download" ? "Downloading…" : "Starting on this device…") : null,
    text: step === "text" && part === "run" ? (Number.isFinite(progress.totalTexts) ? count(progress.completedTexts ?? 0, progress.totalTexts, "passages") : count(progress.completed, progress.total, "steps")) : null,
    "image-model": step === "image" && part !== "run" ? download || (part === "download" ? "Downloading…" : "Cutting out images and starting the model…") : null,
    image: step === "image" && part === "run" ? (processingPhase(state).descriptions ? "Comparing descriptions with pictures…" : count(progress.completed, progress.total, "images")) : null,
  };
  const labels = { read: "Read the PDF", "text-model": "Get the AI text model ready", text: "Compare text with AI", "image-model": "Get the image model ready", image: "Look at images with AI" };
  return order.map((id, index) => {
    const off = (id.startsWith("text") && !textOn) || (id.startsWith("image") && !imageOn);
    // The text comparison can end without running (language not covered, nothing to compare): say so, not "done".
    const didntRun = id.startsWith("text") && step === "image" && textOn && state.report?.semantic?.inferencePerformed !== true;
    const status = off || didntRun ? "skipped" : index < at ? "done" : index === at ? "current" : "waiting";
    return { id, label: labels[id], status, detail: off ? "Skipped: turned off in setup" : didntRun ? "Didn’t run for this PDF" : status === "done" && id !== "read" ? null : detail[id] };
  });
}

const MARK = { done: "✓", current: "", waiting: "", skipped: "–" };
const SPOKEN = { done: "done", current: "in progress", waiting: "waiting", skipped: "skipped" };

export function ProcessingPanel({ state, controller }) {
  const { step, part } = processingPhase(state);
  const steps = processingSteps(state), current = steps.find(item => item.status === "current");
  const progress = state.progress || {};
  const { descriptions } = processingPhase(state);
  const determinate = progress.total > 0 && Number.isFinite(progress.completed) && part !== "prepare" && part !== "open" && !descriptions && !(part === "download" && progress.total < 1e6);
  const visual = step === "read" ? <ScanVisual kind="pages" completed={part === "pages" ? progress.completed : 0} total={part === "pages" ? progress.total : 0} />
    : part === "run" && !descriptions ? (step === "image" ? <ScanVisual kind="images" completed={progress.completed} total={progress.total} previews={state.imagePreviews} />
      : <ScanVisual kind="text" completed={progress.completed} total={progress.total} />)
    : <ScanVisual kind="model" fraction={part === "download" && progress.total > 0 ? progress.completed / progress.total : null} />;
  return <section className="processing" aria-label="Progress">
    <ol className="processing-steps">
      {steps.map(item => <li key={item.id} className={`processing-step is-${item.status}`} aria-current={item.status === "current" ? "step" : undefined}>
        <span className="processing-step-mark" aria-hidden="true">{MARK[item.status]}</span>
        <span className="processing-step-label">{item.label}<span className="mg-u-sr-only">: {SPOKEN[item.status]}</span></span>
        {item.detail && <span className="processing-step-detail">{item.detail}</span>}
      </li>)}
    </ol>
    {visual}
    {determinate && <ProgressBar label={current?.label || "Progress"} hideLabel max={progress.total} value={progress.completed} valueText={current?.detail || undefined} />}
    {/* Announce step changes only, not every page or passage. */}
    <p className="mg-u-sr-only" role="status">{current ? `${current.label}.` : ""}</p>
    <div className="processing-actions">
      {step === "read"
        ? <Button id="flow-cancel" onClick={() => controller.cancelAnalysis()}>Cancel and go back</Button>
        : <><Button onClick={() => controller.cancelScreening()}>Cancel AI checks</Button>
          <p className="model-note">Cancelling keeps the standard results and any earlier AI results.</p></>}
    </div>
  </section>;
}
