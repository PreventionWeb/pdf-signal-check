import { describe,it,expect } from 'vitest';
import { cropBounds,targetQuads } from '../src/evidence/geometry.js';
import { captureSnapshot,safeFilename,comparisonLines } from '../src/export/snapshot.js';
import { wrapText } from '../src/export/report.js';
const report=()=>({file:{name:'Müller.pdf',sourceBytes:123,sha256:'abc'},pages:[],checks:[],metadata:{infoTitle:'Wasserqualität',author:'Maya Chen',xmpAuthors:['Maya Chen']},profile:'text-actionability-0.2',screeningSelection:{modelId:'granite-r2'},semantic:{model:{label:'MiniLM'},requestedChecks:['title']}});
describe('captured exports',()=>{
 it('captures independent preferences and actually-completed model identity',()=>{const r=report(),s=captureSnapshot({report:r,file:{},reviewed:['identity:title']});r.semantic.model.label='Changed';r.screeningSelection.modelId='Changed';expect(s.report.semantic.model.label).toBe('MiniLM');expect(s.report.screeningSelection.modelId).toBe('granite-r2');expect(s.reviewed).toEqual(['identity:title']);});
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
