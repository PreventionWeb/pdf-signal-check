import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { analyzePdf } from '../src/engine/analyze.js';

const expectations = {
  '01-clean-text': [true, 'match'],
  '02-artifact-logo': [true, 'match'],
  '03-meaningful-figure': [false, 'match', 'supported-content', 'indeterminate'],
  '04-no-metadata': [false, 'uncertain', 'title', 'fail'],
  '05-untagged': [false, 'match', 'structure', 'fail'],
  '06-empty-structure': [false, 'match', 'structure', 'fail'],
  '07-partial-tags': [false, 'match', 'coverage', 'fail'],
  '08-wrong-year': [true, 'suspected-mismatch'],
  '09-wrong-entity': [true, 'suspected-mismatch'],
  '10-conflicting-metadata': [true, 'suspected-mismatch'],
  '11-combined-defects': [false, 'uncertain', 'coverage', 'fail'],
  '12-german-control': [true, 'match'],
  '13-tagged-title-mismatch': [true, 'suspected-mismatch'],
  '14-author-mismatch': [true, 'match'],
  '15-title-author-mismatch': [true, 'suspected-mismatch'],
  '16-correct-reading-order': [true, 'match'],
  '17-flawed-reading-order': [true, 'match'],
  '18-title-author-control': [true, 'match'],
};

describe('representative calibration corpus', () => {
  for (const [id, [accepted, metadata, check, status]] of Object.entries(expectations)) {
    it(id, async () => {
      const bytes = await readFile(new URL(`../public/calibration/${id}.pdf`, import.meta.url));
      const r = await analyzePdf(new Uint8Array(bytes), { pdfjsOptions: {
        standardFontDataUrl: new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url).pathname,
      } });
      expect(r.file.pages).toBe(2);
      expect(r.analysisComplete).toBe(true);
      expect(r.accepted).toBe(accepted);
      expect(r.metadataConsistency.status).toBe(metadata);
      if (check) expect(r.checks.find(c => c.id === check).status).toBe(status);
    });
  }
});

async function readSample(id) { return analyzePdf(new Uint8Array(await readFile(new URL(`../public/calibration/${id}.pdf`,import.meta.url))),{pdfjsOptions:{standardFontDataUrl:new URL('../node_modules/pdfjs-dist/standard_fonts/',import.meta.url).pathname}}); }
describe('publication identity and reading order ground truth',()=>{
 it('flags author identity mismatch separately while preserving a matching title',async()=>{
   const r=await readSample('14-author-mismatch');
   expect(r.metadata.author).toBe('Iris Hale; Owen Brooks');
   expect(r.pages[0].logicalBlocks.some(b=>b.role==='P' && b.text==='Authors: Maya Chen; Leo Martin')).toBe(true);
   expect(r.metadata.xmpAuthors).toEqual(['Iris Hale','Owen Brooks']);
   expect(r.authorConsistency.status).toBe('suspected-mismatch');
   expect(r.checks.some(c=>/author/i.test(c.id))).toBe(false);
   expect(r.accepted).toBe(true);
   const control=await readSample('18-title-author-control');
   expect(control.metadata.author).toBe('Maya Chen; Leo Martin');
   expect(control.pages.map(p=>p.logicalBlocks.map(b=>b.text))).toEqual(r.pages.map(p=>p.logicalBlocks.map(b=>b.text)));
   expect(control.accepted).toBe(true); expect(control.authorConsistency.status).toBe('match');
 });
 it('keeps identical visible content and valid links while reordering the logical columns',async()=>{
   const correct=await readSample('16-correct-reading-order'), flawed=await readSample('17-flawed-reading-order');
   expect(flawed.pages[1].blocks.map(b=>b.text)).toEqual(correct.pages[1].blocks.map(b=>b.text));
   const headings=r=>r.pages[1].logicalBlocks.filter(b=>b.role==='H2').map(b=>b.text);
   expect(headings(correct).map(t=>t.slice(0,1))).toEqual(['1','2','3','4']);
   expect(headings(flawed).map(t=>t.slice(0,1))).toEqual(['3','4','1','2']);
   expect(flawed.pages.every(p=>p.untaggedCharacters===0 && p.dangling.length===0)).toBe(true);
   expect(flawed.accepted).toBe(true); // advisories do not change structural acceptance
   expect(flawed.readingOrder.status).toBe('requires-review');
   expect(correct.readingOrder.status).toBe('uncertain'); // no global reading-order certification
 });
});
