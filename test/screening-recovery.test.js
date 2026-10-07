import { it, expect, vi } from 'vitest';
import { assessSemantic } from '../src/engine/semantic.js';
import { buildScreeningRequest } from '../src/runtime/screening-request.js';
import { createAppController } from '../src/app/controller.js';

const report = () => ({ accepted: false, analysisComplete: true, file: { name: 'untagged.pdf' }, metadata: { language: 'en', subject: 'Flood preparedness guidance' }, metadataConsistency: { candidates: [] }, checks: [], pages: [{ number: 1, logicalBlocks: [], blocks: [{ id: 1, text: 'Flood preparedness includes monitoring water levels, preparing equipment, and collecting samples safely. '.repeat(2) }] }] });
it('includes untagged opening-page text in AI inputs and performs a subject comparison', async () => {
  const request = buildScreeningRequest(report(), { modelId: 'minilm', checks: ['subject'], requireInference: true });
  expect(request.openingEvidence[0].page).toBe(1);
  const embed = vi.fn(async texts => texts.map(() => [1, 0]));
  const result = await assessSemantic(request, embed);
  expect(embed).toHaveBeenCalledOnce();
  expect(result.inferencePerformed).toBe(true);
  expect(result.subject.inferencePerformed).toBe(true);
});
it('records why there are no comparisons without loading a model or changing profile outcomes', async () => {
  const source = report(); source.metadata = { language: 'en' };
  const embed = vi.fn();
  const result = await assessSemantic(buildScreeningRequest(source, { modelId: 'granite-r2', checks: ['title', 'subject', 'keywords', 'sections'] }), embed);
  expect(embed).not.toHaveBeenCalled();
  expect(result.inferencePerformed).toBe(false);
  expect(result.notRun.code).toBe('no-comparable-inputs');
  expect(result.notRun.checks.map(item => item.reason).join(' ')).toMatch(/no title metadata.*no subject description.*no keyword metadata.*No eligible tagged heading/);
  expect(source.accepted).toBe(false);
});
it('surfaces failed reruns even when prior successful AI results are retained, and ignores stale callbacks', () => {
  const worker = { terminate: vi.fn(), postMessage: vi.fn() };
  const app = createAppController({ workerFactory: () => worker, preferences: { load: () => null, save: () => false } });
  const source = report(); source.semantic = { inferencePerformed: true, model: { id: 'previous' } };
  app.openCompletedReport(source, { name: 'untagged.pdf', size: 4 }, 'one');
  app.setModel('minilm');
  app.runScreening();
  const requestId = worker.postMessage.mock.calls[0][0].requestId;
  const callback = worker.onmessage;
  callback({ data: { type: 'error', requestId, message: 'Model allocation failed', stage: 'model-init', code: 'MODEL_INIT_FAILED' } });
  expect(app.getSnapshot().screeningAttempt).toMatchObject({ status: 'error', message: 'Model allocation failed', code: 'MODEL_INIT_FAILED' });
  expect(app.getSnapshot().report.semantic).toEqual(source.semantic);
  const snapshot = app.getSnapshot();
  callback({ data: { type: 'result', requestId, semantic: { inferencePerformed: false } } });
  expect(app.getSnapshot()).toBe(snapshot);
  app.openCompletedReport(report(), { name: 'next.pdf', size: 4 }, 'two');
  expect(app.getSnapshot().screeningAttempt).toBeNull();
  app.dispose();
});
it('retains a no-input result with actionable per-check reasons', () => {
  const worker = { terminate: vi.fn(), postMessage: vi.fn() };
  const app = createAppController({ workerFactory: () => worker, preferences: { load: () => null, save: () => false } });
  app.openCompletedReport(report(), { name: 'untagged.pdf', size: 4 }, 'one');
  app.setModel('minilm'); app.runScreening();
  const requestId = worker.postMessage.mock.calls[0][0].requestId;
  worker.onmessage({ data: { type: 'result', requestId, semantic: { inferencePerformed: false, notRun: { reason: 'No comparison inputs', checks: [{ check: 'subject', reason: 'No subject metadata' }] } } } });
  expect(app.getSnapshot().screeningAttempt).toMatchObject({ status: 'not-run', message: 'No comparison inputs', reasons: [{ check: 'subject', reason: 'No subject metadata' }] });
  app.dispose();
});
