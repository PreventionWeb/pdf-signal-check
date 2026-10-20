import React, { useEffect, useMemo, useRef, useState } from "react";
import { EvidenceCropService } from "../evidence/crops.js";
import { Button, Notice, Switch } from "../ui/react.jsx";
import { fixCard } from "./workspace.js";
import { pagePins } from "./page-pins.js";
import { readingOrderPlacement } from "../evidence/reading-order-placement.js";
import { DocumentProperties } from "./DocumentProperties.jsx";

const PAGE_BATCH = 20;
const BUCKETS = { fix: ["Fix", "Problems found in this PDF."], check: ["Check", "Possible problems. Look at each one and decide."] };
const mobile = () => window.matchMedia("(max-width: 820px)").matches;

/**
 * The fix list placed on the PDF pages. The grouped legend is the accessible equivalent of the page images; pins
 * are buttons. Numbers match the PDF download. The side panel shows the selected item's detail (passed in as `detail`).
 */
export function PagePins({ entries, tips = [], unknown = [], travel = [], travelIntro = "", limits = [], report, file, selectedId, onSelect: select, detail, onShowPage, onShowAll,
  lead = null, special = null, onSpecial = () => {}, technical = null, summaryLeads = false }) {
  // On narrow screens the list and detail live in a bottom sheet; choosing anything opens it.
  const [sheetOpen, setSheetOpen] = useState(false);
  const onSelect = (item, moveFocus) => { if (mobile()) setSheetOpen(true); select(item, moveFocus); };
  // Inbox-style entries above and below the issues: the overview and the technical record.
  const chooseSpecial = kind => { if (mobile()) setSheetOpen(true); onSpecial(kind); };
  const specialEntry = (kind, title, where) => <button type="button" className={`page-pins-entry page-pins-special ${special === kind ? "is-selected" : ""}`}
    aria-current={special === kind ? "true" : undefined} aria-controls="selected-item-analysis" onClick={() => chooseSpecial(kind)}>
    <span className={`page-pin page-pin--${kind}`} aria-hidden="true">{kind === "overview" ? "★" : "i"}</span>
    <span><span className="fix-card-title">{title}</span><span className="fix-card-where">{where}</span></span>
  </button>;
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const close = event => { if (event.key === "Escape") setSheetOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [sheetOpen]);
  const { pages: pinnedPages, unlocated } = useMemo(() => pagePins(entries, report), [entries, report]);
  const [showOrder, setShowOrder] = useState(false);
  // With reading order on, every page with a recovered sequence is shown, not only pages with issues.
  const pages = useMemo(() => {
    if (!showOrder) return pinnedPages.map(page => ({ ...page, order: [] }));
    const byPage = new Map(pinnedPages.map(page => [page.page, { ...page, order: [] }]));
    for (const { number } of report.pages || []) {
      const order = readingOrderPlacement(report, number).regions;
      if (!order.length) continue;
      byPage.set(number, { page: number, pins: byPage.get(number)?.pins || [], order });
    }
    return [...byPage.values()].sort((a, b) => a.page - b.page);
  }, [pinnedPages, showOrder, report]);
  // Only tagged text gives a reading order to show; without it the switch is unavailable and says why.
  const hasOrder = useMemo(() => (report.pages || []).some(page => page.logicalBlocks?.some(block => block.text?.trim())), [report]);
  const orderToggle = <Switch className="page-pins-order-toggle" label="Show reading order on the pages" checked={hasOrder && showOrder} disabled={!hasOrder}
    aria-describedby={hasOrder ? undefined : "page-pins-order-unavailable"} onChange={event => setShowOrder(event.target.checked)} />;
  const [shown, setShown] = useState(PAGE_BATCH);
  const service = useRef(null);
  const pageRefs = useRef(new Map());
  useEffect(() => {
    const abort = new AbortController();
    service.current = new EvidenceCropService(file, report, { signal: abort.signal });
    return () => { abort.abort(); service.current?.destroy(); service.current = null; };
  }, [file, report]);
  const selected = special ? null : entries.find(entry => entry.item.id === selectedId)?.number ?? null;
  const scrollTo = key => requestAnimationFrame(() => pageRefs.current.get(key)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  // Legend selection also brings the item's page into view; on narrow screens the detail comes first instead.
  const choose = (entry, scroll) => {
    onSelect(entry.item, scroll && mobile());
    if (!scroll || mobile()) return;
    const index = pages.findIndex(page => page.pins.some(pin => pin.number === entry.number));
    if (index >= 0) {
      if (index >= shown) setShown(index + PAGE_BATCH);
      return scrollTo(pages[index].page);
    }
    scrollTo(propertyFor(entry.item) ? "properties" : "document");
  };
  const byNumber = number => entries.find(entry => entry.number === number);
  const legendEntry = entry => {
    const located = !unlocated.includes(entry), current = entry.number === selected;
    return <li key={entry.number}>
      <button type="button" className={`page-pins-entry ${current ? "is-selected" : ""}`} aria-current={current ? "true" : undefined}
        aria-controls="selected-item-analysis" onClick={() => choose(entry, true)}>
        <span className={`page-pin page-pin--${entry.bucket}`} aria-hidden="true">{entry.number}</span>
        <span><span className="fix-card-title">{entry.title}{entry.ai && <span className="fix-ai-tag" title="The on-device AI decided this item"> AI</span>}</span><span className="fix-card-where">{located ? entry.where : unplacedLabel(entry)}</span></span>
      </button>
    </li>;
  };
  return <div className="page-pins">
    <aside id="page-pins-panel" className={`page-pins-panel ${sheetOpen ? "is-open" : ""}`} aria-label="Issues and details">
      <div className="page-pins-sheet-header"><strong>Issues ({entries.length})</strong><Button onClick={() => setSheetOpen(false)}>Close</Button></div>
      <nav className="page-pins-legend" aria-labelledby="page-pins-title">
        <h2 id="page-pins-title" className="mg-u-sr-only">Issues in this PDF</h2>
        {!summaryLeads && specialEntry("overview", "Overview", "Summary and downloads")}
        {!entries.length && <p className="fix-bucket-empty">Nothing to fix or check was found automatically.</p>}
        {["fix", "check"].map(bucket => {
          const items = entries.filter(entry => entry.bucket === bucket);
          return items.length > 0 && <section key={bucket} className={`fix-bucket fix-bucket--${bucket}`} aria-labelledby={`page-pins-${bucket}`}>
            <h3 id={`page-pins-${bucket}`}>{BUCKETS[bucket][0]} <span className="fix-bucket-count">({items.length})</span></h3>
            <p className="fix-bucket-intro">{BUCKETS[bucket][1]}</p>
            <ol className="page-pins-list">{items.map(legendEntry)}</ol>
          </section>;
        })}
        {/* Opportunities, not problems: collapsed and unnumbered, so the default view stays a fix list. */}
        {travel.length > 0 && <details className="fix-bucket fix-bucket--travel" open={travel.some(item => item.id === selectedId) || undefined}>
          <summary className="fix-bucket-summary">Make it travel further <span className="fix-bucket-count">({travel.length})</span></summary>
          <p className="fix-bucket-intro">{travelIntro}</p>
          <ul className="page-pins-list">{travel.map(item => {
            const current = !special && item.id === selectedId, card = fixCard(item, report);
            return <li key={item.id}><button type="button" className={`page-pins-entry ${current ? "is-selected" : ""}`} aria-current={current ? "true" : undefined}
              aria-controls="selected-item-analysis" onClick={() => onSelect(item, mobile())}>
              <span className="page-pin page-pin--travel" aria-hidden="true">+</span>
              <span><span className="fix-card-title">{card.title}</span>{card.where && <span className="fix-card-where">{card.where}</span>}</span>
            </button></li>;
          })}</ul>
        </details>}
        {(unknown.length > 0 || limits.length > 0) && <details className="fix-bucket fix-bucket--unknown" open={unknown.some(item => item.id === selectedId) || undefined}>
          <summary className="fix-bucket-summary">Couldn’t check {unknown.length > 0 && <span className="fix-bucket-count">({unknown.length})</span>}</summary>
          <p className="fix-bucket-intro">The tool could not decide these. They are limits of this tool, not problems found in your PDF.</p>
          <ul className="page-pins-list">{unknown.map(item => {
            const current = !special && item.id === selectedId, card = fixCard(item, report);
            return <li key={item.id}><button type="button" className={`page-pins-entry ${current ? "is-selected" : ""}`} aria-current={current ? "true" : undefined}
              aria-controls="selected-item-analysis" onClick={() => onSelect(item, mobile())}>
              <span className="page-pin page-pin--unknown" aria-hidden="true">?</span>
              <span><span className="fix-card-title">{card.title}</span>{card.where && <span className="fix-card-where">{card.where}</span>}</span>
            </button></li>;
          })}</ul>
          {limits.length > 0 && <><h4 className="fix-limits-title">Not checked by this tool</h4><ul className="fix-limits">{limits.map(text => <li key={text}>{text}</li>)}</ul></>}
        </details>}
        {tips.map(item => <p key={item.id} className="fix-tip"><strong>Tip:</strong> the reading order looks right to this tool, but only a person can confirm it. Listen to a page with a screen reader, or <button type="button" className="fix-tip-link" onClick={() => onSelect(item, mobile())}>see the reading order</button>.</p>)}
        {specialEntry("technical", "Technical details", "How this PDF was checked")}
        <p className="fix-list-note">This tool doesn’t change your PDF. Fix the source document, export again and check the new PDF.</p>
      </nav>
      {detail}
    </aside>
    <div className="page-pins-main">
    {summaryLeads && lead}
    {special === "technical" ? <section className="page-pins-technical" aria-label="Technical details">{technical}</section> : <div className="page-pins-pages">
      <div className="page-pins-toolbar">{orderToggle}<Button className="page-pins-show-all" onClick={onShowAll}>Show the whole PDF</Button>{hasOrder && showOrder && <span className="model-note">Blue numbers show the order screen readers follow. Pages without a recovered order have no numbers.</span>}</div>
      {!hasOrder && <div id="page-pins-order-unavailable" className="page-pins-order-unavailable"><Notice variant="warning">
        <p>The reading order can’t be shown: this PDF has no tags, so screen readers and AI tools have no reading order to follow. Adding tags (the first fix) gives it one.</p>
      </Notice></div>}
      <section className="page-pins-page" aria-labelledby="page-pins-properties-title"
        ref={element => element ? pageRefs.current.set("properties", element) : pageRefs.current.delete("properties")}>
        <h3 id="page-pins-properties-title">Document properties</h3>
        <div className="page-pins-sheet page-pins-docsheet">
          <p className="page-pins-docsheet-intro">This information is saved inside the PDF, not printed on its pages. Search engines, screen readers and AI tools use it to identify the document. The designer can change it in the source document’s file properties.</p>
          <DocumentProperties metadata={report.metadata} title={null} annotate={label => {
            const related = entries.filter(entry => propertyFor(entry.item) === label);
            return related.length > 0 && <span className="page-pins-property-pins">{related.map(entry =>
              <TippedPin key={entry.number} entry={entry} selected={entry.number === selected} onSelect={() => onSelect(entry.item, mobile())} />)}</span>;
          }} />
        </div>
      </section>
      {unlocated.length > 0 && <section className="page-pins-page" aria-labelledby="page-pins-document-title"
        ref={element => element ? pageRefs.current.set("document", element) : pageRefs.current.delete("document")}>
        <h3 id="page-pins-document-title">Whole document</h3>
        <div className="page-pins-sheet page-pins-docsheet">
          <p className="page-pins-docsheet-intro">These issues can’t be pinned to one spot on a page. They affect the document’s settings or the whole PDF, or the tool couldn’t find their exact position.</p>
          <ol className="page-pins-docsheet-list">{unlocated.map(entry => {
            const isSelected = entry.number === selected;
            // The whole card selects the item for pointer users; the numbered button stays the keyboard and screen-reader control.
            return <li key={entry.number} className={`page-pins-doccard ${isSelected ? "is-selected" : ""}`}
              onClick={event => { if (!event.target.closest("button, a, input, label")) onSelect(entry.item, mobile()); }}>
              <TippedPin entry={entry} selected={isSelected} onSelect={() => onSelect(entry.item, mobile())} />
              <div>
                <h4>{entry.title}</h4>
                <p className="fix-card-where">{unplacedLabel(entry)}</p>
                {/* A pointer like a page pin: one line here, the full summary and What to change in the detail pane. */}
                {entry.summary && <p>{brief(entry.summary)}</p>}
                {entry.item.source?.path === "readingOrder" && hasOrder && orderToggle}
              </div>
            </li>;
          })}</ol>
        </div>
      </section>}
      {pages.slice(0, shown).map(({ page, pins, order }) => <PinnedPage key={page} page={page} pins={pins} order={order} service={service} selected={selected}
        onSelect={number => onSelect(byNumber(number).item, mobile())} onShowPage={onShowPage} describe={number => byNumber(number)?.summary}
        pageRef={element => element ? pageRefs.current.set(page, element) : pageRefs.current.delete(page)} />)}
      {shown < pages.length && <Button onClick={() => setShown(value => value + PAGE_BATCH)}>Show {Math.min(PAGE_BATCH, pages.length - shown)} more pages ({pages.length - shown} remaining)</Button>}
    </div>}
    </div>
    {/* Narrow screens: a persistent bar opens the list and the selected item's detail as a bottom sheet. */}
    <button type="button" className="page-pins-sheet-toggle" aria-controls="page-pins-panel" aria-expanded={sheetOpen} onClick={() => setSheetOpen(open => !open)}>
      <span>Issues ({entries.length}){selected ? ` · item ${selected} selected` : ""}</span><span aria-hidden="true">{sheetOpen ? "▾" : "▴"}</span>
    </button>
  </div>;
}

/** Which saved property an issue is about, so its pin can sit beside that row. */
const propertyFor = item => {
  const path = item.source?.path || "", check = item.source?.checkId;
  if (/^(metadataConsistency|deterministicTitle)$/.test(path) || check === "title" || /^semantic\.(title|titleAI)$/.test(path)) return "Title";
  if (path === "authorConsistency") return "Author";
  if (check === "language") return "Language";
  if (path === "semantic.subject") return "Description (Subject)";
  if (path.startsWith("semantic.keyword")) return "Keywords";
  return null;
};

/** Issues with pages but no reliable position say so; others name where they apply instead of a page. */
const unplacedLabel = entry => /^Pages? /.test(entry.where || "") ? `${entry.where} · exact position unknown` : entry.where || "Whole document";

/** Renders one page only when it scrolls near the viewport, then keeps the image until unmount. */
const TOOLTIP_BUCKET = { fix: "Fix", check: "Check" };
/** A numbered pin outside the page images (document properties, whole-document sheet) with the same hover/focus tooltip. */
function TippedPin({ entry, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const hide = event => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", hide);
    return () => document.removeEventListener("keydown", hide);
  }, [open]);
  const id = `pin-tip-doc-${entry.number}`;
  return <span className="page-pins-tipped" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button type="button" className={`page-pin page-pin--${entry.bucket} page-pins-docpin ${selected ? "is-selected" : ""}`} aria-label={`${entry.number}: ${entry.title}`}
      aria-pressed={selected} aria-describedby={open ? id : undefined} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={onSelect}>{entry.number}</button>
    {open && <span role="tooltip" id={id} className="page-pins-tooltip page-pins-tooltip--inline">
      <span className="page-pins-tooltip-eyebrow">{entry.number} · {TOOLTIP_BUCKET[entry.bucket] || entry.bucket}</span>
      <strong>{entry.title}</strong>
      {entry.summary && <span>{brief(entry.summary)}</span>}
      <span className="page-pins-tooltip-hint">Click for what to change</span>
    </span>}
  </span>;
}
const brief = text => { const value = String(text || "").trim(); if (value.length <= 160) return value; const cut = value.slice(0, 159); return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 120))}…`; };
function PinnedPage({ page, pins, order, service, selected, onSelect, onShowPage, pageRef, describe = () => null }) {
  const element = useRef(null);
  // Hover or keyboard focus on a pin or its outline explains the issue in one line; Escape hides it.
  const [tip, setTip] = useState(null);
  useEffect(() => {
    if (tip == null) return undefined;
    const hide = event => { if (event.key === "Escape") setTip(null); };
    document.addEventListener("keydown", hide);
    return () => document.removeEventListener("keydown", hide);
  }, [tip]);
  const [image, setImage] = useState(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: "600px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || !service.current) return;
    let url, active = true;
    service.current.renderPage(page, [...pins.map(pin => pin.quads), ...order.map(region => [region.quad])]).then(result => {
      if (!active) return;
      url = URL.createObjectURL(result.blob);
      setImage({ ...result, url });
    }).catch(() => { if (active) setImage({ failed: true }); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [visible, page, pins, order, service]);
  return <section className="page-pins-page" ref={node => { element.current = node; pageRef(node); }} aria-label={`Page ${page}`}>
    <div className="page-pins-page-header"><h3>Page {page}</h3><Button onClick={() => onShowPage(page)}>Show larger</Button></div>
    <div className="page-pins-sheet" style={image?.width ? { aspectRatio: `${image.width} / ${image.height}` } : undefined}>
      {image?.url && <img src={image.url} alt={`Page ${page} of the PDF`} />}
      {image?.failed && <p className="model-note">This page could not be shown.</p>}
      {!image && <p className="model-note">Loading page {page}…</p>}
      {image?.boxes && order.map((region, index) => {
        // A page rendered before the toggle has no boxes for the order regions until it re-renders.
        const box = image.boxes[pins.length + index];
        if (!box) return null;
        return <React.Fragment key={`order-${index}`}>
          <span className="page-pins-order-box" aria-hidden="true" style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` }} />
          {region.label && <span className="page-pins-order-number" aria-hidden="true" style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%` }}>{region.number}</span>}
        </React.Fragment>;
      })}
      {image?.boxes && pins.map((pin, index) => {
        const box = image.boxes[index];
        if (!box) return null;
        const isSelected = pin.number === selected;
        return <React.Fragment key={pin.number}>
          <span className={`page-pins-box page-pins-box--${pin.bucket} ${isSelected ? "is-selected" : ""}`} aria-hidden="true"
            style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` }}
            onMouseEnter={() => setTip(pin.number)} onMouseLeave={() => setTip(null)} onClick={() => onSelect(pin.number)} />
          <button type="button" className={`page-pin page-pin--${pin.bucket} page-pins-marker ${isSelected ? "is-selected" : ""}`}
            style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, marginLeft: `${index * 4}px` }}
            aria-label={`${pin.number}: ${pin.title}`} aria-pressed={isSelected} aria-describedby={tip === pin.number ? `pin-tip-${page}-${pin.number}` : undefined}
            onMouseEnter={() => setTip(pin.number)} onMouseLeave={() => setTip(null)} onFocus={() => setTip(pin.number)} onBlur={() => setTip(null)}
            onClick={() => onSelect(pin.number)}>{pin.number}</button>
          {tip === pin.number && <span role="tooltip" id={`pin-tip-${page}-${pin.number}`} className={`page-pins-tooltip ${box.y > 0.7 ? "is-above" : ""}`}
            style={{ left: `${Math.min(box.x, 0.55) * 100}%`, top: `${(box.y > 0.7 ? box.y : box.y + box.height) * 100}%` }}>
            <span className="page-pins-tooltip-eyebrow">{pin.number} · {TOOLTIP_BUCKET[pin.bucket] || pin.bucket}</span>
            <strong>{pin.title}</strong>
            {describe(pin.number) && <span>{brief(describe(pin.number))}</span>}
            <span className="page-pins-tooltip-hint">Click for what to change</span>
          </span>}
        </React.Fragment>;
      })}
    </div>
  </section>;
}
