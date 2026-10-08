import React, { useEffect, useMemo, useRef, useState } from "react";
import { EvidenceCropService } from "../evidence/crops.js";
import { Button, Switch } from "../ui/react.jsx";
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
export function PagePins({ entries, unknown = [], travel = [], travelIntro = "", limits = [], report, file, selectedId, onSelect, detail, onShowPage, onShowAll }) {
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
  const orderToggle = <Switch className="page-pins-order-toggle" label="Show reading order on the pages" checked={showOrder} onChange={event => setShowOrder(event.target.checked)} />;
  const [shown, setShown] = useState(PAGE_BATCH);
  const service = useRef(null);
  const pageRefs = useRef(new Map());
  useEffect(() => {
    const abort = new AbortController();
    service.current = new EvidenceCropService(file, report, { signal: abort.signal });
    return () => { abort.abort(); service.current?.destroy(); service.current = null; };
  }, [file, report]);
  const selected = entries.find(entry => entry.item.id === selectedId)?.number ?? null;
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
        <span><span className="fix-card-title">{entry.title}</span><span className="fix-card-where">{located ? entry.where : unplacedLabel(entry)}</span></span>
      </button>
    </li>;
  };
  return <div className="page-pins">
    <aside className="page-pins-panel">
      <nav className="page-pins-legend" aria-labelledby="page-pins-title">
        <h2 id="page-pins-title" className="mg-u-sr-only">Issues in this PDF</h2>
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
            const current = item.id === selectedId, card = fixCard(item, report);
            return <li key={item.id}><button type="button" className={`page-pins-entry ${current ? "is-selected" : ""}`} aria-current={current ? "true" : undefined}
              aria-controls="selected-item-analysis" onClick={() => onSelect(item, mobile())}>
              <span className="page-pin page-pin--travel" aria-hidden="true">+</span>
              <span><span className="fix-card-title">{card.title}</span>{card.where && <span className="fix-card-where">{card.where}</span>}</span>
            </button></li>;
          })}</ul>
        </details>}
        {(unknown.length > 0 || limits.length > 0) && <details className="fix-bucket fix-bucket--unknown" open={unknown.some(item => item.id === selectedId) || undefined}>
          <summary className="fix-bucket-summary">Couldn’t check <span className="fix-bucket-count">({unknown.length + limits.length})</span></summary>
          <p className="fix-bucket-intro">The tool could not decide these. They are limits of this tool, not problems found in your PDF.</p>
          <ul className="page-pins-list">{unknown.map(item => {
            const current = item.id === selectedId, card = fixCard(item, report);
            return <li key={item.id}><button type="button" className={`page-pins-entry ${current ? "is-selected" : ""}`} aria-current={current ? "true" : undefined}
              aria-controls="selected-item-analysis" onClick={() => onSelect(item, mobile())}>
              <span className="page-pin page-pin--unknown" aria-hidden="true">?</span>
              <span><span className="fix-card-title">{card.title}</span>{card.where && <span className="fix-card-where">{card.where}</span>}</span>
            </button></li>;
          })}</ul>
          {limits.length > 0 && <><h4 className="fix-limits-title">Not checked by this tool</h4><ul className="fix-limits">{limits.map(text => <li key={text}>{text}</li>)}</ul></>}
        </details>}
        <p className="fix-list-note">This tool doesn’t change your PDF. Fix the source document, export again and check the new PDF.</p>
      </nav>
      {detail}
    </aside>
    <div className="page-pins-pages">
      <div className="page-pins-toolbar">{orderToggle}<Button className="page-pins-show-all" onClick={onShowAll}>Show the whole PDF</Button>{showOrder && <span className="model-note">Blue numbers show the order screen readers follow. Pages without a recovered order have no numbers.</span>}</div>
      <section className="page-pins-page" aria-labelledby="page-pins-properties-title"
        ref={element => element ? pageRefs.current.set("properties", element) : pageRefs.current.delete("properties")}>
        <h3 id="page-pins-properties-title">Document properties</h3>
        <div className="page-pins-sheet page-pins-docsheet">
          <p className="page-pins-docsheet-intro">This information is saved inside the PDF, not printed on its pages. Search engines, screen readers and AI tools use it to identify the document. The designer can change it in the source document’s file properties.</p>
          <DocumentProperties metadata={report.metadata} title={null} annotate={label => {
            const related = entries.filter(entry => propertyFor(entry.item) === label);
            return related.length > 0 && <span className="page-pins-property-pins">{related.map(entry =>
              <button key={entry.number} type="button" className={`page-pin page-pin--${entry.bucket} page-pins-docpin ${entry.number === selected ? "is-selected" : ""}`}
                aria-label={`${entry.number}: ${entry.title}`} aria-pressed={entry.number === selected} onClick={() => onSelect(entry.item, mobile())}>{entry.number}</button>)}</span>;
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
            return <li key={entry.number} className={isSelected ? "is-selected" : undefined}>
              <button type="button" className={`page-pin page-pin--${entry.bucket} page-pins-docpin`} aria-label={`${entry.number}: ${entry.title}`} aria-pressed={isSelected}
                onClick={() => onSelect(entry.item, mobile())}>{entry.number}</button>
              <div>
                <h4>{entry.title}</h4>
                <p className="fix-card-where">{unplacedLabel(entry)}</p>
                <p>{entry.summary}</p>
                {entry.change && <p><strong>What to change:</strong> {entry.change}</p>}
                {entry.item.source?.path === "readingOrder" && orderToggle}
              </div>
            </li>;
          })}</ol>
        </div>
      </section>}
      {pages.slice(0, shown).map(({ page, pins, order }) => <PinnedPage key={page} page={page} pins={pins} order={order} service={service} selected={selected}
        onSelect={number => onSelect(byNumber(number).item, mobile())} onShowPage={onShowPage}
        pageRef={element => element ? pageRefs.current.set(page, element) : pageRefs.current.delete(page)} />)}
      {shown < pages.length && <Button onClick={() => setShown(value => value + PAGE_BATCH)}>Show {Math.min(PAGE_BATCH, pages.length - shown)} more pages ({pages.length - shown} remaining)</Button>}
    </div>
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
function PinnedPage({ page, pins, order, service, selected, onSelect, onShowPage, pageRef }) {
  const element = useRef(null);
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
            style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` }} />
          <button type="button" className={`page-pin page-pin--${pin.bucket} page-pins-marker ${isSelected ? "is-selected" : ""}`}
            style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, marginLeft: `${index * 4}px` }}
            aria-label={`${pin.number}: ${pin.title}`} aria-pressed={isSelected} onClick={() => onSelect(pin.number)}>{pin.number}</button>
        </React.Fragment>;
      })}
    </div>
  </section>;
}
