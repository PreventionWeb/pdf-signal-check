// Assemble descriptive observations without pooling repeated documents or running inference.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');
const output=process.argv.includes('--output')?process.argv[process.argv.indexOf('--output')+1]:'evaluation/numerical-consistency/aggregate.json';
const observations=[];
for(const [dir,set]of [['evaluation/numerical-consistency/','phase1'],['evaluation/numerical-consistency/confirmation/','confirmation']]){
 for(const file of (await readdir(dir)).sort()){
  if(!/^(production|modified|final|final-reviewed)-(minilm|granite-r2)\.json$/.test(file))continue;
  const bytes=await readFile(dir+file),r=JSON.parse(bytes);
  observations.push({set,receipt:dir+file,receiptSha256:hash(bytes),datasetSha256:r.datasetSha256,snapshot:file.replace(/-(minilm|granite-r2)\.json$/,''),factsSha256:r.factsSha256,dependencySha256:r.dependencySha256||{},model:r.model.key,observedAt:r.observedAt,exposure:set==='phase1'&&r.snapshot==='final'?'development-exposed replay':set==='confirmation'?'assistant-authored synthetic confirmation; no outputs inspected before reviewed freeze':'assistant-authored synthetic phase1',aggregates:r.aggregates});
 }
}
await writeFile(output,JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),humanReviewed:false,observations,note:'No pooling across repeated snapshots. Conservative precision counts flags on ambiguous inputs as unsupported. Synthetic source-group transfer is not independent human or real-world validation.'},null,2)+'\n',{flag:'wx'});
console.log(`Wrote ${observations.length} distinct observation summaries to ${output}.`);
