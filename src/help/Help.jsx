import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HELP_TOPICS } from "./catalog.js";
import { helpPlacement } from "./placement.js";
import { Icon } from "../ui/react.jsx";
/** Native top-layer region: local help only; no model or PDF ownership. */
export function Help({ topic: topicKey, label, extraText }) {
  const topic = HELP_TOPICS[topicKey],
    id = useId(),
    root = useRef(null),
    trigger = useRef(null),
    popup = useRef(null),
    timer = useRef(null),
    pinned = useRef(false),
    quiet = useRef(0),
    [open, setOpen] = useState(false);
  const hide = () => {
    clearTimeout(timer.current);
    quiet.current = performance.now() + 350;
    pinned.current = false;
    if (popup.current?.matches(":popover-open")) popup.current.hidePopover();
    setOpen(false);
  };
  const show = () => {
    clearTimeout(timer.current);
    const panel = popup.current;
    if (!panel) return;
    if (!panel.matches(":popover-open")) panel.showPopover();
    panel.style.width = `${Math.min(340, innerWidth - 24)}px`;
    panel.style.maxHeight = `${innerHeight - 24}px`;
    const position = helpPlacement(
      trigger.current.getBoundingClientRect(),
      { width: innerWidth, height: innerHeight },
      panel.offsetHeight,
    );
    for (const key of ["width", "left", "top", "maxHeight"])
      panel.style[key] = `${position[key]}px`;
    setOpen(true);
  };
  const schedule = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (
        !pinned.current &&
        !root.current?.matches(":hover") &&
        !root.current?.contains(document.activeElement) &&
        !popup.current?.contains(document.activeElement)
      )
        hide();
    }, 180);
  };
  useEffect(() => {
    const panel = popup.current;
    return () => {
      clearTimeout(timer.current);
      if (panel?.matches(":popover-open")) panel.hidePopover();
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const position = () => show();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open]);
  if (!topic) return null;
  return (
    <span
      ref={root}
      className="help-tip"
      onBlur={schedule}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          hide();
          trigger.current.focus({ preventScroll: true });
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="help-trigger mg-icon-button"
        aria-label={label || `About ${topic.title}`}
        aria-controls={id}
        aria-expanded={open}
        onPointerEnter={(e) => {
          if (e.pointerType !== "touch" && performance.now() > quiet.current)
            show();
        }}
        onPointerLeave={schedule}
        onFocus={() => {
          if (performance.now() > quiet.current) show();
        }}
        onClick={() => {
          if (pinned.current) hide();
          else {
            pinned.current = true;
            show();
          }
        }}
      >
        <Icon name="info-circle" />
      </button>
      {createPortal(
        <div
          ref={popup}
          id={id}
          popover="auto"
          role="region"
          aria-labelledby={`${id}-title`}
          className="help-popover"
          onToggle={(e) => {
            const visible = e.newState === "open";
            setOpen(visible);
            if (!visible) {
              quiet.current = performance.now() + 350;
              pinned.current = false;
            }
          }}
          onPointerEnter={() => clearTimeout(timer.current)}
          onPointerLeave={schedule}
        >
          <h4 id={`${id}-title`}>{topic.title}</h4>
          <button
            type="button"
            className="help-close mg-icon-button"
            aria-label={`Close help about ${topic.title}`}
            onClick={() => {
              hide();
              trigger.current.focus({ preventScroll: true });
            }}
          >
            <Icon name="close" />
          </button>
          {[...(extraText ? [extraText] : []), ...topic.text].map((text, i) => (
            <p key={i}>{text}</p>
          ))}
          {topic.references?.map((ref) => (
            <a
              key={ref.url}
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${ref.label} (opens in a new tab)`}
            >
              {ref.label} ↗
            </a>
          ))}
        </div>,
        document.body,
      )}
    </span>
  );
}
export function HelpLabel({ as: Tag = "span", children, topic }) {
  return (
    <Tag className="help-label">
      {children}
      <Help topic={topic} label={`About ${children}`} />
    </Tag>
  );
}
