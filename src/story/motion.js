// DOM-only motion for the story stage, in a cut-paper stop-motion style. Each animated element's markup is its
// final frame; animations play from an entry state into it (fill: 'backwards'), so reduced motion simply skips
// them and shows the composed scene. Movement is sampled "on twos" (12 frames a second) and each frame is held,
// with a damped overshoot and a little hand-placed jitter, so pieces drop, overshoot and settle like paper.
// Paper is never translucent: pieces arrive fully opaque from beyond the stage edge or from scale. Only `fade`
// (used for strings and marker lines) ramps opacity, and a piece waiting for its cue is simply not shown yet.
export const FPS = 12;

/** Deterministic jitter per element so a scene looks the same every time it plays. */
const noise = seed => { const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
/** Damped overshoot: 0 → about 1.1 → settles at 1. */
const settle = t => t >= 1 ? 1 : 1 - Math.exp(-6 * t) * Math.cos(2.6 * Math.PI * t);

/**
 * How far a piece must move, in its own coordinates, to sit just beyond one edge of the visible stage.
 * Measured from the laid-out final frame, so it works for nested pieces and for the cropped mobile stage.
 */
function offStage(element, stage, side) {
  const box = element.getBoundingClientRect(), edge = stage.getBoundingClientRect();
  const scale = element.getScreenCTM?.()?.a || 1, gap = 24;
  const distance = { top: -(box.bottom - edge.top + gap), bottom: edge.bottom - box.top + gap, left: -(box.right - edge.left + gap), right: edge.right - box.left + gap }[side];
  return distance / scale;
}

/** Entry states, as offsets from the final frame: x/y in px, r in degrees, s scale, sy vertical scale. */
const entry = {
  drop: (el, n, stage) => ({ y: offStage(el, stage, 'top'), r: (n - 0.5) * 26 }),
  rise: (el, n, stage) => ({ y: offStage(el, stage, 'bottom'), r: (n - 0.5) * 14 }),
  left: (el, n, stage) => ({ x: offStage(el, stage, 'left'), r: -8 - n * 6 }),
  right: (el, n, stage) => ({ x: offStage(el, stage, 'right'), r: 8 + n * 6 }),
  pop: (el, n) => ({ s: 0.05, r: (n - 0.5) * 40 }),
  slap: (el, n) => ({ s: 1.7, r: (n - 0.5) * 30 }),
  grow: () => ({ sy: 0 }),
  fade: () => ({ still: true }),
  travel: el => { const [x, y] = (el.dataset.from || '0,0').split(',').map(Number); return { x, y, r: -10, arc: -120 }; },
  swing: (el, n) => ({ r: 24 + n * 10, swing: true }),
};

/** Hidden until its cue, then opaque from the first frame. */
const cue = list => [{ ...list[0], opacity: 0, offset: 0, easing: 'steps(1, end)' }, { ...list[0], opacity: 1, offset: 0.0001 }, ...list.slice(1)];

/**
 * A tour: one piece visits several stops in turn, settling and pausing at each, and ends in its own place.
 * data-tour lists the earlier stops as "dx,dy;dx,dy" offsets from the final position.
 */
function tourFrames(element, duration, seed) {
  const stops = [...element.dataset.tour.split(';').map(stop => stop.split(',').map(Number)), [0, 0]];
  const legs = stops.length - 1, steps = Math.max(4, Math.round(duration / 1000 * FPS)), list = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, leg = Math.min(legs - 1, Math.floor(t * legs)), local = t * legs - leg;
    const move = Math.min(1, local / 0.45), p = settle(move);
    const [ax, ay] = stops[leg], [bx, by] = stops[leg + 1];
    const lift = Math.sin(Math.PI * Math.min(move, 1)) * -70 * (move < 1 ? 1 : 0);
    const wob = i === steps ? 0 : (noise(seed + i) - 0.5) * 1.6;
    list.push({ transform: `translate(${(ax + (bx - ax) * p).toFixed(1)}px, ${(ay + (by - ay) * p + lift).toFixed(1)}px) rotate(${wob.toFixed(2)}deg)`, offset: t, easing: 'steps(1, end)' });
  }
  return list;
}

function frames(from, steps, seed) {
  const list = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (from.still) { list.push({ opacity: t, offset: t }); continue; }  // fade only
    let p = settle(t);
    if (from.swing) p = 1 - Math.exp(-4.5 * t) * Math.cos(3 * Math.PI * t);
    const k = 1 - p, wob = i === steps ? 0 : (noise(seed + i) - 0.5) * 1.4 * (1 - t);
    const lift = from.arc ? Math.sin(Math.PI * Math.min(t * 1.25, 1)) * from.arc : 0;
    const transform = `translate(${((from.x || 0) * k).toFixed(1)}px, ${((from.y || 0) * k + lift).toFixed(1)}px) rotate(${((from.r || 0) * k + wob).toFixed(2)}deg) scale(${(1 + ((from.s ?? 1) - 1) * k).toFixed(3)}, ${(1 + ((from.sy ?? from.s ?? 1) - 1) * k).toFixed(3)})`;
    list.push({ transform, offset: t, easing: 'steps(1, end)' });
  }
  return from.still ? list : cue(list);
}

function prepare(element) {
  if (!(element instanceof SVGElement)) return;
  element.style.transformBox = 'fill-box';
  element.style.transformOrigin = element.dataset.origin || 'center';
}

/** Build scene animations. The player pauses and samples every one against its media clock. */
export function playScene(stage, { motion }) {
  if (!stage || !motion) return 0;
  let end = 0, seed = 1;
  // Measure every piece in its final place before any motion moves a parent.
  const pieces = [...stage.querySelectorAll('[data-anim]')].map(element => {
    seed += 7;
    const kind = element.dataset.anim, n = noise(seed);
    prepare(element);
    return { element, kind, seed, from: entry[kind]?.(element, n, stage) };
  });
  for (const { element, kind, seed: own, from } of pieces) {
    const delay = Number(element.dataset.delay || 0), duration = Number(element.dataset.dur || 700);
    const steps = Math.max(2, Math.round(duration / 1000 * FPS));
    if (kind === 'draw') {
      // A marker stroke drawn by hand: dash offset in held steps.
      element.animate(Array.from({ length: steps + 1 }, (_, i) => ({ strokeDashoffset: 1 - i / steps, offset: i / steps, easing: 'steps(1, end)' })), { duration, delay, fill: 'backwards' });
    } else if (kind === 'tour') {
      element.animate(cue(tourFrames(element, duration, own)), { duration, delay, fill: 'backwards' });
    } else if (from) {
      element.animate(frames(from, steps, own), { duration, delay, fill: 'backwards' });
    } else continue;
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
