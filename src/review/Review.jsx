import React, { useEffect, useMemo, useRef, useState } from "react";
import { Checks } from "../app/Checks.jsx";
import { findingGroups, profileReceipt, profileReasons } from "./workspace.js";
import { normalizeFindings } from "./findings.js";
import { findingProvenance, screeningProvenance, screeningLanguageNote } from "./provenance.js";
import {
  Button,
  Card,
  Details,
  Actions,
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
    [groupChosen, setGroupChosen] = useState(false),
    [fullOpen, setFullOpen] = useState(false),
    focusFinding = useRef(false),
    titleRef = useRef(null);
  const { category: storedCategory, issueId } = state.reviewCursor;
  const setCategory = (category) => controller.setReviewCursor({ category }),
    setIssueId = (issueId) => controller.setReviewCursor({ issueId });
  const groups = useMemo(() => findingGroups(normalized.findings), [normalized]);
  const category = !groupChosen && !issueId && storedCategory === "problems" && !groups.problems.length
    ? groups.uncertainty.length ? "uncertainty" : groups.limits.length ? "limits" : "success"
    : storedCategory;
  const current = groups[category] || groups.problems,
    index = current.findIndex((f) => f.id === issueId),
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
      titleRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
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
    controller.setReviewCursor({ category, issueId: id });
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
      <section className="review-result-overview">
        <h2>{groups.problems.length ? `${groups.problems.length} detected concern${groups.problems.length === 1 ? '' : 's'} to inspect` : 'No detected problems in completed checks'}</h2>
        <p>{groups.uncertainty.length} human-review item{groups.uncertainty.length === 1 ? '' : 's'} · {groups.limits.length} tool limit{groups.limits.length === 1 ? '' : 's'} · {groups.success.length} checks worked.</p>
        <p className="model-note">Concerns include rule failures and advisory suspicions. Human review covers uncertain evidence; tool limits describe what this app cannot establish.</p>
        <ExportMenu ref={exportRef} getState={() => ({ report: controller.getSnapshot().report, file: controller.getSnapshot().file, reviewed: controller.getSnapshot().reviewed })} sourceKey={state.sourceKey} disabled={state.modelBusy} />
        <Details summary={`Text profile ${report.profile.replace("text-actionability-", "")}: ${profileReceipt(report)}`} className="review-scope-details">
          <p>Formal text-profile acceptance is separate from advisory findings and tool limits. A pass does not certify accessibility or AI accuracy.</p>
          {profileReasons(report).map((reason, i) => <p key={i}>{reason}</p>)}
          {state.example && <p className="model-note">Synthetic example labels: {state.example.defects?.join('; ') || 'Matching control'}. These labels do not determine results.</p>}
        </Details>
        <div className="execution-receipt"><span>PDF extraction and rules</span> <Tag subtle>{execution.label}</Tag><Help topic={execution.kind === 'ai' ? 'ai' : 'bounded'} label="About actual AI execution" extraText={execution.detail} /></div>
        {screeningLanguageNote(report) && <p className="model-note">{screeningLanguageNote(report)}</p>}
        <Checks state={state} controller={controller} batchBusy={state.batchBusy} coverage={groups.coverage} />
      </section>
      <SegmentedControl
        legend="Finding groups"
        name="finding-group"
        hideLegend
        className="review-categories"
        value={category}
        onChange={(e) => {
          setGroupChosen(true);
          setCategory(e.target.value);
          setIssueId(null);
        }}
        options={[
          { value: "problems", label: `Problems (${groups.problems.length})` },
          {
            value: "uncertainty",
            label: `Human review (${groups.uncertainty.length})`,
          },
          { value: "limits", label: `Tool limits (${groups.limits.length})` },
          { value: "success", label: `What worked (${groups.success.length})` },
        ]}
      />
      <section className="finding-inventory" aria-label="Findings in this group">
        {current.length ? <ul>{current.map(f => <li key={f.id}><button type="button" className={`finding-list-button ${f.id === finding?.id ? 'is-selected' : ''}`} aria-pressed={f.id === finding?.id} onClick={() => choose(f.id)}><strong>{f.title}</strong><span>{f.targets?.[0]?.page ? `Page ${f.targets[0].page} · ` : 'Document · '}{f.category === 'required-defect' ? 'Rule failure' : f.category === 'advisory-concern' ? 'Advisory concern' : f.outcome.replaceAll('-', ' ')}{state.reviewed.has(f.id) ? ' · Reviewed' : ''}</span></button></li>)}</ul> : <p>No items in this group.</p>}
      </section>
      {!finding ? <p className="model-note">{current.length ? 'Select an item above to inspect its evidence and next steps.' : category === 'problems' ? 'Review uncertain evidence and tool limits before relying on this PDF.' : ''}</p> : (
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
          <Actions><Button disabled={index <= 0} onClick={() => choose(current[index - 1].id)}>Previous finding</Button><Button disabled={index === current.length - 1} onClick={() => choose(current[index + 1].id)}>Next finding</Button></Actions>
          <p>{finding.summary}</p>
          <h3>What to inspect or change</h3>
          <Guidance text={finding.whatToInspect} />
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
              <OrderComparison report={report} file={file} onInspect={inspect} />
              <Crop file={file} report={report} targets={targets} />
            </>
          ) : kind === "attachments" ? (
            <AttachmentInventory inventory={report.attachments} />
          ) : (
            <>
              {finding.comparison?.figure?.alt && <div className="figure-alternative"><h3>Alternate text machines can read</h3><blockquote>{finding.comparison.figure.alt}</blockquote></div>}
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
          <Details summary="Why this matters"><Guidance text={finding.whyItMatters} /></Details>
          <Details summary={`Page locations (${targets.length})`} className="finding-evidence">
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
          </Details>
          <p className="model-note">
            This tool does not repair your PDF. Make changes in the source
            document or PDF authoring tool, then recheck the exported file.
          </p>
          <Actions><Button id="finding-reviewed" aria-pressed={state.reviewed.has(finding.id)} onClick={() => controller.markReviewed(finding.id)}>{state.reviewed.has(finding.id) ? 'Reviewed ✓' : 'Mark reviewed'}</Button></Actions>
          <p className="model-note">
            Reviewed records your inspection for this session. It does not
            resolve the finding or change machine results.
          </p>
        </Card>
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

        <Button
          disabled={state.batchBusy || state.modelBusy}
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
