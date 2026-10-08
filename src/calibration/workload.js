export const BENCHMARK_TIMEOUT_MS=300_000;
export const WORKLOAD = Object.freeze({ id:'synthetic-browser-cost-v1', fixture:'01-clean-text.pdf', measuredRuns:3,
  texts:['Coastal water quality report','Bericht über Wasserqualität an der Küste',
    'A fictional coastal station records water clarity, seasonal rainfall, sample dates and uncertainty. '.repeat(12),
    'Eine fiktive Küstenstation dokumentiert Wasserqualität, Regen, Messzeiten und Unsicherheit. '.repeat(12)] });
export function summarizeRuns(runs) {
  if(runs.length!==3 || runs.some(n=>!Number.isFinite(n)||n<0))throw new Error('Three completed finite measurements are required.');
  const sorted=[...runs].sort((a,b)=>a-b);return {medianMs:sorted[1],minimumMs:sorted[0],maximumMs:sorted[2],runsMs:[...runs]};
}
