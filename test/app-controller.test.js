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
  metadata: { language: "en", subject: "Flood preparedness guidance" },
  metadataConsistency: { candidates: [] },
  checks: [],
  pages: [{ number: 1, logicalBlocks: [], blocks: [{ id: 0, text: "Flood preparedness includes monitoring water levels, preparing equipment, and training local responders to protect communities." }] }],
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
function setup({ confirmSetup = true, ...options } = {}) {
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
  if (confirmSetup) app.completeSetup("granite-r2");
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
  expect(listener).toHaveBeenCalledTimes(4);
  unsubscribe();
  app.setChecks(["keywords"]);
  expect(listener).toHaveBeenCalledTimes(4);
  app.dispose();
});

it("records a source-scoped English assumption, preserves the language defect, and resumes the requested comparisons", async () => {
  const { app, workers, workerFactory, fetcher } = setup();
  const missing = { ...report(), accepted: false, metadata: { ...report().metadata, language: null }, checks: [{ id: "language", status: "fail" }] };
  app.openCompletedReport(missing, file(), "missing-language");
  app.promptLanguageDecision();
  app.setLanguageAssumption("en");
  expect(workers).toHaveLength(1);
  expect(fetcher).not.toHaveBeenCalled();
  expect(app.getSnapshot().selectedModel).toBe("granite-r2");
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
  expect(app.getSnapshot().selectedModel).toBe("granite-r2");
  const sourceKey = app.getSnapshot().sourceKey;
  const retained = report();
  app.openCompletedReport(retained, source, "batch-source");
  retained.file.name = "changed";
  expect(app.getSnapshot().report.file.name).toBe("source.pdf");
  expect(app.getSnapshot().sourceKey).not.toBe(sourceKey);
  app.dispose();
});

it("rejects model responses with stale nonces and releases screening on source changes", async () => {
  const { app, workers } = setup();
  app.openCompletedReport(report(), file(), "batch");
  app.setModel("granite-r2");
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
  app.setModel("granite-r2");
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
    batch = { busy: true, releaseIdleWorkers: vi.fn(), setSettings: vi.fn(), setConsent: vi.fn() };
  app.bindServices({ batch });
  app.openCompletedReport(report(), file(), "retained");
  app.setModel("granite-r2");
  app.runScreening();
  await app.analyze(file("separate.pdf"));
  expect(workerFactory).not.toHaveBeenCalled();
  expect(app.getSnapshot().batchId).toBe("retained");
  expect(app.getSnapshot().report.accepted).toBe(true);
  expect(app.getSnapshot().message).toContain("Stop the active queue");
  app.dispose();
});

it("confirmed setup automatically runs Granite after each completed standard result", async () => {
  const { app, workers, workerFactory } = setup();
  app.openSetup();
  expect(app.getSnapshot().stage).toBe('setup');
  expect(workerFactory).not.toHaveBeenCalled();
  app.completeSetup('granite-r2');
  await app.analyze(file());
  workers[0].worker.onmessage({ data: { type: 'result', report: report() } });
  expect(workers).toHaveLength(2);
  expect(workers[1].kind).toBe('model');
  expect(workers[1].worker.postMessage.mock.calls[0][0]).toMatchObject({ modelId: 'granite-r2', requireInference: true });
  expect(app.getSnapshot().stage).toBe('processing-model');
  app.dispose();
});

