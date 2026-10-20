import React from "react";

const RADIUS = 26, CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const auditMark = score => score == null ? "Not checked" : score >= 1 ? "Passed" : score <= 0 ? "Not passed" : `Partly (${Math.round(score * 100)}%)`;

/** One Lighthouse-style ring: red below 50, amber below 90, green from 90. */
function Gauge({ category, large = false }) {
  const { score, band, label } = category;
  const dash = score == null ? 0 : CIRCUMFERENCE * score / 100;
  return <figure className={`score-gauge score-gauge--${band || "none"} ${large ? "score-gauge--large" : ""}`}>
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle className="score-gauge-track" cx="32" cy="32" r={RADIUS} />
      <circle className="score-gauge-value" cx="32" cy="32" r={RADIUS} strokeDasharray={`${dash} ${CIRCUMFERENCE}`} transform="rotate(-90 32 32)" />
      <text x="32" y="32" dominantBaseline="central" textAnchor="middle">{score ?? "–"}</text>
    </svg>
    <figcaption><span className="mg-u-sr-only">{label} score: {score ?? "not available"} out of 100. </span><span aria-hidden="true">{label}</span></figcaption>
  </figure>;
}

/** Overall, category and bonus scores, with the checks behind them one click away. */
export function ScoreGauges({ scores }) {
  if (!scores) return null;
  const overall = { id: "overall", label: "Overall", score: scores.overall, band: scores.band };
  return <section className="score-gauges" aria-labelledby="score-gauges-title">
    <h2 id="score-gauges-title" className="score-gauges-title">Scores</h2>
    <div className="score-gauges-row">
      <Gauge category={overall} large />
      {scores.categories.map(category => <Gauge key={category.id} category={category} />)}
      <Gauge category={scores.bonus} />
    </div>
    <p className="model-note">Based on {scores.decided} of {scores.total} checks this tool could make; checks it couldn’t make don’t count. “Travels further” is a bonus and is not in the overall score. Scores summarise this tool’s checks; they are not an accessibility certificate.</p>
    <details className="score-gauges-detail">
      <summary>How the scores are worked out</summary>
      {[...scores.categories, scores.bonus].map(category => <section key={category.id}>
        <h3>{category.label}{category.score != null ? `: ${category.score}` : ""}</h3>
        <ul>{category.audits.map(audit => <li key={audit.id}><span>{audit.label}</span> <span className={`score-audit score-audit--${audit.score == null ? "none" : audit.score >= 1 ? "pass" : audit.score <= 0 ? "fail" : "partial"}`}>{auditMark(audit.score)}</span></li>)}</ul>
      </section>)}
      <p className="model-note">Each check has a weight; a category’s score is the weighted share of its checks that passed.</p>
    </details>
  </section>;
}
