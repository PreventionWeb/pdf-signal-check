import React, { useState } from 'react';
import { TopicEvidenceExperiment } from './TopicEvidenceExperiment.jsx';

/** Experimental exploration includes successful checks and does not require inference. */
export function SemanticEvidenceLab({ report, documentEvidence, onInspect }) {
  const values = [
    ...(report.metadata?.subject?.trim() ? [{ id: 'subject', label: 'Saved description (Subject)', query: report.metadata.subject, result: report.semantic?.subject }] : []),
    ...[...new Set(String(report.metadata?.keywords || '').split(/[,;\n]/).map(value => value.trim()).filter(Boolean))].map((query, index) => ({
      id: `keyword-${index}`, label: `Keyword: ${query}`, query,
      result: report.semantic?.keywordItems?.find(item => item.keyword === query),
    })),
  ];
  const [selectedId, setSelectedId] = useState(null);
  const selected = values.find(value => value.id === selectedId) || values[0];
  const finding = selected && { source: { path: selected.id === 'subject' ? 'semantic.subject' : 'semantic.keywordItems' },
    comparison: { query: selected.query, retrieval: selected.result?.retrieval, candidates: selected.result?.evidence } };
  return <section className="semantic-evidence-lab" aria-labelledby="semantic-experiment-title">
    <h2 id="semantic-experiment-title">Experiment: find support for saved metadata</h2>
    <p>Does the PDF’s text support its saved description and keywords? This experiment looks beyond the opening pages and shows the passages behind the comparison.</p>
    <ul>
      <li><strong>Normal check:</strong> AI compares these values with short excerpts from the first two pages.</li>
      <li><strong>Experiment:</strong> select a value below to see word matches across the PDF. If you run AI checks, the model also ranks selected passages from across the PDF.</li>
    </ul>
    {selected ? <>
      <label htmlFor="experimental-metadata-value">Document information to compare</label>
      <select id="experimental-metadata-value" className="mg-form-select" value={selected.id} onChange={event => setSelectedId(event.target.value)}>
        {values.map(value => <option key={value.id} value={value.id}>{value.label}</option>)}
      </select>
      <TopicEvidenceExperiment finding={finding} report={report} documentEvidence={documentEvidence} onInspect={onInspect} />
    </> : <p>No saved description or keywords are available for this experiment. A saved title alone is not enough; title checks are unchanged.</p>}
    <p className="model-note">Word matching works without AI or model downloads. The experiment does not change required checks or the score.</p>
  </section>;
}
