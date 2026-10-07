import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { buildStorySnapshot } from '../scripts/snapshot-story.js';

it('keeps the story snapshot in step with the engine and the samples (run: node scripts/snapshot-story.js)', async () => {
  const committed = JSON.parse(await readFile(new URL('../src/story/snapshot.json', import.meta.url), 'utf8'));
  expect(await buildStorySnapshot()).toEqual(committed);
});
