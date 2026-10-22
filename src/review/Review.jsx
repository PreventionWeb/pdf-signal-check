import { buildDocumentEvidence } from "../engine/topic-retrieval.js";
import { formatBytes } from "../ui/progress.js";
import { SemanticEvidenceLab } from "./SemanticEvidenceLab.jsx";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Checks } from "../app/Checks.jsx";
import { ProcessingPanel } from "../app/ProcessingPanel.jsx";
import { profileReceipt, profileReasons, reviewSummary, reviewTask, reviewLimitEvidence, reviewLimitText, STANDING_LIMITS, reviewGroups, fixCard, fixBucket } from "./workspace.js";
import { normalizeFindings } from "./findings.js";
import { aiInvolvement, checkedWith, findingProvenance, screeningProvenance, screeningLanguageNote, groupedFindingProvenance } from "./provenance.js";
import { Button, Card, Actions, Tag, Notice } from "../ui/react.jsx";
import { Help } from "../help/Help.jsx";
import { IdentityComparison } from "./IdentityComparison.jsx";
import { OrderComparison, OrderTechnical } from "./OrderComparison.jsx";
import { AttachmentInventory } from "./AttachmentInventory.jsx";
import { AdvancedReport } from "./AdvancedReport.jsx";
import { EvidenceDrawer } from "./EvidenceDrawer.jsx";
import { candidateBlocks } from "../geometry.js";
import { FigureContext } from "./FigureContext.jsx";
import { FigureGroup } from "./FigureGroup.jsx";
import { ConsistencyDetail } from "./ConsistencyDetail.jsx";
import { ResultHero } from "./ResultHero.jsx";
import { ScoreGauges } from "./ScoreGauges.jsx";
import { pdfScores } from "./scores.js";
import { fixerDetails } from "./fixer.js";
import { ExportMenu } from "../export/ExportMenu.jsx";
import { PagePins, PropertiesPanel, propertyLabels, foundOnPages } from "./PagePins.jsx";
import { DocumentProperties } from "./DocumentProperties.jsx";
import { hidingLabel } from "../engine/hidden-instructions.js";
import { PlaceContext, PlacePager, PlaceTextList, ShowOnPage, findingPlaces, samePlace } from "./places.jsx";

/** Whether a media query matches, kept in step with the window. */
function useMedia(query) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query), update = () => setMatches(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}
const BUCKETS = {
  fix: { label: "Fix", intro: "Problems found in this PDF." },
  check: { label: "Check", intro: "Possible problems. Look at each one and decide." },
  unknown: { label: "Couldn’t check", intro: "The tool could not decide these. They are limits of this tool, not problems found in your PDF." },
  travel: { label: "Make it travel further", intro: "Optional improvements for wider reuse, after the things to fix or check. These are not problems and do not count in the headline." },
  tip: { label: "Tip", intro: "" },
};

