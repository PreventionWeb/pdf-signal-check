import {it,expect} from 'vitest';
import {createSequentialQueue} from '../src/batch/queue.js';
import {ReportStore} from '../src/batch/report-store.js';
const file=(name='same.pdf',size=10)=>({name,size});
const report=()=>({profile:'text-actionability-0.2',accepted:true,analysisComplete:true,file:{pages:2},checks:[{id:'tags',status:'pass'}]});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
it('processes handles sequentially and separates duplicate filenames, requested config and actual model',async()=>{
 let active=0,peak=0;const q=createSequentialQueue({hash:async f=>'hash-'+f.size,analyze:async()=>{active++;peak=Math.max(peak,active);await Promise.resolve();active--;return report();},screen:async()=>({model:{key:'actual'},requestedChecks:['title'],inferencePerformed:true})});
 const ids=q.enqueue([file(),file('same.pdf',12)]);expect(ids[0]).not.toBe(ids[1]);await q.start({useAI:true,modelId:'requested',checks:['title']});
 expect(peak).toBe(1);expect(q.snapshot().items.every(i=>i.status==='completed')).toBe(true);expect(q.getReport(ids[1]).sourceIdentity.sha256).toBe('hash-12');expect(q.snapshot().items[0]).toMatchObject({requestedConfiguration:{modelId:'requested'},actualModel:{key:'actual'}});
});
it('finishes current item on pause, but cancellation rejects late stale results without changing acceptance',async()=>{
 const gate=deferred();let calls=0;const q=createSequentialQueue({analyze:async()=>{calls++;return calls===1?gate.promise:report();}});const ids=q.enqueue([file(),file()]);const task=q.start({});await Promise.resolve();q.pause();q.cancelActive();gate.resolve(report());await task;
 expect(q.snapshot().items.map(i=>i.status)).toEqual(['canceled','queued']);expect(q.getReport(ids[0])).toBeNull();q.retry(ids[0]);await q.resume();expect(q.snapshot().items.every(i=>i.status==='completed')).toBe(true);
});
it('pauses before losing report details and requires explicit consent to release or summarize',async()=>{
 const store=new ReportStore({maxSerializedBytes:300});const q=createSequentialQueue({reportStore:store,analyze:async()=>({...report(),extra:'x'.repeat(100)})});const ids=q.enqueue([file(),file()]);await q.start({});
 const state=q.snapshot();expect(state.paused).toBe(true);expect(state.items.some(i=>i.status==='awaiting-budget')).toBe(true);expect(()=>q.summarizePending()).toThrow(/consent/);expect(()=>q.releaseDetails(ids)).toThrow(/consent/);
 q.summarizePending({consent:true});await q.resume();if(q.snapshot().items.some(i=>i.status==='awaiting-budget'))q.summarizePending({consent:true});expect(q.snapshot().items.every(i=>i.status==='completed')).toBe(true);expect(q.snapshot().items.some(i=>i.detailsReleased)).toBe(true);
});
it('isolates document failure and retains deterministic results when AI fails',async()=>{
 let count=0;const q=createSequentialQueue({analyze:async()=>{if(++count===1)throw new Error('Malformed file');return report();},screen:async()=>{throw new Error('Download failed');}});const ids=q.enqueue([file(),file()]);await q.start({useAI:true});expect(q.snapshot().items.map(i=>i.status)).toEqual(['failed','completed']);expect(q.getReport(ids[1])).toMatchObject({accepted:true,semantic:{status:'error',inferencePerformed:false}});
});
it('rejects count/byte admission atomically before services read files',()=>{
 const q=createSequentialQueue({analyze:async()=>report(),maxFiles:1,maxTotalBytes:20,maxFileBytes:15});expect(()=>q.enqueue([file(),file()])).toThrow();expect(q.snapshot().items).toHaveLength(0);expect(()=>q.enqueue([file('large',16)])).toThrow();expect(q.snapshot().items).toHaveLength(0);
});
it('pause leaves an active analysis running and stops before reading the next file',async()=>{
 const gate=deferred();let reads=0;const q=createSequentialQueue({analyze:async()=>{reads++;return gate.promise;}});q.enqueue([file(),file()]);const task=q.start({});await Promise.resolve();q.pause();gate.resolve(report());await task;expect(reads).toBe(1);expect(q.snapshot().items.map(i=>i.status)).toEqual(['completed','queued']);
});
it('releasing old details preserves summaries and admits a pending report only on explicit retry',async()=>{
 const probe={...report(),screeningSelection:{useAI:false,modelId:null,checks:[]},sourceIdentity:{queueItemId:'queue-1',sha256:null,attemptEpoch:1,requestedConfiguration:{}}};const store=new ReportStore({maxSerializedBytes:new TextEncoder().encode(JSON.stringify(probe)).length+5});const q=createSequentialQueue({reportStore:store,analyze:async()=>report()});const ids=q.enqueue([file(),file()]);await q.start({});expect(q.snapshot().items.map(i=>i.status)).toEqual(['completed','awaiting-budget']);q.releaseDetails([ids[0]],{consent:true});expect(q.snapshot().items[0]).toMatchObject({detailRetained:false,summary:{accepted:true}});expect(q.retainPending()).toBe(true);expect(q.getReport(ids[1]).accepted).toBe(true);
});

