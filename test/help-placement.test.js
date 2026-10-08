import {it,expect} from 'vitest';
import {helpPlacement} from '../src/help/placement.js';
it('keeps a tall mobile panel wholly above the bottom trigger instead of moving references under its hitbox',()=>{
 const trigger={left:312,top:745,bottom:785},p=helpPlacement(trigger,{width:390,height:844},416);
 expect(p.top+Math.min(416,p.maxHeight)).toBeLessThanOrEqual(trigger.top-6);expect(p.left+p.width).toBeLessThanOrEqual(378);
});
it('opens below a top trigger and bounds scrolling when neither side fits the whole panel',()=>{
 for(const trigger of [{left:5,top:20,bottom:60},{left:350,top:390,bottom:430}]){
  const p=helpPlacement(trigger,{width:390,height:844},900),bottom=p.top+Math.min(900,p.maxHeight);
  expect(p.top).toBeGreaterThanOrEqual(12);expect(bottom).toBeLessThanOrEqual(832);expect(p.left).toBeGreaterThanOrEqual(12);
  expect(p.top>=trigger.bottom+6 || bottom<=trigger.top-6).toBe(true);
 }
});
it('preserves a short panel below a middle trigger rather than forcing unnecessary upward placement',()=>{
 const p=helpPlacement({left:100,top:300,bottom:340},{width:1280,height:900},200);expect(p.top).toBe(346);expect(p.maxHeight).toBe(542);
});
