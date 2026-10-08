import { expect, it } from 'vitest';
import { inspectPage } from '../src/engine/page.js';
const OPS = { paintFormXObjectBegin: 1, paintFormXObjectEnd: 2 };
const inspect = fnArray => inspectPage({items:[]}, {fnArray,argsArray:fnArray.map(()=>[])}, null, 1, {refs:new Map(),nodes:[]}, OPS);
it('records actual per-page Form invocations, including nested reusable content', () => {
  expect(inspect([]).formXObjectInvocations).toBe(0);
  expect(inspect([1,1,2,2]).formXObjectInvocations).toBe(2);
});
it('marks mixed-scope and reusable text unsafe while retaining direct page text', () => {
  const ops = { ...OPS, beginMarkedContentProps: 3, endMarkedContent: 4, showText: 5 };
  const text = { items: [0,1,2].flatMap(id => [{type:'beginMarkedContentProps', id:`p1R_mc${id}`,tag:'P'}, {str:`Text ${id}`,transform:[10,0,0,10,id*10,20],width:10}, {type:'endMarkedContent'}]), styles:{} };
  const operators={fnArray:[3,5,4,3,5,4,1,3,5,4,3,5,4,2], argsArray:[['P',0],[[{unicode:'A'}]],[],['P',1],[[{unicode:'B'}]],[],[],['P',0],[[{unicode:'C'}]],[],['P',2],[[{unicode:'D'}]],[],[]]};
  const result=inspectPage(text,operators,null,1,{refs:new Map(),nodes:[]},ops);
  expect(result.evidenceGeometryScoped).toBe(true);
  expect(result.blocks.map(b=>b.locationSafe)).toEqual([false,true,false]);
});
