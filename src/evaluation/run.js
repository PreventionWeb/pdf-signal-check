import { assessSemantic } from '../engine/semantic.js';
import { identicalWordingPairs, quantities } from '../engine/facts.js';
const flagged = row => ['suspected-mismatch', 'mismatch'].includes(row.outcome);
function assessmentFor(c, semantic) {
  if (c.field === 'keyword') return semantic.keywordItems.find(i => i.keyword === c.query);
  if (c.field === 'section') return semantic.sectionItems[0];
  if (c.field === 'figure') return semantic.figureItems.find(i => i.figureId === c.targetId);
  if (c.field === 'contents') return semantic.contentItems.find(i => i.contentsId === c.targetId);
  if (c.field === 'fact') {
    const pair = semantic.factPairs[0];
    const ran = semantic.inferencePerformed && semantic.factCoverage?.compared === 2;
    return { status: pair ? 'suspected-mismatch' : ran ? 'no-flag' : 'unassessed', method: ran ? 'embedding-screening' : 'unassessed',
      inferencePerformed: ran, evidence: pair ? [{ similarity: pair.similarity }] : [] };
  }
  return semantic[c.field];
}
/** Only cases with a labelled equivalent existing rule baseline participate in incremental-yield counts. */
function ruleOutcome(c) {
  if (c.field === 'fact') return identicalWordingPairs(c.input.facts).length ? 'suspected-mismatch' : 'no-flag';
  if (c.baseline === 'no-flag') return 'no-flag'; // Caller must label a rule-clean pair, after verifying input ownership.
  return null;
}
export function summarizeUsefulness(rows) {
  const concerns = rows.filter(flagged), falseFlags = concerns.filter(row => row.expected === 'support');
  const labelledConcerns = concerns.filter(row => row.expected !== 'uncertain');
  const positives = rows.filter(row => row.expected === 'mismatch'), clean = rows.filter(row => row.expected === 'support');
  const baseline = rows.filter(row => row.rulesOutcome !== null && row.rulesOutcome !== undefined);
  return { cases: rows.length, assessed: rows.filter(row => row.inferencePerformed).length,
    abstained: rows.filter(row => ['uncertain', 'unassessed'].includes(row.outcome)).length,
    concerns: concerns.length, concernsOnUncertainInputs: concerns.filter(row => row.expected === 'uncertain').length,
    trueConcerns: concerns.filter(row => row.expected === 'mismatch').length,
    falseFlags: falseFlags.length, goodInputs: clean.length, badInputs: positives.length,
    falseReassurance: rows.filter(row => row.expected === 'mismatch' && ['match', 'semantically-related'].includes(row.outcome)).length,
    missedConcerns: positives.filter(row => !flagged(row)).length,
    precision: labelledConcerns.length ? concerns.filter(row => row.expected === 'mismatch').length / labelledConcerns.length : null,
    baselineCases: baseline.length, ruleConcerns: baseline.filter(row => flagged({ outcome: row.rulesOutcome })).length,
    combinedTrueConcerns: baseline.filter(row => row.expected === 'mismatch' && (flagged(row) || flagged({ outcome: row.rulesOutcome }))).length,
    combinedFalseFlags: baseline.filter(row => row.expected === 'support' && (flagged(row) || flagged({ outcome: row.rulesOutcome }))).length,
    additionalTrueConcerns: baseline.filter(row => row.expected === 'mismatch' && !flagged({ outcome: row.rulesOutcome }) && flagged(row)).length,
    additionalFalseFlags: baseline.filter(row => row.expected === 'support' && !flagged({ outcome: row.rulesOutcome }) && flagged(row)).length };
}
export async function evaluateDataset(cases,model,embed) {
  if(!Array.isArray(cases)||cases.length>100)throw new Error('Evaluation requires a bounded dataset of at most 100 cases.');
  const rows=[];
  for(const c of cases) {
    if(!['development','held-out'].includes(c.split)||!['support','mismatch','uncertain'].includes(c.expected))throw new Error('Evaluation labels or split missing.');
    if (!['title','subject','keyword','section','figure','contents','fact'].includes(c.field)) throw new Error('Unknown evaluation task.');
    if (['figure', 'contents'].includes(c.field) && !c.targetId) throw new Error('A comparison target ID is required.');
    if (c.field === 'fact' && c.input?.facts?.length !== 2) throw new Error('Fact evaluation requires exactly two labelled sentences.');
    const input = c.field === 'fact' ? { ...c.input, facts: c.input.facts.map(fact => ({ ...fact, quantities: quantities(fact.text) })) } : c.input;
    const semantic=await assessSemantic({...input,modelId:model.key},embed);
    const assessment=assessmentFor(c,semantic);
    const scores=(assessment?.evidence||[]).map(e=>e.similarity).filter(Number.isFinite);
    const outcome=assessment?.status;
    rows.push({id:c.id,split:c.split,task:c.field,expected:c.expected,outcome:outcome||'unassessed',method:assessment?.method||semantic[c.field==='keyword'?'keywords':c.field==='section'?'sections':c.field]?.method||'unassessed',inferencePerformed:assessment?.inferencePerformed===true,score:scores.length?Math.max(...scores):null,
      rulesOutcome: ruleOutcome({ ...c, input }), embeddedTextCount: semantic.embeddedTextCount,
      truncatedInputs: semantic.inferenceProvenance.filter(input => input.truncated).length});
  }
  const summarize=split=>{const values=rows.filter(r=>r.split===split);return {cases:values.length,knownMismatches:values.filter(r=>r.expected==='mismatch').length,
    falseIdentityMatches:values.filter(r=>r.expected==='mismatch'&&r.outcome==='match').length,
    wrongMetadataRelated:values.filter(r=>r.expected==='mismatch'&&r.outcome==='semantically-related').length,
    missedMismatch:values.filter(r=>r.expected==='mismatch'&&!['suspected-mismatch','mismatch'].includes(r.outcome)).length,
    correctSupportRejected:values.filter(r=>r.expected==='support'&&r.outcome==='suspected-mismatch').length,
    uncertain:values.filter(r=>r.outcome==='uncertain'||r.outcome==='unassessed').length};};
  const sensitivity=thresholdSensitivity(rows,model);
  const usefulness = ['development','held-out'].map(split => ({ split, tasks: [...new Set(rows.filter(r => r.split === split).map(r => r.task))].map(task => ({ task, ...summarizeUsefulness(rows.filter(r => r.split === split && r.task === task)) })) }));
  return {schemaVersion:2,model,rows,thresholdSensitivity:sensitivity,usefulness,development:summarize('development'),heldOut:summarize('held-out'),note:'Small manually labeled corpus; functional comparison only, insufficient for thresholds or real-world accuracy. Synthetic cases do not establish real-report usefulness. No automatic threshold changes.'};
}

export function thresholdSensitivity(rows,model){
  return ['development','held-out'].map(split=>({split,rows:[0.2,0.35,0.45,0.5,0.65,0.75,0.8,0.9].filter(high=>high>=model.thresholds.topicLow).map(high=>{const scored=rows.filter(r=>r.split===split&&Number.isFinite(r.score)&&['subject','keyword','section'].includes(r.task));const low=model.thresholds.topicLow;return {topicMismatchCutoff:low,topicSupportCutoff:high,scoredTopicCases:scored.length,abstentions:scored.filter(r=>r.score>=low&&r.score<high).length,missedMismatch:scored.filter(r=>r.expected==='mismatch'&&r.score>=low).length,falseTopicalSupport:scored.filter(r=>r.expected==='mismatch'&&r.score>=high).length,correctSupportBelowCutoff:scored.filter(r=>r.expected==='support'&&r.score<high).length};})}));
}
