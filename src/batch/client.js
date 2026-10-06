import { buildScreeningRequest } from '../runtime/screening-request.js';
const canceled=()=>new DOMException('Canceled','AbortError');
export function readSource(file,signal){
  if(signal.aborted)return Promise.reject(canceled());
  if(typeof FileReader==='undefined')return file.arrayBuffer().then(buffer=>{if(signal.aborted)throw canceled();return buffer;});
  return new Promise((resolve,reject)=>{const reader=new FileReader();let settled=false;const finish=(error,result)=>{if(settled)return;settled=true;signal.removeEventListener('abort',abort);reader.onload=reader.onerror=reader.onabort=null;error?reject(error):resolve(result);};const abort=()=>{reader.abort();finish(canceled());};signal.addEventListener('abort',abort,{once:true});reader.onload=()=>finish(null,reader.result);reader.onerror=()=>finish(reader.error || new Error('Source read failed'));reader.onabort=()=>finish(canceled());try{reader.readAsArrayBuffer(file);}catch(e){finish(e);}});
}
/** Scheduler owns sequencing; client settles every abort/disposal and owns workers. */
export class BatchWorkerClient {
  constructor({workerFactory=kind=>kind==='analysis'?new Worker(new URL('../analysis.worker.js',import.meta.url),{type:'module'}):new Worker(new URL('../model.worker.js',import.meta.url),{type:'module'})}={}){this.workerFactory=workerFactory;this.sequence=0;this.modelWorker=null;this.analysisWorker=null;this.busy=false;this.hashes=new WeakMap();this.pending=new Set();}
  async hash(file,{signal}) {const bytes=await readSource(file,signal);let value=null;try{const digest=await crypto.subtle.digest('SHA-256',bytes);if(signal.aborted)throw canceled();value=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}catch(e){if(signal.aborted)throw canceled();}this.hashes.set(file,value);return value;}
  request(worker,{signal,requestId,onProgress=()=>{},post,model=false}){
    return new Promise((resolve,reject)=>{let settled=false,lastStage=null;const finish=(error,result)=>{if(settled)return;settled=true;this.pending.delete(dispose);signal.removeEventListener('abort',abort);worker.onmessage=worker.onerror=null;error?reject(error):resolve(result);};const terminate=()=>{worker.terminate();if(this.modelWorker===worker)this.modelWorker=null;if(this.analysisWorker===worker)this.analysisWorker=null;};const dispose=()=>{terminate();finish(canceled());};const abort=dispose;this.pending.add(dispose);signal.addEventListener('abort',abort,{once:true});
      worker.onerror=e=>{const error=new Error(e.message || 'Worker unavailable');if(model && lastStage!=='inference'){error.stage='model-init';error.code='MODEL_INIT_FAILED';}terminate();finish(error);};
      worker.onmessage=({data})=>{if(settled || signal.aborted || requestId!=null && (this.modelWorker!==worker || data.requestId!==requestId))return;try{if(data.type==='progress'){lastStage=data.progress?.stage;onProgress(model?{...data.progress,message:data.message}:data.progress);}else if(data.type==='error'){const error=new Error(data.message);error.stage=data.stage;error.code=data.code;finish(error);}else if(data.type==='result')finish(null,model?data.semantic:data.report);}catch(e){terminate();finish(e);}};
      try{if(signal.aborted)dispose();else post();}catch(e){terminate();finish(e);}
    });
  }
  async analyze(file,{signal,onProgress}) {
    const buffer=await readSource(file,signal);if(signal.aborted)throw canceled();const worker=this.workerFactory('analysis',new URL('../analysis.worker.js',import.meta.url));this.analysisWorker=worker;
    try {const report=await this.request(worker,{signal,onProgress,post:()=>worker.postMessage({buffer,fileName:file.name},[buffer])});report.file.sourceBytes=file.size;if(this.hashes.get(file))report.file.sha256=this.hashes.get(file);return report;}
    finally {worker.terminate();if(this.analysisWorker===worker)this.analysisWorker=null;}
  }
  async screen(report,{signal,configuration,onProgress}) {
    if(signal.aborted)throw canceled();if(this.busy)throw new Error('A screening request is already active.');this.busy=true;const requestId=++this.sequence;let worker;
    try {try{worker=this.modelWorker ||= this.workerFactory('model',new URL('../model.worker.js',import.meta.url));}catch(cause){const error=cause instanceof Error?cause:new Error(String(cause));error.stage='model-init';error.code='MODEL_INIT_FAILED';throw error;}
      report.screeningSelection={modelId:configuration.modelId,checks:[...configuration.checks]};
      return await this.request(worker,{signal,requestId,onProgress,model:true,post:()=>worker.postMessage(buildScreeningRequest(report,{modelId:configuration.modelId,checks:configuration.checks,requestId}))});
    } finally {this.busy=false;}
  }
  async dispose(){++this.sequence;for(const finish of [...this.pending])finish();this.analysisWorker?.terminate();this.analysisWorker=null;this.modelWorker?.terminate();this.modelWorker=null;this.busy=false;}
}
