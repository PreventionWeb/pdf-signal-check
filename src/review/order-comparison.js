const LIMIT = 8;
const normalized = text => String(text || '').replace(/\s+/g, ' ').trim();
const finiteQuad = block => block.quad?.length === 4 && block.quad.every(point => point?.length === 2 && point.every(Number.isFinite));
const numberIn = text => {
  const match = String(text || '').match(/^\s*(\d{1,3})[.)]\s+\S/);
  return match ? Number(match[1]) : null;
};
const unavailable = reason => ({ available: false, reason });

/** Align actual detector evidence through unique MCID keys, never filenames or expected order. */
export function orderComparisonData(report) {
  const findings = report?.readingOrder?.findings || [];
  for (const finding of findings.slice(0, 8)) {
    if (!['numbered-step-sequence', 'single-alignment-heading-geometry'].includes(finding.detector)) continue;
    const page = report.pages?.find(candidate => candidate.number === finding.page);
    const evidence = finding.evidence || [];
    if (!page || evidence.length < 3 || evidence.length > 200) continue;
    const keys = evidence.map(block => block.key || (block.keys?.length === 1 ? block.keys[0] : null));
    if (keys.some(key => typeof key !== 'string' || !key) || new Set(keys).size !== keys.length) continue;
    const logical = page.logicalBlocks || [], physical = page.blocks || [];
    if (logical.length > 10000 || physical.length > 10000) continue;
    const entries = evidence.map((block, index) => {
      const key = keys[index], matches = logical.filter(item => item.key === key);
      const draws = physical.map((item, position) => ({ item, position })).filter(draw => draw.item.key === key);
      if (!normalized(block.text) || matches.length !== 1 || !draws.length || !draws.every(draw => finiteQuad(draw.item) && draw.item.connected !== false && !draw.item.suspicious)) return null;
      // Interleaved reuse of a key cannot establish one uniquely aligned occurrence.
      if (draws.at(-1).position - draws[0].position + 1 !== draws.length) return null;
      if (normalized(matches[0].text) !== normalized(block.text) || normalized(draws.map(draw => draw.item.text).join(' ')) !== normalized(block.text)) return null;
      return { key, text: normalized(block.text), step: numberIn(block.text), position: draws[0].position,
        logicalPosition: logical.indexOf(matches[0]), y: Math.max(...draws.flatMap(draw => draw.item.quad.map(point => point[1]))) };
    });
    if (entries.some(entry => !entry) || entries.some((entry, index) => index && entry.logicalPosition <= entries[index - 1].logicalPosition)) continue;
    const numbered = finding.detector === 'numbered-step-sequence';
    if (numbered && entries.some(entry => entry.step === null || entry.step <= 0)) continue;
    const anomalies = entries.flatMap((entry, index) => {
      if (!index) return [];
      const previous = entries[index - 1];
      if (numbered && entry.step <= previous.step) return [{ from: previous.key, to: entry.key,
        text: entry.step === previous.step ? `Tag-tree order repeats step ${entry.step}.` : `Tag-tree order jumps backwards: ${previous.step} → ${entry.step}.` }];
      if (!numbered && entry.y > previous.y + 30) return [{ from: previous.key, to: entry.key, text: 'Tag-tree order moves upward between these headings.' }];
      return [];
    });
    if (!anomalies.length) continue;
    const firstAnomaly = entries.findIndex(entry => entry.key === anomalies[0].to);
    const start = Math.max(0, Math.min(firstAnomaly - 3, entries.length - LIMIT));
    const selected = entries.slice(start, start + LIMIT), selectedKeys = new Set(selected.map(entry => entry.key));
    const shorten = entry => {
      const label = numbered ? entry.text.replace(/^\d{1,3}[.)]\s+/, '') : entry.text;
      return { ...entry, shortText: label.length > 78 ? `${label.slice(0, 77)}…` : label, shortened: label.length > 78 };
    };
    return { available: true, page: page.number, detector: finding.detector, numbered,
      tagged: selected.map(shorten), drawing: [...selected].sort((a, b) => a.position - b.position).map(shorten),
      anomalies: anomalies.filter(anomaly => selectedKeys.has(anomaly.from) && selectedKeys.has(anomaly.to)),
      omittedItems: entries.length - selected.length, omittedFindings: findings.length - 1 };
  }
  return unavailable('An illustration is unavailable: this result does not contain a uniquely aligned set of located headings in both recovered sequences. Inspect the recovered text and page; intended order remains unverified.');
}
