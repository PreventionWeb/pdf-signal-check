import { describe, expect, it } from 'vitest';
import { analyzePdf, finalize } from '../src/engine/analyze.js';
import { compareTitles, normalizeTitle } from '../src/engine/titles.js';
import { makePdf } from './fixtures.js';

const check = (r, id) => r.checks.find(c => c.id === id);

describe('text actionability profile', () => {
  it('never accepts an incomplete run, an indeterminate required check, or an empty report', () => {
    expect(finalize({ analysisComplete: false, checks: [{ required: true, status: 'pass' }] }).accepted).toBe(false);
    expect(finalize({ analysisComplete: true, checks: [{ required: true, status: 'indeterminate' }] }).accepted).toBe(false);
    expect(finalize({ analysisComplete: true, checks: [] }).accepted).toBe(false);
  });
  it('accepts a connected tagged text document and exports title evidence', async () => {
    const report = await analyzePdf(await makePdf(), { fileName: 'good.pdf' });
    expect(report.accepted).toBe(true);
    expect(report.analysisComplete).toBe(true);
    expect(report.pages[0].blocks[0].text).toContain('Flood Risk Report 2026');
    expect(report.pages[0].logicalBlocks[0]).toMatchObject({ role: 'H1', text: 'Flood Risk Report 2026', key: '1:0' });
    expect(report.metadataConsistency.status).toBe('match');
    expect(report.metadataConsistency.candidates[0].page).toBe(1);
  });
  it('rejects selectable but untagged text', async () => {
    const r = await analyzePdf(await makePdf({ tagged: false }));
    expect(r.accepted).toBe(false);
    expect(check(r, 'structure').status).toBe('fail');
  });
  it('detects partial text tagging', async () => {
    const r = await analyzePdf(await makePdf({ partial: true }));
    expect(r.accepted).toBe(false);
    expect(check(r, 'coverage').status).toBe('fail');
  });
  it('does not accept empty trees or broken parent associations', async () => {
    for (const opts of [{ emptyTree: true }, { brokenParent: true }, { dangling: true }]) {
      const r = await analyzePdf(await makePdf(opts));
      expect(r.accepted).toBe(false);
      expect(r.checks.some(c => c.status === 'fail')).toBe(true);
    }
  });
  it('keeps a wrong title separate from structural acceptance', async () => {
    const r = await analyzePdf(await makePdf({ title: 'Flood Risk Report 2025' }));
    expect(r.accepted).toBe(true);
    expect(r.metadataConsistency.status).toBe('suspected-mismatch');
    expect(r.metadataConsistency.reason).toContain('year');
  });
  it('does not establish compliance for unsupported forms or non-artifact graphics', async () => {
    for (const opts of [{ form: true }, { graphic: true }, { actualText: true }, { formXObject: true }]) {
      const r = await analyzePdf(await makePdf(opts));
      expect(r.accepted).toBe(false);
      expect(check(r, 'supported-content').status).toBe('indeterminate');
    }
    expect((await analyzePdf(await makePdf({ graphic: true, artifactGraphic: true }))).accepted).toBe(true);
  });
  it('rejects missing language and suspicious decoded text', async () => {
    expect(check(await analyzePdf(await makePdf({ language: '' })), 'language').status).toBe('fail');
    expect(check(await analyzePdf(await makePdf({ badText: true })), 'text').status).not.toBe('pass');
  });
  it('fails closed on page limits and malformed input', async () => {
    const limited = await analyzePdf(await makePdf(), { maxPages: 0 });
    expect(limited.accepted).toBe(false);
    expect(limited.analysisComplete).toBe(false);
    expect(limited.checks[0].status).toBe('indeterminate');
    const invalid = await analyzePdf(new TextEncoder().encode('not a PDF'));
    expect(invalid.accepted).toBe(false);
    expect(check(invalid, 'load').status).toBe('fail');
  });
});

describe('title identity rules', () => {
  it('normalizes typography without dropping years', () => {
    expect(normalizeTitle(' Flood  Risk\nReport — 2026 ')).toBe(normalizeTitle('Flood Risk Report - 2026'));
    expect(normalizeTitle('Report 2026')).not.toBe(normalizeTitle('Report 2025'));
  });
  it('leaves same-topic different titles uncertain without claiming identity', () => {
    expect(compareTitles({ infoTitle: 'Flood preparedness' }, [{ text: 'Planning for floods', page: 1, source: 'tagged H1' }]).status).toBe('uncertain');
  });
  it('does not hide metadata conflicts behind one matching source', () => {
    expect(compareTitles({ infoTitle: 'Report 2025', xmpTitles: [{ lang: 'x-default', text: 'Report 2026' }] }, [{ text: 'Report 2026', page: 1, source: 'tagged H1' }]).status).toBe('suspected-mismatch');
  });
  it('does not flag disjoint years in unrelated passages as title mismatch', () => {
    expect(compareTitles({ infoTitle: 'Flood report 2026' }, [{ text: 'History of drainage in 1800', page: 1, source: 'tagged H1' }]).status).toBe('uncertain');
  });
  it('flags a close title with one substituted entity term for inspection', () => {
    expect(compareTitles({ infoTitle: 'Mountain Observatory Annual Report 2025' }, [{ text: 'Harbor Observatory Annual Report 2025', page: 1, source: 'tagged H1' }]).status).toBe('suspected-mismatch');
  });
});
