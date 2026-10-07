import { it, expect, vi } from 'vitest';
import { createEvaluationPreferences } from '../src/app/preferences.js';
import { createAppController } from '../src/app/controller.js';
import { formatBytes, formatProgress } from '../src/ui/progress.js';
const storage = () => { let value = null; return { getItem: () => value, setItem: (_, next) => { value = next; } }; };
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
