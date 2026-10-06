import {it,expect} from 'vitest';
import {findingProvenance,screeningProvenance} from '../src/review/provenance.js';
const finding=(path,method)=>({source:{path},method,summary:'Recorded scope'});
it('requires execution on the individual check; another AI check cannot relabel rules, skips or unknowns',()=>{
 const report={semantic:{inferencePerformed:true,model:{label:'Recorded model'},title:{method:'deterministic-rules',inferencePerformed:false},subject:{method:'embedding-screening',inferencePerformed:true},keywords:{method:'unsupported-language',inferencePerformed:false}}};
 expect(findingProvenance(finding('semantic.title','deterministic-rules'),report).kind).toBe('rules');
 expect(findingProvenance(finding('semantic.subject','embedding-screening'),report).kind).toBe('ai');
 expect(findingProvenance(finding('semantic.keywords','unsupported-language'),report).kind).toBe('unassessed');
 expect(findingProvenance(finding('semantic.sections','embedding-screening'),report).kind).toBe('unassessed');
 expect(findingProvenance(finding('unknown','new-method'),report).kind).toBe('unknown');
});
it('resolves per-item inference separately from bounded omissions and aggregate execution',()=>{
 const report={semantic:{model:{id:'recorded-model'},inferencePerformed:true,keywordItems:[{method:'embedding-screening',inferencePerformed:true},{method:'embedding-screening',inferencePerformed:false}],keywordCoverage:{skippedTerms:2}}};
 expect(findingProvenance(finding('semantic.keywordItems[0]','embedding-screening'),report).kind).toBe('ai');
 expect(findingProvenance(finding('semantic.keywordItems[1]','embedding-screening'),report).kind).toBe('unassessed');
 expect(findingProvenance(finding('semantic.keywordCoverage','bounded-scope'),report).kind).toBe('unassessed');
});
it('keeps source-rule heuristics and rendering instructions distinct from AI',()=>{
 expect(findingProvenance(finding('authorConsistency','explicit-byline-rules'),{}).kind).toBe('heuristic');
 expect(findingProvenance(finding('readingOrder','numbered-and-spatial-order-heuristics'),{}).kind).toBe('heuristic');
 expect(findingProvenance(finding('textVisibility','text-rendering-mode-inspection'),{}).kind).toBe('rules');
 expect(findingProvenance({...finding('checks.title','profile-rules'),source:{checkId:'title'}},{}).kind).toBe('rules');
});
it('selection or a configured model does not establish loading/inference; errors and skips remain unavailable',()=>{
 expect(screeningProvenance({screeningSelection:{modelId:'minilm'}}).label).toBe('AI not run');
 expect(screeningProvenance({semantic:{model:{label:'Configured'},inferencePerformed:false,title:{method:'deterministic-rules',inferencePerformed:false}}}).label).toBe('AI not run · rules only');
 expect(screeningProvenance({semantic:{status:'error',inferencePerformed:false,error:'Failed'}}).label).toBe('AI unavailable');
 expect(screeningProvenance({semantic:{status:'skipped',inferencePerformed:false,skipReason:'analysis-incomplete'}}).label).toBe('AI skipped');
 const result=screeningProvenance({semantic:{model:{label:'Actual'},inferencePerformed:true,title:{method:'deterministic-rules',inferencePerformed:false},subject:{inferencePerformed:true}}});
 expect(result.label).toContain('Actual');expect(result.detail).toContain('subject');expect(result.detail).toContain('Rules only: title');
});

it('refuses model attribution when execution flags lack model identity or a successful envelope',()=>{
 const f=finding('semantic.subject','embedding-screening'),subject={method:'embedding-screening',inferencePerformed:true};
 expect(findingProvenance(f,{semantic:{inferencePerformed:true,subject}}).kind).toBe('unassessed');
 expect(findingProvenance(f,{semantic:{status:'error',model:{id:'x'},inferencePerformed:true,subject}}).kind).toBe('unassessed');
 expect(findingProvenance(f,{semantic:{status:'mystery',model:{id:'x'},inferencePerformed:true,subject}}).kind).toBe('unassessed');
 expect(findingProvenance(f,{semantic:{model:{id:'x'},inferencePerformed:true,subject:{...subject,method:'unknown'}}}).kind).toBe('unassessed');
 expect(screeningProvenance({semantic:{status:'mystery',model:{id:'x'},inferencePerformed:true,subject}}).kind).toBe('unknown');
 expect(screeningProvenance({semantic:{inferencePerformed:true,subject}}).label).toBe('AI provenance incomplete');
});
it('attachment declarations remain rule-based metadata evidence when optional AI ran elsewhere',()=>{
 const p=findingProvenance(finding('attachments','attachment-metadata-inspection'),{attachments:{status:'requires-review'},semantic:{model:{id:'actual'},inferencePerformed:true}});
 expect(p.kind).toBe('rules');expect(p.label).toBe('Declared attachment metadata');expect(p.detail).toContain('not analysed');
});

it('does not imply an attachment inspection when inventory was not assessed',()=>{expect(findingProvenance(finding('attachments','attachment-metadata-inspection'),{attachments:{status:'not-assessed',reason:'Parser failed'}}).kind).toBe('unassessed');});
