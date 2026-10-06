import { it, expect, vi, afterEach } from "vitest";
import { CalibrationController } from "../src/calibration/controller.js";
afterEach(() => vi.useRealTimers());
it("requires explicit start, releases completed workers, and times out without erasing a prior receipt", async () => {
  vi.useFakeTimers();
  const workers = [];
  const controller = new CalibrationController({
    timeoutMs: 100,
    workerFactory: () => {
      const worker = {
        terminate: vi.fn(),
        postMessage(message) {
          this.sent = message;
        },
      };
      workers.push(worker);
      return worker;
    },
  });
  expect(workers).toHaveLength(0);
  await controller.start("minilm");
  const receipt = {
    model: { label: "Measured model" },
    fixture: { pages: 2, parseMs: 10 },
    load: { loadAndInitMs: 20, state: "new-encoder", assetSource: "unknown" },
    warm: { medianMs: 3, minimumMs: 2, maximumMs: 4 },
    workload: { tokenCap: 256 },
    note: "No capability guarantee",
  };
  workers[0].onmessage({
    data: { type: "result", requestId: workers[0].sent.requestId, receipt },
  });
  expect(workers[0].terminate).toHaveBeenCalled();
  const previous = controller.receipt;
  await controller.start("minilm");
  vi.advanceTimersByTime(100);
  expect(workers[1].terminate).toHaveBeenCalled();
  expect(controller.receipt).toBe(previous);
  expect(controller.getSnapshot().message).toContain("time budget expired");
  controller.dispose();
});

it('restores saved receipts without work and persists only an active completed run', async () => {
  const worker = { terminate: vi.fn(), postMessage: vi.fn() };
  const prior = { model: { key: 'minilm' }, warm: { medianMs: 1000 } };
  const preferences = { load: vi.fn(() => ({ receipt: prior, savedAt: 10 })), save: vi.fn(() => true) };
  const factory = vi.fn(() => worker);
  const controller = new CalibrationController({ preferences, workerFactory: factory });
  expect(controller.receipt).toBe(prior);
  expect(factory).not.toHaveBeenCalled();
  await controller.start('minilm');
  const canceledId = worker.postMessage.mock.calls[0][0].requestId;
  controller.cancel();
  worker.onmessage({ data: { type: 'result', requestId: canceledId, receipt: prior } });
  expect(preferences.save).not.toHaveBeenCalled();
  await controller.start('minilm');
  const requestId = worker.postMessage.mock.calls[1][0].requestId;
  worker.onmessage({ data: { type: 'result', requestId, receipt: prior } });
  expect(preferences.save).toHaveBeenCalledOnce();
  expect(controller.getSnapshot().saved).toBe(true);
  controller.dispose();
});

it('exposes actual worker progress and rejects canceled progress', async () => {
  const worker = { terminate: vi.fn(), postMessage: vi.fn() };
  const controller = new CalibrationController({ workerFactory: () => worker, preferences: { load: () => null, save: () => false } });
  await controller.start('minilm');
  const requestId = worker.postMessage.mock.calls[0][0].requestId;
  worker.onmessage({ data: { type: 'progress', requestId, message: 'Measured one run', progress: { stage: 'benchmark', completed: 1, total: 3, unit: 'runs' } } });
  expect(controller.getSnapshot().progress).toEqual({ stage: 'benchmark', completed: 1, total: 3, unit: 'runs' });
  controller.cancel();
  worker.onmessage({ data: { type: 'progress', requestId, progress: { completed: 3, total: 3 } } });
  expect(controller.getSnapshot().progress).toBe(null);
  controller.dispose();
});
