import { describe,it,expect } from 'vitest';
import { cropBounds,targetQuads } from '../src/evidence/geometry.js';
import { captureSnapshot,safeFilename,comparisonLines,screeningReceipt,fixSheet } from '../src/export/snapshot.js';
import { wrapText } from '../src/export/report.js';
const report=()=>({file:{name:'Müller.pdf',sourceBytes:123,sha256:'abc'},pages:[],checks:[],metadata:{infoTitle:'Wasserqualität',author:'Maya Chen',xmpAuthors:['Maya Chen']},profile:'text-actionability-0.2',screeningSelection:{modelId:'granite-r2'},semantic:{model:{label:'MiniLM'},requestedChecks:['title']}});
describe('captured exports',()=>{
 it('captures independent preferences and actually-completed model identity',()=>{const r=report(),s=captureSnapshot({report:r,file:{}});r.semantic.model.label='Changed';r.screeningSelection.modelId='Changed';expect(s.report.semantic.model.label).toBe('MiniLM');expect(s.report.screeningSelection.modelId).toBe('granite-r2');});
 it('retains Unicode filenames while removing unsafe path characters',()=>expect(safeFilename('../../Müller 水.pdf')).toBe('..-..-Müller-水'));
 it('compares independent author sources and byline text',()=>expect(comparisonLines({source:{path:'authorConsistency'},comparison:{candidates:[{page:1,text:'Authors: Maya Chen'}]}},report())).toContain('Page 1 byline: Authors: Maya Chen'));
 it('includes non-numbered heading reversal in tagged and stream comparisons',()=>{const r=report();r.pages=[{number:1,logicalBlocks:[{key:'b',text:'Conclusion'},{key:'a',text:'Introduction'}],blocks:[{key:'a',text:'Introduction'},{key:'b',text:'Conclusion'}]}];const lines=comparisonLines({source:{path:'readingOrder'},evidence:[{page:1,keys:['a']},{page:1,keys:['b']}]},r);expect(lines).toEqual(['Page 1 Tagged: Conclusion | Introduction','Page 1 Content stream: Introduction | Conclusion']);});
 it('wraps long Unicode tokens without dropping code points',()=>{const text='水質💧'.repeat(20);expect(wrapText(text,s=>Array.from(s).length,8).join('')).toBe(text);});
});
describe('bounded evidence geometry',()=>{
 it('uses full rotated CropBox viewport matrix',()=>{const vp={width:400,height:300,transform:[0,2,2,0,-40,-20]};expect(cropBounds([[30,30],[50,30],[50,40],[30,40]],vp,0)).toMatchObject({x:20,y:40,width:20,height:40});});
 it('clamps padding and rejects outside/degenerate geometry',()=>{const vp={width:100,height:100,transform:[1,0,0,1,0,0]};expect(cropBounds([[0,0],[10,0],[10,10],[0,10]],vp,28)).toMatchObject({x:0,y:0,width:38,height:38});expect(cropBounds([[120,0],[130,0],[130,10],[120,10]],vp)).toBeNull();});
 it('refuses page-scoped geometry for unsupported Forms',()=>{const r={pages:[],checks:[{evidence:['Form XObjects detected']}]};expect(targetQuads(r,{page:1,quads:[[[0,0],[1,0],[1,1],[0,1]]]})).toEqual([]);});
 it('retains direct graphic geometry, rejects nonfinite points',()=>{const r={pages:[],checks:[]};const q=[[0,0],[1,0],[1,1],[0,1]];expect(targetQuads(r,{page:1,quads:[q]})).toEqual([q]);expect(targetQuads(r,{page:1,quads:[[[NaN,0],[1,0],[1,1],[0,1]]]})).toEqual([]);});
});

it('attributes export comparison execution per field rather than borrowing sibling inference',()=>{
 const r=report();r.semantic={status:'completed',model:{id:'minilm',label:'MiniLM'},inferencePerformed:true,subject:{method:'embedding-screening',inferencePerformed:true},sections:{method:'unsupported-language',inferencePerformed:false}};
 const ai={source:{path:'semantic.subject'},method:'embedding-screening',comparison:{model:r.semantic.model}};
 const skipped={source:{path:'semantic.sections'},method:'unsupported-language',comparison:{model:r.semantic.model}};
 expect(comparisonLines(ai,r)[0]).toContain('Actual model for this check');expect(comparisonLines(skipped,r)[0]).toContain('no completed inference for this check');
 expect(screeningReceipt(r)).toContain('Actual model:');r.semantic.inferencePerformed=false;expect(screeningReceipt(r)).toContain('Configured model:');expect(screeningReceipt(r)).not.toContain('Actual model:');
 r.semantic.status='error';r.semantic.inferencePerformed=true;expect(screeningReceipt(r)).toContain('AI unavailable');expect(screeningReceipt(r)).not.toContain('Actual model:');
});

it('captures the screening assumption without replacing the source language or relabelling it after preferences change',()=>{
 const r=report();r.metadata.language=null;r.semantic.languageContext={declared:null,screening:'en',source:'user-assumption'};
 const captured=captureSnapshot({report:r,file:{}});
 r.semantic.languageContext.screening='de';r.screeningSelection.languageAssumption=null;
 expect(captured.report.metadata.language).toBe(null);
 expect(captured.report.semantic.languageContext.screening).toBe('en');
 expect(screeningReceipt(captured.report)).toContain('English (explicit user assumption)');
 expect(screeningReceipt(captured.report)).toContain('PDF language declaration remains missing');
});

