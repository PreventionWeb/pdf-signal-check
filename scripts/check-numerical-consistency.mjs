// Receipt audit: no inference or policy execution; catches split, seal and metric drift.
import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');
let receipts=0,sets=0;
for(const dir of ['evaluation/numerical-consistency/','evaluation/numerical-consistency/confirmation/']){
 const bytes=await readFile(dir+'challenge.json'), dataset=JSON.parse(bytes),seal=JSON.parse(await readFile(dir+'seal.json'));
 assert.equal(hash(bytes),seal.files['challenge.json']);assert.equal(dataset.cases.length,seal.caseCount);
 const ids=new Set(),groups=new Map(),documents=new Map();
 for(const c of dataset.cases){assert(!ids.has(c.id));ids.add(c.id);assert(['development','held-out'].includes(c.split));assert(['contradiction','clean','ambiguous'].includes(c.label));for(const [map,key]of [[groups,c.sourceGroup],[documents,c.documentId]]){assert(!map.has(key)||map.get(key)===c.split);map.set(key,c.split);}assert(c.a.page!==c.b.page);assert(c.a.text.length>=40&&c.a.text.length<=320);assert(c.b.text.length>=40&&c.b.text.length<=320);}
 for(const name of await readdir(dir)){
  if(!/^(production|modified|final|final-reviewed)-(minilm|granite-r2)\.json$/.test(name))continue;
  const r=JSON.parse(await readFile(dir+name));assert.equal(r.datasetSha256,hash(bytes));assert.equal(r.factsSha256,hash(await readFile((r.sourceDirectory||dir)+r.snapshot+'-facts.mjs')));for(const [path,value]of Object.entries(r.dependencySha256||{}))assert.equal(value,hash(await readFile((r.sourceDirectory||dir)+path)));
  const harnessNames=await readdir('evaluation/numerical-consistency/harnesses/');
  const harnessHashes=await Promise.all(harnessNames.filter(p=>p.endsWith('.mjs')).map(async p=>hash(await readFile('evaluation/numerical-consistency/harnesses/'+p))));
  assert(harnessHashes.includes(r.harnessSha256),'Missing exact archived harness');
  for(const [field,path]of [['runnerSha256','embedding-runner.js'],['modelConfigSha256','models.js'],['workerSha256','numerical-consistency.worker.js']])assert.equal(hash(await readFile('evaluation/numerical-consistency/harnesses/'+path)),r[field]);
  if(r.integrationSnapshot){const manifestBytes=await readFile(r.sourceDirectory+'manifest.json');assert.equal(hash(manifestBytes),r.integrationSnapshot.manifestSha256);for(const [file,value]of Object.entries(r.integrationSnapshot.files))assert.equal(hash(await readFile(r.sourceDirectory+file)),value);}
  if(r.embeddingReuse)assert.equal(hash(await readFile(r.embeddingReuse.path)),r.embeddingReuse.sha256);
  if(r.embeddingReceipt)assert.equal(hash(await readFile(r.embeddingReceipt.path)),r.embeddingReceipt.sha256);
  if(r.reuseObservation)assert.equal(hash(await readFile(r.reuseObservation.path)),r.reuseObservation.sha256);
  if(name.startsWith('final-reviewed-')){assert.equal(r.dependencySha256['facts-scope.js'],'119f7e09d4155be349d8480aae2d8c746bed3921ee5980a7ebaf75bc525e7271');assert.equal(r.sourceDirectory,'evaluation/numerical-consistency/reviewed-policy/');}
  assert.equal(r.rows.length,dataset.cases.length);
  for(const row of r.rows){const c=dataset.cases.find(c=>c.id===row.id);assert.equal(row.label,c.label);assert.equal(row.split,c.split);assert.equal(row.combinedFlag,row.baselineFlag||row.retrievalFlag);}
  for(const [split,paths]of Object.entries(r.aggregates))for(const [field,m]of Object.entries(paths)){
   const rows=r.rows.filter(row=>split==='all'||row.split===split),flags=rows.filter(row=>row[field]);
   const tp=flags.filter(row=>row.label==='contradiction').length,fp=flags.filter(row=>row.label==='clean').length,amb=flags.filter(row=>row.label==='ambiguous').length,pos=rows.filter(row=>row.label==='contradiction').length;
   assert.equal(m.tp,tp);assert.equal(m.fp,fp);assert.equal(m.ambiguousFlags,amb);assert.equal(m.fn,pos-tp);assert.equal(m.precision,tp+fp?tp/(tp+fp):null);assert.equal(m.conservativePrecision,flags.length?tp/flags.length:null);assert.equal(m.recall,pos?tp/pos:null);
  }
  receipts++;
 }
 sets++;
}
console.log(`Verified ${sets} sealed datasets and ${receipts} complete receipts: hashes, split isolation, labels, union and metrics.`);
