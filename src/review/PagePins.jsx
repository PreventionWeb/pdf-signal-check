import React, { useEffect, useMemo, useRef, useState } from "react";
import { EvidenceCropService } from "../evidence/crops.js";
import { Button } from "../ui/react.jsx";
import { SegmentedControl } from "@undrr/undrr-mangrove/components/SegmentedControl.js";
import { fixCard } from "./workspace.js";
import { pagePins } from "./page-pins.js";
import { readingOrderPlacement } from "../evidence/reading-order-placement.js";
import { DocumentProperties } from "./DocumentProperties.jsx";

const PAGE_BATCH = 20;
const ZOOMS = [1, 1.25, 1.5, 2];
const BUCKETS = { fix: ["Fix", "Problems found in this PDF."], check: ["Check", "Possible problems. Look at each one and decide."] };
const mobile = () => window.matchMedia("(max-width: 820px)").matches;

/**
 * The fix list placed on the PDF pages. The grouped legend is the accessible equivalent of the page images; pins
 * are buttons. Numbers match the PDF download. The side panel shows the selected item's detail (passed in as `detail`).
 */
export function PagePins({ entries, tips = [], unknown = [], travel = [], travelIntro = "", limits = [], report, file, selectedId, onSelect: select, detail, focus = null,
  lead = null, special = null, onSpecial = () => {}, technical = null, summaryLeads = false }) {
  // On narrow screens the list and detail live in a bottom sheet; choosing anything opens it.
  const [sheetOpen, setSheetOpen] = useState(false);
  const onSelect = (item, moveFocus) => { if (mobile()) setSheetOpen(true); select(item, moveFocus); };
  // Inbox-style entries above and below the issues: the overview and the technical record.
  const chooseSpecial = kind => { if (mobile()) setSheetOpen(true); onSpecial(kind); };
  const specialEntry = (kind, title, where) => <button type="button" className={`page-pins-entry page-pins-special ${special === kind ? "is-selected" : ""}`}
    aria-current={special === kind ? "true" : undefined} aria-controls="selected-item-analysis" onClick={() => chooseSpecial(kind)}>
    <span className={`page-pin page-pin--${kind}`} aria-hidden="true">{{ overview: "★", properties: "≡" }[kind] || "i"}</span>
    <span><span className="fix-card-title">{title}</span><span className="fix-card-where">{where}</span></span>
  </button>;
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const close = event => { if (event.key === "Escape") setSheetOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [sheetOpen]);
  const { pages: pinnedPages, unlocated } = useMemo(() => pagePins(entries, report), [entries, report]);
  // The viewer: which pages, what to draw over them, and how large.
  const [mode, setMode] = useState("issues"), [filter, setFilter] = useState("all"), [zoomIndex, setZoomIndex] = useState(0);
  // Only tagged text gives a reading order to show; without it the option is unavailable and says why.
  const hasOrder = useMemo(() => (report.pages || []).some(page => page.logicalBlocks?.some(block => block.text?.trim())), [report]);
  const pages = useMemo(() => {
    const pinsByPage = new Map(pinnedPages.map(page => [page.page, page.pins]));
    const numbers = filter === "issues" ? pinnedPages.map(page => page.page) : (report.pages || []).map(page => page.number);
    return numbers.map(page => ({ page, pins: mode === "none" ? [] : pinsByPage.get(page) || [],
      order: mode === "order" && hasOrder ? readingOrderPlacement(report, page).regions : [] }));
  }, [pinnedPages, filter, mode, hasOrder, report]);
  const [shown, setShown] = useState(PAGE_BATCH);
  const service = useRef(null);
  const pageRefs = useRef(new Map());
  useEffect(() => {
    const abort = new AbortController();
    service.current = new EvidenceCropService(file, report, { signal: abort.signal });
    return () => { abort.abort(); service.current?.destroy(); service.current = null; };
  }, [file, report]);
  const selected = special ? null : entries.find(entry => entry.item.id === selectedId)?.number ?? null;
  const scrollTo = key => requestAnimationFrame(() => requestAnimationFrame(() => pageRefs.current.get(key)?.scrollIntoView({ block: "start", behavior: "smooth" })));
  /** Bring a page into the rendered list (switching to all pages if needed) and scroll to it. */
  const jump = page => {
    if (!page) return;
    let index = pages.findIndex(item => item.page === page);
    if (index < 0 && filter === "issues") { setFilter("all"); index = page - 1; }
    if (index >= shown) setShown(index + PAGE_BATCH);
    scrollTo(page);
  };
  // "Show on page" from the detail or the drawer: scroll here and highlight the spot, instead of opening a modal.
  useEffect(() => { if (focus) { setSheetOpen(false); jump(focus.page); } }, [focus?.key]);
  const [current, setCurrent] = useState(pages[0]?.page || 1);
  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0;
      let top = null;
      for (const [key, node] of pageRefs.current) if (typeof key === "number" && node.getBoundingClientRect().top <= 140) top = top == null ? key : Math.max(top, key);
      if (top != null) setCurrent(top);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);
  const sentinel = useRef(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setShown(value => value + PAGE_BATCH); }, { rootMargin: "800px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [shown, pages.length]);
  const [pageInput, setPageInput] = useState("");
  const total = (report.pages || []).length, zoom = ZOOMS[zoomIndex];
  const position = pages.findIndex(item => item.page === current);
  const toolbar = <div className="viewer-toolbar" role="toolbar" aria-label="Page viewer">
    <div className="viewer-group viewer-pages">
      <button type="button" className="viewer-button" aria-label="Previous page" disabled={position <= 0} onClick={() => jump(pages[position - 1]?.page)}>‹</button>
      <label className="viewer-page-input">Page <input type="number" min="1" max={total} inputMode="numeric" value={pageInput || current}
        onChange={event => setPageInput(event.target.value)} onBlur={() => setPageInput("")}
        onKeyDown={event => { if (event.key === "Enter") { const page = Math.min(total, Math.max(1, Number(pageInput) || current)); setPageInput(""); jump(page); } }} /> of {total}</label>
      <button type="button" className="viewer-button" aria-label="Next page" disabled={position < 0 || position >= pages.length - 1} onClick={() => jump(pages[position + 1]?.page)}>›</button>
    </div>
    <SegmentedControl legend="Pages to show" hideLegend name="viewer-filter" size="small" value={filter} onChange={event => setFilter(event.target.value)}
      options={[{ value: "all", label: "All pages" }, { value: "issues", label: `With issues (${pinnedPages.length})` }]} />
    <SegmentedControl legend="Show on the pages" hideLegend name="viewer-mode" size="small" value={mode} onChange={event => setMode(event.target.value)}
      options={[{ value: "issues", label: "Issues" }, { value: "order", label: "Reading order", disabled: !hasOrder }, { value: "none", label: "Page only" }]} />
    <div className="viewer-group viewer-zoom">
      <button type="button" className="viewer-button" aria-label="Zoom out" disabled={zoomIndex === 0} onClick={() => setZoomIndex(index => index - 1)}>−</button>
      <button type="button" className="viewer-button viewer-zoom-value" aria-label={`Zoom ${Math.round(zoom * 100)}%, reset to fit width`} onClick={() => setZoomIndex(0)}>{zoom === 1 ? "Fit" : `${Math.round(zoom * 100)}%`}</button>
      <button type="button" className="viewer-button" aria-label="Zoom in" disabled={zoomIndex === ZOOMS.length - 1} onClick={() => setZoomIndex(index => index + 1)}>+</button>
    </div>
  </div>;
  // Legend selection also brings the item's page into view; on narrow screens the detail comes first instead.
  const choose = (entry, scroll) => {
    onSelect(entry.item, scroll && mobile());
    if (!scroll || mobile()) return;
    const index = pages.findIndex(page => page.pins.some(pin => pin.number === entry.number));
    if (index >= 0) {
      if (index >= shown) setShown(index + PAGE_BATCH);
      return scrollTo(pages[index].page);
    }
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
        {specialEntry("properties", "Document properties", "Title, author, language and other saved details")}
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
      {toolbar}
      {!hasOrder && <p className="model-note viewer-note">Reading order isn’t available: this PDF has no tags, so screen readers and AI tools have no reading order to follow. Adding tags (the first fix) gives it one.</p>}
      {mode === "order" && <p className="model-note viewer-note">Blue numbers show the order screen readers follow. Compare it with the order you expect.</p>}
      {filter === "issues" && !pages.length && <p className="model-note">No page has a located issue.</p>}
      {pages.slice(0, shown).map(({ page, pins, order }) => <PinnedPage key={page} page={page} pins={pins} order={order} service={service} selected={selected} zoom={zoom}
        focus={focus?.page === page ? focus : null} orderText={mode === "order" ? (report.pages[page - 1]?.logicalBlocks || []).map(block => block.text).filter(Boolean) : null}
        onSelect={number => onSelect(byNumber(number).item, mobile())} describe={number => byNumber(number)?.summary}
        pageRef={element => element ? pageRefs.current.set(page, element) : pageRefs.current.delete(page)} />)}
      {shown < pages.length && <div ref={sentinel} className="model-note viewer-more">Loading more pages…</div>}
    </div>}
    </div>
    {/* Narrow screens: a persistent bar opens the list and the selected item's detail as a bottom sheet. */}
    <button type="button" className="page-pins-sheet-toggle" aria-controls="page-pins-panel" aria-expanded={sheetOpen} onClick={() => setSheetOpen(open => !open)}>
      <span>Issues ({entries.length}){selected ? ` · item ${selected} selected` : ""}</span><span aria-hidden="true">{sheetOpen ? "▾" : "▴"}</span>
    </button>
  </div>;
}

