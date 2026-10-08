import React from 'react';

const samples = [
  { id: 'well-prepared', title: 'Well prepared', description: 'Matching document details, complete tags, the intended reading order and a described chart.' },
  { id: 'partly-prepared', title: 'Partly prepared', description: 'The saved year and authors are wrong, procedure steps read out of order and the chart has no description.' },
  { id: 'poorly-prepared', title: 'Poorly prepared', description: 'Misleading document details, no language, no tags, no chart description and hidden text aimed at AI tools.' },
  { id: 'missing-document-information', title: 'Missing document information', description: 'No saved title, description, keywords or tags. Shows the guidance for basic repairs.' },
  { id: 'with-attachments', title: 'With attachments', description: 'Carries a CSV data file and a text guide. See how attached files are listed and described.' },
  { id: 'graphics-and-decoration', title: 'Graphics and decoration', description: 'Charts with and without descriptions, an unlabelled chart and a logo marked as decoration.' },
  { id: 'image-chart-scrambled-text', title: 'Chart as a picture, text out of order', description: 'Looks finished, but the chart is only pixels, a headline number is drawn apart from its label and the columns are drawn out of order.' },
  { id: 'built-to-travel', title: 'Built to travel', description: 'Adds ways to reuse the findings: a described chart, data table, attached data and publication summary, a linked reference and bookmarks.' },
];

/**
 * Sample reports as native Mangrove horizontal book cards. The title is a button because choosing a sample starts a
 * check; the published card API only accepts links. Labels describe how each sample was prepared, not its result.
 */
export function Samples({ disabled, onChoose }) {
  return (
    <section className="sample-section" aria-labelledby="sample-title">
      <h2 id="sample-title" tabIndex={-1}>Or try a sample report</h2>
      <p className="sample-intro">The same fictional annual report, prepared eight different ways. See how a clear-looking page can still lose meaning and what better preparation changes.</p>
      <ul className="sample-cards">
        {samples.map(sample => (
          <li key={sample.id}>
            <article className={`mg-card mg-card__hc mg-card-book__hc sample-card ${disabled ? 'is-disabled' : ''}`}>
              <div className="mg-card__visual">
                <img src={`./images/samples/${sample.id}.svg`} alt="" className="mg-card__image" width="300" height="400" />
              </div>
              <div className="mg-card__content">
                <div className="mg-card__meta"><span className="mg-card__label">Sample</span></div>
                <header className="mg-card__title">
                  <button type="button" className="sample-card-button" disabled={disabled}
                    aria-label={`Check sample: ${sample.title}`} onClick={() => onChoose(`./samples/${sample.id}.pdf`)}>
                    {sample.title}
                  </button>
                </header>
                <p className="mg-card__summary">{sample.description}</p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
