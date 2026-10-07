import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SemanticEvidenceLab } from '../src/review/SemanticEvidenceLab.jsx';
import { buildDocumentEvidence, selectTopicEvidence } from '../src/engine/topic-retrieval.js';
const pages = [{ number: 7, blocks: [{ id: 1, key: '7:1', text: 'Flood preparedness includes monitoring river levels and training responders.' }] }];
const documentEvidence = buildDocumentEvidence(pages);
const render = report => renderToStaticMarkup(React.createElement(SemanticEvidenceLab, { report, documentEvidence, onInspect() {} }));
describe('experiment evidence visibility', () => {
  it('shows inspectable word evidence without attributing an AI result when inference has not run', () => {
    const markup = render({ metadata: { subject: 'Flood preparedness', keywords: 'river levels' } });
    expect(markup).toContain('Inspect page 7');
    expect(markup).toContain('Not run for this comparison');
    expect(markup).not.toContain('The AI ranked this passage highest');
    expect(markup).toContain('Keyword: river levels');
  });
  it('makes successful AI comparisons visible and keeps their recorded evidence separate from word matching', () => {
    const selected = selectTopicEvidence('Flood preparedness', documentEvidence);
    const markup = render({ metadata: { subject: 'Flood preparedness' }, semantic: { subject: { status: 'semantically-related', retrieval: selected.receipt, evidence: [{ page: 9, text: 'Recorded model passage about evacuations.' }] } } });
    expect(markup).toContain('Inspect page 7');
    expect(markup).toContain('Inspect AI evidence on page 9');
    expect(markup).toContain('Recorded model passage about evacuations.');
  });
});
