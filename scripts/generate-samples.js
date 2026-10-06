// Three visually matched, original reports. The larger calibration corpus is
// retained for developer tests; it is not the public sample picker.
import { mkdir, writeFile } from 'node:fs/promises';
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
];
const samples = [];
for (const spec of cases) {
  const sample = await generate(spec, output);
  samples.push({ ...sample, description: spec.summary,
    supportedScope: 'Text, structure and metadata exercise. Meaningful figures and overall reading order still require manual review.',
    groundTruth: spec.tags === 'none' ? { ...sample.groundTruth, taggedPublicationTitle: null, taggedByline: null, readingOrder: null } : sample.groundTruth,
    expectedProperties: { ...sample.expectedProperties, graphics: 'meaningful figure', figureAlt: !spec.missingAlt && spec.tags !== 'none', declaredLanguage: spec.missingLanguage ? null : 'en-GB' } });
}
await writeFile(`${output}manifest.json`, JSON.stringify({ schemaVersion: 1, description: 'Three visually identical fictional reports. Only machine metadata, tags and alternate text differ. Authored examples, not conformance certificates.', samples }, null, 2) + '\n');
console.log(`Generated ${samples.length} matched sample PDFs.`);
