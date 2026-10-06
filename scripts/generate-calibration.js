// Original synthetic documents. Run: node scripts/generate-calibration.js
import { PDFDocument, StandardFonts, PDFName, PDFHexString, PDFOperator, rgb } from 'pdf-lib';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('../public/calibration/', import.meta.url));
const title = 'Harbor Observatory Annual Report 2025';
const cases = [
  { id: '01-clean-text', name: 'Clean tagged text control', graphics: false },
  { id: '02-artifact-logo', name: 'Clean report with decorative logo', graphics: 'logo' },
  { id: '03-meaningful-figure', name: 'Meaningful figure with alternate text', graphics: 'chart' },
  { id: '04-no-metadata', name: 'No document metadata', metadata: 'none', defects: ['missing metadata'] },
  { id: '05-untagged', name: 'Readable text without semantic tags', tags: 'none', defects: ['missing structure tree'] },
  { id: '06-empty-structure', name: 'Marked document with empty structure', tags: 'empty', defects: ['empty structure tree'] },
  { id: '07-partial-tags', name: 'Partial semantic coverage', tags: 'partial', defects: ['second-page body content untagged'] },
  { id: '08-wrong-year', name: 'Same series, wrong metadata year', metadataTitle: 'Harbor Observatory Annual Report 2024', defects: ['metadata year mismatch'] },
  { id: '09-wrong-entity', name: 'Same topic, wrong organization', metadataTitle: 'Mountain Observatory Annual Report 2025', defects: ['metadata organization mismatch'] },
  { id: '10-conflicting-metadata', name: 'Info and XMP disagree', xmpTitle: 'Harbor Observatory Annual Report 2024', defects: ['Info/XMP title conflict'] },
  { id: '11-combined-defects', name: 'Missing metadata, partial tags and figure without alternate text', metadata: 'none', tags: 'partial', graphics: 'chart', missingAlt: true, defects: ['missing metadata', 'second-page body content untagged', 'figure has no alternate text'] },
  { id: '18-title-author-control', name: 'Matching title and tagged authors control', visibleAuthors: ['Maya Chen', 'Leo Martin'], metadataAuthors: ['Maya Chen', 'Leo Martin'] },
  { id: '13-tagged-title-mismatch', name: 'Tagged publication title contradicts metadata', metadataTitle: 'Harbor Observatory Annual Summary 2025', visibleAuthors: ['Maya Chen', 'Leo Martin'], metadataAuthors: ['Maya Chen', 'Leo Martin'], defects: ['tagged H1 title differs from Info/XMP title'] },
  { id: '14-author-mismatch', name: 'Metadata authors contradict tagged byline', visibleAuthors: ['Maya Chen', 'Leo Martin'], metadataAuthors: ['Iris Hale', 'Owen Brooks'], defects: ['Info/XMP authors differ from tagged byline'] },
  { id: '15-title-author-mismatch', name: 'Plausible title and author identity mismatch', metadataTitle: 'Harbor Observatory Annual Report 2024', visibleAuthors: ['Maya Chen', 'Leo Martin'], metadataAuthors: ['Iris Hale', 'Owen Brooks'], defects: ['metadata year differs from tagged H1', 'Info/XMP authors differ from tagged byline'] },
  { id: '16-correct-reading-order', name: 'Two-column procedure in correct tag-tree order', readingOrder: 'correct', visibleAuthors: ['Maya Chen', 'Leo Martin'], metadataAuthors: ['Maya Chen', 'Leo Martin'] },
  { id: '17-flawed-reading-order', name: 'Two-column procedure with reordered semantic text', readingOrder: 'flawed', visibleAuthors: ['Maya Chen', 'Leo Martin'], metadataAuthors: ['Maya Chen', 'Leo Martin'], defects: ['tag-tree order reads steps 3-4 before steps 1-2'] },
  { id: '12-german-control', name: 'German title and text control', language: 'de-DE', visibleTitle: 'Hafenobservatorium Jahresbericht 2025', graphics: 'logo' },
];
const ink = rgb(.12,.2,.28), teal = rgb(.02,.42,.45), pale = rgb(.91,.96,.96);
const xml = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

