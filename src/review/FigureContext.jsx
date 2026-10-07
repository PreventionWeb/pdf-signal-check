import React from 'react';
import { Crop } from '../evidence/Crop.jsx';
import { Button } from '../ui/react.jsx';
export function FigureContext({ finding, file, report, targets, onInspect }) {
  const figure = finding.comparison.figure;
  const target = targets.find(item => item.page === figure.page);
  return <section className="figure-context" aria-label="Image and saved description">
    <h3>{figure.decorative ? 'Graphics marked as decorative' : figure.tagged ? `Image ${finding.comparison.figureNumber || 1}` : 'Unlabelled graphics'} · page {figure.page}</h3>
    <Crop file={file} report={report} targets={targets} fallbackPage wholePage={!!figure.decorative} />
    {figure.tagged && <h4>Saved image description (alt text)</h4>}
    {figure.alt ? <blockquote>{figure.alt}</blockquote> : <p>{figure.decorative ? 'Marked as decoration, so screen readers and AI tools skip these graphics.' : figure.tagged ? 'No text description is saved for this image.' : 'These graphics have no image label and are not marked as decoration. They may be background shapes, borders or meaningful content.'}</p>}
    {target && <Button onClick={() => onInspect({ ...target, focusRegion: true })}>Inspect {figure.tagged ? 'image' : 'graphics'} on page {figure.page}</Button>}
  </section>;
}
