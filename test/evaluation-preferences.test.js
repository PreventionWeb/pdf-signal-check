import { it, expect, vi } from 'vitest';
import { createEvaluationPreferences } from '../src/app/preferences.js';
import { createAppController } from '../src/app/controller.js';
import { formatBytes, formatProgress } from '../src/ui/progress.js';
const storage = () => { let value = null; return { getItem: () => value, setItem: (_, next) => { value = next; }, removeItem: () => { value = null; } }; };
it('restores only explicit settings and consent without starting any document or model work', () => {
  const local = storage(), preferences = createEvaluationPreferences({ storage: local });
  const workerFactory = vi.fn(), fetcher = vi.fn();
  const first = createAppController({ preferences, workerFactory, fetcher });
  first.completeSetup('granite-r2');
  first.setChecks(['title', 'sections']);
  const restored = createAppController({ preferences, workerFactory, fetcher });
  expect(restored.getSnapshot()).toMatchObject({ stage:'document', setupComplete:true, aiEnabled:true, evaluationModel:'granite-r2', checks:['title','sections'], file:null, report:null, languageAssumption:null });
  const batch = { setSettings:vi.fn(), setConsent:vi.fn() };
  restored.bindServices({ batch });
  expect(batch.setSettings).toHaveBeenCalledWith({useAI:true, modelId:'granite-r2', checks:['title','sections']});
  expect(batch.setConsent).toHaveBeenCalledWith(true);
  restored.go('welcome');
  expect(restored.getSnapshot().stage).toBe('document');
  restored.openSetup('document');
  expect(restored.getSnapshot().stage).toBe('setup');
  expect(workerFactory).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
  expect(Object.keys(JSON.parse(local.getItem()))).toEqual(['version','confirmed','modelId','modelFingerprint','checks']);
});
it('remembers no-AI fallback and replaces the previous model consent', () => {
  const preferences = createEvaluationPreferences({storage:storage()});
  const app = createAppController({preferences});
  app.completeSetup('minilm');
  app.completeSetup(null);
  expect(createAppController({preferences}).getSnapshot()).toMatchObject({stage:'document', aiEnabled:false, evaluationModel:null});
});
it('rejects changed model configuration, missing consent and malformed settings', () => {
  const local=storage(), preferences=createEvaluationPreferences({storage:local});
  preferences.save({modelId:'minilm', checks:['title']});
  const saved=JSON.parse(local.getItem());
  for (const patch of [{confirmed:false},{modelFingerprint:'old revision'},{modelId:'unknown'},{checks:['arbitrary']},{version:2}]) {
    local.setItem('',JSON.stringify({...saved,...patch}));
    expect(preferences.load()).toBeNull();
  }
});
it('keeps setup usable when browser storage is blocked', () => {
  const preferences=createEvaluationPreferences({storage:{getItem(){throw Error();},setItem(){throw Error();}}});
  const app=createAppController({preferences});
  app.completeSetup('minilm');
  expect(app.getSnapshot()).toMatchObject({stage:'document',setupComplete:true,aiEnabled:true,settingsSaved:false});
  expect(preferences.load()).toBeNull();
});
it('formats asset byte counts consistently while retaining non-byte progress units', () => {
  expect(formatBytes(22972370)).toBe('23 MB');
  expect(formatProgress({completed:12345678,total:22972370,unit:'bytes'})).toBe('12.3 MB of 23 MB downloaded');
  expect(formatProgress({completed:711661,total:null,unit:'bytes'})).toBe('711.7 KB downloaded');
  expect(formatProgress({completed:2,total:3,unit:'batches'})).toBe('2 / 3 batches');
});
it('holds first-use PDF selection in memory until setup finishes and consumes it once', async () => {
  const workerFactory=vi.fn(()=>({postMessage:vi.fn(),terminate:vi.fn()}));
  const app=createAppController({preferences:createEvaluationPreferences({storage:storage()}),workerFactory,digest:async()=>new Uint8Array([1]).buffer});
  const pdf={name:'selected.pdf',size:4,arrayBuffer:vi.fn(async()=>new Uint8Array([1,2,3,4]).buffer)};
  app.selectFiles([pdf]);
  expect(app.getSnapshot()).toMatchObject({stage:'setup',pendingSetupLabel:'selected.pdf',file:null,analysisBusy:false});
  expect(pdf.arrayBuffer).not.toHaveBeenCalled();
  expect(workerFactory).not.toHaveBeenCalled();
  app.completeSetup(null);
  await Promise.resolve(); await Promise.resolve();
  expect(app.getSnapshot()).toMatchObject({stage:'processing-analysis',file:pdf,pendingSetupLabel:null});
  expect(pdf.arrayBuffer).toHaveBeenCalledTimes(1);
  app.completeSetup(null);
  expect(pdf.arrayBuffer).toHaveBeenCalledTimes(1);
  app.dispose();
});
it('closing first-use setup releases the pending PDF and cancels benchmarking without processing',()=>{
  const workerFactory=vi.fn(),cancel=vi.fn();
  const app=createAppController({preferences:createEvaluationPreferences({storage:storage()}),workerFactory});
  app.bindServices({calibration:{cancel}});
  const pdf={name:'cancelled.pdf',arrayBuffer:vi.fn()};
  app.selectFiles([pdf]);
  app.cancelSetup();
  app.openSetup('document');
  app.completeSetup(null);
  expect(app.getSnapshot()).toMatchObject({stage:'document',pendingSetupLabel:null,file:null});
  expect(cancel).toHaveBeenCalled();
  expect(workerFactory).not.toHaveBeenCalled();
  expect(pdf.arrayBuffer).not.toHaveBeenCalled();
});
it('defers sample fetch and multi-file queue admission until the selected configuration is applied',()=>{
  const fetcher=vi.fn(()=>new Promise(()=>{})),app=createAppController({preferences:createEvaluationPreferences({storage:storage()}),fetcher});
  app.selectSample('./samples/well-prepared.pdf');
  expect(fetcher).not.toHaveBeenCalled();
  app.completeSetup(null);
  expect(fetcher).toHaveBeenCalledTimes(1);
  app.dispose();
  const batch={add:vi.fn(),setSettings:vi.fn(),setConsent:vi.fn(),releaseIdleWorkers:vi.fn()};
  const second=createAppController({preferences:createEvaluationPreferences({storage:storage()})});
  second.bindServices({batch});
  second.selectFiles([{name:'one.pdf'},{name:'two.pdf'}]);
  expect(batch.add).not.toHaveBeenCalled();
  second.completeSetup('granite-r2');
  expect(batch.setSettings).toHaveBeenCalledWith(expect.objectContaining({modelId:'granite-r2',useAI:true}));
  expect(batch.setConsent).toHaveBeenCalledWith(true);
  expect(batch.add).toHaveBeenCalledTimes(1);
  expect(second.getSnapshot().stage).toBe('batch');
});

