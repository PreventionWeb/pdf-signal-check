import {normalizeFindings} from '../review/findings.js';
import {ReportStore} from './report-store.js';
const clone=value=>structuredClone(value);
const outcome=value=>value?{status:value.status,method:value.method||null,inferencePerformed:value.inferencePerformed===true}:null;
const summary=report=>({screeningSelection:clone(report.screeningSelection||null),profile:report.profile,accepted:report.accepted,analysisComplete:report.analysisComplete,pages:report.file?.pages,
 checks:(report.checks||[]).map(c=>({id:c.id,status:c.status})),
 advisories:{title:outcome(report.metadataConsistency),authors:outcome(report.authorConsistency),order:outcome(report.readingOrder),visibility:outcome(report.textVisibility)},
 findingCounts:normalizeFindings(report).counts,
 semantic:report.semantic?{status:report.semantic.status||'completed',model:report.semantic.model,requestedChecks:report.semantic.requestedChecks,inferencePerformed:report.semantic.inferencePerformed,
 skipReason:report.semantic.skipReason||null,reason:report.semantic.reason||null,error:report.semantic.error||null,errorStage:report.semantic.errorStage||null,errorCode:report.semantic.errorCode||null,skippedChecks:report.semantic.skippedChecks||[],
 checks:Object.fromEntries(['title','subject','keywords','sections'].map(field=>[field,outcome(report.semantic[field])])),
 keywordCoverage:report.semantic.keywordCoverage||null,sectionCoverage:report.semantic.sectionCoverage||null,
 keywordOutcomes:(report.semantic.keywordItems||[]).map(outcome),sectionOutcomes:(report.semantic.sectionItems||[]).map(outcome)}:null});

