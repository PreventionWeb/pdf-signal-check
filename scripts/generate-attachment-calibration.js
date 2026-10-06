// Original benign OOXML fixtures; no macros. Does not regenerate the original eighteen PDFs.
import {readFile,writeFile} from 'node:fs/promises';
import {deflateRawSync} from 'node:zlib';
import {PDFDocument,AFRelationship} from 'pdf-lib';
const directory = new URL('../public/calibration/',import.meta.url);
const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
function crc32(bytes) {
  let crc=0xffffffff;
  for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
function zip(parts) {
  const local=[],central=[];let offset=0;
  for(const [path,content] of Object.entries(parts)) {
    const name=Buffer.from(path),body=Buffer.from(content),compressed=deflateRawSync(body),crc=crc32(body);
    const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(8,8);header.writeUInt16LE(23585,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(body.length,22);header.writeUInt16LE(name.length,26);
    local.push(header,name,compressed);
    const entry=Buffer.alloc(46);entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(8,10);entry.writeUInt16LE(23585,14);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(compressed.length,20);entry.writeUInt32LE(body.length,24);entry.writeUInt16LE(name.length,28);entry.writeUInt32LE(offset,42);
    central.push(entry,name);offset+=header.length+name.length+compressed.length;
  }
  const centralBytes=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(Object.keys(parts).length,8);end.writeUInt16LE(Object.keys(parts).length,10);end.writeUInt32LE(centralBytes.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,centralBytes,end]);
}
const types = body => `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${body}</Types>`;
const rels = body => `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${body}</Relationships>`;
const relation = (type,target) => `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
const spreadsheet = zip({
  '[Content_Types].xml':types('<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'),
  '_rels/.rels':rels(relation('officeDocument','xl/workbook.xml')),
  'xl/workbook.xml':`${xml}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Observations" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  'xl/_rels/workbook.xml.rels':rels(relation('worksheet','worksheets/sheet1.xml')),
  'xl/worksheets/sheet1.xml':`${xml}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Station</t></is></c><c r="B1" t="inlineStr"><is><t>Visibility_metres</t></is></c></row>${[['North','2.8'],['Central','3.1'],['South','3.4']].map(([name,value],i)=>`<row r="${i+2}"><c r="A${i+2}" t="inlineStr"><is><t>${name}</t></is></c><c r="B${i+2}"><v>${value}</v></c></row>`).join('')}</sheetData></worksheet>`,
});
const document = zip({
  '[Content_Types].xml':types('<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'),
  '_rels/.rels':rels(relation('officeDocument','word/document.xml')),
  'word/document.xml':`${xml}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${['Harbor Observatory source notes','Original fictional notes supporting the annual report 2025.','North: 2.8 metres. Central: 3.1 metres. South: 3.4 metres.','All observations are invented for calibration; this is not scientific or safety advice.'].map(text=>`<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`,
});
const attachments = [
  {filename:'observations.xlsx',bytes:spreadsheet,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',relationship:AFRelationship.Data,description:'Synthetic data behind the Station comparison on page 2. Sheet Observations has Station and Visibility_metres columns; rows identify North, Central and South. Values are fictional, not safety guidance.'},
  {filename:'source-notes.docx',bytes:document,mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',relationship:AFRelationship.Source,description:'Original fictional source notes used for the annual report. Read the paragraphs as background for the station observations; this file is not an alternative rendering of the PDF.'},
];
const manifestPath=new URL('manifest.json',directory),manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const baseBytes=await readFile(new URL('01-clean-text.pdf',directory));
for(const [id,guided] of [['19-embedded-files-guided',true],['20-embedded-files-no-guidance',false]]) {
  const pdf=await PDFDocument.load(baseBytes,{updateMetadata:false});
  for(const file of attachments) await pdf.attach(file.bytes,file.filename,guided?{mimeType:file.mimeType,description:file.description,afRelationship:file.relationship}:{});
  const bytes=await pdf.save({useObjectStreams:false,updateFieldAppearances:false});
  await writeFile(new URL(`${id}.pdf`,directory),bytes);
  const entry={id,file:`${id}.pdf`,title:guided?'Embedded spreadsheet and source document with guidance':'Embedded spreadsheet and Word document without guidance',
    description:`Original clean tagged report with two benign valid OOXML attachments. ${guided?'Descriptions, MIME declarations and Data/Source relationships provide machine context.':'Filenames remain, but MIME, descriptions and AFRelationship are deliberately omitted.'}`,
    language:'en-GB',visibleTitle:'Harbor Observatory Annual Report 2025',expectedProperties:{pageCount:2,extractableText:true,structure:'complete',titleRelationship:'match',embeddedFileCount:2},
    groundTruth:{attachments:attachments.map(file=>({filename:file.filename,actualFormat:file.filename.endsWith('.xlsx')?'xlsx':'docx',declaredMimeType:guided?file.mimeType:null,relationship:guided?file.relationship:null,descriptionPresent:guided,containsMacros:false})),currentChecks:{attachmentContents:'Not decoded or validated by the application; guidance declarations are not proof of safety or correct payload meaning.'}},
    defects:guided?[]:['attachment MIME, descriptions and AFRelationship omitted'],supportedScope:'Embedded payloads are outside text-actionability-0.3; overall acceptance is not established even when declared guidance is present.',bytes:bytes.length};
  manifest.samples=manifest.samples.filter(sample=>sample.id!==id);manifest.samples.push(entry);
}
manifest.samples.sort((a,b)=>a.id.localeCompare(b.id));
await writeFile(manifestPath,`${JSON.stringify(manifest,null,2)}\n`);
console.log('Generated two original attachment calibration PDFs; preserved the eighteen earlier files and manifest entries.');
