import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { it, expect, vi } from 'vitest';
import { Checks } from '../src/app/Checks.jsx';
import { createAppController } from '../src/app/controller.js';
const source = () => ({ analysisComplete: true, accepted: true, checks: [], metadata: { language: 'en' }, metadataConsistency: { candidates: [] }, pages: [], decorative: { items: [{ kind: 'unclear', page: 1, share: 0.3, letters: 0, quad: [[0,0],[20,0],[20,20],[0,20]] }] } });
const file = name => ({ name, size: 4 });
const preferences = { load: () => ({ modelId: 'granite-r2', checks: ['subject'], imageAI: true }), save: () => true };
function setup(imageCropper = async (_file, _report, items) => items.map(item => ({ index: item.index, page: item.page, blob: new Blob() }))) {
  const workers = [];
  const app = createAppController({ preferences, imageCropper, workerFactory: kind => { const worker = { kind, terminate: vi.fn(), postMessage: vi.fn() }; workers.push(worker); return worker; } });
  app.openCompletedReport(source(), file('first.pdf'), 'first');
  return { app, workers };
}
it.each(['error', 'canceled'])('offers and performs direct image-only recovery after %s, retaining prior results', async status => {
  const { app, workers } = setup();
  await app.runImageScreening();
  const old = workers[0], requestId = old.postMessage.mock.calls[0][0].requestId;
  if (status === 'error') old.onerror({ message: 'Network failed' }); else app.cancelScreening();
  expect(app.getSnapshot().modelTask).toBeNull();
  const html = renderToStaticMarkup(React.createElement(Checks, { state: app.getSnapshot(), controller: app, showSettings: false }));
  expect(html).toContain(status === 'error' ? 'Try image comparisons again' : 'Run image comparisons');
  expect(html).not.toContain('Choose a supported model or correct');
  expect(html).not.toContain('Some saved document details are missing');
  await app.runImageScreening();
  expect(workers).toHaveLength(2);
  expect(app.getSnapshot().report.accepted).toBe(true);
  const current = app.getSnapshot();
  old.onmessage({ data: { requestId, type: 'result', imageScreening: { inferencePerformed: true, stale: true } } });
  expect(app.getSnapshot()).toBe(current);
  app.dispose();
});
it('reports the actual usable count when pixel filtering leaves a mixed pool too small', async () => {
  const { app, workers } = setup();
  await app.runImageScreening();
  const worker = workers[0], requestId = worker.postMessage.mock.calls[0][0].requestId;
  worker.onmessage({ data: { requestId, type: 'result', imageScreening: { inferencePerformed: false, execution: { usableDescriptions: 4, comparedDescriptions: 0 } } } });
  expect(app.getSnapshot().screeningAttempt.message).toContain('Only 4 usable photo crops');
  expect(app.getSnapshot().screeningAttempt.message).not.toContain('were uniform');
  app.dispose();
});
it('aborts pending cropping and never starts a second crop against a replacement source', async () => {
  let finish; const pending = new Promise(resolve => { finish = resolve; });
  const cropper = vi.fn(() => pending), { app, workers } = setup(cropper);
  const running = app.runImageScreening(), signal = cropper.mock.calls[0][3];
  app.openCompletedReport(source(), file('second.pdf'), 'second');
  expect(signal.aborted).toBe(true);
  finish([]); await running;
  expect(cropper).toHaveBeenCalledTimes(1);
  expect(workers).toHaveLength(0);
  expect(app.getSnapshot().file.name).toBe('second.pdf');
  expect(app.getSnapshot().report.imageScreening).toBeUndefined();
  app.dispose();
});
