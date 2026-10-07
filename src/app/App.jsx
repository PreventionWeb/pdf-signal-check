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
import { Checks } from "./Checks.jsx";
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
  Notice,
  EmptyState,
  Loader,
  Icon,
  Tag,
} from "../ui/react.jsx";
export function App() {
  const [controller] = useState(() => createAppController()),
    state = useSyncExternalStore(controller.subscribe, controller.getSnapshot),
    calibrationRef = useRef(null),
    exportRef = useRef(null),
    privacyRef = useRef(null),
    openerRef = useRef(null);
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
    if (state.stage !== "setup") {
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
          ["checks", "2 · Check results"],
          ["review", "3 · Review evidence"],
        ];
  const title = {
    setup: "Select a PDF to check",
    document: "Select a PDF to check",
    batch: "Review several PDFs",
    checks: "Your PDF check results",
    review: "Review the evidence",
    "processing-analysis": "Checking text, tags, and metadata",
    "processing-model": "Screening selected checks locally",
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
          <Tag subtle className="app-version">
            Early version / 0.8
          </Tag>
          <span className="app-local">Processed on your device</span>
          <Button
            className="app-privacy"
            id="about-ai"
            ref={openerRef}
            onClick={(e) => privacyRef.current?.open(e.currentTarget)}
          >
            About AI &amp; privacy
          </Button>
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
                (state.stage.startsWith("processing") && key === "checks");
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
              {state.stage === "checks" && (
                <Checks
                  state={state}
                  controller={controller}
                  calibrationRef={calibrationRef}
                  batchBusy={batch.busy}
                  canCalibrate={() =>
                    !batch.busy && !controller.getSnapshot().analysisBusy
                  }
                />
              )}
              {state.stage.startsWith("processing") && (
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
              {state.stage === "review" && state.report && (
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
                    Stop queue and return to single PDF
                  </Button>
                </>
              )}
            </div>
            {state.report && ["checks", "review"].includes(state.stage) && (
              <Details
                id="advanced-evidence"
                summary="Full evidence and JSON report"
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
      {state.stage === "document" && (
          <section className="about-profile mg-grid mg-grid__col-2">
            <div>
              <p className="eyebrow">What a Yes means</p>
              <h2>Understand the result’s limits</h2>
            </div>
            <p>
              A Yes means every required check passed for the supported text
              profile. Metadata findings and reading-order review are separate.
              Figure tags and alternate-text presence are checked, but image meaning is not.
              Meaningful graphics and other excluded content keep the full text-profile
              result unestablished in this version; this is a scope limit, not proof of a defective PDF.
            </p>
          </section>
        )}
      </main>
      <Footer enableSyndication={false}>
        <div className="mg-footer-bar">
          <div className="mg-container mg-container--slim">
            <div className="mg-footer-bar__row">
              <p className="mg-footer-bar__text">
                {PRODUCT_NAME} · A project by Ken Hawkins
              </p>
              <div className="mg-footer-bar__links">
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
      {state.setupComplete ? <p className="model-note">Current settings: {state.aiEnabled ? state.evaluationModel === "minilm" ? "MiniLM · compact English" : "Granite R2 · multilingual" : "No AI model · fallback"}. {state.settingsSaved ? "Your choice is remembered in this browser." : "Settings apply for this session; browser storage is unavailable."}</p> : <p>Find missing text tags, conflicting metadata and reading-order concerns before using a PDF in AI workflows. Your PDF stays on this device.</p>}
      {state.setupComplete && <div className="flow-actions">
        <Button variant="secondary" disabled={disabled} onClick={() => controller.openSetup("document")}>
          Change check settings
        </Button>
      </div>}
      <p className="step-intro">
        {state.setupComplete ? `Select or drop a PDF to run text checks${state.aiEnabled ? " and local AI" : ""}.` : "Select a PDF or sample to get started. We’ll guide you through device benchmarking and model selection before checking it."} Selecting several files creates a batch queue.
      </p>
      {state.report && (
        <Actions>
          <Button onClick={() => controller.go("review")}>
            Return to this PDF’s review
          </Button>
          <Button onClick={() => controller.go("checks")}>
            Return to screening choices
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
          <span className="drop-subtext">or choose a file from your device</span>
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
        <div className="upload-batch">
          <Button onClick={() => controller.beginEvaluation("batch")}>
            Check several PDFs
          </Button>
        </div>
      </Card>
      <Samples
        manifest={state.manifest}
        manifestError={state.manifestError}
        disabled={disabled}
        onChoose={(path) => controller.selectSample(path)}
      />
      <Capabilities />
      <p className="privacy-note">
        Your PDF stays here. The structural analysis needs no AI model or
        account. Optional semantic screening downloads model assets, then runs
        locally.
      </p>
    </div>
  );
}
