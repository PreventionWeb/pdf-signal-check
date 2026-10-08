import { it, expect, vi, afterEach } from "vitest";
import { BatchController } from "../src/batch/controller.js";
import { CalibrationController } from "../src/calibration/controller.js";
import { ExportController } from "../src/export/controller.js";
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const report = () => ({
  analysisComplete: true,
  accepted: true,
  profile: "text-actionability-0.3",
  file: { name: "same.pdf", pages: 1 },
  checks: [],
  pages: [],
  metadata: { xmpTitles: [] },
});
const client = () => ({
  hash: vi.fn(async () => null),
  analyze: vi.fn(async () => report()),
  screen: vi.fn(async () => null),
  dispose: vi.fn(async () => {}),
});
afterEach(() => vi.useRealTimers());

it("does not start on subscription; remounts safely and opens duplicate filenames with distinct sources", async () => {
  const service = client(),
    onOpen = vi.fn(),
    controller = new BatchController({ client: service, onOpen });
  const listener = vi.fn(),
    unsubscribe = controller.subscribe(listener);
  expect(controller.getSnapshot()).toBe(controller.getSnapshot());
  expect(service.analyze).not.toHaveBeenCalled();
  await controller.dispose();
  controller.mount();
  const first = { name: "same.pdf", size: 2 },
    second = { name: "same.pdf", size: 3 },
    ids = controller.add([first, second]);
  await controller.start();
  controller.open(ids[0]);
  controller.open(ids[1]);
  expect(onOpen.mock.calls[0][1]).toBe(first);
  expect(onOpen.mock.calls[1][1]).toBe(second);
  onOpen.mock.calls[0][0].file.name = "Mutated detached copy";
  controller.open(ids[0]);
  expect(onOpen.mock.calls[2][0].file.name).toBe("same.pdf");
  unsubscribe();
  const calls = listener.mock.calls.length;
  controller.setDisclosure("resources", true);
  expect(listener).toHaveBeenCalledTimes(calls);
  await controller.dispose();
});

it("requires explicit AI consent and rejects stale ownership starts after clearing", async () => {
  const service = client(),
    ownership = deferred(),
    controller = new BatchController({
      client: service,
      onOwnership: () => ownership.promise,
    });
  controller.add([{ name: "file.pdf", size: 2 }]);
  controller.setSettings({ useAI: true });
  await controller.start();
  expect(service.analyze).not.toHaveBeenCalled();
  expect(controller.getSnapshot().message).toContain("Authorize");
  controller.setConsent(true);
  const start = controller.start();
  await controller.clear();
  controller.add([{ name: "new.pdf", size: 3 }]);
  ownership.resolve();
  await start;
  expect(service.analyze).not.toHaveBeenCalled();
  expect(controller.state.items.map((item) => item.name)).toEqual(["new.pdf"]);
  controller.setSettings({ modelId: "granite-r2" });
  expect(controller.getSnapshot().consent).toBe(false);
  await controller.dispose();
});

it("keeps an old asynchronous clear from releasing freshly remounted sources", async () => {
  const service = client(),
    gate = deferred();
  service.dispose.mockImplementationOnce(() => gate.promise);
  const controller = new BatchController({ client: service });
  controller.add([{ name: "old.pdf", size: 2 }]);
  const clear = controller.clear();
  const disposal = controller.dispose();
  controller.mount();
  const fresh = { name: "fresh.pdf", size: 2 };
  const [id] = controller.add([fresh]);
  gate.resolve();
  await Promise.all([clear, disposal]);
  expect(controller.files.get(id)).toBe(fresh);
  expect(controller.state.items[0].name).toBe("fresh.pdf");
  await controller.dispose();
});

it("does not display an old ownership failure on a freshly cleared queue", async () => {
  let reject;
  const ownership = new Promise((_resolve, fail) => {
    reject = fail;
  });
  const controller = new BatchController({
    client: client(),
    onOwnership: () => ownership,
  });
  controller.add([{ name: "old.pdf", size: 2 }]);
  const start = controller.start();
  await controller.clear();
  controller.add([{ name: "fresh.pdf", size: 2 }]);
  const message = controller.getSnapshot().message;
  reject(new Error("Old ownership failure"));
  await start;
  expect(controller.getSnapshot().message).toBe(message);
  expect(controller.state.items[0].name).toBe("fresh.pdf");
  await controller.dispose();
});

it("rejects canceled and timed-out benchmark callbacks while retaining the last receipt", async () => {
  vi.useFakeTimers();
  const workers = [],
    onBusy = vi.fn();
  const controller = new CalibrationController({
    timeoutMs: 100,
    onBusy,
    workerFactory: () => {
      const worker = {
        terminate: vi.fn(),
        postMessage: vi.fn((message) => {
          worker.request = message;
        }),
      };
      workers.push(worker);
      return worker;
    },
  });
  expect(workers).toEqual([]);
  const listener = vi.fn(),
    unsubscribe = controller.subscribe(listener);
  await controller.start("minilm");
  const receipt = { model: { label: "MiniLM" }, fixture: { pages: 2 } };
  workers[0].onmessage({
    data: { type: "result", requestId: workers[0].request.requestId, receipt },
  });
  const completed = controller.receipt;
  expect(workers[0].terminate).toHaveBeenCalled();
  await controller.start("granite-r2");
  const stale = workers[1].onmessage;
  controller.cancel();
  stale({
    data: {
      type: "result",
      requestId: workers[1].request.requestId,
      receipt: { model: { label: "Stale" } },
    },
  });
  expect(controller.receipt).toBe(completed);
  await controller.start("minilm");
  vi.advanceTimersByTime(100);
  expect(workers[2].terminate).toHaveBeenCalled();
  expect(controller.receipt).toBe(completed);
  expect(controller.getSnapshot().message).toContain("time budget expired");
  unsubscribe();
  controller.dispose();
  expect(onBusy).toHaveBeenCalledWith(false);
});

