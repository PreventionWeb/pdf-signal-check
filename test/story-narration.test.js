import { expect, it } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import { storyScript } from '../src/story/script.js';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

it('keeps the narration audio in step with the story script (regenerate: scripts/generate-story-narration.mjs)', async () => {
  const [snapshot, narration] = await Promise.all([read('../src/story/snapshot.json'), read('../src/story/narration.json')]);
  const scenes = storyScript(snapshot);
  expect(narration.clips.map(clip => clip.id)).toEqual(scenes.map(scene => scene.id));
  for (const [i, scene] of scenes.entries()) {
    const clip = narration.clips[i];
    expect(clip.text).toBe(scene.speak || scene.narration);
    expect((await stat(new URL(`../public/story/audio/${clip.file}`, import.meta.url))).size).toBeGreaterThan(0);
  }
  // Individual clips are assembly inputs. The browser downloads only the mixed soundtrack;
  // story-playback.test.js guards its existing 1 MB download budget.
  if (narration.music) expect((await stat(new URL(`../public/story/audio/${narration.music.file}`, import.meta.url))).size).toBeGreaterThan(0);
  // The bed sits under the voice: ducking must lower it, never raise it.
  if (narration.music) expect(narration.music.duck).toBeLessThan(narration.music.level);
});

it('keeps captions free of unmatched key-word markup', async () => {
  for (const scene of storyScript(await read('../src/story/snapshot.json'))) {
    expect(scene.caption.replace(/\[[^\]|]+\|(purple|teal|coral|red)\]/g, '')).not.toMatch(/[[\]|]/);
  }
});
