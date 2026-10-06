import React, { useEffect, useMemo, useRef, useState } from "react";
import { normalizeFindings } from "./findings.js";
import { findingProvenance, screeningProvenance } from "./provenance.js";
import {
  Button,
  Card,
  Details,
  Actions,
  EmptyState,
  SegmentedControl,
  Tag,
} from "../ui/react.jsx";
import { Help } from "../help/Help.jsx";
import { IdentityComparison } from "./IdentityComparison.jsx";
import { OrderComparison } from "./OrderComparison.jsx";
import { AttachmentInventory } from "./AttachmentInventory.jsx";
import { Crop } from "../evidence/Crop.jsx";
import { Preview } from "../evidence/Preview.jsx";
import { candidateBlocks } from "../geometry.js";
import { ExportMenu } from "../export/ExportMenu.jsx";
export function Review({ state, controller, exportRef, onReturnBatch }) {
  const { report, file } = state,
    normalized = useMemo(() => normalizeFindings(report), [report]),
    [selection, setSelection] = useState(null),
    [fullOpen, setFullOpen] = useState(false),
    focusFinding = useRef(false),
    titleRef = useRef(null);
  const { category, issueId } = state.reviewCursor;
  const setCategory = (category) => controller.setReviewCursor({ category }),
    setIssueId = (issueId) => controller.setReviewCursor({ issueId });
  const groups = useMemo(
    () => ({
      problems: normalized.findings.filter((f) =>
        [
          "required-defect",
          "required-indeterminate",
          "advisory-concern",
        ].includes(f.category),
      ),
      uncertainty: normalized.findings.filter((f) =>
        ["uncertain", "unassessed"].includes(f.category),
      ),
      success: normalized.findings.filter((f) => f.category === "success"),
    }),
    [normalized],
  );
  const current = groups[category],
    index = Math.max(
      0,
      current.findIndex((f) => f.id === issueId),
    ),
    finding = current[index],
    execution = screeningProvenance(report),
    method = finding && findingProvenance(finding, report);
  const targets = useMemo(() => {
    if (!finding) return [];
    if (finding.source?.checkId === "title" && !finding.targets?.length)
      return (report.metadataConsistency?.publicationCandidates || []).map(
        (e) => ({
          page: e.page,
          text: e.text,
          keys: e.keys || [e.key].filter(Boolean),
          blockIds: e.blockIds || (e.id != null ? [e.id] : []),
        }),
      );
    return finding.targets || [];
  }, [finding, report.metadataConsistency]);
  const inspect = (t) => {
    const page = report.pages.find((p) => p.number === t.page);
    setSelection({
      ...t,
      quads: t.quads?.length
        ? t.quads
        : page
          ? candidateBlocks(page, t).flatMap((b) => (b.quad ? [b.quad] : []))
          : [],
      label: t.text || t.label || "Finding evidence",
    });
    setFullOpen(true);
  };
  useEffect(() => {
    setSelection(null);
  }, [finding?.id]);
  useEffect(() => {
    if (focusFinding.current) {
      titleRef.current?.focus({ preventScroll: true });
      focusFinding.current = false;
    }
  }, [finding?.id, category]);
  useEffect(() => {
    if (fullOpen && selection)
      document
        .getElementById("full-page-evidence")
        ?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [selection, fullOpen]);
  const choose = (id) => {
    focusFinding.current = true;
    setIssueId(id);
  };
  const kind = finding
    ? /author/i.test(finding.source?.path || "")
      ? "authors"
      : /metadataConsistency|deterministicTitle/.test(
            finding.source?.path || "",
          ) || finding.source?.checkId === "title"
        ? "title"
        : /readingOrder/.test(finding.source?.path || "")
          ? "order"
          : finding.source?.path === "attachments"
            ? "attachments"
            : null
    : null;
  return (
    <>
      <ExportMenu
        ref={exportRef}
        getState={() => ({
          report: controller.getSnapshot().report,
          file: controller.getSnapshot().file,
          reviewed: controller.getSnapshot().reviewed,
        })}
        sourceKey={state.sourceKey}
      />
      <section className="review-result-overview">
        <p className="profile-receipt">
          Text profile {report.profile.replace("text-actionability-", "")}:{" "}
          {report.accepted
            ? "Yes — required checks passed"
            : report.checks.some((c) => c.status === "fail")
              ? "No — required defects found"
              : "No — not established"}
          <Help topic="profile" />
        </p>
        <p className="model-note">
          Metadata and reading order require separate review.
        </p>
        <Details
          summary="Scope and required-check counts"
          className="review-scope-details"
        >
          <p>
            {
              normalized.findings.filter(
                (f) => f.category === "required-defect",
              ).length
            }{" "}
            required defects ·{" "}
            {
              normalized.findings.filter(
                (f) => f.category === "required-indeterminate",
              ).length
            }{" "}
            required checks not established ·{" "}
            {
              groups.problems.filter((f) => f.category === "advisory-concern")
                .length
            }{" "}
            advisory concerns · {groups.uncertainty.length} uncertain or
            unassessed
          </p>
          <p className="model-note">
            Your PDF is retained only for this browser session. Profile outcomes
            and advisory findings are separate; downstream AI accuracy is not
            certified.
          </p>
          {state.example && (
            <Details summary="Synthetic example labels (separate from findings)">
              <p>
                {state.example.defects?.join("; ") || "Matching control"}. These
                authored labels do not determine analyser results.
              </p>
            </Details>
          )}
        </Details>
        <div className="execution-receipt mg-u-flex mg-u-flex-wrap mg-u-align-items-center mg-u-gap-100">
          <span>Traditional rules + PDF extraction</span>
          <Tag subtle>{execution.label}</Tag>
          <Help
            topic={execution.kind === "ai" ? "ai" : "bounded"}
            label="About actual AI execution"
            extraText={execution.detail}
          />
        </div>
      </section>
      <SegmentedControl
        legend="Finding groups"
        name="finding-group"
        hideLegend
        className="review-categories"
        value={category}
        onChange={(e) => {
          setCategory(e.target.value);
          setIssueId(null);
        }}
        options={[
          { value: "problems", label: `Problems (${groups.problems.length})` },
          {
            value: "uncertainty",
            label: `Uncertain / unchecked (${groups.uncertainty.length})`,
          },
          { value: "success", label: `What worked (${groups.success.length})` },
        ]}
      />
      {!finding ? (
        <EmptyState
          title={
            category === "problems"
              ? "No concrete problems found in completed checks."
              : "No findings in this group."
          }
          actions={
            category === "problems" && groups.uncertainty.length ? (
              <Button
                onClick={() => {
                  focusFinding.current = true;
                  setCategory("uncertainty");
                  setIssueId(null);
                }}
              >
                Inspect uncertain or unassessed findings
              </Button>
            ) : null
          }
        >
          <p>
            Inspect the uncertain or unassessed scope before relying on the PDF.
            A profile pass does not establish correct metadata, reading order,
            or downstream AI accuracy.
          </p>
        </EmptyState>
      ) : (
        <Card
          as="article"
          className="problem-frame"
          data-finding-id={finding.id}
        >
          <p className="eyebrow">
            {index + 1} of {current.length} ·{" "}
            {finding.category.replaceAll("-", " ")}
          </p>
          <h2
            className="mg-card__title"
            id="finding-title"
            tabIndex={-1}
            ref={titleRef}
          >
            {finding.title}
          </h2>
          <div className="finding-provenance mg-u-flex mg-u-flex-wrap mg-u-align-items-center mg-u-gap-100">
            <span className="finding-method">
              {finding.outcome.replaceAll("-", " ")}
            </span>
            <Tag subtle>
              Source: {method.label}
            </Tag>
            <Help
              topic={method.help}
              label={`About this finding’s source: ${method.label}`}
              extraText={method.detail}
            />
          </div>
          {kind === "title" || kind === "authors" ? (
            <IdentityComparison
              kind={kind}
              report={report}
              file={file}
              targets={targets}
              onInspect={inspect}
            />
          ) : kind === "order" ? (
            <>
              <OrderComparison report={report} onInspect={inspect} />
              <Crop file={file} report={report} targets={targets} />
            </>
          ) : kind === "attachments" ? (
            <AttachmentInventory inventory={report.attachments} />
          ) : (
            <>
              <p>{finding.summary}</p>
              <Crop file={file} report={report} targets={targets} />
            </>
          )}
          <Details
            key={finding.id}
            summary="Method and recorded evidence"
            className="finding-technical"
          >
            <p>
              {finding.outcome} · {finding.method}
            </p>
            {finding.evidence
              ?.filter((e) => typeof e === "string")
              .slice(0, 12)
              .map((text, i) => (
                <p key={i}>{text}</p>
              ))}
            <ScreeningInputs finding={finding} method={method} />
          </Details>
          <h3>Why inspect this?</h3>
          <Guidance text={finding.whyItMatters} />
          <h3>What to inspect or change</h3>
          <Guidance text={finding.whatToInspect} />
          <div className="finding-evidence">
            {targets.slice(0, 12).map((t, i) => (
              <Button
                className="location-button"
                key={i}
                onClick={() => inspect(t)}
              >
                {t.page
                  ? `Inspect page ${t.page}: ${t.text || "evidence"}`
                  : "Document finding · no page location"}
              </Button>
            ))}
            {!targets.length && (
              <p className="model-note">
                No trustworthy page location is available for this finding.
              </p>
            )}
          </div>
          <p className="model-note">
            This tool does not repair your PDF. Make changes in the source
            document or PDF authoring tool, then recheck the exported file.
          </p>
          <Actions>
            <Button
              disabled={index === 0}
              onClick={() => choose(current[index - 1].id)}
            >
              Previous
            </Button>
            <Button
              id="finding-reviewed"
              aria-pressed={state.reviewed.has(finding.id)}
              onClick={() => controller.markReviewed(finding.id)}
            >
              {state.reviewed.has(finding.id) ? "Reviewed ✓" : "Mark reviewed"}
            </Button>
            <Button
              disabled={index === current.length - 1}
              onClick={() => choose(current[index + 1].id)}
            >
              Next
            </Button>
          </Actions>
          <p className="model-note">
            Reviewed records your inspection for this session. It does not
            resolve the finding or change machine results.
          </p>
        </Card>
      )}
      {finding && (
        <Details summary="Jump to a finding" className="review-overview">
          {current.map((f) => (
            <Button
              className="location-button"
              key={f.id}
              onClick={() => choose(f.id)}
            >
              {state.reviewed.has(f.id) ? "✓ " : ""}
              {f.title}
            </Button>
          ))}
        </Details>
      )}
      <Details
        id="full-page-evidence"
        summary="Inspect the full page and extracted order"
        className="full-page-evidence"
        open={fullOpen}
        onToggle={(e) => setFullOpen(e.currentTarget.open)}
      >
        {fullOpen && (
          <Preview file={file} report={report} selection={selection} />
        )}
      </Details>
      <Actions>
        <Button onClick={() => controller.go("checks")}>
          Back to screening choices
        </Button>
        <Button
          disabled={state.batchBusy}
          onClick={() => controller.analyze(file, state.example)}
        >
          Recheck this PDF
        </Button>
        <Button onClick={() => controller.go("document")}>
          Choose another PDF
        </Button>
        {state.batchId && (
          <Button onClick={onReturnBatch}>Return to batch</Button>
        )}
      </Actions>
    </>
  );
}
function Guidance({ text }) {
  return Array.isArray(text) ? (
    <ul>
      {text.map((t, i) => (
        <li key={i}>{typeof t === "string" ? t : JSON.stringify(t)}</li>
      ))}
    </ul>
  ) : (
    <p>
      {text ||
        "Compare the recovered evidence with the source document, then export a revised PDF and recheck it."}
    </p>
  );
}
function ScreeningInputs({ finding, method }) {
  const details = finding.comparison || {};
  if (!details.model && !details.query && !details.queryInput) return null;
  const field = finding.source?.path?.split(".")[1],
    query =
      details.query ||
      (field === "subject"
        ? details.metadata?.subject
        : field === "title"
          ? details.metadata?.infoTitle
          : field === "keywords"
            ? details.metadata?.keywords
            : null);
  const inputReceipt = (input) => {
    if (!input) return null;
    const value = typeof input === "string" ? { consumedText: input } : input;
    return (
      <>
        <p className="model-note">
          Consumed input
          {Number.isFinite(value.consumedTokens)
            ? `: ${value.consumedTokens} / ${value.inputTokens} tokens`
            : ""}
          {value.truncated ? " · truncated" : ""}
        </p>
        <p>
          {value.consumedText ||
            "Consumed text is recorded in the full evidence report."}
        </p>
      </>
    );
  };
  return (
    <section className="finding-inputs">
      <h3>
        {method.kind === "ai"
          ? "Completed screening inputs"
          : "Recorded screening configuration"}
      </h3>
      {details.model && (
        <p>
          {method.kind === "ai"
            ? "Actual model configuration"
            : "Configured model for the run"}
          : {details.model.label || details.model.id} ·{" "}
          {details.model.dtype || ""}.
          {method.kind !== "ai" &&
            " No completed inference is recorded for this check."}
        </p>
      )}
      {query && (
        <p>
          {method.kind === "ai" ? "Compared" : "Requested"} value: {query}
        </p>
      )}
      {method.kind === "ai" && (
        <>
          {inputReceipt(details.queryInput)}
          {details.candidates?.slice(0, 6).map((e, i) => (
            <div key={i}>
              <p>
                {e.page ? `Page ${e.page}: ` : ""}
                {e.text || e.source}
                {Number.isFinite(e.similarity)
                  ? ` · similarity ${e.similarity.toFixed(3)}`
                  : ""}
              </p>
              {inputReceipt(e.modelInput || e.inputProvenance)}
            </div>
          ))}
          <p className="model-note">
            Relatedness scores and thresholds are provisional, not
            probabilities. Consumed prefixes can be shorter than highlighted
            excerpts.
          </p>
        </>
      )}
    </section>
  );
}