it("cancels benchmark ownership preparation without ever constructing a late worker", async () => {
  const gate = deferred(),
    workerFactory = vi.fn(),
    controller = new CalibrationController({
      onBusy: (value) => (value ? gate.promise : undefined),
      workerFactory,
    });
  const task = controller.start("minilm");
  controller.dispose();
  gate.resolve();
  await task;
  expect(workerFactory).not.toHaveBeenCalled();
  expect(controller.getSnapshot().busy).toBe(false);
});

it("blocks device calibration before ownership or worker creation when another owner is active", async () => {
  const onBusy = vi.fn(),
    workerFactory = vi.fn(),
    controller = new CalibrationController({
      canRun: () => false,
      onBusy,
      workerFactory,
    });
  await controller.start("minilm");
  expect(onBusy).not.toHaveBeenCalled();
  expect(workerFactory).not.toHaveBeenCalled();
  expect(controller.getSnapshot().busy).toBe(false);
  controller.dispose();
});

it("rechecks device ownership after preparation before constructing a worker", async () => {
  const gate = deferred(),
    workerFactory = vi.fn();
  let allowed = true;
  const controller = new CalibrationController({
    canRun: () => allowed,
    onBusy: (value) => (value ? gate.promise : undefined),
    workerFactory,
  });
  const task = controller.start("minilm");
  allowed = false;
  gate.resolve();
  await task;
  expect(workerFactory).not.toHaveBeenCalled();
  expect(controller.getSnapshot().busy).toBe(false);
  controller.dispose();
});

it("captures completed state before generator loading and discards changed source-attempt downloads", async () => {
  const gate = deferred(),
    download = vi.fn(),
    createSummaryPng = vi.fn(async () => new Blob(["image"])),
    file = { name: "same.pdf" };
  let state = {
    report: report(),
    file,
    sourceKey: 1,
  };
  const controller = new ExportController(() => state, {
    download,
    loadGenerators: () => gate.promise,
  });
  const task = controller.run("png");
  state.report.file.name = "Changed";
  state = { ...state, sourceKey: 2 };
  gate.resolve({ createSummaryPng });
  await task;
  expect(createSummaryPng.mock.calls[0][0].report.file.name).toBe("same.pdf");
  expect(download).not.toHaveBeenCalled();
  expect(controller.getSnapshot().busy).toBe(false);
});

it("suppresses canceled export progress and always disposes the original crop service", async () => {
  const gate = deferred(),
    destroy = vi.fn(async () => {}),
    download = vi.fn();
  let progress;
  const controller = new ExportController(
    () => ({ report: report(), file: {}, sourceKey: 1 }),
    {
      download,
      cropFactory: () => ({ destroy, crop: vi.fn() }),
      loadGenerators: async () => ({
        createPdfReport: (_snapshot, options) => {
          progress = options.onProgress;
          return gate.promise;
        },
      }),
    },
  );
  const task = controller.run("pdf");
  await Promise.resolve();
  controller.cancel();
  const message = controller.getSnapshot().message;
  progress({ completed: 99, total: 100 });
  gate.resolve(new Blob(["pdf"]));
  await task;
  expect(controller.getSnapshot().message).toBe(message);
  expect(download).not.toHaveBeenCalled();
  expect(destroy).toHaveBeenCalledTimes(1);
});

it("releases export busy state even when source-document cleanup rejects", async () => {
  const file = {},
    download = vi.fn(),
    controller = new ExportController(
      () => ({ report: report(), file, sourceKey: 1 }),
      {
        download,
        cropFactory: () => ({
          destroy: async () => {
            throw new Error("Document cleanup failed");
          },
        }),
        loadGenerators: async () => ({
          createPdfReport: async () => new Blob(["pdf"]),
        }),
      },
    );
  await controller.run("pdf");
  expect(download).toHaveBeenCalledTimes(1);
  expect(controller.getSnapshot().busy).toBe(false);
  expect(controller.getSnapshot().message).toContain("cleanup was incomplete");
});

it("keeps concise and full PDF exports on the captured-source contract with distinct filenames", async () => {
  const source = { report: report(), file: null, sourceKey: 1 };
  const download = vi.fn(), createPdfReport = vi.fn(async () => new Blob(['pdf']));
  const controller = new ExportController(() => source, {
    download, loadGenerators: async () => ({ createPdfReport }),
  });
  await controller.run('pdf');
  await controller.run('pdf-full');
  expect(createPdfReport.mock.calls.map(([, options]) => options.includeTechnical)).toEqual([false, true]);
  expect(createPdfReport.mock.calls[0][0].report).not.toBe(source.report);
  expect(download.mock.calls[0][1]).toMatch(/-pdf-signal-check\.pdf$/);
  expect(download.mock.calls[1][1]).toMatch(/-full-report\.pdf$/);
  expect(controller.getSnapshot().busy).toBe(false);
});
