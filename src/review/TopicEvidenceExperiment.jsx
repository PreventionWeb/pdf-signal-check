import React, { useMemo } from 'react';
import { selectTopicEvidence } from '../engine/topic-retrieval.js';
import { Button } from '../ui/react.jsx';

export function TopicEvidenceExperiment({ finding, report, documentEvidence, onInspect }) {
  const query = finding.comparison?.query || report.metadata?.subject;
  const retrieved = useMemo(() => selectTopicEvidence(query, documentEvidence), [query, documentEvidence]);
  const actual = finding.comparison?.retrieval;
  const baseline = actual ? actual.baseline : retrieved.receipt.baseline;
  const modelPassage = actual ? finding.comparison.candidates?.[0] : null;
  const coverage = actual || retrieved.receipt;
  return <section className="topic-evidence-experiment" aria-label="Experimental supporting text comparison">
    <h3>Where this wording appears in the PDF</h3>
    <p className="model-note">Experimental comparison: {coverage.retainedPassages} of {coverage.scannedPassages} excerpts retained from {coverage.totalPages} pages. This is a bounded search, not a full-document validation.</p>
    <p className="topic-saved-value"><strong>Saved {finding.source.path.includes('keyword') ? 'keyword' : 'description'}:</strong> {query}</p>
    <div className="topic-comparison-grid">
      <section><h4>Best passage by matching words</h4>
        {baseline ? <><blockquote>{baseline.text}</blockquote><p className="model-note">Page {baseline.page} · Matching words: {baseline.matchedWords.join(', ')}. Word overlap cannot verify meaning.</p><Button onClick={() => onInspect(baseline)}>Inspect page {baseline.page}</Button></> : <p>No matching words were found in the retained excerpts. Different wording or omitted passages may still support this value.</p>}
      </section>
      <section><h4>Best passage by AI similarity</h4>
      {modelPassage ? <>
        <blockquote>{modelPassage.modelInput?.consumedText || modelPassage.text}</blockquote>
        <p className="model-note">Page {modelPassage.page} · The AI ranked this passage highest among {coverage.selectedPassages} selected excerpts. Related wording does not establish accuracy.</p>
        <Button onClick={() => onInspect(modelPassage)}>Inspect AI evidence on page {modelPassage.page}</Button>
      </> : <p>Not run for this comparison. Enable the description or keyword check in Settings and run AI checks to compare the model’s choice with the word match. Word matching above needs no model download.</p>}
      </section>
    </div>
  </section>;
}
