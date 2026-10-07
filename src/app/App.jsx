import { Capabilities } from './Capabilities.jsx';
import { formatProgress } from '../ui/progress.js';
import React, {
  StrictMode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { PageHeader } from "@undrr/undrr-mangrove/components/PageHeader.js";
import { Footer } from "@undrr/undrr-mangrove/components/Footer.js";
import { Samples } from "./Samples.jsx";
import { createAppController } from "./controller.js";
import { BatchController } from "../batch/controller.js";
import { BatchPanel } from "../batch/BatchPanel.jsx";
import { SetupDialog } from "./SetupDialog.jsx";
import { PrivacyNotice } from "./PrivacyNotice.jsx";
import { Review } from "../review/Review.jsx";
import { AdvancedReport } from "../review/AdvancedReport.jsx";
import { GoGoViewer } from "../evidence/GoGoViewer.jsx";
import {
  PRESENTATION_BRAND,
  PRODUCT_NAME,
} from "../brand.js";
import {
  Button,
  Card,
  Details,
  Actions,
  Loader,
  Icon,
} from "../ui/react.jsx";
export function App() {
  const [controller] = useState(() => createAppController()),
    state = useSyncExternalStore(controller.subscribe, controller.getSnapshot),
    calibrationRef = useRef(null),
    exportRef = useRef(null),
    privacyRef = useRef(null),
    openerRef = useRef(null),
    previousStage = useRef(state.stage);
  const [batch] = useState(
    () =>
      new BatchController({
        onOpen: (report, file, id) =>
          controller.openCompletedReport(report, file, id),
        onOwnership: () => controller.takeOwnership(),
        onClear: () => controller.clearBatch(),
      }),
  );
  const batchState = useSyncExternalStore(batch.subscribe, batch.getSnapshot);
  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    controller.bindServices({
      batch,
      calibration: { cancel: () => calibrationRef.current?.cancel() },
      exports: { cancel: (...args) => exportRef.current?.cancel(...args) },
    });
    controller.mount();
    batch.mount();
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
      controller.dispose();
      batch.dispose();
    };
  }, [controller, batch]);
  useEffect(() => {
    const resultsStages = ["checks", "review", "processing-model"];
    const staysInResults = resultsStages.includes(previousStage.current) && resultsStages.includes(state.stage);
    previousStage.current = state.stage;
    if (state.stage !== "setup" && !staysInResults) {
      const heading = document.getElementById("flow-title");
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [state.stage]);
  const inBatch =
      state.stage === "batch" || (state.stage === "review" && state.batchId),
    steps = inBatch
      ? [
          ["batch", "1 · Batch queue"],
          ["review", "2 · PDF evidence"],
        ]
      : [
          ["document", "1 · Select PDF"],
          ["review", "2 · Results"],
        ];
  const title = {
    setup: "Check a PDF",
    document: "Check a PDF",
    batch: "Review several PDFs",
    checks: "Your PDF results",
    review: "Your PDF results",
    "processing-analysis": "Checking text, tags, and metadata",
    "processing-model": "Your PDF results",
  }[state.stage];
  return (
    <>
      <a className="mg-skip-link" href="#main">
        Skip to content
      </a>
      <PageHeader
        showAccount={false}
        showLanguage={false}
        homeUrl="./"
        logoUrl={new URL(PRESENTATION_BRAND.logo, document.baseURI).href}
        logoAlt={PRESENTATION_BRAND.logoAlt}
        logoTitle={PRESENTATION_BRAND.logoAlt}
        logoWidth={PRESENTATION_BRAND.logoWidth}
        logoHeight={PRESENTATION_BRAND.logoHeight}
        logoCrop={PRESENTATION_BRAND.logoCrop}
      />
      <section
        className="mg-container mg-container--slim mg-container--padded"
        aria-label="PDF Signal Check controls"
      >
        <div className="app-toolbar">
          <a
            className="app-home mg-u-font-size-500"
            href="./"
            aria-label="PDF Signal Check home"
            onClick={(e) => {
              e.preventDefault();
              controller.go("document");
            }}
          >
            {PRODUCT_NAME}
          </a>
        </div>
      </section>
      <PrivacyNotice ref={privacyRef} openerRef={openerRef} />
      {state.stage === "setup" && <SetupDialog controller={controller} state={state} calibrationRef={calibrationRef}
        batchBusy={batch.busy} canCalibrate={() => !batch.busy && !controller.getSnapshot().analysisBusy} />}
      <main id="main" tabIndex={-1} className="mg-container mg-container--slim">
        <nav
          className="flow-steps"
          aria-label={inBatch ? "Batch review" : "Review stages"}
        >
          <ol id="flow-steps">
            {steps.map(([key, label]) => {
              const isCurrent =
                state.stage === key ||
                (state.stage === "setup" && key === "document") ||
                (["checks", "processing-analysis", "processing-model"].includes(state.stage) && key === "review");
              const canNavigate =
                key === "document" ||
                (key === "batch" && !batch.busy) ||
                (key === "checks" && state.report) ||
                (key === "review" && state.report);
              return (
                <li
                  key={key}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {!isCurrent && canNavigate ? (
                    <button
                      type="button"
                      className="flow-step-link"
                      onClick={() => controller.go(key)}
                    >
                      {label}
                    </button>
                  ) : (
                    <span>{label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
          <div
            className="workspace"
            data-stage={state.stage}
          >
            <section
              className="output-column"
              aria-label="Analysis report"
            >
              <div id="guided-flow">
                {title && (
                  <h1 className="flow-title" id="flow-title" tabIndex={-1}>
                    {title}
                  </h1>
                )}
                {state.file && state.stage !== "batch" && state.stage !== "document" && (
                  <p className="flow-file">
                    {state.file.name} · {(state.file.size / 1e6).toFixed(2)} MB
                  </p>
                )}
                {["document", "setup"].includes(state.stage) && (
                  <Entry
                    state={state}
                    controller={controller}
                    batchBusy={batch.busy}
                  />
                )}
              {state.stage === "processing-analysis" && (
                <>
                  <p role="status" id="flow-status">
                    {state.message}
                  </p>
                  {state.progress?.total > 0 &&
                  Number.isFinite(state.progress.completed) ? (
                    <>
                      <progress
                        aria-label="Current processing step"
                        max={state.progress.total}
                        value={state.progress.completed}
                      />
                      <p className="model-note">
                        {formatProgress(state.progress)}
                        {state.progress.asset
                          ? ` · ${state.progress.asset}`
                          : ""}
                      </p>
                    </>
                  ) : (
                    <>
                      <Loader label="Preparing local processing" />
                      <p className="model-note">
                        Preparing or processing locally. No estimated completion
                        time is available.
                      </p>
                    </>
                  )}
                  <Button
                    id="flow-cancel"
                    onClick={() =>
                      state.stage === "processing-analysis"
                        ? controller.cancelAnalysis()
                        : controller.cancelScreening()
                    }
                  >
                    Cancel and go back
                  </Button>
                  <GoGoViewer file={state.file} title="Your PDF while checks run" />
                </>
              )}
              {["checks", "review", "processing-model"].includes(state.stage) && state.report && (
                <Review
                  key={state.sourceKey}
                  state={{ ...state, batchBusy: batch.busy }}
                  controller={controller}
                  exportRef={exportRef}
                  onReturnBatch={() => controller.go("batch")}
                />
              )}
              {state.stage === "batch" && (
                <>
                  <BatchPanel controller={batch} requireAI={state.aiEnabled} />
                  <Button
                    onClick={() => {
                      batch.queue.stopAll();
                      controller.go("document");
                    }}
                  >
                    {batch.busy ? "Stop queue and return to PDF selection" : "Back to PDF selection"}
                  </Button>
                </>
              )}
            </div>
            {state.report && ["checks", "review"].includes(state.stage) && (
              <Details
                id="advanced-evidence"
                summary="Technical analysis record"
              >
                <AdvancedReport report={state.report} />
              </Details>
            )}
            {state.stage === "document" && state.message && (
              <p
                role="status"
                id="status"
                className={state.error ? "error-message" : ""}
              >
                {state.message}
              </p>
            )}
          </section>
        </div>
      </main>
      <Footer enableSyndication={false}>
        <div className="mg-footer-bar">
          <div className="mg-container mg-container--slim">
            <div className="mg-footer-bar__row">
              <p className="mg-footer-bar__text">
                {PRODUCT_NAME} · A project by Ken Hawkins
              </p>
              <p className="mg-footer-bar__text">Processed on your device · Early version / 0.8</p>
              <div className="mg-footer-bar__links">
                <a href="#ai-info-dialog" id="about-ai" ref={openerRef} onClick={e => { e.preventDefault(); privacyRef.current?.open(e.currentTarget); }}>About AI &amp; privacy</a>

                <a
                  href="https://github.com/khawkins98/PDF-A-go-actionable"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Reference: PDF-A-go-actionable ↗
                </a>
                <a
                  href="https://github.com/khawkins98/pdf-a-go-go"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Reference: pdf-a-go-go ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </Footer>
    </>
  );
}
function Entry({ state, controller, batchBusy }) {
  const [dragging, setDragging] = useState(false),
    disabled = state.analysisBusy || batchBusy;
  return (
    <div className="document-intake">
      <p className="step-intro">Check metadata, language, text tags, reading order and figure descriptions. Local AI compares text; image and chart meaning still need human review.</p>
      {state.report && (
        <Actions>
          <Button onClick={() => controller.go("review")}>
            Return to this PDF’s results
          </Button>

        </Actions>
      )}
      {!state.report && state.file && (
        <div className="flow-actions">
          <Button
            disabled={disabled}
            onClick={() => controller.selectFiles([state.file])}
          >
            Retry this PDF
          </Button>
        </div>
      )}
      <Card
        className={`upload-card ${dragging ? "dragging" : ""}`}
        id="drop-zone"
        tabIndex={-1}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const files = Array.from(e.dataTransfer.files || []);
          controller.selectFiles(files);
        }}
      >
        <label className="drop-target" htmlFor="file-input">
          <span className="document-icon">
            <Icon name="file-alt" />
          </span>
          <strong>Drop your PDF here</strong>
          <span className="drop-subtext">or choose PDFs from your device</span>
          <span className="drop-limit">Up to 50 MB · 200 pages</span>
        </label>
        <input
          className="mg-u-sr-only"
          type="file"
          id="file-input"
          accept="application/pdf,.pdf"
          multiple
          disabled={disabled}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            e.target.value = "";
            controller.selectFiles(files);
          }}
        />
      </Card>
      <div className="intake-settings">
        <p className="model-note">{state.setupComplete ? `Using ${state.aiEnabled ? state.evaluationModel === "minilm" ? "MiniLM · English" : "Granite R2 · multilingual" : "rule-based checks without AI"}${state.settingsSaved ? " · saved in this browser" : " · this session only"}.` : "Choose your check settings when you select your first PDF."}</p>
        <Actions>
          <Button disabled={disabled} onClick={() => controller.openSetup("document")}>Settings</Button>
          <Button disabled={disabled} onClick={() => controller.beginEvaluation("batch")}>Check several PDFs</Button>
        </Actions>
      </div>
      <Samples
        manifest={state.manifest}
        manifestError={state.manifestError}
        disabled={disabled}
        onChoose={(path) => controller.selectSample(path)}
      />
      <Details summary="What this tool checks and its limits"><Capabilities /></Details>
      <p className="privacy-note">
        Your PDF stays here. The structural analysis needs no AI model or
        account. Optional semantic screening downloads model assets, then runs
        locally.
      </p>
    </div>
  );
}
