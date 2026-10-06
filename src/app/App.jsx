import React, {
  StrictMode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { PageHeader } from "@undrr/undrr-mangrove/components/PageHeader.js";
import { Footer } from "@undrr/undrr-mangrove/components/Footer.js";
import { Hero } from "@undrr/undrr-mangrove/components/Hero.js";
import { Samples } from "./Samples.jsx";
import { createAppController } from "./controller.js";
import { BatchController } from "../batch/controller.js";
import { BatchPanel } from "../batch/BatchPanel.jsx";
import { Setup } from "./Setup.jsx";
import { Checks } from "./Checks.jsx";
import { PrivacyNotice } from "./PrivacyNotice.jsx";
import { Review } from "../review/Review.jsx";
import { AdvancedReport } from "../review/AdvancedReport.jsx";
import { GoGoViewer } from "../evidence/GoGoViewer.jsx";
import {
  PRESENTATION_BRAND,
  PRODUCT_NAME,
  PRODUCT_DESCRIPTOR,
  PRODUCT_TAGLINE,
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
    openerRef = useRef(null),
    samplesRequested = useRef(false);
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
    if (state.stage === "document" && samplesRequested.current) {
      samplesRequested.current = false;
      const heading = document.getElementById("sample-title");
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: "start" });
    } else if (state.stage !== "welcome") {
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
    setup: "Set up PDF checks",
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
              controller.go("welcome");
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
      <main id="main" tabIndex={-1} className="mg-container mg-container--slim">
        {!["welcome", "setup"].includes(state.stage) && (<nav
          className="flow-steps"
          aria-label={inBatch ? "Batch review" : "Review stages"}
        >
          <ol id="flow-steps">
            {steps.map(([key, label]) => {
              const isCurrent =
                state.stage === key ||
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
        </nav>)}
        {state.stage === "welcome" && (
          <Welcome controller={controller} onBegin={stage => {
            samplesRequested.current = false;
            controller.beginEvaluation(stage);
          }} onSamples={() => {
            samplesRequested.current = true;
            controller.beginEvaluation("document");
          }} />
        )}
        {state.stage !== "welcome" && (
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
                {state.stage === "setup" && <Setup controller={controller} calibrationRef={calibrationRef} batchBusy={batch.busy}
                  canCalibrate={() => !batch.busy && !controller.getSnapshot().analysisBusy} />}
                {state.stage === "document" && (
                  <Entry
                    state={state}
                    controller={controller}
                    batch={batch}
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
                        {state.progress.completed} / {state.progress.total}{" "}
                        {state.progress.unit || "units"}
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
      )}
      {["welcome", "document"].includes(state.stage) && (
          <section className="about-profile mg-grid mg-grid__col-2">
            <div>
              <p className="eyebrow">What a Yes means</p>
              <h2>Understand the result’s limits</h2>
            </div>
            <p>
              A Yes means every required check passed for the supported text
              profile. Metadata findings and reading-order review are separate.
              Meaningful graphics, forms, annotations, attachments, and some
              text replacements need deeper analysis and prevent acceptance in
              this version.
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
function Welcome({ controller, onSamples, onBegin }) {
  return (
    <section className="welcome-screen" aria-label="Welcome and tool orientation">
      <Hero
        contained
        data={[
          {
            label: `${PRODUCT_DESCRIPTOR} · Experimental preflight`,
            title: PRODUCT_TAGLINE,
            summaryText:
              "Find missing text structure, conflicting metadata, and reading-order concerns before using a PDF in AI workflows. Your PDF stays on this device; no account is needed.",
            buttons: [
              {
                label: "Select a PDF",
                type: "Primary",
                onClick: (e) => {
                  e.preventDefault();
                  onBegin("document");
                },
              },
              {
                label: "Try a sample PDF",
                type: "Secondary",
                onClick: (e) => {
                  e.preventDefault();
                  onSamples();
                },
              },
              {
                label: "Check several PDFs",
                type: "Secondary",
                onClick: (e) => {
                  e.preventDefault();
                  onBegin("batch");
                },
              },
            ],
          },
        ]}
      />
      <div className="welcome-pillars mg-grid mg-grid__col-3">
        <Card className="welcome-pillar-card">
          <h2 className="mg-card__title">Check text and structure</h2>
          <p>
            Check text, tags and metadata, with local AI comparisons if enabled.
            Your PDF contents are never uploaded.
          </p>
        </Card>
        <Card className="welcome-pillar-card">
          <h2 className="mg-card__title">Review the evidence</h2>
          <p>
            Compare findings with publication text and page images. Make changes
            in your authoring tool, then export and check the revised PDF.
          </p>
        </Card>
        <Card className="welcome-pillar-card">
          <h2 className="mg-card__title">Choose how to check</h2>
          <p>
            Benchmark your device, then choose a local AI model or continue
            without AI. Review download costs before enabling a model.
          </p>
        </Card>
      </div>
    </section>
  );
}
function Entry({ state, controller, batch, batchBusy }) {
  const [dragging, setDragging] = useState(false),
    disabled = state.analysisBusy || batchBusy;
  return (
    <div className="document-intake">
      <p className="step-intro">
        Select or drop a PDF to run text checks{state.aiEnabled ? " and local AI" : ""}. Selecting several files creates
        a batch queue.
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
            onClick={() => controller.analyze(state.file)}
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
          if (files.length === 1) {
            controller.analyze(files[0]);
          } else if (files.length > 1) {
            batch.add(files);
            controller.go("batch");
          }
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
            if (files.length === 1) {
              controller.analyze(files[0]);
            } else if (files.length > 1) {
              batch.add(files);
              controller.go("batch");
            }
          }}
        />
        <div className="upload-batch">
          <Button onClick={() => controller.go("batch")}>
            Check several PDFs
          </Button>
        </div>
      </Card>
      <Samples
        manifest={state.manifest}
        manifestError={state.manifestError}
        disabled={disabled}
        onChoose={(path) => controller.loadSample(path)}
      />
      <div className="flow-actions">
        <Button
          variant="secondary"
          onClick={() => controller.go("welcome")}
        >
          ← Back to welcome
        </Button>
      </div>
      <p className="privacy-note">
        Your PDF stays here. The structural analysis needs no AI model or
        account. Optional semantic screening downloads model assets, then runs
        locally.
      </p>
    </div>
  );
}
