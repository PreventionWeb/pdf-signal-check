import { it, expect, vi } from 'vitest';
import { createEvaluationPreferences } from '../src/app/preferences.js';
import { createAppController } from '../src/app/controller.js';
import { getSemanticModel } from '../src/engine/models.js';
import { formatBytes, formatProgress } from '../src/ui/progress.js';
const checks = ['title', 'subject', 'keywords', 'sections'];
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };
const key = 'pdf-signal-check:evaluation-settings:v2';
const pdf = name => ({ name, size: 4, arrayBuffer: vi.fn(async () => new ArrayBuffer(4)) });
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
it('restores only current explicit Granite consent with automatic all-check policy and starts no work', () => {
  const local = storage(), preferences = createEvaluationPreferences({ storage: local });
  const workerFactory = vi.fn(), fetcher = vi.fn();
  const first = createAppController({ preferences, workerFactory, fetcher });
  first.completeSetup('granite-r2', { imageAI: true });
  first.setChecks(['title']);
  const restored = createAppController({ preferences, workerFactory, fetcher });
  expect(restored.getSnapshot()).toMatchObject({ stage: 'document', setupComplete: true, aiEnabled: true, imageAI: true, evaluationModel: 'granite-r2', checks, file: null, report: null });
  const batch = { setSettings: vi.fn(), setConsent: vi.fn() };
  restored.bindServices({ batch });
  expect(batch.setSettings).toHaveBeenCalledWith({ useAI: true, modelId: 'granite-r2', checks });
  restored.openSetup();
  expect(workerFactory).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
  expect(JSON.parse(local.getItem(key))).toMatchObject({ version: 2, policy: 'automatic-granite-v2', confirmed: true });
});
it.each(['minilm', null, 'granite-r2'])('requires fresh consent for legacy saved %s policy without downloading or substituting', modelId => {
  const local = storage();
  local.setItem('pdf-signal-check:evaluation-settings:v1', JSON.stringify({ version: 1, confirmed: true, modelId, modelFingerprint: modelId && JSON.stringify(getSemanticModel(modelId)), checks }));
  const workerFactory = vi.fn(), fetcher = vi.fn();
  const app = createAppController({ preferences: createEvaluationPreferences({ storage: local }), workerFactory, fetcher });
  app.selectFiles([pdf('new.pdf')]);
  expect(app.getSnapshot()).toMatchObject({ setupComplete: false, aiEnabled: false, stage: 'setup', evaluationModel: 'granite-r2' });
  expect(workerFactory).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
});
it('rejects changed fingerprints, missing consent and malformed current settings', () => {
  const local = storage(), preferences = createEvaluationPreferences({ storage: local });
  preferences.save({ modelId: 'granite-r2', checks });
  const saved = JSON.parse(local.getItem(key));
  for (const patch of [{ confirmed: false }, { modelFingerprint: 'old revision' }, { modelId: 'minilm' }, { modelId: null }, { checks: ['arbitrary'] }, { version: 1 }, { policy: 'manual' }]) {
    local.setItem(key, JSON.stringify({ ...saved, ...patch }));
    expect(preferences.load()).toBeNull();
  }
  expect(preferences.save({ modelId: null, checks })).toBe(false);
});
it('keeps confirmed setup usable in-session when browser storage is blocked', () => {
  const preferences = createEvaluationPreferences({ storage: { getItem() { throw Error(); }, setItem() { throw Error(); } } });
  const app = createAppController({ preferences });
  app.completeSetup('granite-r2');
  expect(app.getSnapshot()).toMatchObject({ setupComplete: true, aiEnabled: true, settingsSaved: false });
});
it('requires setup before reading a first PDF and skips only that intake without persisting a choice', async () => {
  const preferences = createEvaluationPreferences({ storage: storage() });
  const workerFactory = vi.fn(() => ({ postMessage: vi.fn(), terminate: vi.fn() }));
  const app = createAppController({ preferences, workerFactory, digest: async () => new ArrayBuffer(1) });
  const first = pdf('first.pdf');
  app.selectFiles([first]);
  expect(app.getSnapshot()).toMatchObject({ stage: 'setup', pendingSetupLabel: 'first.pdf' });
  expect(first.arrayBuffer).not.toHaveBeenCalled(); expect(workerFactory).not.toHaveBeenCalled();
  expect(app.skipSetupForCurrentIntake()).toBe(true);
  await flush();
  expect(workerFactory.mock.calls.map(([kind]) => kind)).toEqual(['analysis']);
  expect(preferences.load()).toBeNull();
  expect(app.getSnapshot()).toMatchObject({ setupComplete: false, aiEnabled: false });
  app.selectFiles([pdf('next.pdf')]);
  expect(app.getSnapshot()).toMatchObject({ stage: 'setup', pendingSetupLabel: 'next.pdf' });
  app.dispose();
});
it('holds samples before fetch, and closing setup releases pending intake', () => {
  const fetcher = vi.fn(), workerFactory = vi.fn(), cancel = vi.fn();
  const app = createAppController({ preferences: createEvaluationPreferences({ storage: storage() }), fetcher, workerFactory });
  app.bindServices({ calibration: { cancel } });
  app.selectSample('./samples/well-prepared.pdf');
  expect(fetcher).not.toHaveBeenCalled();
  expect(app.getSnapshot()).toMatchObject({ stage: 'setup', pendingSetupLabel: 'well-prepared.pdf' });
  app.cancelSetup(); app.completeSetup('granite-r2');
  expect(fetcher).not.toHaveBeenCalled(); expect(workerFactory).not.toHaveBeenCalled();
  expect(cancel).toHaveBeenCalled(); expect(app.skipSetupForCurrentIntake()).toBe(false);
});
it.each([false, true])('admits a batch only after current intake decision, useAI=%s, with no MiniLM fallback', useAI => {
  const preferences = createEvaluationPreferences({ storage: storage() });
  const batch = { add: vi.fn(), setSettings: vi.fn(), setConsent: vi.fn(), releaseIdleWorkers: vi.fn() };
  const app = createAppController({ preferences }); app.bindServices({ batch });
  app.selectFiles([pdf('one.pdf'), pdf('two.pdf')]);
  expect(batch.add).not.toHaveBeenCalled();
  if (useAI) app.completeSetup('granite-r2'); else app.skipSetupForCurrentIntake();
  expect(batch.setSettings).toHaveBeenLastCalledWith({ useAI, modelId: 'granite-r2', checks });
  expect(batch.setConsent).toHaveBeenLastCalledWith(useAI);
  expect(batch.add).toHaveBeenCalledOnce(); expect(app.getSnapshot().stage).toBe('batch');
  expect(Boolean(preferences.load())).toBe(useAI);
  if (!useAI) { app.selectFiles([pdf('three.pdf'), pdf('four.pdf')]); expect(app.getSnapshot().stage).toBe('setup'); }
});
it('reset clears current consent, legacy settings, benchmarks and pending intake', () => {
  const preferences = createEvaluationPreferences({ storage: storage() }), devicePreferences = { clear: vi.fn(() => true) }, workerFactory = vi.fn();
  const app = createAppController({ preferences, devicePreferences, workerFactory });
  app.completeSetup('granite-r2'); expect(app.resetSetup()).toBe(true);
  expect(preferences.load()).toBeNull(); expect(devicePreferences.clear).toHaveBeenCalledOnce();
  app.selectFiles([pdf('pending.pdf')]); app.resetSetup(); app.completeSetup('granite-r2');
  expect(workerFactory).not.toHaveBeenCalled();
});
it('rejects old setup API choices rather than silently granting different consent', () => {
  const app = createAppController({ preferences: createEvaluationPreferences({ storage: storage() }) });
  expect(() => app.completeSetup(null)).toThrow('Fresh Granite');
  expect(() => app.completeSetup('minilm')).toThrow('Fresh Granite');
  expect(() => app.setModel('minilm')).toThrow('New scans use Granite');
  expect(() => app.setModel(null)).toThrow('New scans use Granite');
  expect(app.getSnapshot().setupComplete).toBe(false);
});
it('formats byte and non-byte progress', () => {
  expect(formatBytes(22972370)).toBe('23.0 MB');
  expect(formatProgress({ completed: 12345678, total: 22972370, unit: 'bytes' })).toBe('12.3 MB of 23.0 MB downloaded');
  expect(formatProgress({ completed: 2, total: 3, unit: 'batches' })).toBe('2 / 3 batches');
});
it('skipping a pending sample fetches only that sample and the next sample still requires setup', async () => {
  const fetcher = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['pdf']) }));
  const workerFactory = vi.fn(() => ({ postMessage: vi.fn(), terminate: vi.fn() }));
  const app = createAppController({ preferences: createEvaluationPreferences({ storage: storage() }), fetcher, workerFactory, digest: async () => new ArrayBuffer(1) });
  app.selectSample('./samples/first.pdf'); app.skipSetupForCurrentIntake(); await flush();
  expect(fetcher).toHaveBeenCalledOnce(); expect(workerFactory.mock.calls.map(([kind]) => kind)).toEqual(['analysis']);
  expect(app.getSnapshot().file.name).toBe('first.pdf');
  app.selectSample('./samples/second.pdf');
  expect(fetcher).toHaveBeenCalledOnce(); expect(app.getSnapshot()).toMatchObject({ stage: 'setup', pendingSetupLabel: 'second.pdf', setupComplete: false });
  app.dispose();
});
it('resets an unstarted batch configuration before current-intake policy and rejects a frozen queue', () => {
  const calls = [], batch = { resetSetup: vi.fn(() => { calls.push('reset'); return true; }), add: vi.fn(() => calls.push('add')), setSettings: vi.fn(() => calls.push('settings')), setConsent: vi.fn(() => calls.push('consent')), releaseIdleWorkers: vi.fn() };
  const app = createAppController({ preferences: createEvaluationPreferences({ storage: storage() }) }); app.bindServices({ batch });
  app.selectFiles([pdf('one.pdf'), pdf('two.pdf')]); app.skipSetupForCurrentIntake();
  expect(calls).toEqual(['reset', 'settings', 'consent', 'add']);
  batch.resetSetup.mockReturnValue(false); batch.add.mockClear();
  app.selectFiles([pdf('three.pdf'), pdf('four.pdf')]); app.skipSetupForCurrentIntake();
  expect(batch.add).not.toHaveBeenCalled();
});
it('gives first-use empty batch navigation a one-batch skip continuation without saving consent', () => {
  const preferences = createEvaluationPreferences({ storage: storage() });
  const batch = { resetSetup: vi.fn(() => true), setSettings: vi.fn(), setConsent: vi.fn() };
  const app = createAppController({ preferences }); app.bindServices({ batch });
  app.beginEvaluation('batch');
  expect(app.getSnapshot()).toMatchObject({ stage: 'setup', pendingSetupLabel: 'next batch', setupDestination: 'batch' });
  expect(app.skipSetupForCurrentIntake()).toBe(true);
  expect(app.getSnapshot()).toMatchObject({ stage: 'batch', setupComplete: false });
  expect(batch.setSettings).toHaveBeenLastCalledWith({ useAI: false, modelId: 'granite-r2', checks });
  expect(preferences.load()).toBeNull();
  app.beginEvaluation('batch');
  expect(app.getSnapshot().stage).toBe('setup');
  app.completeSetup('granite-r2');
  expect(batch.setSettings).toHaveBeenLastCalledWith({ useAI: true, modelId: 'granite-r2', checks });
  expect(app.getSnapshot().stage).toBe('batch');
});
it('restores automatic consent on mutable batch navigation while frozen queues retain their exact settings', () => {
  const preferences = createEvaluationPreferences({ storage: storage() });
  const batch = { resetSetup: vi.fn(() => true), setSettings: vi.fn(), setConsent: vi.fn() };
  const app = createAppController({ preferences }); app.bindServices({ batch }); app.completeSetup('granite-r2');
  batch.setSettings.mockClear(); batch.setConsent.mockClear();
  app.beginEvaluation('batch');
  expect(batch.setSettings).toHaveBeenLastCalledWith({ useAI: true, modelId: 'granite-r2', checks });
  expect(batch.setConsent).toHaveBeenLastCalledWith(true);
  batch.setSettings.mockClear(); batch.setConsent.mockClear(); batch.resetSetup.mockReturnValue(false);
  app.beginEvaluation('batch');
  expect(app.getSnapshot().stage).toBe('batch');
  expect(batch.setSettings).not.toHaveBeenCalled(); expect(batch.setConsent).not.toHaveBeenCalled();
  const fresh = createAppController({ preferences: createEvaluationPreferences({ storage: storage() }) }); fresh.bindServices({ batch });
  fresh.beginEvaluation('batch');
  expect(fresh.getSnapshot()).toMatchObject({ stage: 'batch', pendingSetupLabel: null, setupComplete: false });
});
