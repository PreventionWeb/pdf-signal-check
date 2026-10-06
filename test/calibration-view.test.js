import {it,expect,vi,afterEach} from 'vitest';
import {createCalibrationView} from '../src/calibration/view.js';
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.textContent='';}
 append(...nodes){this.children.push(...nodes);}setAttribute(){}replaceChildren(...nodes){this.children=nodes;}remove(){}
}
class FakeWorker {
 static workers=[];
 constructor(){this.terminated=false;FakeWorker.workers.push(this);}postMessage(message){this.sent=message;}terminate(){this.terminated=true;}
 complete(receipt){this.onmessage({data:{type:'result',requestId:this.sent.requestId,receipt}});}
}
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();FakeWorker.workers=[];});
it('requires explicit start, releases completed workers, and times out without erasing a prior receipt',()=>{
 vi.useFakeTimers();vi.stubGlobal('document',{hidden:false,createElement:tag=>new Element(tag),addEventListener(){},removeEventListener(){}});vi.stubGlobal('Worker',FakeWorker);
 const view=createCalibrationView({timeoutMs:100});const button=view.root.children.find(n=>n.tagName==='button');expect(FakeWorker.workers).toHaveLength(0);button.onclick();
 const worker=FakeWorker.workers[0];const receipt={model:{label:'Measured model'},fixture:{pages:2,parseMs:10},load:{loadAndInitMs:20,state:'new-encoder',assetSource:'unknown'},warm:{medianMs:3,minimumMs:2,maximumMs:4},workload:{tokenCap:256},note:'No capability guarantee'};worker.complete(receipt);expect(worker.terminated).toBe(true);const previous=view.receipt;
 button.onclick();vi.advanceTimersByTime(100);expect(FakeWorker.workers[1].terminated).toBe(true);expect(view.receipt).toBe(previous);expect(view.root.children.some(n=>n.textContent.includes('time budget expired'))).toBe(true);view.destroy();
});
