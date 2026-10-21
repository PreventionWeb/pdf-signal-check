import { describe, expect, it, vi } from 'vitest';
import { IMAGE_LABELS, imageCandidates, judgeImage } from '../src/engine/image-model.js';
import { normalizeFindings } from '../src/review/findings.js';
import { reviewGroups, reviewSummary, fixCard, reviewPriority } from '../src/review/workspace.js';
import { createAppController } from '../src/app/controller.js';

// Ten orthogonal unit "label" vectors, so an image vector pointing at one label is judged as that label.
const labelVectors = Array.from({ length: 10 }, (_, i) => Array.from({ length: 10 }, (_, j) => (i === j ? 1 : 0)));
const towards = i => Array.from({ length: 10 }, (_, j) => (i === j ? 1 : 0));

describe('image verdicts', () => {
  it('calls a confident chart or map content, and a confident panel or line decoration', () => {
    expect(judgeImage(towards(1), undefined, labelVectors)).toMatchObject({ label: IMAGE_LABELS.content[1], verdict: 'content' });
    expect(judgeImage(towards(6), undefined, labelVectors)).toMatchObject({ label: IMAGE_LABELS.decoration[1], verdict: 'decoration' });
  });
  it('stays unclear when content and decoration are close', () => {
    const mixed = towards(0).map((value, i) => (i === 0 || i === 5 ? Math.SQRT1_2 : 0));
    expect(judgeImage(mixed, undefined, labelVectors).verdict).toBe('unclear');
  });
});

describe('which graphics the model sees', () => {
  const item = (extra) => ({ page: 1, kind: 'unclear', share: 0.2, letters: 10, quad: [[0, 0], [1, 0], [1, 1], [0, 1]], ...extra });
  it('only unclear graphics with little text on them, largest first', () => {
    const report = { decorative: { items: [item({ share: 0.1 }), item({ kind: 'decoration' }), item({ kind: 'content' }), item({ letters: 900 }), item({ share: 0.005 }), item({ share: 0.4 })] } };
    expect(imageCandidates(report).map(candidate => [candidate.index, candidate.share])).toEqual([[5, 0.4], [0, 0.1]]);
  });
});

describe('image results in the review', () => {
  const quad = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const base = () => ({ analysisComplete: true, checks: [], pages: [], metadata: {},
    decorative: { items: [{ page: 3, kind: 'unclear', quad, share: 0.3, letters: 0, reason: 'a large picture with no caption' }, { page: 5, kind: 'unclear', quad, share: 0.02, letters: 30, reason: 'a graphic the rules can’t place' }] },
    figureAlternatives: { items: [], decorativeItems: [{ id: '3:decorative', page: 3, decorative: true, tagged: false, quads: [quad], keys: [] }, { id: '5:decorative', page: 5, decorative: true, tagged: false, quads: [quad], keys: [] }] },
    consistency: { items: [] } });
  it('turns a confident chart into an AI-tagged concern and clears a confident panel from the can’t-tell list', () => {
    const report = { ...base(), imageScreening: { inferencePerformed: true, model: { label: 'CLIP · image types' }, items: [
      { index: 0, page: 3, label: 'a map', contentScore: 0.97, verdict: 'content' }, { index: 1, page: 5, label: 'a plain coloured background or panel', contentScore: 0.05, verdict: 'decoration' }] } };
    const { buckets } = reviewSummary(report, reviewGroups(normalizeFindings(report).findings));
    const concern = buckets.check.find(item => item.method === 'image-screening');
    expect(fixCard(concern, report).title).toMatch(/marked as decoration/);
    expect(reviewPriority(concern).key).toBe('ai-warning');
    expect([...buckets.check, ...buckets.unknown].some(item => item.figureGroup === 'decorative' && item.members?.some(member => member.comparison.figure.page === 5))).toBe(false);
  });
  it('never adds an AI concern for a page the rules already flagged', () => {
    const report = { ...base(), consistency: { items: [{ id: 'decorative:3', kind: 'decorative', severity: 'concern', page: 3, captions: [], quads: [quad], reason: 'a large picture beside a figure or map caption' }] },
      imageScreening: { inferencePerformed: true, model: {}, items: [{ index: 0, page: 3, label: 'a map', contentScore: 0.97, verdict: 'content' }] } };
    expect(normalizeFindings(report).findings.filter(item => item.method === 'image-screening')).toEqual([]);
  });
});

describe('trusting the image model', () => {
  it('does not accept a content call on a thin strip with text, the way table rows fooled it', async () => {
    const { imageVerdict } = await import('../src/engine/image-model.js');
    const result = { verdict: 'content', label: 'a bar chart or line graph', contentScore: 0.98 };
    expect(imageVerdict(result, { share: 0.015, letters: 60 })).toBe('unclear');
    expect(imageVerdict(result, { share: 0.2, letters: 0 })).toBe('content');
    expect(imageVerdict({ verdict: 'decoration' }, { share: 0.015, letters: 60 })).toBe('decoration');
  });
});

