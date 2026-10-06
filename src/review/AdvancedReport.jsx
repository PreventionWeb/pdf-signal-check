import React, { useState } from "react";
import { Card, Details, Select, StatsCard } from "../ui/react.jsx";
import { normalizeFindings } from "./findings.js";
import { findingProvenance, screeningProvenance } from "./provenance.js";
export function AdvancedReport({ report }) {
  const [order, setOrder] = useState("tagged"),
    normalized = normalizeFindings(report),
    execution = screeningProvenance(report);
  return (
    <div id="report">
      <Card>
        <h2>
          Text profile {report.profile.replace("text-actionability-", "")}
        </h2>
        <p>
          {report.accepted
            ? "Yes — required checks passed"
            : report.checks.some((c) => c.status === "fail")
              ? "No — required defects found"
              : "No — not established"}
        </p>
        <StatsCard
          aria-label="Profile summary statistics"
          stats={[
            { value: report.file.pages ?? "—", bottomLabel: "pages" },
            {
              value: report.checks.filter((c) => c.status === "pass").length,
              bottomLabel: "checks passed",
            },
            {
              value: report.checks.filter((c) => c.status !== "pass").length,
              bottomLabel: "required checks to inspect",
            },
          ]}
        />
      </Card>
      <h3>Required checks</h3>
      <div className="mg-accordion">
        {report.checks.map((check) => (
          <Details
            key={check.id}
            summary={
              <span>
                <span
                  className={
                    check.status === "pass"
                      ? "mg-u-color--accent-400"
                      : check.status === "fail"
                        ? "mg-u-color--red-900"
                        : "mg-u-color--neutral-600"
                  }
                  aria-hidden="true"
                >
                  {check.status === "pass"
                    ? "✓ "
                    : check.status === "fail"
                      ? "× "
                      : "? "}
                </span>
                {check.label}
              </span>
            }
          >
            <p>{check.summary}</p>
            <p>Outcome: {check.status}. Required for acceptance.</p>
            {check.evidence.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </Details>
        ))}
      </div>
      <h3>Publication metadata and advisory findings</h3>
      <Card>
        <dl className="metadata-dl">
          {[
            ["Info title", report.metadata.infoTitle],
            ...(report.metadata.xmpTitles || []).map((t) => [
              `XMP ${t.lang || "title"}`,
              t.text,
            ]),
            ["Info author", report.metadata.author],
            ["XMP authors", report.metadata.xmpAuthors?.join("; ")],
            ["Language", report.metadata.language],
            ["Subject", report.metadata.subject],
            ["Keywords", report.metadata.keywords],
          ].map(([key, value], i) => (
            <React.Fragment key={i}>
              <dt>{key}</dt>
              <dd>
                {typeof value === "string"
                  ? value || "Not set"
                  : JSON.stringify(value || "Not set")}
              </dd>
            </React.Fragment>
          ))}
        </dl>
        <p>
          {execution.label}. {execution.detail}
        </p>
        {normalized.findings
          .filter((f) => !f.category.startsWith("required"))
          .map((f) => {
            const proof = findingProvenance(f, report);
            return (
              <Details key={f.id} summary={`${f.title}: ${f.outcome}`}>
                <p>
                  Source: {proof.label}. {proof.detail}
                </p>
                <p>{f.summary}</p>
                {f.evidence
                  ?.filter((e) => typeof e === "string")
                  .slice(0, 12)
                  .map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
              </Details>
            );
          })}
      </Card>
      <h3>Inspect extracted evidence</h3>
      <Card>
        <Select
          id="extraction-order"
          label="Extracted text order"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          options={[
            { value: "tagged", label: "Tagged reading order" },
            { value: "stream", label: "Content-stream order" },
          ]}
        />
        <p className="model-note">
          Connectivity alone does not establish intended order. First 200
          recovered rows per page are shown; JSON retains complete extracted
          evidence.
        </p>
        {report.pages.map((page) => (
          <Details
            key={page.number}
            summary={`Page ${page.number} · ${page.characters} characters · ${page.untaggedCharacters} untagged`}
          >
            <div className="text-block-list">
              {(order === "tagged" ? page.logicalBlocks : page.blocks)
                .slice(0, 200)
                .map((block, i) => (
                  <p key={i}>
                    {block.role ? `${block.role}: ` : ""}
                    {block.text}
                  </p>
                ))}
            </div>
          </Details>
        ))}
        <Details summary="Profile scope and limitations">
          <ul>
            {report.limitations.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </Details>
      </Card>
      {report.file.sha256 && (
        <Details summary="Input receipt">
          <p className="model-note">
            SHA-256 of the original {report.file.sourceBytes?.toLocaleString()}{" "}
            file bytes
          </p>
          <code style={{ overflowWrap: "anywhere" }}>{report.file.sha256}</code>
        </Details>
      )}
    </div>
  );
}
