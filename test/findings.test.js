import {expect,it} from 'vitest';
import {normalizeFindings} from '../src/review/findings.js';
import {analyzePdf} from '../src/engine/analyze.js';
import {makePdf} from './fixtures.js';
const base=()=>({metadata:{infoTitle:'A title'},checks:[],pages:[],metadataConsistency:{status:'uncertain',reason:'No title evidence.',candidates:[]}});
it('keeps concrete defects, unsupported scope and unresolved checks distinct without fabricated locations',()=>{
 const r=base();r.checks=[{id:'title',label:'Title',status:'fail',summary:'Missing title'},{id:'supported-content',label:'Scope',status:'indeterminate',summary:'Forms not supported'}];
 const out=normalizeFindings(r);expect(out.counts['required-defect']).toBe(1);expect(out.counts['required-indeterminate']).toBe(0);
 expect(out.findings.find(f=>f.id==='required:supported-content').category).toBe('unassessed');
 expect(out.reviewQueue).toHaveLength(1);expect(out.reviewQueue.every(f=>f.targets.length===0)).toBe(true);
 expect(out.findings.find(f=>f.id==='identity:title').category).toBe('uncertain');
 expect(out.findings.find(f=>f.id==='semantic:unassessed').category).toBe('unassessed');
});
it('does not count keyword aggregate or duplicate settled title AI results as additional issues',()=>{
 const r=base();r.metadataConsistency.status='suspected-mismatch';r.semantic={model:{key:'minilm'},title:{method:'deterministic-rules',status:'suspected-mismatch'},keywords:{status:'suspected-mismatch'},keywordItems:[{keyword:'water',status:'semantically-related',evidence:[]},{keyword:'spacecraft',status:'suspected-mismatch',evidence:[{page:1,keys:['1:2'],text:'Water report'}]}],keywordCoverage:{skippedTerms:2}};
 const out=normalizeFindings(r);expect(out.counts['advisory-concern']).toBe(2);expect(out.findings.some(f=>f.id==='semantic:keywords')).toBe(false);
 expect(out.findings.find(f=>f.id==='semantic:keywords:unassessed').category).toBe('unassessed');
});
it('preserves finding IDs across item/ranking order changes and separates missing coverage from inferred uncertainty',()=>{
 const r=base();r.semantic={keywordItems:[{keyword:'Spacecraft',status:'suspected-mismatch',evidence:[]},{keyword:'water',status:'uncertain',evidence:[]}],keywords:{status:'uncertain'},subject:{status:'uncertain',method:'unsupported-language'}};
 const ids=normalizeFindings(r).findings.map(f=>f.id);r.semantic.keywordItems.reverse();expect(normalizeFindings(r).findings.map(f=>f.id)).toEqual(ids);
 expect(normalizeFindings(r).findings.find(f=>f.id==='semantic:subject').category).toBe('unassessed');
});
it('collects verified coverage targets and emits completed pages only after inspection',async()=>{
 const events=[];const r=await analyzePdf(await makePdf({partial:true}),{onProgress:e=>events.push(e)});
 const finding=normalizeFindings(r).findings.find(f=>f.id==='required:coverage');expect(finding.targets.length).toBeGreaterThan(0);
 expect(finding.targets[0].page).toBe(1);expect(finding.targets[0].blockIds.length).toBeGreaterThan(0);
 const pages=events.filter(e=>e.stage==='pages');expect(pages[0]).toMatchObject({completed:0,total:1,unit:'pages'});expect(pages.at(-1)).toMatchObject({completed:1,total:1,state:'completed'});
 expect(r.profile).toBe('text-actionability-0.3');
});

it('never turns missing or unknown required outcomes into a positive finding',()=>{
 const r=base();r.checks=[{id:'a',label:'Missing outcome'},{id:'b',label:'Error',status:'error'},{id:'c',label:'Unknown',status:'unexpected'},{id:'d',label:'Unassessed',status:'not-assessed'},{id:'e',label:'Pass',status:'pass'}];
 const out=normalizeFindings(r);expect(out.counts.success).toBe(1);expect(out.counts['required-indeterminate']).toBe(3);
 expect(out.findings.find(f=>f.id==='required:d').category).toBe('unassessed');
});

