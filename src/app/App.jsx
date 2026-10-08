import { SiteNavigation } from "./SiteNavigation.jsx";
import { Capabilities } from './Capabilities.jsx';
import { IntakeHero } from './IntakeHero.jsx';
import { AboutPage } from './AboutPage.jsx';
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
  Actions,
  Loader,
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
  // About is a separate page at #about so it can be linked and the browser back button returns to the app.
  const isAbout = () => ["#about", "#about-video"].includes(globalThis.location?.hash);
  const [about, setAbout] = useState(isAbout);
  useEffect(() => {
    const sync = () => setAbout(isAbout());
    addEventListener("popstate", sync);
    addEventListener("hashchange", sync);
    return () => { removeEventListener("popstate", sync); removeEventListener("hashchange", sync); };
  }, []);
  const showAbout = (open, target = "#about") => {
    if (open && location.hash !== target) history.pushState(null, "", target);
    if (!open && isAbout()) {
      const url = new URL(location.href); url.hash = ''; url.searchParams.delete('scene');
      history.replaceState(null, "", url);
    }
    setAbout(open);
    if (open) requestAnimationFrame(() => {
      const heading = document.getElementById(target === '#about-video' ? 'about-video-title' : 'about-title');
      if (target === '#about-video') heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
      else scrollTo({ top: 0, behavior: 'instant' });
      heading?.focus({ preventScroll: true });
    });
  };
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
        if (action === "privacy") { privacyRef.current?.open(opener); return; }
        if (action === "about") { showAbout(true); return; }
        showAbout(false);
        if (action === "settings") { controller.openSetup(state.report ? "checks" : "document"); return; }
        if (action === "batch") { controller.beginEvaluation("batch"); return; }
        controller.go("document");
        // Navigation scrolls to the intake section it names; there are no intake tabs to switch.
        if (action === "sample") requestAnimationFrame(() => { const heading = document.getElementById("sample-title"); heading?.scrollIntoView({ block: "start" }); heading?.focus({ preventScroll: true }); });
        if (action === "upload") requestAnimationFrame(() => { const zone = document.getElementById("drop-zone"); zone?.scrollIntoView({ block: "center" }); zone?.focus({ preventScroll: true }); });
        if (action === "capabilities") requestAnimationFrame(() => document.querySelector('[aria-label="Tool capabilities"]')?.scrollIntoView({ block: "start" }));
      }} />
      <PrivacyNotice ref={privacyRef} openerRef={openerRef} />
      {state.stage === "setup" && <SetupDialog controller={controller} state={state} calibrationRef={calibrationRef}
        batchBusy={batch.busy} canCalibrate={() => !batch.busy && !controller.getSnapshot().analysisBusy} />}
      {state.awaitingLanguageDecision && (
        <LanguageDialog controller={controller} state={state} />
      )}
      {about && <main id="main" tabIndex={-1} className="about-main">
        <AboutPage onStart={() => { showAbout(false); requestAnimationFrame(() => { const zone = document.getElementById("drop-zone"); controller.go("document"); zone?.scrollIntoView({ block: "center" }); zone?.focus({ preventScroll: true }); }); }}
          onPrivacy={event => privacyRef.current?.open(event?.currentTarget)} />
      </main>}
      {/* The app stays mounted while About is open, so an in-progress review is kept. */}
      <main id={about ? undefined : "main"} tabIndex={-1} className="mg-container mg-container--slim" hidden={about}>
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
                    onAbout={() => showAbout(true)}
                    onWatch={() => showAbout(true, '#about-video')}
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
function Entry({ state, controller, batchBusy, onAbout, onWatch }) {
  const [dragging, setDragging] = useState(false),
    disabled = state.analysisBusy || batchBusy;
  return (
    <div className="document-intake">
      <IntakeHero onAbout={onAbout} onWatch={onWatch} />
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
      <section aria-labelledby="upload-title">
        <article
          className={`mg-card mg-card__hc mg-card-book__hc upload-card ${dragging ? "dragging" : ""}`}
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
          <div className="mg-card__visual">
            <img src="./images/samples/your-pdf.svg" alt="" className="mg-card__image" width="300" height="400" />
          </div>
          <div className="mg-card__content">
            <div className="mg-card__meta"><span className="mg-card__label">Your PDF</span></div>
            <h2 className="mg-card__title" id="upload-title">Check your own PDF</h2>
            <p className="mg-card__summary">Drag a PDF onto this box, or choose one from your device. Up to 50 MB and 200 pages. It never leaves this device.</p>
            {/* The visually hidden file input is the focusable control; its label is styled as the primary button. */}
            <label className="mg-button mg-button-primary upload-button" htmlFor="file-input">Choose a PDF</label>
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
          </div>
        </article>
      </section>
      <Samples disabled={disabled} onChoose={path => controller.selectSample(path)} />
      <div className="intake-settings">
        <p className="model-note">{state.setupComplete ? `Using ${state.aiEnabled ? state.evaluationModel === "minilm" ? "MiniLM · English" : "Granite R2 · multilingual" : "rule-based checks without AI"}${state.settingsSaved ? " · saved in this browser" : " · this session only"}.` : "Choose your check settings when you select your first PDF."}</p>
      </div>
      <Capabilities />
    </div>
  );
}
