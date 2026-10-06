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
