import { buildDocumentEvidence } from "../engine/topic-retrieval.js";
import { SemanticEvidenceLab } from "./SemanticEvidenceLab.jsx";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Checks } from "../app/Checks.jsx";
import { findingGroups, profileReceipt, profileReasons, reviewSummary, reviewTask, reviewLimitEvidence, groupHeadingFindings, groupFigureFindings, reviewPriority, fixCard, fixBucket } from "./workspace.js";
import { normalizeFindings } from "./findings.js";
import { findingProvenance, screeningProvenance, screeningLanguageNote, groupedFindingProvenance } from "./provenance.js";
import { Button, Card, Actions, Tag, Notice } from "../ui/react.jsx";
import { Tabs } from "../ui/Tabs.jsx";
import { Help } from "../help/Help.jsx";
import { IdentityComparison } from "./IdentityComparison.jsx";
import { OrderComparison, OrderTechnical } from "./OrderComparison.jsx";
import { AttachmentInventory } from "./AttachmentInventory.jsx";
import { AdvancedReport } from "./AdvancedReport.jsx";
import { EvidenceDrawer } from "./EvidenceDrawer.jsx";
import { Crop } from "../evidence/Crop.jsx";
import { PreviewDialog } from "../evidence/PreviewDialog.jsx";
import { candidateBlocks } from "../geometry.js";
import { MetadataGuidance } from "./MetadataGuidance.jsx";
import { needsDocumentInformation } from "../runtime/screening-recovery.js";
import { FigureContext } from "./FigureContext.jsx";
import { FigureGroup } from "./FigureGroup.jsx";
import { ResultHero } from "./ResultHero.jsx";
import { ExportMenu } from "../export/ExportMenu.jsx";
import { PagePins } from "./PagePins.jsx";

const BUCKETS = {
  fix: { label: "Fix", intro: "Problems found in this PDF." },
  check: { label: "Check", intro: "Possible problems. Look at each one and decide." },
  unknown: { label: "Couldn’t check", intro: "The tool could not decide these. They are limits of this tool, not problems found in your PDF." },
};

