import {expect,it} from 'vitest';
import {summarizeRuns,WORKLOAD} from '../src/calibration/workload.js';
import {evaluateDataset,thresholdSensitivity} from '../src/evaluation/run.js';
import {getSemanticModel} from '../src/engine/models.js';
import {inspectReadingOrder} from '../src/engine/advisories.js';
it('summarizes completed warm runs without substituting elapsed download time or unfinished work',()=>{
 expect(summarizeRuns([40,10,20])).toEqual({medianMs:20,minimumMs:10,maximumMs:40,runsMs:[40,10,20]});
 expect(()=>summarizeRuns([10,20])).toThrow();expect(()=>summarizeRuns([10,NaN,20])).toThrow();expect(WORKLOAD.texts).toHaveLength(4);
});
it('records held-out false topical support separately from literal identity acceptance',async()=>{
 const cases=[{id:'unrelated',split:'held-out',field:'title',expected:'mismatch',input:{checks:['title'],metadata:{language:'en',infoTitle:'Spacecraft propulsion'},candidates:[{page:1,source:'tagged H1',text:'River flood planning'}]}}];
 const result=await evaluateDataset(cases,getSemanticModel('minilm'),async texts=>texts.map(()=>[1,0]));
 expect(result.heldOut.wrongMetadataRelated).toBe(1);expect(result.heldOut.falseIdentityMatches).toBe(0);expect(result.model.calibrated).toBe(false);expect(result.rows[0].score).toBe(1);expect(result.heldOut.missedMismatch).toBe(1);expect(result.thresholdSensitivity[1].rows[0].falseTopicalSupport).toBe(0);
});
it('limits spatial order clues to recovered single-alignment heading evidence and abstains columns',()=>{
 const make=(xs,ys)=>[{number:1,logicalBlocks:ys.map((y,i)=>({key:`1:${i}`,role:'H2',text:`Heading ${i}`})),blocks:ys.map((y,i)=>({key:`1:${i}`,quad:[[xs[i],y],[xs[i]+100,y],[xs[i]+100,y+12],[xs[i],y+12]]}))}];
 expect(inspectReadingOrder(make([40,40,40],[700,400,600])).status).toBe('requires-review');
 expect(inspectReadingOrder(make([40,40,40],[700,600,400])).status).toBe('uncertain');
 expect(inspectReadingOrder(make([40,300,40],[700,400,600])).status).toBe('uncertain');
});

it('records unsupported language as unassessed inference rather than claiming embedding execution',async()=>{
 const cases=[{id:'de-keyword',split:'held-out',field:'keyword',query:'Wasser',expected:'support',input:{checks:['keywords'],metadata:{language:'de',keywords:'Wasser; Klima'},openingEvidence:[{page:1,text:'Wasser und Klima '.repeat(20)}]}}];
 const result=await evaluateDataset(cases,getSemanticModel('minilm'),()=>{throw new Error('must not load encoder');});
 expect(result.rows[0]).toMatchObject({method:'unsupported-language',inferencePerformed:false,score:null});
});

it('never promotes scores below the mismatch cutoff in topic threshold sensitivity',()=>{
 const result=thresholdSensitivity([{split:'held-out',task:'keyword',expected:'mismatch',score:0.3}],getSemanticModel('granite-r2'));
 expect(result[1].rows.every(r=>r.topicSupportCutoff>=r.topicMismatchCutoff)).toBe(true);expect(result[1].rows.every(r=>r.falseTopicalSupport===0&&r.missedMismatch===0)).toBe(true);
});
