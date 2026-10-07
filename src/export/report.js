import { profileReceipt, profileReasons, findingGroups } from '../review/workspace.js';
import { PRODUCT_NAME, PRESENTATION_BRAND, cssColor } from '../brand.js';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { comparisonLines, screeningReceipt } from './snapshot.js';
import { throwIfAborted } from '../evidence/geometry.js';
const FONT='./fonts/NotoSans-Regular.ttf';
const palette=PRESENTATION_BRAND.exportPalette;
const pdfColor=channels=>rgb(...channels.map(value=>value/255));
const clean=text=>String(text ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
const bounded=(text,n=700)=>{const s=clean(text);return s.length>n?`${s.slice(0,n)} [excerpt shortened; full value in JSON]`:s;};
export function wrapText(text,measure,width) {
  const lines=[];for(const paragraph of clean(text).split('\n')){let line='';for(const char of Array.from(paragraph)){if(line && measure(line+char)>width){const split=line.lastIndexOf(' ');if(split>line.length*.4){lines.push(line.slice(0,split));line=line.slice(split+1)+char;}else {lines.push(line);line=char;}}else line+=char;}lines.push(line);}return lines;
}
export async function loadReportFont(signal){const r=await fetch(new URL(FONT,document.baseURI),{signal});if(!r.ok)throw new Error('Bundled report font unavailable');return new Uint8Array(await r.arrayBuffer());}
async function rasterLine(text,{size=12,width=1020}={}) {
  const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');ctx.font=`${size*2}px "PDF Report Noto", sans-serif`;const lines=wrapText(text,s=>ctx.measureText(s).width,width);canvas.width=width;canvas.height=Math.max(1,lines.length*(size*2+10)+12);ctx.fillStyle=cssColor(palette.paper);ctx.fillRect(0,0,canvas.width,canvas.height);ctx.font=`${size*2}px "PDF Report Noto", sans-serif`;ctx.fillStyle=cssColor(palette.text);ctx.textBaseline='top';lines.forEach((l,i)=>ctx.fillText(l,0,i*(size*2+10)+4));const data=canvas.toDataURL('image/png');canvas.width=canvas.height=0;return {data,height:(lines.length*(size*2+10)+12)/2};
}
async function browserFont(bytes){const face=new FontFace('PDF Report Noto',bytes);await face.load();document.fonts.add(face);return ()=>document.fonts.delete(face);}
export async function createPdfReport(snapshot,{signal,crops=[],fontBytes,onProgress=()=>{}}={}) {
  throwIfAborted(signal);const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);const bytes=fontBytes || await loadReportFont(signal);const font=await pdf.embedFont(bytes,{subset:true});const supported=new Set(font.getCharacterSet());let rasterCount=0,page,y;const removeFont=await browserFont(bytes);
  const report=snapshot.report,width=595,height=842,margin=44,content=width-margin*2;
  const newPage=()=>{page=pdf.addPage([width,height]);y=height-48;page.drawText(`${PRODUCT_NAME} | Analysis receipt`,{x:margin,y,size:10,font,color:pdfColor(palette.interactive)});y-=28;};
  const ensure=h=>{if(y-h<52)newPage();};
  const write=async(text,{size=10.5,color=pdfColor(palette.text),gap=7}={})=>{
    throwIfAborted(signal);text=clean(text);const unsafe=Array.from(text).some(c=>!supported.has(c.codePointAt(0)));
    if(unsafe){rasterCount++;const lines=wrapText(text,s=>Array.from(s).length*size*.65,content);for(const line of lines){const image=await rasterLine(line,{size,width:content*2});ensure(image.height+gap);page.drawImage(await pdf.embedPng(image.data),{x:margin,y:y-image.height,width:content,height:image.height});y-=image.height+gap;}return;}
    const lines=wrapText(text,s=>font.widthOfTextAtSize(s,size),content);for(const line of lines){ensure(size*1.5+gap);page.drawText(line,{x:margin,y:y-size,size,font,color});y-=size*1.5;}y-=gap;
  };
  const heading=async text=>{ensure(60);await write(text,{size:15,color:pdfColor(palette.interactive),gap:10});};
  try {
    newPage();await heading('Signal-check report');await write(snapshot.source.name,{size:16});
    await write(`Assessment: ${report.analyzedAt || 'Not recorded'} | Export captured: ${snapshot.capturedAt}`);
    await write(`Original bytes: ${snapshot.source.bytes ?? 'Not recorded'} | Pages: ${report.file.pages ?? 'Not recorded'}`);
    await write(`SHA-256: ${snapshot.source.sha256 || 'Unavailable'}`,{size:9});
    await write(`App ${report.appVersion} | Schema ${report.schemaVersion} | Text profile ${report.profile}`);
    await heading(profileReceipt(report));
    for (const reason of profileReasons(report)) await write(reason);
    await write('This is a receipt about the captured input, not a repaired PDF or certificate. A profile pass does not establish overall AI readiness, correct reading order, authorship, or accurate downstream AI output.');
    await write(Object.entries(snapshot.normalized.counts).map(([k,v])=>`${k}: ${v}`).join(' | '));
    await write('Names and non-Latin text outside the bundled font are preserved as raster text using available browser fonts. Raster text is not selectable/extractable; exact Unicode values remain in JSON. If glyphs are missing in this browser, use the JSON values.');
    await heading('Publication metadata');
    for(const [k,v] of [['Info title',report.metadata.infoTitle],['XMP titles',(report.metadata.xmpTitles || []).map(t=>`${t.lang || 'unspecified'}: ${t.text}`).join('; ')],['Info authors',report.metadata.author],['XMP creators',(report.metadata.xmpAuthors || []).join('; ')],['Language',report.metadata.language]])await write(`${k}: ${bounded(v || 'Not set')}`);
    await heading('Local AI screening receipt');const semantic=report.semantic;
    await write(screeningReceipt(report));if(semantic)await write(`Requested checks: ${(semantic.requestedChecks || []).join(', ')}.`);
    if(report.sourceIdentity?.requestedConfiguration)await write(`Original batch attempt: ${report.sourceIdentity.queueItemId || 'unknown item'}; epoch ${report.sourceIdentity.attemptEpoch ?? 'unknown'}; frozen requested configuration ${JSON.stringify(report.sourceIdentity.requestedConfiguration)}. Detached preferences do not change this attempt.`);
    await write(`Selection preferences at capture (separate from completed result): ${JSON.stringify(report.screeningSelection || {})}`);
    if(semantic){if(semantic.status==='skipped')await write(`AI requested but not run: ${semantic.reason || semantic.skipReason || 'analysis incomplete'}. No model inference claimed.`);if(semantic.error)await write(`Screening error: ${semantic.error}. Traditional outcomes retained; no completed inference claimed.`);await write(`Coverage: keywords ${JSON.stringify(semantic.keywordCoverage || {})}; sections ${JSON.stringify(semantic.sectionCoverage || {})}`);await write(`Skipped checks: ${JSON.stringify(semantic.skippedChecks || [])}`);await write(`Provisional thresholds: ${JSON.stringify(semantic.thresholds || {})}`);if(semantic.inferenceProvenance?.length)await write(`Model inputs: ${semantic.inferenceProvenance.length}; ${semantic.inferenceProvenance.filter(p=>p.truncated).length} truncated. Full consumed text and per-input counts are in JSON.`);}
    await heading('Findings and inspection guidance');const findings=snapshot.normalized.findings.slice(0,80);
    for(let i=0;i<findings.length;i++){
      throwIfAborted(signal);const f=findings[i];onProgress({completed:i,total:findings.length,unit:'findings'});
      await heading(`${i+1}. ${f.title}`);await write(`${f.category} | ${f.outcome} | ${f.method}${snapshot.reviewed.includes(f.id)?' | User annotation: Reviewed (outcome unchanged)':''}`,{size:9});await write(bounded(f.summary));
      const comparisons=comparisonLines(f,report);for(const line of comparisons.slice(0,12))await write(bounded(line));if(comparisons.length>12)await write(`${comparisons.length-12} further comparison entries omitted; see JSON.`,{size:9});
      if(f.category==='success'){y-=8;continue;}
      const evidence=(f.evidence || []).slice(0,6);for(const e of evidence){const text=typeof e==='string'?e:`${e.page?`Page ${e.page}: `:''}${e.text || e.source || ''}`;if(text)await write(bounded(text));const input=e?.modelInput;if(input)await write(`Consumed ${input.consumedTokens}/${input.inputTokens} tokens${input.truncated?' (truncated)':''}; ${bounded(input.consumedText,350)}`,{size:9});}
      if((f.evidence || []).length>evidence.length)await write(`${f.evidence.length-evidence.length} further evidence entries omitted; see JSON.`,{size:9});
      const crop=crops.find(c=>c.findingId===f.id);if(crop?.blob){const image=await pdf.embedPng(await crop.blob.arrayBuffer());const imageHeight=Math.min(180,content*crop.height/crop.width),imageWidth=imageHeight*crop.width/crop.height;ensure(imageHeight+65);page.drawImage(image,{x:margin,y:y-imageHeight,width:imageWidth,height:imageHeight});y-=imageHeight+8;await write(crop.caption,{size:9});}else if(crop?.unavailable)await write(`Image unavailable: ${crop.unavailable}`,{size:9});
      await write(`Why inspect: ${f.whyItMatters}`);await write(`Next step: ${f.whatToInspect}`);y-=8;
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    if(snapshot.normalized.findings.length>80)await write(`${snapshot.normalized.findings.length-80} findings omitted from this concise report; see JSON.`);
    ensure(320);await heading('Scope and omissions');for(const l of report.limitations || [])await write(l);
    await write(`Images: ${crops.filter(c=>c.blob).length}, capped at six located findings with one region each and one megapixel per image. Other locations remain in text/JSON/full-page preview. Graphic bounds are approximate; excluded Form content and unreliable geometry receive no crop.`);
    await write('Reports contain document metadata, text excerpts, and page images. Generated on this device; share only with intended recipients. The original PDF was not changed.');
    if(rasterCount)await write(`${rasterCount} text entries used raster Unicode fallback; exact values are preserved in JSON.`,{size:9});
    const pages=pdf.getPages();pages.forEach((p,i)=>p.drawText(`Page ${i+1} / ${pages.length} | Captured ${snapshot.capturedAt.slice(0,10)}`,{x:margin,y:25,size:8,font,color:pdfColor(palette.muted)}));
    pdf.setTitle(`${PRODUCT_NAME} - analysis receipt`);pdf.setSubject('Captured PDF signal-check findings; original source unchanged');pdf.setCreator(`${PRODUCT_NAME} ${report.appVersion}`);throwIfAborted(signal);return new Blob([await pdf.save()],{type:'application/pdf'});
  } finally {removeFont();}
}
export async function createSummaryPng(snapshot,{signal,fontBytes}={}) {
  throwIfAborted(signal);const bytes=fontBytes || await loadReportFont(signal),removeFont=await browserFont(bytes);const c=document.createElement('canvas');c.width=1200;c.height=1600;const ctx=c.getContext('2d');let y=72,omittedLines=0;
  const write=(text,size=25)=>{ctx.font=`${size}px "PDF Report Noto", sans-serif`;ctx.fillStyle=cssColor(palette.text);for(const line of wrapText(bounded(text,400),t=>ctx.measureText(t).width,1056)){if(y>1370){omittedLines++;continue;}ctx.fillText(line,72,y);y+=size*1.5;}y+=12;};
  try {ctx.fillStyle=cssColor(palette.surface);ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=cssColor(palette.interactive);ctx.fillRect(0,0,c.width,12);write(PRODUCT_NAME,40);write('Dedicated summary - captured input receipt',22);write(snapshot.source.name,30);write(`Text profile ${snapshot.report.profile}: ${profileReceipt(snapshot.report)}`,26);write('A profile pass is not an overall AI-readiness verdict.',22);write(`Assessed: ${snapshot.report.analyzedAt} | Captured: ${snapshot.capturedAt}`,18);write(`Original bytes: ${snapshot.source.bytes} | SHA-256: ${snapshot.source.sha256 || 'Unavailable'}`,18);write(Object.entries(snapshot.normalized.counts).map(([k,v])=>`${k}: ${v}`).join(' | '),20);const sem=snapshot.report.semantic;write(screeningReceipt(snapshot.report),20);write('First findings to inspect',28);const groups=findingGroups(snapshot.normalized.findings);const queue=[...groups.problems,...groups.uncertainty,...groups.limits];const findings=queue.slice(0,4);if(!findings.length)write('No concrete problems found in completed checks. Inspect uncertain and unassessed scope.',22);findings.forEach(f=>{write(`${f.title} - ${f.outcome}`,23);write(f.summary,19);});write('Summary only. Full comparisons, evidence, limitations, and exact Unicode values are in the PDF/JSON report. Browser-rendered text in this PNG is not extractable PDF text.',18);ctx.fillStyle=cssColor(palette.surface);ctx.fillRect(0,1440,1200,160);ctx.fillStyle=cssColor(palette.text);ctx.font='18px "PDF Report Noto", sans-serif';ctx.fillText(`${Math.max(0,queue.length-4)} additional review items not shown; ${omittedLines} layout lines omitted. Full scope is in PDF/JSON.`,72,1470);ctx.fillText('Original PDF unchanged. Share only with intended recipients.',72,1510);ctx.fillText('Dedicated raster summary; exact Unicode and complete evidence remain in JSON.',72,1550);throwIfAborted(signal);return await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Could not encode summary')),'image/png'));}finally{removeFont();c.width=c.height=0;}
}
