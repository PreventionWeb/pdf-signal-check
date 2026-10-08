import {it, expect, vi} from 'vitest';
import {readFile} from 'node:fs/promises';
import {PDFDocument, PDFHexString, PDFName, PDFRef} from 'pdf-lib';
import {inspectAttachments} from '../src/engine/attachments.js';
import {analyzePdf, PROFILE} from '../src/engine/analyze.js';

async function fixture({relationship='Data', description='Synthetic observations backing the report.', name='observations.xlsx', type=true}={}) {
  const doc = await PDFDocument.create(); doc.addPage();
  const stream = doc.context.stream(new Uint8Array([80,75,3,4]), {Type:'EmbeddedFile', Subtype:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', Params:{Size:9999}});
  const streamRef = doc.context.register(stream);
  const dict = doc.context.obj({...(type?{Type:'Filespec'}:{}), F:PDFHexString.fromText(name), UF:PDFHexString.fromText(name), EF:{F:streamRef}, ...(relationship?{AFRelationship:relationship}:{}), ...(description?{Desc:PDFHexString.fromText(description)}:{})});
  const ref = doc.context.register(dict);
  return {doc,dict,ref,stream};
}

it('deduplicates file specifications but retains names and catalog/page association contexts', async()=>{
  const {doc,ref,stream} = await fixture();
  doc.catalog.set(PDFName.of('Names'),doc.context.obj({EmbeddedFiles:{Names:[PDFHexString.fromText('table alias'),ref]}}));
  doc.catalog.set(PDFName.of('AF'),doc.context.obj([ref]));
  doc.getPages()[0].node.set(PDFName.of('AF'),doc.context.obj([ref]));
  const contents = vi.spyOn(stream,'getContents').mockImplementation(()=>{throw new Error('Do not read payload');});
  const inventory = inspectAttachments(doc);
  expect(inventory.inventoryComplete).toBe(true); expect(inventory.files).toHaveLength(1);
  const file = inventory.files[0];
  expect(file.aliases).toEqual(['table alias']); expect(file.relationship).toBe('Data');
  expect(file.associations.some(a=>a.kind==='associated-file'&&a.page===1)).toBe(true);
  expect(file.payloads[0]).toMatchObject({encodedBytes:4, declaredDecodedBytes:9999});
  expect(contents).not.toHaveBeenCalled();
  expect(JSON.stringify(inventory)).not.toContain('"contents":');
});

it('finds unlisted FileAttachment annotations and structure AF associations',async()=>{
  const {doc,ref}=await fixture();
  const page=doc.getPages()[0];
  page.node.set(PDFName.of('Annots'),doc.context.obj([doc.context.register(doc.context.obj({Type:'Annot',Subtype:'FileAttachment',FS:ref,Rect:[0,0,20,20]}))]));
  doc.catalog.set(PDFName.of('StructTreeRoot'),doc.context.obj({Type:'StructTreeRoot',K:[{Type:'StructElem',S:'P',Pg:page.ref,AF:[ref]}]}));
  const inventory=inspectAttachments(doc);
  expect(inventory.files).toHaveLength(1);
  expect(inventory.files[0].associations.some(a=>a.kind==='file-attachment-annotation'&&a.page===1)).toBe(true);
  expect(inventory.files[0].associations.some(a=>a.path.includes('StructTreeRoot')&&a.page===1)).toBe(true);
});

it('preserves duplicate filenames as distinct files and flags missing guidance without inventing type',async()=>{
  const {doc,ref}=await fixture({relationship:null,description:null,type:false});
  const second=doc.context.register(doc.context.obj({Type:'Filespec',F:PDFHexString.fromText('observations.xlsx'),EF:{F:doc.context.register(doc.context.stream(new Uint8Array([1]),{Type:'EmbeddedFile'}))}}));
  doc.catalog.set(PDFName.of('AF'),doc.context.obj([ref,second]));
  const inventory=inspectAttachments(doc);
  expect(inventory.files).toHaveLength(2); expect(inventory.files.map(f=>f.filename)).toEqual(['observations.xlsx','observations.xlsx']);
  expect(inventory.files[0].guidanceIssues.join(' ')).toMatch(/Type.*description.*AFRelationship/);
  expect(inventory.files[1].payloads[0].mediaType).toBeNull();
});

it('treats external AF references and extension relationship names as declarations without fetching',async()=>{
  const doc=await PDFDocument.create(); doc.addPage();
  doc.catalog.set(PDFName.of('AF'),doc.context.obj([{Type:'Filespec',F:PDFHexString.fromText('https://example.invalid/data'),AFRelationship:'C2PA_Manifest'}]));
  const inventory=inspectAttachments(doc);
  expect(inventory.inventoryComplete).toBe(true); expect(inventory.files[0].embedded).toBe(false);
  expect(inventory.files[0].relationship).toBe('C2PA_Manifest'); expect(inventory.files[0].relationshipRecognized).toBe(false);
  expect(inventory.files[0].payloads).toEqual([]);
});

it('fails closed on name-tree cycles, malformed pairs, dead refs, malformed AF and traversal caps',async()=>{
  for(const mutate of [
    doc=>{const tree=doc.context.obj({Kids:[]}),ref=doc.context.register(tree);tree.set(PDFName.of('Kids'),doc.context.obj([ref]));doc.catalog.set(PDFName.of('Names'),doc.context.obj({EmbeddedFiles:ref}));},
    doc=>doc.catalog.set(PDFName.of('Names'),doc.context.obj({EmbeddedFiles:{Names:[PDFHexString.fromText('unpaired')]}})),
    doc=>doc.catalog.set(PDFName.of('AF'),doc.context.obj([PDFRef.of(9999,0)])),
    doc=>doc.catalog.set(PDFName.of('AF'),doc.context.obj({invalid:true})),
  ]) {
    const doc=await PDFDocument.create(); doc.addPage();mutate(doc);
    expect(inspectAttachments(doc)).toMatchObject({inventoryComplete:false,status:'uncertain'});
  }
  const {doc,ref}=await fixture();doc.catalog.set(PDFName.of('AF'),doc.context.obj([ref]));
  expect(inspectAttachments(doc,{maxFiles:0})).toMatchObject({inventoryComplete:false,status:'uncertain'});
  expect(inspectAttachments(doc,{maxObjects:1})).toMatchObject({inventoryComplete:false,status:'uncertain'});
});

it('separately labels unreachable leftover streams and preserves ordinary text-profile acceptance',async()=>{
  const {doc}=await fixture();
  expect(inspectAttachments(doc)).toMatchObject({inventoryComplete:false,files:[],status:'uncertain',orphanStreams:[{origin:'unreachable-remnant',encodedBytes:4}]});
  const report=await analyzePdf(new Uint8Array(await readFile(new URL('../public/calibration/01-clean-text.pdf',import.meta.url))));
  expect(report.accepted).toBe(true);expect(report.profile).toBe(PROFILE);
  expect(report.attachments).toMatchObject({inventoryComplete:true,files:[],payloadsAnalyzed:false});
});

it('accounts for RF-only related embedded files and unmatched reachable streams without payload reads',async()=>{
  const {doc,stream,dict,ref}=await fixture();
  dict.delete(PDFName.of('EF'));
  dict.set(PDFName.of('RF'),doc.context.obj({F:[PDFHexString.fromText('related.xlsx'),doc.context.register(stream)]}));
  doc.catalog.set(PDFName.of('Reference'),ref);
  const inventory=inspectAttachments(doc);
  expect(inventory.files).toHaveLength(1);expect(inventory.files[0].embedded).toBe(true);
  expect(inventory.files[0].payloads[0]).toMatchObject({key:'RF/F[1]',relatedFilename:'related.xlsx',encodedBytes:4});
  const stray=doc.context.stream(new Uint8Array([2,3]),{Type:'EmbeddedFile'});
  doc.catalog.set(PDFName.of('UnknownPayload'),doc.context.register(stray));
  expect(inspectAttachments(doc)).toMatchObject({inventoryComplete:false,orphanStreams:[{origin:'reachable-unassociated',encodedBytes:2}]});
});

it('makes reachable embedded payloads unsupported rather than a hard PDF defect',async()=>{
  const doc=await PDFDocument.load(await readFile(new URL('../public/calibration/01-clean-text.pdf',import.meta.url)));
  await doc.attach(new Uint8Array([80,75,3,4]),'data.xlsx',{mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',description:'Synthetic data'});
  const report=await analyzePdf(await doc.save());
  expect(report.analysisComplete).toBe(true);expect(report.accepted).toBe(false);
  expect(report.checks.find(c=>c.id==='supported-content').status).toBe('indeterminate');
  expect(report.verdictReason).toBe('Compliance could not be established.');
  expect(report.attachments.files).toHaveLength(1);
});

it('keeps an explicit unassessed inventory when document parsing cannot start',async()=>{
  const report=await analyzePdf(new Uint8Array([1,2,3]));
  expect(report.attachments).toMatchObject({status:'not-assessed',inventoryComplete:false,files:[],payloadsAnalyzed:false});
});

it('bounds arbitrary declared PDF names, filenames, warnings and association paths',async()=>{
  const {doc,dict,ref,stream}=await fixture({name:'x'.repeat(50000)});
  dict.set(PDFName.of('AFRelationship'),PDFName.of('R'.repeat(50000)));
  stream.dict.set(PDFName.of('Subtype'),PDFName.of('M'.repeat(50000)));
  doc.catalog.set(PDFName.of('Q'.repeat(50000)),doc.context.obj({AF:[ref]}));
  const inventory=inspectAttachments(doc);
  expect(inventory.inventoryComplete).toBe(false);
  expect(inventory.files[0].filename.length).toBeLessThanOrEqual(1024);
  expect(inventory.files[0].relationship.length).toBeLessThanOrEqual(1024);
  expect(inventory.files[0].payloads[0].mediaType.length).toBeLessThanOrEqual(1024);
  expect(inventory.files[0].associations.every(association=>association.path.length<=512)).toBe(true);
  expect(inventory.warnings.every(warning=>warning.length<=1024)).toBe(true);
  expect(JSON.stringify(inventory).length).toBeLessThan(15000);
});

it('reopens both authored OOXML examples with declarations separated from payload verification',async()=>{
  for(const [id,guided] of [['19-embedded-files-guided',true],['20-embedded-files-no-guidance',false]]) {
    const report=await analyzePdf(new Uint8Array(await readFile(new URL(`../public/calibration/${id}.pdf`,import.meta.url))));
    expect(report.analysisComplete).toBe(true);expect(report.accepted).toBe(false);
    expect(report.attachments.inventoryComplete).toBe(true);expect(report.attachments.payloadsAnalyzed).toBe(false);
    expect(report.attachments.files.map(file=>file.filename)).toEqual(['observations.xlsx','source-notes.docx']);
    expect(report.attachments.files.map(file=>file.relationship)).toEqual(guided?['Data','Source']:[null,null]);
    expect(report.attachments.files.every(file=>Boolean(file.description)===guided)).toBe(true);
    expect(report.attachments.files.every(file=>Boolean(file.payloads[0].mediaType)===guided)).toBe(true);
    expect(report.attachments.files.every(file=>file.guidanceIssues.length===(guided?0:3))).toBe(true);
    expect(report.checks.find(check=>check.id==='supported-content').status).toBe('indeterminate');
  }
});
