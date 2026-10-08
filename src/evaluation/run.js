import { assessSemantic } from '../engine/semantic.js';
export async function evaluateDataset(cases,model,embed) {
  if(!Array.isArray(cases)||cases.length>100)throw new Error('Evaluation requires a bounded dataset of at most 100 cases.');
  const rows=[];
  for(const c of cases) {
    if(!['development','held-out'].includes(c.split)||!['support','mismatch','uncertain'].includes(c.expected))throw new Error('Evaluation labels or split missing.');
    const semantic=await assessSemantic({...c.input,modelId:model.key},embed);
    const assessment=c.field==='keyword'?semantic.keywordItems.find(i=>i.keyword===c.query):c.field==='section'?semantic.sectionItems[0]:semantic[c.field];
    const scores=(assessment?.evidence||[]).map(e=>e.similarity).filter(Number.isFinite);
    const outcome=c.field==='keyword'?semantic.keywordItems.find(i=>i.keyword===c.query)?.status:c.field==='section'?semantic.sectionItems[0]?.status:semantic[c.field]?.status;
    rows.push({id:c.id,split:c.split,task:c.field,expected:c.expected,outcome:outcome||'unassessed',method:assessment?.method||semantic[c.field==='keyword'?'keywords':c.field==='section'?'sections':c.field]?.method||'unassessed',inferencePerformed:assessment?.inferencePerformed===true,score:scores.length?Math.max(...scores):null});
  }
  const summarize=split=>{const values=rows.filter(r=>r.split===split);return {cases:values.length,knownMismatches:values.filter(r=>r.expected==='mismatch').length,
    falseIdentityMatches:values.filter(r=>r.expected==='mismatch'&&r.outcome==='match').length,
    wrongMetadataRelated:values.filter(r=>r.expected==='mismatch'&&r.outcome==='semantically-related').length,
    missedMismatch:values.filter(r=>r.expected==='mismatch'&&!['suspected-mismatch','mismatch'].includes(r.outcome)).length,
    correctSupportRejected:values.filter(r=>r.expected==='support'&&r.outcome==='suspected-mismatch').length,
    uncertain:values.filter(r=>r.outcome==='uncertain'||r.outcome==='unassessed').length};};
  const sensitivity=thresholdSensitivity(rows,model);
  return {schemaVersion:1,model,rows,thresholdSensitivity:sensitivity,development:summarize('development'),heldOut:summarize('held-out'),note:'Small manually labeled synthetic corpus; functional comparison only, insufficient for thresholds or real-world accuracy. No automatic threshold changes.'};
}

export function thresholdSensitivity(rows,model){
  return ['development','held-out'].map(split=>({split,rows:[0.2,0.35,0.45,0.5,0.65,0.75,0.8,0.9].filter(high=>high>=model.thresholds.topicLow).map(high=>{const scored=rows.filter(r=>r.split===split&&r.score!==null&&r.task!=='title');const low=model.thresholds.topicLow;return {topicMismatchCutoff:low,topicSupportCutoff:high,scoredTopicCases:scored.length,abstentions:scored.filter(r=>r.score>=low&&r.score<high).length,missedMismatch:scored.filter(r=>r.expected==='mismatch'&&r.score>=low).length,falseTopicalSupport:scored.filter(r=>r.expected==='mismatch'&&r.score>=high).length,correctSupportBelowCutoff:scored.filter(r=>r.expected==='support'&&r.score<high).length};})}));
}
