// Invocation explicitly requests pinned model assets; only synthetic inputs are accepted.
// Pattern adapted after git-show inspection of spike/chart-description-vlm:scripts/evaluate-models.mjs.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync, execFile } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
const dir='evaluation/numerical-consistency/';
const hash = x => createHash('sha256').update(x).digest('hex');
const input=await readFile(dir+'challenge.json'), seal=JSON.parse(await readFile(dir+'seal.json'));
if(hash(input)!==seal.files['challenge.json'])throw Error('Frozen label hash mismatch');
const dataset=JSON.parse(input), argv=process.argv.slice(2), arg=(k,d)=>argv.includes(k)?argv[argv.indexOf(k)+1]:d;
const snapshot=arg('--snapshot','production'), modelId=arg('--model','minilm');
if(!['production','modified'].includes(snapshot)||!['minilm','granite-r2'].includes(modelId))throw Error('Unknown snapshot or model');
const factsBytes=await readFile(dir+snapshot+'-facts.mjs');
const facts=await import(pathToFileURL(process.cwd()+'/'+dir+snapshot+'-facts.mjs'));
const candidates=dataset.cases.map(c=>facts.factCandidates([c.a,c.b].map(s=>({page:s.page,sentences:[{text:s.text,context:s.context,blockIds:[]}]}))));
const texts=candidates.flat().map(f=>facts.factEmbeddingText(f));
const session=`numeric-${modelId}-${process.pid}`;
const call=(args,input)=>new Promise((resolve,reject)=>{const child=execFile('agent-browser',['--session',session,...args],{encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024},(error,stdout,stderr)=>error?reject(Error(stderr||error.message)):resolve(stdout.trim()));if(input)child.stdin.end(input);});
// Serve developer modules with Vite, never modify app entry points or production workers.
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:4186,strictPort:true},optimizeDeps:{include:['@huggingface/transformers']}});
server.middlewares.use((req,res,next)=>{if(req.url==='/numeric-evaluation'){res.setHeader('content-type','text/html');res.end('<!doctype html><title>Local synthetic numerical evaluation</title>');}else next();});
await server.listen();
let result;
try {
 await call(['open','http://127.0.0.1:4186/numeric-evaluation']);
 await call(['eval','--stdin'],`window.__numeric={state:'running'}; const w=new Worker('/scripts/numerical-consistency.worker.js',{type:'module'}); window.__worker=w; w.onmessage=({data})=>{if(data.type==='result')window.__numeric={state:'done',result:data};else if(data.type==='error')window.__numeric={state:'error',error:data.message};else window.__progress=data;};w.onerror=e=>window.__numeric={state:'error',error:e.message}; w.postMessage(${JSON.stringify({modelId,texts})});`);
 const deadline=Date.now()+15*60_000;
 while(Date.now()<deadline){await new Promise(r=>setTimeout(r,1500));const parsed=JSON.parse(await call(['eval','JSON.stringify(window.__numeric)']));const state=typeof parsed==='string'?JSON.parse(parsed):parsed;if(state.state==='error')throw Error(state.error);if(state.state==='done'){result=state.result;break;}}
 if(!result)throw Error('15-minute evaluation deadline exceeded');
} finally {try{await call(['close']);}catch{}await server.close();}
await writeFile(dir+snapshot+'-'+modelId+'-embeddings.json',JSON.stringify({datasetSha256:hash(input),texts,model:result.model,vectors:result.vectors,provenance:result.provenance})+'\n');
const rows=[];let offset=0;
for(let i=0;i<dataset.cases.length;i++){
 const c=dataset.cases[i], fs=candidates[i], vectors=result.vectors.slice(offset,offset+fs.length), provenance=result.provenance.slice(offset,offset+fs.length);offset+=fs.length;
 const baseline=facts.identicalWordingPairs(fs), retrieved=fs.length===2?facts.similarPairs(fs,vectors,result.model.thresholds.factHigh):[];
 rows.push({id:c.id,split:c.split,label:c.label,category:c.category,candidates:fs.length,inferencePerformed:fs.length>0,provenance,baselineFlag:baseline.length>0,retrievalFlag:retrieved.length>0,combinedFlag:baseline.length+retrieved.length>0,similarity:fs.length===2?vectors[0].reduce((s,x,k)=>s+x*vectors[1][k],0):null,baselineValues:baseline.map(p=>p.values),retrievedValues:retrieved.map(p=>p.values)});
}
function metrics(rs,field){const positives=rs.filter(r=>r.label==='contradiction'), clean=rs.filter(r=>r.label==='clean'), flags=rs.filter(r=>r[field]),tp=flags.filter(r=>r.label==='contradiction').length,fp=flags.filter(r=>r.label==='clean').length,ambiguousFlags=flags.filter(r=>r.label==='ambiguous').length;return {cases:rs.length,positives:positives.length,clean:clean.length,ambiguous:rs.length-positives.length-clean.length,tp,fp,fn:positives.length-tp,ambiguousFlags,precision:tp+fp?tp/(tp+fp):null,conservativePrecision:flags.length?tp/flags.length:null,recall:positives.length?tp/positives.length:null,candidateCoverage:rs.filter(r=>r.candidates===2).length/rs.length,embeddingCoverage:rs.filter(r=>r.inferencePerformed).length/rs.length,flagRate:flags.length/rs.length,additionalUsefulIds:flags.filter(r=>r.label==='contradiction'&&!r.baselineFlag).map(r=>r.id),additionalFalseIds:flags.filter(r=>r.label==='clean'&&!r.baselineFlag).map(r=>r.id)};}
const aggregates=Object.fromEntries(['all','development','held-out'].map(split=>{const rs=rows.filter(r=>split==='all'||r.split===split);return [split,Object.fromEntries(['baselineFlag','retrievalFlag','combinedFlag'].map(f=>[f,metrics(rs,f)]))];}));
const receipt={schemaVersion:1,observedAt:new Date().toISOString(),snapshot,productionCommit:'4170bf3eb8345696fc3786760ee50e4b5e53fa2b',datasetSha256:hash(input),factsSha256:hash(factsBytes),runnerSha256:hash(await readFile('src/runtime/embedding-runner.js')),modelConfigSha256:hash(await readFile('src/engine/models.js')),harnessSha256:hash(await readFile('scripts/evaluate-numerical-consistency.mjs')),workerSha256:hash(await readFile('scripts/numerical-consistency.worker.js')),backend:'actual browser WASM',browserHarness:spawnSync('agent-browser',['--version'],{encoding:'utf8'}).stdout.trim(),cacheSource:'unknown',model:result.model,aggregates,rows,note:'Assistant-labelled synthetic pairwise extraction challenge; no human review, real PDFs, crowding, extraction/layout validation or calibrated confidence. No-flag is not an explicit abstention or evidence of consistency.'};
const output=dir+snapshot+'-'+modelId+'.json';await writeFile(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({output,aggregates},null,2));