export function Review({ state, controller, exportRef, onReturnBatch }) {
  const { report, file } = state,
    normalized = useMemo(() => normalizeFindings(report), [report]),
    // Where the page viewer should scroll and highlight: set by every "Show on page" action.
    [focus, setFocus] = useState(null),
    [drawerOpen, setDrawerOpen] = useState(false),
    // Inbox-style selection: the Overview and Technical details entries, or null when an issue is selected.
    [special, setSpecial] = useState("overview"),
    // Below 1200 px there is no third pane, so the summary leads the main column instead of being an inbox entry (below 820 px the list is a bottom sheet).
    summaryLeads = useMedia("(max-width: 1199px)"),
    narrow = useMedia("(max-width: 820px)"),
    // The page the viewer is scrolled to, so links to what is already on screen can step aside.
    [viewerPage, setViewerPage] = useState(1),
    focusFinding = useRef(false),
    titleRef = useRef(null),
    detailRef = useRef(null);
  const { issueId } = state.reviewCursor;
  const groups = useMemo(() => reviewGroups(normalized.findings), [normalized]);
  const overview = { ...reviewSummary(report, groups), checkedWith: checkedWith(report) };
  const scores = useMemo(() => pdfScores(report), [report]);
  const { buckets } = overview;
  const selectable = [...buckets.fix, ...buckets.check, ...buckets.unknown, ...buckets.travel, ...buckets.tip];
  const defaultItem = buckets.fix[0] || buckets.check[0];
  const finding = selectable.find(item => item.id === issueId) || defaultItem,
    execution = screeningProvenance(report),
    method = finding && findingProvenance(finding.figureGroup ? finding.members[0] : finding, report),
    task = finding && reviewTask(finding),
    card = finding && fixCard(finding, report),
    bucket = finding && fixBucket(finding);
  // "AI" marks only cards whose bucket the model's comparison decided, never rule findings.
  const decidedByAI = item => [item, ...(item.members || [])].some(member => findingProvenance(member, report).kind === 'ai' && member.category === 'advisory-concern');
  const pinEntries = useMemo(() => [...buckets.fix, ...buckets.check].map((item, index) => ({ number: index + 1, item, bucket: fixBucket(item), ai: decidedByAI(item), ...fixCard(item, report) })), [groups, report]);
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
  const inspect = (t, { keepDrawer = false } = {}) => {
    const page = report.pages.find((p) => p.number === t.page);
    if (!keepDrawer) setDrawerOpen(false);
    setFocus({
      page: t.page,
      quads: t.quads?.length ? t.quads : page ? candidateBlocks(page, t).flatMap((b) => (b.quad ? [b.quad] : [])) : [],
      // The info box beside the highlight: which issue this is and what this spot shows.
      info: special || !card ? null : { eyebrow: `${BUCKETS[bucket].label} · Page ${t.page}`, title: card.title,
        text: t.label || t.note || brief(t.text) },
      target: t,
      key: Date.now(),
    });
  };
  useEffect(() => {
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
  useEffect(() => setSpecial("overview"), [state.sourceKey]);
  const choose = (item, moveFocus = window.matchMedia("(max-width: 820px)").matches) => {
    setSpecial(null);
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
  const places = useMemo(() => findingPlaces(finding, targets, kind), [finding, targets, kind]);
  const placeIndex = places.findIndex(place => samePlace(place, focus?.target));
  const placeContext = { narrow, isShown: target => samePlace(focus?.target, target) && viewerPage === target.page };
  // Wide screens: selecting an issue brings its first place into view, so the reader never has to ask for it.
  // Anything else (Overview, Document properties, an issue with no place) clears the last highlight, so it can't linger on the wrong issue.
  useEffect(() => {
    if (!narrow && !special && places[0]) inspect(places[0], { keepDrawer: true });
    // An issue about the whole document or its saved properties starts the viewer at page 1, with nothing highlighted.
    else if (!narrow && !special && finding) setFocus({ page: 1, quads: [], target: null, key: Date.now() });
    else setFocus(null);
  }, [finding?.id, special, narrow]);
  const ai = finding && !special ? aiInvolvement(finding, report) : null;
  const savedRows = finding && !places.length && kind !== "title" && kind !== "authors" ? propertyLabels(finding) : [];
  const drawerTargets = finding?.members ? finding.members.flatMap(member => member.targets || []) : targets;
  const showOrder = kind === "order" && !finding.comparison?.readingSequenceMissing;
  const detailArticle = finding && (
        <PlaceContext.Provider value={placeContext}><Card as="article" className="problem-frame" data-finding-id={finding.id}>
      <Button className="review-list-back" onClick={() => { const current = document.querySelector('.page-pins-entry[aria-current="true"]'); current?.scrollIntoView({ block: "center", behavior: "instant" }); current?.focus({ preventScroll: true }); }}>Back to the list</Button>
      <p className="fix-detail-eyebrow"><span className={`fix-dot fix-dot--${bucket}`} aria-hidden="true" />{BUCKETS[bucket].label}{card.where ? ` · ${card.where}` : ""}</p>
      <h2 className="review-detail-title" id="finding-title" tabIndex={-1} ref={titleRef}>{card.title}</h2>
      {(task.why || finding.whyItMatters) && <p className="fix-why-caption">{[task.why || finding.whyItMatters].flat()[0]}</p>}
      {/* The one sentence that matters: plain lead text with a thin bucket-coloured rule, not a boxed notice. */}
      <p className={`fix-detail-lead fix-detail-lead--${bucket}`}>{card.summary}</p>
      {/* Say plainly when on-device AI flagged this or helped, and how. */}
      {ai && <p className={`fix-ai-note ${ai.decided ? "is-decided" : ""}`}><span className="fix-ai-tag">AI</span>{ai.decided ? " Flagged with on-device AI. " : " "}{ai.text}</p>}
      {card.also?.length > 0 && <div className="fix-also"><p>Doing this should also fix:</p><ul>{card.also.map(text => <li key={text}>{text}</li>)}</ul></div>}
      {finding.figureGroup ? <FigureGroup key={finding.id} finding={finding} places={places} index={placeIndex} onGo={index => inspect(places[index])} />
        : finding.source?.path?.startsWith("consistency.") || finding.consistencyGroup ? <ConsistencyDetail finding={finding} file={file} report={report} onInspect={inspect} />
        : finding.members ? <section aria-label="Headings" className="heading-review-list">
          {finding.members.map(member => <section key={member.id} className="heading-review-pair">
            <h3>{member.comparison?.query || member.title.replace(/^Heading: /, "")}</h3>
            {member.comparison?.candidates?.[0]?.text && <p className="heading-review-excerpt"><span>Text below it:</span> {excerpt(member.comparison.candidates[0].text)}</p>}
            <ShowOnPage target={member.targets?.[0]} onInspect={inspect} />
          </section>)}
        </section>
        : kind === "title" || kind === "authors" ? <IdentityComparison kind={kind} report={report} file={file} targets={targets} onInspect={inspect} compact />
        : showOrder ? <OrderComparison report={report} file={file} onInspect={inspect} compact />
        : kind === "attachments" ? <AttachmentInventory inventory={report.attachments} compact />
        : finding.source?.path === "hiddenInstructions" ? <HiddenInstructions matches={finding.comparison?.matches || []} onInspect={inspect} />
        : finding.source?.checkId === "coverage" && places.length ? <PlaceTextList places={places} index={placeIndex} onGo={index => inspect(places[index])} label="Text screen readers may skip" />
        : finding.source?.path?.startsWith("semantic.") ? <SemanticExcerpts finding={finding} />
        : finding.comparison?.figure ? <FigureContext key={finding.id} finding={finding} file={file} report={report} targets={targets} onInspect={inspect} />
        : kind === "order" ? null
        : null}
      {/* Issues about saved properties show what is saved now, so the reader needn't open Document properties. */}
      {savedRows.length > 0 && <section className="fix-saved-properties">
        <h3>What is saved now</h3>
        <DocumentProperties metadata={report.metadata} title={null} only={savedRows} found={foundOnPages(report)} />
      </section>}
      {card.change && <section className="fix-change">
        <h3>{bucket === "unknown" ? "To check it yourself" : "What to change"}</h3>
        <p>{card.change}</p>
      </section>}
      <Actions className="fix-actions">
        <PlacePager places={places} index={placeIndex} onGo={index => inspect(places[index])}
          inline={!!(finding.members || finding.comparison?.figure || finding.comparison?.consistency?.kind === "same-fact")} />
        <button type="button" className="fix-detail-secondary" onClick={() => setDrawerOpen(true)}>How to fix this</button>
      </Actions>
    </Card></PlaceContext.Provider>
  );
  const overlays = <>
    {drawerOpen && finding && <EvidenceDrawer title={card.title} onClose={() => setDrawerOpen(false)}>
      <FixerSections finding={finding} report={report} method={method} change={card.change} detail={task.detailAction} targets={drawerTargets} onInspect={inspect} />
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
        <ScreeningInputs finding={finding} method={method} />
      </>}
      {kind === "order" && <OrderTechnical report={report} onInspect={inspect} />}
      {kind === "attachments" && <AttachmentInventory inventory={report.attachments} />}
    </EvidenceDrawer>}
  </>;
  // The summary heads the main column, beside the docked issue list.
  const lead = <>
    <ResultHero overview={overview} file={file}
      exports={<ExportMenu ref={exportRef} getState={() => ({ report: controller.getSnapshot().report, file: controller.getSnapshot().file })} sourceKey={state.sourceKey} disabled={state.modelBusy} secondary compact />}
      titleId={state.modelBusy ? undefined : "flow-title"} />
    <ScoreGauges scores={scores} />
    {!state.modelBusy && ((state.aiEnabled && !report.semantic?.inferencePerformed) || ["error", "not-run", "canceled"].includes(state.screeningAttempt?.status)) &&
      <Checks state={state} controller={controller} batchBusy={state.batchBusy} coverage={groups.coverage} showSettings={false} />}
  </>;
  const pagesView = () => <PagePins entries={pinEntries} unknown={buckets.unknown} travel={buckets.travel} tips={buckets.tip} travelIntro={BUCKETS.travel.intro} limits={[...buckets.limits.map(reviewLimitText), ...STANDING_LIMITS]} report={report} file={file}
    selectedId={finding?.id} onSelect={(item, moveFocus) => choose(item, moveFocus)} focus={focus} onPageChange={setViewerPage}
    lead={lead} special={summaryLeads && special === "overview" ? null : special} onSpecial={setSpecial} technical={technical} summaryLeads={summaryLeads}
    detail={<section id="selected-item-analysis" className="page-pins-detail-pane" ref={detailRef} aria-labelledby={finding ? "finding-title" : undefined} aria-label={finding ? undefined : "Selected item"} tabIndex={0}>
      {special === "overview" && !summaryLeads ? lead
        : special === "technical" ? methodCard
        : special === "properties" ? <PropertiesPanel report={report} entries={pinEntries} onSelect={item => choose(item)} />
        : detailArticle || <p className="model-note">Choose an item to see what to change.</p>}
    </section>} />;
  // The Technical details inbox entry: method and limits in the detail pane, the full record in the wide pane.
  const methodCard = <Card as="article" className="problem-frame technical-method">
    <p className="fix-detail-eyebrow">Technical details</p>
    <h2 className="review-detail-title" id="check-method-title" tabIndex={-1}>How this PDF was checked</h2>
    <p>{overview.checkedWith}</p>
    <ul>
      <li><div className="execution-receipt"><span>PDF extraction and rules</span> <Tag subtle>{execution.label}</Tag><Help topic={execution.kind === 'ai' ? 'ai' : 'bounded'} label="About actual AI execution" extraText={execution.detail} /></div></li>
      {screeningLanguageNote(report) && <li>{screeningLanguageNote(report)}</li>}
      <li><strong>Text profile {report.profile.replace("text-actionability-", "")}:</strong> {profileReceipt(report)}. This deterministic result is independent of the AI, the scores and the grouping above.</li>
      {profileReasons(report).map((reason, i) => <li key={i}>{reason}</li>)}
      {state.example && <li className="model-note">Synthetic example labels: {state.example.defects?.join('; ') || 'Matching control'}. These labels do not determine results.</li>}
    </ul>
    <Checks state={state} controller={controller} batchBusy={state.batchBusy} coverage={groups.coverage} showStatus={false} />
    <section className="review-limits" aria-labelledby="review-limits-title">
      <h3 id="review-limits-title">What this tool cannot check</h3>
      <ul>
        {groups.limits.flatMap(item => item.evidence?.filter(value => typeof value === 'string').map(reviewLimitEvidence) || []).map((value, i) => <li key={i}>{value}</li>)}
        <li>Image and chart meaning, factual accuracy and intended reading order are not fully verified by this tool.</li>
      </ul>
    </section>
    <p className="model-note">The full record is open beside this panel: every check that ran, each recorded value and the successful checks.</p>
    <Actions><Button onClick={() => setSpecial("overview")}>Back to the overview</Button></Actions>
  </Card>;
  const technical = <div className="technical-details">
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
        {file && <p className="flow-file">{file.name} · {formatBytes(file.size)}</p>}
        <ProcessingPanel state={state} controller={controller} />
      </section>}
      <div hidden={state.modelBusy} inert={state.modelBusy || undefined}>
      {pagesView()}
      {overlays}
      {state.batchId && <Actions><Button onClick={onReturnBatch}>Return to batch</Button></Actions>}
      </div>
    </>
  );
}

