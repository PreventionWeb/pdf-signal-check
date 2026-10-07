// DOM-only motion for the story stage. Each animated element's markup is its final frame; animations play
// from an entry state into it (fill: 'backwards'), so reduced motion simply skips them and shows the finished
// scene. Timing uses Mangrove's standard easing; durations extend Mangrove's 160/300 ms tokens for narrative beats.
export const EASING = 'cubic-bezier(0.2, 0, 0, 1)';
export const DWELL = 2600;
export const REDUCED_DWELL = 6000;

const entry = {
  fade: () => [{ opacity: 0 }, { opacity: 1 }],
  rise: () => [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }],
  drop: () => [{ opacity: 0, transform: 'translateY(-28px)' }, { opacity: 1, transform: 'none' }],
  slide: () => [{ opacity: 0, transform: 'translateX(-28px)' }, { opacity: 1, transform: 'none' }],
  pop: () => [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'scale(1)' }],
  draw: () => [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
  travel: element => {
    const [dx, dy] = (element.dataset.from || '0,0').split(',').map(Number);
    return [{ opacity: 0, transform: `translate(${dx}px, ${dy}px)` }, { opacity: 1, offset: 0.15 }, { opacity: 1, transform: 'none' }];
  },
  // Exploded layers: the final transform is in the element's own style; enter from the collapsed stack.
  unfold: element => [{ transform: 'none', opacity: 0.6 }, { transform: getComputedStyle(element).transform, opacity: 1 }],
};

/** Start a scene's entry animations; returns the scene length in ms (0 when motion is off). */
export function playScene(stage, { motion }) {
  if (!stage || !motion) return 0;
  let end = 0;
  for (const element of stage.querySelectorAll('[data-anim]')) {
    const kind = element.dataset.anim, make = entry[kind];
    if (!make) continue;
    const delay = Number(element.dataset.delay || 0), duration = Number(element.dataset.dur || 700);
    let frames = make(element);
    if (element instanceof SVGElement) {
      element.style.transformBox = 'fill-box'; element.style.transformOrigin = 'center';
      // A CSS transform replaces the SVG transform attribute while it runs, so carry the element's own
      // translate into every keyframe; otherwise it would jump to the origin mid-animation.
      const base = (element.getAttribute('transform') || '').replace(/translate\(\s*([-\d.]+)[\s,]+([-\d.]+)\s*\)/g, 'translate($1px, $2px)').trim();
      if (base) frames = frames.map(frame => frame.transform || 'transform' in frame ? { ...frame, transform: `${base} ${frame.transform === 'none' ? '' : frame.transform || ''}`.trim() } : frame);
    }
    element.animate(frames, { duration, delay, easing: EASING, fill: 'backwards' });
    end = Math.max(end, delay + duration);
  }
  return end;
}

/** Pause or resume every running animation on the stage, including the dwell clock. */
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
