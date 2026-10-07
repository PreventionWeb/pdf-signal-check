import React, { useEffect, useState } from 'react';
import { Button, Loader } from '../ui/react.jsx';
import { GoGoViewer } from '../evidence/GoGoViewer.jsx';

const samples = [
  { file: 'well-prepared.pdf', title: 'Well prepared', description: 'Matching metadata, complete text tags, intended reading order and a described figure.' },
  { file: 'partly-prepared.pdf', title: 'Partly prepared', description: 'Some metadata is wrong. Procedure tags read in the wrong order, and the figure description is missing.' },
  { file: 'poorly-prepared.pdf', title: 'Poorly prepared', description: 'Misleading metadata, no declared language, no text tags and no figure description.' },
];

/** Labels describe authored preparation, not predicted analysis outcomes. */
export function Samples({ disabled, onChoose, onBack }) {
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
      <div className="sample-header">
        <h2 id="sample-title" tabIndex={-1}>Try a sample</h2>
        {onBack && (
          <Button variant="secondary" disabled={disabled} onClick={onBack}>
            or drop a PDF
          </Button>
        )}
      </div>
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
          <div className="sample-options">
            {samples.map(sample => (
              <div className="sample-option" key={sample.file}>
                <Button
                  disabled={disabled}
                  aria-label={`Check sample: ${sample.title}`}
                  onClick={() => onChoose(`./samples/${sample.file}`)}
                >
                  {sample.title}
                </Button>
                <p>{sample.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
