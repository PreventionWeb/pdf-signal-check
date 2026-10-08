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
const PW_LOGO = 'https://assets.undrr.org/logos/pw/pw-logo.svg';

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

/** Local SVG control icons; accessible names belong to the native controls. */
function ControlIcon({ name }) {
  const paths = {
    play: <path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
    pause: <path d="M8 5v14M16 5v14" strokeWidth="4" />,
    replay: <><path d="M5 8a8 8 0 1 1-1 7M5 3v5h5" /><path d="m10 8 6 4-6 4Z" fill="currentColor" stroke="none" /></>,
    previous: <><path d="M6 5v14" /><path d="m18 5-10 7 10 7Z" fill="currentColor" stroke="none" /></>,
    next: <><path d="M18 5v14" /><path d="m6 5 10 7-10 7Z" fill="currentColor" stroke="none" /></>,
    volume: <><path d="M3 9h4l5-4v14l-5-4H3ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14" /></>,
    muted: <><path d="M3 9h4l5-4v14l-5-4H3ZM17 9l5 6m0-6-5 6" /></>,
    settings: <><path d="m10 3-1 3-3 1-3 3 2 2-1 4 4 1 2 4 3-2 4 1 1-4 3-2-2-3 1-4-4-1-2-3Z" /><circle cx="12" cy="12" r="3" /></>,
    fullscreen: <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" />,
    exit: <path d="M3 9h6V3m6 0v6h6M9 21v-6H3m12 6v-6h6" />,
  };
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
function ControlButton({ label, icon, ...props }) {
  return <button type="button" className="story-control" aria-label={label} title={label} {...props}><ControlIcon name={icon} /><span className="story-tooltip" aria-hidden="true">{label}</span></button>;
}

/** The soundtrack is the clock: buffering, seeks, mute and speed cannot move the visuals independently. */
export function StoryPlayer({ data, onCheck, onAbout }) {
  const scenes = useMemo(() => buildScenes(data), [data]);
  const chapters = useMemo(() => scenes.flatMap((item, i) => item.chapter
    ? [{ ...item.chapter, sceneIndex: i, start: playback.timeline[i].start }] : []), [scenes]);
  const initialTime = useRef(playback.timeline[initialScene(scenes.length)].start);
  const [state, setState] = useState({ time: initialTime.current, playing: false, buffering: false, muted: false, volume: 1, rate: 1, error: '' });
  const [isFullscreen, setFullscreen] = useState(false);
  const [started, setStarted] = useState(false);
  const [reduced, setReduced] = useState(prefersReducedMotion);
  const stage = useRef(null), audio = useRef(null), controller = useRef(null), player = useRef(null), settings = useRef(null);
  const sceneAnimations = useRef([]);
  const index = sceneAt(playback.timeline, state.time), scene = scenes[index];
  const last = index === scenes.length - 1, ended = state.time >= playback.duration - 0.05;
  const chapterIndex = Math.max(0, chapters.findLastIndex(item => state.time >= item.start));
  const chapter = chapters[chapterIndex];
  const sceneTime = state.time - playback.timeline[index].start;

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === player.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  useEffect(() => {
    const dismiss = event => {
      if (settings.current?.open && !settings.current.contains(event.target)) settings.current.open = false;
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
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
    for (const animation of sceneAnimations.current) animation.cancel();
    playScene(element, { motion: !reduced && started });
    // Keep ownership after an entry ends: getAnimations() omits non-filling finished effects,
    // but a backward seek still needs to sample those same animations before their cue.
    const animations = element.getAnimations({ subtree: true });
    sceneAnimations.current = animations;
    for (const animation of animations) animation.pause();
    const url = new URL(location.href); url.searchParams.set('scene', index + 1); history.replaceState(null, '', url);
    return () => {
      for (const animation of animations) animation.cancel();
      if (sceneAnimations.current === animations) sceneAnimations.current = [];
    };
  }, [index, reduced, started]);

  useLayoutEffect(() => {
    // Every animation, including idle motion, is held at the same media position. No independent clocks.
    for (const animation of sceneAnimations.current) animation.currentTime = sceneTime * 1000;
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
  const toggleMute = () => {
    if (state.volume === 0) controller.current?.setVolume(1); else controller.current?.mute();
  };
  const onKeyDown = event => {
    if (event.key === 'Escape' && settings.current?.open) {
      settings.current.open = false; settings.current.querySelector('summary').focus(); event.preventDefault(); return;
    }
    if (event.target.closest('.story-settings-panel')) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, select, textarea')) return;
    if (event.key.toLowerCase() === 'j') { event.preventDefault(); seek(state.time - 10); }
    if (event.key.toLowerCase() === 'l') { event.preventDefault(); seek(state.time + 10); }
    if (event.key === 'Home') { event.preventDefault(); seek(0); }
    if (event.key === 'End') { event.preventDefault(); seek(playback.duration); }
    if (event.key === 'ArrowRight') { event.preventDefault(); seek(state.time + 5); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); seek(state.time - 5); }
    if ((event.key === ' ' && !event.target.closest('button, a, summary')) || event.key.toLowerCase() === 'k') { event.preventDefault(); togglePlay(); }
    if (event.key.toLowerCase() === 'm') { event.preventDefault(); toggleMute(); }
    if (event.key.toLowerCase() === 'f') { event.preventDefault(); fullscreen(); }
  };

  return <section ref={player} tabIndex="0" className="story-player" aria-label="Story" aria-roledescription="story player" aria-describedby="story-keyboard-help" onKeyDown={onKeyDown}>
    <StoryDefs />
    <div className="story-frame">
      <div className="story-video">
      <div className="story-brand"><img className="story-logo" src={LOGO} alt="UNDRR" width="425" height="64" /><img className="story-logo story-pw-logo" src={PW_LOGO} alt="PreventionWeb" width="277" height="38" /></div>
      <div className="story-stage" ref={stage} onClick={togglePlay} role="group" aria-roledescription="scene" aria-label={`Scene ${index + 1} of ${scenes.length}: ${scene.label}`}>
        <div key={scene.id} className="story-scene">{scene.stage}</div>
        <p className="mg-u-sr-only">{scene.describe}</p>
        {!started && <button type="button" className="story-start" aria-label="Play video" onClick={event => { event.stopPropagation(); togglePlay(); }}><ControlIcon name="play" /></button>}
      </div>
      <div className="story-controls" role="group" aria-label="Playback controls">
        <label className="story-scrubber">
          <span className="mg-u-sr-only">Playback position</span>
          <input type="range" min="0" max={playback.duration} step="0.1" value={state.time}
            style={{ '--progress': `${state.time / playback.duration * 100}%` }}
            onChange={event => seek(Number(event.target.value))}
            aria-valuetext={`${formatTime(state.time)} of ${formatTime(playback.duration)}: ${chapter.title}, ${scene.label}`} />
          <span className="story-chapter-marks" aria-hidden="true">{chapters.slice(1).map(item => <span key={item.number} style={{ left: `${item.start / playback.duration * 100}%` }} />)}</span>
        </label>
        <div className="story-control-row">
          <ControlButton label={state.playing ? 'Pause' : ended ? 'Replay' : 'Play'} icon={state.playing ? 'pause' : ended ? 'replay' : 'play'} aria-keyshortcuts="Space K" onClick={togglePlay} />
          <ControlButton label="Previous chapter" icon="previous" onClick={() => go(chapters[chapterIndex - 1].sceneIndex)} disabled={chapterIndex === 0} />
          <ControlButton label="Next chapter" icon="next" onClick={() => go(chapters[chapterIndex + 1].sceneIndex)} disabled={chapterIndex === chapters.length - 1} />
          <div className="story-sound">
            <ControlButton label={state.muted || state.volume === 0 ? 'Unmute' : 'Mute'} icon={state.muted || state.volume === 0 ? 'muted' : 'volume'} aria-keyshortcuts="M" onClick={toggleMute} />
            <label className="story-volume"><span className="mg-u-sr-only">Volume</span>
              <input aria-label="Volume" type="range" min="0" max="1" step="0.05" value={state.muted ? 0 : state.volume}
                aria-valuetext={`${Math.round((state.muted ? 0 : state.volume) * 100)} percent`}
                onChange={event => controller.current?.setVolume(Number(event.target.value))} />
            </label>
          </div>
          <span className="story-progress" aria-hidden="true">{formatTime(state.time)} / {formatTime(playback.duration)}</span>
          <div className="story-control-spacer" />
          <details className="story-settings" ref={settings}>
            <summary className="story-control" aria-label="Playback settings" title="Playback settings"><ControlIcon name="settings" /><span className="story-tooltip" aria-hidden="true">Settings</span></summary>
            <div className="story-settings-panel">
              <label className="story-speed">Playback speed
                <select aria-label="Playback speed" value={state.rate} onChange={event => controller.current?.setRate(Number(event.target.value))}>
                  {[0.75, 1, 1.25, 1.5, 2].map(rate => <option key={rate} value={rate}>{rate === 1 ? 'Normal' : `${rate}×`}</option>)}
                </select>
              </label>
              <label className="story-settings-volume">Volume
                <input aria-label="Volume in settings" type="range" min="0" max="1" step="0.05" value={state.muted ? 0 : state.volume}
                  aria-valuetext={`${Math.round((state.muted ? 0 : state.volume) * 100)} percent`}
                  onChange={event => controller.current?.setVolume(Number(event.target.value))} />
              </label>
              <label>Chapter
                <select aria-label="Chapter" value={chapterIndex} onChange={event => go(chapters[Number(event.target.value)].sceneIndex)}>
                  {chapters.map((item, i) => <option key={item.number} value={i}>{item.number}. {item.title}</option>)}
                </select>
              </label>
              <label>Scene
                <select aria-label="Scene" value={index} onChange={event => go(Number(event.target.value))}>
                  {scenes.map((item, i) => <option key={item.id} value={i}>{i + 1}. {item.label}</option>)}
                </select>
              </label>
              <p id="story-keyboard-help">Keyboard: Space or K to play/pause; ←/→ seek 5 seconds; J/L seek 10 seconds; M mutes; F opens fullscreen; Home/End seek to start/end. Escape closes settings.</p>
            </div>
          </details>
          <ControlButton label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} icon={isFullscreen ? 'exit' : 'fullscreen'} aria-keyshortcuts="F" onClick={fullscreen} />
        </div>
      </div>
      </div>
      <div className="story-caption-row">
        <p id="story-caption" className="story-caption" aria-live="polite"><Caption key={scene.id} caption={scene.caption} /></p>
        {last && <div className="story-cta">
          <button type="button" className="mg-button mg-button-primary" onClick={onCheck}>Check your own PDF</button>
          <button type="button" className="mg-button mg-button-secondary mg-button-outline" onClick={onAbout}>Why this matters</button>
        </div>}
        {last && <p className="story-launch-url">PreventionWeb.net/signal-check</p>}
      </div>
    </div>
    <p className="story-playback-status" role="status">{state.error || (state.buffering ? 'Loading playback…' : `Chapter ${chapter.number} of ${chapters.length}: ${chapter.title} · Scene ${index + 1} of ${scenes.length}: ${scene.label}`)}</p>
    <audio ref={audio} preload="none" />
    {reduced && <p className="story-note">Your device is set to reduce motion, so each scene is shown as a still. Playback and audio follow the same timeline.</p>}
    <details className="mg-details story-transcript">
      <summary>Read the transcript</summary>
      {chapters.map((item, c) => <div key={item.number} className="story-transcript-chapter">
        <h3>Chapter {item.number}: {item.title}</h3>
        <ol>{scenes.slice(item.sceneIndex, chapters[c + 1]?.sceneIndex ?? scenes.length).map((entry, offset) => <li key={entry.id}>
          <h4>{item.sceneIndex + offset + 1}. {entry.label}</h4>
          <p><strong>Caption:</strong> {plainCaption(entry.caption)}</p>
          <p><strong>Narration:</strong> {entry.narration}</p>
          <p className="story-describe"><strong>On screen:</strong> {entry.describe}</p>
        </li>)}</ol>
      </div>)}
      <p className="story-describe">The figure and icon illustrations are AI-generated cut-paper images (Nano Banana 2).{` The narration is a synthetic voice (${narration.voiceNote}). The background music is AI-generated (${narration.music.note}).`}</p>
    </details>
  </section>;
}