it.each([false, true])('explicit setup from skipped-intake results requests AI with separate image permission %s', async imageAI => {
  const imageCropper = vi.fn(async (_file, _report, items) => items.map(item => ({ ...item, blob: new Blob() })));
  const { app, workers } = setup({ confirmSetup: false, imageCropper });
  const source = file();
  await app.analyze(source);
  expect(workers).toHaveLength(0);
  app.skipSetupForCurrentIntake();
  await flush();
  const standard = report();
  standard.decorative = { items: [{ kind: 'unclear', page: 1, share: 0.3, letters: 0, quad: [[0, 0], [20, 0], [20, 20], [0, 20]] }] };
  workers[0].worker.onmessage({ data: { type: 'result', report: standard } });
  const { sourceKey, report: completed } = app.getSnapshot();
  expect(app.getSnapshot()).toMatchObject({ stage: 'review', aiEnabled: false, pendingSetupLabel: null });
  app.openSetup('review');
  app.cancelSetup();
  expect(workers).toHaveLength(1);
  expect(app.getSnapshot().report).toBe(completed);
  app.openSetup('review');
  app.completeSetup('granite-r2', { imageAI });
  expect(workers.map(item => item.kind)).toEqual(['analysis', 'model']);
  expect(app.getSnapshot()).toMatchObject({ sourceKey, file: source, report: { accepted: true, file: completed.file } });
  const model = workers[1].worker;
  const request = model.postMessage.mock.calls[0][0];
  expect(request).toMatchObject({ modelId: 'granite-r2', requireInference: true });
  model.onmessage({ data: { type: 'result', requestId: request.requestId, semantic: { inferencePerformed: true } } });
  await flush();
  expect(workers.map(item => item.kind)).toEqual(imageAI ? ['analysis', 'model', 'image'] : ['analysis', 'model']);
  expect(imageCropper).toHaveBeenCalledTimes(imageAI ? 2 : 0);
  app.dispose();
});

it('setup with a pending replacement intake waits for its analysis and requests AI once', async () => {
  const { app, workers } = setup({ confirmSetup: false });
  app.openCompletedReport(report(), file('previous.pdf'), 'previous-attempt');
  const replacement = file('replacement.pdf');
  await app.analyze(replacement);
  app.completeSetup('granite-r2');
  await flush();
  expect(workers.map(item => item.kind)).toEqual(['analysis']);
  expect(app.getSnapshot()).toMatchObject({ file: replacement, report: null });
  workers[0].worker.onmessage({ data: { type: 'result', report: report() } });
  expect(workers.map(item => item.kind)).toEqual(['analysis', 'model']);
  app.dispose();
});

it.each(['checks', 'review'])('setup completion in %s preserves source identity and prior receipts on failed rerun', stage => {
  const { app, workers } = setup();
  const retained = report();
  retained.semantic = { inferencePerformed: true, model: { id: 'earlier-receipt' } };
  app.openCompletedReport(retained, file(), 'retained-attempt');
  const { sourceKey, file: source } = app.getSnapshot();
  app.openSetup(stage);
  app.completeSetup('granite-r2');
  expect(workers).toHaveLength(1);
  workers[0].worker.onerror({ message: 'Download unavailable' });
  expect(app.getSnapshot()).toMatchObject({ sourceKey, file: source, batchId: 'retained-attempt', screeningAttempt: { status: 'error' }, report: { accepted: true, semantic: retained.semantic } });
  expect(retained.screeningSelection).toBeUndefined();
  app.dispose();
});

it.each(['absent', 'incomplete', 'document', 'calibration'])('setup completion does not request inference for %s report context', context => {
  const { app, workers } = setup({ confirmSetup: false });
  if (context !== 'absent') app.openCompletedReport({ ...report(), analysisComplete: context !== 'incomplete' }, file(), 'retained');
  if (context === 'calibration') app.calibrationBusy(true);
  app.openSetup(context === 'document' ? 'document' : 'review');
  app.completeSetup('granite-r2', { imageAI: true });
  expect(workers).toHaveLength(0);
  expect(app.getSnapshot().screeningAttempt).toBeNull();
  app.dispose();
});

