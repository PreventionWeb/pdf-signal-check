import React from "react";
import { Card, Details, Notice } from "../ui/react.jsx";
import { Help } from "../help/Help.jsx";
export function AttachmentInventory({ inventory }) {
  return (
    <section className="attachment-inventory">
      <h3>
        Files carried or referenced by this PDF
        <Help topic="attachments" />
      </h3>
      <p className="model-note">
        Inventory completeness:{" "}
        {inventory?.inventoryComplete
          ? "recovered inventory complete within inspection bounds"
          : "not established; inspect limits and warnings"}
        .
      </p>
      <p>
        This is an inventory of file declarations. Attached contents are not
        opened or analyzed.
      </p>
      <p>{inventory?.reason}</p>
      {inventory?.files?.map((file) => (
        <Card as="article" className="attachment-card" key={file.id}>
          <h4>
            {file.unicodeFilename ||
              file.filename ||
              `Unnamed file (${file.id})`}
          </h4>
          <p className="model-note">
            {file.embedded
              ? file.payloads?.length
                ? "Located embedded payload stream(s); contents not analyzed."
                : "Embedded-file declaration; no payload stream was located."
              : "Associated reference only; no payload was fetched."}
          </p>
          <dl className="attachment-values">
            {[
              [
                "Declared media type",
                [
                  ...new Set(
                    file.payloads?.map((p) => p.mediaType).filter(Boolean),
                  ),
                ].join("; ") || "Not declared",
              ],
              ["Description / intended use", file.description || "Not set"],
              [
                "Declared relationship",
                file.relationship
                  ? `${file.relationship}${file.relationshipRecognized === false ? " (custom or unrecognized)" : ""}`
                  : "Not set",
              ],
              [
                "Association",
                file.associations
                  ?.map(
                    (a) =>
                      `${a.kind || "Association"}${a.page ? ` · page ${a.page}` : ""}${a.path ? ` · ${a.path}` : ""}`,
                  )
                  .join("; ") || "Not recovered",
              ],
              [
                "Related filename declarations",
                file.payloads
                  ?.map((p) => p.relatedFilename)
                  .filter(Boolean)
                  .join("; ") || "None recorded",
              ],
            ].map(([label, value]) => (
              <React.Fragment key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </React.Fragment>
            ))}
          </dl>
          {file.guidanceIssues?.length > 0 && (
            <>
              <h5>Guidance to inspect</h5>
              <ul className="attachment-guidance">
                {file.guidanceIssues.map((issue, i) => (
                  <li key={i}>
                    {typeof issue === "string"
                      ? issue
                      : issue.message || JSON.stringify(issue)}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="model-note">
            Descriptions and relationships are author declarations; this tool
            does not verify that payload contents match them or contain
            machine-readable instructions.
          </p>
        </Card>
      ))}
      {inventory?.orphanStreams?.length > 0 && (
        <Notice
          variant="warning"
          title="Unlinked embedded payload declarations"
          headingLevel="h3"
        >
          <p>
            These declarations lack a resolved file context. Unreachable records
            may be inactive remnants, not active attachments.
          </p>
          {inventory.orphanStreams.map((s, i) => (
            <p key={i}>
              {s.origin === "unreachable-remnant"
                ? "Possible inactive remnant"
                : "Reachable, unassociated declaration"}{" "}
              · reference {s.streamRef || "not recovered"} · declared media type{" "}
              {s.mediaType || "not declared"} · encoded size{" "}
              {Number.isFinite(s.encodedBytes)
                ? `${s.encodedBytes} bytes`
                : "unknown"}{" "}
              · context {s.path || "not recovered"}
            </p>
          ))}
        </Notice>
      )}
      <Details summary="Inventory scope and limits">
        <p>{inventory?.scope}</p>
        {inventory?.warnings?.length > 0 && (
          <ul>
            {inventory.warnings.map((w, i) => (
              <li key={i}>
                {typeof w === "string" ? w : w.message || JSON.stringify(w)}
              </li>
            ))}
          </ul>
        )}
      </Details>
    </section>
  );
}
