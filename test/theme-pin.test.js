import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { PRESENTATION_BRAND } from '../src/brand.js';

const read = name => readFile(new URL(`../${name}`, import.meta.url), 'utf8');

// A version bump that misses one entry point leaves that page unstyled, because the SRI check fails closed.
describe('pinned Mangrove theme', () => {
  it('uses one stylesheet URL and integrity hash in every entry point, matching the npm package version', async () => {
    const pkg = JSON.parse(await read('package.json'));
    expect(pkg.dependencies['@undrr/undrr-mangrove']).toBe(PRESENTATION_BRAND.version);
    expect(PRESENTATION_BRAND.stylesheet).toContain(`/mangrove/${PRESENTATION_BRAND.version}/`);
    for (const page of ['index.html', 'story.html']) {
      const link = (await read(page)).match(/<link id="mangrove-theme"[^>]*>/)?.[0];
      expect(link, page).toContain(`href="${PRESENTATION_BRAND.stylesheet}"`);
      expect(link, page).toContain(`integrity="${PRESENTATION_BRAND.stylesheetIntegrity}"`);
    }
  });
});
