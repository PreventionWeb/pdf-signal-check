import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import { analyzePdf,pdfjs } from '../engine/analyze.js';
import { getSemanticModel } from '../engine/models.js';
import { EmbeddingRunner } from '../runtime/embedding-runner.js';
import { WORKLOAD,summarizeRuns } from './workload.js';
import { evaluateDataset } from '../evaluation/run.js';
const runner=new EmbeddingRunner();let busy=false;
self.onmessage=async({data})=>{
  const post=m=>self.postMessage({...m,requestId:data.requestId});
  if(busy){post({type:'error',message:'Calibration already running.'});return;}busy=true;
  try{
    const model=getSemanticModel(data.modelId);
    if(data.kind==='evaluation'){
      const evaluation=await evaluateDataset(data.cases,model,(texts,m)=>runner.embed(texts,m,post));await runner.dispose();post({type:'evaluation-result',evaluation});return;
    }
    // No document name, text or arbitrary byte buffer is accepted from the client.
    post({type:'progress',message:'Loading the public synthetic two-page fixture.',progress:{stage:'fixture',state:'started',completed:null,total:null,unit:null}});
    const assetBase=new URL('../pdfjs/',self.location.href);
    const fixtureUrl=new URL('../calibration/01-clean-text.pdf',self.location.href);
    const response=await fetch(fixtureUrl);if(!response.ok)throw new Error('Synthetic fixture unavailable.');
    const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>100_000)throw new Error('Synthetic fixture size limit exceeded.');
    pdfjs.GlobalWorkerOptions.workerPort=new Worker(workerUrl,{type:'module'});
    const parseStart=performance.now();const report=await analyzePdf(bytes,{pdfjsOptions:{useWorkerFetch:true,standardFontDataUrl:new URL('standard_fonts/',assetBase).href,cMapUrl:new URL('cmaps/',assetBase).href,cMapPacked:true,wasmUrl:new URL('wasm/',assetBase).href}});
    const parseMs=performance.now()-parseStart;pdfjs.GlobalWorkerOptions.workerPort?.terminate();pdfjs.GlobalWorkerOptions.workerPort=null;if(!report.analysisComplete)throw new Error('Synthetic fixture analysis did not complete.');
    const load=await runner.ensure(model,post);
    post({type:'progress',message:'Warming the encoder with fixed synthetic inputs.',progress:{stage:'warmup',state:'started',completed:null,total:null,unit:null}});
    await runner.embed(WORKLOAD.texts,model,post);
    const runs=[];let provenance;
    for(let i=0;i<3;i++){
      const start=performance.now();const output=await runner.embed(WORKLOAD.texts,model,post);runs.push(performance.now()-start);provenance=output.provenance;
      post({type:'progress',message:`Completed ${i+1} of 3 measured sample runs.`,progress:{stage:'benchmark',state:'progress',completed:i+1,total:3,unit:'runs'}});
    }
    await runner.dispose();
    post({type:'result',receipt:{schemaVersion:1,workloadId:WORKLOAD.id,model,fixture:{file:WORKLOAD.fixture,bytes:bytes.length,pages:report.file.pages,parseMs},load,warm:summarizeRuns(runs),
      workload:{texts:4,batchSize:4,warmups:1,measuredRuns:3,tokenCap:model.maxTokens,tokens:provenance.map(p=>({inputTokens:p.inputTokens,consumedTokens:p.consumedTokens,truncated:p.truncated}))},
      memory:{status:'unknown'},encoderLifecycle:'released-before-result',note:'Tiny synthetic workload cost only. No device certification, real-document ETA, RAM guarantee or semantic accuracy calibration.'}});
  }catch(error){post({type:'error',message:error.message});}finally{pdfjs.GlobalWorkerOptions.workerPort?.terminate();pdfjs.GlobalWorkerOptions.workerPort=null;await runner.dispose();busy=false;}
};
