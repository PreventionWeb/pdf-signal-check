import { it, expect, vi } from "vitest";
import { createAppController } from "../src/app/controller.js";
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};
const report = () => ({
  accepted: true,
  analysisComplete: true,
  file: { name: "source.pdf" },
  metadata: { language: "en" },
  metadataConsistency: { candidates: [] },
  checks: [],
  pages: [],
});
const file = (name = "source.pdf") => ({
  name,
  size: 4,
  arrayBuffer: vi.fn(async () => new Uint8Array([1, 2, 3, 4]).buffer),
});
const fakeWorker = () => ({ terminate: vi.fn(), postMessage: vi.fn() });
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
function setup(options = {}) {
  const workers = [],
    workerFactory = vi.fn((kind) => {
      const worker = fakeWorker();
      workers.push({ kind, worker });
      return worker;
    });
  const fetcher = vi.fn();
  const digest = vi.fn(async () => new Uint8Array([10, 11]).buffer);
  const app = createAppController({
    workerFactory,
    fetcher,
    digest,
    baseUrl: "http://localhost/pdf-signal-check/",
    ...options,
  });
  return { app, workers, workerFactory, fetcher, digest };
}

it("constructs and changes preferences without fetches, workers or model downloads; snapshots stay cached", () => {
  const { app, workerFactory, fetcher } = setup(),
    listener = vi.fn(),
    unsubscribe = app.subscribe(listener);
  expect(app.getSnapshot()).toBe(app.getSnapshot());
  app.setModel("granite-r2");
  app.setChecks(["title"]);
  expect(workerFactory).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
  expect(listener).toHaveBeenCalledTimes(2);
  unsubscribe();
  app.setChecks(["keywords"]);
  expect(listener).toHaveBeenCalledTimes(2);
  app.dispose();
});

it("records a source-scoped English assumption, preserves the language defect, and requires a separate run", async () => {
  const { app, workers, workerFactory, fetcher } = setup();
  const missing = { ...report(), accepted: false, metadata: { language: null }, checks: [{ id: "language", status: "fail" }] };
  app.openCompletedReport(missing, file(), "missing-language");
  app.setLanguageAssumption("en");
  expect(workerFactory).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
  expect(app.getSnapshot().selectedModel).toBe("minilm");
  expect(app.getSnapshot().report.metadata.language).toBe(null);
  expect(app.getSnapshot().report.accepted).toBe(false);
  expect(app.getSnapshot().report.checks[0].status).toBe("fail");
  app.runScreening();
  const request = workers[0].worker.postMessage.mock.calls[0][0];
  expect(request.languageAssumption).toBe("en");
  expect(request.metadata.language).toBe(null);
  expect(app.getSnapshot().report.screeningSelection.languageAssumption).toBe("en");
  const stale = workers[0].worker.onmessage;
  app.setLanguageAssumption(null);
  expect(workers[0].worker.terminate).toHaveBeenCalled();
  stale({ data: { type: "result", requestId: request.requestId, semantic: { stale: true } } });
  expect(app.getSnapshot().report.semantic).toBeUndefined();
  app.setLanguageAssumption("en");
  await app.analyze(file("another.pdf"));
  expect(app.getSnapshot().languageAssumption).toBe(null);
  app.openCompletedReport(report(), file(), "declared-language");
  expect(() => app.setLanguageAssumption("en")).toThrow("only when the PDF language is missing");
  expect(app.getSnapshot().report.metadata.language).toBe("en");
  app.dispose();
});

it("invalidates disposed manifest requests before remount and aborts the old request", async () => {
  const old = deferred(),
    fresh = deferred(),
    fetcher = vi
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(fresh.promise),
    { app } = setup({ fetcher });
  app.mount();
  const oldSignal = fetcher.mock.calls[0][1].signal;
  app.dispose();
  expect(oldSignal.aborted).toBe(true);
  app.mount();
  fresh.resolve({
    ok: true,
    json: async () => ({ samples: [{ file: "fresh.pdf" }] }),
  });
  await flush();
  expect(app.getSnapshot().manifest).toEqual([{ file: "fresh.pdf" }]);
  old.resolve({
    ok: true,
    json: async () => ({ samples: [{ file: "stale.pdf" }] }),
  });
  await flush();
  expect(app.getSnapshot().manifest).toEqual([{ file: "fresh.pdf" }]);
  app.dispose();
});

