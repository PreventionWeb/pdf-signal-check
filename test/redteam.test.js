import { expect, it } from 'vitest';
import { PDFDocument, PDFName, decodePDFRawStream } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { makePdf } from './fixtures.js';
import { analyzePdf } from '../src/engine/analyze.js';
import { compareTitles } from '../src/engine/titles.js';
import { compareAuthors } from '../src/engine/advisories.js';
import { readMetadata } from '../src/engine/metadata.js';

async function mutated(change) {
  const doc = await PDFDocument.load(await makePdf());
  const ctx = doc.context, page = doc.getPages()[0];
  const root = ctx.lookup(doc.catalog.get(PDFName.of('StructTreeRoot')));
  const stream = ctx.lookup(page.node.get(PDFName.of('Contents')));
  const content = new TextDecoder().decode(decodePDFRawStream(stream).decode());
  const updated = change({ doc, ctx, page, root, content });
  if (typeof updated === 'string') page.node.set(PDFName.of('Contents'),ctx.register(ctx.stream(updated)));
  return analyzePdf(await doc.save());
}
const check = (r,id) => r.checks.find(c => c.id === id);
it('rejects whitespace-only metadata title', async () => {
  const r = await mutated(({doc}) => {doc.setTitle('  \n  ');});
  expect(r.accepted).toBe(false); expect(check(r,'title').status).toBe('fail');
});
it('rejects duplicate MCID content occurrences instead of silently joining ownership', async () => {
  const r = await mutated(({content}) => content+' /Span << /MCID 1 >> BDC BT /F1 12 Tf 56 660 Td (Contradictory extra content) Tj ET EMC');
  expect(r.accepted).toBe(false); expect(check(r,'content-integrity').evidence.join()).toContain('MCID 1');
});
it('rejects unclosed and unmatched marked-content sequences', async () => {
  for (const change of [({content}) => content.replace(/EMC/g,''), ({content}) => content+' EMC']) {
    const r = await mutated(change); expect(r.accepted).toBe(false); expect(check(r,'content-integrity').status).toBe('fail');
  }
});
it('preserves legal unnumbered containers and artifact boundaries', async () => {
  const r = await mutated(({content}) => '/Sect BMC\n'+content+' EMC /Artifact BMC BT /F1 9 Tf 56 100 Td (Running furniture) Tj ET EMC');
  expect(r.accepted).toBe(true); expect(check(r,'content-integrity').status).toBe('pass');
});
it('rejects directly owned list text but permits a harmless empty paragraph', async () => {
  const list = await mutated(({ctx,root}) => {ctx.lookup(root.lookup(PDFName.of('K')).get(0)).set(PDFName.of('S'),PDFName.of('L'));});
  expect(list.accepted).toBe(false); expect(check(list,'structure').evidence.join()).toContain('list');
  const empty = await mutated(({ctx,root,doc,page}) => {root.lookup(PDFName.of('K')).push(ctx.register(ctx.obj({Type:'StructElem',S:'P',P:doc.catalog.get(PDFName.of('StructTreeRoot')),Pg:page.ref,K:[]})));});
  expect(empty.accepted).toBe(true);
});
it('reports invisible rendering separately from structural acceptance', async () => {
  const r = await mutated(({content}) => content.replace(/BT /g,'BT 3 Tr '));
  expect(r.accepted).toBe(true); expect(r.textVisibility.status).toBe('requires-review');
  expect(r.textVisibility.evidence.length).toBeGreaterThan(0); expect(r.textVisibility.evidence[0].blockIds).toEqual([0]);
});
it('never establishes title identity from a later chapter reference or body-size cover line', () => {
  const r = compareTitles({infoTitle:'Previous Annual Report 2024'},[
    {page:1,source:'tagged H1',text:'Current Annual Report 2025'},
    {page:3,source:'tagged H2',text:'Previous Annual Report 2024'},
    {page:1,source:'cover text candidate',height:12,maxHeight:24,text:'Previous Annual Report 2024'},
  ]);
  expect(r.status).not.toBe('match'); expect(r.candidates).toHaveLength(3); expect(r.publicationCandidates).toHaveLength(1);
});
it('preserves XMP creator provenance and treats ambiguous initials as uncertain', () => {
  const xmp='<r:RDF xmlns:r="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:d="http://purl.org/dc/elements/1.1/"><r:Description><d:creator><r:Seq><r:li>Maya Chen</r:li><r:li>Leo Martin</r:li></r:Seq></d:creator></r:Description></r:RDF>';
  expect(readMetadata({Author:'Other Person'},xmp).xmpAuthors).toEqual(['Maya Chen','Leo Martin']);
  const pages=[{number:1,logicalBlocks:[{key:'1:2',text:'Authors: Maya Chen; Leo Martin'}]}];
  expect(compareAuthors({author:'M. Chen; L. Martin'},pages).status).toBe('uncertain');
  expect(compareAuthors({author:'Leo Martin; Maya Chen'},pages).status).toBe('match');
  expect(compareAuthors({author:'Iris Hale; Owen Brooks'},pages).status).toBe('suspected-mismatch');
});
it('detects tagged byline and numbered-step anomalies without claiming complete reading-order validation', async () => {
  const load = async id => analyzePdf(new Uint8Array(await readFile(new URL(`../public/calibration/${id}.pdf`,import.meta.url))));
  const authors=await load('14-author-mismatch'); expect(authors.accepted).toBe(true); expect(authors.authorConsistency.status).toBe('suspected-mismatch'); expect(authors.authorConsistency.evidence[0].keys.length).toBeGreaterThan(0);
  const correct=await load('16-correct-reading-order'); expect(correct.accepted).toBe(true); expect(correct.readingOrder.status).toBe('uncertain');
  const flawed=await load('17-flawed-reading-order'); expect(flawed.accepted).toBe(true); expect(flawed.readingOrder.status).toBe('requires-review'); expect(flawed.readingOrder.evidence.map(e=>e.step)).toEqual([3,4,1,2]);
  expect(check(flawed,'content-integrity').status).toBe('pass'); // Same MCIDs on different pages are legal.
});