const CHANNELS = { property: "Document properties", "image-description": "Image description", "attachment-description": "Attachment description" };
/** Each hidden passage: where it is, how it is hidden, what it seems to ask an AI to do, and the text itself. */
function HiddenInstructions({ matches, onInspect }) {
  return <ul className="hidden-instructions">{matches.map((match, index) => <li key={index}>
    <p className="hidden-instructions-where">{match.kind === "page" ? `Page ${match.page} · ${hidingLabel(match.reasons)}` : `${CHANNELS[match.kind] || "Document details"}${match.field ? ` · ${match.field}` : ""}${match.page ? ` · page ${match.page}` : ""}`}</p>
    {/* A single match is already quoted in the lead sentence; quote it again only when there are several. */}
    {matches.length > 1 && <blockquote>{match.text}</blockquote>}
    <p className="hidden-instructions-why">{match.labels?.join("; ")}</p>
    {match.kind === "page" && <p className="hidden-instructions-note">{match.quads?.length ? "It can’t be seen on the page, so the outline marks where it sits." : "It can’t be seen on the page, and its exact position wasn’t recovered."}</p>}
    {matches.length > 1 && match.kind === "page" && match.quads?.length > 0 && <ShowOnPage target={{ page: match.page, quads: match.quads, text: match.text, label: "Hidden text sits here" }} onInspect={onInspect} />}
  </li>)}</ul>;
}
const brief = text => { const value = String(text || "").replace(/\s+/g, " ").trim(); return value.length > 140 ? `“${value.slice(0, 139)}…”` : value ? `“${value}”` : null; };
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
    <h4>Where in the PDF</h4>
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
/** For the person fixing it: what was found, where to change it, field names, and how the tool decided. */
function FixerSections({ finding, report, method, change, detail, targets = [], onInspect }) {
  const matches = finding.comparison?.matches || [];
  const details = fixerDetails(finding, report);
  const evidence = (finding.figureGroup ? finding.members[0] : finding).evidence?.filter(item => typeof item === "string").slice(0, 12) || [];
  return <>
    <section className="fixer-section">
      <h3>What the tool found</h3>
      {details.properties ? <table className="fixer-properties"><tbody>{details.properties.map(row => <tr key={row.label}><th scope="row">{row.label}</th>
        <td className={row.value ? undefined : "fixer-missing"}>{row.value || "Not saved"}</td></tr>)}</tbody></table>
        : matches.length ? <ul className="fixer-list">{matches.map((match, i) => <li key={i}>
          <span className="fixer-where">{match.page ? `Page ${match.page}` : match.field || "Document details"}{match.reasons?.length ? ` · ${hidingLabel(match.reasons)}` : ""}</span>
          <q>{match.text}</q></li>)}</ul>
        : evidence.length ? evidence.map((text, i) => <p key={i}>{text}</p>) : <p>{finding.summary}</p>}
      {targets.length > 0 && <PageLocations targets={targets} onInspect={onInspect} />}
    </section>
    {(details.steps.length > 0 || (detail && detail !== change)) && <section className="fixer-section">
      <h3>Where to change it</h3>
      {detail && detail !== change && <p>{detail}</p>}
      {details.steps.length > 0 && <dl className="fixer-steps">{details.steps.map(([tool, step]) => <React.Fragment key={tool}><dt>{tool}</dt><dd>{step}</dd></React.Fragment>)}</dl>}
    </section>}
    {details.fields && <section className="fixer-section">
      <h3>PDF fields, for developers</h3>
      <p className="fixer-fields">{details.fields}</p>
    </section>}
    <section className="fixer-section">
      <h3>How the tool decided</h3>
      <p><strong>{method.label}.</strong> {method.detail}</p>
    </section>
  </>;
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
