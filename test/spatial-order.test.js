import {it,expect} from 'vitest';
import {PDFDocument,PDFName,PDFHexString,PDFOperator,StandardFonts} from 'pdf-lib';
import {analyzePdf} from '../src/engine/analyze.js';

// Real MCID/ParentTree fixtures: visual streams stay fixed while tag order changes.
async function spatialPdf(kind){
 const pdf=await PDFDocument.create(),c=pdf.context,p=pdf.addPage([595,842]),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 pdf.setTitle('Spatial heading review');pdf.catalog.set(PDFName.of('Lang'),PDFHexString.fromText('en'));
 const root=c.obj({Type:'StructTreeRoot',K:[]}),rootRef=c.register(root),doc=c.obj({Type:'StructElem',S:'Document',P:rootRef,K:[]}),docRef=c.register(doc);root.set(PDFName.of('K'),c.obj([docRef]));pdf.catalog.set(PDFName.of('StructTreeRoot'),rootRef);pdf.catalog.set(PDFName.of('MarkInfo'),c.obj({Marked:true}));p.node.set(PDFName.of('StructParents'),c.obj(0));
 const refs=[],groups=[];let mcid=0;
 const draw=(role,text,x,y,size)=>{const id=mcid++,ref=c.register(c.obj({Type:'StructElem',S:role,P:docRef,Pg:p.ref,K:id}));refs.push(ref);p.pushOperators(PDFOperator.of('BDC',[PDFName.of(role),c.obj({MCID:id})]));p.drawText(text,{x,y,size,font:role==='H2'?bold:font});p.pushOperators(PDFOperator.of('EMC'));return ref;};
 ['Preparation','Collection','Storage','Analysis'].forEach((text,i)=>{const x=kind==='columns'&&i>=2?310:48,y=kind==='columns'?740-(i%2)*180:740-i*160;groups.push([draw('H2',text,x,y,19),draw('P','Original synthetic field notes for review.',x,y-35,10)]);});
 const sequence=kind==='correct'?[0,1,2,3]:[0,2,1,3];doc.set(PDFName.of('K'),c.obj(sequence.flatMap(i=>groups[i])));root.set(PDFName.of('ParentTree'),c.register(c.obj({Nums:[0,c.obj(refs)]})));root.set(PDFName.of('ParentTreeNextKey'),c.obj(1));

 return pdf.save({useObjectStreams:false});
}

it('abstains on correctly ordered unnumbered aligned headings after actual PDF parsing',async()=>{
 const r=await analyzePdf(await spatialPdf('correct'));
 expect(r.analysisComplete).toBe(true);expect(r.accepted).toBe(true);
 expect(r.pages[0].logicalBlocks.filter(b=>b.role==='H2').map(b=>b.key)).toEqual(['1:0','1:2','1:4','1:6']);
 expect(r.readingOrder.status).toBe('uncertain');expect(r.readingOrder.findings).toEqual([]);
});
it('locates reversed unnumbered headings by actual recovered MCID keys and geometry',async()=>{
 const r=await analyzePdf(await spatialPdf('reversed'));
 expect(r.analysisComplete).toBe(true);expect(r.accepted).toBe(true);
 const f=r.readingOrder.findings.find(f=>f.detector==='single-alignment-heading-geometry');
 expect(r.readingOrder.status).toBe('requires-review');expect(f.evidence.map(b=>b.key)).toEqual(['1:0','1:4','1:2','1:6']);
 expect(f.evidence.every(b=>b.page===1&&b.keys[0]===b.key&&Number.isFinite(b.y))).toBe(true);
 expect(f.evidence[2].y).toBeGreaterThan(f.evidence[1].y+30);
 for(const target of f.evidence)expect(r.pages[0].blocks.find(b=>b.key===target.key)?.quad).toHaveLength(4);
});
it('abstains on reordered unnumbered headings across two real visual columns',async()=>{
 const r=await analyzePdf(await spatialPdf('columns'));
 expect(r.analysisComplete).toBe(true);expect(r.accepted).toBe(true);
 expect(r.pages[0].logicalBlocks.filter(b=>b.role==='H2').map(b=>b.key)).toEqual(['1:0','1:4','1:2','1:6']);
 expect(r.readingOrder.status).toBe('uncertain');expect(r.readingOrder.findings).toEqual([]);
});