it.each(['missing', 'unsupported', 'no-input'])('setup on current results retains the %s evidence guard', kind => {
  const { app, workers } = setup({ confirmSetup: false });
  const source = report();
  if (kind === 'missing') source.metadata.language = null;
  if (kind === 'unsupported') source.metadata.language = 'ta';
  if (kind === 'no-input') source.metadata = { language: 'en' };
  app.openCompletedReport(source, file(), 'retained');
  app.openSetup('review');
  app.completeSetup('granite-r2');
  expect(workers).toHaveLength(0);
  if (kind === 'missing') {
    expect(app.getSnapshot().awaitingLanguageDecision).toBe(true);
    expect(app.getSnapshot().report.metadata.language).toBeNull();
    app.setLanguageAssumption('en');
    expect(workers).toHaveLength(1);
  } else {
    expect(app.getSnapshot()).toMatchObject({ screeningAttempt: { status: 'not-run' }, report: { semantic: { inferencePerformed: false } } });
    const receipt = app.getSnapshot().report.semantic;
    app.openSetup('review');
    app.completeSetup('granite-r2');
    expect(workers).toHaveLength(0);
    if (kind === 'no-input') expect(app.getSnapshot().report.semantic).toBe(receipt);
    else expect(app.getSnapshot().report.semantic).toMatchObject({ inferencePerformed: false, notRun: receipt.notRun });
  }
  app.dispose();
});

it('new image permission can run after a retained no-input text receipt without retrying text', async () => {
  const imageCropper = vi.fn(async (_file, _report, items) => items.map(item => ({ ...item, blob: new Blob() })));
  const { app, workers } = setup({ imageCropper });
  const source = report();
  source.metadata = { language: 'en' };
  source.decorative = { items: [{ kind: 'unclear', page: 1, share: 0.3, letters: 0, quad: [[0, 0], [20, 0], [20, 20], [0, 20]] }] };
  app.openCompletedReport(source, file(), 'image-only');
  app.openSetup('review');
  app.completeSetup('granite-r2');
  const receipt = app.getSnapshot().report.semantic;
  expect(receipt).toMatchObject({ inferencePerformed: false, notRun: { code: 'no-comparable-inputs' } });
  expect(workers).toHaveLength(0);
  app.openSetup('review');
  app.completeSetup('granite-r2', { imageAI: true });
  await flush();
  expect(workers.map(item => item.kind)).toEqual(['image']);
  expect(app.getSnapshot().report.semantic).toBe(receipt);
  app.dispose();
});

it("requested screening pauses for missing language and keeps the PDF defect", async () => {
  const { app, workers } = setup();
  app.completeSetup('granite-r2');
  await app.analyze(file());
  workers[0].worker.onmessage({ data: { type: 'result', report: { ...report(), accepted: false, metadata: { ...report().metadata, language: null } } } });
  expect(workers).toHaveLength(1);
  expect(app.getSnapshot()).toMatchObject({ stage: 'review', selectedModel: 'granite-r2', languageAssumption: null, awaitingLanguageDecision: true });
  app.requestAIComparisons();
  expect(app.getSnapshot().awaitingLanguageDecision).toBe(true);
  app.dismissLanguageDecision();
  expect(app.getSnapshot().awaitingLanguageDecision).toBe(false);
  app.promptLanguageDecision();
  expect(app.getSnapshot().awaitingLanguageDecision).toBe(true);
  app.setLanguageAssumption('en');
  expect(app.getSnapshot().awaitingLanguageDecision).toBe(false);
  app.runScreening();
  expect(workers[1].worker.postMessage.mock.calls[0][0]).toMatchObject({ languageAssumption: 'en', requireInference: true });
  expect(app.getSnapshot().report.accepted).toBe(false);
  app.dispose();
});

it('clears a pending language decision while a replacement sample loads and after cancellation', async () => {
  const pending = deferred();
  const { app, workers } = setup({ fetcher: () => pending.promise });
  app.completeSetup('granite-r2');
  await app.analyze(file());
  workers[0].worker.onmessage({ data: { type: 'result', report: { ...report(), metadata: { ...report().metadata, language: null } } } });
  app.requestAIComparisons();
  expect(app.getSnapshot().awaitingLanguageDecision).toBe(true);
  const loading = app.loadSample('./samples/well-prepared.pdf');
  expect(app.getSnapshot()).toMatchObject({ report: null, awaitingLanguageDecision: false, stage: 'processing-analysis' });
  app.cancelAnalysis();
  pending.resolve({ ok: true, blob: async () => new Blob(['sample']) });
  await loading;
  expect(workers).toHaveLength(1);
  expect(app.getSnapshot()).toMatchObject({ report: null, awaitingLanguageDecision: false, stage: 'document' });
  // Cancellation also closes a decision attached to an already completed source.
  app.openCompletedReport({ ...report(), metadata: { ...report().metadata, language: null } }, file(), 'missing');
  app.promptLanguageDecision();
  app.cancelAnalysis();
  expect(app.getSnapshot().awaitingLanguageDecision).toBe(false);
  app.dispose();
});

