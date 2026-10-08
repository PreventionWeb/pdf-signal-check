import { describe, it, expect, vi } from 'vitest';
import { buildDocumentEvidence, selectTopicEvidence } from '../src/engine/topic-retrieval.js';
import { buildScreeningRequest } from '../src/runtime/screening-request.js';
import { assessSemantic } from '../src/engine/semantic.js';
const page = (number, text) => ({ number, blocks: [{ id: 1, key: `${number}:1`, text }], logicalBlocks: [] });
const opening = 'This introduction explains the purpose and organisation of this report, including its audience and publication process. ';
const flood = 'Flood preparedness includes monitoring river levels, planning evacuations and training responders before severe rainfall. ';
const report = () => ({ analysisComplete: true, accepted: false, checks: [], metadata: { language: 'en', subject: 'Flood preparedness', keywords: 'evacuations' }, metadataConsistency: { candidates: [] }, pages: [page(1, opening), page(2, opening), page(12, flood)] });

describe('uncommitted document evidence experiment', () => {
  it('retains later pages and source locations while bounding the candidate pool', () => {
    const original = Array.from({ length: 300 }, (_, i) => page(i + 1, `${opening}${i}`));
    const before = structuredClone(original);
    const built = buildDocumentEvidence(original);
    expect(built.passages).toHaveLength(240);
    expect(built.passages[0].page).toBe(1);
    expect(built.passages.at(-1).page).toBe(300);
    expect(built.coverage.scannedPassages).toBe(300);
    expect(built.passages[0].blockIds).toEqual([1]);
    expect(original).toEqual(before);
    expect(buildDocumentEvidence(original, { maxPassages: 1 }).passages).toHaveLength(1);
  });
  it('finds literal support later in the document without calling it an AI conclusion', () => {
    const built = buildDocumentEvidence(report().pages);
    const selected = selectTopicEvidence('Flood preparedness', built);
    expect(selected.receipt.baseline.page).toBe(12);
    expect(selected.receipt.baseline.matchedWords).toEqual(['flood', 'preparedness']);
    expect(selected.evidence.length).toBeLessThanOrEqual(8);
    expect(new Set(selected.evidence.map(p => `${p.page}:${p.text}`)).size).toBe(selected.evidence.length);
    expect(selectTopicEvidence('Wildfire mitigation', built).receipt.baseline).toBeNull();
  });
  it('keeps text beyond the start of a long block and short tails with their source location', () => {
    const built = buildDocumentEvidence([page(1, `${'introduction '.repeat(100)}flood preparedness`)]);
    expect(built.passages.map(p => p.text).join('')).toContain('flood preparedness');
    expect(built.passages.every(p => p.text.length <= 800 && p.blockIds[0] === 1)).toBe(true);
    expect(selectTopicEvidence('flood preparedness', built).receipt.baseline.page).toBe(1);
    expect(buildDocumentEvidence([page(2, 'Flood preparedness')]).passages).toHaveLength(1);
  });
  it('keeps the baseline request unchanged unless explicitly enabled and records broader AI inputs', async () => {
    const source = report();
    const normal = buildScreeningRequest(source, { modelId: 'minilm', checks: ['subject', 'keywords'] });
    const experimental = buildScreeningRequest(source, { modelId: 'minilm', checks: ['subject', 'keywords'], semanticExperiment: true });
    expect(normal.documentEvidence).toBeUndefined();
    expect(experimental.documentEvidence.coverage.retainedPages).toEqual([1, 2, 12]);
    const embed = vi.fn(async texts => texts.map(text => /flood|evacuations/i.test(text) ? [1, 0] : [0, 1]));
    const result = await assessSemantic(experimental, embed);
    expect(result.subject.evidence[0].page).toBe(12);
    expect(result.subject.retrieval.baseline.page).toBe(12);
    expect(result.keywordItems[0].retrieval.mode).toBe('document-evidence-v1');
    expect(source.accepted).toBe(false);
    const baselineResult = await assessSemantic(normal, embed);
    expect(baselineResult.subject.retrieval).toBeUndefined();
    expect(baselineResult.subject.evidence.every(e => e.page <= 2)).toBe(true);
  });
});
