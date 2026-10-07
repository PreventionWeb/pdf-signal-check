import { describe, it, expect } from 'vitest';
import { findingGroups, profileReceipt, profileReasons } from '../src/review/workspace.js';

describe('results presentation preserves independent outcomes', () => {
  it('separates missing evidence, tool scope and AI coverage from detected defects', () => {
    const findings = [
      { id: 'defect', category: 'required-defect', source: { checkId: 'language' } },
      { id: 'concern', category: 'advisory-concern', source: { path: 'authorConsistency' } },
      { id: 'review', category: 'required-indeterminate', source: { checkId: 'structure' } },
      { id: 'scope', category: 'unassessed', source: { checkId: 'supported-content' } },
      { id: 'ai', category: 'unassessed', source: { path: 'semantic.sectionCoverage' } },
      { id: 'figure', category: 'success', source: { path: 'figureAlternatives.items[0]' } },
    ];
    const before = structuredClone(findings), groups = findingGroups(findings);
    expect(groups.problems.map(f => f.id)).toEqual(['defect', 'concern']);
    expect(groups.uncertainty.map(f => f.id)).toEqual(['review']);
    expect(groups.limits.map(f => f.id)).toEqual(['scope']);
    expect(groups.coverage.map(f => f.id)).toEqual(['ai']);
    expect(groups.success.map(f => f.id)).toEqual(['figure']);
    expect(Object.values(groups).flat()).toHaveLength(findings.length);
    expect(findings).toEqual(before);
  });
  it('keeps a scope-limited profile unestablished despite zero detected defects', () => {
    const report = { accepted: false, checks: [{ id: 'supported-content', label: 'Content scope', status: 'indeterminate', summary: 'Meaningful graphics need separate analysis.' }] };
    expect(profileReceipt(report)).toBe('Required text checks not established');
    expect(profileReasons(report)).toEqual(['Content scope: Meaningful graphics need separate analysis.']);
    expect(profileReceipt({ ...report, checks: [{ id: 'language', status: 'fail' }] })).toBe('Required text defects found');
    expect(profileReceipt({ accepted: true, checks: [] })).toBe('Required text checks passed');
  });
});
