// One media element owns time, rate, buffering and audio. Visuals only sample its position.
export function createPlayback(media, { url, duration, initialTime = 0, requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame }) {
  let snapshot = { time: initialTime, playing: false, buffering: false, muted: false, volume: 1, rate: 1, error: '' };
  let pendingTime = initialTime, disposed = false, epoch = 0, frame, lastSample = -Infinity;
  const listeners = new Set();
  const publish = patch => {
    if (disposed) return;
    const next = { ...snapshot, ...patch };
    if (Object.keys(next).every(key => next[key] === snapshot[key])) return;
    snapshot = next;
    for (const listener of listeners) listener();
  };
  const position = () => pendingTime ?? Math.min(duration, media.currentTime || 0);
  const sample = () => publish({ time: position() });
  const load = () => {
    if (!media.getAttribute('src') || media.error) {
      if (media.error) pendingTime = snapshot.time;
      media.src = url; media.load();
    }
  };
  const applySeek = () => {
    if (pendingTime === null || media.readyState === 0) return;
    media.currentTime = pendingTime;
    pendingTime = null;
  };
  const events = {
    loadedmetadata: () => { applySeek(); sample(); },
    timeupdate: sample,
    seeking: () => publish({ buffering: snapshot.playing }),
    seeked: () => { sample(); publish({ buffering: false }); },
    play: () => publish({ playing: true }),
    playing: () => publish({ playing: true, buffering: false, error: '' }),
    waiting: () => publish({ buffering: snapshot.playing }),
    pause: () => { sample(); publish({ playing: false, buffering: false }); },
    ended: () => publish({ time: duration, playing: false, buffering: false }),
    error: () => { media.pause(); publish({ playing: false, buffering: false, error: 'Playback could not load. Try Play again.' }); },
    ratechange: () => publish({ rate: media.playbackRate }),
    volumechange: () => publish({ muted: media.muted, volume: media.volume }),
  };
  for (const [name, handler] of Object.entries(events)) media.addEventListener(name, handler);
  const tick = now => {
    if (disposed) return;
    if (now - lastSample >= 80) { sample(); lastSample = now; }
    frame = requestFrame(tick);
  };
  frame = requestFrame(tick);
  return {
    getSnapshot: () => snapshot,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    async play() {
      const attempt = ++epoch;
      if (snapshot.time >= duration - 0.05) this.seek(0);
      load(); applySeek(); publish({ playing: true, buffering: true, error: '' });
      try {
        await media.play();
        if (disposed || (attempt !== epoch && !snapshot.playing)) media.pause();
      } catch {
        if (!disposed && attempt === epoch) publish({ playing: false, buffering: false, error: 'Playback could not start. Try Play again.' });
      }
    },
    pause() { ++epoch; media.pause(); publish({ playing: false, buffering: false }); sample(); },
    seek(time) {
      pendingTime = Math.max(0, Math.min(duration, time));
      publish({ time: pendingTime }); load(); applySeek();
    },
    mute() { media.muted = !media.muted; publish({ muted: media.muted }); },
    setVolume(volume) { media.volume = Math.max(0, Math.min(1, volume)); media.muted = media.volume === 0; publish({ volume: media.volume, muted: media.muted }); },
    setRate(rate) { media.playbackRate = rate; publish({ rate }); },
    dispose() {
      ++epoch; disposed = true; cancelFrame(frame);
      for (const [name, handler] of Object.entries(events)) media.removeEventListener(name, handler);
      media.pause(); listeners.clear();
    },
  };
}
