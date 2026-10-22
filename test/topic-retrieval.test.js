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
  it('compares saved descriptions and keywords with passages from across the PDF by default', async () => {
    const source = report();
    const request = buildScreeningRequest(source, { modelId: 'minilm', checks: ['subject', 'keywords'] });
    expect(request.documentEvidence.coverage.retainedPages).toEqual([1, 2, 12]);
    const embed = vi.fn(async texts => texts.map(text => /flood|evacuations/i.test(text) ? [1, 0] : [0, 1]));
    const result = await assessSemantic(request, embed);
    expect(result.subject.evidence[0].page).toBe(12);
    expect(result.subject.retrieval.baseline.page).toBe(12);
    expect(result.keywordItems[0].retrieval.mode).toBe('document-evidence-v1');
    expect(source.accepted).toBe(false);
  });
});

const largeReport = () => ({ ...report(), pages: Array.from({ length: 600 }, (_, i) => page(i + 1, `${opening} Passage ${i + 1}.`)) });

describe('lexical retrieval before pool sampling', () => {
  it('recovers later literal support omitted by the old 240-passage spread with unchanged inference budgets', async () => {
    const source = largeReport();
    const oldPool = buildDocumentEvidence(source.pages);
    const omitted = source.pages.find(p => p.number > 400 && !oldPool.coverage.retainedPages.includes(p.number));
    omitted.blocks[0].text = flood;
    expect(selectTopicEvidence('Flood preparedness', buildDocumentEvidence(source.pages)).receipt.baseline).toBeNull();
    const before = structuredClone(source);
    const request = buildScreeningRequest(source, { modelId: 'minilm', checks: ['subject', 'keywords'] });
    const selected = selectTopicEvidence(source.metadata.subject, request.documentEvidence);
    expect(selected.receipt.baseline).toMatchObject({ page: omitted.number, blockIds: [1], keys: [`${omitted.number}:1`] });
    expect(selected.receipt).toMatchObject({ scannedPassages: 600, retainedPassages: 240, omittedPassages: 360,
      lexicalScanScope: 'original document passages', scannedLexicalMatches: 1, selectedLimit: 8 });
    expect(request.documentEvidence.passages).toHaveLength(240);
    expect(request.documentEvidence.coverage.retainedPages.at(-1)).toBe(600);
    expect(buildScreeningRequest(source, { modelId: 'minilm', checks: ['subject', 'keywords'] })).toEqual(request);
    const embed = vi.fn(async texts => texts.map(text => /flood|evacuations/i.test(text) ? [1, 0] : [0, 1]));
    const result = await assessSemantic(request, embed);
    expect(request.modelId).toBe('minilm');
    expect(result.subject.evidence.some(e => e.page === omitted.number)).toBe(true);
    expect(result.keywordItems[0].retrieval.baseline.page).toBe(omitted.number);
    expect(result.subject.retrieval.selectedPassages).toBeLessThanOrEqual(8);
    expect(result.keywordItems[0].retrieval.selectedPassages).toBeLessThanOrEqual(8);
    expect(embed.mock.calls[0][0].length).toBeLessThanOrEqual(2 * (1 + 8));
    expect(source).toEqual(before);
  });

  it('preserves the exact no-query spread and skips unselected, oversized and excess keyword queries', () => {
    const source = largeReport();
    source.metadata.keywords = Array.from({ length: 14 }, (_, i) => `term${i}`).join(';');
    source.metadata.subject = 'x'.repeat(351);
    const none = buildScreeningRequest(source, { modelId: 'minilm', checks: ['title'] });
    expect(none.documentEvidence.passages).toEqual(buildDocumentEvidence(source.pages).passages);
    expect(none.documentEvidence.lexicalQueries).toEqual([]);
    const request = buildScreeningRequest(source, { modelId: 'minilm', checks: ['subject', 'keywords'] });
    expect(request.documentEvidence.lexicalQueries.map(search => search.query)).toEqual(Array.from({ length: 12 }, (_, i) => `term${i}`));
  });

  it('caps per-query retention, deduplicates sources and preserves opening and diverse fallback evidence', () => {
    const pages = Array.from({ length: 500 }, (_, i) => page(i + 1, `Flood preparedness advice ${i}. ${opening}`));
    const built = buildDocumentEvidence(pages, { queries: ['Flood preparedness', 'preparedness', 'Flood preparedness'], maxPassages: 900, characters: 900 });
    expect(built.passages).toHaveLength(240);
    expect(built.lexicalQueries).toHaveLength(2);
    expect(built.lexicalQueries.every(query => query.retainedPassageIndices.length === 4 && query.matchedPassages === 500)).toBe(true);
    expect(new Set(built.passages.map(p => p.passageIndex)).size).toBe(240);
    const selected = selectTopicEvidence('unmentioned', built, [{ page: 1, text: 'Opening context', blockIds: [42] }]);
    expect(selected.evidence[0]).toMatchObject({ page: 1, text: 'Opening context', blockIds: [42] });
    expect(selected.evidence.some(p => p.page === 500)).toBe(true);
    expect(selected.receipt.baseline).toBeNull();
    expect(selected.receipt.lexicalScanScope).toBe('retained pool only');
    expect(selectTopicEvidence('Flood preparedness', built, [], { limit: 100 }).evidence.length).toBeLessThanOrEqual(8);
    expect(selectTopicEvidence('Flood preparedness', built, [], { limit: 0 }).receipt.baseline).toBeNull();
  });

  it('enforces smaller pools, character and query bounds, ties and whitespace-only chunk accounting', () => {
    const pages = [page(1, `${' '.repeat(1600)}Flood preparedness`.repeat(3)), page(2, flood), page(3, opening)];
    const built = buildDocumentEvidence(pages, { maxPassages: 1, characters: 40, queries: ['Flood preparedness'] });
    expect(built.passages).toHaveLength(1);
    expect(built.passages[0].text.length).toBeLessThanOrEqual(40);
    expect(built.passages[0].page).toBe(1);
    expect(built.passages[0].blockIds).toEqual([1]);
    expect(built.coverage.scannedPassages - built.coverage.retainedPassages).toBe(built.coverage.omittedPassages);
    expect(buildDocumentEvidence(pages, { maxPassages: 0, characters: 0 }).passages).toEqual([]);
    const capped = buildDocumentEvidence([page(1, flood)], { queries: [...Array.from({ length: 20 }, (_, i) => `query${i}`), 'x'.repeat(351)] });
    expect(capped.lexicalQueries).toHaveLength(13);
    expect(capped.coverage.omittedQueries).toBe(8);
  });

  it('keeps existing caption source references in a compatible request field without mutating them', () => {
    const source = report();
    source.figureDescriptions = { items: [{ id: 'figure1', alt: 'River gauge', flags: [], context: { text: 'Figure 1: River gauge', page: 12, blockIds: [7, 8], method: 'bounded-spatial-caption-v2' } }] };
    const request = buildScreeningRequest(source, { modelId: 'minilm', checks: ['subject'] });
    expect(request.figures[0]).toMatchObject({ caption: 'Figure 1: River gauge', captionContext: { page: 12, blockIds: [7, 8], method: 'bounded-spatial-caption-v2' } });
    request.figures[0].captionContext.blockIds.push(9);
    expect(source.figureDescriptions.items[0].context.blockIds).toEqual([7, 8]);
  });
});