it("discards a stale sample response after selecting another source", async () => {
  const sample = deferred(),
    { app, workers } = setup({ fetcher: () => sample.promise });
  const loading = app.loadSample("./calibration/example.pdf");
  const selected = file("selected.pdf");
  await app.analyze(selected);
  sample.resolve({ ok: true, blob: async () => new Blob(["sample"]) });
  await loading;
  expect(app.getSnapshot().file).toBe(selected);
  expect(workers).toHaveLength(1);
  expect(workers[0].kind).toBe("analysis");
  app.dispose();
});

it("guards delayed source digests and terminated analysis callbacks", async () => {
  const oldDigest = deferred(),
    digest = vi
      .fn()
      .mockReturnValueOnce(oldDigest.promise)
      .mockResolvedValueOnce(new Uint8Array([20]).buffer),
    { app, workers } = setup({ digest });
  const oldTask = app.analyze(file("old.pdf")),
    fresh = file("fresh.pdf");
  await Promise.resolve();
  await app.analyze(fresh);
  expect(workers).toHaveLength(1);
  oldDigest.resolve(new Uint8Array([10]).buffer);
  await oldTask;
  expect(workers).toHaveLength(1);
  const worker = workers[0].worker,
    stale = worker.onmessage;
  await app.analyze(file("next.pdf"));
  expect(worker.terminate).toHaveBeenCalled();
  stale({ data: { type: "result", report: report() } });
  expect(app.getSnapshot().file.name).toBe("next.pdf");
  expect(app.getSnapshot().report).toBe(null);
  app.dispose();
});

it("captures source bytes/hash, keeps completed batch report detached, and scopes review to each attempt", async () => {
  const { app, workers } = setup(),
    source = file();
  await app.analyze(source);
  workers[0].worker.onmessage({ data: { type: "result", report: report() } });
  expect(app.getSnapshot().report.file).toMatchObject({
    sourceBytes: 4,
    sha256: "0a0b",
  });
  expect(app.getSnapshot().selectedModel).toBe("minilm");
  app.markReviewed("finding");
  const sourceKey = app.getSnapshot().sourceKey;
  const retained = report();
  app.openCompletedReport(retained, source, "batch-source");
  retained.file.name = "changed";
  expect(app.getSnapshot().report.file.name).toBe("source.pdf");
  expect(app.getSnapshot().sourceKey).not.toBe(sourceKey);
  expect(app.getSnapshot().reviewed.size).toBe(0);
  app.dispose();
});

it("rejects model responses with stale nonces and releases screening on source changes", async () => {
  const { app, workers } = setup();
  app.openCompletedReport(report(), file(), "batch");
  app.setModel("minilm");
  app.runScreening();
  const worker = workers[0].worker,
    request = worker.postMessage.mock.calls[0][0];
  worker.onmessage({
    data: {
      type: "result",
      requestId: request.requestId + 1,
      semantic: { wrong: true },
    },
  });
  expect(app.getSnapshot().modelBusy).toBe(true);
  expect(app.getSnapshot().report.semantic).toBeUndefined();
  const stale = worker.onmessage;
  app.cancelScreening();
  app.runScreening();
  const current = workers[1].worker,
    currentRequest = current.postMessage.mock.calls[0][0];
  stale({
    data: {
      type: "result",
      requestId: request.requestId,
      semantic: { stale: true },
    },
  });
  expect(app.getSnapshot().report.semantic).toBeUndefined();
  current.onmessage({
    data: {
      type: "result",
      requestId: currentRequest.requestId,
      semantic: { completed: true },
    },
  });
  expect(app.getSnapshot().report.semantic).toEqual({ completed: true });
  expect(current.terminate).toHaveBeenCalled();
  app.runScreening();
  const last = workers[2].worker;
  await app.analyze(file("new.pdf"));
  expect(last.terminate).toHaveBeenCalled();
  expect(app.getSnapshot().report).toBe(null);
  app.dispose();
});

