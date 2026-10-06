const valueAt=(object,path)=>String(path || '').replace(/\[(\d+)\]/g,'.$1').split('.').filter(Boolean).reduce((value,key)=>value?.[key],object);
const modelName=model=>model?.label || model?.id || 'unspecified model';
const completedModel=semantic=>semantic?.inferencePerformed===true&&[undefined,null,'completed'].includes(semantic.status)&&Boolean(semantic.model?.id || semantic.model?.label);
/** Explain recorded execution, never infer it from the selected model or method name alone. */
export function findingProvenance(finding,report) {
  const path=finding.source?.path || '',actual=valueAt(report,path),method=finding.method || '';
  if(path.startsWith('semantic')) {
    if(completedModel(report.semantic) && actual?.inferencePerformed===true && actual.method==='embedding-screening' && method==='embedding-screening')return {kind:'ai',label:'Local AI relatedness',help:'ai',detail:`${modelName(report.semantic?.model)} compared bounded text. This is not identity or factual verification.`};
    if(method==='deterministic-rules')return {kind:'rules',label:'Extracted PDF + rules',help:'rules',detail:'This result was settled by title comparison rules; no inference was used for this check.'};
    return {kind:'unassessed',label:'AI check not assessed',help:'bounded',detail:actual?.reason || actual?.error || finding.summary || 'No completed model inference is recorded for this check.'};
  }
  if(['authorConsistency','readingOrder'].includes(path))return {kind:'heuristic',label:'Rule-based heuristic',help:'heuristic',detail:path==='authorConsistency'?'Recovered metadata is compared with a heuristic first-page byline candidate; authorship is not authenticated.':'A bounded numbered/spatial order clue; intended reading order still requires visual inspection.'};
  if(path==='metadataConsistency')return {kind:'rules',label:'Extracted PDF + title rules',help:'rules',detail:'Title strings are compared with recovered publication candidates. Candidate selection and normalization can miss issues.'};
  if(path==='attachments'&&actual?.status==='not-assessed')return {kind:'unassessed',label:'Attachment inventory not assessed',help:'attachments',detail:actual.reason || 'No completed attachment inventory is recorded.'};
  if(path==='attachments'&&['none','requires-review','uncertain'].includes(actual?.status))return {kind:'rules',label:'Declared attachment metadata',help:'attachments',detail:'File declarations and associations are inventoried without AI. Payload contents and the usability of instructions are not analysed.'};
  if(path==='textVisibility')return {kind:'rules',label:'PDF rendering instructions',help:'contentStream',detail:'Recorded text-rendering modes are inspected without AI; actual visibility, clipping, color, and occlusion remain unverified.'};
  if(!finding.source?.checkId && method!=='profile-rules')return {kind:'unknown',label:'Source not established',help:'bounded',detail:'The receipt does not identify a supported execution method for this finding. No model execution is implied.'};
  return {kind:'rules',label:'Extracted PDF + rules',help:'rules',detail:'PDF parsing and rule checks provide this evidence. They do not establish the meaning or correctness of the publication.'};
}
export function screeningProvenance(report) {
  const semantic=report.semantic,selection=report.screeningSelection?.modelId;
  if(!semantic)return {kind:'unassessed',label:'AI not run',detail:selection?`Selection only: ${selection}. No completed model screening is recorded.`:'No completed model screening is recorded.'};
  if(semantic.status==='error')return {kind:'unassessed',label:'AI unavailable',detail:semantic.error || 'Optional screening failed; no completed inference result is available.'};
  if(semantic.status==='skipped')return {kind:'unassessed',label:'AI skipped',detail:semantic.reason || semantic.skipReason || 'Requested screening was not performed.'};
  if(![undefined,null,'completed'].includes(semantic.status))return {kind:'unknown',label:'AI provenance incomplete',detail:'The receipt has an unknown screening status; no completed inference is attributed.'};
  const fields=['title','subject','keywords','sections'],performed=fields.filter(field=>semantic[field]?.inferencePerformed===true),rules=fields.filter(field=>semantic[field]?.method==='deterministic-rules');
  if(semantic.inferencePerformed===true&&!completedModel(semantic))return {kind:'unknown',label:'AI provenance incomplete',detail:'The receipt records inference but does not identify a completed model configuration. Inspect the full evidence; this view cannot attribute a model.'};
  if(completedModel(semantic))return {kind:'ai',label:`Local AI ran: ${modelName(semantic.model)}`,detail:`Bounded checks with recorded inference: ${performed.join(', ') || 'see individual results'}. ${rules.length?`Rules only: ${rules.join(', ')}. `:''}Skipped or unsupported checks remain unassessed.`};
  return {kind:'unassessed',label:rules.length?'AI not run · rules only':'AI not run',detail:`Configured model: ${modelName(semantic.model)}; configuration does not mean it was loaded or used. ${rules.length?`Rules settled: ${rules.join(', ')}. `:''}Other checks may be unrequested, unsupported, or lack sufficient evidence.`};
}
