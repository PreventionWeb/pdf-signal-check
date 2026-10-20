import { describe, expect, it } from 'vitest';
import { compareNames, detectLanguage, inspectConsistency, runningNames } from '../src/engine/consistency.js';
import { compareTitles } from '../src/engine/titles.js';
import { assessSemantic } from '../src/engine/semantic.js';
import { normalizeFindings } from '../src/review/findings.js';
import { reviewGroups, reviewSummary, fixCard, reviewPriority } from '../src/review/workspace.js';

const block = (id, text) => ({ id, text });
const page = (number, { blocks = [], margin = [], extent = null, decorative = [] } = {}) => ({ number, blocks: blocks.map((text, i) => block(i, text)),
  marginLines: margin.map((text, i) => ({ y: 800 - i, segments: [text] })), decorativeExtent: extent, decorativeGraphics: decorative });
const report = ({ title = null, candidates = [], pages = [page(1)], language = 'en', keywords = null, subject = null, status = 'uncertain', figures = [] } = {}) => ({
  file: { name: 'report.pdf' }, metadata: { language, keywords, subject }, pages,
  metadataConsistency: { status, title, candidates }, figureAlternatives: { items: figures } });
const english = 'The report describes the risk to people and the economy. It is based on data from the countries that reported on the targets, and it shows how the risk has changed over time for the region. ';

describe('name comparison severity', () => {
  it('treats punctuation, case, order and spelling as minor', () => {
    expect(compareNames('Charting a Path: Global Report', 'Charting a Path Global Report')).toMatchObject({ kind: 'punctuation', severity: 'minor' });
    expect(compareNames('Toolkit and Framework for Heat', 'Framework and Toolkit for Heat')).toMatchObject({ kind: 'order', severity: 'minor' });
    expect(compareNames('Risk to Resilience Map', 'Risk to Resilince Map')).toMatchObject({ kind: 'spelling', severity: 'minor' });
    expect(compareNames('UNDRR STRATEGIC FRAMEWORK', 'UNDRR Strategic Framework').severity).toBe('none');
  });
  it('treats a different year or a swapped word as a concern', () => {
    expect(compareNames('Global Assessment Report 2025', 'Global Assessment Report 2024')).toMatchObject({ kind: 'year', severity: 'concern' });
    expect(compareNames('Jamaica Risk and Resilience Analysis', 'Haiti Risk and Resilience Analysis')).toMatchObject({ kind: 'substitution', severity: 'concern' });
  });
  it('leaves different wording to people or the AI rather than guessing', () => {
    expect(compareNames('IBIS Bulletin 17.04.2026', 'IBIS Bulletin Whole School News').severity).toBe('unresolved');
  });
  it('ignores punctuation lost where wrapped cover lines are joined', () => {
    expect(compareNames('Charting a Path Global Report', 'Charting a Path: Global Report', { ignorePunctuation: true }).severity).toBe('none');
  });
});

describe('running headers', () => {
  it('keeps a trailing year range and strips page numbers', () => {
    const pages = [1, 2, 3].map(n => page(n, { margin: [`STRATEGIC FRAMEWORK 2026-2030 ${n + 10}`] }));
    expect(runningNames(pages)[0].text).toBe('STRATEGIC FRAMEWORK 2026-2030');
  });
  it('flags a header with the wrong year, but not a shortened running title or a chapter name', () => {
    const pages = [1, 2, 3].map(n => page(n, { margin: ['Global Assessment Report 2024', 'Chapter about something else entirely'] }));
    const items = inspectConsistency(report({ title: 'Global Assessment Report 2025', pages })).items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'year', severity: 'concern' });
    const shortened = [1, 2, 3].map(n => page(n, { margin: ['Global Assessment Report'] }));
    expect(inspectConsistency(report({ title: 'Global Assessment Report 2025: Resilience Pays', pages: shortened })).items).toHaveLength(0);
  });
});