it('observer errors cannot wedge processing and retry/skip clear retained stale run state',async()=>{
 const q=createSequentialQueue({analyze:async()=>report(),hash:async()=> 'old-hash',onEvent:()=>{throw new Error('Broken observer');}});const [id]=q.enqueue([file()]);await q.start({});expect(q.snapshot()).toMatchObject({running:false,observerError:'Broken observer'});q.retry(id);expect(q.snapshot().items[0]).toMatchObject({sourceHash:null,actualModel:null,progress:null,detailsReleased:false});await q.resume();q.skip(id);expect(q.getReport(id)).toBeNull();expect(q.snapshot().items[0]).toMatchObject({status:'skipped',detailRetained:false,summary:{accepted:true}});
});
it('reorders/removes pending handles and stop-all cancels current while leaving the rest queued',async()=>{
 const gate=deferred();const names=[];const q=createSequentialQueue({analyze:async f=>{names.push(f.name);return gate.promise;}});const ids=q.enqueue([file('a'),file('b'),file('c')]);q.reorder([ids[2],ids[0],ids[1]]);q.remove(ids[1]);const task=q.start({});await Promise.resolve();q.stopAll();gate.resolve(report());await task;expect(names).toEqual(['c']);expect(q.snapshot().items.map(i=>i.status)).toEqual(['canceled','queued']);
});
it('pauses after one model initialization failure until explicit structural-only continuation',async()=>{
 let screenCalls=0;const q=createSequentialQueue({analyze:async()=>report(),screen:async()=>{screenCalls++;throw Object.assign(new Error('Model unavailable'),{stage:'model-init'});}});q.enqueue([file(),file(),file()]);await q.start({useAI:true});expect(screenCalls).toBe(1);expect(q.snapshot().modelFailure.stage).toBe('model-init');expect(()=>q.resume()).toThrow(/Resolve/);await q.resolveModelFailure({action:'structural-only'});expect(screenCalls).toBe(1);expect(q.snapshot().items.every(i=>i.status==='completed')).toBe(true);
});

