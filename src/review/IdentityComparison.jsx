import React from "react";
import { Card, Button } from "../ui/react.jsx";
import { Help, HelpLabel } from "../help/Help.jsx";
import { Crop } from "../evidence/Crop.jsx";
export function IdentityComparison({ kind, report, file, targets, onInspect }) {
  const result =
      kind === "title" ? report.metadataConsistency : report.authorConsistency,
    evidence =
      kind === "title"
        ? result?.publicationCandidates || []
        : result?.evidence || [];
  const fields =
    kind === "title"
      ? [
          ["Info metadata", "info", [["Title", report.metadata.infoTitle]]],
          [
            "XMP metadata",
            "xmp",
            report.metadata.xmpTitles?.length
              ? report.metadata.xmpTitles.map((t) => [
                  `Title (${t.lang || "unspecified language"})`,
                  t.text,
                ])
              : [["Title", null]],
          ],
        ]
      : [
          ["Info metadata", "info", [["Authors", report.metadata.author]]],
          [
            "XMP metadata",
            "xmp",
            [
              [
                "Authors",
                (
                  result?.metadataAuthors?.xmp ||
                  report.metadata.xmpAuthors ||
                  []
                ).join("; "),
              ],
            ],
          ],
        ];
  return (
    <div className="identity-comparison">
      <Card className="identity-source identity-publication">
        <h3>From the publication</h3>
        <div className="finding-crop-slot">
          <Crop file={file} report={report} targets={targets} />
        </div>
        <h4>Recovered publication text</h4>
        <p className="model-note">
          {kind === "title"
            ? "Recovered first-page title candidates; candidacy is heuristic."
            : "Explicit first-page byline candidates; candidacy does not authenticate authorship."}
        </p>
        {evidence.slice(0, 8).map((item, i) => (
          <div className="comparison-evidence" key={i}>
            <small>
              Page {item.page}
              {item.role
                ? ` · tagged ${item.role}`
                : item.source
                  ? ` · ${item.source}`
                  : ""}
              {(item.role || /tagged|structure/i.test(item.source || "")) && (
                <Help
                  topic="tags"
                  label={`About tagged ${item.role || "content"}`}
                />
              )}
            </small>
            <Button
              className="location-button"
              onClick={() =>
                onInspect({
                  ...item,
                  keys: item.keys || [item.key].filter(Boolean),
                  blockIds: item.blockIds || (item.id != null ? [item.id] : []),
                })
              }
            >
              {item.text}
            </Button>
          </div>
        ))}
        {!evidence.length && (
          <p className="identity-unavailable">
            No comparable publication candidate was recovered. Missing evidence
            is not a match.
          </p>
        )}
        {evidence.length > 8 && (
          <p className="model-note">
            {evidence.length - 8} additional candidates are in the full evidence
            report.
          </p>
        )}
      </Card>
      {fields.map(([label, key, values]) => (
        <Card className={`identity-source identity-${key}`} key={key}>
          <HelpLabel as="h3" topic={key}>
            {label}
          </HelpLabel>
          <dl className="identity-values">
            {values.map(([field, value], i) => (
              <React.Fragment key={i}>
                <dt>{field}</dt>
                <dd
                  className={
                    value && String(value).trim() ? "" : "identity-unavailable"
                  }
                >
                  {value && String(value).trim() ? value : "Not set"}
                </dd>
              </React.Fragment>
            ))}
          </dl>
        </Card>
      ))}
    </div>
  );
}
