import { PDFDocument, PDFName, PDFString, StandardFonts } from 'pdf-lib';

export async function makePdf({ tagged = true, partial = false, brokenParent = false,
  emptyTree = false, title = 'Flood Risk Report 2026', bodyTitle = 'Flood Risk Report 2026',
  language = 'en', graphic = false, artifactGraphic = false, form = false,
  badText = false, dangling = false, infoTitle = title, actualText = false, formXObject = false } = {}) {
  const doc = await PDFDocument.create();
  doc.setTitle(infoTitle);
  doc.setAuthor('PDFs for AI Actionability');
  doc.setSubject('A generated fixture for document analysis.');
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const ctx = doc.context;
  if (badText) {
    await font.embed();
    ctx.lookup(font.ref).set(PDFName.of('ToUnicode'), ctx.register(ctx.stream('/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def /CMapName /BrokenMap def /CMapType 2 def 1 begincodespacerange <00> <FF> endcodespacerange 1 beginbfchar <54> <FFFD> endbfchar endcmap CMapName currentdict /CMap defineresource pop end end')));
  }
  page.node.set(PDFName.of('Resources'), ctx.obj({ Font: { F1: font.ref } }));
  if (language) doc.catalog.set(PDFName.of('Lang'), PDFString.of(language));
  const escape = s => s.replace(/[\\()]/g, '\\$&');
  const section = (id, text, y, size) => `${tagged ? `/Span << /MCID ${id} >> BDC\n` : ''}BT /F1 ${size} Tf 56 ${y} Td (${escape(text)}) Tj ET\n${tagged ? 'EMC' : ''}\n`;
  let content = section(0, bodyTitle, 744, 24);
  if (actualText) content = content.replace('/MCID 0', '/MCID 0 /Actual#54ext (Replacement heading)');
  const body = 'This report describes flood risk and preparedness.';
  content += partial ? `BT /F1 12 Tf 56 690 Td (${body}) Tj ET\n` : section(1, body, 690, 12);
  if (graphic) content += `${artifactGraphic ? '/Artifact BMC\n' : ''}0.2 0.5 0.6 rg 56 570 150 70 re f\n${artifactGraphic ? 'EMC' : ''}`;
  if (formXObject) {
    const xobject = ctx.register(ctx.stream('BT /F1 12 Tf 56 620 Td (Nested text) Tj ET', { Type: 'XObject', Subtype: 'Form', BBox: [0, 0, 595, 842], Resources: { Font: { F1: font.ref } } }));
    ctx.lookup(page.node.get(PDFName.of('Resources'))).set(PDFName.of('XObject'), ctx.obj({ X1: xobject }));
    content += '/X1 Do';
  }
  page.node.set(PDFName.of('Contents'), ctx.register(ctx.stream(content)));
  if (form) doc.getForm().createTextField('name').addToPage(page);
  if (tagged) {
    const root = ctx.obj({ Type: 'StructTreeRoot' });
    const rootRef = ctx.register(root);
    const heading = ctx.obj({ Type: 'StructElem', S: 'H1', P: rootRef, Pg: page.ref, K: 0 });
    const paragraph = ctx.obj({ Type: 'StructElem', S: 'P', P: rootRef, Pg: page.ref, K: dangling ? 8 : 1 });
    const hRef = ctx.register(heading), pRef = ctx.register(paragraph);
    root.set(PDFName.of('K'), ctx.obj(emptyTree ? [] : [hRef, pRef]));
    root.set(PDFName.of('ParentTree'), ctx.register(ctx.obj({ Nums: [0, [brokenParent ? pRef : hRef, pRef]] })));
    page.node.set(PDFName.of('StructParents'), ctx.obj(0));
    doc.catalog.set(PDFName.of('StructTreeRoot'), rootRef);
    doc.catalog.set(PDFName.of('MarkInfo'), ctx.obj({ Marked: true }));
  }
  return doc.save();
}
