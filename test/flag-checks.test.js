import { describe, expect, it } from 'vitest';
import { inspectContents } from '../src/engine/contents.js';
import { quantities, conflictingValues, similarPairs, factCandidates } from '../src/engine/facts.js';
import { inspectFigureDescriptions } from '../src/engine/figure-descriptions.js';
import { assessSemantic } from '../src/engine/semantic.js';
import { normalizeFindings } from '../src/review/findings.js';
import { reviewGroups, reviewSummary, fixCard, reviewPriority } from '../src/review/workspace.js';

// One extracted text line per block; y runs down the page.
const page = (number, lines, { height = 10 } = {}) => ({ number, logicalBlocks: [], blocks: lines.map((line, i) => {
  const [text, size] = Array.isArray(line) ? line : [line, height];
  return { id: i, text, y: 800 - i * 20, height: size, transform: [1, 0, 0, 1, 50, 800 - i * 20] };
}) });
const contentsPage = entries => page(2, ['Contents', ...entries.map(([text, number]) => `${text} ${'.'.repeat(8)} ${number}`)]);
const heading = (number, text) => page(number, [[text, 18], 'Body text that follows the heading on this page.', 'More body text.']);

describe('contents against the pages', () => {
  const titles = ['Introduction to the report', 'Global progress on targets', 'Financing for risk reduction', 'Ways forward for countries', 'Annex of country data'];
  const body = printed => titles.map((text, i) => heading(printed[i] + 2, text));
  it('stays quiet when every entry is on its page (with a printed-to-PDF offset)', () => {
    const pages = [page(1, ['Cover']), contentsPage(titles.map((t, i) => [t, 1 + i * 2])), ...body([1, 3, 5, 7, 9])].sort((a, b) => a.number - b.number);
    expect(inspectContents({ pages }).items).toEqual([]);
  });
  it('flags an entry whose heading moved to another page', () => {
    const printed = [1, 3, 5, 7, 9];
    const pages = [page(1, ['Cover']), contentsPage(titles.map((t, i) => [t, printed[i]])), ...titles.map((text, i) => heading(i === 2 ? 14 : printed[i] + 2, text))];
    const [item] = inspectContents({ pages }).items;
    expect(item).toMatchObject({ kind: 'contents-page', severity: 'concern', expected: 7, foundPage: 14 });
  });
  it('matches headings that wrap onto two lines', () => {
    const pages = [page(1, ['Cover']), contentsPage(titles.map((t, i) => [t, 1 + i * 2])), ...body([1, 3, 5, 7, 9])];
    pages[4] = page(7, [['Financing for risk', 18], ['reduction', 18], 'Body text.']);
    expect(inspectContents({ pages }).items).toEqual([]);
  });
  it('leaves an entry with no matching heading for the AI, and never judges figure-list entries', () => {
    const entries = [...titles.map((t, i) => [t, 1 + i * 2]), ['Figure 3: Losses by region', 5]];
    const pages = [page(1, ['Cover']), contentsPage(entries), ...body([1, 3, 5, 7, 9])];
    pages[4] = page(7, [['Paying for resilience', 18], 'Body text.']);
    const items = inspectContents({ pages }).items;
    expect(items).toEqual([expect.objectContaining({ kind: 'contents-wording', severity: 'unresolved', expected: 7, headings: ['Paying for resilience'] })]);
  });
  it('stays quiet when the list cannot be aligned with the pages', () => {
    const pages = [page(1, ['Cover']), contentsPage(titles.map((t, i) => [t, 40 + i])), page(3, ['Unrelated text'])];
    expect(inspectContents({ pages }).items).toEqual([]);
  });
});

