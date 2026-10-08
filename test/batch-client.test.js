import {describe,it,expect,vi} from 'vitest';
import {BatchWorkerClient} from '../src/batch/client.js';
class FakeWorker {
  constructor(){this.posts=[];this.terminate=vi.fn();}
  postMessage(message){this.posts.push(message);}
  emit(data){this.onmessage?.({data});}
}
const report=()=>({file:{},metadata:{language:'en'},metadataConsistency:{candidates:[]},pages:[]});
const config={modelId:'minilm',checks:['title']};
const file={name:'duplicate.pdf',size:4,arrayBuffer:async()=>new ArrayBuffer(4)};
const options=()=>({signal:new AbortController().signal,configuration:config,onProgress:()=>{}});
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
describe('batch worker services',()=>{
  it('disposes each analyzer after result and settles an active analyzer on disposal',async()=>{
    const workers=[],client=new BatchWorkerClient({workerFactory:()=>{const w=new FakeWorker();workers.push(w);return w;}});
    const first=client.analyze(file,options());await tick();workers[0].emit({type:'result',report:report()});expect((await first).file.sourceBytes).toBe(4);expect(workers[0].terminate).toHaveBeenCalled();
    const second=client.analyze(file,options());const rejection=expect(second).rejects.toMatchObject({name:'AbortError'});await tick();await client.dispose();await rejection;expect(workers[1].terminate).toHaveBeenCalled();
  });
  it('reuses one model worker and ignores prior request nonces',async()=>{
    const worker=new FakeWorker(),factory=vi.fn(()=>worker),client=new BatchWorkerClient({workerFactory:factory});
    const first=client.screen(report(),options());const id1=worker.posts[0].requestId;worker.emit({type:'result',requestId:id1,semantic:{model:{id:'first'}}});await first;
    const second=client.screen(report(),options()),id2=worker.posts[1].requestId;let settled=false;second.then(()=>settled=true);worker.emit({type:'result',requestId:id1,semantic:{wrong:true}});await tick();expect(settled).toBe(false);worker.emit({type:'result',requestId:id2,semantic:{model:{id:'actual'}}});expect(await second).toEqual({model:{id:'actual'}});expect(factory).toHaveBeenCalledTimes(1);await client.dispose();expect(worker.terminate).toHaveBeenCalled();
  });
  it('terminates and settles on model AbortSignal, then permits a fresh worker',async()=>{
    const workers=[],client=new BatchWorkerClient({workerFactory:()=>{const w=new FakeWorker();workers.push(w);return w;}}),controller=new AbortController();
    const pending=client.screen(report(),{...options(),signal:controller.signal}),rejection=expect(pending).rejects.toMatchObject({name:'AbortError'});controller.abort();await rejection;expect(workers[0].terminate).toHaveBeenCalled();
    const next=client.screen(report(),options());workers[1].emit({type:'result',requestId:workers[1].posts[0].requestId,semantic:{ok:true}});expect(await next).toEqual({ok:true});
  });
  it('classifies primitive construction errors as model initialization and releases busy',async()=>{
    const worker=new FakeWorker();let fail=true;const client=new BatchWorkerClient({workerFactory:()=>{if(fail)throw 'blocked worker';return worker;}});
    await expect(client.screen(report(),options())).rejects.toMatchObject({message:'blocked worker',stage:'model-init',code:'MODEL_INIT_FAILED'});expect(client.busy).toBe(false);fail=false;const next=client.screen(report(),options());worker.emit({type:'result',requestId:worker.posts[0].requestId,semantic:{}});await next;
  });
  it('settles callback and post failures instead of wedging the scheduler',async()=>{
    const worker=new FakeWorker(),client=new BatchWorkerClient({workerFactory:()=>worker});const task=client.screen(report(),{...options(),onProgress:()=>{throw new Error('observer failed');}});const rejection=expect(task).rejects.toThrow('observer failed');worker.emit({type:'progress',requestId:worker.posts[0].requestId,progress:{stage:'inference'}});await rejection;expect(worker.terminate).toHaveBeenCalled();expect(client.pending.size).toBe(0);
    const broken=new FakeWorker();broken.postMessage=()=>{throw new Error('post failed');};client.workerFactory=()=>broken;await expect(client.screen(report(),options())).rejects.toThrow('post failed');expect(client.pending.size).toBe(0);expect(broken.terminate).toHaveBeenCalled();
  });
  it('preserves model-init error fields and distinguishes an inference crash',async()=>{
    const worker=new FakeWorker(),client=new BatchWorkerClient({workerFactory:()=>worker});const first=client.screen(report(),options()),r1=expect(first).rejects.toMatchObject({stage:'model-init',code:'MODEL_INIT_FAILED'});worker.emit({type:'error',requestId:worker.posts[0].requestId,message:'asset missing',stage:'model-init',code:'MODEL_INIT_FAILED'});await r1;
    const second=client.screen(report(),options()),r2=expect(second).rejects.toMatchObject({message:'runtime failed'});worker.emit({type:'progress',requestId:worker.posts[1].requestId,progress:{stage:'inference'}});worker.onerror({message:'runtime failed'});await r2;
  });
  it('does not publish a digest that finishes after cancellation',async()=>{
    let finish;const original=globalThis.crypto;vi.stubGlobal('crypto',{subtle:{digest:()=>new Promise(resolve=>finish=resolve)}});try{const controller=new AbortController(),client=new BatchWorkerClient(),pending=client.hash(file,{signal:controller.signal}),rejection=expect(pending).rejects.toMatchObject({name:'AbortError'});await tick();controller.abort();finish(new ArrayBuffer(32));await rejection;expect(client.hashes.has(file)).toBe(false);}finally{vi.stubGlobal('crypto',original);}
  });
});
