// Developer browser harness. Requires installed agent-browser and a built local preview.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const args=process.argv.slice(2),arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const model=arg('--model','minilm'),base=arg('--url','http://127.0.0.1:4178/'),output=arg('--output',`evaluation/${model}-observed.json`);
if(!['minilm','granite-r2'].includes(model))throw new Error('Unknown model.');
const cases=JSON.parse(await readFile(new URL('../evaluation/cases.json',import.meta.url),'utf8'));
const assets=await readdir(new URL('../dist/assets/',import.meta.url)),worker=assets.find(f=>/^benchmark\.worker-.*\.js$/.test(f));
if(!worker)throw new Error('Build the mounted calibration view before evaluating.');
const session=`pdf-evaluation-${model}-${process.pid}`;
const call=(command,input)=>{const r=spawnSync('agent-browser',['--session',session,...command],{input,encoding:'utf8',timeout:60000});if(r.status!==0)throw new Error(r.stderr||r.stdout);return r.stdout.trim();};
try{
 call(['open',base]);
 call(['eval','--stdin'],`window.__pdfEvaluation={state:'running'};window.__evalWorker=new Worker(${JSON.stringify(new URL('assets/'+worker,base).href)},{type:'module'});__evalWorker.onmessage=({data})=>{if(data.type==='evaluation-result')__pdfEvaluation={state:'done',result:data.evaluation};if(data.type==='error')__pdfEvaluation={state:'error',error:data.message};};__evalWorker.onerror=e=>__pdfEvaluation={state:'error',error:e.message};__evalWorker.postMessage(${JSON.stringify({kind:'evaluation',requestId:1,modelId:model,cases})});`);
 const deadline=Date.now()+15*60*1000;let receipt;
 while(Date.now()<deadline){await new Promise(r=>setTimeout(r,1000));const result=JSON.parse(call(['eval','JSON.stringify(window.__pdfEvaluation)']));const state=typeof result==='string'?JSON.parse(result):result;
  if(state.state==='error')throw new Error(state.error);if(state.state==='done'){receipt=state.result;break;}}
 if(!receipt)throw new Error('Evaluation deadline exceeded; no partial success claimed.');
 receipt.observation={observedAt:new Date().toISOString(),backend:'browser WASM',browserHarness:'agent-browser',agentBrowserVersion:spawnSync('agent-browser',['--version'],{encoding:'utf8'}).stdout.trim(),cacheSource:'unknown'};
 await writeFile(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({output,model,development:receipt.development,heldOut:receipt.heldOut,note:receipt.note},null,2));
}finally{try{call(['close']);}catch{}}
