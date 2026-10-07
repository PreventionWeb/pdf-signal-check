import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { scenes as buildScenes } from './scenes.jsx';
import { StoryDefs } from './art.jsx';
import { HOLD, REDUCED_DWELL, playScene, setPaused, startClock } from './motion.js';
import narration from './narration.json';

const prefersReducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const initialScene = count => {
  const value = Number(new URLSearchParams(globalThis.location?.search).get('scene'));
  return Number.isInteger(value) && value >= 1 && value <= count ? value - 1 : 0;
};
const LOGO = 'https://assets.undrr.org/logos/undrr/undrr-logo-blue.svg';

/** "Does [everyone|purple] understand it?" → text with coloured, bold key words. */
export function parseCaption(caption) {
  return caption.split(/(\[[^\]]+\])/).filter(Boolean).map(part => {
    const match = part.match(/^\[([^|\]]+)\|?([a-z]*)\]$/);
    return match ? { text: match[1], tone: match[2] || 'purple' } : { text: part };
  });
}
export const plainCaption = caption => parseCaption(caption).map(part => part.text).join('');
const Caption = ({ caption }) => parseCaption(caption).map((part, i) =>
  part.tone ? <strong key={i} className={`story-kw story-kw--${part.tone}`}>{part.text}</strong> : <React.Fragment key={i}>{part.text}</React.Fragment>);

