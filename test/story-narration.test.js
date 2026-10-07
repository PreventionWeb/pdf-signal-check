import { expect, it } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import { storyScript } from '../src/story/script.js';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

it('keeps the narration audio in step with the story script (regenerate: scripts/generate-story-narration.mjs)', async () => {
  const [snapshot, narration] = await Promise.all([read('../src/story/snapshot.json'), read('../src/story/narration.json')]);
  const scenes = storyScript(snapshot);
  expect(narration.clips.map(clip => clip.id)).toEqual(scenes.map(scene => scene.id));
  let bytes = 0;
  for (const [i, scene] of scenes.entries()) {
    const clip = narration.clips[i];
    expect(clip.text).toBe(scene.speak || scene.narration);
    bytes += (await stat(new URL(`../public/story/audio/${clip.file}`, import.meta.url))).size;
  }
  // Intranet budget: all narration together stays under 1 MB.
  expect(bytes).toBeLessThan(1_000_000);
});

it('keeps captions free of unmatched key-word markup', async () => {
  for (const scene of storyScript(await read('../src/story/snapshot.json'))) {
    expect(scene.caption.replace(/\[[^\]|]+\|(purple|teal|coral|red)\]/g, '')).not.toMatch(/[[\]|]/);
  }
});