it('shows full-page figure context without inventing a crop when geometry is unavailable', async () => {
  const { evidenceCropBounds } = await import('../src/evidence/geometry.js');
  const report = { checks: [], pages: [{ number: 1, blocks: [] }] };
  const viewport = { width: 100, height: 100, transform: [1,0,0,1,0,0] };
  const target = { page: 1, quads: [] };
  expect(evidenceCropBounds(report, target, viewport)).toBeNull();
  expect(evidenceCropBounds(report, { ...target, contextPage: true }, viewport)).toMatchObject({ pageContext: true, points: [], width: 100, height: 100 });
  const located = { page: 1, contextPage: true, quads: [[[10,10],[20,10],[20,20],[10,20]]] };
  expect(evidenceCropBounds(report, located, viewport).pageContext).toBe(false);
  const unsafe = { ...report, checks: [{ evidence: ['Form XObjects are unsupported.'] }] };
  expect(evidenceCropBounds(unsafe, located, viewport)).toMatchObject({ pageContext: true, points: [] });
});

it('builds the designer fix sheet from the captured report in the same buckets as the screen', () => {
  const r = { file: { name: 'a.pdf' }, analysisComplete: true, accepted: false, pages: [], metadata: { infoTitle: 'Report 2024' },
    metadataConsistency: { status: 'suspected-mismatch', publicationCandidates: [{ page: 1, text: 'Report 2025' }] },
    checks: [{ id: 'language', status: 'fail', summary: 'Missing.' }], textVisibility: { status: 'uncertain' } };
  const sheet = fixSheet(captureSnapshot({ report: r, file: {} }));
  expect(sheet.fix.map(item => item.title)).toEqual(['Set the document language']);
  expect(sheet.check.map(item => [item.number, item.title])).toEqual([[2, 'Saved title doesn’t match the cover']]);
  expect(sheet.check[0].summary).toContain('“Report 2025”');
  expect(sheet.unknown).toContain('The tool couldn’t tell whether hidden text matches the page');
  expect([...sheet.fix, ...sheet.check].every(item => item.change)).toBe(true);
});

const orderReport = (count=4, numbered=true) => {
  const blocks=Array.from({length:count},(_,i)=>({key:`2:${i}`,role:'H2',text:numbered?`${i+1}. Heading ${i+1}`:`Heading ${i+1}`,quad:[[0,500-i*15],[100,500-i*15],[100,510-i*15],[0,510-i*15]]}));
  const logicalBlocks=[...blocks.slice(2),...blocks.slice(0,2)];
  return {...report(),analysisComplete:true,accepted:true,pages:[{number:2,blocks,logicalBlocks}],readingOrder:{status:'requires-review',reason:'Review sequence.',findings:[{page:2,detector:numbered?'numbered-step-sequence':'single-alignment-heading-geometry',evidence:logicalBlocks}]}};
};
const orderItem = snapshot => fixSheet(snapshot).check.find(item=>item.title==='Text may be read in the wrong order');

it('retains actual ordered evidence and uncertainty in the captured Check item without changing outcomes',()=>{
  const r=orderReport(),captured=captureSnapshot({report:r,file:{}}),before=structuredClone(captured);
  r.pages[0].logicalBlocks.reverse();r.readingOrder.findings=[];
  const item=orderItem(captured);
  expect(item.evidence).toContain('Page 2, order in the PDF’s tags: steps 3, 4, 1, 2.');
  expect(item.evidence).toContain('Page 2, order the text is drawn: steps 1, 2, 3, 4.');
  expect(item.evidence.join(' ')).toContain('Neither recovered order proves the intended reading order');
  expect(item.cropFindingId).toBeNull();
  expect(item.bucket).toBe('check');
  expect(captured).toEqual(before);
  expect(captured.report.accepted).toBe(true);
  expect(captured.normalized.findings.find(f=>f.source.path==='readingOrder')).toMatchObject({category:'advisory-concern',outcome:'requires-review'});
});

it('states comparison limits without inventing sequences when evidence is unsafe or unsupported',()=>{
  for(const change of [
    r=>{r.pages[0].blocks[0].quad=null;},
    r=>{r.pages[0].blocks[0].text='Different text';},
    r=>{r.readingOrder.findings[0].detector='unsupported-detector';},
    r=>{r.pages[0].number=3;},
  ]){
    const r=orderReport();change(r);
    const item=orderItem(captureSnapshot({report:r,file:{}}));
    expect(item.evidence.join(' ')).toContain('Reported concern on page 2.');
    expect(item.evidence.join(' ')).toContain('comparison of the same headings in both orders is unavailable');
    expect(item.evidence.join(' ')).not.toContain('steps 3');
    expect(item.cropFindingId).toBeNull();
  }
});

it('bounds order excerpts and labels, records omitted concerns and supports unnumbered headings',()=>{
  const r=orderReport(20);
  r.readingOrder.findings.push({...r.readingOrder.findings[0],page:3});
  const item=orderItem(captureSnapshot({report:r,file:{}}));
  expect(item.evidence[0].match(/\d+/g)).toHaveLength(9); // Page plus eight retained steps.
  expect(item.evidence.join(' ')).toContain('12 additional headings');
  expect(item.evidence.join(' ')).toContain('1 other recorded reading-order concern is');
  const unnumbered=orderReport(4,false);
  unnumbered.pages[0].blocks[0].text='A'.repeat(500);
  const plain=orderItem(captureSnapshot({report:unnumbered,file:{}}));
  expect(plain.evidence[0]).toContain('“Heading 3” then “Heading 4”');
  expect(plain.evidence[0]).not.toContain('steps');
  expect(plain.evidence.join(' ')).toContain('Heading labels are shortened');
  expect(plain.evidence[0].length).toBeLessThan(300);
});
