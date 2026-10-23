import { SPEED_POLICY } from './preferences.js';

/** Product responsiveness guides for the fixed workload, not hardware requirements. */
export const TIMING_GUIDES = Object.freeze({
  preparation: { label: 'Preparing the sample PDF', targetMs: 2000 },
  startup: { label: 'Getting the AI model ready', targetMs: 30000 },
  comparison: { label: 'Comparing the sample text', targetMs: SPEED_POLICY.okMs },
});
const validTiming = ms => Number.isFinite(ms) && ms >= 0;

export function timingGuide(kind, ms) {
  const guide = TIMING_GUIDES[kind];
  if (!guide || !validTiming(ms)) return null;
  return { ...guide, ms,
    rating: ms > guide.targetMs ? 'Slow' : kind === 'comparison' && ms <= SPEED_POLICY.greatMs ? 'Fast' : 'OK' };
}

/** Rounded reading aid only. Never round a guide crossing back onto its boundary. */
export function observedDuration(kind, ms) {
  const guide = timingGuide(kind, ms);
  if (!guide) return 'Not measured';
  const perRun = kind === 'comparison';
  const suffix = perRun ? ' per sample run' : '';
  if (ms < 1000) return `${perRun ? 'Less' : 'Took less'} than 1 second${suffix}`;
  const seconds = kind === 'comparison' && ms === SPEED_POLICY.greatMs
    ? ms / 1000 : Math.round(ms / 1000);
  if (ms > guide.targetMs && seconds <= guide.targetMs / 1000) {
    return `${perRun ? 'Just' : 'Took just'} over ${guide.targetMs / 1000} seconds${suffix}`;
  }
  return `${perRun ? 'About' : 'Took about'} ${seconds} ${seconds === 1 ? 'second' : 'seconds'}${suffix}`;
}

/** Retain the recorded precision; the downloadable receipt remains unchanged. */
export function exactDuration(ms) {
  return validTiming(ms) ? `${ms / 1000} ${ms === 1000 ? 'second' : 'seconds'} (${ms} ms)` : 'Not measured';
}
