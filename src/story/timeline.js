// Shared by soundtrack generation, drift tests and playback. Times are seconds.
export function entryDuration(markup) {
  return Math.max(0, ...[...markup.matchAll(/<[^>]+data-anim="[^"]+"[^>]*>/g)].map(([tag]) =>
    (Number(tag.match(/data-delay="([^"]+)"/)?.[1] || 0) + Number(tag.match(/data-dur="([^"]+)"/)?.[1] || 700)) / 1000));
}

export function buildTimeline(scenes, clips, render) {
  let start = 0;
  return scenes.map(scene => {
    const clip = clips.find(item => item.id === scene.id);
    if (!clip) throw new Error(`Missing narration: ${scene.id}`);
    const duration = Math.round(Math.max(entryDuration(render(scene.stage)) + 0.9, clip.duration + 0.3) * 1000) / 1000;
    const item = { id: scene.id, start: Math.round(start * 1000) / 1000, duration };
    start += duration;
    return item;
  });
}

export function sceneAt(timeline, time) {
  return Math.max(0, timeline.findLastIndex(scene => time >= scene.start));
}
export const timelineDuration = timeline => Math.round((timeline.at(-1).start + timeline.at(-1).duration) * 1000) / 1000;
export function formatTime(time) {
  const seconds = Math.max(0, Math.floor(time));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
