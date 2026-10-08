import { expect, it } from 'vitest';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import { scenes } from '../src/story/scenes.jsx';
import { buildTimeline, sceneAt, timelineDuration } from '../src/story/timeline.js';
import { createPlayback } from '../src/story/playback.js';

class Media extends EventTarget {
  currentTime = 0; readyState = 0; muted = false; volume = 1; playbackRate = 1; paused = true; src = '';
  getAttribute() { return this.src; }
  load() { this.loads = (this.loads || 0) + 1; }
  play() { this.paused = false; this.dispatchEvent(new Event('play')); return this.pendingPlay || Promise.resolve(); }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  emit(name) { this.dispatchEvent(new Event(name)); }
}
function setup(initialTime = 0) {
  const media = new Media(); let frame;
  const player = createPlayback(media, { url: '/soundtrack.mp3', duration: 109, initialTime,
    requestFrame: callback => { frame = callback; return 1; }, cancelFrame: () => { frame = null; } });
  return { media, player, tick: now => frame?.(now) };
}

it('holds at media time during buffering and keeps paused seeks exact', async () => {
  const { media, player, tick } = setup(20);
  expect(media.loads).toBeUndefined(); // No startup request or autoplay.
  await player.play();
  expect(player.getSnapshot()).toMatchObject({ time: 20, playing: true, buffering: true });
  media.readyState = 4; media.emit('loadedmetadata');
  expect(media.currentTime).toBe(20);
  media.emit('playing'); media.currentTime = 21.5; tick(100);
  media.emit('waiting'); tick(5000);
  expect(player.getSnapshot()).toMatchObject({ time: 21.5, buffering: true });
  player.pause(); player.seek(65.25); tick(6000);
  expect(player.getSnapshot()).toMatchObject({ time: 65.25, playing: false });
  expect(media.currentTime).toBe(65.25);
  player.dispose();
});

it('mute and rate change never reset position; seeks and replay use the same media', async () => {
  const { media, player, tick } = setup();
  media.readyState = 4;
  player.seek(50); await player.play();
  player.mute(); player.setRate(2); tick(100);
  expect(player.getSnapshot()).toMatchObject({ time: 50, muted: true, rate: 2, playing: true });
  player.setVolume(0.4); expect(player.getSnapshot()).toMatchObject({ time: 50, volume: 0.4, muted: false });
  player.seek(200); expect(media.currentTime).toBe(109);
  media.emit('ended'); expect(player.getSnapshot()).toMatchObject({ time: 109, playing: false });
  await player.play(); expect(media.currentTime).toBe(0);
  player.seek(-10); expect(media.currentTime).toBe(0);
  player.dispose();
});

it('pause and disposal reject late play completions and remove event ownership', async () => {
  const { media, player, tick } = setup();
  let resolve; media.pendingPlay = new Promise(done => { resolve = done; });
  const pending = player.play(); player.pause(); resolve(); await pending;
  expect(media.paused).toBe(true);
  player.dispose(); const snapshot = player.getSnapshot();
  media.currentTime = 99; media.emit('playing'); tick(1000);
  expect(player.getSnapshot()).toBe(snapshot);
});

it('a failed play is visible and never advances a silent animation clock', async () => {
  const { media, player, tick } = setup();
  media.pendingPlay = Promise.reject(new Error('blocked'));
  await player.play(); tick(1000);
  expect(player.getSnapshot()).toMatchObject({ time: 0, playing: false, buffering: false });
  expect(player.getSnapshot().error).toContain('Try Play again');
  player.dispose();
});

it('keeps the assembled soundtrack, scene cues and source audio in step', async () => {
  const read = async name => JSON.parse(await readFile(new URL(`../src/story/${name}`, import.meta.url)));
  const [snapshot, narration, playback] = await Promise.all(['snapshot.json', 'narration.json', 'playback.json'].map(read));
  const timeline = buildTimeline(scenes(snapshot), narration.clips, renderToStaticMarkup);
  expect(playback.timeline).toEqual(timeline);
  expect(playback.duration).toBeCloseTo(timelineDuration(timeline), 3);
  for (const input of [...playback.inputs, playback]) {
    const bytes = await readFile(new URL(`../public/story/audio/${input.file}`, import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(input.sha256);
  }
  expect((await stat(new URL(`../public/story/audio/${playback.file}`, import.meta.url))).size).toBeLessThan(1_000_000);
  for (const [index, scene] of timeline.entries()) {
    expect(sceneAt(timeline, scene.start)).toBe(index);
    expect(sceneAt(timeline, scene.start + scene.duration - 0.001)).toBe(index);
  }
});

it('gives chapter cards reading time while letting longer narration finish', () => {
  const card = { id: 'chapter', minDuration: 3.5, stage: null };
  expect(buildTimeline([card], [{ id: 'chapter', duration: 2 }], () => '').at(0).duration).toBe(3.5);
  expect(buildTimeline([card], [{ id: 'chapter', duration: 5 }], () => '').at(0).duration).toBe(5.3);
});