it('does not let state-only content prove a reference has substantive content', async () => {
  const r = await mutated(({ctx,doc,root,page,content}) => {
    const empty=ctx.register(ctx.obj({Type:'StructElem',S:'P',P:doc.catalog.get(PDFName.of('StructTreeRoot')),Pg:page.ref,K:2}));
    root.lookup(PDFName.of('K')).push(empty);
    ctx.lookup(root.get(PDFName.of('ParentTree'))).lookup(PDFName.of('Nums')).lookup(1).push(empty);
    return content+' /Span << /MCID 2 >> BDC q Q EMC';
  });
  expect(r.accepted).toBe(false); expect(check(r,'supported-content').status).toBe('indeterminate');
  expect(check(r,'supported-content').evidence.join()).toContain('1:2');
});
it('does not mistake names, literal strings, or comments for raw marked-content operators', async () => {
  const r = await mutated(({content}) => content.replace('This report describes flood risk and preparedness.','Quoted EMC BDC BMC words are harmless.')+' % EMC BDC BMC\n /Artifact << /Label /EMC >> BDC EMC');
  expect(r.accepted).toBe(true); expect(check(r,'content-integrity').status).toBe('pass');
});
it('validates boundaries across multiple page content streams as one logical stream', async () => {
  const r = await mutated(({ctx,page,content}) => {
    page.node.set(PDFName.of('Contents'),ctx.obj([ctx.register(ctx.stream('/Sect BMC')),ctx.register(ctx.stream(content+' EMC'))]));
  });
  expect(r.accepted).toBe(true); expect(check(r,'content-integrity').status).toBe('pass');
});

it('keeps identical abbreviated bylines uncertain while matching full-name controls', () => {
  for (const name of ['M. Chen; L. Martin', 'm. chen; l. martin', 'M Chen; L Martin']) {
    const pages = [{ number: 1, logicalBlocks: [{ key: '1:2', text: `Authors: ${name}` }] }];
    const result = compareAuthors({ author: name, xmpAuthors: name.split('; ') }, pages);
    expect(result.status).toBe('uncertain'); expect(result.reason).toContain('even when their strings agree');
    expect(result.evidence[0].keys).toEqual(['1:2']);
  }
  const full = [{ number: 1, logicalBlocks: [{ key: '1:2', text: 'Authors: Maya Chen; Leo Martin' }] }];
  expect(compareAuthors({ author: 'Maya Chen; Leo Martin' }, full).status).toBe('match');
});