/** Foreground, sequential queue. File handles are retained; bytes are read only by injected active services. */
export function createSequentialQueue({analyze,screen,hash,reportStore=new ReportStore(),dispose=async()=>{},getConditions=()=>({visibility:'unknown'}),onEvent=()=>{},maxFiles=20,maxTotalBytes=300_000_000,maxFileBytes=50_000_000}={}) {
  if(typeof analyze!=='function')throw new Error('An analysis service is required.');
  const items=[];let sequence=0,running=false,paused=true,active=null,configuration=null,pending=null,observerError=null,modelFailure=null;
  const snapshot=()=>({modelFailure:clone(modelFailure),observerError,running,paused,activeId:active?.id||null,configuration:clone(configuration),budget:{estimatedSerializedBytes:reportStore.estimatedBytes,limit:reportStore.maxSerializedBytes,pendingSerializedBytes:pending?.bytes||0,measurement:'serialized-report-estimate-not-RAM'},items:items.map(({file,controller,...item})=>clone(item))});
  const emit=(type,detail={})=>{try{const notification=onEvent({type,...detail,state:snapshot()});if(notification?.catch)notification.catch(error=>{observerError=error.message||String(error);});}catch(error){observerError=error.message||String(error);}};
  const conditions=()=>{try{return clone(getConditions());}catch{return {visibility:'unknown',measurementError:true};}};
  const started=new WeakMap();
  const finish=item=>{if(item.timing&&!item.timing.finishedAt){item.timing.finishedAt=new Date().toISOString();item.timing.elapsedMs=performance.now()-started.get(item);item.timing.conditionsAtEnd=conditions();}};
  const find=id=>{const item=items.find(i=>i.id===id);if(!item)throw new Error('Unknown queue item.');return item;};
  const live=(item,epoch)=>active===item&&item.epoch===epoch&&!item.controller.signal.aborted;
  async function pump(){
    if(running||paused||pending)return;
    running=true;emit('queue-started');
    try{
      while(!paused&&!pending){
        const item=items.find(i=>i.status==='queued');if(!item)break;
        active=item;item.epoch++;const epoch=item.epoch;item.controller=new AbortController();item.status='processing';item.phase='hash';item.error=null;item.timing={startedAt:new Date().toISOString(),finishedAt:null,elapsedMs:null,conditionsAtStart:conditions()};started.set(item,performance.now());
        const options={signal:item.controller.signal,configuration:clone(configuration),onProgress:progress=>{if(live(item,epoch)){item.progress=progress;emit('progress',{id:item.id,progress});}}};
        item.requestedConfiguration=clone(configuration);emit('item-started',{id:item.id});
        try{
          const sourceHash=hash?await hash(item.file,options):null;if(!live(item,epoch))continue;
          item.sourceHash=sourceHash;item.phase='analysis';emit('phase',{id:item.id,phase:item.phase});
          const report=await analyze(item.file,options);if(!live(item,epoch))continue;
          if(configuration?.useAI&&screen&&report.analysisComplete){item.phase='screening';emit('phase',{id:item.id,phase:item.phase});try{report.semantic=await screen(report,options);}catch(error){if(!live(item,epoch))continue;if(error.stage==='model-init'||error.code==='MODEL_INIT_FAILED'){paused=true;modelFailure={id:item.id,message:error.message||String(error),stage:'model-init'};emit('model-initialization-failed',{id:item.id,choices:['retry','structural-only']});}report.semantic={status:'error',model:null,requestedChecks:configuration.checks||[],inferencePerformed:false,errorStage:error.stage||null,errorCode:error.code||null,error:error.message||String(error)};}if(!live(item,epoch))continue;}
          report.screeningSelection={useAI:Boolean(configuration?.useAI),modelId:configuration?.modelId||null,checks:[...(configuration?.checks||[])]};
          if(configuration?.useAI&&report.analysisComplete!==true)report.semantic={status:'skipped',requestedChecks:[...(configuration.checks||[])],model:null,inferencePerformed:false,skipReason:'analysis-incomplete',reason:'Structural analysis did not complete; the requested AI screening was not performed.'};
          report.sourceIdentity={queueItemId:item.id,sha256:sourceHash,attemptEpoch:epoch,requestedConfiguration:clone(item.requestedConfiguration)};
          finish(item);item.resultStatus=report.analysisComplete===true?'completed':'failed';if(item.resultStatus==='failed')item.error=(report.checks||[]).filter(c=>c.status==='fail'||c.status==='indeterminate').map(c=>c.summary).filter(Boolean).join('; ')||'Analysis did not complete; compliance was not established.';item.summary=summary(report);item.actualModel=report.semantic?.inferencePerformed===true?report.semantic.model||null:null;item.phase=item.resultStatus;
          const admission=reportStore.put(item.id,report);
          if(!admission.stored){pending={item,report,bytes:admission.bytes};paused=true;item.status='awaiting-budget';item.detailRetained=false;emit('budget-pressure',{id:item.id,requiredSerializedBytes:admission.bytes});}
          else{item.status=item.resultStatus;item.detailRetained=true;emit(item.status==='failed'?'item-failed':'item-completed',{id:item.id});}
        }catch(error){if(live(item,epoch)){finish(item);item.status='failed';item.error=error.message||String(error);item.phase='failed';emit('item-failed',{id:item.id});}}
        finally{finish(item);delete item.controller;active=null;}
      }
    }finally{running=false;emit(paused?'queue-paused':'queue-idle');}
  }
  return {
    enqueue(files){
      const candidates=Array.from(files);const total=items.reduce((sum,i)=>sum+i.bytes,0)+candidates.reduce((sum,f)=>sum+f.size,0);
      if(items.length+candidates.length>maxFiles||total>maxTotalBytes)throw new Error('Queue count or total source-byte admission limit exceeded.');
      if(candidates.some(f=>!Number.isFinite(f.size)||f.size<1||f.size>maxFileBytes))throw new Error('A file exceeds the source-byte limit or is empty.');
      const added=candidates.map(file=>{const item={id:`queue-${++sequence}`,file,name:file.name,bytes:file.size,status:'queued',phase:'queued',epoch:0,sourceHash:null,summary:null,detailRetained:false};items.push(item);return item.id;});emit('enqueued');return added;
    },
    start(config){if(modelFailure)throw new Error('Resolve model initialization failure first.');if(running)throw new Error('Queue already running.');if(pending)throw new Error('Resolve report-budget pressure first.');configuration=clone(config||{});paused=false;return pump();},
    resume(){if(modelFailure)throw new Error('Resolve model initialization failure first.');if(!configuration)throw new Error('Choose queue settings first.');if(pending)throw new Error('Resolve report-budget pressure first.');paused=false;return pump();},
    pause(){paused=true;emit('pause-requested',{policy:'finish-current-then-stop'});},
    cancelActive(){if(!active)return;const item=active;item.epoch++;item.controller.abort();finish(item);item.status='canceled';item.phase='canceled';emit('item-canceled',{id:item.id});},
    retry(id){const item=find(id);if(modelFailure?.id===id)throw new Error('Resolve model initialization failure first.');if(active===item||pending?.item===item)throw new Error('Active or pending item cannot be retried.');if(!['failed','canceled','skipped','completed'].includes(item.status))throw new Error('Item is not retryable.');reportStore.release(id);item.detailRetained=false;item.summary=null;item.timing=null;item.progress=null;item.sourceHash=null;item.actualModel=null;item.error=null;item.detailsReleased=false;item.requestedConfiguration=null;item.resultStatus=null;item.status='queued';item.phase='queued';item.epoch++;emit('item-requeued',{id});},
    skip(id){const item=find(id);if(modelFailure?.id===id)throw new Error('Resolve model initialization failure first.');if(active===item)this.cancelActive();if(pending?.item===item)pending=null;reportStore.release(id);item.detailRetained=false;item.detailsReleased=true;item.status='skipped';item.phase='skipped';emit('item-skipped',{id});},
    releaseDetails(ids,{consent=false}={}){if(!consent)throw new Error('Explicit consent is required to summarize old results.');for(const id of ids){const item=find(id);if(reportStore.release(id)){item.detailRetained=false;item.detailsReleased=true;}}emit('details-released');},
    retainPending(){if(!pending)return true;const {item,report}=pending;const admission=reportStore.put(item.id,report);if(!admission.stored)return false;item.detailRetained=true;item.status=item.resultStatus||'completed';pending=null;emit(item.status==='failed'?'item-failed':'item-completed',{id:item.id});return true;},
    summarizePending({consent=false}={}){if(!consent)throw new Error('Explicit consent is required to discard pending details.');if(pending){pending.item.status=pending.item.resultStatus||'completed';pending.item.detailRetained=false;pending.item.detailsReleased=true;pending=null;emit('pending-summarized');}},
    stopAll(){this.pause();this.cancelActive();},
    remove(id){const item=find(id);if(modelFailure?.id===id)throw new Error('Resolve model initialization failure first.');if(active===item||pending?.item===item)throw new Error('Stop or resolve the active item first.');reportStore.release(id);items.splice(items.indexOf(item),1);emit('item-removed',{id});},
    reorder(ids){const queued=items.filter(i=>i.status==='queued');if(ids.length!==queued.length||new Set(ids).size!==ids.length||ids.some(id=>!queued.some(i=>i.id===id)))throw new Error('Supply every queued item exactly once.');const reordered=ids.map(find);let index=0;for(let i=0;i<items.length;i++)if(items[i].status==='queued')items[i]=reordered[index++];emit('queue-reordered');},
    resolveModelFailure({action}={}){if(!modelFailure)return;if(!['retry','structural-only'].includes(action))throw new Error('Choose retry or structural-only explicitly.');if(pending)throw new Error('Resolve report budget first.');const id=modelFailure.id;modelFailure=null;if(action==='retry')this.retry(id);else configuration={...configuration,useAI:false};return this.resume();},
    getPendingReport(id){return pending?.item.id===id?clone(pending.report):null;},
    getReport:id=>reportStore.get(id),snapshot,
    async destroy(){paused=true;if(active)this.cancelActive();pending=null;reportStore.clear();items.length=0;emit('destroyed');await dispose();}
  };
}
