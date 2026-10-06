import React, {
  StrictMode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { PageHeader } from "@undrr/undrr-mangrove/components/PageHeader.js";
import { Footer } from "@undrr/undrr-mangrove/components/Footer.js";
import { Hero } from "@undrr/undrr-mangrove/components/Hero.js";
import { HighlightBox } from "@undrr/undrr-mangrove/components/HighlightBox.js";
import { FormAction } from "@undrr/undrr-mangrove/components/FormAction.js";
import { createAppController } from "./controller.js";
import { BatchController } from "../batch/controller.js";
import { BatchPanel } from "../batch/BatchPanel.jsx";
import { CalibrationPanel } from "../calibration/CalibrationPanel.jsx";
import { PrivacyNotice } from "./PrivacyNotice.jsx";
import { Review } from "../review/Review.jsx";
import { AdvancedReport } from "../review/AdvancedReport.jsx";
import { normalizeFindings } from "../review/findings.js";
import {
  PRESENTATION_BRAND,
  PRODUCT_NAME,
  PRODUCT_DESCRIPTOR,
  PRODUCT_TAGLINE,
} from "../brand.js";
import {
  SEMANTIC_MODELS,
  getSemanticModel,
  supportsLanguage,
} from "../engine/models.js";
import {
  Button,
  Card,
  Details,
  Actions,
  Notice,
  EmptyState,
  Checkbox,
  Select,
  FormGroup,
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
    if (state.stage !== "document")
      document.getElementById("flow-title")?.focus({ preventScroll: true });
  }, [state.stage]);
  const inBatch =
      state.stage === "batch" || (state.stage === "review" && state.batchId),
    steps = inBatch
      ? [
          ["batch", "Batch queue"],
          ["review", "PDF evidence"],
        ]
      : [
          ["document", "1 · Document"],
          ["checks", "2 · Checks"],
          ["processing", "3 · Processing"],
          ["review", "4 · Review"],
        ];
  const title = {
    batch: "Review several PDFs",
    checks: "Choose how to review this PDF",
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
        <div className="mg-footer-bar__row">
          <a
            className="mg-u-font-size-500"
            href="./"
            aria-label="PDF Signal Check home"
          >
            {PRODUCT_NAME}
          </a>
          <div className="mg-u-flex mg-u-flex-wrap mg-u-align-items-center mg-u-gap-100">
            <span className="mg-status-label">
              <span className="mg-status-label__indicator" aria-hidden="true" />
              Processed on your device
            </span>
            <Tag subtle>Early version / 0.8</Tag>
            <Button
              id="about-ai"
              ref={openerRef}
              onClick={(e) => privacyRef.current?.open(e.currentTarget)}
            >
              About AI &amp; privacy
            </Button>
          </div>
        </div>
      </section>
      <PrivacyNotice ref={privacyRef} openerRef={openerRef} />
      <main id="main" tabIndex={-1} className="mg-container mg-container--slim">
        {state.stage === "document" && (
          <Hero
            contained
            data={[
              {
                label: PRODUCT_DESCRIPTOR,
                title: PRODUCT_TAGLINE,
                summaryText:
                  "Inspect extracted text, connected tags, and publication metadata. Find evidence of missing structure or conflicting information before using the document.",
                buttons: [
                  { label: "Choose a PDF", url: "#drop-zone" },
                  {
                    label: "Try a sample",
                    url: "#sample-title",
                    type: "Secondary",
                  },
                ],
              },
            ]}
          />
        )}
        <nav
          className="flow-steps"
          aria-label={inBatch ? "Batch review" : "Review stages"}
        >
          <ol id="flow-steps">
            {steps.map(([key, label]) => (
              <li
                key={key}
                aria-current={
                  state.stage === key ||
                  (state.stage.startsWith("processing") && key === "processing")
                    ? "step"
                    : undefined
                }
              >
                {label}
              </li>
            ))}
          </ol>
        </nav>
        <div
          className="workspace mg-grid mg-grid__col-3"
          data-stage={state.stage}
        >
          {state.stage === "document" && (
            <Entry
              state={state}
              controller={controller}
              batchBusy={batch.busy}
            />
          )}
          <section
            className="output-column mg-grid__col--span-2"
            aria-label="Analysis report"
          >
            <div id="guided-flow">
              {title && (
                <h1 className="flow-title" id="flow-title" tabIndex={-1}>
                  {title}
                </h1>
              )}
              {state.file && state.stage !== "batch" && (
                <p className="flow-file">
                  {state.file.name} · {(state.file.size / 1e6).toFixed(2)} MB
                </p>
              )}
              {state.stage === "document" && (
                <>
                  <p className="entry-orientation">
                    Start with a PDF or a sample. Find the problems, compare the
                    evidence, and keep a report. Traditional checks run first;
                    AI is optional.
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
                    <Button
                      disabled={batch.busy}
                      onClick={() => controller.analyze(state.file)}
                    >
                      Retry this PDF
                    </Button>
                  )}
                  <EmptyState title="What will machines get from this PDF?">
                    <p>
                      Check a defined text profile, inspect metadata, and review
                      the extracted order with the original page.
                    </p>
                    <ol className="check-preview">
                      <li>
                        <strong>Text that decodes</strong>
                        <p>
                          Usable output, rather than just pixels or suspicious
                          characters.
                        </p>
                      </li>
                      <li>
                        <strong>Tags that connect</strong>
                        <p>
                          Semantic structure tied to content, with coverage and
                          parent links.
                        </p>
                      </li>
                      <li>
                        <strong>Metadata to compare</strong>
                        <p>
                          Compare title and authors with headings and cover
                          text.
                        </p>
                      </li>
                    </ol>
                    <HighlightBox>
                      <div>
                        <strong>A specific profile. A traceable result.</strong>
                        <p>
                          This early version checks text-centric PDFs. Complex
                          content can return “No — not established.” It does not
                          certify PDF/UA or guarantee downstream AI accuracy.
                        </p>
                      </div>
                    </HighlightBox>
                  </EmptyState>
                </>
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
                  <BatchPanel controller={batch} />
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
              <h2>Inspect the PDF. Keep the evidence.</h2>
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
function Entry({ state, controller, batchBusy }) {
  const [dragging, setDragging] = useState(false),
    [sample, setSample] = useState(""),
    disabled = state.analysisBusy || batchBusy;
  return (
    <aside className="input-column" aria-label="Choose a PDF">
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
          if (e.dataTransfer.files.length === 1)
            controller.analyze(e.dataTransfer.files[0]);
        }}
      >
        <div className="section-label mg-u-flex mg-u-gap-100">
          Choose your PDF
          <Icon name="arrow-right" />
        </div>
        <label className="drop-target" htmlFor="file-input">
          <span className="document-icon">
            <Icon name="file-alt" />
          </span>
          <strong>Drop your PDF here</strong>
          <span>or choose a file from your device</span>
        </label>
        <input
          className="mg-u-sr-only"
          type="file"
          id="file-input"
          accept="application/pdf,.pdf"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files[0];
            e.target.value = "";
            if (file) controller.analyze(file);
          }}
        />
        <p className="upload-limit">
          Up to 50 MB · 200 pages ·{" "}
          <Button onClick={() => controller.go("batch")}>
            Check several PDFs
          </Button>
        </p>
      </Card>
      <Card className="sample-card">
        <p className="eyebrow">Try it first</p>
        <h2 id="sample-title" tabIndex={-1}>
          Try a sample first.
        </h2>
        <div className="sample-buttons">
          {[
            ["Conflicting authors", "./calibration/14-author-mismatch.pdf"],
            [
              "Flawed reading order",
              "./calibration/17-flawed-reading-order.pdf",
            ],
            ["Wrong title year", "./samples/wrong-title.pdf"],
          ].map(([label, path]) => (
            <Button
              disabled={disabled}
              key={path}
              onClick={() => controller.loadSample(path)}
            >
              {label}
              <Icon name="arrow-right" />
            </Button>
          ))}
        </div>
        <Details
          summary={`Controls and all ${state.manifest.length} examples`}
          className="example-gallery"
        >
          <p className="small">
            Compare the same visual page with different machine input.
          </p>
          <Actions>
            {[
              ["Matching authors", "18-title-author-control.pdf"],
              ["Correct tagged order", "16-correct-reading-order.pdf"],
            ].map(([label, name]) => (
              <Button
                disabled={disabled}
                key={name}
                onClick={() => controller.loadSample(`./calibration/${name}`)}
              >
                {label}
              </Button>
            ))}
            <Button
              disabled={disabled}
              onClick={() => controller.loadSample("./samples/clean.pdf")}
            >
              Clean, tagged text
            </Button>
            <Button
              disabled={disabled}
              onClick={() => controller.loadSample("./samples/untagged.pdf")}
            >
              Readable, but untagged
            </Button>
          </Actions>
          <FormAction
            label="Example PDFs"
            stackOnMobile
            control={
              <select
                id="calibration-select"
                className="mg-form-select"
                value={sample}
                disabled={disabled || state.manifestError}
                onChange={(e) => setSample(e.target.value)}
              >
                <option value="">Choose an example PDF…</option>
                {state.manifest.map((s) => (
                  <option key={s.file} value={s.file}>
                    {s.title}
                  </option>
                ))}
              </select>
            }
            action={
              <Button
                variant="primary"
                id="load-calibration"
                disabled={disabled || !sample}
                onClick={() => controller.loadSample(`./calibration/${sample}`)}
              >
                Analyse selected example
              </Button>
            }
          />
          <p className="small">
            Original synthetic reports with metadata, logos, figures, and
            deliberate defects.{" "}
            <a
              href="./calibration/manifest.json"
              target="_blank"
              rel="noopener noreferrer"
            >
              View labels ↗
            </a>
          </p>
        </Details>
      </Card>
      <p className="privacy-note">
        Your PDF stays here. The structural analysis needs no AI model or
        account. Optional semantic screening downloads model assets, then runs
        locally.
      </p>
    </aside>
  );
}
function Checks({
  state,
  controller,
  calibrationRef,
  batchBusy,
  canCalibrate,
}) {
  const normalized = useMemo(
      () => normalizeFindings(state.report),
      [state.report],
    ),
    problems = normalized.findings.filter((f) =>
      [
        "required-defect",
        "required-indeterminate",
        "advisory-concern",
      ].includes(f.category),
    ).length,
    report = state.report,
    recommended = /^en(?:-|$)/i.test(report.metadata.language || "")
      ? "minilm"
      : supportsLanguage(
            getSemanticModel("granite-r2"),
            report.metadata.language,
          )
        ? "granite-r2"
        : null,
    model = recommended && getSemanticModel(recommended);
  return (
    <>
      <Notice
        title={
          problems
            ? `${problems} finding${problems === 1 ? "" : "s"} to inspect`
            : "No concrete problems found"
        }
        headingLevel="h2"
        description={
          report.accepted
            ? "The required text profile passed. Metadata and reading order still need separate review."
            : report.checks.some((c) => c.status === "fail")
              ? "The required text profile failed: required defects were found. Inspect their evidence."
              : "The required text profile was not established. Inspect the required findings."
        }
        actions={
          <>
            {model && (
              <Button
                variant="primary"
                disabled={
                  !state.checks.length || state.calibrationBusy || batchBusy
                }
                onClick={() => {
                  controller.setModel(recommended);
                  controller.runScreening();
                }}
              >
                Review with AI (recommended)
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => controller.go("review")}
            >
              {problems ? "Review findings without AI" : "Review without AI"}
            </Button>
          </>
        }
      />
      <p className="model-note">
        Optional AI compares bounded relatedness. It can make mistakes and takes
        additional time and downloads.
      </p>
      <Details
        summary="Add optional local AI screening"
        className="optional-screening"
        defaultOpen
      >
        <Card className="recommendation">
          <h3>
            {model
              ? `Recommended for the declared language: ${model.label}`
              : "No supported recommendation is available"}
          </h3>
          <p>
            {model
              ? `${(model.graphBytes / 1e6).toFixed(2)} MB model + ${(model.tokenizerBytes / 1e6).toFixed(2)} MB tokenizer on first use; runtime assets are separate. Assets download from external hosts; PDF text stays on this device. Speed, memory use and accuracy for this task are unmeasured.`
              : "Language metadata is missing or unsupported. Review without AI or inspect model eligibility; no language is silently substituted."}
          </p>
          {model && (
            <Actions>
              <Button
                variant="primary"
                disabled={
                  !state.checks.length || state.calibrationBusy || batchBusy
                }
                onClick={() => {
                  controller.setModel(recommended);
                  controller.runScreening();
                }}
              >
                Use recommended settings
              </Button>
              <Button
                variant="secondary"
                onClick={() => controller.go("review")}
              >
                {problems ? "Review findings without AI" : "Review without AI"}
              </Button>
            </Actions>
          )}
        </Card>
        <Details
          summary="Choose another model or change screening checks"
          className="alternate-model"
        >
          <ModelPicker
            state={state}
            controller={controller}
            batchBusy={batchBusy}
          />
        </Details>
        <CalibrationPanel
          ref={calibrationRef}
          canRun={canCalibrate}
          modelId={state.selectedModel || "minilm"}
          disabled={state.modelBusy || batchBusy}
          onBusy={(value) => controller.calibrationBusy(value)}
        />
      </Details>
      {state.message && <p className="model-note">{state.message}</p>}
      <Button onClick={() => controller.go("document")}>
        Choose another PDF
      </Button>
    </>
  );
}
function ModelPicker({ state, controller, batchBusy }) {
  const model = state.selectedModel
    ? getSemanticModel(state.selectedModel)
    : null;
  return (
    <Card className="model-picker">
      <h3>Choose a model and screening checks</h3>
      <p className="model-note">
        Traditional title, author, and structure checks already ran. Models
        compare bounded relatedness and do not change structural acceptance.
        Changing options makes no downloads.
      </p>
      <Select
        id="screening-model"
        label="Screening model"
        value={state.selectedModel || ""}
        placeholder="Choose a model…"
        onChange={(e) => controller.setModel(e.target.value || null)}
        options={SEMANTIC_MODELS.map((m) => ({ value: m.key, label: m.label }))}
        helpText={
          model
            ? `${model.language}. ${supportsLanguage(model, state.report.metadata.language) ? "Eligible for declared language." : "Missing or unsupported declared language; inference will remain unassessed."} ${model.tradeoff}`
            : "Select a model to see download costs and language support."
        }
      />
      <div
        className="mg-table-scroll-region"
        role="region"
        aria-label="Model download and language tradeoffs"
        tabIndex={0}
      >
        <table className="mg-table mg-table--data mg-u-font-size-200">
          <thead>
            <tr>
              <th scope="col">Model / language</th>
              <th scope="col">Download assets</th>
              <th scope="col">Tradeoffs</th>
            </tr>
          </thead>
          <tbody>
            {SEMANTIC_MODELS.map((m) => (
              <tr key={m.key}>
                <td>
                  {m.label} · {m.language}
                  <Details summary="Supported languages">
                    <p>
                      {m.languages
                        .map((lang) =>
                          new Intl.DisplayNames(["en"], {
                            type: "language",
                          }).of(lang),
                        )
                        .join(", ")}
                    </p>
                  </Details>
                </td>
                <td>
                  {(m.graphBytes / 1e6).toFixed(2)} MB model +{" "}
                  {(m.tokenizerBytes / 1e6).toFixed(2)} MB tokenizer ·{" "}
                  {m.maxTokens}-token cap
                </td>
                <td>{m.tradeoff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="model-note">
        Sizes exclude bundled runtime: approximately 26.86 MB uncompressed WASM
        plus runtime JavaScript. Transfer/cache cost varies. Browser speed and
        memory use are unmeasured. Similarity is not a probability of
        correctness.
      </p>
      <FormGroup legend="Checks to screen" className="screening-checks">
        {[
          ["title", "Publication title"],
          ["subject", "Subject"],
          ["keywords", "Each keyword"],
          ["sections", "Tagged headings and section text"],
        ].map(([key, label]) => (
          <Checkbox
            key={key}
            id={`single-check-${key}`}
            label={label}
            checked={state.checks.includes(key)}
            onChange={(e) =>
              controller.setChecks(
                e.target.checked
                  ? [...state.checks, key]
                  : state.checks.filter((c) => c !== key),
              )
            }
          />
        ))}
      </FormGroup>
      <p className="model-note">
        Section screening associates bounded tagged headings with following
        tagged text. It does not verify every heading role or the whole
        document.
      </p>
      <Button
        variant="primary"
        disabled={
          !model || !state.checks.length || state.calibrationBusy || batchBusy
        }
        onClick={() => controller.runScreening()}
      >
        Run selected checks locally
      </Button>
    </Card>
  );
}
