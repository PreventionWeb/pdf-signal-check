import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { scenes as buildScenes } from './scenes.jsx';
import { StoryDefs } from './art.jsx';
import { playScene } from './motion.js';
import { createPlayback } from './playback.js';
import { sceneAt, formatTime } from './timeline.js';
import playback from './playback.json';
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

/** The soundtrack is the clock: buffering, seeks, mute and speed cannot move the visuals independently. */
export function StoryPlayer({ data, onCheck, onAbout }) {
  const scenes = useMemo(() => buildScenes(data), [data]);
  const initialTime = useRef(playback.timeline[initialScene(scenes.length)].start);
  const [state, setState] = useState({ time: initialTime.current, playing: false, buffering: false, muted: false, volume: 1, rate: 1, error: '' });
  const [isFullscreen, setFullscreen] = useState(false);
  const [started, setStarted] = useState(false);
  const [reduced, setReduced] = useState(prefersReducedMotion);
  const stage = useRef(null), audio = useRef(null), controller = useRef(null), player = useRef(null);
  const index = sceneAt(playback.timeline, state.time), scene = scenes[index];
  const last = index === scenes.length - 1, ended = state.time >= playback.duration - 0.05;
  const sceneTime = state.time - playback.timeline[index].start;

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === player.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  useEffect(() => {
    const query = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query?.addEventListener('change', update);
    return () => query?.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const owner = createPlayback(audio.current, {
      url: new URL(`story/audio/${playback.file}`, document.baseURI).href,
      duration: playback.duration, initialTime: initialTime.current,
    });
    controller.current = owner;
    const unsubscribe = owner.subscribe(() => setState(owner.getSnapshot()));
    return () => { unsubscribe(); owner.dispose(); controller.current = null; };
  }, []);

  useLayoutEffect(() => {
    const element = stage.current;
    for (const animation of element.getAnimations({ subtree: true })) animation.cancel();
    playScene(element, { motion: !reduced && started });
    for (const animation of element.getAnimations({ subtree: true })) animation.pause();
    const url = new URL(location.href); url.searchParams.set('scene', index + 1); history.replaceState(null, '', url);
    return () => { for (const animation of element.getAnimations({ subtree: true })) animation.cancel(); };
  }, [index, reduced, started]);

  useLayoutEffect(() => {
    // Every animation, including idle motion, is held at the same media position. No independent clocks.
    for (const animation of stage.current.getAnimations({ subtree: true })) animation.currentTime = sceneTime * 1000;
  }, [index, sceneTime, reduced, started]);

  const seek = time => { setStarted(true); controller.current?.seek(time); };
  const go = next => seek(playback.timeline[Math.max(0, Math.min(scenes.length - 1, next))].start);
  const togglePlay = () => {
    setStarted(true);
    if (state.playing) controller.current?.pause(); else controller.current?.play();
  };
  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else player.current.requestFullscreen?.().catch(() => {});
  };
  const onKeyDown = event => {
    if (event.target.closest('input, select, textarea')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); seek(state.time + 5); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); seek(state.time - 5); }
    if ((event.key === ' ' && !event.target.closest('button, a, summary')) || event.key.toLowerCase() === 'k') { event.preventDefault(); togglePlay(); }
    if (event.key.toLowerCase() === 'm') { event.preventDefault(); controller.current?.mute(); }
    if (event.key.toLowerCase() === 'f') { event.preventDefault(); fullscreen(); }
  };

  return <section ref={player} tabIndex="0" className="story-player" aria-label="Story" aria-roledescription="story player" onKeyDown={onKeyDown}>
    <StoryDefs />
    <div className="story-frame">
      <div className="story-brand"><img className="story-logo" src={LOGO} alt="UNDRR" width="425" height="64" /></div>
      <div className="story-stage" ref={stage} onClick={togglePlay} role="group" aria-roledescription="scene" aria-label={`Scene ${index + 1} of ${scenes.length}: ${scene.label}`}>
        <div key={scene.id} className="story-scene">{scene.stage}</div>
        <p className="mg-u-sr-only">{scene.describe}</p>
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
      <button type="button" className="mg-button mg-button-primary story-play" aria-pressed={state.playing} onClick={togglePlay}>{state.playing ? 'Pause' : ended ? 'Replay' : 'Play'}</button>
      <button type="button" className="mg-button mg-button-secondary mg-button-outline" onClick={() => go(index + 1)} disabled={last}>Next</button>
      <label className="story-scrubber">
        <span className="mg-u-sr-only">Playback position</span>
        <input type="range" min="0" max={playback.duration} step="0.1" value={state.time}
          onChange={event => seek(Number(event.target.value))}
          aria-valuetext={`${formatTime(state.time)} of ${formatTime(playback.duration)}: ${scene.label}`} />
      </label>
      <span className="story-progress" aria-hidden="true">{formatTime(state.time)} / {formatTime(playback.duration)}</span>
      <button type="button" className="mg-button mg-button-secondary mg-button-outline" onClick={() => controller.current?.mute()}
        aria-label={state.muted ? 'Unmute' : 'Mute'} aria-pressed={state.muted}>{state.muted ? 'Unmute' : 'Mute'}</button>
      <label className="story-volume"><span className="mg-u-sr-only">Volume</span>
        <input aria-label="Volume" type="range" min="0" max="1" step="0.05" value={state.muted ? 0 : state.volume}
          onChange={event => controller.current?.setVolume(Number(event.target.value))} />
      </label>
      <label className="story-speed"><span className="mg-u-sr-only">Playback speed</span>
        <select aria-label="Playback speed" value={state.rate} onChange={event => controller.current?.setRate(Number(event.target.value))}>
          {[0.75, 1, 1.25, 1.5, 2].map(rate => <option key={rate} value={rate}>{rate}×</option>)}
        </select>
      </label>
      <button type="button" className="mg-button mg-button-secondary mg-button-outline" onClick={fullscreen}>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</button>
    </div>
    <p className="story-playback-status" role="status">{state.error || (state.buffering ? 'Loading playback…' : `Scene ${index + 1} of ${scenes.length}: ${scene.label}`)}</p>
    <audio ref={audio} preload="none" />
    {reduced && <p className="story-note">Your device is set to reduce motion, so each scene is shown as a still. Playback and audio follow the same timeline.</p>}
    <details className="mg-details story-transcript">
      <summary>Read the transcript</summary>
      <ol>{scenes.map((item, i) => <li key={item.id}>
        <h3>{i + 1}. {item.label}</h3>
        <p><strong>Caption:</strong> {plainCaption(item.caption)}</p>
        <p><strong>Narration:</strong> {item.narration}</p>
        <p className="story-describe"><strong>On screen:</strong> {item.describe}</p>
      </li>)}</ol>
      <p className="story-describe">The figure and icon illustrations are AI-generated cut-paper images (Nano Banana 2).{` The narration is a synthetic voice (${narration.voiceNote}). The background music is AI-generated (${narration.music.note}).`}</p>
    </details>
  </section>;
}