describe('controller', () => {
  const quad = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const preferences = imageAI => ({ load: () => ({ modelId: 'minilm', checks: ['title'], imageAI }), save: () => true, clear: () => true });
  const report = { analysisComplete: true, checks: [], pages: [], metadata: { language: 'en' }, metadataConsistency: { candidates: [] },
    decorative: { items: [{ page: 2, kind: 'unclear', share: 0.3, letters: 0, quad }] } };
  const file = { name: 'source.pdf', size: 4, arrayBuffer: async () => new ArrayBuffer(4) };
  const make = consent => {
    const workers = [], imageCropper = vi.fn(async (source, data, items) => items.map(item => ({ index: item.index, page: item.page, blob: new Blob(['x']) })));
    const app = createAppController({ preferences: preferences(consent), imageCropper, fetcher: vi.fn(), digest: vi.fn(),
      workerFactory: kind => { const worker = { kind, postMessage: vi.fn(), terminate: vi.fn() }; workers.push(worker); return worker; } });
    app.openCompletedReport(report, file, 'image-test');
    return { app, workers, imageCropper };
  };
  it('does nothing without image-model consent', async () => {
    const { app, workers, imageCropper } = make(false);
    await app.runImageScreening();
    expect(imageCropper).not.toHaveBeenCalled();
    expect(workers.filter(worker => worker.kind === 'image')).toEqual([]);
  });
  it('sends clean crops to the image worker and records the result without touching rule outcomes', async () => {
    const { app, workers, imageCropper } = make(true);
    await app.runImageScreening();
    expect(imageCropper).toHaveBeenCalledTimes(2);
    expect(imageCropper.mock.calls[1][2]).toEqual([]);
    const worker = workers.find(item => item.kind === 'image');
    const request = worker.postMessage.mock.calls[0][0];
    expect(request.items).toEqual([expect.objectContaining({ index: 0, page: 2 })]);
    worker.onmessage({ data: { type: 'result', requestId: request.requestId, imageScreening: { inferencePerformed: true, items: [{ index: 0, page: 2, verdict: 'content', label: 'a map', contentScore: 0.9 }] } } });
    expect(app.getSnapshot().report.imageScreening.items[0].verdict).toBe('content');
    expect(app.getSnapshot().report.decorative.items[0].kind).toBe('unclear');
    expect(app.getSnapshot().modelBusy).toBe(false);
  });
  it('ignores a late result after the user cancels', async () => {
    const { app, workers } = make(true);
    await app.runImageScreening();
    const worker = workers.find(item => item.kind === 'image'), request = worker.postMessage.mock.calls[0][0];
    app.cancelScreening();
    worker.onmessage({ data: { type: 'result', requestId: request.requestId, imageScreening: { inferencePerformed: true, items: [] } } });
    expect(app.getSnapshot().report.imageScreening).toBeUndefined();
  });
});

describe('descriptions against pictures', () => {
  it('only checks real descriptions of well-cropped images, and needs at least five', async () => {
    const { descriptionCandidates } = await import('../src/engine/image-model.js');
    const figure = (id, alt, quad = [[0, 0], [200, 0], [200, 150], [0, 150]]) => ({ id, page: 1, tagged: true, alt, quads: [quad] });
    const photos = Array.from({ length: 5 }, (_, i) => figure(`p${i}`, `Photo of volunteers at a shelter ${i}`));
    const report = extra => ({ pages: [{ view: [0, 0, 600, 800] }], figureDescriptions: { items: [{ id: 'auto', flags: ['auto-generated'] }] },
      figureAlternatives: { items: [...photos, ...extra] } });
    const ids = descriptionCandidates(report([figure('chart', 'A bar chart of losses by region'), figure('auto', 'Description automatically generated'),
      figure('sliver', 'Photo of a field', [[0, 0], [20, 0], [20, 400], [0, 400]])])).map(item => item.id);
    expect(ids).toEqual(['p0', 'p1', 'p2', 'p3', 'p4']);
    expect(descriptionCandidates({ ...report([]), figureAlternatives: { items: photos.slice(0, 4) } })).toEqual([]);
  });
  it('flags a description its own picture ranks below third, and leaves out blank crops', async () => {
    const { rankDescriptions } = await import('../src/engine/image-model.js');
    // Six descriptions on separate axes; image 0 looks like descriptions 1–4 and not like its own (axis 0).
    const axis = i => Array.from({ length: 6 }, (_, j) => (i === j ? 1 : 0));
    const images = [0, 1, 2, 3, 4, 5].map(i => ({ id: `f${i}`, page: 1, vector: i === 0 ? [0, 0.5, 0.5, 0.5, 0.5, 0] : axis(i), blank: false }));
    const texts = [0, 1, 2, 3, 4, 5].map(axis);
    const ranked = rankDescriptions(images, texts);
    expect(ranked.filter(item => item.mismatch).map(item => item.id)).toEqual(['f0']);
    expect(ranked.find(item => item.id === 'f0').rank).toBe(5);
    expect(rankDescriptions(images.map((image, i) => ({ ...image, blank: i > 0 })), texts)).toEqual([]);
  });
  it('puts a mismatched description first in the image review with a plain note', async () => {
    const { descriptionNote } = await import('../src/review/workspace.js');
    expect(descriptionNote({ comparison: { description: { flags: [], image: { mismatch: true, rank: 6, of: 8 } } } })).toMatch(/matches its picture less well than 5 other descriptions/);
  });
});
