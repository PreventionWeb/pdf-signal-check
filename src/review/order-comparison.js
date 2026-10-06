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

const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
};

/** Compact data-driven illustration; importing this module never accesses the DOM. */
export function createOrderComparison(report) {
  const data = orderComparisonData(report), section = node('section', 'order-map');
  section.append(node('h3', 'order-map-heading', 'Same page, two recovered sequences'));
  if (!data.available) {
    section.append(node('p', 'model-note order-map-unavailable', data.reason));
    return section;
  }
  section.append(node('p', 'order-map-intro', `Page ${data.page} · The same recovered headings, connected by their PDF tags.`));
  const lanes = node('div', 'order-map-lanes');
  for (const [kind, label, description, entries] of [
    ['tagged', 'Tag-tree order', 'Readers using tags may follow this sequence.', data.tagged],
    ['drawing', 'Page drawing order', 'Text recovered from drawing instructions; not intended order.', data.drawing],
  ]) {
    const lane = node('div', `order-map-lane order-map-${kind}`);
    lane.append(node('h4', 'order-map-label', label), node('p', 'order-map-description', description));
    const cards = node('ul', 'order-map-cards');
    entries.forEach((entry, index) => {
      const anomaly = kind === 'tagged' && data.anomalies.find(item => item.to === entry.key);
      const card = node('li', `order-map-card${anomaly ? ' order-map-card-anomaly' : ''}`);
      if (index) {
        const arrow = node('span', `order-map-arrow${anomaly ? ' order-map-arrow-anomaly' : ''}`, '→');
        arrow.setAttribute('aria-hidden', 'true');
        card.append(arrow);
      }
      if (data.numbered) card.append(node('span', 'order-map-step', String(entry.step)));
      card.append(node('span', 'order-map-text', entry.shortText));
      if (entry.shortened) card.title = entry.text;
      cards.append(card);
    });
    lane.append(cards);
    lanes.append(lane);
  }
  section.append(lanes);
  data.anomalies.forEach(anomaly => section.append(node('p', 'order-map-anomaly', `${anomaly.text}${data.numbered?' For dependent instructions, this may change their reading order.':''}`)));
  if (data.omittedItems || data.omittedFindings) section.append(node('p', 'model-note order-map-omissions',
    `${data.omittedItems ? `${data.omittedItems} heading(s) omitted; arrows show selected order, not necessarily adjacent headings. ` : ''}${data.omittedFindings ? `${data.omittedFindings} other order finding(s) not illustrated. ` : ''}Open the recovered text and technical detail for more evidence.`));
  const caveat = data.numbered ? 'A backward jump can be a legitimate numbering restart or reference.' : 'An upward move can reflect deliberate layout or references; page position does not establish meaning.';
  section.append(node('p', 'model-note order-map-limitation', `${caveat} Neither sequence proves the visual or intended reading order, or what a particular AI system will extract. Compare with the original page.`));
  return section;
}
