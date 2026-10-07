/** Presentation-only count. Unresolved checks stay in the denominator; AI is separate. */
export function requiredCheckScore(report) {
  const checks = (report.checks || []).filter(check => check.required && check.status !== 'not-applicable');
  if (!report.analysisComplete || !checks.length) return null;
  const passed = checks.filter(check => check.status === 'pass').length;
  return { passed, total: checks.length, percent: Math.floor(passed / checks.length * 100),
    openEnded: passed < checks.length && !checks.some(check => check.status === 'fail') };
}