it('does not create a worker when selected numeric evidence exists only on one page', () => {
  const { app, workerFactory } = setup();
  const source = report();
  source.metadata = { language: 'en' };
  source.pages[0].blocks = [{ id: 0, text: 'Flood monitoring supported 42 countries through the regional programme. Drought monitoring supported 56 countries through the regional programme.' }];
  app.openCompletedReport(source, file(), 'single-page-values');
  app.setModel('granite-r2'); app.runScreening();
  expect(workerFactory).not.toHaveBeenCalled();
  expect(app.getSnapshot().screeningAttempt.status).toBe('not-run');
  expect(app.getSnapshot().report.accepted).toBe(true);
  app.dispose();
});

it('automatically checks every new source once, retaining standard results after Skip AI and ignoring late results', async () => {
  const { app, workers } = setup();
  await app.analyze(file('first.pdf'));
  workers[0].worker.onmessage({ data: { type: 'result', report: report() } });
  const old = workers[1].worker, stale = old.onmessage, request = old.postMessage.mock.calls[0][0];
  expect(request).toMatchObject({ modelId: 'granite-r2', checks: ['title', 'subject', 'keywords', 'sections'], requireInference: true });
  app.cancelScreening();
  expect(app.getSnapshot()).toMatchObject({ modelBusy: false, screeningAttempt: { status: 'canceled' }, report: { accepted: true } });
  app.go('review'); app.go('checks');
  await flush();
  expect(workers).toHaveLength(2);
  await app.analyze(file('second.pdf'));
  stale({ data: { type: 'result', requestId: request.requestId, semantic: { stale: true } } });
  expect(app.getSnapshot().report).toBeNull();
  workers[2].worker.onmessage({ data: { type: 'result', report: report() } });
  expect(workers.map(item => item.kind)).toEqual(['analysis', 'model', 'analysis', 'model']);
  const active = workers[3].worker, activeRequest = active.postMessage.mock.calls[0][0];
  active.onmessage({ data: { type: 'error', requestId: activeRequest.requestId, message: 'Download failed' } });
  expect(app.getSnapshot().report.accepted).toBe(true);
  await flush(); expect(workers).toHaveLength(4);
  app.dispose();
});

it.each(['no-input', 'unsupported'])('retains a %s automatic text skip receipt without starting a model or retrying', async kind => {
  const { app, workers } = setup();
  await app.analyze(file());
  const source = report();
  if (kind === 'no-input') source.metadata = { language: 'en' };
  else source.metadata.language = 'ta';
  workers[0].worker.onmessage({ data: { type: 'result', report: source } });
  expect(workers).toHaveLength(1);
  expect(app.getSnapshot()).toMatchObject({ screeningAttempt: { status: 'not-run' }, report: { accepted: true, semantic: { inferencePerformed: false } } });
  expect(app.getSnapshot().screeningAttempt.message).toBeTruthy();
  app.requestAIComparisons(); await flush();
  expect(workers).toHaveLength(1);
  app.dispose();
});

it('keeps historical model receipts detached and does not automatically rerun an opened report', () => {
  const { app, workers } = setup();
  const source = report();
  source.screeningSelection = { modelId: 'minilm', checks: ['subject'] };
  source.semantic = { model: { id: 'historic-minilm' }, inferencePerformed: true };
  app.openCompletedReport(source, file(), 'historical');
  expect(app.getSnapshot()).toMatchObject({ selectedModel: 'minilm', report: { semantic: source.semantic, screeningSelection: source.screeningSelection } });
  expect(workers).toHaveLength(0);
  app.runScreening();
  expect(workers).toHaveLength(0);
  expect(app.getSnapshot().report.semantic.model.id).toBe('historic-minilm');
  app.dispose();
});