describe('same fact, different numbers', () => {
  const fact = (page, text) => ({ page, text, quantities: quantities(text) });
  it('reads quantities with their units and ignores bare years', () => {
    expect(quantities('In 2025, 176 countries reported, up 12% since 2015.')).toEqual([{ value: 176, unit: 'countries' }, { value: 12, unit: '%' }]);
    expect(quantities('124 countries report early warning systems, 77 of which were supported.')).toEqual([{ value: 124, unit: 'countries' }, { value: 77, unit: 'countries' }]);
    expect(conflictingValues(fact(1, '124 countries report early warning systems, 77 of which were supported.'), fact(2, '77 countries received support for early warning systems during the programme.'))).toBeNull();
    expect(quantities('124 countries tested 30 projects, 12 of which were completed.')).toEqual([{ value: 124, unit: 'countries' }, { value: 30, unit: 'projects' }, { value: 12, unit: 'projects' }]);
  });
  it('flags the same measure with different values', () => {
    expect(conflictingValues(fact(143, 'For someone born in 2025, that probability would rise to nearly nine in ten (86%).'),
      fact(154, 'That probability rises to nearly nine in ten (89%) for someone born in 2025.'))).toEqual([{ unit: '%', a: 86, b: 89 }]);
  });
  it('does not flag restated subsets, different years, values inside a range, or different measures', () => {
    expect(conflictingValues(fact(5, '124 countries report early warning systems, 77 of which were supported.'), fact(34, '77 countries received support for early warning.'))).toBeNull();
    expect(conflictingValues(fact(1, 'In 2019, 40 countries reported losses.'), fact(2, 'In 2023, 50 countries reported losses.'))).toBeNull();
    expect(conflictingValues(fact(15, 'The fires caused an estimated $100 billion in losses.'), fact(17, 'The fires caused an estimated $76 billion to $131 billion in losses.'))).toBeNull();
    expect(conflictingValues(fact(17, 'The WUI area increased by 33% while the WUI population increased by 34%.'), fact(66, 'The WUI area increased by 33%, while the number of houses in the WUI grew by 40%.'))).toBeNull();
  });
  it('only pairs sentences the model finds very similar, on different pages', () => {
    const a = fact(1, 'For someone born in 2025, that probability would rise to nearly nine in ten (86%).'), b = fact(9, 'That probability rises to nearly nine in ten (89%) for someone born in 2025.');
    expect(similarPairs([a, b], [[1, 0], [0.99, 0.141]], 0.88)).toHaveLength(1);
    expect(similarPairs([a, b], [[1, 0], [0.5, 0.866]], 0.88)).toHaveLength(0);
    expect(similarPairs([a, { ...b, page: 1 }], [[1, 0], [1, 0]], 0.88)).toHaveLength(0);
  });
  it('skips citations, captions and contents lines as candidates', () => {
    const sentences = ['Smith et al. reported 40% losses in 2019 (Smith, 2020).', 'Figure 3: 40% of countries reported losses this year.', 'Annex of country data with 40 countries ........ 12', '40% of countries reported losses this year according to the monitor.'];
    expect(factCandidates([{ page: 1, sentences: sentences.map(text => ({ text, blockIds: [] })) }]).map(c => c.text)).toEqual([sentences[3]]);
  });
});

describe('image description triage', () => {
  const report = alts => ({ pages: [page(1, ['Map 1. Sargassum spread in 2023', 'Body text.'])],
    figureAlternatives: { items: alts.map((alt, i) => ({ id: `1:${i}`, page: 1, tagged: true, alt, quads: [] })) } });
  it('flags authoring-tool placeholders, generic words, file names and repeated descriptions, but not repeated logos', () => {
    const items = inspectFigureDescriptions(report(['[Alt text was not generated.]', 'A graph on a black background\n\nDescription automatically generated', 'chart', 'IMG_2041.jpg',
      'Flood map', 'Flood map', 'Flood map', 'UNDRR logo', 'UNDRR logo', 'UNDRR logo'])).items.map(item => item.flags);
    expect(items).toEqual([['auto-generated'], ['auto-generated'], ['generic'], ['file-name'], ['duplicate'], ['duplicate'], ['duplicate'], [], [], []]);
  });
  it('pairs a safely located description with its caption only, never with unrelated body text', () => {
    const data = report(['Map of seaweed across the Caribbean']);
    data.figureAlternatives.items[0].quads = [[[40, 650], [400, 650], [400, 750], [40, 750]]];
    data.pages[0].blocks[0].quad = [[40, 780], [400, 780], [400, 800], [40, 800]];
    const [item] = inspectFigureDescriptions(data).items;
    expect(item.context.text).toBe('Map 1. Sargassum spread in 2023');
    const noCaption = { ...report(['Photo of children planting trees']), pages: [page(1, ['Our work with communities continues.'])] };
    expect(inspectFigureDescriptions(noCaption).items[0].context).toBeNull();
  });
  it('treats a placeholder description as missing: a critical fix', () => {
    const data = { analysisComplete: true, checks: [], pages: [page(1, ['Text'])], metadata: {},
      figureAlternatives: { items: [{ id: '1:1', page: 1, tagged: true, alt: '[Alt text was not generated.]', status: 'present', quads: [], keys: [] }] } };
    data.figureDescriptions = inspectFigureDescriptions(data);
    const summary = reviewSummary(data, reviewGroups(normalizeFindings(data).findings));
    expect(summary.buckets.fix.map(item => fixCard(item, data).title)).toEqual(['Add descriptions for images (1)']);
  });
});