it('reset revokes saved consent and benchmarks and releases a deferred first-use PDF', () => {
  const preferences = createEvaluationPreferences({ storage: storage() });
  const devicePreferences = { clear: vi.fn(() => true) }, workerFactory = vi.fn();
  const app = createAppController({ preferences, devicePreferences, workerFactory });
  app.completeSetup('granite-r2');
  app.setChecks(['sections']);
  app.openSetup('document');
  expect(app.resetSetup()).toBe(true);
  expect(preferences.load()).toBeNull();
  expect(devicePreferences.clear).toHaveBeenCalledOnce();
  expect(app.getSnapshot()).toMatchObject({ setupComplete: false, aiEnabled: false, settingsSaved: false, evaluationModel: "granite-r2", languageAssumption: null, checks: ['title', 'subject', 'keywords'] });
  expect(createAppController({ preferences }).getSnapshot().setupComplete).toBe(false);
  const pdf = { name: 'deferred.pdf', size: 4, arrayBuffer: vi.fn() };
  app.selectFiles([pdf]);
  expect(app.getSnapshot().pendingSetupLabel).toBe('deferred.pdf');
  app.resetSetup();
  app.completeSetup(null);
  expect(pdf.arrayBuffer).not.toHaveBeenCalled();
  expect(workerFactory).not.toHaveBeenCalled();
});
it('refuses a reset while another owner is processing and leaves saved consent intact', () => {
  const preferences = createEvaluationPreferences({ storage: storage() }), devicePreferences = { clear: vi.fn() };
  const app = createAppController({ preferences, devicePreferences });
  app.completeSetup('minilm');
  app.bindServices({ batch: { busy: true, setSettings: vi.fn(), setConsent: vi.fn() } });
  expect(app.resetSetup()).toBe(false);
  expect(preferences.load().modelId).toBe('minilm');
  expect(devicePreferences.clear).not.toHaveBeenCalled();
});

it('recommends Granite on first use while preserving a previously confirmed compact choice', () => {
  const preferences = createEvaluationPreferences({ storage: storage() });
  expect(createAppController({ preferences }).getSnapshot().evaluationModel).toBe('granite-r2');
  preferences.save({ modelId: 'minilm', checks: ['title'] });
  expect(createAppController({ preferences }).getSnapshot()).toMatchObject({ evaluationModel: 'minilm', setupComplete: true });
});
