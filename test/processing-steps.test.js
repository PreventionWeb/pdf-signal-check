import { describe, expect, it } from 'vitest';
import { processingSteps } from '../src/app/ProcessingPanel.jsx';

const status = state => Object.fromEntries(processingSteps(state).map(step => [step.id, step.status]));

describe('processing steps', () => {
  it('shows only the requested standard-analysis step even when AI preferences are saved', () => {
    expect(status({ stage: 'processing-analysis', progress: { unit: 'pages', completed: 3, total: 10 }, aiEnabled: true, selectedModel: 'minilm', imageAI: false }))
      .toEqual({ read: 'current' });
  });
  it('moves from getting the model ready to comparing text, then to images', () => {
    const base = { stage: 'processing-model', aiEnabled: true, selectedModel: 'minilm', imageAI: true, report: { pages: [{}, {}] } };
    expect(status({ ...base, modelTask: 'text', progress: { stage: 'asset-download', completed: 5, total: 10 } })['text-model']).toBe('current');
    expect(status({ ...base, modelTask: 'text', progress: { stage: 'inference', completed: 1, total: 4 } })).toMatchObject({ read: 'done', 'text-model': 'done', text: 'current' });
    expect(status({ ...base, modelTask: 'image', progress: { stage: 'inference', completed: 1, total: 4 }, report: { pages: [], semantic: { inferencePerformed: true } } }))
      .toMatchObject({ text: 'done', 'image-model': 'done', image: 'current' });
  });
  it('says the text comparison did not run when the image step starts without it', () => {
    const steps = processingSteps({ stage: 'processing-model', modelTask: 'image', aiEnabled: true, selectedModel: 'minilm', imageAI: true, report: { pages: [], semantic: { status: 'skipped' } } });
    expect(steps.find(step => step.id === 'text')).toMatchObject({ status: 'skipped', detail: expect.stringMatching(/run/) });
  });
});
