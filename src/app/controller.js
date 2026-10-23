import { createDevicePreferences } from '../calibration/preferences.js';
import { createEvaluationPreferences } from './preferences.js';
import { hasUnchangedNoInputs } from "../runtime/screening-recovery.js";
import { screeningAvailability } from "../runtime/screening-availability.js";
import { buildScreeningRequest } from "../runtime/screening-request.js";
import { resolveScreeningLanguage } from "../engine/models.js";
import { imageCandidates, descriptionCandidates } from "../engine/image-model.js";
/** Clean crops of graphics for the image model; needs a canvas, so it is loaded only in the browser and only when used. */
async function defaultImageCropper(file, report, items, signal) {
  const { EvidenceCropService } = await import("../evidence/crops.js");
  const service = new EvidenceCropService(file, report, { signal });
  const crops = [];
  try {
    for (const item of items) {
      const result = await service.crop({ page: item.page, quads: [item.quad], clean: true });
      if (result?.blob) crops.push({ index: item.index, page: item.page, blob: result.blob });
    }
  } finally { await service.destroy(); }
  return crops;
}
/** DOM-free single-source owner. Construction does not fetch, create workers, or start inference. */
export function createAppController({
  workerFactory = (kind) =>
    kind === "analysis"
      ? new Worker(new URL("../analysis.worker.js", import.meta.url), {
          type: "module",
        })
      : kind === "image"
        ? new Worker(new URL("../image.worker.js", import.meta.url), { type: "module" })
        : new Worker(new URL("../model.worker.js", import.meta.url), {
          type: "module",
        }),
  imageCropper = defaultImageCropper,
  fetcher = (...args) => fetch(...args),
  digest = (buffer) => crypto.subtle.digest("SHA-256", buffer),
  preferences = createEvaluationPreferences(),
  devicePreferences = createDevicePreferences(),
  semanticExperiment = false,
  baseUrl = globalThis.document?.baseURI || "http://localhost/",
} = {}) {
  const loaded = preferences.load();
  const saved = loaded?.modelId === "granite-r2" ? loaded : null;
  const defaultChecks = ["title", "subject", "keywords", "sections"];
  const configureBatch = useAI => {
    services.batch?.setSettings({ useAI, modelId: "granite-r2", checks: [...defaultChecks] });
    services.batch?.setConsent(useAI);
  };
  const deferIntake = (start, label) => {
    stopAnalysis();
    stopModel();
    cancelAuxiliary();
    pendingIntake = start;
    emit({ stage: "setup", setupMode: "intake", setupDestination: "document", pendingSetupLabel: label,
      analysisBusy: false, awaitingLanguageDecision: false, progress: null });
  };
  let state = {
    semanticExperiment,
    stage: "document",
    file: null,
    report: null,
    example: null,
    batchId: null,
    sourceKey: 0,
    setupComplete: Boolean(saved),
    settingsSaved: Boolean(saved),
    aiEnabled: Boolean(saved && saved.modelId !== null),
    // Separate consent for the optional image model, which only judges graphics marked as decoration.
    imageAI: Boolean(saved?.imageAI && saved.modelId !== null),
    evaluationModel: saved ? saved.modelId : "granite-r2",
    setupMode: "intake",
    setupDestination: "document",
    pendingSetupLabel: null,
    selectedModel: saved?.modelId || null,
    languageAssumption: null,
    awaitingLanguageDecision: false,
    checks: [...defaultChecks],
    message: "",
    progress: null,
    analysisBusy: false,
    modelBusy: false,
    screeningAttempt: null,
    calibrationBusy: false,
    manifest: [],
    manifestError: false,
    reviewCursor: { category: "problems", issueId: null },
  };
  let pendingIntake = null;
  let job = 0,
    modelRun = 0,
    analysisWorker = null,
    modelWorker = null,
    imageAbort = null,
    mountEpoch = 0,
    manifestAbort = null,
    services = {};
  const listeners = new Set();
  const emit = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const stopModel = () => {
    ++modelRun;
    imageAbort?.abort();
    imageAbort = null;
    modelWorker?.terminate();
    modelWorker = null;
    emit({ modelBusy: false });
  };
  const stopAnalysis = () => {
    ++job;
    analysisWorker?.terminate();
    analysisWorker = null;
  };
  const cancelAuxiliary = () => {
    services.calibration?.cancel();
    services.exports?.cancel("The selected PDF changed. Any active export was cancelled.");
  };
  const available = () => {
    if (services.batch?.busy) {
      emit({
        message: "Stop the active queue before starting separate analysis.",
      });
      return false;
    }
    services.batch?.releaseIdleWorkers();
    return true;
  };
  const saveSettings = () => {
    if (state.setupComplete) emit({ settingsSaved: preferences.save({ modelId: state.evaluationModel, checks: state.checks, imageAI: state.imageAI }) });
  };
  const controller = {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    bindServices: (patch) => {
      services = { ...services, ...patch };
      if (patch.batch && state.setupComplete) {
        configureBatch(state.aiEnabled);
      }
    },
    mount() {
      const epoch = ++mountEpoch;
      manifestAbort?.abort();
      manifestAbort = new AbortController();
      fetcher(new URL("./samples/manifest.json", baseUrl), {
        signal: manifestAbort.signal,
      })
        .then((r) => {
          if (!r.ok) throw Error("Manifest unavailable");
          return r.json();
        })
        .then((j) => {
          if (epoch === mountEpoch)
            emit({ manifest: j.samples || j, manifestError: false });
        })
        .catch((e) => {
          if (epoch === mountEpoch && e.name !== "AbortError")
            emit({ manifestError: true });
        });
    },
    dispose() {
      pendingIntake = null;
      ++mountEpoch;
      manifestAbort?.abort();
      manifestAbort = null;
      stopAnalysis();
      stopModel();
      cancelAuxiliary();
    },
    go(stage) {
      if (stage !== "checks") services.calibration?.cancel();
      emit({ stage: stage === "welcome" ? "document" : stage });
    },
    beginEvaluation(stage = "document") {
      if (stage === "batch") {
        // A frozen queue owns its original configuration, even after global setup changes.
        if (services.batch?.resetSetup?.() === false) return controller.go("batch");
        const start = useAI => {
          if (services.batch?.resetSetup?.() !== false) configureBatch(useAI);
          controller.go("batch");
        };
        if (state.setupComplete) return start(true);
        deferIntake(start, "next batch");
        emit({ setupDestination: "batch" });
        return;
      }
      if (state.setupComplete) controller.go(stage);
      else emit({ setupDestination: stage, setupMode: "intake", stage: "setup" });
    },
    openSetup(stage = state.stage) {
      pendingIntake = null;
      emit({ setupDestination: stage === "welcome" ? "document" : stage, pendingSetupLabel: null, setupMode: "intake", stage: "setup" });
    },
    openSettings(stage = state.stage) {
      pendingIntake = null;
      emit({ setupDestination: stage === "welcome" ? "document" : stage, pendingSetupLabel: null, setupMode: "settings", stage: "setup" });
    },
    resetSetup() {
      if (state.analysisBusy || state.modelBusy || state.calibrationBusy || services.batch?.busy) return false;
      pendingIntake = null;
      stopModel();
      services.calibration?.cancel();
      const settingsCleared = preferences.clear?.();
      const benchmarksCleared = devicePreferences.clear();
      services.batch?.releaseIdleWorkers();
      configureBatch(false);
      emit({ setupComplete: false, settingsSaved: false, aiEnabled: false, evaluationModel: "granite-r2", selectedModel: null, languageAssumption: null, awaitingLanguageDecision: false,
        checks: ["title", "subject", "keywords", "sections"], pendingSetupLabel: null, message: settingsCleared && benchmarksCleared ? "Saved setup and speed tests reset. Choose settings for your next PDF." : "Setup reset for this session. Browser storage could not be cleared; saved settings may return after reload." });
      return true;
    },
    cancelSetup() {
      pendingIntake = null;
      services.calibration?.cancel();
      emit({ stage: state.setupDestination, pendingSetupLabel: null });
    },
    selectFiles(files) {
      if (!files.length || !available()) return;
      const selection = [...files];
      if (selection.length === 1) return controller.analyze(selection[0]);
      const start = useAI => {
        if (services.batch?.resetSetup?.() === false) {
          emit({ message: "Clear the previous queue before adding a new batch.", stage: "batch" });
          return false;
        }
        configureBatch(useAI);
        services.batch?.add(selection);
        controller.go("batch");
      };
      if (state.setupComplete) return start(true);
      deferIntake(start, `${selection.length} PDFs`);
    },
    selectSample(path) {
      if (!available()) return;
      return controller.loadSample(path);
    },
    skipSetupForCurrentIntake() {
      const start = pendingIntake;
      if (!start) return false;
      pendingIntake = null;
      services.calibration?.cancel();
      emit({ stage: state.setupDestination, pendingSetupLabel: null });
      start(false);
      return true;
    },
    completeSetup(modelId, { imageAI = false } = {}) {
      if (modelId !== "granite-r2") throw Error("Fresh Granite download consent is required. Use skipSetupForCurrentIntake for standard checks only.");
      configureBatch(true);
      emit({ setupComplete: true, aiEnabled: true, imageAI: imageAI === true, evaluationModel: modelId, selectedModel: modelId,
        checks: [...defaultChecks], stage: state.setupDestination, awaitingLanguageDecision: false });
      saveSettings();
      const start = pendingIntake;
      pendingIntake = null;
      emit({ pendingSetupLabel: null });
      if (start) return start(true);
      if (["checks", "review"].includes(state.stage) && state.report?.analysisComplete && !state.analysisBusy) controller.requestAIComparisons();
    },
    setModel(modelId) {
      if (modelId !== "granite-r2") throw Error("New scans use Granite. Confirm setup or skip the current intake.");
      services.calibration?.cancel();
      emit({
        selectedModel: modelId,
        ...(state.aiEnabled ? { evaluationModel: modelId } : {}),
        report: state.report
          ? {
              ...state.report,
              screeningSelection: { modelId, checks: [...state.checks], languageAssumption: state.languageAssumption },
            }
          : null,
      });
      saveSettings();
    },
    setLanguageAssumption(languageAssumption) {
      if (!state.report) return;
      const resumeRequestedAI = state.awaitingLanguageDecision;
      resolveScreeningLanguage(state.report.metadata.language, languageAssumption);
      stopModel();
      services.calibration?.cancel();
      const selectedModel = state.selectedModel || (state.aiEnabled ? "granite-r2" : null);
      emit({
        languageAssumption,
        selectedModel,
        awaitingLanguageDecision: false,
        report: {
          ...state.report,
          screeningSelection: { modelId: selectedModel, checks: [...state.checks], languageAssumption },
        },
      });
      if (resumeRequestedAI && state.aiEnabled) controller.requestAIComparisons();
    },
    dismissLanguageDecision() {
      emit({ awaitingLanguageDecision: false });
    },
    promptLanguageDecision() {
      emit({ awaitingLanguageDecision: true });
    },
    setChecks(checks) {
      emit({
        checks: [...checks],
        report: state.report
          ? {
              ...state.report,
              screeningSelection: {
                modelId: state.selectedModel,
                checks: [...checks],
                languageAssumption: state.languageAssumption,
              },
            }
          : null,
      });
      saveSettings();
    },
    setReviewCursor(patch) {
      emit({ reviewCursor: { ...state.reviewCursor, ...patch } });
    },
    calibrationBusy(value) {
      if (value) {
        if (!available() || state.analysisBusy) return false;
        stopModel();
        services.batch?.releaseIdleWorkers();
      }
      emit({ calibrationBusy: value });
    },
    stopModel,
    cancelAnalysis() {
      stopAnalysis();
      stopModel();
      cancelAuxiliary();
      emit({
        analysisBusy: false,
        progress: null,
        report: null,
        awaitingLanguageDecision: false,
        stage: "document",
        message:
          "Analysis cancelled. Your selected file is still available. Try again or choose another PDF.",
      });
    },
    cancelScreening() {
      const task = state.modelTask;
      stopModel();
      emit({
        stage: "checks",
        awaitingLanguageDecision: false,
        screeningAttempt: { status: "canceled", stage: task, message: "AI checks skipped. The standard results and any earlier AI results are shown." },
        message:
          "AI checks skipped. The standard results and any earlier AI results are shown.",
        progress: null,
        imagePreviews: null,
        modelTask: null,
      });
    },
    takeOwnership() {
      stopAnalysis();
      stopModel();
      services.calibration?.cancel();
      emit({ analysisBusy: false });
    },
    clearBatch() {
      if (state.batchId) {
        cancelAuxiliary();
        emit({
          file: null,
          report: null,
          batchId: null,
          screeningAttempt: null,
          sourceKey: ++job,
          languageAssumption: null,
          awaitingLanguageDecision: false,
          reviewCursor: { category: "problems", issueId: null },
        });
      }
    },
    openCompletedReport(completed, file, id) {
      stopAnalysis();
      stopModel();
      cancelAuxiliary();
      const report = structuredClone(completed);
      emit({
        report,
        file,
        batchId: id,
        screeningAttempt: null,
        sourceKey: job,
        example: null,
        languageAssumption: null,
        awaitingLanguageDecision: false,
        reviewCursor: { category: "problems", issueId: null },
        selectedModel: report.screeningSelection?.modelId || null,
        checks: report.screeningSelection?.checks || [
          "title",
          "subject",
          "keywords",
          "sections",
        ],
        analysisBusy: false,
        stage: "review",
        progress: null,
        message: "Retained batch attempt opened without repeating analysis.",
      });
    },
    async analyze(file, example = null, policy = null) {
      if (!available()) return;
      if (!state.setupComplete && !policy) {
        deferIntake(useAI => controller.analyze(file, example, { useAI }), file.name);
        return;
      }
      const automaticAI = policy ? policy.useAI : state.aiEnabled;
      cancelAuxiliary();
      stopAnalysis();
      stopModel();
      const currentJob = job;
      emit({
        file,
        example,
        batchId: null,
        screeningAttempt: null,
        modelTask: null,
        imagePreviews: null,
        sourceKey: currentJob,
        report: null,
        reviewCursor: { category: "problems", issueId: null },
        selectedModel: automaticAI ? "granite-r2" : null,
        checks: [...defaultChecks],
        languageAssumption: null,
        awaitingLanguageDecision: false,
        message: "Preparing local analysis…",
        progress: null,
        stage: "processing-analysis",
        analysisBusy: true,
      });
      if (file.size > 50 * 1024 * 1024) {
        emit({
          analysisBusy: false,
          stage: "document",
          message: "This file exceeds the 50 MB limit. Choose a smaller PDF.",
        });
        return;
      }
      try {
        const buffer = await file.arrayBuffer();
        let hash = null;
        try {
          hash = Array.from(new Uint8Array(await digest(buffer)), (b) =>
            b.toString(16).padStart(2, "0"),
          ).join("");
        } catch {
          /* Hash absence does not establish identity. */
        }
        if (currentJob !== job) return;
        const worker = workerFactory("analysis");
        analysisWorker = worker;
        const active = () => currentJob === job && analysisWorker === worker;
        const fail = (message) => {
          if (!active()) return;
          worker.terminate();
          analysisWorker = null;
          emit({
            analysisBusy: false,
            stage: "document",
            message,
            error: true,
          });
        };
        worker.onerror = (e) =>
          fail(
            `Analysis could not start: ${e.message || "worker unavailable"}.`,
          );
        worker.onmessage = ({ data }) => {
          if (!active()) return;
          if (data.type === "progress")
            emit({ progress: data.progress, message: data.progress.phase });
          else if (data.type === "error") fail(data.message);
          else if (data.type === "result") {
            const report = data.report;
            report.file = {
              ...report.file,
              sourceBytes: file.size,
              ...(hash ? { sha256: hash } : {}),
            };
            worker.terminate();
            analysisWorker = null;
            emit({
              report, selectedModel: automaticAI ? "granite-r2" : null,
              analysisBusy: false, error: false, stage: "review", progress: null, awaitingLanguageDecision: false,
              message: "Standard checks complete.",
            });
            if (automaticAI && currentJob === job && state.report === report) controller.requestAIComparisons();
          }
        };
        worker.postMessage({ buffer, fileName: file.name }, [buffer]);
      } catch (e) {
        if (currentJob === job) {
          analysisWorker?.terminate();
          analysisWorker = null;
          emit({
            analysisBusy: false,
            stage: "document",
            message: e.message,
            error: true,
          });
        }
      }
    },
    async loadSample(path, policy = null) {
      if (!available()) return;
      if (!state.setupComplete && !policy) {
        deferIntake(useAI => controller.loadSample(path, { useAI }), path.split("/").at(-1));
        return;
      }
      cancelAuxiliary();
      stopAnalysis();
      stopModel();
      const currentJob = job;
      emit({
        stage: "processing-analysis",
        analysisBusy: true,
        report: null,
        file: null,
        example: null,
        batchId: null,
        screeningAttempt: null,
        modelTask: null,
        imagePreviews: null,
        sourceKey: currentJob,
        reviewCursor: { category: "problems", issueId: null },
        message: "Loading the example PDF…",
        awaitingLanguageDecision: false,
        languageAssumption: null,
        progress: null,
      });
      try {
        const response = await fetcher(new URL(path, baseUrl));
        if (!response.ok) throw Error("The sample PDF could not be loaded.");
        const blob = await response.blob();
        if (currentJob !== job) return;
        const name = path.split("/").at(-1);
        await controller.analyze(
          new File([blob], name, { type: "application/pdf" }),
          path.includes("/samples/")
            ? state.manifest.find((s) => s.file === name) || null
            : null,
          policy,
        );
      } catch (e) {
        if (currentJob === job)
          emit({
            analysisBusy: false,
            stage: "document",
            message: e.message,
            error: true,
          });
      }
    },
    /** Optional: show the image model graphics marked as decoration that the rules couldn't place. Never overrides the rules. */
    async runImageScreening() {
      if (!available() || !state.aiEnabled || !state.imageAI || !state.report?.analysisComplete || !state.file || state.modelBusy || state.report.imageScreening) return;
      const items = imageCandidates(state.report), described = descriptionCandidates(state.report);
      if (!items.length && described.length < 5) {
        // Say so instead of skipping silently: the person asked for image checks.
        const photos = (state.report.figureAlternatives?.items || []).filter(figure => figure.tagged && figure.alt?.trim()).length;
        emit({ report: { ...state.report, imageScreening: { inferencePerformed: false, skipped: { decorativeUnclear: (state.report.decorative?.items || []).filter(item => item.kind === 'unclear').length, describedImages: photos } } } });
        return;
      }
      const currentJob = job, currentRun = ++modelRun, abort = new AbortController();
      const sourceFile = state.file, sourceReport = state.report;
      imageAbort = abort;
      const active = () => currentJob === job && currentRun === modelRun;
      emit({ modelBusy: true, modelTask: "image", stage: "processing-model", screeningAttempt: { status: "running" }, message: `Looking at ${items.length + described.length} image${items.length + described.length === 1 ? "" : "s"}…`, progress: null });
      const fail = message => {
        if (!active()) return;
        abort.abort(); stopModel();
        emit({ stage: "review", modelTask: null, screeningAttempt: { status: "error", stage: "image", message }, message: `The image check didn’t finish: ${message}. All other results are unchanged.`, progress: null, imagePreviews: null });
      };
      let crops, descriptionCrops;
      try {
        crops = await imageCropper(sourceFile, sourceReport, items, abort.signal);
        if (!active()) return;
        // Described images reuse the cropper; their crops carry the description to compare.
        const pictures = await imageCropper(sourceFile, sourceReport, described.map((item, index) => ({ ...item, index })), abort.signal);
        descriptionCrops = pictures.map(crop => ({ ...described[crop.index], blob: crop.blob }));
      } catch (e) { fail(e.message); return; }
      if (!active()) return;
      if (!crops.length && descriptionCrops.length < 5) {
        imageAbort = null;
        const message = described.length ? `Only ${descriptionCrops.length} safe photo crops were available; at least five are needed. No image model was started.` : "No safe graphic crops were available. No image model was started.";
        emit({ report: { ...state.report, imageScreening: { inferencePerformed: false, skipped: { availableDescriptionCrops: descriptionCrops.length, descriptionCandidates: described.length, graphicCandidates: items.length } } },
          screeningAttempt: { status: "not-run", message }, modelBusy: false, modelTask: null, stage: "review", progress: null, message });
        return;
      }
      // The crops already exist here; the waiting screen shows them passing as the worker reports each one done (same order).
      emit({ imagePreviews: [...crops, ...descriptionCrops].map(crop => crop.blob) });
      let worker;
      try { worker = workerFactory("image"); } catch (e) { fail(e.message); return; }
      modelWorker = worker;
      worker.onerror = e => fail(e.message || "Image worker failed");
      worker.onmessage = ({ data }) => {
        if (!active() || modelWorker !== worker || data.requestId !== currentRun) return;
        if (data.type === "progress") emit({ message: data.message, progress: data.progress || null });
        else if (data.type === "error") fail(data.message);
        else if (data.type === "result") {
          worker.terminate(); modelWorker = null; imageAbort = null;
          const usable = data.imageScreening.execution?.usableDescriptions;
          const noInference = Number.isInteger(usable) ? `Only ${usable} usable photo crops remained; at least five are needed. No image model inference was performed.` : "No image model inference was performed; see image coverage for the available evidence.";
          emit({ report: { ...state.report, imageScreening: data.imageScreening }, screeningAttempt: data.imageScreening.inferencePerformed ? { status: "completed" } : { status: "not-run", stage: "image", message: noInference }, modelBusy: false, modelTask: null, stage: "review", progress: null, imagePreviews: null,
            message: "Image check complete. The rule-based results are unchanged." });
        }
      };
      try { worker.postMessage({ requestId: currentRun, items: crops, descriptions: descriptionCrops.map(({ id, page, alt, blob }) => ({ id, page, alt, blob })) }); } catch (e) { fail(e.message); }
    },
    requestAIComparisons() {
      if (!state.aiEnabled || !state.selectedModel || !state.report || state.modelBusy || state.calibrationBusy) return;
      const availability = screeningAvailability(state.report, { modelId: state.selectedModel, checks: state.checks, languageAssumption: state.languageAssumption });
      if (availability.textAvailable && availability.missingLanguage) {
        emit({ awaitingLanguageDecision: true });
        // Image evidence has its own language policy; defer the requested sequence until the decision.
      } else controller.runScreening();
    },
    runScreening() {
      if (
        !available() ||
        !state.aiEnabled ||
        state.selectedModel !== "granite-r2" ||
        !state.report ||
        state.modelBusy ||
        state.calibrationBusy ||
        !state.selectedModel ||
        !state.checks.length
      )
        return;
      if (hasUnchangedNoInputs(state.report, { modelId: state.selectedModel, checks: state.checks, languageAssumption: state.languageAssumption })) {
        controller.runImageScreening();
        return;
      }
      const availability = screeningAvailability(state.report, { modelId: state.selectedModel, checks: state.checks, languageAssumption: state.languageAssumption, requireInference: state.aiEnabled });
      if (!availability.textAvailable || !availability.languageSupported) {
        const semantic = availability.noInputResult;
        emit({ ...(semantic ? { report: { ...state.report, semantic: { ...semantic, assessment: semantic.title }, screeningSelection: { modelId: state.selectedModel, checks: [...state.checks], languageAssumption: state.languageAssumption } } } : {}), screeningAttempt: { status: "not-run", message: semantic?.notRun?.reason || "No eligible text comparisons were recovered.", reasons: semantic?.notRun?.checks || [] }, stage: "review" });
        controller.runImageScreening();
        return;
      }
      const currentJob = job,
        currentRun = ++modelRun,
        report = {
          ...state.report,
          screeningSelection: {
            modelId: state.selectedModel,
            checks: [...state.checks],
            languageAssumption: state.languageAssumption,
          },
        };
      let worker;
      try {
        worker = workerFactory("model");
      } catch (e) {
        emit({
          stage: "checks",
          modelBusy: false,
          screeningAttempt: { status: "error", message: e.message },
          message: `Semantic screening unavailable: ${e.message}. Traditional results are retained.`,
        });
        return;
      }
      modelWorker = worker;
      const active = () =>
        currentJob === job && currentRun === modelRun && modelWorker === worker;
      emit({
        report,
        stage: "processing-model",
        modelBusy: true,
        modelTask: "text",
        screeningAttempt: { status: "running" },
        message: "Preparing the selected checks…",
        progress: null,
      });
      const fail = (message, detail = {}) => {
        if (!active()) return;
        stopModel();
        emit({
          stage: "checks",
          modelTask: null,
          screeningAttempt: { status: "error", message, stage: detail.stage || null, code: detail.code || null },
          message: `Semantic screening unavailable: ${message}. Traditional results and any previous completed screening are retained.`,
          progress: null,
        });
      };
      worker.onerror = (e) => fail(e.message || "Model worker failed");
      worker.onmessage = ({ data }) => {
        if (!active() || data.requestId !== currentRun) return;
        if (data.type === "progress")
          emit({ message: data.message, progress: data.progress || null });
        else if (data.type === "error") fail(data.message, data);
        else if (data.type === "result") {
          worker.terminate();
          modelWorker = null;
          emit({
            report: { ...state.report, semantic: data.semantic },
            screeningAttempt: data.semantic.inferencePerformed ? { status: "completed" } : { status: "not-run", message: data.semantic.notRun?.reason || "The model found no eligible comparisons in the selected checks.", reasons: data.semantic.notRun?.checks || [] },
            modelBusy: false,
            modelTask: null,
            stage: state.aiEnabled && !data.semantic.inferencePerformed ? "checks" : "review",
            message: state.aiEnabled && !data.semantic.inferencePerformed
              ? "AI could not compare the selected checks with available evidence. Inspect the partial results or change the screening checks; no completed AI evaluation is claimed."
              : "Screening complete. Structural acceptance and traditional metadata findings are unchanged.",
            progress: null,
          });
          controller.runImageScreening();
        }
      };
      try {
        worker.postMessage(
          buildScreeningRequest(report, {
            requestId: currentRun,
            modelId: state.selectedModel,
            checks: [...state.checks],
            languageAssumption: state.languageAssumption,
            requireInference: state.aiEnabled,
            semanticExperiment,
          }),
        );
      } catch (e) {
        fail(e.message);
      }
    },
  };
  return controller;
}
