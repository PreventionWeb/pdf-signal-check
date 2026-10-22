import { imageVerdict, descriptionsInEnglish } from '../engine/image-model.js';
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
  if(path.startsWith('consistency.')) {
    if(finding.method==='image-screening'&&report.imageScreening?.inferencePerformed===true&&finding.comparison?.consistency?.kind==='same-image')return {kind:'ai',label:'Local image model',help:'ai',detail:`${report.imageScreening.model?.label || 'The image model'} found these two pictures almost identical, and their saved descriptions share few words. It compares how pictures look, not what they mean, and can be wrong.`};
    if(finding.method==='image-screening'&&report.imageScreening?.inferencePerformed===true)return {kind:'ai',label:'Rules + local image model',help:'ai',detail:`The rules couldn’t tell whether this graphic carries information; ${report.imageScreening.model?.label || 'the image model'} sorted a crop of it into a broad type. It cannot read text in images and can be wrong.`};
    if(finding.method==='embedding-screening'&&completedModel(report.semantic)&&finding.comparison?.ai?.inferencePerformed===true){
      const kind=finding.comparison?.consistency?.kind,model=modelName(report.semantic?.model);
      const coverage=report.semantic?.factCoverage,compared=coverage?.candidates?` It compared ${coverage.compared} of the ${coverage.candidates} sentences in this PDF that state a figure${coverage.compared<coverage.candidates?', spread across the document':''}.`:'';
      const detail=kind==='same-fact'?`${model} found two sentences that say the same thing; rules found they give different numbers.${compared} The model compares meaning and can pair sentences about different things.`
        :/^contents-/.test(kind||'')?`Rules could not find this contents entry as a heading on its page; ${model} compared it with the headings there.`
        :`Rules found the two titles worded differently; ${model} compared their meaning. This is not identity verification.`;
      return {kind:'ai',label:'Rules + local AI relatedness',help:'ai',detail};
    }
    return {kind:'rules',label:'Extracted PDF + consistency rules',help:'rules',detail:'Values the PDF states in different places are compared with rules: titles, dates, draft labels, language and decorative graphics beside captions. Rules can miss differences or flag intended ones.'};
  }
  if(['machineMetadata','links','outline','crossReferences','figureData','detachedValues'].includes(path))return {kind:'rules',label:'Saved properties and PDF structure, read by rules',help:'rules',detail:'The tool reads the PDF’s saved properties, links, bookmarks and tags without AI. It checks that details are present, not that they are correct.'};
  if(['authorConsistency','readingOrder'].includes(path))return {kind:'heuristic',label:'Rule-based heuristic',help:'heuristic',detail:path==='authorConsistency'?'Recovered metadata is compared with a heuristic first-page byline candidate; authorship is not authenticated.':'A bounded numbered/spatial order clue; intended reading order still requires visual inspection.'};
  if(path==='metadataConsistency')return {kind:'rules',label:'Extracted PDF + title rules',help:'rules',detail:'Title strings are compared with recovered publication candidates. Candidate selection and normalization can miss issues.'};
  if(path==='attachments'&&actual?.status==='not-assessed')return {kind:'unassessed',label:'Attachment inventory not assessed',help:'attachments',detail:actual.reason || 'No completed attachment inventory is recorded.'};
  if(path==='attachments'&&['none','requires-review','uncertain'].includes(actual?.status))return {kind:'rules',label:'Declared attachment metadata',help:'attachments',detail:'File declarations and associations are inventoried without AI. Payload contents and the usability of instructions are not analysed.'};
  if(path.startsWith('figureAlternatives.items')) return {kind:'rules',label:'Figure tags and alternate text',help:'tags',detail:'Recovered Figure tags and non-empty Alt entries are inspected without AI. Image pixels, description accuracy and semantic meaning are not analysed.'};
  if(path==='hiddenInstructions')return {kind:'rules',label:'Hidden-text pattern screening',help:'contentStream',detail:'Text drawn invisibly, under 1 pt, in white or off the page, plus document properties and image descriptions, is matched against instruction-like patterns without AI. Visible page text is not scanned. Reworded or encoded instructions can be missed, and a match does not prove intent.'};
  if(path==='textVisibility')return {kind:'rules',label:'PDF rendering instructions',help:'contentStream',detail:'Recorded text-rendering modes are inspected without AI; actual visibility, clipping, color, and occlusion remain unverified.'};
  if(!finding.source?.checkId && method!=='profile-rules')return {kind:'unknown',label:'Source not established',help:'bounded',detail:'The receipt does not identify a supported execution method for this finding. No model execution is implied.'};
  return {kind:'rules',label:'Extracted PDF + rules',help:'rules',detail:'PDF parsing and rule checks provide this evidence. They do not establish the meaning or correctness of the publication.'};
}
function executionProvenance(report) {
  const semantic=report.semantic,selection=report.screeningSelection?.modelId;
  if(!semantic)return {kind:'unassessed',label:'AI not run',detail:selection?`Selection only: ${selection}. No completed model screening is recorded.`:'No completed model screening is recorded.'};
  if(semantic.status==='error')return {kind:'unassessed',label:'AI unavailable',detail:semantic.error || 'Optional screening failed; no completed inference result is available.'};
  if(semantic.status==='skipped')return {kind:'unassessed',label:'AI skipped',detail:semantic.reason || semantic.skipReason || 'Requested screening was not performed.'};
  if(![undefined,null,'completed'].includes(semantic.status))return {kind:'unknown',label:'AI provenance incomplete',detail:'The receipt has an unknown screening status; no completed inference is attributed.'};
  const fields=['title','titleAI','subject','keywords','sections'],performed=fields.filter(field=>semantic[field]?.inferencePerformed===true),rules=fields.filter(field=>semantic[field]?.method==='deterministic-rules');
  if(semantic.inferencePerformed===true&&!completedModel(semantic))return {kind:'unknown',label:'AI provenance incomplete',detail:'The receipt records inference but does not identify a completed model configuration. Inspect the full evidence; this view cannot attribute a model.'};
  if(completedModel(semantic))return {kind:'ai',label:`Local AI ran: ${modelName(semantic.model)}`,detail:`Bounded checks with recorded inference: ${performed.map(field=>field==='titleAI'?'AI title relatedness':field).join(', ') || 'see individual results'}. ${rules.length?`Rules only: ${rules.join(', ')}. `:''}Skipped or unsupported checks remain unassessed.`};
  return {kind:'unassessed',label:rules.length?'AI not run · rules only':'AI not run',detail:`Configured model: ${modelName(semantic.model)}; configuration does not mean it was loaded or used. ${rules.length?`Rules settled: ${rules.join(', ')}. `:''}Other checks may be unrequested, unsupported, or lack sufficient evidence.`};
}
export function screeningLanguageNote(report) {
  return report.semantic?.languageContext?.source === 'user-assumption'
    ? 'Screening language: English (explicit user assumption). The PDF language declaration remains missing.'
    : null;
}
export function screeningProvenance(report) {
  const execution = executionProvenance(report), languageNote = screeningLanguageNote(report);
  return languageNote ? { ...execution, detail: `${execution.detail} ${languageNote}` } : execution;
}

