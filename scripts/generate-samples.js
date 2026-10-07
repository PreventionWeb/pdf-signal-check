// Original reports with metadata, structure and attachment examples. The larger calibration corpus is
// retained for developer tests; it is not the public sample picker.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PDFDocument, AFRelationship } from 'pdf-lib';
import { generate } from './generate-calibration.js';
import { fileURLToPath } from 'node:url';
const output = fileURLToPath(new URL('../public/samples/', import.meta.url));
await mkdir(output, { recursive: true });
const common = {
  overviewFigure: true,
  visibleAuthors: ['Maya Chen', 'Leo Martin'],
  metadataAuthors: ['Maya Chen', 'Leo Martin'],
  metadataSubject: 'Water quality observations at three fictional coastal stations during 2025, with a field sampling procedure.',
  metadataKeywords: ['water quality', 'coastal observations', 'field sampling', 'annual report'],
  readingOrder: 'correct',
};
const cases = [
  { ...common, id: 'well-prepared', name: 'Well prepared',
    summary: 'Matching title, year and authors; complete text tags, intended column order and figure description.' },
  { ...common, id: 'partly-prepared', name: 'Partly prepared',
    metadataTitle: 'Harbor Observatory Annual Report 2024',
    metadataAuthors: ['Iris Hale', 'Owen Brooks'], readingOrder: 'flawed', missingAlt: true,
    summary: 'Wrong metadata year and authors, reordered procedure tags and a figure without alternate text.',
    defects: ['wrong metadata year', 'wrong metadata authors', 'tag-tree procedure reads steps 3–4 before 1–2', 'figure alternate text missing'] },
  { ...common, id: 'poorly-prepared', name: 'Poorly prepared',
    metadataTitle: 'Mountain Observatory Annual Report 2024', metadataAuthors: ['Iris Hale', 'Owen Brooks'],
    metadataSubject: 'Earthquake mineral exploration and market pricing.', metadataKeywords: ['earthquake', 'mining', 'market prices'],
    tags: 'none', missingLanguage: true, missingAlt: true,
    summary: 'Misleading title, year, authors, description and keywords; missing language, text tags and figure description.',
    defects: ['misleading metadata identity, description and keywords', 'language not declared', 'no semantic text tags', 'no tagged reading sequence', 'figure alternate text missing'] },
  { ...common, id: 'missing-document-information', name: 'Missing document information',
    metadata: 'none', tags: 'none', missingAlt: true,
    summary: 'No saved title, subject or keywords, and no text tags. Document information must be added before evaluation can continue.',
    defects: ['no title, subject or keyword metadata', 'no semantic text tags', 'no eligible AI comparison inputs'] },
  { ...common, id: 'with-attachments', name: 'With attachments', attachments: true,
    summary: 'Two embedded files: fictional station data (CSV) and a note explaining its use. Explore filenames, types, descriptions and relationships.' },
  { ...common, id: 'graphics-and-decoration', name: 'Graphics and decoration', graphics: 'decorative', unlabelledOverview: true, imageReviewExamples: true,
    summary: 'Explore four review groups: an unlabelled chart, a described chart, a chart missing alt text, and an Artifact-marked logo and page furniture.',
    defects: ['meaningful chart is not linked to a Figure tag or alternate text', 'one tagged chart has no alternate text'] },
];
const samples = [];
for (const spec of cases) {
  const sample = await generate(spec, output);
  if (spec.attachments) {
    const pdf = await PDFDocument.load(await readFile(`${output}${sample.file}`), { updateMetadata: false });
    await pdf.attach(new TextEncoder().encode('Station,Visibility_metres\nNorth,2.8\nCentral,3.1\nSouth,3.4\n'), 'station-data.csv', {
      mimeType: 'text/csv', afRelationship: AFRelationship.Data,
      description: 'Fictional station observations for this sample report. Station names and visibility in metres; demonstration data, not real measurements.' });
    await pdf.attach(new TextEncoder().encode('Sample attachment guide\n\nstation-data.csv contains fictional station names and visibility in metres. Use it to explore the attachment inventory. These are demonstration values, not real measurements or safety guidance.\n'), 'attachment-guide.txt', {
      mimeType: 'text/plain', afRelationship: AFRelationship.Supplement,
      description: 'Explains the columns and fictional status of station-data.csv. Supporting instructions for the sample attachment.' });
    const bytes = await pdf.save({ useObjectStreams: false, updateFieldAppearances: false });
    await writeFile(`${output}${sample.file}`, bytes);
    sample.bytes = bytes.length;
    sample.expectedProperties.embeddedFileCount = 2;
  }
  samples.push({ ...sample, description: spec.summary,
    supportedScope: 'Text, structure and metadata exercise. Meaningful figures and overall reading order still require manual review.',
    groundTruth: spec.tags === 'none' ? { ...sample.groundTruth, taggedPublicationTitle: null, taggedByline: null, readingOrder: null } : sample.groundTruth,
    expectedProperties: { ...sample.expectedProperties, graphics: 'meaningful figure', figureAlt: !spec.unlabelledOverview && !spec.missingAlt && spec.tags !== 'none', ...(spec.unlabelledOverview ? { unlabelledChartPage: 1, decorativeArtifactsExcluded: true } : {}), declaredLanguage: spec.missingLanguage ? null : 'en-GB' } });
}
await writeFile(`${output}manifest.json`, JSON.stringify({ schemaVersion: 1, description: 'Six fictional reports exploring metadata, tags, alternate text, decoration and embedded files. Authored examples, not conformance certificates.', samples }, null, 2) + '\n');
console.log(`Generated ${samples.length} matched sample PDFs.`);
