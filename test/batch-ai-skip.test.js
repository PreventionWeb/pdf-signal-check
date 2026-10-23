import { expect, it, vi } from "vitest";
import { createSequentialQueue } from "../src/batch/queue.js";
import { BatchWorkerClient } from "../src/batch/client.js";

const file = () => ({ name: "same.pdf", size: 2 });
const report = () => ({ analysisComplete: true, accepted: true, checks: [{ id: "tags", status: "pass" }], file: { pages: 1 }, metadata: { language: "en" }, pages: [] });
const configuration = { useAI: true, modelId: "granite-r2", checks: ["title"] };
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

it("terminates active AI, keeps the exact standard source attempt, and screens later PDFs with the frozen model", async () => {
  const workers = [];
  const client = new BatchWorkerClient({ workerFactory: () => {
    const worker = { terminate: vi.fn(), posts: [], postMessage(message) { this.posts.push(message); } };
    workers.push(worker);
    return worker;
  } });
  const q = createSequentialQueue({ analyze: async () => report(), hash: async () => "source-hash", screen: (...args) => client.screen(...args) });
  const ids = q.enqueue([file(), file()]);
  const task = q.start(configuration);
  await tick();
  const first = workers[0], stale = first.onmessage, nonce = first.posts[0].requestId;
  const epoch = q.snapshot().items[0].epoch;
  expect(q.skipActiveAI()).toBe(true);
  expect(q.skipActiveAI()).toBe(false);
  expect(first.terminate).toHaveBeenCalledTimes(1);
  stale({ data: { type: "progress", requestId: nonce, progress: { completed: 999 } } });
  stale({ data: { type: "result", requestId: nonce, semantic: { model: { key: "stale" }, inferencePerformed: true } } });
  await tick();
  expect(workers).toHaveLength(2);
  const kept = q.getReport(ids[0]);
  expect(kept).toMatchObject({ accepted: true, checks: [{ id: "tags", status: "pass" }], sourceIdentity: { queueItemId: ids[0], sha256: "source-hash", attemptEpoch: epoch, requestedConfiguration: configuration }, screeningSelection: configuration, semantic: { status: "skipped", skipReason: "user-skipped", inferencePerformed: false, model: null } });
  expect(q.snapshot().items[0]).toMatchObject({ status: "completed", epoch, actualModel: null, progress: null });
  const second = workers[1];
  expect(second.posts[0].modelId).toBe("granite-r2");
  second.onmessage({ data: { type: "result", requestId: second.posts[0].requestId, semantic: { model: { key: "granite-r2" }, inferencePerformed: true } } });
  await task;
  expect(q.getReport(ids[1]).semantic.inferencePerformed).toBe(true);
  expect(q.snapshot().modelFailure).toBeNull();
  expect(q.snapshot().configuration).toEqual(configuration);
  await client.dispose();
});

it("waits for aborted screening settlement, ignores a late success, and retries the originally requested model", async () => {
  let settle, options, calls = 0;
  const q = createSequentialQueue({ analyze: async () => report(), screen: async (_report, current) => {
    calls++;
    if (calls > 1) return { model: { key: current.configuration.modelId }, inferencePerformed: true };
    options = current;
    return new Promise(resolve => { settle = resolve; });
  } });
  const [id] = q.enqueue([file()]);
  const original = { ...configuration, modelId: "minilm" };
  const task = q.start(original);
  await tick();
  expect(q.skipActiveAI()).toBe(true);
  expect(options.signal.aborted).toBe(true);
  expect(q.snapshot().running).toBe(true);
  expect(q.getReport(id)).toBeNull();
  options.onProgress({ completed: 999 });
  settle({ model: { key: "late" }, inferencePerformed: true });
  await task;
  expect(q.getReport(id).semantic).toMatchObject({ skipReason: "user-skipped", model: null, inferencePerformed: false });
  q.retry(id);
  await q.resume();
  expect(q.getReport(id)).toMatchObject({ semantic: { model: { key: "minilm" }, inferencePerformed: true }, screeningSelection: { modelId: "minilm" } });
});

it("does not turn document cancellation into an AI skip or retain canceled document results", async () => {
  let resolve;
  const q = createSequentialQueue({ analyze: () => new Promise(done => { resolve = done; }) });
  const [id] = q.enqueue([file()]);
  expect(q.skipActiveAI()).toBe(false);
  const task = q.start(configuration);
  expect(q.skipActiveAI()).toBe(false);
  q.cancelActive();
  resolve(report());
  await task;
  expect(q.getReport(id)).toBeNull();
  expect(q.snapshot().items[0].status).toBe("canceled");
});

it("suppresses model-failure recovery for an explicitly skipped request and still cancels a whole screening attempt", async () => {
  let reject, signal;
  const q = createSequentialQueue({ analyze: async () => report(), screen: (_report, options) => {
    signal = options.signal;
    return new Promise((_resolve, fail) => { reject = fail; });
  } });
  const [id] = q.enqueue([file()]);
  const first = q.start(configuration);
  await tick();
  q.skipActiveAI();
  reject(Object.assign(new Error("Late initialization failure"), { stage: "model-init" }));
  await first;
  expect(q.snapshot().modelFailure).toBeNull();
  expect(q.getReport(id).semantic.skipReason).toBe("user-skipped");
  q.retry(id);
  const second = q.resume();
  await tick();
  q.cancelActive();
  expect(signal.aborted).toBe(true);
  reject(new DOMException("Canceled", "AbortError"));
  await second;
  expect(q.snapshot().items[0].status).toBe("canceled");
  expect(q.getReport(id)).toBeNull();
});
