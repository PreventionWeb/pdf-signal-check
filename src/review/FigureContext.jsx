import React from 'react';
import { Button } from '../ui/react.jsx';
import { descriptionNote } from './workspace.js';

/** One image: what it is, its saved description, and a link to it in the page viewer (no separate thumbnail). */
export function FigureContext({ finding, targets, onInspect, compact = false }) {
  const figure = finding.comparison.figure;
  const target = targets.find(item => item.page === figure.page) || { page: figure.page, quads: figure.quads || [] };
  const Heading = compact ? 'h4' : 'h3';
  const note = descriptionNote(finding);
  return <section className="figure-context" aria-label="Image and saved description">
    <Heading>Page {figure.page}, {figure.decorative ? 'graphics marked as decorative' : figure.tagged ? `image ${finding.comparison.figureNumber || 1}` : 'unlabelled graphics'}</Heading>
    {figure.alt ? <blockquote>{figure.alt}</blockquote> : <p>{figure.decorative ? 'Marked as decoration, so software following the PDF’s tags may skip these graphics. Check that they convey no essential information.' : figure.tagged ? 'No text description is saved for this image.' : 'These graphics have no image label and are not marked as decoration. They may be background shapes, borders or meaningful content.'}</p>}
    {note && <p className="figure-description-note">{note}</p>}
    <Button onClick={() => onInspect({ ...target, focusRegion: true })}>Show on page {figure.page}</Button>
  </section>;
}
