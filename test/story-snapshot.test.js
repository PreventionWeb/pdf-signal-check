import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { buildStorySnapshot } from '../scripts/snapshot-story.js';

// The story video is frozen to its recorded snapshot (October 2026): its narration speaks the headline counts, and
// re-recording is a separate decision. Drift between the engine and the snapshot is reported here, not failed.
// Regenerate deliberately with: node scripts/snapshot-story.js (then update the narration audio).
it('reports drift between the frozen story snapshot and the current engine', async () => {
  const committed = JSON.parse(await readFile(new URL('../src/story/snapshot.json', import.meta.url), 'utf8'));
  const current = await buildStorySnapshot();
  const drift = Object.keys(committed).filter(key => JSON.stringify(committed[key]) !== JSON.stringify(current[key]));
  if (drift.length) console.warn(`Story snapshot is frozen; the engine now differs for: ${drift.join(', ')}. Narration is unchanged.`);
  expect(Object.keys(current).sort()).toEqual(Object.keys(committed).sort());
});