it("keeps traditional results when model bootstrap or postMessage fails and cleans workers", () => {
  const worker = fakeWorker(),
    factory = vi
      .fn()
      .mockImplementationOnce(() => {
        throw Error("Bootstrap failed");
      })
      .mockReturnValueOnce(worker),
    { app } = setup({ workerFactory: factory });
  app.openCompletedReport(report(), file(), "batch");
  app.setModel("minilm");
  app.runScreening();
  expect(app.getSnapshot().modelBusy).toBe(false);
  expect(app.getSnapshot().report.accepted).toBe(true);
  expect(app.getSnapshot().message).toContain("Bootstrap failed");
  worker.postMessage.mockImplementation(() => {
    throw Error("Transfer failed");
  });
  app.runScreening();
  expect(worker.terminate).toHaveBeenCalled();
  expect(app.getSnapshot().modelBusy).toBe(false);
  expect(app.getSnapshot().report.accepted).toBe(true);
  expect(app.getSnapshot().message).toContain("Transfer failed");
  app.dispose();
});

it("cleans source workers and auxiliary resources when disposed and ignores late completions", async () => {
  const { app, workers } = setup(),
    exports = { cancel: vi.fn() },
    calibration = { cancel: vi.fn() };
  app.bindServices({ exports, calibration });
  await app.analyze(file());
  const worker = workers[0].worker,
    stale = worker.onmessage;
  app.dispose();
  const state = app.getSnapshot();
  expect(worker.terminate).toHaveBeenCalled();
  expect(exports.cancel).toHaveBeenCalled();
  expect(calibration.cancel).toHaveBeenCalled();
  stale({ data: { type: "result", report: report() } });
  expect(app.getSnapshot()).toBe(state);
});

it("allows retained report inspection but blocks separate analysis and screening while the batch owner is busy", async () => {
  const { app, workerFactory } = setup(),
    batch = { busy: true, releaseIdleWorkers: vi.fn() };
  app.bindServices({ batch });
  app.openCompletedReport(report(), file(), "retained");
  app.setModel("minilm");
  app.runScreening();
  await app.analyze(file("separate.pdf"));
  expect(workerFactory).not.toHaveBeenCalled();
  expect(app.getSnapshot().batchId).toBe("retained");
  expect(app.getSnapshot().report.accepted).toBe(true);
  expect(app.getSnapshot().message).toContain("Stop the active queue");
  app.dispose();
});

it("setup consent enables automatic model screening without silently changing the chosen model", async () => {
  const { app, workers, workerFactory } = setup();
  app.beginEvaluation();
  expect(app.getSnapshot().stage).toBe('setup');
  expect(workerFactory).not.toHaveBeenCalled();
  app.completeSetup('granite-r2');
  await app.analyze(file());
  workers[0].worker.onmessage({ data: { type: 'result', report: report() } });
  expect(workers[1].kind).toBe('model');
  expect(workers[1].worker.postMessage.mock.calls[0][0]).toMatchObject({ modelId: 'granite-r2', requireInference: true });
  expect(app.getSnapshot().stage).toBe('processing-model');
  app.dispose();
});

it("automatic screening pauses for missing language and keeps the PDF defect", async () => {
  const { app, workers } = setup();
  app.completeSetup('minilm');
  await app.analyze(file());
  workers[0].worker.onmessage({ data: { type: 'result', report: { ...report(), accepted: false, metadata: { language: null } } } });
  expect(workers).toHaveLength(1);
  expect(app.getSnapshot()).toMatchObject({ stage: 'checks', selectedModel: 'minilm', languageAssumption: null });
  app.setLanguageAssumption('en');
  app.runScreening();
  expect(workers[1].worker.postMessage.mock.calls[0][0]).toMatchObject({ languageAssumption: 'en', requireInference: true });
  expect(app.getSnapshot().report.accepted).toBe(false);
  app.dispose();
});

it('an explicit no-model setup persists for this session and runs no model worker', async () => {
  const { app, workers } = setup();
  const batch = { setSettings: vi.fn(), setConsent: vi.fn(), releaseIdleWorkers: vi.fn() };
  app.bindServices({ batch });
  app.beginEvaluation();
  app.completeSetup(null);
  expect(app.getSnapshot()).toMatchObject({ setupComplete: true, aiEnabled: false, selectedModel: null });
  expect(batch.setSettings).toHaveBeenCalledWith({ useAI: false, modelId: 'minilm', checks: ['title', 'subject', 'keywords'] });
  expect(batch.setConsent).toHaveBeenCalledWith(false);
  app.go('welcome'); app.beginEvaluation();
  expect(app.getSnapshot().stage).toBe('document');
  await app.analyze(file());
  workers[0].worker.onmessage({ data: { type: 'result', report: report() } });
  expect(workers).toHaveLength(1);
  expect(app.getSnapshot()).toMatchObject({ stage: 'review', selectedModel: null });
  app.dispose();
});
