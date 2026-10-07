import { createSequentialQueue } from "./queue.js";
import { BatchWorkerClient } from "./client.js";

/** App-owned queue adapter. React panel unmounts never discard session source handles. */
export class BatchController {
  constructor({
    onOpen = () => {},
    onOwnership = () => {},
    onState = () => {},
    onClear = () => {},
    client = new BatchWorkerClient(),
    queueFactory = createSequentialQueue,
    getVisibility = () =>
      typeof document === "undefined" ? "unknown" : document.visibilityState,
    subscribeVisibility = (callback) => {
      if (typeof document === "undefined") return () => {};
      document.addEventListener("visibilitychange", callback);
      return () => document.removeEventListener("visibilitychange", callback);
    },
  } = {}) {
    Object.assign(this, {
      onOpen,
      onOwnership,
      onState,
      onClear,
      client,
      queueFactory,
      getVisibility,
      subscribeVisibility,
    });
    this.files = new Map();
    this.listeners = new Set();
    this.generation = 0;
    this.hiddenEvents = 0;
    this.disclosures = {};
    this.settings = {
      useAI: false,
      modelId: "minilm",
      checks: ["title", "subject", "keywords", "sections"],
    };
    this.consent = false;
    this.message = "";
    this.starting = false;
    this.clearing = false;
    this.disposed = false;
    this.createQueue();
    this.publish();
  }
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.view;
  get state() {
    return this.view.queue;
  }
  get busy() {
    return this.state.running || this.starting || this.clearing;
  }
  mount() {
    if (this.disposed) {
      this.disposed = false;
      this.disclosures = {};
      this.createQueue();
      this.publish();
    }
    return this;
  }
  publish() {
    if (this.disposed) return;
    this.view = {
      queue: this.queue.snapshot(),
      settings: structuredClone(this.settings),
      disclosures: { ...this.disclosures },
      consent: this.consent,
      message: this.message,
      starting: this.starting,
      clearing: this.clearing,
    };
    for (const listener of this.listeners) listener();
  }
  setDisclosure(key, value) {
    if (this.disclosures[key] === value) return;
    this.disclosures[key] = value;
    this.publish();
  }
  say(message) {
    if (this.disposed) return;
    this.message = message;
    this.publish();
  }
  stopTracking() {
    this.unsubscribeVisibility?.();
    this.unsubscribeVisibility = null;
  }
  track() {
    if (!this.unsubscribeVisibility)
      this.unsubscribeVisibility = this.subscribeVisibility(() => {
        if (this.getVisibility() === "hidden" && this.state.running)
          this.hiddenEvents++;
      });
  }
  createQueue() {
    const generation = ++this.generation;
    this.hadConfiguration = false;
    this.queue = this.queueFactory({
      analyze: (...args) => this.client.analyze(...args),
      screen: (...args) => this.client.screen(...args),
      hash: (...args) => this.client.hash(...args),
      dispose: () => this.client.dispose(),
      getConditions: () => ({
        visibility: this.getVisibility(),
        hiddenEvents: this.hiddenEvents,
      }),
      onEvent: (event) => {
        if (generation !== this.generation || this.disposed) return;
        if (event.type === "item-removed") {
          this.files.delete(event.id);
          for (const key of Object.keys(this.disclosures))
            if (key.endsWith(`:${event.id}`)) delete this.disclosures[key];
        }
        if (event.type === "destroyed") this.files.clear();
        if (event.type === "queue-started") {
          this.track();
          if (!this.hadConfiguration) {
            this.disclosures.admission = false;
            this.disclosures.configuration = false;
            this.hadConfiguration = true;
          }
          this.message = "Queue started. PDFs are checked one at a time.";
        } else if (event.type === "queue-idle")
          this.message =
            "Queue finished its available work. Inspect outcomes or add more PDFs.";
        else if (event.type === "queue-paused")
          this.message = event.state.modelFailure
            ? "Queue paused: choose how to recover optional AI."
            : event.state.budget.pendingSerializedBytes
              ? "Queue paused: choose which details to retain."
              : "Queue paused. Completed outcomes are retained; continue when ready.";
        else if (event.type === "pause-requested")
          this.message = "Pause requested. The current PDF will finish first.";
        this.publish();
        this.onState(event.state);
        if (["queue-idle", "queue-paused"].includes(event.type)) {
          this.stopTracking();
          Promise.resolve(this.client.dispose()).catch((error) =>
            this.say(error.message),
          );
        }
      },
    });
  }
  act(fn) {
    if (this.disposed) return;
    const generation = this.generation;
    const fail = (error) => {
      if (!this.disposed && generation === this.generation)
        this.say(error.message);
    };
    try {
      const result = fn();
      result?.catch?.(fail);
      return result;
    } catch (error) {
      fail(error);
    }
  }
  add(files) {
    return this.act(() => {
      const input = Array.from(files),
        ids = this.queue.enqueue(input);
      ids.forEach((id, index) => this.files.set(id, input[index]));
      this.say(
        `${ids.length} PDF${ids.length === 1 ? "" : "s"} added. Nothing starts until you choose Start queue.`,
      );
      return ids;
    });
  }
  setSettings(change) {
    if (this.state.configuration || this.starting || this.clearing) return;
    const previous = this.settings.modelId;
    this.settings = { ...this.settings, ...change };
    if (previous !== this.settings.modelId) this.consent = false;
    this.publish();
  }
  setConsent(value) {
    if (!this.state.configuration) {
      this.consent = Boolean(value);
      this.publish();
    }
  }
  async start() {
    if (this.busy || this.disposed) return;
    const configuration = this.state.configuration;
    if (!configuration && this.settings.useAI && !this.settings.checks.length) {
      this.say("Select at least one AI check or turn AI off.");
      return;
    }
    if (!configuration && this.settings.useAI && !this.consent) {
      this.say(
        "Authorize the displayed optional downloads, or leave AI screening off.",
      );
      return;
    }
    const generation = this.generation;
    this.starting = true;
    this.publish();
    try {
      await this.onOwnership();
      if (this.disposed || generation !== this.generation) return;
      const task = configuration
        ? this.queue.resume()
        : this.queue.start(structuredClone(this.settings));
      this.starting = false;
      this.publish();
      await task;
    } catch (error) {
      if (!this.disposed && generation === this.generation)
        this.say(error.message);
    } finally {
      if (!this.disposed && generation === this.generation) {
        this.starting = false;
        this.publish();
      }
    }
  }
  recoverModel(action) {
    const generation = this.generation;
    return this.act(async () => {
      await this.onOwnership();
      if (!this.disposed && generation === this.generation)
        return this.queue.resolveModelFailure({ action });
    });
  }
  open(id) {
    const report = this.queue.getReport(id) || this.queue.getPendingReport(id),
      file = this.files.get(id);
    if (!report || !file) {
      this.say(
        "Detailed report was released or is awaiting a budget decision; compact summary remains available.",
      );
      return;
    }
    this.onOpen(report, file, id);
  }
  async releaseIdleWorkers() {
    if (!this.busy) await this.client.dispose();
  }
  async clear() {
    if (this.clearing || this.disposed) return;
    this.clearing = true;
    const generation = ++this.generation,
      queue = this.queue;
    this.stopTracking();
    this.publish();
    try {
      queue.stopAll();
      await queue.destroy();
      if (this.disposed || generation !== this.generation) return;
      this.files.clear();
      this.consent = false;
      this.disclosures = {};
      await this.onClear();
      if (this.disposed || generation !== this.generation) return;
      this.createQueue();
      this.message =
        "Queue cleared. Source handles and retained details released; no data were saved.";
      this.clearing = false;
      this.publish();
    } catch (error) {
      if (!this.disposed && generation === this.generation) {
        this.clearing = false;
        this.say(error.message);
      }
    }
  }
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    ++this.generation;
    this.stopTracking();
    this.starting = false;
    this.clearing = false;
    const queue = this.queue;
    queue.stopAll();
    this.files.clear();
    await queue.destroy();
  }
}