describe('dates and leftovers', () => {
  it('flags figures dated before the "as of" date on the first page', () => {
    const pages = [page(1, { blocks: ['Data as of April 2026 unless mentioned otherwise.', '• 176 countries reported', 'on the targets by October 2025.'] })];
    const stale = inspectConsistency(report({ pages })).items.find(item => item.kind === 'stale');
    expect(stale.evidence[0]).toMatchObject({ page: 1, date: 'by October 2025' });
    expect(stale.evidence[0].blockIds).toEqual([1, 2]);
  });
  it('does not flag dates that are not data claims or not older', () => {
    const pages = [page(1, { blocks: ['Data as of April 2026.', 'The framework was adopted by March 2015.', '87 countries reported by May 2026.'] })];
    expect(inspectConsistency(report({ pages })).items.find(item => item.kind === 'stale')).toBeUndefined();
  });
  it('flags draft labels on the cover and leftover placeholders', () => {
    const pages = [page(1, { blocks: ['Draft Report 8 May 2025'] }), page(2, { blocks: ['See Error! Reference source not found.'] })];
    const kinds = inspectConsistency(report({ pages, candidates: [{ page: 1, text: 'Draft Report 8 May 2025' }] })).items.map(item => item.kind);
    expect(kinds).toEqual(expect.arrayContaining(['draft', 'leftovers']));
  });
  it('does not treat "draft" in body text as a draft label', () => {
    const pages = [page(1, { blocks: ['Annual Report'] }), page(2, { blocks: ['Parliament reviewed the draft law.'] })];
    expect(inspectConsistency(report({ pages })).items.find(item => item.kind === 'draft')).toBeUndefined();
  });
});

describe('language and saved values', () => {
  it('detects a declared language that does not match the text', () => {
    const french = 'Le manuel décrit les risques pour les systèmes d’alerte précoce et la production des connaissances. Il est destiné aux pays qui sont en charge de la gestion des risques. ';
    expect(detectLanguage(french.repeat(6)).code).toBe('fr');
    const items = inspectConsistency(report({ language: 'en-US', pages: [page(1, { blocks: [french.repeat(6)] })] })).items;
    expect(items.find(item => item.kind === 'language')).toMatchObject({ declared: 'en-US', detected: { code: 'fr' } });
    expect(inspectConsistency(report({ language: 'en-GB', pages: [page(1, { blocks: [english.repeat(4)] })] })).items).toHaveLength(0);
  });
  it('stays silent when the language evidence is weak', () => {
    expect(detectLanguage('Annex 1 2 3 4 table')).toBeNull();
  });
  it('flags placeholder titles and ID-like keywords, but not descriptive titles', () => {
    const items = inspectConsistency(report({ title: '274770', keywords: 'DAF0DLt96kY,BADtDZkd2xA,flood risk' })).items;
    expect(items.map(item => item.kind)).toEqual(['title', 'keywords']);
    expect(items[1].terms).toEqual(['DAF0DLt96kY', 'BADtDZkd2xA']);
    expect(inspectConsistency(report({ title: 'UNDRR Strategic Framework 2026-2030' })).items).toHaveLength(0);
  });
});

describe('meaningful graphics marked as decoration', () => {
  it('flags a large decorative image beside a map caption', () => {
    const pages = [page(34, { blocks: ['Map 1. Sargassum seaweed spread', 'Source: University of Florida'], extent: { images: 1, largestImage: 0.63, paths: 5 } })];
    expect(inspectConsistency(report({ pages })).items[0]).toMatchObject({ kind: 'decorative', page: 34, severity: 'concern' });
  });
  it('ignores table borders, small images and sentences that only mention a figure', () => {
    const table = page(8, { blocks: ['Table 2: City responses'], extent: { images: 0, largestImage: 0, paths: 400 } });
    const small = page(9, { blocks: ['Figure 3. Trend'], extent: { images: 1, largestImage: 0.05, paths: 0 } });
    const mention = page(10, { blocks: ['Figure 20 identifies the main risks'], extent: { images: 0, largestImage: 0, paths: 900 } });
    expect(inspectConsistency(report({ pages: [table, small, mention] })).items).toHaveLength(0);
  });
});

describe('cover titles across lines', () => {
  it('matches a saved title against wrapped cover lines', () => {
    const line = (text, y) => ({ text, y, page: 1, source: 'cover text candidate', height: 30, maxHeight: 30, blockIds: [y] });
    expect(compareTitles({ infoTitle: 'Taming Wildfires in the Context of Climate Change' }, [line('Taming Wildfires in the', 700), line('Context of Climate Change', 660)]).status).toBe('match');
  });
});

