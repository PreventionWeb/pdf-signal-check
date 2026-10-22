import { it, expect, vi } from 'vitest';
import { assessSemantic } from '../src/engine/semantic.js';
it('clearing all requested checks prevents accompanying jobs from invoking any model', async () => {
  const embed = vi.fn();
  const result = await assessSemantic({ metadata: { language: 'en' }, checks: [],
    figures: [{ id: 'photo', alt: 'Flood water on the coast', caption: 'Figure 1. Coastal flooding' }],
    facts: [{ page: 1, text: 'Coastal losses affected 40 countries during the reporting period.' },
      { page: 2, text: 'Coastal losses affected 50 countries during the reporting period.' }],
  }, embed);
  expect(result).toMatchObject({ inferencePerformed: false, notRun: { code: 'no-checks-requested' } });
  expect(embed).not.toHaveBeenCalled();
});
