import { createDevicePreferences } from '../calibration/preferences.js';
import { createEvaluationPreferences } from './preferences.js';
import { hasUnchangedNoInputs } from "../runtime/screening-recovery.js";
import { buildScreeningRequest } from "../runtime/screening-request.js";
import { getSemanticModel, supportsLanguage, resolveScreeningLanguage } from "../engine/models.js";
/** DOM-free single-source owner. Construction does not fetch, create workers, or start inference. */
export function createAppController({
  workerFactory = (kind) =>
    kind === "analysis"
      ? new Worker(new URL("../analysis.worker.js", import.meta.url), {
          type: "module",
        })
      : new Worker(new URL("../model.worker.js", import.meta.url), {
          type: "module",
        }),
  fetcher = (...args) => fetch(...args),
  digest = (buffer) => crypto.subtle.digest("SHA-256", buffer),
  preferences = createEvaluationPreferences(),
  devicePreferences = createDevicePreferences(),
  semanticExperiment = false,
  baseUrl = globalThis.document?.baseURI || "http://localhost/",
} = {}) {
  const saved = preferences.load();
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
    evaluationModel: saved ? saved.modelId : "granite-r2",
    setupDestination: "document",
    pendingSetupLabel: null,
    selectedModel: saved?.modelId || null,
    languageAssumption: null,
    awaitingLanguageDecision: false,
    checks: saved?.checks || ["title", "subject", "keywords", "sections"],
    message: "",
    progress: null,
    analysisBusy: false,
    modelBusy: false,
    screeningAttempt: null,
    calibrationBusy: false,
    manifest: [],
    manifestError: false,
    reviewed: new Set(),
    reviewCursor: { category: "problems", issueId: null },
  };
  let pendingIntake = null;
  let job = 0,
    modelRun = 0,
    analysisWorker = null,
    modelWorker = null,
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
    services.exports?.cancel("Source changed; any active export was canceled.");
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
    if (state.setupComplete) emit({ settingsSaved: preferences.save({ modelId: state.evaluationModel, checks: state.checks }) });
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
        patch.batch.setSettings({ useAI: state.aiEnabled, modelId: state.evaluationModel || "minilm", checks: [...state.checks] });
        patch.batch.setConsent(state.aiEnabled);
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
      if (state.setupComplete) controller.go(stage);
      else emit({ setupDestination: stage, stage: "setup" });
    },
    openSetup(stage = state.stage) {
      pendingIntake = null;
      emit({ setupDestination: stage === "welcome" ? "document" : stage, pendingSetupLabel: null, stage: "setup" });
    },
    resetSetup() {
      if (state.analysisBusy || state.modelBusy || state.calibrationBusy || services.batch?.busy) return false;
      pendingIntake = null;
      stopModel();
      services.calibration?.cancel();
      const settingsCleared = preferences.clear?.();
      const benchmarksCleared = devicePreferences.clear();
      services.batch?.releaseIdleWorkers();
      services.batch?.setSettings({ useAI: false, modelId: "minilm", checks: ["title", "subject", "keywords", "sections"] });
      services.batch?.setConsent(false);
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
      const start = () => {
        if (selection.length === 1) return controller.analyze(selection[0]);
        services.batch?.add(selection);
        controller.go("batch");
      };
      if (state.setupComplete) return start();
      pendingIntake = start;
      emit({ stage: "setup", setupDestination: "document", pendingSetupLabel: selection.length === 1 ? selection[0].name : `${selection.length} PDFs` });
    },
    selectSample(path) {
      if (!available()) return;
      if (state.setupComplete) return controller.loadSample(path);
      pendingIntake = () => controller.loadSample(path);
      emit({ stage: "setup", setupDestination: "document", pendingSetupLabel: path.split("/").at(-1) });
    },
    completeSetup(modelId) {
      const useAI = modelId !== null;
      if (useAI) getSemanticModel(modelId);
      services.batch?.setSettings({ useAI, modelId: modelId || "minilm", checks: [...state.checks] });
      services.batch?.setConsent(useAI);
      emit({ setupComplete: true, aiEnabled: useAI, evaluationModel: modelId, selectedModel: modelId, stage: state.setupDestination, awaitingLanguageDecision: false });
      saveSettings();
      const start = pendingIntake;
      pendingIntake = null;
      emit({ pendingSetupLabel: null });
      if (start) { start(); return; }
      if (useAI && ["checks", "review"].includes(state.stage) && state.report) {
        const lang = state.languageAssumption || state.report.metadata?.language;
        if (supportsLanguage(getSemanticModel(modelId), lang)) {
          controller.runScreening();
        } else if (!state.report.metadata?.language || !String(state.report.metadata.language).trim()) {
          emit({ awaitingLanguageDecision: true });
        }
      }
    },
    setModel(modelId) {
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
      resolveScreeningLanguage(state.report.metadata.language, languageAssumption);
      stopModel();
      services.calibration?.cancel();
      const selectedModel = state.selectedModel || (languageAssumption ? "minilm" : null);
      emit({
        languageAssumption,
        selectedModel,
        awaitingLanguageDecision: false,
        report: {
          ...state.report,
          screeningSelection: { modelId: selectedModel, checks: [...state.checks], languageAssumption },
        },
      });
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
    markReviewed(id) {
      const reviewed = new Set(state.reviewed);
      reviewed.has(id) ? reviewed.delete(id) : reviewed.add(id);
      emit({ reviewed });
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
          "Analysis canceled. Your selected file is retained; retry or choose another PDF.",
      });
    },
    cancelScreening() {
      stopModel();
      emit({
        stage: "checks",
        awaitingLanguageDecision: false,
        screeningAttempt: { status: "canceled", message: "You canceled the AI checks. Completed text checks and previous AI results are retained." },
        message:
          "AI screening canceled. Traditional results and any previous completed screening are retained.",
        progress: null,
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
          reviewed: new Set(),
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
        reviewed: new Set(),
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
    async analyze(file, example = null) {
      if (!available()) return;
      cancelAuxiliary();
      stopAnalysis();
      stopModel();
      const currentJob = job;
      emit({
        file,
        example,
        batchId: null,
        screeningAttempt: null,
        sourceKey: currentJob,
        report: null,
        reviewed: new Set(),
        reviewCursor: { category: "problems", issueId: null },
        selectedModel: null,
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
            let selectedModel = null;
            if (supportsLanguage(getSemanticModel("minilm"), report.metadata.language))
              selectedModel = "minilm";
            else if (
              supportsLanguage(
                getSemanticModel("granite-r2"),
                report.metadata.language,
              )
            )
              selectedModel = "granite-r2";
            worker.terminate();
            analysisWorker = null;
            const isMissingLanguage = !report.metadata?.language || !String(report.metadata.language).trim();
            const willAwaitDecision = Boolean(state.aiEnabled && isMissingLanguage && !state.languageAssumption);
            emit({
              report,
              selectedModel: state.setupComplete ? state.evaluationModel : selectedModel,
              analysisBusy: false,
              error: false,
              stage: state.setupComplete && !state.aiEnabled ? "review" : "checks",
              message: willAwaitDecision
                ? "Text checks completed. AI is waiting for the document language."
                : "Analysis complete. Your file was processed locally.",
              progress: null,
              awaitingLanguageDecision: willAwaitDecision,
            });
            if (state.aiEnabled && supportsLanguage(getSemanticModel(state.selectedModel), report.metadata.language)) {
              controller.runScreening();
            } else if (state.aiEnabled && !willAwaitDecision) {
              emit({ message: "Text checks completed. AI screening needs a supported language before this evaluation can finish." });
            }
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
    async loadSample(path) {
      if (!available()) return;
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
        sourceKey: currentJob,
        reviewed: new Set(),
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
    runScreening() {
      if (
        !available() ||
        !state.report ||
        state.modelBusy ||
        state.calibrationBusy ||
        !state.selectedModel ||
        !state.checks.length ||
        hasUnchangedNoInputs(state.report, { modelId: state.selectedModel, checks: state.checks, languageAssumption: state.languageAssumption })
      )
        return;
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
        screeningAttempt: { status: "running" },
        message: "Preparing the selected checks…",
        progress: null,
      });
      const fail = (message, detail = {}) => {
        if (!active()) return;
        stopModel();
        emit({
          stage: "checks",
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
            stage: state.aiEnabled && !data.semantic.inferencePerformed ? "checks" : "review",
            message: state.aiEnabled && !data.semantic.inferencePerformed
              ? "AI could not compare the selected checks with available evidence. Inspect the partial results or change the screening checks; no completed AI evaluation is claimed."
              : "Screening complete. Structural acceptance and traditional metadata findings are unchanged.",
            progress: null,
          });
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