/** Share a model label only when every grouped member records that same completed execution. */
export function groupedFindingProvenance(findings, report) {
  const members = findings.map(finding => ({ finding, method: findingProvenance(finding, report) }));
  const model = report.semantic?.model;
  const sharedModel = model?.id && members.length && members.every(({ finding, method }) => method.kind === 'ai'
    && finding.comparison?.model?.id === model.id && finding.comparison?.model?.revision === model.revision) ? model : null;
  return { members, sharedModel };
}

/** One plain receipt line: which kinds of check produced these results. */
/** Why the image model had nothing to look at, in one plain clause. */
/** Said whenever the image model ran or was asked to: descriptions in other languages are not compared with pictures. */
export function descriptionLanguageNote(report) {
  if (!report.imageScreening || descriptionsInEnglish(report)) return '';
  const described = (report.figureAlternatives?.items || []).filter(figure => figure.tagged && figure.alt?.trim()).length;
  return described ? 'Photo descriptions were not compared with their pictures: the image model only reads English descriptions.' : '';
}
export function imageSkipNote(report) {
  const skipped = report.imageScreening?.skipped;
  if (!skipped) return descriptionLanguageNote(report);
  return `The image model had nothing to look at in this PDF: ${skipped.decorativeUnclear ? 'the decorative graphics it could judge were too text-heavy or too small' : 'no decorative graphics the rules couldn’t place'}, and ${skipped.describedImages ? `${skipped.describedImages} described image${skipped.describedImages === 1 ? '' : 's'} (it needs at least 5 well-cropped photo descriptions to compare)` : 'no photo descriptions to compare'}.${descriptionLanguageNote(report) ? ` ${descriptionLanguageNote(report)}` : ''}`;
}
export function checkedWith(report) {
  const note = imageSkipNote(report);
  const noJudgment = report.imageScreening?.inferencePerformed && report.imageScreening.judgmentsPerformed === false
    ? 'The image model ran, but produced no usable image judgments.' : '';
  return [checkedWithModels(report), note, noJudgment].filter(Boolean).join(' ');
}
function checkedWithModels(report) {
  const semantic = report.semantic;
  if (!semantic) return report.imageScreening?.inferencePerformed ? 'Checked with standard checks and an on-device image model.' : 'Checked with standard checks.';
  const model = semantic.model?.label ? ` (${semantic.model.label.split(' · ')[0]})` : '';
  if (semantic.status === 'error' || semantic.status === 'skipped') return 'Checked with standard checks. The AI checks did not run.';
  if (semantic.inferencePerformed !== true) return `Checked with standard checks. AI${model} was selected but had nothing to compare in this PDF.`;
  return `Checked with standard checks and on-device AI${model}${report.imageScreening?.inferencePerformed ? ' and an image model' : ''}.`;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
/**
 * How the on-device AI took part in an issue, in plain words, for the note under its headline.
 * `decided`: the AI's comparison put the issue here (rules alone wouldn't have). Otherwise the AI helped (ordered a list,
 * looked at a graphic and couldn't tell) or wasn't used, in which case there is no note.
 */
export function aiInvolvement(finding, report) {
  if (!finding) return null;
  const members = finding.members || [finding];
  const decided = members.find(member => findingProvenance(member, report).kind === 'ai' && member.category === 'advisory-concern');
  if (decided) {
    const detail = findingProvenance(decided, report).detail;
    return { decided: true, text: /wrong/.test(detail) ? `${detail} Check it yourself.` : `${detail} AI can be wrong, so check it yourself.` };
  }
  const lines = [];
  const images = report.imageScreening?.inferencePerformed === true ? report.imageScreening : null;
  const descriptions = members.map(member => member.comparison?.description).filter(Boolean);
  const pictured = descriptions.filter(item => item.image);
  if (pictured.length) {
    const flagged = pictured.filter(item => item.image.mismatch).length;
    lines.push(`The on-device image model compared ${plural(pictured.length, 'description')} with ${pictured.length === 1 ? 'its picture' : 'their pictures'}${flagged ? ` and listed ${flagged === 1 ? 'the one' : `the ${flagged}`} that matched least well first` : ' and found nothing to flag'}.`);
  }
  const captioned = descriptions.filter(item => item.ai?.inferencePerformed === true || item.ai?.status);
  if (captioned.length) lines.push(`The on-device AI compared ${plural(captioned.length, 'description')} with ${captioned.length === 1 ? 'its caption' : 'their captions'}.`);
  const pages = new Set(members.map(member => member.comparison?.figure).filter(figure => figure && !figure.tagged).map(figure => figure.page));
  // Only graphics it couldn't settle: ones it called content or decoration have their own outcome elsewhere.
  const looked = images && pages.size ? (images.items || []).filter(item => pages.has(item.page) && imageVerdict(item, report.decorative?.items?.[item.index]) === 'unclear') : [];
  if (looked.length) lines.push(`The on-device image model also looked at ${plural(looked.length, 'graphic')} here and couldn’t tell whether ${looked.length === 1 ? 'it carries' : 'they carry'} information, so ${looked.length === 1 ? 'it stays' : 'they stay'} for you to decide.`);
  return lines.length ? { decided: false, text: `${lines.join(' ')} AI can be wrong.` } : null;
}
