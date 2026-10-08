import { it, expect } from 'vitest';
import { inspectFigureAlternatives } from '../src/engine/figures.js';
import { normalizeFindings } from '../src/review/findings.js';
const leaf = {role:'Span',ref:'3 0 R',contentKeys:['1:2'],children:[]};
const figure = alt => ({role:'Figure',ref:'2 0 R',page:1,contentKeys:[],children:[leaf],alt});
const pages=[{number:1,graphics:[{key:'1:2',quad:[[0,0],[0,1],[1,1],[1,0]]}]}];
it('links descendant marked graphics to Figure alt without asserting meaning or changing profile acceptance',()=>{
 const f=figure('A chart description'), result=inspectFigureAlternatives({nodes:[f,leaf],errors:[]},pages);
 expect(result).toMatchObject({meaningAssessed:false,items:[{status:'present',alt:'A chart description',keys:['1:2'],tagged:true}]});
 const report={accepted:false,checks:[{id:'supported-content',status:'indeterminate',label:'Scope',summary:'Graphics not interpreted'}],figureAlternatives:result,pages};
 const normalized=normalizeFindings(report);
 expect(normalized.findings.find(f=>f.id.startsWith('figure:'))).toMatchObject({category:'success',targets:[{page:1,keys:['1:2']}]});
 expect(normalized.findings.find(f=>f.id==='required:supported-content').category).toBe('unassessed');
 expect(report.accepted).toBe(false);
});
it('distinguishes missing and whitespace-only descriptions from graphics with unknown semantic roles',()=>{
 for(const alt of [null,'   ']) {
  expect(inspectFigureAlternatives({nodes:[figure(alt),leaf],errors:[]},pages).items[0]).toMatchObject({status:'requires-review',tagged:true,alt:null});
 }
 const unclassified=inspectFigureAlternatives({nodes:[],errors:[]},pages);
 expect(unclassified.items[0]).toMatchObject({status:'uncertain',tagged:false});
 expect(normalizeFindings({checks:[],pages,figureAlternatives:unclassified}).findings.find(f=>f.id.startsWith('figure:')).category).toBe('uncertain');
});
it('does not report reliable connections for broken structure or ambiguous nested Figure ownership',()=>{
 expect(inspectFigureAlternatives({nodes:[figure('Alt'),leaf],errors:['Wrong parent link']},pages).items[0].status).toBe('uncertain');
 const inner=figure('Inner'), outer={...figure('Outer'),ref:'4 0 R',children:[inner]};
 const result=inspectFigureAlternatives({nodes:[outer,inner,leaf],errors:[]},pages);
 expect(result.items.every(item=>item.status==='uncertain')).toBe(true);
});
it('does not invent graphics or figure findings on a text-only page',()=>{
 expect(inspectFigureAlternatives({nodes:[],errors:[]},[{number:1,graphics:[]}]).items).toEqual([]);
});
it('excludes graphics explicitly marked Artifact from figure review, while retaining unlabelled graphics',async()=>{
 const {analyzePdf}=await import('../src/engine/analyze.js'); const {makePdf}=await import('./fixtures.js');
 const decorative=await analyzePdf(await makePdf({graphic:true,artifactGraphic:true}));
 expect(decorative.pages[0].graphics).toEqual([]);
 expect(decorative.figureAlternatives.items).toEqual([]);
 expect(decorative.figureAlternatives.decorativeItems).toEqual([expect.objectContaining({page:1,decorative:true})]);
 const unlabelled=await analyzePdf(await makePdf({graphic:true,artifactGraphic:false}));
 expect(unlabelled.figureAlternatives.items.some(item=>!item.tagged)).toBe(true);
});