export async function generate(spec, outputDirectory = output) {
  const pdf = await PDFDocument.create();
  const context = pdf.context;
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const language = spec.language || 'en-GB';
  const german = language.startsWith('de');
  const visibleTitle = spec.visibleTitle || title;
  const metadataTitle = spec.metadataTitle || visibleTitle;
  if (spec.metadata !== 'none') {
    pdf.setTitle(metadataTitle); pdf.setAuthor(spec.metadataAuthors?.join('; ') || 'Harbor Observatory (fictional)');
    pdf.setSubject(spec.metadataSubject || 'Synthetic annual report for PDF actionability calibration');
    pdf.setKeywords(spec.metadataKeywords || ['synthetic', 'calibration', 'observatory', 'annual report']);
    pdf.setCreator('PDFs for AI Actionability calibration generator');
    pdf.setProducer('pdf-lib / original calibration corpus');
    pdf.setCreationDate(new Date('2026-01-01T00:00:00Z'));
    pdf.setModificationDate(new Date('2026-01-01T00:00:00Z'));
    const xmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xml(spec.xmpTitle || metadataTitle)}</rdf:li></rdf:Alt></dc:title>${spec.metadataAuthors ? `<dc:creator><rdf:Seq>${spec.metadataAuthors.map(a=>`<rdf:li>${xml(a)}</rdf:li>`).join('')}</rdf:Seq></dc:creator>` : ''}${spec.missingLanguage ? "" : `<dc:language><rdf:Bag><rdf:li>${language}</rdf:li></rdf:Bag></dc:language>`}${spec.metadataSubject ? `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${xml(spec.metadataSubject)}</rdf:li></rdf:Alt></dc:description>` : ""}${spec.metadataKeywords ? `<dc:subject><rdf:Bag>${spec.metadataKeywords.map(k => `<rdf:li>${xml(k)}</rdf:li>`).join("")}</rdf:Bag></dc:subject>` : ""}</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
    pdf.catalog.set(PDFName.of('Metadata'), context.register(context.stream(new TextEncoder().encode(xmp), { Type: 'Metadata', Subtype: 'XML' })));
  } else {
    // PDFDocument.create adds a producer Info dictionary by default.
    context.trailerInfo.Info = undefined;
  }
  pdf.catalog.set(PDFName.of('Lang'), PDFHexString.fromText(language));
  if (spec.missingLanguage) pdf.catalog.delete(PDFName.of('Lang'));
  const tagged = spec.tags !== 'none';
  const root = context.obj({ Type: 'StructTreeRoot', K: [] });
  const rootRef = context.register(root);
  const doc = context.obj({ Type: 'StructElem', S: 'Document', P: rootRef, K: [] });
  const docRef = context.register(doc);
  root.set(PDFName.of('K'), context.obj([docRef]));
  const kids = [], parentPairs = [];
  if (tagged) {
    pdf.catalog.set(PDFName.of('MarkInfo'), context.obj({ Marked: true }));
    pdf.catalog.set(PDFName.of('StructTreeRoot'), rootRef);
  }
  const pages = [pdf.addPage([595,842]), pdf.addPage([595,842])];
  const mappings = [[],[]];
  const semantic = (pageIndex, role, draw, alt) => {
    const page = pages[pageIndex];
    const active = tagged && spec.tags !== 'empty' && !(spec.tags === 'partial' && pageIndex === 1 && role !== 'H1' && role !== 'Figure');
    if (!active) { draw(page); return; }
    const mcid = mappings[pageIndex].length;
    const elem = context.obj({ Type: 'StructElem', S: role, P: docRef, Pg: page.ref, K: mcid });
    if (alt) elem.set(PDFName.of('Alt'), PDFHexString.fromText(alt));
    const ref = context.register(elem); mappings[pageIndex].push(ref); kids.push(ref);
    page.pushOperators(PDFOperator.of('BDC', [PDFName.of(role), context.obj({ MCID: mcid })]));
    draw(page); page.pushOperators(PDFOperator.of('EMC'));
  };
  const artifact = (page, draw) => {
    page.pushOperators(PDFOperator.of('BMC', [PDFName.of('Artifact')]));
    draw(page); page.pushOperators(PDFOperator.of('EMC'));
  };
  const text = (pi, role, value, y, size = 12) => semantic(pi, role, page => page.drawText(value, { x: 48, y, size, font: role.startsWith('H') ? bold : regular, color: ink }));
  const wrapped = (pi, value, y) => {
    const words = value.split(' '); let line = '', lines = [];
    for (const word of words) { const next = line ? `${line} ${word}` : word; if (regular.widthOfTextAtSize(next,12) > 490) { lines.push(line); line = word; } else line = next; }
    if (line) lines.push(line);
    semantic(pi, 'P', page => lines.forEach((line,i) => page.drawText(line, { x:48,y:y-i*19,size:12,font:regular,color:ink })));
    return y-lines.length*19;
  };
  for (let pi = 0; pi < 2; pi++) {
    const page = pages[pi];
    page.node.set(PDFName.of('StructParents'), context.obj(pi));
    artifact(page, p => {
      p.drawRectangle({x:48,y:791,width:499,height:3,color:teal});
      p.drawText(german ? 'SYNTHETISCHES KALIBRIERUNGSDOKUMENT' : 'SYNTHETIC CALIBRATION DOCUMENT', {x:48,y:807,size:8,font:bold,color:teal});
      p.drawText(`${pi+1} / 2`, {x:515,y:28,size:9,font:regular,color:ink});
      p.drawText('Original fictional data - no claims about real organizations.', {x:48,y:28,size:8,font:regular,color:ink});
    });
  }
  text(0,'H1', visibleTitle, 738, 21);
  text(0,'P', german ? 'Beobachtungen, Ergebnisse und Prioritäten' : 'Observations, findings and priorities', 710, 13);
  if (spec.visibleAuthors) text(0,'P', `Authors: ${spec.visibleAuthors.join('; ')}`, 684, 12);
  if (spec.graphics) artifact(pages[0], p => {
    p.drawRectangle({x:48,y:643,width:38,height:38,color:teal});
    p.drawLine({start:{x:55,y:651},end:{x:79,y:673},thickness:3,color:rgb(1,1,1)});
    p.drawCircle({x:75,y:654,size:4,color:rgb(1,1,1)});
    p.drawText('HARBOR / OBSERVATORY', {x:99,y:656,size:11,font:bold,color:teal});
  });
  text(0,'H2', german ? 'Überblick' : 'Executive overview', 600, 17);
  let y = wrapped(0, german ? 'Das Hafenobservatorium untersuchte im Jahr 2025 die Wasserqualität an drei fiktiven Messstationen. Dieser Bericht beschreibt die Ergebnisse und die nächsten Schritte.' : 'Harbor Observatory monitored water quality at three fictional coastal stations during 2025. This report summarizes the observations and the priorities for the next reporting period.', 568);
  y = wrapped(0, german ? 'Alle Zahlen wurden für diese Kalibrierung erfunden. Der sichtbare Titel, die Sprache und die Metadaten sollten dieselbe Veröffentlichung beschreiben.' : 'All figures are invented for calibration. The visible title, document language and metadata should describe this same publication. A nearby year or another observatory is a meaningful identity difference.', y-20);
  text(0,'H2', german ? 'Wichtige Ergebnisse' : 'Principal findings', y-42,17);
  wrapped(0, german ? 'Die mittlere Sichttiefe stieg von 2,4 auf 3,1 Meter. Für die Station Nord fehlt eine Wintermessung; die Jahreswerte sind deshalb nur eingeschränkt vergleichbar.' : 'Mean visibility increased from 2.4 to 3.1 metres. North station has one missing winter observation, so annual station averages are only partly comparable.', y-73);
  text(0,'P', german ? 'Berichtszeitraum: Januar bis Dezember 2025.' : 'Reporting period: January to December 2025.', 310);
  text(0,'P', german ? 'Herausgeber: Hafenobservatorium, fiktive Forschungsgruppe.' : 'Publisher: Harbor Observatory, a fictional research group.', 284);
  if (spec.overviewFigure) {
    semantic(0,'Figure', p => {
      p.drawRectangle({x:48,y:75,width:499,height:173,color:pale});
      [2.8,3.1,3.4].forEach((v,i) => {
        p.drawRectangle({x:95+i*139,y:105,width:72,height:v*31,color:teal});
        p.drawText(`${v} m`,{x:111+i*139,y:111+v*31,size:10,font:bold,color:ink});
        p.drawText(['North','Central','South'][i],{x:111+i*139,y:87,size:10,font:regular,color:ink});
      });
    }, spec.missingAlt ? undefined : 'Mean water visibility: North 2.8 metres, Central 3.1 metres, South 3.4 metres. South is highest.');
    text(0,'P','Figure 1. Mean water visibility at the three fictional stations.',54,10);
  }
  let orderTruth = null;
  if (spec.readingOrder) {
    text(1,'H1','Field sampling procedure',738,23);
    wrapped(1,'Read the left column first, then continue in the right column. The numbered steps depend on their predecessors.',700);
    const drawColumn=(x,value,y,heading=false)=>semantic(1,heading?'H2':'P',p=>p.drawText(value,{x,y,size:heading?15:11,font:heading?bold:regular,color:ink}));
    const startIndex=kids.length;
    const left=[['1. Prepare the sealed bottles',620,true],['Label each bottle before sampling.',592],['Keep bottles capped until needed.',573],['2. Collect a water sample',510,true],['Open the prepared bottle at the station.',482],['Fill it once; recap it immediately.',463]];
    const right=[['3. Store the collected sample',620,true],['Place the filled bottle in the cooler.',592],['Record the collection time.',573],['4. Analyze and record results',510,true],['Test the sample after transport.',482],['Attach the result to its bottle label.',463]];
    left.forEach(([t,y,h])=>drawColumn(48,t,y,h));
    const splitIndex=kids.length;
    right.forEach(([t,y,h])=>drawColumn(310,t,y,h));
    const endIndex=kids.length;
    if(spec.readingOrder==='flawed')kids.splice(startIndex,endIndex-startIndex,...kids.slice(splitIndex,endIndex),...kids.slice(startIndex,splitIndex));
    text(1,'P','The procedure is fictional and is not laboratory safety advice.',350,10);
    orderTruth={page:2,visualOrder:['1. Prepare the sealed bottles','2. Collect a water sample','3. Store the collected sample','4. Analyze and record results'],contentStreamOrder:[0,1,2,3],logicalHeadingOrder:spec.readingOrder==='flawed'?[2,3,0,1]:[0,1,2,3],intentionalDefect:spec.readingOrder==='flawed',fullCoverage:true, headingRole:'H2', contentKeys: { intended:['2:2','2:5','2:8','2:11'], actual:spec.readingOrder==='flawed'?['2:8','2:11','2:2','2:5']:['2:2','2:5','2:8','2:11'] }};
  } else {
  text(1,'H1', german ? 'Ergebnisse und nächste Schritte' : 'Results and next steps', 738,23);
  text(1,'H2', german ? 'Stationsvergleich' : 'Station comparison', 690,17);
  wrapped(1, german ? 'Nord: 2,8 Meter. Mitte: 3,1 Meter. Süd: 3,4 Meter. Die Messwerte geben Sichttiefe an, nicht chemische Schadstoffkonzentration.' : 'North: 2.8 metres. Central: 3.1 metres. South: 3.4 metres. These values indicate water visibility, not chemical contaminant concentration.', 661);
  if (spec.graphics === 'chart') {
    semantic(1,'Figure', p => {
      p.drawRectangle({x:48,y:407,width:499,height:173,color:pale});
      [2.8,3.1,3.4].forEach((v,i) => {
        p.drawRectangle({x:95+i*139,y:437,width:72,height:v*31,color:teal});
        p.drawText(`${v} m`,{x:111+i*139,y:443+v*31,size:10,font:bold,color:ink});
        p.drawText(['North','Central','South'][i],{x:111+i*139,y:419,size:10,font:regular,color:ink});
      });
    }, spec.missingAlt ? undefined : 'Bar chart: mean visibility is 2.8 metres at North, 3.1 at Central and 3.4 at South. South is highest.');
    text(1,'P','Figure 1. Mean visibility by station; values are stated above.', 385,11);
  } else {
    text(1,'H2',german ? 'Interpretation' : 'Interpretation', 567,17);
    wrapped(1,german ? 'Die südliche Station weist den höchsten Wert auf. Ohne vollständige saisonale Messungen lässt sich daraus kein belastbarer Trend ableiten.' : 'South has the highest observed value. Without complete seasonal measurements, this difference does not establish a reliable long-term trend.',537);
  }
  text(1,'H2',german ? 'Prioritäten für 2026' : 'Priorities for 2026', 334,17);
  wrapped(1,german ? 'Zusätzliche Wintermessungen durchführen. Messmethoden dokumentieren. Jahresvergleiche nur mit vollständigen Daten veröffentlichen.' : 'Collect additional winter observations. Document the sampling method. Publish annual comparisons only when the underlying series is complete.', 302);
  text(1,'H2',german ? 'Datengrundlage' : 'Data provenance', 214,17);
  wrapped(1,german ? 'Die Daten und das Logo sind Originale dieses Testprojekts. Das Dokument ist ein synthetisches Beispiel und keine wissenschaftliche Veröffentlichung.' : 'The data and logo were created for this test project. This document is a synthetic example and is not a scientific publication.', 182);
  }
  if (tagged) {
    doc.set(PDFName.of('K'), context.obj(kids));
    for (let pi=0; pi<2; pi++) parentPairs.push(pi, context.obj(mappings[pi]));
    root.set(PDFName.of('ParentTree'), context.register(context.obj({Nums: parentPairs})));
    root.set(PDFName.of('ParentTreeNextKey'), context.obj(2));
  }
  const bytes = await pdf.save({useObjectStreams:false,addDefaultPage:false,updateFieldAppearances:false});
  await writeFile(`${outputDirectory}${spec.id}.pdf`,bytes);
  return {
    id:spec.id,file:`${spec.id}.pdf`,title:spec.name,description:`Two-page original ${german ? 'German' : 'English'} report. ${spec.defects?.length ? `Deliberate defects: ${spec.defects.join('; ')}.` : 'Positive control with matching metadata and connected text structure.'}`,language,visibleTitle,
    expectedProperties:{pageCount:2,extractableText:true,infoTitle:spec.metadata === 'none' ? null : metadataTitle,xmpTitle:spec.metadata === 'none' ? null : spec.xmpTitle || metadataTitle,structure:spec.tags || 'complete',titleRelationship:spec.metadata === 'none' ? 'not assessable' : spec.metadataTitle || spec.xmpTitle ? 'mismatch' : 'match',graphics:spec.graphics || 'none',figureAlt:spec.graphics === 'chart' ? !spec.missingAlt : null},
    groundTruth: { taggedPublicationTitle: visibleTitle, taggedByline: spec.visibleAuthors || null, metadataAuthors: spec.metadataAuthors || null, authorRelationship: spec.visibleAuthors ? (JSON.stringify(spec.visibleAuthors)===JSON.stringify(spec.metadataAuthors)?'match':'mismatch') : 'not labeled', readingOrder: orderTruth, currentChecks: { authorIdentity: 'bounded advisory: explicit first-page byline vs Info Author and XMP creators; not authenticated identity', readingOrderCorrectness: 'bounded advisory: numbered tagged steps checked for repeats/decreases; global order correctness not established', title: spec.metadataTitle ? 'inspect deterministic title warning separately from structural acceptance' : 'matching publication title' } },
    defects:spec.defects || [],
    supportedScope:spec.graphics === 'chart' ? 'Meaningful vector figure may be indeterminate in the text-centric v0.1 profile; valid Alt does not alone establish graphics coverage.' : 'Text-centric v0.1 profile; decorative graphics and running furniture explicitly marked Artifact.',
    bytes:bytes.length,
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await mkdir(output,{recursive:true});
  const samples=[];
  for (const spec of cases.sort((a,b)=>a.id.localeCompare(b.id))) samples.push(await generate(spec));
  await writeFile(`${output}manifest.json`,`${JSON.stringify({schemaVersion:1,description:'Original synthetic calibration corpus, not a conformance certification or statistical evaluation set.',samples},null,2)}\n`);
  console.log(`Generated ${samples.length} original calibration PDFs in ${output}`);
}
