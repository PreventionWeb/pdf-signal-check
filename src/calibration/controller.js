import { createDevicePreferences } from "./preferences.js";
import { BENCHMARK_TIMEOUT_MS } from "./workload.js";

/** Explicit fixed-workload ownership; construction and subscription never download assets. */
export class CalibrationController {
  constructor({
    preferences = createDevicePreferences(),
    modelId = "minilm",
    onBusy = () => {},
    canRun = () => true,
    timeoutMs = BENCHMARK_TIMEOUT_MS,
    workerFactory = () =>
      new Worker(new URL("./benchmark.worker.js", import.meta.url), {
        type: "module",
      }),
    isHidden = () => typeof document !== "undefined" && document.hidden,
    subscribeVisibility = (callback) => {
      if (typeof document === "undefined") return () => {};
      document.addEventListener("visibilitychange", callback);
      return () => document.removeEventListener("visibilitychange", callback);
    },
  } = {}) {
    Object.assign(this, {
      preferences,
      onBusy,
      canRun,
      timeoutMs,
      workerFactory,
      isHidden,
      subscribeVisibility,
    });
    this.epoch = 0;
    this.listeners = new Set();
    this.view = { busy: false, message: "", receipt: null, savedAt: null, saved: false, progress: null };
    this.selectModel(modelId);
  }
  selectModel(modelId) {
    this.cancel({ silent: true });
    const saved = this.preferences.load(modelId);
    this.update({ receipt: saved?.receipt || null, savedAt: saved?.savedAt || null, saved: Boolean(saved), message: "", progress: null });
  }
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.view;
  get receipt() {
    return this.view.receipt;
  }
  update(change) {
    this.view = { ...this.view, ...change };
    for (const listener of this.listeners) listener();
  }
  stopTracking() {
    clearInterval(this.heartbeat);
    clearTimeout(this.deadline);
    this.unsubscribeVisibility?.();
    this.unsubscribeVisibility = null;
  }
  releaseBusy() {
    Promise.resolve(this.onBusy(false)).catch(() => {});
  }
  cancel({ silent = false } = {}) {
    const active = this.view.busy || Boolean(this.worker);
    ++this.epoch;
    this.worker?.terminate();
    this.worker = null;
    this.stopTracking();
    this.update({
      busy: false,
      progress: null,
      ...(!silent && active
        ? {
            message:
              "Device test canceled. Previously completed results are retained.",
          }
        : {}),
    });
    if (active) this.releaseBusy();
  }
  dispose() {
    this.cancel({ silent: true });
  }
  async start(modelId) {
    if (this.view.busy) return;
    if (!this.canRun()) {
      this.update({
        message:
          "Finish or stop the active analysis or queue before testing this browser.",
      });
      return;
    }
    const epoch = ++this.epoch,
      conditions = {
        startedHidden: this.isHidden(),
        visibilityChanges: 0,
        possibleSleepOrSchedulingGap: false,
      };
    let previousWall = Date.now();
    this.update({
      busy: true,
      progress: null,
      message: "Starting the synthetic browser test…",
    });
    const fail = (message) => {
      if (epoch !== this.epoch) return;
      this.worker?.terminate();
      this.worker = null;
      this.stopTracking();
      this.update({
        busy: false,
        progress: null,
        message: `Device test unavailable: ${message}. No device capability verdict was made.`,
      });
      this.releaseBusy();
    };
    this.heartbeat = setInterval(() => {
      const now = Date.now();
      if (now - previousWall > 5000)
        conditions.possibleSleepOrSchedulingGap = true;
      previousWall = now;
    }, 1000);
    this.unsubscribeVisibility = this.subscribeVisibility(() => {
      conditions.visibilityChanges++;
    });
    this.deadline = setTimeout(
      () =>
        fail(
          "The explicit device-test time budget expired; retry or continue without benchmarking",
        ),
      this.timeoutMs,
    );
    try {
      await this.onBusy(true);
      if (epoch !== this.epoch || !this.view.busy) return;
      if (!this.canRun()) {
        this.cancel();
        return;
      }
      const worker = this.workerFactory();
      this.worker = worker;
      const active = () => epoch === this.epoch && this.worker === worker;
      worker.onerror = (event) => {
        if (active()) fail(event.message || "Worker error");
      };
      worker.onmessage = ({ data }) => {
        if (!active() || data.requestId !== epoch) return;
        if (data.type === "progress") this.update({ message: data.message, progress: data.progress || null });
        else if (data.type === "error") fail(data.message);
        else if (data.type === "result") {
          if (Date.now() - previousWall > 5000)
            conditions.possibleSleepOrSchedulingGap = true;
          worker.terminate();
          this.worker = null;
          this.stopTracking();
          const receipt = structuredClone({ ...data.receipt, conditions });
          const saved = this.preferences.save(receipt);
          this.update({
            busy: false,
            progress: null,
            receipt,
            saved,
            savedAt: saved ? Date.now() : null,
            message:
              "Device check complete.",
          });
          this.releaseBusy();
        }
      };
      worker.postMessage({ requestId: epoch, modelId });
    } catch (error) {
      fail(error.message || "Worker unavailable");
    }
  }
}
