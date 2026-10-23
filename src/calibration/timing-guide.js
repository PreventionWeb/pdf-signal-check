import { SPEED_POLICY } from './preferences.js';

/** Product responsiveness guides for the fixed workload, not hardware requirements. */
export const TIMING_GUIDES = Object.freeze({
  preparation: { label: 'PDF preparation', targetMs: 2000 },
  startup: { label: 'AI model startup', targetMs: 30000 },
  comparison: { label: 'AI text comparisons', targetMs: SPEED_POLICY.okMs },
});
export function timingGuide(kind, ms) {
  const guide = TIMING_GUIDES[kind];
  if (!guide || !Number.isFinite(ms) || ms < 0) return null;
  return { ...guide, ms, percent: Math.min(100, ms / guide.targetMs * 100),
    rating: ms > guide.targetMs ? 'Slow' : kind === 'comparison' && ms <= SPEED_POLICY.greatMs ? 'Fast' : 'OK' };
}