it('retains uncertainty, skip/error provenance and deduplicated finding counts in compact summaries',async()=>{
 const q=createSequentialQueue({analyze:async()=>({...report(),authorConsistency:{status:'uncertain'},readingOrder:{status:'requires-review',evidence:[]}}),screen:async()=>({requestedChecks:['keywords'],model:{key:'minilm'},inferencePerformed:false,skippedChecks:['keywords'],keywords:{status:'uncertain',method:'unsupported-language',inferencePerformed:false}})});const [id]=q.enqueue([file()]);await q.start({useAI:true});q.releaseDetails([id],{consent:true});expect(q.snapshot().items[0].summary).toMatchObject({advisories:{authors:{status:'uncertain'},order:{status:'requires-review'}},semantic:{checks:{keywords:{method:'unsupported-language',inferencePerformed:false}},skippedChecks:['keywords']},findingCounts:{'advisory-concern':1}});
});
it('processes fifteen distinct handles with exactly one active service and no filename-based collapse',async()=>{
 let active=0,peak=0,calls=0;const q=createSequentialQueue({analyze:async()=>{active++;peak=Math.max(peak,active);await Promise.resolve();calls++;active--;return report();}});const ids=q.enqueue(Array.from({length:15},()=>file()));await q.start({useAI:false});expect(new Set(ids).size).toBe(15);expect(calls).toBe(15);expect(peak).toBe(1);expect(q.snapshot().items.filter(i=>i.status==='completed')).toHaveLength(15);
});
it('ignores stale phase events/results after cancellation and retries with a new attempt',async()=>{
 let firstOptions;const gate=deferred();let calls=0;const q=createSequentialQueue({analyze:async(f,options)=>{calls++;if(calls===1){firstOptions=options;return gate.promise;}options.onProgress({stage:'pages',completed:2,total:2});return report();}});const [id]=q.enqueue([file()]);const first=q.start({});await Promise.resolve();q.stopAll();firstOptions.onProgress({stage:'inference',completed:99,total:99});gate.resolve(report());await first;q.retry(id);await q.resume();firstOptions.onProgress({stage:'inference',completed:100,total:100});expect(q.snapshot().items[0]).toMatchObject({status:'completed',progress:{stage:'pages',completed:2},epoch:4});
});
it('isolates retained reports from presentation edits and disposes adapters on destroy',async()=>{
 let disposed=0;const q=createSequentialQueue({analyze:async()=>report(),dispose:async()=>{disposed++;}});const [id]=q.enqueue([file()]);await q.start({});const opened=q.getReport(id);opened.accepted=false;opened.extra='x'.repeat(1000);expect(q.getReport(id).accepted).toBe(true);await q.destroy();expect(disposed).toBe(1);expect(q.snapshot().items).toHaveLength(0);
});
it('retries model initialization failure without repeating unrelated completed items',async()=>{
 let screens=0;const q=createSequentialQueue({analyze:async()=>report(),screen:async()=>{if(++screens===1)throw Object.assign(new Error('First initialization failed'),{code:'MODEL_INIT_FAILED'});return {model:{key:'minilm'},requestedChecks:['title'],inferencePerformed:true};}});q.enqueue([file(),file()]);await q.start({useAI:true});await q.resolveModelFailure({action:'retry'});expect(screens).toBe(3);expect(q.snapshot().items.every(i=>i.status==='completed')).toBe(true);expect(q.snapshot().modelFailure).toBeNull();
});
it('offers pending report clones for export without admitting oversized detail or losing compact truth',async()=>{
 const q=createSequentialQueue({reportStore:new ReportStore({maxSerializedBytes:20}),analyze:async()=>report()});const [id]=q.enqueue([file()]);await q.start({});expect(q.getReport(id)).toBeNull();const pending=q.getPendingReport(id);expect(pending.accepted).toBe(true);pending.accepted=false;expect(q.getPendingReport(id).accepted).toBe(true);expect(q.snapshot().budget.estimatedSerializedBytes).toBe(0);expect(q.snapshot().budget.pendingSerializedBytes).toBeGreaterThan(20);
});
it('protects unresolved initialization failure actions and retains monotonic timing/context',async()=>{
 const q=createSequentialQueue({analyze:async()=>report(),screen:async()=>{throw Object.assign(new Error('Offline'),{stage:'model-init'});},getConditions:()=>({visibility:'visible',visibilityChanges:1})});const [id]=q.enqueue([file()]);await q.start({useAI:true});for(const action of ['retry','remove','skip'])expect(()=>q[action](id)).toThrow(/Resolve/);const item=q.snapshot().items[0];expect(item.timing.elapsedMs).toBeGreaterThanOrEqual(0);expect(item.timing.startedAt).toBeTruthy();expect(item.timing.finishedAt).toBeTruthy();expect(item.timing.conditionsAtEnd.visibilityChanges).toBe(1);await q.resolveModelFailure({action:'structural-only'});q.remove(id);expect(q.snapshot().items).toHaveLength(0);
});
it('retains returned incomplete parsing/limit reports as failed rather than counting them as successful completion',async()=>{
 let calls=0,screens=0;const returned=[{...report(),accepted:false,analysisComplete:false,checks:[{id:'load',status:'fail',summary:'Malformed PDF input'}]},{...report(),accepted:false,analysisComplete:false,checks:[{id:'completion',status:'indeterminate',summary:'Page limit exceeded'}]},report()];const q=createSequentialQueue({analyze:async()=>returned[calls++],screen:async()=>{screens++;return {model:{key:'minilm'},inferencePerformed:false};}});const ids=q.enqueue([file(),file(),file()]);await q.start({useAI:true});expect(q.snapshot().items.map(i=>i.status)).toEqual(['failed','failed','completed']);expect(q.getReport(ids[0])).toMatchObject({accepted:false,analysisComplete:false});expect(q.snapshot().items[1]).toMatchObject({detailRetained:true,error:'Page limit exceeded',summary:{findingCounts:{'required-indeterminate':1}}});expect(screens).toBe(1);
});
it('records requested Granite settings and explicit incomplete-analysis skip without implying actual inference',async()=>{
 const q=createSequentialQueue({analyze:async()=>({...report(),accepted:false,analysisComplete:false,checks:[{id:'load',status:'fail',summary:'Corrupt document'}]}),screen:async()=>{throw new Error('Screening must not run');}});const [id]=q.enqueue([file()]);await q.start({useAI:true,modelId:'granite-r2',checks:['title','keywords']});expect(q.getReport(id)).toMatchObject({screeningSelection:{useAI:true,modelId:'granite-r2',checks:['title','keywords']},semantic:{status:'skipped',skipReason:'analysis-incomplete',model:null,inferencePerformed:false}});expect(q.snapshot().items[0]).toMatchObject({actualModel:null,summary:{semantic:{skipReason:'analysis-incomplete'},findingCounts:{unassessed:1}}});
});

it('separates selected model configuration from actual usage for unsupported language and rules-only outcomes',async()=>{
 let calls=0;const q=createSequentialQueue({analyze:async()=>report(),screen:async()=>({model:{key:'minilm'},requestedChecks:['title'],inferencePerformed:false,title:{status:++calls===1?'uncertain':'match',method:calls===1?'unsupported-language':'deterministic-rules',inferencePerformed:false},embeddedTextCount:0})});q.enqueue([file(),file()]);await q.start({useAI:true,modelId:'minilm',checks:['title']});for(const item of q.snapshot().items){expect(item.actualModel).toBeNull();expect(item.summary.semantic.model.key).toBe('minilm');expect(item.requestedConfiguration.modelId).toBe('minilm');expect(item.summary.semantic.inferencePerformed).toBe(false);}
});
