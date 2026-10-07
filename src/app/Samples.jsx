import React, { useEffect, useState } from 'react';
import { Actions, Button, Loader } from '../ui/react.jsx';
import { GoGoViewer } from '../evidence/GoGoViewer.jsx';

const samples = [
  { file: 'well-prepared.pdf', title: 'Well prepared', description: 'Matching metadata, complete text tags, intended reading order and a described figure.' },
  { file: 'partly-prepared.pdf', title: 'Partly prepared', description: 'Some metadata is wrong. Procedure tags read in the wrong order, and the figure description is missing.' },
  { file: 'poorly-prepared.pdf', title: 'Poorly prepared', description: 'Misleading metadata, no declared language, no text tags and no figure description.' },
];

/** Labels describe authored preparation, not predicted analysis outcomes. */
export function Samples({ disabled, onChoose }) {
  const [sampleFile, setSampleFile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const baseUrl = typeof document !== 'undefined' && document.baseURI ? document.baseURI : 'http://localhost/';
    const sampleUrl = new URL('./samples/well-prepared.pdf', baseUrl);
    fetch(sampleUrl)
      .then(res => (res.ok ? res.blob() : null))
      .then(blob => {
        if (active && blob) {
          setSampleFile(new File([blob], 'well-prepared.pdf', { type: 'application/pdf' }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="sample-section" aria-labelledby="sample-title">
      <h2 id="sample-title" tabIndex={-1}>Try a sample</h2>
      <div className="sample-layout">
        <div className="sample-preview">
          {sampleFile ? (
            <GoGoViewer file={sampleFile} compact title="Fictional sample report preview" />
          ) : loading ? (
            <div className="sample-preview-loading">
              <Loader label="Loading sample preview…" />
            </div>
          ) : null}
        </div>
        <div className="sample-details">
          <p className="sample-intro">The same fictional report, with different metadata, tags and figure descriptions.</p>
          <Actions className="sample-actions">
            {samples.map(sample => (
              <Button
                key={sample.file}
                disabled={disabled}
                aria-label={`Check sample: ${sample.title}`}
                onClick={() => onChoose(`./samples/${sample.file}`)}
              >
                {sample.title}
              </Button>
            ))}
          </Actions>
          <div className="sample-descriptions">
            {samples.map(sample => (
              <div className="sample-description-item" key={sample.file}>
                <strong>{sample.title}</strong>
                <p>{sample.description}</p>
              </div>
            ))}
          </div>
          <p className="model-note">Samples illustrate preparation levels; they are not accessibility certificates.</p>
        </div>
      </div>
    </section>
  );
}
