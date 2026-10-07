import React from "react";
import { orderComparisonData } from "./order-comparison.js";
import { Details } from "../ui/react.jsx";
import { HelpLabel } from "../help/Help.jsx";
import { GoGoViewer } from "../evidence/GoGoViewer.jsx";
export function OrderComparison({ report, file, onInspect }) {
  const data = orderComparisonData(report);
  const recoveredTaggedText = report.pages?.some(page => page.logicalBlocks?.some(block => block.text?.trim()));
  return (
    <section className="order-map">
      <h3 className="order-map-heading">{data.available ? 'Same page, two recovered sequences' : 'Reading-order evidence'}</h3>
      {!data.available ? (
        <div className="order-map-unavailable">
          <p><strong>{recoveredTaggedText ? 'Tagged text was recovered; a comparison diagram is unavailable.' : 'No tagged reading sequence was recovered.'}</strong></p>
          <p>{recoveredTaggedText ? 'A diagram requires a supported reading-order concern with matching, located headings. No such comparison is available for this finding. This does not mean the PDF has no reading order, or that its order is correct.' : 'The available evidence does not establish a machine reading order. Tags may be missing, empty or not recoverable by this check; the absence of a diagram does not establish which.'}</p>
          <p className="model-note">The optional page viewer shows the original page, independently of this check. Inspect its layout and the recovered text in the details.</p>
        </div>
      ) : (
        <>
          <p className="order-map-intro">
            Page {data.page} · The same recovered headings, connected by their
            PDF tags.
          </p>
          <div className="order-map-lanes">
            {[
              [
                "tagged",
                "Tag-tree order",
                "Readers using tags may follow this sequence.",
                data.tagged,
              ],
              [
                "drawing",
                "Page drawing order",
                "Text recovered from drawing instructions; not intended order.",
                data.drawing,
              ],
            ].map(([kind, label, description, entries]) => (
              <section
                className={`order-map-lane order-map-${kind}`}
                key={kind}
              >
                <h4 className="order-map-label">{label}</h4>
                <p className="order-map-description">{description}</p>
                <ul className="order-map-cards">
                  {entries.map((entry, index) => {
                    const anomaly =
                      kind === "tagged" &&
                      data.anomalies.find((a) => a.to === entry.key);
                    return (
                      <li
                        key={entry.key}
                        className={`order-map-card ${anomaly ? "order-map-card-anomaly" : ""}`}
                      >
                        {index > 0 && (
                          <span
                            className={`order-map-arrow ${anomaly ? "order-map-arrow-anomaly" : ""}`}
                            aria-hidden="true"
                          >
                            →
                          </span>
                        )}
                        {data.numbered && (
                          <span className="order-map-step">{entry.step}</span>
                        )}
                        <span className="order-map-text">
                          {entry.shortText}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
          {data.anomalies.map((a) => (
            <p key={a.to} className="order-map-anomaly">
              {a.text}{" "}
              {data.numbered
                ? "Dependent instructions may be read in the wrong order."
                : "This spatial clue needs manual inspection."}
            </p>
          ))}
          {data.omittedItems > 0 && (
            <p className="order-map-omissions">
              {data.omittedItems} additional items are in the full evidence.
            </p>
          )}
          <p className="order-map-limitation">
            Neither recovered sequence proves the intended visual reading order.
            Inspect the page and the source document.
          </p>
        </>
      )}
      <PageContext file={file} page={data.available ? data.page : report.readingOrder?.findings?.[0]?.page || 1} />
      <Details
        summary="Recovered text and technical detail"
        className="order-technical"
      >
        {report.readingOrder?.findings?.map((f, i) => (
          <p key={i} className="order-anomaly">
            Page {f.page}: {f.reason}
          </p>
        ))}
        <div className="sequence-comparison">
          {[
            ["logicalBlocks", "Tag-tree order", "taggedOrder"],
            ["blocks", "Content-stream text", "contentStream"],
          ].map(([field, label, topic]) => (
            <div key={field}>
              <HelpLabel as="h4" topic={topic}>
                {label}
              </HelpLabel>
              {report.pages?.slice(0, 3).flatMap((page) =>
                (page[field] || []).slice(0, 30).map((b, i) => (
                  <p
                    className="comparison-evidence"
                    key={`${page.number}-${i}`}
                  >
                    <small>
                      Page {page.number}
                      {b.role ? ` · ${b.role}` : ""}
                    </small>
                    <button
                      type="button"
                      className="mg-button mg-button-secondary mg-button-outline location-button"
                      onClick={() =>
                        onInspect({
                          ...b,
                          page: page.number,
                          keys: b.keys || [b.key].filter(Boolean),
                          blockIds: b.id != null ? [b.id] : [],
                        })
                      }
                    >
                      {b.text}
                    </button>
                  </p>
                )),
              )}
            </div>
          ))}
        </div>
        <p className="model-note">
          Bounded recovered text. The detailed JSON preserves full available
          evidence.
        </p>
      </Details>
    </section>
  );
}

function PageContext({ file, page }) {
  const [open, setOpen] = React.useState(false);
  return <Details summary="View the original PDF in page context" open={open} onToggle={e => setOpen(e.currentTarget.open)}>{open && <GoGoViewer file={file} page={page} title="Inspect reading order in page context" />}</Details>;
}