/** Which saved property an issue is about, so its pin can sit beside that row. */
const PROPERTY_KINDS = { title: "Title", "title-language": "Title", keywords: "Keywords", "subject-link": "Description (Subject)", language: "Language" };
const propertyFor = item => {
  const path = item.source?.path || "", check = item.source?.checkId;
  // Consistency findings about saved values: a title compared with the saved title, or a placeholder or language mismatch.
  const consistency = [item, ...(item.members || [])].map(member => member.comparison?.consistency).filter(Boolean);
  if (consistency.some(found => found.left?.role === "saved" || found.right?.role === "saved")) return "Title";
  const kind = consistency.map(found => PROPERTY_KINDS[found.kind]).find(Boolean);
  if (kind) return kind;
  if (/^(metadataConsistency|deterministicTitle)$/.test(path) || check === "title" || /^semantic\.(title|titleAI)$/.test(path)) return "Title";
  if (path === "authorConsistency") return "Author";
  if (path === "machineMetadata") return "Publisher";
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
  const [place, setPlace] = useState(null);
  const button = useRef(null);
  const show = () => {
    const rect = button.current?.getBoundingClientRect();
    if (rect) setPlace({ top: rect.bottom + 8, left: Math.max(8, Math.min(rect.right - 300, window.innerWidth - 308)) });
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return undefined;
    const hide = event => { if (event.key === "Escape") setOpen(false); };
    const close = () => setOpen(false);
    document.addEventListener("keydown", hide);
    window.addEventListener("scroll", close, true);
    return () => { document.removeEventListener("keydown", hide); window.removeEventListener("scroll", close, true); };
  }, [open]);
  const id = `pin-tip-doc-${entry.number}`;
  return <span className="page-pins-tipped" onMouseEnter={show} onMouseLeave={() => setOpen(false)}>
    <button ref={button} type="button" className={`page-pin page-pin--${entry.bucket} page-pins-docpin ${selected ? "is-selected" : ""}`} aria-label={`${entry.number}: ${entry.title}`}
      aria-pressed={selected} aria-describedby={open ? id : undefined} onFocus={show} onBlur={() => setOpen(false)} onClick={onSelect}>{entry.number}</button>
    {open && <span role="tooltip" id={id} className="page-pins-tooltip page-pins-tooltip--fixed" style={place || undefined}>
      <span className="page-pins-tooltip-eyebrow">{entry.number} · {TOOLTIP_BUCKET[entry.bucket] || entry.bucket}</span>
      <strong>{entry.title}</strong>
      {entry.summary && <span>{brief(entry.summary)}</span>}
      <span className="page-pins-tooltip-hint">Click for what to change</span>
    </span>}
  </span>;
}
const brief = text => { const value = String(text || "").trim(); if (value.length <= 160) return value; const cut = value.slice(0, 159); return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 120))}…`; };
function PinnedPage({ page, pins, order, service, selected, onSelect, pageRef, describe = () => null, zoom = 1, focus = null, orderText = null }) {
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
    // Re-render at the zoomed width so text stays sharp; the "Show on page" spot is the last group.
    service.current.renderPage(page, [...pins.map(pin => pin.quads), ...order.map(region => [region.quad]), ...(focus?.quads?.length ? [focus.quads] : [])], Math.round(900 * zoom)).then(result => {
      if (!active) return;
      url = URL.createObjectURL(result.blob);
      setImage({ ...result, url });
    }).catch(() => { if (active) setImage({ failed: true }); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [visible, page, pins, order, service, zoom, focus?.key]);
  const focusBox = focus?.quads?.length && image?.boxes ? image.boxes[pins.length + order.length] : null;
  return <section className="page-pins-page" ref={node => { element.current = node; pageRef(node); }} aria-label={`Page ${page}`}>
    <div className="page-pins-page-header"><h3>Page {page}</h3></div>
    <div className="page-pins-zoom">
    <div className="page-pins-sheet" style={{ ...(image?.width ? { aspectRatio: `${image.width} / ${image.height}` } : {}), width: `${zoom * 100}%` }}>
      {focusBox && <span key={focus.key} className="page-pins-focus" aria-hidden="true" style={{ left: `${focusBox.x * 100}%`, top: `${focusBox.y * 100}%`, width: `${focusBox.width * 100}%`, height: `${focusBox.height * 100}%` }} />}
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
    </div>
    {orderText?.length > 0 && <details className="viewer-order-text"><summary>Text in reading order ({orderText.length})</summary>
      <ol>{orderText.map((text, index) => <li key={index}>{text}</li>)}</ol></details>}
  </section>;
}

/** Document properties in the detail pane: every saved value, with pins for the issues about each one. */
export function PropertiesPanel({ report, entries, selectedNumber = null, onSelect }) {
  return <article className="properties-panel">
    <p className="fix-detail-eyebrow">Document properties</p>
    <h2 className="review-detail-title" tabIndex={-1}>What is saved in this PDF</h2>
    <p className="properties-intro">This information is saved inside the PDF, not printed on its pages. Search engines, screen readers and AI tools use it to identify the document. The designer can change it in the source document’s file properties.</p>
    <DocumentProperties metadata={report.metadata} title={null} annotate={label => {
      const related = entries.filter(entry => propertyFor(entry.item) === label);
      return related.length > 0 && <span className="page-pins-property-pins">{related.map(entry =>
        <TippedPin key={entry.number} entry={entry} selected={entry.number === selectedNumber} onSelect={() => onSelect(entry.item)} />)}</span>;
    }} />
  </article>;
}
