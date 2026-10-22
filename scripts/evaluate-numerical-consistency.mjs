// Invocation explicitly requests pinned model assets; only synthetic inputs are accepted.
// Pattern adapted after git-show inspection of spike/chart-description-vlm:scripts/evaluate-models.mjs.
import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync, execFile } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import { getSemanticModel } from '../src/engine/models.js';
const argv=process.argv.slice(2), arg=(k,d)=>argv.includes(k)?argv[argv.indexOf(k)+1]:d;
const dir=arg('--data-dir','evaluation/numerical-consistency').replace(/\/$/,'')+'/';
const sourceDir=arg('--source-dir',dir).replace(/\/$/,'')+'/';
const hash = x => createHash('sha256').update(x).digest('hex');
const input=await readFile(dir+'challenge.json'), seal=JSON.parse(await readFile(dir+'seal.json'));
if(hash(input)!==seal.files['challenge.json'])throw Error('Frozen label hash mismatch');
const dataset=JSON.parse(input);
const snapshot=arg('--snapshot','production'), modelId=arg('--model','minilm');
const output=arg('--output',dir+snapshot+'-'+modelId+'.json');
const embeddingOutput=output.replace(/\.json$/,'')+'-embeddings.json';
const reusePath=arg('--reuse-embeddings',null);
for(const path of [output,...(reusePath?[]:[embeddingOutput])]){try{await access(path);throw Error('Refusing to overwrite existing receipt: '+path);}catch(error){if(error.code!=='ENOENT')throw error;}}
const harnessBytes=await readFile('scripts/evaluate-numerical-consistency.mjs');
const workerBytes=await readFile('scripts/numerical-consistency.worker.js');
const runnerSha256=hash(await readFile('src/runtime/embedding-runner.js'));
const modelConfigSha256=hash(await readFile('src/engine/models.js'));
let reuseReceiptRecord=null;
if(!['production','modified','final'].includes(snapshot)||!['minilm','granite-r2'].includes(modelId))throw Error('Unknown snapshot or model');
const integrationBytes=await readFile(sourceDir+'manifest.json').catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
const integrationSnapshot=integrationBytes?{manifestSha256:hash(integrationBytes),...JSON.parse(integrationBytes)}:null;
const factsBytes=await readFile(sourceDir+snapshot+'-facts.mjs');
const facts=await import(pathToFileURL(process.cwd()+'/'+sourceDir+snapshot+'-facts.mjs'));
const candidates=dataset.cases.map(c=>facts.factCandidates([c.a,c.b].map(s=>({page:s.page,sentences:[{text:s.text,context:s.context,blockIds:[]}]}))));
const texts=candidates.flat().map(f=>facts.factEmbeddingText(f));
const session=`numeric-${modelId}-${process.pid}`;
const call=(args,input)=>new Promise((resolve,reject)=>{const child=execFile('agent-browser',['--session',session,...args],{encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024},(error,stdout,stderr)=>error?reject(Error(stderr||error.message)):resolve(stdout.trim()));if(input)child.stdin.end(input);});
// Serve developer modules with Vite, never modify app entry points or production workers.
const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:4186,strictPort:true},optimizeDeps:{include:['@huggingface/transformers']}});
server.middlewares.use((req,res,next)=>{if(req.url==='/numeric-evaluation'){res.setHeader('content-type','text/html');res.end('<!doctype html><title>Local synthetic numerical evaluation</title>');}else next();});
if(!arg('--reuse-embeddings',null))await server.listen();
let result;
if(reusePath){
 const reuseBytes=await readFile(reusePath),reused=JSON.parse(reuseBytes);
 const companionPath=arg('--reuse-receipt',null);
 if(!companionPath)throw Error('Vector reuse requires --reuse-receipt with recorded configuration and vector-file hash');
 const companionBytes=await readFile(companionPath),companion=JSON.parse(companionBytes);
 if(companion.datasetSha256!==hash(input)||JSON.stringify(companion.model)!==JSON.stringify(getSemanticModel(modelId))||companion.runnerSha256!==runnerSha256||companion.modelConfigSha256!==modelConfigSha256)throw Error('Vector reuse runner/model configuration differs from observation');
 if((companion.embeddingReceipt?.sha256||companion.embeddingReuse?.sha256)!==hash(reuseBytes))throw Error('Vector file hash is not bound to the companion observation');
 if(reused.runnerSha256&&reused.runnerSha256!==runnerSha256||reused.modelConfigSha256&&reused.modelConfigSha256!==modelConfigSha256)throw Error('Embedding metadata configuration differs');
 reuseReceiptRecord={path:companionPath,sha256:hash(companionBytes)};
 if(reused.datasetSha256!==hash(input)||JSON.stringify(reused.texts)!==JSON.stringify(texts)||JSON.stringify(reused.model)!==JSON.stringify(getSemanticModel(modelId)))throw Error('Embedding reuse requires exact sealed dataset, model and input texts');
 result=reused;
} else try {
 await call(['open','http://127.0.0.1:4186/numeric-evaluation']);
 await call(['eval','--stdin'],`window.__numeric={state:'running'}; const w=new Worker('/scripts/numerical-consistency.worker.js',{type:'module'}); window.__worker=w; w.onmessage=({data})=>{if(data.type==='result')window.__numeric={state:'done',result:data};else if(data.type==='error')window.__numeric={state:'error',error:data.message};else window.__progress=data;};w.onerror=e=>window.__numeric={state:'error',error:e.message}; w.postMessage(${JSON.stringify({modelId,texts})});`);
 const deadline=Date.now()+15*60_000;
 while(Date.now()<deadline){await new Promise(r=>setTimeout(r,1500));const parsed=JSON.parse(await call(['eval','JSON.stringify(window.__numeric)']));const state=typeof parsed==='string'?JSON.parse(parsed):parsed;if(state.state==='error')throw Error(state.error);if(state.state==='done'){result=state.result;break;}}
 if(!result)throw Error('15-minute evaluation deadline exceeded');
} finally {try{await call(['close']);}catch{}await server.close();}
if(reusePath)await server.close();
if(result.vectors.length!==texts.length||result.provenance.length!==texts.length||result.vectors.some(v=>v.length!==result.model.dimensions||v.some(x=>!Number.isFinite(x))))throw Error('Incomplete or invalid vector/provenance receipt');
if(!reusePath)await writeFile(embeddingOutput,JSON.stringify({runnerSha256,modelConfigSha256,datasetSha256:hash(input),texts,model:result.model,vectors:result.vectors,provenance:result.provenance})+'\n',{flag:'wx'});
const rows=[];let offset=0;
for(let i=0;i<dataset.cases.length;i++){
 const c=dataset.cases[i], fs=candidates[i], vectors=result.vectors.slice(offset,offset+fs.length), provenance=result.provenance.slice(offset,offset+fs.length);offset+=fs.length;
 const ruleSelection=facts.identicalWordingSelection?.(fs);
 const modelSelection=fs.length===2?facts.similarPairSelection?.(fs,vectors,result.model.thresholds.factHigh):null;
 const baseline=ruleSelection?.pairs||facts.identicalWordingPairs(fs), retrieved=modelSelection?.pairs||(fs.length===2?facts.similarPairs(fs,vectors,result.model.thresholds.factHigh):[]);
 rows.push({...(ruleSelection?{ruleCoverage:ruleSelection.coverage}:{}),...(modelSelection?{retrievalCoverage:modelSelection.coverage}:{}),id:c.id,split:c.split,label:c.label,category:c.category,candidates:fs.length,inferencePerformed:fs.length>0,provenance,baselineFlag:baseline.length>0,retrievalFlag:retrieved.length>0,combinedFlag:baseline.length+retrieved.length>0,similarity:fs.length===2?vectors[0].reduce((s,x,k)=>s+x*vectors[1][k],0):null,baselineValues:baseline.map(p=>p.values),retrievedValues:retrieved.map(p=>p.values)});
}
function metrics(rs,field){const positives=rs.filter(r=>r.label==='contradiction'), clean=rs.filter(r=>r.label==='clean'), flags=rs.filter(r=>r[field]),tp=flags.filter(r=>r.label==='contradiction').length,fp=flags.filter(r=>r.label==='clean').length,ambiguousFlags=flags.filter(r=>r.label==='ambiguous').length;return {cases:rs.length,positives:positives.length,clean:clean.length,ambiguous:rs.length-positives.length-clean.length,tp,fp,fn:positives.length-tp,ambiguousFlags,precision:tp+fp?tp/(tp+fp):null,conservativePrecision:flags.length?tp/flags.length:null,recall:positives.length?tp/positives.length:null,candidateCoverage:rs.filter(r=>r.candidates===2).length/rs.length,embeddingCoverage:rs.filter(r=>r.inferencePerformed).length/rs.length,pairEmbeddingCoverage:rs.filter(r=>r.candidates===2&&r.provenance.length===2).length/rs.length,embeddedSentenceCoverage:rs.reduce((n,r)=>n+r.provenance.length,0)/(2*rs.length),flagRate:flags.length/rs.length,additionalUsefulIds:flags.filter(r=>r.label==='contradiction'&&!r.baselineFlag).map(r=>r.id),additionalFalseIds:flags.filter(r=>r.label==='clean'&&!r.baselineFlag).map(r=>r.id)};}
const aggregates=Object.fromEntries(['all','development','held-out'].map(split=>{const rs=rows.filter(r=>split==='all'||r.split===split);return [split,Object.fromEntries(['baselineFlag','retrievalFlag','combinedFlag'].map(f=>[f,metrics(rs,f)]))];}));
const dependencySha256=snapshot!=='production'?{'facts-scope.js':hash(await readFile(sourceDir+'facts-scope.js'))}:{};
const receipt={integrationSnapshot,sourceDirectory:sourceDir,dependencySha256,reuseObservation:reuseReceiptRecord,embeddingReceipt:reusePath?null:{path:embeddingOutput,sha256:hash(await readFile(embeddingOutput))},embeddingReuse:reusePath?{path:reusePath,sha256:hash(await readFile(reusePath))}:null,schemaVersion:1,observedAt:new Date().toISOString(),snapshot,productionCommit:'4170bf3eb8345696fc3786760ee50e4b5e53fa2b',datasetSha256:hash(input),factsSha256:hash(factsBytes),runnerSha256,modelConfigSha256,harnessSha256:hash(harnessBytes),workerSha256:hash(workerBytes),backend:'actual browser WASM',browserHarness:spawnSync('agent-browser',['--version'],{encoding:'utf8'}).stdout.trim(),cacheSource:'unknown',model:result.model,aggregates,rows,note:'Assistant-labelled synthetic pairwise extraction challenge; no human review, real PDFs, crowding, extraction/layout validation or calibrated confidence. No-flag is not an explicit abstention or evidence of consistency.'};
await writeFile(output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,aggregates},null,2));