describe('AI for title pairs the rules leave open', () => {
  const pair = { id: 'name:saved:cover:x', left: 'IBIS Bulletin April', right: 'IBIS Bulletin Whole School News' };
  it('records which pair the model compared', async () => {
    const result = await assessSemantic({ metadata: { language: 'en' }, checks: ['title'], names: [pair] }, async texts => texts.map(() => [1, 0]));
    expect(result.nameItems[0]).toMatchObject({ nameId: pair.id, status: 'semantically-related', inferencePerformed: true });
  });
  it('turns an AI result into minor or concern, and never overrides a rule-based concern', () => {
    const base = { analysisComplete: true, checks: [], pages: [], metadata: {}, consistency: { items: [
      { id: pair.id, kind: 'reworded', severity: 'unresolved', left: { role: 'saved', text: pair.left }, right: { role: 'cover', text: pair.right, page: 1, blockIds: [] } },
      { id: 'name:saved:running:y', kind: 'year', severity: 'concern', left: { role: 'saved', text: 'Report 2025' }, right: { role: 'running', text: 'Report 2024', pages: [2, 3, 4] } }] } };
    const semantic = status => ({ inferencePerformed: true, model: { id: 'm' }, nameItems: [{ nameId: pair.id, status, inferencePerformed: true, evidence: [{ similarity: 0.1 }] },
      { nameId: 'name:saved:running:y', status: 'semantically-related', inferencePerformed: true, evidence: [{ similarity: 0.99 }] }] });
    const findings = status => normalizeFindings({ ...base, semantic: semantic(status) }).findings.filter(f => f.source.path.startsWith('consistency'));
    expect(findings('suspected-mismatch')[0]).toMatchObject({ category: 'advisory-concern', severity: 'concern' });
    expect(findings('semantically-related')[0]).toMatchObject({ category: 'advisory-concern', severity: 'minor' });
    expect(findings('semantically-related')[1]).toMatchObject({ category: 'advisory-concern', severity: 'concern', method: 'consistency-rules' });
    expect(normalizeFindings(base).findings.find(f => f.id === `consistency:${pair.id}`).category).toBe('uncertain');
  });
});

describe('presentation', () => {
  it('ranks minor differences after warnings and groups them into one tidy-up task', () => {
    const name = (id, kind, severity) => ({ id, kind, severity, left: { role: 'saved', text: `Title ${id}` }, right: { role: 'running', text: `Title: ${id}`, pages: [2, 3, 4] } });
    const data = { analysisComplete: true, checks: [], pages: [], metadata: {}, consistency: { items: [name('a', 'punctuation', 'minor'), name('b', 'punctuation', 'minor'),
      { id: 'date:draft', kind: 'draft', severity: 'concern', label: 'Draft', pages: [1], blockIds: [] }] } };
    const summary = reviewSummary(data, reviewGroups(normalizeFindings(data).findings));
    const titles = summary.buckets.check.map(item => fixCard(item, data).title);
    expect(titles).toEqual(['Still marked “Draft”', 'Tidy small differences in the title (2)']);
    expect(reviewPriority(summary.buckets.check[1]).key).toBe('minor');
  });
  it('shows one verdict for a saved title and cover pair, not the older undecided title comparison as well', () => {
    const data = { analysisComplete: true, checks: [], pages: [], metadata: { infoTitle: 'Taming Wildfires (EN)' },
      metadataConsistency: { status: 'uncertain', reason: 'No sufficiently strong title evidence.', candidates: [{ page: 1, text: 'Taming Wildfires', source: 'cover text candidate', blockIds: [0] }] },
      consistency: { items: [{ id: 'name:saved:cover:x', kind: 'shortened', severity: 'minor', left: { role: 'saved', text: 'Taming Wildfires (EN)' },
        right: { role: 'cover', text: 'Taming Wildfires', page: 1, blockIds: [0] } }] } };
    const summary = reviewSummary(data, reviewGroups(normalizeFindings(data).findings));
    expect([...summary.buckets.check, ...summary.buckets.unknown].map(item => item.source.path)).toEqual(['consistency.name:saved:cover:x']);
  });
});