export function Review({ state, controller, exportRef, onReturnBatch }) {
  const { report, file } = state,
    normalized = useMemo(() => normalizeFindings(report), [report]),
    [selection, setSelection] = useState(null),
    [fullOpen, setFullOpen] = useState(false),
    [drawerOpen, setDrawerOpen] = useState(false),
    [view, setView] = useState("pages"),
    focusFinding = useRef(false),
    titleRef = useRef(null),
    detailRef = useRef(null);
  const { issueId } = state.reviewCursor;
  const groups = useMemo(() => groupFigureFindings(groupHeadingFindings(findingGroups(normalized.findings))), [normalized]);
  const overview = reviewSummary(report, groups);
  const { buckets } = overview;
  const selectable = [...buckets.fix, ...buckets.check, ...buckets.unknown];
  const defaultItem = buckets.fix[0] || buckets.check[0];
  const finding = selectable.find(item => item.id === issueId) || defaultItem,
    execution = screeningProvenance(report),
    method = finding && findingProvenance(finding.figureGroup ? finding.members[0] : finding, report),
    task = finding && reviewTask(finding),
    card = finding && fixCard(finding, report),
    bucket = finding && fixBucket(finding);
  const pinEntries = useMemo(() => [...buckets.fix, ...buckets.check].map((item, index) => ({ number: index + 1, item, bucket: fixBucket(item), ...fixCard(item, report) })), [groups, report]);
  const experimentEvidence = useMemo(() => state.semanticExperiment ? buildDocumentEvidence(report.pages) : null, [state.semanticExperiment, report.pages]);
  const headingGroup = finding?.members && !finding.figureGroup ? groupedFindingProvenance(finding.members, report) : null;
  useEffect(() => {
    if (!state.modelBusy && !selectable.some(item => item.id === controller.getSnapshot().reviewCursor.issueId) && defaultItem)
      controller.setReviewCursor({ category: fixBucket(defaultItem), issueId: defaultItem.id });
  }, [controller, defaultItem?.id, state.modelBusy]);
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
    setDrawerOpen(false);
  }, [finding?.id]);
  useEffect(() => {
    if (detailRef.current) detailRef.current.scrollTop = 0;
    if (focusFinding.current) {
      titleRef.current?.focus({ preventScroll: true });
      if (window.matchMedia("(max-width: 820px)").matches)
        titleRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
      focusFinding.current = false;
    }
  }, [finding?.id]);
  const choose = (item, moveFocus = window.matchMedia("(max-width: 820px)").matches) => {
    focusFinding.current = moveFocus;
    controller.setReviewCursor({ category: fixBucket(item), issueId: item.id });
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
  const firstTarget = kind === "order" || finding?.figureGroup || finding?.members ? null : targets.find(t => t.page);
  const drawerTargets = finding?.members ? finding.members.flatMap(member => member.targets || []) : targets;
  const showOrder = kind === "order" && !finding.comparison?.readingSequenceMissing;
  const detailArticle = finding && (
        <Card as="article" className="problem-frame" data-finding-id={finding.id}>
      <Button className="review-list-back" onClick={() => { const current = document.querySelector('.fix-card[aria-current="true"], .page-pins-entry[aria-current="true"]'); current?.scrollIntoView({ block: "center", behavior: "instant" }); current?.focus({ preventScroll: true }); }}>Back to the list</Button>
      <p className="fix-detail-eyebrow"><span className={`fix-dot fix-dot--${bucket}`} aria-hidden="true" />{BUCKETS[bucket].label}{card.where ? ` · ${card.where}` : ""}</p>
      <h2 className="review-detail-title" id="finding-title" tabIndex={-1} ref={titleRef}>{card.title}</h2>
      <Notice variant={{ fix: "negative", check: "warning", unknown: "info" }[bucket]} icon={false}><p>{card.summary}</p></Notice>
      {card.also?.length > 0 && <div className="fix-also"><p>Doing this should also fix:</p><ul>{card.also.map(text => <li key={text}>{text}</li>)}</ul></div>}
      {finding.figureGroup ? <FigureGroup key={finding.id} finding={finding} file={file} report={report} onInspect={inspect} />
        : finding.members ? <section aria-label="Headings" className="heading-review-list">
          {finding.members.map(member => <section key={member.id} className="heading-review-pair">
            <h3>{member.comparison?.query || member.title.replace(/^Heading: /, "")}</h3>
            {member.comparison?.candidates?.[0]?.text && <p className="heading-review-excerpt"><span>Text below it:</span> {excerpt(member.comparison.candidates[0].text)}</p>}
            {member.targets?.length > 0 && <Button onClick={() => inspect(member.targets[0])}>Show on page {member.targets[0].page}</Button>}
          </section>)}
        </section>
        : kind === "title" || kind === "authors" ? <IdentityComparison kind={kind} report={report} file={file} targets={targets} onInspect={inspect} compact />
        : showOrder ? <OrderComparison report={report} file={file} onInspect={inspect} compact />
        : kind === "attachments" ? <AttachmentInventory inventory={report.attachments} compact />
        : finding.source?.path?.startsWith("semantic.") ? <SemanticExcerpts finding={finding} />
        : finding.comparison?.figure ? <FigureContext key={finding.id} finding={finding} file={file} report={report} targets={targets} onInspect={inspect} />
        : kind === "order" ? null
        : <Crop file={file} report={report} targets={targets} />}
      {card.change && <section className="fix-change">
        <h3>{bucket === "unknown" ? "To check it yourself" : "What to change"}</h3>
        <p>{card.change}</p>
      </section>}
      <Actions className="fix-actions">
        {firstTarget && <Button variant="primary" onClick={() => inspect(firstTarget)}>Show on page {firstTarget.page}</Button>}
        <Button onClick={() => setDrawerOpen(true)}>Technical evidence</Button>
      </Actions>
      {(task.why || finding.whyItMatters) && <details className="fix-why">
        <summary>Why this matters</summary>
        <Guidance text={task.why || finding.whyItMatters} />
      </details>}
    </Card>
  );
  const overlays = <>
    {drawerOpen && finding && <EvidenceDrawer title={card.title} onClose={() => setDrawerOpen(false)}>
      <section>
        <h3>Detailed steps</h3>
        <Guidance text={task.detailAction || (task.summary ? task.action : finding.whatToInspect)} />
        {finding.source?.checkId === "title" && finding.outcome === "fail" && <MetadataGuidance />}
      </section>
      {headingGroup ? <section aria-label="Headings and the text the AI compared">
        {headingGroup.sharedModel && <p className="model-note">Model used for these headings: {headingGroup.sharedModel.label || headingGroup.sharedModel.id}.</p>}
        {headingGroup.members.map(({ finding: member, method: memberMethod }) => <section key={member.id} className="heading-review-pair">
          <h3>{member.comparison?.query || member.title.replace(/^Heading: /, "")}</h3>
          <p>{reviewTask(member).summary || member.summary}</p>
          <MethodEvidence finding={member} method={memberMethod} headingLevel="h4" />
          <ScreeningInputs finding={member} method={memberMethod} showModel={!headingGroup.sharedModel} showLimitNote={!headingGroup.sharedModel} />
        </section>)}
        {headingGroup.sharedModel && <p className="model-note">The AI compares short excerpts and may miss important context. The detailed JSON retains exact inputs and technical scores.</p>}
      </section> : <>
        <MethodEvidence finding={finding.figureGroup ? finding.members[0] : finding} method={method} />
        <ScreeningInputs finding={finding} method={method} />
      </>}
      {kind === "order" && <OrderTechnical report={report} onInspect={inspect} />}
      {kind === "attachments" && <AttachmentInventory inventory={report.attachments} />}
      {drawerTargets.length > 0 && <PageLocations targets={drawerTargets} onInspect={inspect} />}
    </EvidenceDrawer>}
    {fullOpen && !state.modelBusy && <PreviewDialog file={file} report={report} selection={selection} onClose={() => setFullOpen(false)} />}
  </>;
  const pagesView = <PagePins entries={pinEntries} unknown={buckets.unknown} limits={buckets.limits.map(limitText)} report={report} file={file}
    selectedId={finding?.id} onSelect={(item, moveFocus) => choose(item, moveFocus)} onShowPage={page => inspect({ page, label: `Page ${page}` })}
    detail={<section id="selected-item-analysis" className="page-pins-detail-pane" ref={detailRef} aria-labelledby={finding ? "finding-title" : undefined} aria-label={finding ? undefined : "Selected item"} tabIndex={0}>
      {detailArticle || <p className="model-note">Choose an item to see what to change.</p>}
    </section>} />;
  const fixes = <>
    <div className={`review-inbox ${selectable.length || buckets.limits.length ? "" : "review-inbox--empty"}`}>
      <nav className="fix-list" aria-labelledby="fix-list-title">
        <h2 id="fix-list-title" className="mg-u-sr-only">Review list</h2>
        {["fix", "check"].map(key => buckets[key].length > 0 && <section key={key} className={`fix-bucket fix-bucket--${key}`} aria-labelledby={`fix-bucket-${key}`}>
          <h3 id={`fix-bucket-${key}`}>{BUCKETS[key].label} <span className="fix-bucket-count">({buckets[key].length})</span></h3>
          <p className="fix-bucket-intro">{BUCKETS[key].intro}</p>
          <FixCards items={buckets[key]} report={report} selected={finding} onChoose={choose} />
        </section>)}
        {!buckets.fix.length && !buckets.check.length && <p className="fix-bucket-empty">Nothing to fix or check was found automatically.</p>}
        {(buckets.unknown.length > 0 || buckets.limits.length > 0) && <details className="fix-bucket fix-bucket--unknown" open={bucket === "unknown" || undefined}>
          <summary className="fix-bucket-summary">{BUCKETS.unknown.label} <span className="fix-bucket-count">({buckets.unknown.length + buckets.limits.length})</span></summary>
          <p className="fix-bucket-intro">{BUCKETS.unknown.intro}</p>
          <FixCards items={buckets.unknown} report={report} selected={finding} onChoose={choose} />
          {buckets.limits.length > 0 && <>
            <h4 className="fix-limits-title">Not checked by this tool</h4>
            <ul className="fix-limits">{buckets.limits.map(item => <li key={item.id}>{limitText(item)}</li>)}</ul>
          </>}
        </details>}
        <p className="fix-list-note">This tool doesn’t change your PDF. Fix the source document, export again and check the new PDF.</p>
      </nav>
      <section id="selected-item-analysis" className="review-detail" ref={detailRef} aria-labelledby={finding ? "finding-title" : undefined} aria-label={finding ? undefined : "Selected item"} tabIndex={0}>
      {detailArticle || <p className="model-note">{selectable.length ? "Choose an item to see what to change." : "Use Show the PDF to look through the pages yourself."}</p>}
      <Button className="fix-show-pdf" onClick={() => { setSelection(null); setFullOpen(true); }}>Show the PDF</Button>
      </section>
    </div>
  </>;
  const technical = <div className="technical-details">
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
    <section className="review-limits" aria-labelledby="review-limits-title">
      <h2 id="review-limits-title">What this tool cannot check</h2>
      <ul>
        {groups.limits.flatMap(item => item.evidence?.filter(value => typeof value === 'string').map(reviewLimitEvidence) || []).map((value, i) => <li key={i}>{value}</li>)}
        <li>Image and chart meaning, factual accuracy and intended reading order are not fully verified by this tool.</li>
      </ul>
    </section>
    {experimentEvidence && <SemanticEvidenceLab key={state.sourceKey} report={report} documentEvidence={experimentEvidence} onInspect={inspect} />}
    <section id="advanced-evidence" aria-labelledby="technical-record-title">
      <h2 id="technical-record-title">Technical analysis record</h2>
      <AdvancedReport report={report} />
    </section>
  </div>;
  return (
    <>
      {state.modelBusy && <section className="screening-wait" aria-label="PDF analysis in progress">
        <h1 id="flow-title" className="flow-title" tabIndex={-1}>Checking your PDF</h1>
        <Checks state={state} controller={controller} batchBusy={state.batchBusy} showSettings={false} />
      </section>}
      <div hidden={state.modelBusy} inert={state.modelBusy || undefined}>
      <ResultHero overview={overview} file={file}
        exports={<ExportMenu ref={exportRef} getState={() => ({ report: controller.getSnapshot().report, file: controller.getSnapshot().file })} sourceKey={state.sourceKey} disabled={state.modelBusy} secondary compact />}
        titleId={state.modelBusy ? undefined : "flow-title"} />
      {!state.modelBusy && ((state.aiEnabled && !report.semantic?.inferencePerformed) || ["error", "not-run", "canceled"].includes(state.screeningAttempt?.status)) &&
        <Checks state={state} controller={controller} batchBusy={state.batchBusy} coverage={groups.coverage} showSettings={false} />}
      <Tabs label="Results" value={view} onChange={setView} tabs={[
        { value: "pages", label: "What to fix", content: pagesView },
        { value: "fixes", label: "List view", content: fixes },
        { value: "technical", label: "Technical details", content: technical },
      ]} />
      {overlays}
      {state.batchId && <Actions><Button onClick={onReturnBatch}>Return to batch</Button></Actions>}
      </div>
    </>
  );
}
function FixCards({ items, report, selected, onChoose }) {
  return <ol className="fix-cards">{items.map(item => {
    const card = fixCard(item, report);
    const current = item.id === selected?.id;
    return <li key={item.id}>
      <button type="button" className={`fix-card ${current ? "is-selected" : ""}`} aria-current={current ? "true" : undefined}
        aria-controls="selected-item-analysis" onClick={() => onChoose(item)}>
        <span className="fix-card-title">{card.title}</span>
        {card.where && <span className="fix-card-where">{card.where}</span>}
      </button>
    </li>;
  })}</ol>;
}
function limitText(item) {
  if (item.source?.checkId === "supported-content") return "Images and charts: this tool cannot judge what they mean.";
  if (item.source?.path === "semantic") return item.outcome === "error" ? "AI text comparisons: the AI check did not finish." : "AI text comparisons: not run for this PDF.";
  const skipped = /^semantic:(keywords|sections):unassessed$/.exec(item.id);
  if (skipped) return `${String(item.summary || "").match(/\d+/)?.[0] || "Some"} ${skipped[1] === "keywords" ? "keywords" : "headings"} were not compared by the AI. It only compares a limited number in each PDF.`;
  return `${item.title}: ${item.summary || "not checked"}`;
}
const excerpt = text => { const value = String(text || "").replace(/\s+/g, " ").trim(); return value.length > 220 ? `${value.slice(0, 219)}…` : value; };
/** What the AI compared: the saved value and the first excerpts it read. */
function SemanticExcerpts({ finding }) {
  const details = finding.comparison || {};
  const value = details.query || details.metadata?.subject || details.metadata?.infoTitle;
  const excerpts = (details.candidates || []).filter(item => item.text).slice(0, 2);
  if (!value && !excerpts.length) return null;
  return <section className="semantic-excerpts">
    {value && <><h3>Saved in the PDF</h3><blockquote>{excerpt(value)}</blockquote></>}
    {excerpts.length > 0 && <><h3>Text the AI compared it with</h3>{excerpts.map((item, i) => <p key={i}>{item.page ? <span className="semantic-excerpt-page">Page {item.page}: </span> : null}{excerpt(item.text)}</p>)}</>}
  </section>;
}
function PageLocations({ targets, onInspect }) {
  const [limit, setLimit] = useState(12);
  return <section className="finding-evidence">
    <h3>Page locations</h3>
    {targets.slice(0, limit).map((t, i) => <Button className="location-button" key={i} onClick={() => onInspect(t)}>
      {t.page ? `Page ${t.page}: ${t.text || "evidence"}` : "Document finding · no page location"}
    </Button>)}
    {limit < targets.length && <Button onClick={() => setLimit(value => value + 12)}>Show more locations ({targets.length - limit} remaining)</Button>}
  </section>;
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
