import React from 'react';
import { Crop } from '../evidence/Crop.jsx';
import { Button } from '../ui/react.jsx';
export function FigureContext({ finding, file, report, targets, onInspect }) {
  const figure = finding.comparison.figure;
  const target = targets.find(item => item.page === figure.page);
  return <section className="figure-context" aria-label="Image and saved description">
    <h3>Image {finding.comparison.figureNumber || 1} · page {figure.page}</h3>
    <Crop file={file} report={report} targets={targets} fallbackPage />
    <h4>Saved image description (alt text)</h4>
    {figure.alt ? <blockquote>{figure.alt}</blockquote> : <p>No text description is saved for this image.</p>}
    {target && <Button onClick={() => onInspect({ ...target, focusRegion: true })}>Inspect image on page {figure.page}</Button>}
  </section>;
}
