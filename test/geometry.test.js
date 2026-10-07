import { describe,it,expect } from 'vitest';
import { point,textQuad,rectPoints,findingTargets,candidateBlocks } from '../src/geometry.js';
describe('preview geometry',()=>{
 it('projects cropped rotated coordinates through the full viewport matrix',()=>{
   const quad=textQuad({transform:[12,0,0,12,40,80],width:60},{ascent:0.75,descent:-0.25});
   expect(quad.map(p=>point([0,2,2,0,-40,-20],p))).toEqual([[114,60],[114,180],[138,180],[138,60]]);
 });
 it('retains skew and text rotation rather than making page-height assumptions',()=>{
   expect(textQuad({transform:[0,10,-10,2,50,80],width:20},{ascent:0.8,descent:-0.2})).toEqual([[52,79.6],[52,99.6],[42,101.6],[42,81.6]]);
 });
 it('avoids inventing bounds for vertical text or missing widths',()=>{
   expect(textQuad({transform:[1,0,0,1,0,0],width:10},{vertical:true})).toBeNull();
   expect(textQuad({transform:[1,0,0,1,0,0]})).toBeNull();
 });
 it('transforms all corners of image/path regions',()=>{expect(rectPoints([0,0,1,1],[10,0,3,20,40,50])).toEqual([[40,50],[50,50],[53,70],[43,70]]);});
 it('uses stable IDs for repeated title strings and no fabricated metadata location',()=>{
   const page={number:1,blocks:[{id:0,text:'Title',connected:false},{id:1,text:'Title',connected:true}]};
   expect(candidateBlocks(page,{blockIds:[1]})).toEqual([page.blocks[1]]);
   expect(candidateBlocks({...page,blocks:[{key:'1:0'}]},{blockIds:[],keys:['1:0']})).toEqual([{key:'1:0'}]);
   expect(findingTargets({pages:[page]},'metadata')).toEqual([]);
   expect(findingTargets({pages:[page]},'coverage')).toHaveLength(1);
 });
});

it('decorative page context uses the full viewport while skipping reused graphic locations', async () => {
  const {targetQuads,evidenceCropBounds} = await import('../src/evidence/geometry.js');
  const quad = [[1,1],[2,1],[2,2],[1,2]];
  const report = {pages:[{number:1, evidenceGeometryScoped:true, formXObjectInvocations:1, blocks:[], graphics:[], decorativeGraphics:[{quad}]}]};
  const target = {page:1, quads:[quad, [[3,3],[4,3],[4,4],[3,4]]], wholePage:true};
  expect(targetQuads(report,target)).toEqual([quad]);
  expect(evidenceCropBounds(report,target,{width:600,height:800})).toMatchObject({x:0,y:0,width:600,height:800,points:[],pageContext:true});
});
