import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { scenes as buildScenes } from './scenes.jsx';
import { DWELL, REDUCED_DWELL, playScene, setPaused, startClock } from './motion.js';

const prefersReducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const initialScene = count => {
  const value = Number(new URLSearchParams(globalThis.location?.search).get('scene'));
  return Number.isInteger(value) && value >= 1 && value <= count ? value - 1 : 0;
};

/**
 * Viewer-paced story player. Opens paused, never autoplays. Play advances scene by scene; Pause freezes motion
 * and the advance timer together. With reduced motion, scenes show their final frame and Play only changes scene.
 */
export function StoryPlayer({ data, onCheck, onAbout }) {
  const scenes = useMemo(() => buildScenes(data), [data]);
  const [index, setIndex] = useState(() => initialScene(scenes.length));
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(prefersReducedMotion);
  const stage = useRef(null), clock = useRef(null), playingRef = useRef(playing);
  playingRef.current = playing;
  const scene = scenes[index];
  const last = index === scenes.length - 1;

  useEffect(() => {
    const query = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query?.addEventListener('change', update);
    return () => query?.removeEventListener('change', update);
  }, []);
  // Enter the scene: run its entry motion, then (when playing) a pausable dwell before the next scene.
  useLayoutEffect(() => {
    const element = stage.current;
    for (const animation of element?.getAnimations({ subtree: true }) || []) animation.cancel();
    const length = playScene(element, { motion: !reduced });
    clock.current = startClock(element, length + (reduced ? REDUCED_DWELL : DWELL) + (scene.dwell || 0), () => {
      if (!playingRef.current) return;
      if (last) setPlaying(false); else setIndex(value => value + 1);
    });
    if (!playingRef.current) clock.current?.pause();
    const url = new URL(location.href); url.searchParams.set('scene', index + 1); history.replaceState(null, '', url);
    return () => { for (const animation of element?.getAnimations({ subtree: true }) || []) animation.cancel(); };
  }, [index, reduced]);
  // Arriving at a scene always plays its entry motion; "paused" only stops auto-advance. Toggling Pause freezes
  // whatever is moving (entry motion and the advance timer) and Play resumes it.
  // Compare with the previous value rather than skipping the first run: React StrictMode runs effects twice.
  const lastPlaying = useRef(playing);
  useEffect(() => {
    if (lastPlaying.current === playing) return;
    lastPlaying.current = playing;
    if (playing) {
      setPaused(stage.current, false);
      if (clock.current?.playState === 'finished') { if (last) setPlaying(false); else setIndex(value => value + 1); }
    } else setPaused(stage.current, true);
  }, [playing]);

  const go = next => { setIndex(Math.max(0, Math.min(scenes.length - 1, next))); };
  const togglePlay = () => {
    if (!playing && last && clock.current?.playState === 'finished') { setIndex(0); setPlaying(true); return; }
    setPlaying(value => !value);
  };
  const onKeyDown = event => {
    if (event.target.closest('input, select, textarea')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
  };

  return <section className="story-player" aria-label="Story" aria-roledescription="story player" onKeyDown={onKeyDown}>
    <div className="story-controls">
      <button type="button" className="mg-button mg-button-secondary mg-button-outline" onClick={() => go(index - 1)} disabled={index === 0}>Previous</button>
      <button type="button" className="mg-button mg-button-primary story-play" aria-pressed={playing} onClick={togglePlay}>{playing ? 'Pause' : last && !playing ? 'Play again' : 'Play'}</button>
      <button type="button" className="mg-button mg-button-secondary mg-button-outline" onClick={() => go(index + 1)} disabled={last}>Next</button>
      <label className="story-scrubber">
        <span className="mg-u-sr-only">Scene</span>
        <input type="range" min="1" max={scenes.length} value={index + 1} onChange={event => go(Number(event.target.value) - 1)}
          aria-valuetext={`Scene ${index + 1} of ${scenes.length}: ${scene.label}`} />
      </label>
      <span className="story-progress">Scene {index + 1} of {scenes.length}</span>
    </div>
    {reduced && <p className="story-note">Your device is set to reduce motion, so each scene is shown as a still. Play still moves through the scenes.</p>}
    <div className="story-stage" ref={stage} role="group" aria-roledescription="scene" aria-label={`Scene ${index + 1} of ${scenes.length}: ${scene.label}`}>
      <div key={scene.id} className="story-scene">{scene.stage}</div>
    </div>
    <div className="story-caption-row">
      <h2 className="story-scene-title">{scene.label}</h2>
      <p id="story-caption" className="story-caption" aria-live="polite">{scene.caption}</p>
      {last && <div className="story-cta">
        <button type="button" className="mg-button mg-button-primary" onClick={onCheck}>Check your own PDF</button>
        <button type="button" className="mg-button mg-button-secondary mg-button-outline" onClick={onAbout}>Why PDFs need to work for AI</button>
      </div>}
    </div>
    <details className="mg-details story-transcript">
      <summary>Read the transcript</summary>
      <ol>{scenes.map((item, i) => <li key={item.id}>
        <h3>{i + 1}. {item.label}</h3>
        <p>{item.caption}</p>
        <p className="story-describe">{item.describe}</p>
      </li>)}</ol>
    </details>
  </section>;
}