it('preserves XML parser uncertainty with XMP guidance and structural fallback for unknown predicates',()=>{
 const r=base();const reason='XMP contains a DTD; XML parsing was not completed.';
 r.checks=[{id:'xmp',label:'XMP parsing',status:'indeterminate',summary:reason},{id:'future-check',label:'Future required check',status:'indeterminate',summary:'Unsupported structural predicate.'}];
 const findings=normalizeFindings(r).findings;
 const xmp=findings.find(f=>f.id==='required:xmp');expect(xmp.category).toBe('required-indeterminate');expect(xmp.summary).toBe(reason);
 expect(xmp.whatToInspect).toContain('XML');expect(xmp.whatToInspect).toContain('serialization');expect(xmp.targets).toEqual([]);
 expect(xmp.whyItMatters).not.toContain('Topical');
 const unknown=findings.find(f=>f.id==='required:future-check');expect(unknown.whatToInspect).toContain('structural or metadata evidence');expect(unknown.whyItMatters).not.toContain('relatedness');
});
it('presents failed optional model initialization as unassessed, retaining the error without changing required outcomes',()=>{
 const report={accepted:true,checks:[{id:'title',status:'pass',label:'Title',summary:'Present'}],semantic:{status:'error',model:null,error:'Download denied',errorStage:'model-init',errorCode:'MODEL_INIT_FAILED',requestedChecks:['keywords'],inferencePerformed:false}};
 const normalized=normalizeFindings(report);const failure=normalized.findings.find(f=>f.id==='semantic:error');expect(failure).toMatchObject({category:'unassessed',outcome:'error',method:'model-initialization-failed',summary:'Download denied',targets:[],comparison:{model:null,errorCode:'MODEL_INIT_FAILED'}});expect(failure.whatToInspect).toMatch(/Retry explicitly/);expect(normalized.counts.success).toBe(1);expect(report.accepted).toBe(true);
});

it('keeps an incomplete attachment inventory visible and carries file guidance into captured evidence',()=>{
 const report={checks:[],pages:[],metadata:{},attachments:{status:'uncertain',inventoryComplete:false,reason:'Inventory limited',files:[{id:'f1',filename:'data.xlsx',embedded:true,description:null,relationship:null,payloads:[{mediaType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}],guidanceIssues:['Missing description or usage instructions']}],warnings:['Traversal limit reached']}};
 const normalized=normalizeFindings(report),f=normalized.findings.find(f=>f.source?.path==='attachments');
 expect(f.category).toBe('uncertain');expect(f.evidence.some(e=>e.includes('data.xlsx')&&e.includes('Missing description'))).toBe(true);expect(f.evidence).toContain('Traversal limit reached');expect(f.comparison.inventory.inventoryComplete).toBe(false);
});
it('retains unresolved embedded-stream evidence without inventing an active file or filename',()=>{
 const report={checks:[],pages:[],metadata:{},attachments:{status:'uncertain',inventoryComplete:false,reason:'Context unresolved',files:[],orphanStreams:[{origin:'unreachable-remnant',streamRef:'9 0 R',mediaType:'text/csv',encodedBytes:42,path:null}],warnings:[]}};
 const f=normalizeFindings(report).findings.find(f=>f.source?.path==='attachments');
 expect(f.category).toBe('uncertain');expect(f.evidence[0]).toContain('unreachable-remnant');expect(f.evidence[0]).toContain('9 0 R');expect(f.evidence[0]).toContain('not established as an active attachment');expect(f.comparison.inventory.files).toEqual([]);
});
it('does not turn an embedded-file key into proof that a payload stream was located',()=>{
 const report={checks:[],pages:[],metadata:{},attachments:{status:'uncertain',inventoryComplete:false,files:[{id:'f1',filename:'broken.dat',embedded:true,payloads:[],guidanceIssues:[]}],warnings:['Malformed EF declaration']}};
 const f=normalizeFindings(report).findings.find(f=>f.source?.path==='attachments');
 expect(f.evidence[0]).toContain('no payload stream located');expect(f.evidence[0]).not.toContain('located embedded payload stream(s)');
});
