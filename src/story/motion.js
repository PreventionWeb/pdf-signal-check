// DOM-only motion for the story stage, in a cut-paper stop-motion style. Each animated element's markup is its
// final frame; animations play from an entry state into it (fill: 'backwards'), so reduced motion simply skips
// them and shows the composed scene. Movement is sampled "on twos" (12 frames a second) and each frame is held,
// with a damped overshoot and a little hand-placed jitter, so pieces drop, overshoot and settle like paper.
export const FPS = 12;
export const HOLD = 1100;          // minimum hold after the last entry motion before auto-advance
export const REDUCED_DWELL = 6000; // still frames: time to read each scene when playing with reduced motion

/** Deterministic jitter per element so a scene looks the same every time it plays. */
const noise = seed => { const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
/** Damped overshoot: 0 → about 1.1 → settles at 1. */
const settle = t => t >= 1 ? 1 : 1 - Math.exp(-6 * t) * Math.cos(2.6 * Math.PI * t);

/** Entry states, as offsets from the final frame: x/y in px, r in degrees, s scale, sy vertical scale. */
const entry = {
  drop: (el, n) => ({ y: -170, r: (n - 0.5) * 26, o: 0 }),
  rise: (el, n) => ({ y: 130, r: (n - 0.5) * 14, o: 0 }),
  left: (el, n) => ({ x: -300, r: -8 - n * 6, o: 0 }),
  right: (el, n) => ({ x: 300, r: 8 + n * 6, o: 0 }),
  pop: (el, n) => ({ s: 0.2, r: (n - 0.5) * 40, o: 0 }),
  slap: (el, n) => ({ s: 1.7, r: (n - 0.5) * 30, o: 0 }),
  grow: () => ({ sy: 0, o: 1 }),
  fade: () => ({ o: 0, still: true }),
  travel: el => { const [x, y] = (el.dataset.from || '0,0').split(',').map(Number); return { x, y, r: -10, o: 0, arc: -120 }; },
  swing: (el, n) => ({ r: 24 + n * 10, o: 1, swing: true }),
};

function frames(from, steps, seed) {
  const list = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (from.still) { list.push({ opacity: t, offset: t }); continue; }
    let p = settle(t);
    if (from.swing) p = 1 - Math.exp(-4.5 * t) * Math.cos(3 * Math.PI * t);
    const k = 1 - p, wob = i === steps ? 0 : (noise(seed + i) - 0.5) * 1.4 * (1 - t);
    const lift = from.arc ? Math.sin(Math.PI * Math.min(t * 1.25, 1)) * from.arc : 0;
    const transform = `translate(${((from.x || 0) * k).toFixed(1)}px, ${((from.y || 0) * k + lift).toFixed(1)}px) rotate(${((from.r || 0) * k + wob).toFixed(2)}deg) scale(${(1 + ((from.s ?? 1) - 1) * k).toFixed(3)}, ${(1 + ((from.sy ?? from.s ?? 1) - 1) * k).toFixed(3)})`;
    list.push({ transform, opacity: Math.min(1, (from.o ?? 1) + t * 3), offset: t, easing: 'steps(1, end)' });
  }
  return list;
}

function prepare(element) {
  if (!(element instanceof SVGElement)) return;
  element.style.transformBox = 'fill-box';
  element.style.transformOrigin = element.dataset.origin || 'center';
}

/** Start a scene's entry and idle animations; returns the entry length in ms (0 when motion is off). */
export function playScene(stage, { motion }) {
  if (!stage || !motion) return 0;
  let end = 0, seed = 1;
  for (const element of stage.querySelectorAll('[data-anim]')) {
    const kind = element.dataset.anim;
    seed += 7;
    const delay = Number(element.dataset.delay || 0), duration = Number(element.dataset.dur || 700);
    prepare(element);
    if (kind === 'draw') {
      // A marker stroke drawn by hand: dash offset in held steps.
      const steps = Math.max(2, Math.round(duration / 1000 * FPS));
      element.animate(Array.from({ length: steps + 1 }, (_, i) => ({ strokeDashoffset: 1 - i / steps, offset: i / steps, easing: 'steps(1, end)' })), { duration, delay, fill: 'backwards' });
    } else {
      const make = entry[kind];
      if (!make) continue;
      const steps = Math.max(2, Math.round(duration / 1000 * FPS));
      element.animate(frames(make(element, noise(seed)), steps, seed), { duration, delay, fill: 'backwards' });
    }
    end = Math.max(end, delay + duration);
  }
  // Idle "boil": settled pieces nudge between a few held poses, like paper under a rostrum camera.
  for (const element of stage.querySelectorAll('[data-idle]')) {
    seed += 13;
    prepare(element);
    const amount = Number(element.dataset.idle || 1);
    const own = element.dataset.anim ? Number(element.dataset.delay || 0) + Number(element.dataset.dur || 700) : end;
    const poses = [0, 1, 2, 3].map(i => ({ transform: `rotate(${((noise(seed + i) - 0.5) * 1.6 * amount).toFixed(2)}deg) translateY(${((noise(seed + i + 9) - 0.5) * 3 * amount).toFixed(1)}px)`, easing: 'steps(1, end)' }));
    element.animate([...poses, poses[0]], { duration: 1800 + noise(seed) * 900, delay: own, iterations: Infinity });
  }
  return end;
}

/** Pause or resume every running animation on the stage, including the advance clock. */
export function setPaused(stage, paused) {
  for (const animation of stage?.getAnimations({ subtree: true }) || []) paused ? animation.pause() : animation.play();
}

/** A pausable timer built from an animation, so pausing the stage also pauses auto-advance. */
export function startClock(stage, duration, onDone) {
  if (!stage) return null;
  const clock = stage.animate([{ outlineColor: 'transparent' }, { outlineColor: 'transparent' }], { duration });
  clock.onfinish = onDone;
  return clock;
}
