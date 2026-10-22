// Reproduce input/workload findings without downloading or invoking a model.
import { inspectFigureDescriptions } from '../../src/engine/figure-descriptions.js';
import { assessSemantic } from '../../src/engine/semantic.js';
import { quantities } from '../../src/engine/facts.js';
const quad = (x, y, width, height) => [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
const report = {
  pages: [{ number: 1, blocks: [
    { id: 1, text: 'Figure 1. Flooding at the coast', quad: quad(10, 320, 250, 20) },
    { id: 2, text: 'Figure 2. Health expenditure', quad: quad(330, 150, 250, 20) },
  ] }],
  figureAlternatives: { items: [{ id: 'left-photo', page: 1, tagged: true, alt: 'Flood water on the coast', quads: [quad(10, 30, 250, 260)] }] },
};
const pairing = inspectFigureDescriptions(report).items[0];
const facts = ['Coastal losses affected 40 countries in this reporting period.', 'Flood losses affected 50 countries in this reporting period.']
  .map((text, index) => ({ page: index + 1, text, quantities: quantities(text) }));
let embeddedTexts = 0;
const result = await assessSemantic({ metadata: { language: 'en' }, checks: [], facts,
  figures: [{ id: pairing.id, alt: pairing.alt, caption: pairing.context.text }] }, async texts => {
  embeddedTexts = texts.length;
  return texts.map(() => [1, 0]); // Policy plumbing only; not measured model quality.
});
console.log(JSON.stringify({
  captionAssociation: { expectedBlock: 1, actualBlock: pairing.context.blockIds[0], actualCaption: pairing.context.text },
  workloadWithEmptyCheckSelection: { requestedChecks: [], embeddedTexts, figureItems: result.figureItems.length, factCoverage: result.factCoverage },
  note: 'Synthetic reproduction. Injected vectors establish workload construction, not inference accuracy.',
}, null, 2));
