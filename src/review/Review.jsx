import React, { useEffect, useMemo, useRef, useState } from "react";
import { Checks } from "../app/Checks.jsx";
import { findingGroups, profileReceipt, profileReasons, reviewSummary, reviewTask, reviewLimitEvidence, groupHeadingFindings, reviewPriority } from "./workspace.js";
import { normalizeFindings } from "./findings.js";
import { findingProvenance, screeningProvenance, screeningLanguageNote, groupedFindingProvenance } from "./provenance.js";
import {
  Button,
  Checkbox,
  Card,
  Actions,
  Tag,
  Notice,
} from "../ui/react.jsx";
import { Help } from "../help/Help.jsx";
import { IdentityComparison } from "./IdentityComparison.jsx";
import { OrderComparison } from "./OrderComparison.jsx";
import { AttachmentInventory } from "./AttachmentInventory.jsx";
import { Crop } from "../evidence/Crop.jsx";
import { PreviewDialog } from "../evidence/PreviewDialog.jsx";
import { candidateBlocks } from "../geometry.js";
import { MetadataGuidance } from "./MetadataGuidance.jsx";
import { needsDocumentInformation } from "../runtime/screening-recovery.js";
import { FigureContext } from "./FigureContext.jsx";
import { ResultHero } from "./ResultHero.jsx";
import { ExportMenu } from "../export/ExportMenu.jsx";
export function Review({ state, controller, exportRef, onReturnBatch }) {
  const { report, file } = state,
    normalized = useMemo(() => normalizeFindings(report), [report]),
    [selection, setSelection] = useState(null),
    [fullOpen, setFullOpen] = useState(false),
    [collapsedItem, setCollapsedItem] = useState(null),
    [locationLimit, setLocationLimit] = useState(12),
    focusFinding = useRef(false),
    titleRef = useRef(null),
    detailRef = useRef(null),
    listRef = useRef(null);
  const { category: storedCategory, issueId } = state.reviewCursor;
  const groups = useMemo(() => groupHeadingFindings(findingGroups(normalized.findings)), [normalized]);
  const overview = reviewSummary(report, groups);
  const category = !issueId && storedCategory === "problems" && !groups.problems.length
    ? groups.uncertainty.length ? "uncertainty" : groups.limits.length ? "limits" : "success"
    : storedCategory;
  const current = groups[category] || groups.problems,
    index = current.findIndex((f) => f.id === (issueId || overview.tasks[0]?.id)),
    finding = current[index],
    execution = screeningProvenance(report),
    method = finding && findingProvenance(finding, report),
    task = finding && reviewTask(finding);
  const headingGroup = finding?.members ? groupedFindingProvenance(finding.members, report) : null;
  useEffect(() => {
    if (!state.modelBusy && !overview.tasks.some(item => item.id === controller.getSnapshot().reviewCursor.issueId) && overview.tasks[0]) {
      const first = overview.tasks[0];
      const firstCategory = Object.keys(groups).find(key => groups[key].some(item => item.id === first.id));
      controller.setReviewCursor({ category: firstCategory, issueId: first.id });
    }
  }, [controller, overview.tasks[0]?.id, state.modelBusy]);
  useEffect(() => {
    const heading = document.getElementById("flow-title");
    heading?.focus({ preventScroll: true });
  }, [state.modelBusy]);
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
      overlay: t.overlay,
    });
    setFullOpen(true);
  };
  useEffect(() => {
    setSelection(null);
    setLocationLimit(12);
  }, [finding?.id]);
  useEffect(() => {
    if (detailRef.current) detailRef.current.scrollTop = 0;
    if (focusFinding.current) {
      titleRef.current?.focus({ preventScroll: true });
      if (window.matchMedia("(max-width: 820px)").matches)
        titleRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
      focusFinding.current = false;
    }
  }, [finding?.id, category]);
  const choose = (id, moveFocus = true) => {
    setCollapsedItem(null);
    focusFinding.current = moveFocus;
    const selectedCategory = Object.keys(groups).find(key => groups[key].some(item => item.id === id)) || category;
    controller.setReviewCursor({ category: selectedCategory, issueId: id });
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
  if (!state.modelBusy && needsDocumentInformation(report)) return <section aria-labelledby="flow-title">
    <h1 id="flow-title" className="flow-title" tabIndex={-1}>This PDF needs basic fixes first</h1>
    <Checks state={state} controller={controller} batchBusy={state.batchBusy} showSettings={false} />
  </section>;
  return (
    <>
      {state.modelBusy && <section className="screening-wait" aria-label="PDF analysis in progress">
        <h1 id="flow-title" className="flow-title" tabIndex={-1}>Checking your PDF</h1>
        <Checks state={state} controller={controller} batchBusy={state.batchBusy} showSettings={false} />
      </section>}
      <div hidden={state.modelBusy} inert={state.modelBusy || undefined}>
      <ResultHero report={report} overview={overview} file={file}
        exports={<ExportMenu ref={exportRef} getState={() => ({ report: controller.getSnapshot().report, file: controller.getSnapshot().file, reviewed: controller.getSnapshot().reviewed })} sourceKey={state.sourceKey} disabled={state.modelBusy} secondary compact />}
        titleId={state.modelBusy ? undefined : "flow-title"}
        onChoose={() => controller.go("document")}
        onStart={overview.tasks.length > 0 && !finding ? () => choose(overview.tasks[0].id) : undefined} />
      {!state.modelBusy && ((state.aiEnabled && !report.semantic?.inferencePerformed) || ["error", "not-run", "canceled"].includes(state.screeningAttempt?.status)) &&
        <Checks state={state} controller={controller} batchBusy={state.batchBusy} coverage={groups.coverage} showSettings={false} />}
      <div className={`review-inbox ${overview.tasks.length ? "" : "review-inbox--empty"}`}>
      {overview.tasks.length > 0 && <aside className="review-tasks" aria-labelledby="review-tasks-title">
        <h2 id="review-tasks-title" tabIndex={-1}>Review items</h2>
        <p className="model-note" id="reviewed-help">Reviewed means you looked at the item; it does not mean the PDF is fixed.</p>
        <ol ref={listRef}>{overview.tasks.map((item, taskIndex) => {
          const task = reviewTask(item);
          const priority = reviewPriority(item);
          const reviewed = item.members ? item.members.every(member => state.reviewed.has(member.id)) : state.reviewed.has(item.id);
          return <li key={item.id} className={`review-item ${item.id === finding?.id ? "is-selected" : ""} ${reviewed ? "is-reviewed" : ""}`}>
            <div className="mg-accordion mg-accordion--flush">
            <details open={item.id === finding?.id && collapsedItem !== item.id}>
            <summary aria-describedby={`review-status-${item.id}`} aria-current={item.id === finding?.id ? "true" : undefined} aria-controls="selected-item-analysis" tabIndex={item.id === finding?.id || (taskIndex === 0 && !overview.tasks.some(task => task.id === finding?.id)) ? 0 : -1}
              onClick={event => {
                event.preventDefault();
                if (item.id === finding?.id) {
                  setCollapsedItem(value => value === item.id ? null : item.id);
                } else {
                  choose(item.id, window.matchMedia("(max-width: 820px)").matches);
                }
              }}
              onKeyDown={event => {
                const next = event.key === "ArrowDown" ? Math.min(taskIndex + 1, overview.tasks.length - 1)
                  : event.key === "ArrowUp" ? Math.max(taskIndex - 1, 0)
                    : event.key === "Home" ? 0 : event.key === "End" ? overview.tasks.length - 1 : null;
                if (next != null) {
                  event.preventDefault();
                  choose(overview.tasks[next].id, false);
                  const button = listRef.current?.querySelectorAll("summary")[next];
                  button?.focus({ preventScroll: true });
                  button?.scrollIntoView({ block: "nearest", behavior: "instant" });
                }
              }}>
              <strong>{taskIndex + 1}. {task.title}</strong>
            </summary>
            <div><p>{task.action}</p></div>
            </details>
            </div>
            <div className="review-item-meta">
            <Tag id={`review-status-${item.id}`} className={`review-status review-status--${priority.key}`}>{priority.label}</Tag>
            <Checkbox className="review-item-check" id={`reviewed-${item.id}`} label="Reviewed"
              aria-describedby="reviewed-help" aria-label={`Reviewed: ${task.title}`} checked={item.members ? item.members.every(member => state.reviewed.has(member.id)) : state.reviewed.has(item.id)}
              onChange={() => {
                const members = item.members || [item];
                const reviewed = members.every(member => state.reviewed.has(member.id));
                for (const member of members) if (state.reviewed.has(member.id) === reviewed) controller.markReviewed(member.id);
              }} />
            </div>
          </li>;
        })}</ol>
      </aside>}
      <section id="selected-item-analysis" className="review-detail" ref={detailRef} aria-labelledby={finding ? "finding-title" : undefined} aria-label="Selected item analysis" tabIndex={0}>
      {!finding ? <p className="model-note">{overview.tasks.length ? 'Choose a review item to see the evidence and guidance.' : 'Open the findings above to inspect the checks that completed.'}</p> : (
        <Card
          as="article"
          className="problem-frame"
          data-finding-id={finding.id}
        >
          <h2
            className="review-detail-title"
            id="finding-title"
            tabIndex={-1}
            ref={titleRef}
          >
            {task.title}
          </h2>
          <Button className="review-list-back" onClick={() => { const heading = document.getElementById("review-tasks-title"); heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ block: "start", behavior: "instant" }); }}>Back to review items</Button>
          <Notice variant={reviewPriority(finding).noticeVariant} icon={false}><p>{task.summary || finding.summary}</p></Notice>
          {finding.members ? <section aria-label="Headings to review">
            {headingGroup.sharedModel && <p className="model-note">Model used for these headings: {headingGroup.sharedModel.label || headingGroup.sharedModel.id}.</p>}
            {headingGroup.members.map(({ finding: member, method: memberMethod }) => <section key={member.id} className="heading-review-pair">
              <h3>{member.comparison?.query || member.title.replace(/^Heading: /, '')}</h3>
              <p>{reviewTask(member).summary || member.summary}</p>
              <MethodEvidence finding={member} method={memberMethod} headingLevel="h4" />
              <ScreeningInputs finding={member} method={memberMethod} showModel={!headingGroup.sharedModel} showLimitNote={!headingGroup.sharedModel} />
              {member.targets?.length > 0 && <Button onClick={() => inspect(member.targets[0])}>Inspect heading on page {member.targets[0].page}</Button>}
            </section>)}
            {headingGroup.sharedModel && <p className="model-note">The AI compares short excerpts and may miss important context. The detailed JSON retains exact inputs and technical scores.</p>}
          </section> : kind === "title" || kind === "authors" ? (
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
          ) : finding.comparison?.figure ? (
            <FigureContext key={finding.id} finding={finding} file={file} report={report} targets={targets} onInspect={inspect} />
          ) : (
            <Crop file={file} report={report} targets={targets} />
          )}
          <section className="finding-guidance">
            <h3>How to address this</h3>
            <Guidance text={task.detailAction || (task.summary ? task.action : finding.whatToInspect)} />
            <p className="model-note">This tool does not repair your PDF. After making changes, export an updated PDF and recheck it.</p>
            {finding.source?.checkId === 'title' && finding.outcome === 'fail' && <MetadataGuidance />}
          </section>
          {!finding.members && <>
            <MethodEvidence finding={finding} method={method} />
            <ScreeningInputs finding={finding} method={method} />
          </>}
          <div className="finding-explanation">
            <h3>Why this matters</h3>
            <Guidance text={task.why || finding.whyItMatters} />
          </div>
          {targets.length > 0 && <div className="finding-evidence">
            <h3>Page locations</h3>
            <p className="model-note">Showing {Math.min(locationLimit, targets.length)} of {targets.length} text or content locations.</p>
            {targets.slice(0, locationLimit).map((t, i) => (
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
            {locationLimit < targets.length && <Button onClick={() => setLocationLimit(limit => limit + 12)}>Show more locations ({targets.length - locationLimit} remaining)</Button>}
          </div>}
        </Card>
      )}
      <Button onClick={() => { setSelection(null); setFullOpen(true); }}>
        Inspect the full PDF
      </Button>
      {fullOpen && !state.modelBusy && <PreviewDialog file={file} report={report} selection={selection} onClose={() => setFullOpen(false)} />}
      </section>
      </div>
      <section className="review-limits" aria-label="Check limitations">
        {groups.limits.length ? groups.limits.map(item => <div key={item.id}>
          <h3>{item.title}</h3>
          <ul>
            {item.evidence?.filter(value => typeof value === 'string').map((value, i) => <li key={i}>{reviewLimitEvidence(value)}</li>)}
            <li>Check these parts of the PDF yourself or with another tool.</li>
            <li>Image and chart meaning, factual accuracy and intended reading order are not fully verified by this tool.</li>
          </ul>
        </div>) : <p>No additional content-scope exclusions were detected.</p>}
        {!groups.limits.length && <ul><li>Image and chart meaning, factual accuracy and intended reading order are not fully verified by this tool.</li></ul>}
      </section>
      <section aria-labelledby="check-method-title">
        <h2 id="check-method-title">How this PDF was checked</h2>
        <ul>
          <li><div className="execution-receipt"><span>PDF extraction and rules</span> <Tag subtle>{execution.label}</Tag><Help topic={execution.kind === 'ai' ? 'ai' : 'bounded'} label="About actual AI execution" extraText={execution.detail} /></div></li>
          {screeningLanguageNote(report) && <li>{screeningLanguageNote(report)}</li>}
          <li><strong>Text profile {report.profile.replace("text-actionability-", "")}:</strong> {profileReceipt(report)}.</li>
          {profileReasons(report).map((reason, i) => <li key={i}>{reason}</li>)}
          {state.example && <li className="model-note">Synthetic example labels: {state.example.defects?.join('; ') || 'Matching control'}. These labels do not determine results.</li>}
        </ul>
        <Checks state={state} controller={controller} batchBusy={state.batchBusy} coverage={groups.coverage} showStatus={false} />
      </section>
      {state.batchId && <Actions><Button onClick={onReturnBatch}>Return to batch</Button></Actions>}
      </div>
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
function MethodEvidence({ finding, method, headingLevel = 'h3' }) {
  const Heading = headingLevel;
  return <div className="finding-technical">
    <Heading>Method and recorded evidence</Heading>
    <div className="finding-provenance mg-u-flex mg-u-flex-wrap mg-u-align-items-center mg-u-gap-100">
      <span className="finding-method">{finding.outcome.replaceAll('-', ' ')}</span>
      <Tag subtle>Source: {method.label}</Tag>
      <Help topic={method.help} label={`About this finding’s source: ${method.label}`} extraText={method.detail} />
    </div>
    {finding.evidence?.filter(item => typeof item === 'string').slice(0, 12).map((text, i) => <p key={i}>{text}</p>)}
  </div>;
}
function ScreeningInputs({ finding, method, showModel = true, showLimitNote = true }) {
  const details = finding.comparison || {};
  if (!details.model && !details.query && !details.queryInput) return null;
  const field = finding.source?.path?.split(".")[1],
    query =
      details.query ||
      (field === "subject"
        ? details.metadata?.subject
        : ["title", "titleAI"].includes(field)
          ? details.metadata?.infoTitle
          : field === "keywords"
            ? details.metadata?.keywords
            : null);
  const inputReceipt = (input) => {
    if (!input || typeof input === "string" || !input.truncated) return null;
    return <div className="model-note">
      <p>This text was too long for the model. It compared only the beginning shown here:</p>
      <p>{input.consumedText || "See the detailed JSON report for the text used."}</p>
    </div>;
  };
  return (
    <section className="finding-inputs">
      <h3>
        {method.kind === "ai"
          ? "Text the AI compared"
          : "AI check settings"}
      </h3>
      {showModel && details.model && (
        <p className="model-note">
          {method.kind === "ai"
            ? "Model used"
            : "Selected model"}
          : {details.model.label || details.model.id}.
          {method.kind !== "ai" &&
            " This AI check did not run."}
        </p>
      )}
      {query && (
        <p>
          {method.kind === "ai" ? "Compared" : "Requested"} text: {query}
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
              </p>
              {inputReceipt(e.modelInput || e.inputProvenance)}
            </div>
          ))}
          {showLimitNote && <p className="model-note">
            The AI uses short excerpts, so it may miss context elsewhere in the PDF.
            Exact model inputs and technical scores are in the detailed JSON report.
          </p>}
        </>
      )}
    </section>
  );
}
