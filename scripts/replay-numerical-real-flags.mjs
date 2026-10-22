// Optional PRIVATE development diagnostic. Publishes counts/hashes only, never source text.
// This filters previously retained model flags; no vectors are present to recover missed pairs.
import {readFile, writeFile, access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as production from '../evaluation/numerical-consistency/production-facts.mjs';
import * as modified from '../evaluation/numerical-consistency/modified-facts.mjs';
const outputPath=process.argv[process.argv.indexOf('--output')+1]&&process.argv.includes('--output')?process.argv[process.argv.indexOf('--output')+1]:'evaluation/numerical-consistency/real-development-flag-replay.json';
try{await access(outputPath);throw Error('Refusing to overwrite existing receipt: '+outputPath);}catch(error){if(error.code!=='ENOENT')throw error;}
const hash=x=>createHash('sha256').update(x).digest('hex');
const output={schemaVersion:1,observedAt:new Date().toISOString(),kind:'previously-exposed development regression; retained-flag filtering only',humanReviewed:false,sourceTextPublished:false,models:[],limitations:['No original candidate vectors saved; cannot measure new retrieval or full old/new policy recall.','Existing report set has already informed development and is not independent or newly labelled.','Retained count is not a correctness label; no precision/recall claims.']};
for(const model of ['minilm','granite-r2']){
 const path=`dev-corpus/real-evaluation/${model}-observed.json`,bytes=await readFile(path),data=JSON.parse(bytes);
 const pairs=data.outputs.flatMap(o=>o.semantic?.factPairs||[]);
 const keep=engine=>pairs.filter(p=>engine.conflictingValues({...p.a,quantities:engine.quantities(p.a.text)},{...p.b,quantities:engine.quantities(p.b.text)})).length;
 output.models.push({model,documents:data.outputs.length,documentsWithFactCoverage:data.outputs.filter(o=>o.semantic?.factCoverage).length,candidates:data.outputs.reduce((s,o)=>s+(o.semantic?.factCoverage?.candidates||0),0),compared:data.outputs.reduce((s,o)=>s+(o.semantic?.factCoverage?.compared||0),0),previouslyRetainedFlags:pairs.length,productionGuardRetains:keep(production),modifiedGuardRetains:keep(modified)});
}
output.productionFactsSha256=hash(await readFile('evaluation/numerical-consistency/production-facts.mjs'));
output.modifiedFactsSha256=hash(await readFile('evaluation/numerical-consistency/modified-facts.mjs'));
output.modifiedScopeSha256=hash(await readFile('evaluation/numerical-consistency/facts-scope.js'));
await writeFile(outputPath,JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(output,null,2));
