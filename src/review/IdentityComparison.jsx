import React from "react";
import { Card, Button } from "../ui/react.jsx";
import { Help } from "../help/Help.jsx";
import { identitySavedValues } from "./identity-values.js";
import { Crop } from "../evidence/Crop.jsx";
export function IdentityComparison({ kind, report, file, targets, onInspect }) {
  const result =
      kind === "title" ? report.metadataConsistency : report.authorConsistency,
    evidence =
      kind === "title"
        ? result?.publicationCandidates || []
        : result?.evidence || [];
  const saved = identitySavedValues(kind, report);
  const property = kind === 'title' ? 'document title' : 'author names';
  return (
    <div className="identity-comparison">
      <Card className="identity-source identity-saved">
        <h3>Saved {property}</h3>
        <p className="model-note">This information is stored in the PDF’s document properties.</p>
        {saved.values.length > 1 && <p>The PDF contains different saved versions. Compare each with the publication{kind === 'title' ? '; language versions may be intentional' : ''}.</p>}
        {saved.values.map((item, i) => <div className="comparison-evidence" key={i}>
          {saved.values.length > 1 && <h4>Saved version {i + 1}</h4>}
          <p className="identity-saved-value">{item.value}</p>
          <h4>Recorded source{item.sources.length > 1 ? 's' : ''}</h4>
          <ul className="model-note">{item.sources.map((source, j) => <li key={j}>{source.source} <Help topic={source.topic} label={`About ${source.source}`} /></li>)}</ul>
        </div>)}
        {!saved.values.length && <p>{kind === 'title' ? 'No document title was found' : 'No author names were found'} in the PDF’s document properties.</p>}
        {saved.missing.length > 0 && <p className="model-note">Not set in: {saved.missing.map(item => item.source).join('; ')}.</p>}
      </Card>
      <Card className="identity-source identity-publication">
        <h3>{kind === 'title' ? 'Possible title found on the page' : 'Possible author names found on the page'}</h3>
        <div className="finding-crop-slot">
          <Crop file={file} report={report} targets={targets} />
        </div>
        <h4>Text found on the first page</h4>
        <p className="model-note">
          {kind === "title"
            ? "The tool found possible title text on the first page. Check it against the full title, including the year and edition."
            : "The tool found a possible author line on the first page. Check these names yourself; this does not verify authorship."}
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
            No {kind === 'title' ? 'possible title' : 'possible author line'} was found on the first page. Compare the saved information with the PDF yourself.
          </p>
        )}
        {evidence.length > 8 && (
          <p className="model-note">
            {evidence.length - 8} additional candidates are in the full evidence
            report.
          </p>
        )}
      </Card>

    </div>
  );
}
