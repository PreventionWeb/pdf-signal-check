import { SiteNavigation } from "./SiteNavigation.jsx";
import { Capabilities } from './Capabilities.jsx';
import { IntakeHero } from './IntakeHero.jsx';
import { formatProgress } from '../ui/progress.js';
import React, {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { PageHeader } from "@undrr/undrr-mangrove/components/PageHeader.js";
import { Footer } from "@undrr/undrr-mangrove/components/Footer.js";
import { Samples } from "./Samples.jsx";
import { Tabs } from "../ui/Tabs.jsx";
import { createAppController } from "./controller.js";
import { BatchController } from "../batch/controller.js";
import { BatchPanel } from "../batch/BatchPanel.jsx";
import { SetupDialog } from "./SetupDialog.jsx";
import { LanguageDialog } from "./LanguageDialog.jsx";
import { PrivacyNotice } from "./PrivacyNotice.jsx";
import { ReviewLoader } from "../review/ReviewLoader.jsx";
import { needsDocumentInformation } from "../runtime/screening-recovery.js";
import {
  PRESENTATION_BRAND,
  PRODUCT_NAME,
} from "../brand.js";
import {
  Button,
  Card,
  Actions,
  Loader,
  Icon,
  Notice,
} from "../ui/react.jsx";
export function App() {
  const [controller] = useState(() => createAppController({ semanticExperiment: new URLSearchParams(globalThis.location?.search).get("experiment") === "semantic-evidence" })),
    state = useSyncExternalStore(controller.subscribe, controller.getSnapshot),
    calibrationRef = useRef(null),
    exportRef = useRef(null),
    privacyRef = useRef(null),
    openerRef = useRef(null),
    previousStage = useRef(state.stage);
  const [showSamples, setShowSamples] = useState(false);
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
      if (["document", "batch"].includes(state.stage)) window.scrollTo({ top: 0, behavior: "instant" });
      else heading?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [state.stage]);
  const title = {
    // The intake hero owns the heading for these stages.
    setup: null,
    document: null,
    batch: "Review several PDFs",
    checks: null,
    review: null,
    "processing-analysis": "Checking text, tags, and metadata",
    "processing-model": null,
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
      <SiteNavigation onNavigate={(action, opener) => {
        if (action === "about") { privacyRef.current?.open(opener); return; }
        if (action === "settings") { controller.openSetup(state.report ? "checks" : "document"); return; }
        if (action === "batch") { controller.beginEvaluation("batch"); return; }
        setShowSamples(action === "sample");
        controller.go("document");
        if (action === "capabilities") requestAnimationFrame(() => document.querySelector('[aria-label="Tool capabilities"]')?.scrollIntoView({ block: "start" }));
      }} />
      <PrivacyNotice ref={privacyRef} openerRef={openerRef} />
      {state.stage === "setup" && <SetupDialog controller={controller} state={state} calibrationRef={calibrationRef}
        batchBusy={batch.busy} canCalibrate={() => !batch.busy && !controller.getSnapshot().analysisBusy} />}
      {state.awaitingLanguageDecision && (
        <LanguageDialog controller={controller} state={state} />
      )}
      <main id="main" tabIndex={-1} className="mg-container mg-container--slim">
          <div
            className="workspace"
            data-stage={state.stage}
          >
            <section
              className="output-column"
              aria-label="Analysis report"
            >
              <div id="guided-flow">
                {state.semanticExperiment && ["document", "setup"].includes(state.stage) && <Notice icon={false}>
                  <h2>Semantic evidence experiment is on</h2>
                  <p>Choose a PDF or sample. Below its results, you’ll find a new panel comparing saved descriptions and keywords with passages across the PDF. Word matches appear even without AI; AI comparisons require your existing model consent.</p>
                </Notice>}
                {title && (
                  <h1 className="flow-title" id="flow-title" tabIndex={-1}>
                    {title}
                  </h1>
                )}
                {state.file && state.stage !== "batch" && state.stage !== "document" && (!["checks", "review"].includes(state.stage) || needsDocumentInformation(state.report)) && (
                  <p className="flow-file">
                    {state.file.name} · {(state.file.size / 1e6).toFixed(2)} MB
                  </p>
                )}
                {["document", "setup"].includes(state.stage) && (
                  <Entry
                    state={state}
                    controller={controller}
                    batchBusy={batch.busy}
                    showSamples={showSamples}
                    setShowSamples={setShowSamples}
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
                </>
              )}
              {["checks", "review", "processing-model"].includes(state.stage) && state.report && (
                <ReviewLoader
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
                {PRODUCT_NAME}
              </p>
              <p className="mg-footer-bar__text">Processed on your device · Early version / 0.8</p>
              <div className="mg-footer-bar__links">
                <a href="#ai-info-dialog" id="about-ai" ref={openerRef} onClick={e => { e.preventDefault(); privacyRef.current?.open(e.currentTarget); }}>About AI &amp; privacy</a>
                <a
                  href="https://github.com/PreventionWeb/pdf-signal-check/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </Footer>
    </>
  );
}
function Entry({ state, controller, batchBusy, showSamples, setShowSamples }) {
  const [dragging, setDragging] = useState(false),
    disabled = state.analysisBusy || batchBusy;
  return (
    <div className="document-intake">
      <IntakeHero />
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
      <Tabs label="Choose a PDF source" value={showSamples ? "sample" : "upload"}
        onChange={value => setShowSamples(value === "sample")} disabled={disabled}
        tabs={[{ value: "upload", label: "Your PDF", content: (
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
        ) }, { value: "sample", label: "Try a sample", content: (
          <Samples disabled={disabled} onChoose={path => controller.selectSample(path)} />
        ) }]} />
      <div className="intake-settings">
        <p className="model-note">{state.setupComplete ? `Using ${state.aiEnabled ? state.evaluationModel === "minilm" ? "MiniLM · English" : "Granite R2 · multilingual" : "rule-based checks without AI"}${state.settingsSaved ? " · saved in this browser" : " · this session only"}.` : "Choose your check settings when you select your first PDF."}</p>
      </div>
      <Capabilities />
    </div>
  );
}
