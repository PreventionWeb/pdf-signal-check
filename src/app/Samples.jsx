import React from 'react';
import { Button, Card, Icon } from '../ui/react.jsx';

const samples = [
  { file: 'well-prepared.pdf', title: 'Well prepared', description: 'Matching metadata, complete text tags, intended reading order and a described figure.' },
  { file: 'partly-prepared.pdf', title: 'Partly prepared', description: 'Some metadata is wrong. Procedure tags read in the wrong order, and the figure description is missing.' },
  { file: 'poorly-prepared.pdf', title: 'Poorly prepared', description: 'Misleading metadata, no declared language, no text tags and no figure description.' },
];

/** Labels describe authored preparation, not predicted analysis outcomes. */
export function Samples({ disabled, onChoose }) {
  return <section className="sample-section" aria-labelledby="sample-title">
    <p className="eyebrow">Try it first</p>
    <h2 id="sample-title" tabIndex={-1}>Same report, three ways</h2>
    <p className="sample-intro">Each PDF looks the same: authors, a 2025 report title, paragraphs, a two-column procedure and a figure. Only its metadata, tags and alternate text differ. Compare what machines recover.</p>
    <div className="sample-grid mg-grid mg-grid__col-3">
      {samples.map(sample => <Card as="article" className="sample-option" key={sample.file}>
        <h3 className="mg-card__title">{sample.title}</h3>
        <p className="mg-card__summary">{sample.description}</p>
        <Button disabled={disabled} aria-label={`Check sample: ${sample.title}`} onClick={() => onChoose(`./samples/${sample.file}`)}>Check this sample <Icon name="arrow-right" /></Button>
      </Card>)}
    </div>
    <p className="model-note">Fictional examples, not accessibility certificates. Even the well-prepared version needs visual review of reading order and figures.</p>
  </section>;
}