describe('AI-decided results', () => {
  it('compares figure captions, contents headings and quantity sentences in one request', async () => {
    const embed = async texts => texts.map(text => /probability/.test(text) ? [1, 0] : [0, 1]);
    const facts = [{ page: 143, text: 'For someone born in 2025, that probability would rise to nearly nine in ten (86%).' }, { page: 154, text: 'That probability rises to nearly nine in ten (89%) for someone born in 2025.' }]
      .map(fact => ({ ...fact, blockIds: [], quantities: quantities(fact.text) }));
    const result = await assessSemantic({ metadata: { language: 'en' }, checks: ['title'], facts,
      figures: [{ id: '1:1', alt: 'Photo of a school', caption: 'Map 1. Sargassum spread' }], contents: [{ id: 'c', entry: 'Paying for resilience', headings: ['Financing for risk reduction'] }] }, embed);
    expect(result.factPairs).toEqual([expect.objectContaining({ values: [{ unit: '%', a: 86, b: 89 }], inferencePerformed: true })]);
    expect(result.figureItems[0]).toMatchObject({ figureId: '1:1', inferencePerformed: true });
    expect(result.contentItems[0]).toMatchObject({ contentsId: 'c', inferencePerformed: true });
  });
  it('ranks an AI-found conflict after rule-based warnings and marks its method', () => {
    const data = { analysisComplete: true, checks: [], pages: [], metadata: {},
      consistency: { items: [{ id: 'date:draft', kind: 'draft', severity: 'concern', label: 'Draft', pages: [1], blockIds: [] }] },
      semantic: { inferencePerformed: true, model: { id: 'm', label: 'MiniLM · compact English' }, factPairs: [{ a: { page: 3, text: 'Nine in ten (86%).', blockIds: [1] },
        b: { page: 9, text: 'Nine in ten (89%).', blockIds: [2] }, values: [{ unit: '%', a: 86, b: 89 }], similarity: 0.91, inferencePerformed: true }] } };
    const { buckets } = reviewSummary(data, reviewGroups(normalizeFindings(data).findings));
    expect(buckets.check.map(item => reviewPriority(item).key)).toEqual(['warning', 'ai-warning']);
    expect(fixCard(buckets.check[1], data).title).toBe('Compare these two numbers: 86% and 89%');
  });
  it('does not repeat keywords that the rules already identified as internal codes', () => {
    const data = { analysisComplete: true, checks: [], pages: [], metadata: { keywords: 'DAF0DLt96kY' },
      consistency: { items: [{ id: 'placeholder:keywords', kind: 'keywords', severity: 'concern', value: 'DAF0DLt96kY', terms: ['DAF0DLt96kY'] }] },
      semantic: { inferencePerformed: true, model: { id: 'm' }, keywords: { status: 'suspected-mismatch', method: 'embedding-screening', inferencePerformed: true },
        keywordItems: [{ keyword: 'DAF0DLt96kY', status: 'suspected-mismatch', method: 'embedding-screening', inferencePerformed: true, evidence: [] }] } };
    const { buckets } = reviewSummary(data, reviewGroups(normalizeFindings(data).findings));
    expect(buckets.check.filter(item => item.source.path.startsWith('semantic.keywordItems'))).toEqual([]);
  });
});