/** Narration clip for a scene, if the static audio files were generated. */
const clipFor = id => narration.clips?.find(clip => clip.id === id);
const audioUrl = file => new URL(`story/audio/${file}`, document.baseURI).href;
/** Optional music bed: { file, level, duck }. Its mix is also baked low into the file for browsers that ignore volume. */
const music = narration.music;
/** Ramp a media element's volume over a quarter second (no-op where volume is fixed, as on iOS). */
function fadeTo(element, target) {
  const start = element.volume, began = performance.now();
  const step = now => { const t = Math.min(1, (now - began) / 250); element.volume = start + (target - start) * t; if (t < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/**
 * Viewer-paced story player. Opens paused and never autoplays. Play advances scene by scene; Pause freezes motion,
 * narration and the advance timer together. Scenes last as long as their narration plus a hold, whether or not
 * audio is on, so captions keep the same pace. With reduced motion, scenes show their composed still frame.
 */
export function StoryPlayer({ data, onCheck, onAbout }) {
  const scenes = useMemo(() => buildScenes(data), [data]);
  const [index, setIndex] = useState(() => initialScene(scenes.length));
  const [playing, setPlaying] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [reduced, setReduced] = useState(prefersReducedMotion);
  const stage = useRef(null), clock = useRef(null), audio = useRef(null), bed = useRef(null);
  const live = useRef({ playing, audioOn });
  live.current = { playing, audioOn };
  const scene = scenes[index];
  const last = index === scenes.length - 1;
  const hasAudio = scenes.every(item => clipFor(item.id));

  useEffect(() => {
    const query = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query?.addEventListener('change', update);
    return () => query?.removeEventListener('change', update);
  }, []);

  const playClip = (offset = 0) => {
    const element = audio.current, clip = clipFor(scene.id);
    if (!element || !clip || !live.current.audioOn || !live.current.playing) return;
    if (offset > clip.duration) { element.pause(); return; }
    if (!element.src.endsWith(clip.file)) element.src = audioUrl(clip.file);
    element.currentTime = offset;
    element.play().catch(() => {});
  };

  // Enter the scene: run its entry motion, then (when playing) a pausable hold before the next scene.
  useLayoutEffect(() => {
    const element = stage.current;
    for (const animation of element?.getAnimations({ subtree: true }) || []) animation.cancel();
    const entry = playScene(element, { motion: !reduced });
    const spoken = (clipFor(scene.id)?.duration || 0) * 1000 + 300;
    clock.current = startClock(element, Math.max(entry + HOLD, spoken, reduced ? REDUCED_DWELL : 0), () => {
      if (!live.current.playing) return;
      if (last) setPlaying(false); else setIndex(value => value + 1);
    });
    if (!live.current.playing) clock.current?.pause();
    audio.current?.pause();
    playClip(0);
    const url = new URL(location.href); url.searchParams.set('scene', index + 1); history.replaceState(null, '', url);
    return () => { for (const animation of element?.getAnimations({ subtree: true }) || []) animation.cancel(); };
  }, [index, reduced]);

  // Arriving at a scene always plays its entry motion; "paused" only stops auto-advance and narration. Toggling
  // Pause freezes whatever is moving and Play resumes it. Compare with the previous value rather than skipping
  // the first run: React StrictMode runs effects twice.
  const lastPlaying = useRef(playing);
  useEffect(() => {
    if (lastPlaying.current === playing) return;
    lastPlaying.current = playing;
    if (playing) {
      setPaused(stage.current, false);
      if (clock.current?.playState === 'finished') { if (last) setPlaying(false); else setIndex(value => value + 1); return; }
      playClip((clock.current?.currentTime || 0) / 1000);
    } else { setPaused(stage.current, true); audio.current?.pause(); }
  }, [playing]);
  useEffect(() => {
    if (audioOn) playClip((clock.current?.currentTime || 0) / 1000); else audio.current?.pause();
  }, [audioOn]);
  useEffect(() => () => { audio.current?.pause(); bed.current?.pause(); }, []);
  // Music bed: plays only while the story plays with audio on, never on reduced-motion stills, and ducks under
  // each narration clip.
  useEffect(() => {
    const element = bed.current;
    if (!element || !music) return;
    if (playing && audioOn && !reduced) {
      if (!element.src) { element.src = audioUrl(music.file); element.volume = music.level; }
      element.play().catch(() => {});
    } else element.pause();
  }, [playing, audioOn, reduced]);
  useEffect(() => {
    const voice = audio.current, element = bed.current;
    if (!voice || !element || !music) return;
    const duck = () => fadeTo(element, music.duck), lift = () => fadeTo(element, music.level);
    voice.addEventListener('playing', duck); voice.addEventListener('pause', lift); voice.addEventListener('ended', lift);
    return () => { voice.removeEventListener('playing', duck); voice.removeEventListener('pause', lift); voice.removeEventListener('ended', lift); };
  }, []);

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
    <StoryDefs />
    <div className="story-frame">
      <div className="story-stage" ref={stage} role="group" aria-roledescription="scene" aria-label={`Scene ${index + 1} of ${scenes.length}: ${scene.label}`}>
        <div key={scene.id} className="story-scene">{scene.stage}</div>
        <p className="mg-u-sr-only">{scene.describe}</p>
        <img className="story-logo" src={LOGO} alt="UNDRR" width="425" height="64" />
      </div>
      <div className="story-caption-row">
        <p id="story-caption" className="story-caption" aria-live="polite"><Caption key={scene.id} caption={scene.caption} /></p>
        {last && <div className="story-cta">
          <button type="button" className="mg-button mg-button-primary" onClick={onCheck}>Check your own PDF</button>
          <button type="button" className="mg-button mg-button-secondary mg-button-outline" onClick={onAbout}>Why PDFs need to work for AI</button>
        </div>}
      </div>
    </div>
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
      {hasAudio && <label className="story-audio">
        <input type="checkbox" checked={audioOn} onChange={event => setAudioOn(event.target.checked)} /> Audio on
      </label>}
    </div>
    {hasAudio && <audio ref={audio} preload="none" />}
    {hasAudio && music && <audio ref={bed} preload="none" loop />}
    {reduced && <p className="story-note">Your device is set to reduce motion, so each scene is shown as a still. Play still moves through the scenes.</p>}
    <details className="mg-details story-transcript">
      <summary>Read the transcript</summary>
      <ol>{scenes.map((item, i) => <li key={item.id}>
        <h3>{i + 1}. {item.label}</h3>
        <p><strong>Caption:</strong> {plainCaption(item.caption)}</p>
        <p><strong>Narration:</strong> {item.narration}</p>
        <p className="story-describe"><strong>On screen:</strong> {item.describe}</p>
      </li>)}</ol>
      {hasAudio && <p className="story-describe">The narration is a synthetic voice ({narration.voiceNote}).{music ? ` The background music is AI-generated (${music.note}).` : ''}</p>}
    </details>
  </section>;
}
