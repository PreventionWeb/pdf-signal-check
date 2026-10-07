import React from "react";
import { orderComparisonData } from "./order-comparison.js";
import { Details, Button } from "../ui/react.jsx";
import { HelpLabel } from "../help/Help.jsx";

export function OrderComparison({ report, file, onInspect }) {
  const data = orderComparisonData(report);
  const recoveredTaggedText = report.pages?.some(page => page.logicalBlocks?.some(block => block.text?.trim()));
  if (!recoveredTaggedText) return null;
  return (
    <section className="order-map">
      <h3 className="order-map-heading">{data.available ? 'Same page, two recovered sequences' : 'Reading-order evidence'}</h3>
      {!data.available ? (
        <div className="order-map-unavailable">
          <p>{recoveredTaggedText ? 'Tagged text was recovered. Inspect its reading sequence on the page; a comparison diagram is unavailable.' : 'No machine-readable reading sequence was recovered. Inspect the page and check its structure labels.'}</p>
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
      <Button onClick={() => onInspect({ page: data.available ? data.page : report.readingOrder?.findings?.[0]?.page || 1, label: 'Recovered reading order', overlay: 'order' })}>Inspect reading order on the page</Button>
      <p className="model-note">The recovered sequence does not prove the intended reading order is correct.</p>
      <Details
        summary="Recovered text and technical detail"
        className="order-technical"
      >
        {!data.available && <p>{recoveredTaggedText ? 'A comparison diagram requires a supported reading-order concern with matching, located headings in both sequences. This finding does not provide such a comparison.' : 'Structure labels may be missing, empty or unrecoverable by this tool; the absence of a diagram does not establish which.'}</p>}
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
