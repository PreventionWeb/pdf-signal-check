import { expect, it, vi } from "vitest";
import { BatchController } from "../src/batch/controller.js";

const file = () => ({ name: "same.pdf", size: 2 });
const report = () => ({ analysisComplete: true, accepted: true, checks: [], file: { pages: 1 } });
const client = () => ({
  analyze: vi.fn(async () => report()),
  hash: vi.fn(async () => null),
  screen: vi.fn(async (_report, { configuration }) => ({
    model: { key: configuration.modelId }, inferencePerformed: true,
  })),
  dispose: vi.fn(async () => {}),
});

it("defaults to Granite but starts no analysis or model work before current consent", async () => {
  const service = client(), controller = new BatchController({ client: service });
  controller.add([file()]);
  expect(controller.getSnapshot()).toMatchObject({ settings: { useAI: true, modelId: "granite-r2" }, consent: false });
  await controller.start();
  expect(service.analyze).not.toHaveBeenCalled();
  expect(service.screen).not.toHaveBeenCalled();
  expect(service.hash).not.toHaveBeenCalled();
  controller.setConsent(true);
  await controller.start();
  expect(service.screen.mock.calls[0][1].configuration).toMatchObject({ useAI: true, modelId: "granite-r2" });
  await controller.dispose();
});

it("skips AI only for this batch and restores Granite with fresh consent after clear", async () => {
  const service = client(), controller = new BatchController({ client: service });
  const [id] = controller.add([file()]);
  controller.setSettings({ useAI: false });
  await controller.start();
  expect(controller.queue.getReport(id)).toMatchObject({ accepted: true, screeningSelection: { useAI: false } });
  expect(service.screen).not.toHaveBeenCalled();
  expect(controller.resetSetup()).toBe(false);
  expect(controller.state.configuration.useAI).toBe(false);
  await controller.clear();
  controller.add([file()]);
  expect(controller.getSnapshot()).toMatchObject({ settings: { useAI: true, modelId: "granite-r2" }, consent: false });
  await controller.start();
  expect(service.analyze).toHaveBeenCalledTimes(1);
  await controller.dispose();
});

it("resets admission setup without starting work or retaining a previous skip/consent", async () => {
  const service = client(), controller = new BatchController({ client: service });
  controller.setSettings({ useAI: false, modelId: "minilm", checks: ["title"] });
  controller.setConsent(true);
  expect(controller.resetSetup()).toBe(true);
  expect(controller.getSnapshot()).toMatchObject({ settings: { useAI: true, modelId: "granite-r2", checks: ["title", "subject", "keywords", "sections"] }, consent: false });
  expect(service.analyze).not.toHaveBeenCalled();
  expect(service.screen).not.toHaveBeenCalled();
  await controller.dispose();
});

it("preserves exact historical model identity and frozen settings through retry", async () => {
  const service = client(), controller = new BatchController({ client: service });
  const [id] = controller.add([file()]);
  const checks = ["title"];
  controller.setSettings({ modelId: "minilm", checks });
  controller.setConsent(true);
  await controller.start();
  checks.push("keywords");
  controller.setSettings({ modelId: "granite-r2", useAI: false });
  controller.setConsent(false);
  expect(controller.resetSetup()).toBe(false);
  expect(controller.queue.getReport(id)).toMatchObject({ semantic: { model: { key: "minilm" } }, screeningSelection: { modelId: "minilm", checks: ["title"] } });
  controller.queue.retry(id);
  await controller.start();
  expect(service.screen.mock.calls.map(([, options]) => options.configuration.modelId)).toEqual(["minilm", "minilm"]);
  expect(controller.state.items[0].requestedConfiguration).toMatchObject({ modelId: "minilm", checks: ["title"] });
  await controller.dispose();
});

it("retains standard results after model failure and explicitly skips remaining AI without changing future defaults", async () => {
  const service = client(), controller = new BatchController({ client: service });
  service.screen.mockRejectedValue(Object.assign(new Error("Offline"), { stage: "model-init" }));
  const ids = controller.add([file(), file()]);
  controller.setConsent(true);
  await controller.start();
  expect(controller.state.modelFailure).toMatchObject({ id: ids[0] });
  expect(controller.queue.getReport(ids[0])).toMatchObject({ accepted: true, screeningSelection: { modelId: "granite-r2", useAI: true } });
  await controller.recoverModel("structural-only");
  expect(service.screen).toHaveBeenCalledTimes(1);
  expect(controller.state.items.every(item => item.status === "completed")).toBe(true);
  expect(controller.queue.getReport(ids[1])).toMatchObject({ accepted: true, screeningSelection: { useAI: false } });
  await controller.clear();
  expect(controller.getSnapshot()).toMatchObject({ settings: { useAI: true, modelId: "granite-r2" }, consent: false });
  await controller.dispose();
});
