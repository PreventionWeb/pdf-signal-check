/** Presentation only: preserve every recorded outcome and the independent profile receipt. */
export function findingGroups(findings) {
  const groups = { problems: [], uncertainty: [], limits: [], success: [], coverage: [] };
  for (const finding of findings) {
    const semantic = finding.source?.path?.startsWith('semantic');
    if (semantic && finding.category === 'unassessed') groups.coverage.push(finding);
    else if (finding.source?.checkId === 'supported-content' && finding.category !== 'success' && finding.category !== 'required-defect') groups.limits.push(finding);
    else if (['required-defect', 'advisory-concern'].includes(finding.category)) groups.problems.push(finding);
    else if (finding.category === 'success') groups.success.push(finding);
    else groups.uncertainty.push(finding);
  }
  return groups;
}
export function profileReceipt(report) {
  if (report.accepted) return 'Required text checks passed';
  if (report.checks?.some(check => check.status === 'fail')) return 'Required text defects found';
  return 'Required text checks not established';
}
export function profileReasons(report) {
  return (report.checks || []).filter(check => !['pass', 'not-applicable'].includes(check.status))
    .map(check => `${check.label || check.id}: ${check.summary || check.status}`);
}
