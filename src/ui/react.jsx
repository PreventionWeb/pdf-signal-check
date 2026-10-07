import React from "react";
export { Checkbox } from "@undrr/undrr-mangrove/components/Checkbox.js";
export { Radio } from "@undrr/undrr-mangrove/components/Radio.js";
export { Select } from "@undrr/undrr-mangrove/components/Select.js";
export { SegmentedControl } from "@undrr/undrr-mangrove/components/SegmentedControl.js";
export { FormGroup } from "@undrr/undrr-mangrove/components/FormGroup.js";
export { Loader } from "@undrr/undrr-mangrove/components/Loader.js";
export { StatsCard } from "@undrr/undrr-mangrove/components/StatsCard.js";
import { Notice as PublishedNotice } from "@undrr/undrr-mangrove/components/Notice.js";
export function Tag({
  variant,
  subtle = false,
  className = "",
  children,
  ...props
}) {
  const classes = [
    "mg-tag",
    subtle && "mg-tag--subtle",
    variant && `mg-tag--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
/** Published CTA renders an anchor; application actions require actual native buttons. */
export function Button({
  variant = "secondary",
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type="button"
      className={`mg-button mg-button-${variant} ${variant === "secondary" ? "mg-button-outline" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
/** VerticalCard has no content slot; arbitrary evidence uses its documented non-linked vanilla pattern. */
export function Card({
  as: Tag = "section",
  className = "",
  children,
  ...props
}) {
  return (
    <Tag
      className={`mg-card mg-card__vc mg-card--no-link ${className}`}
      {...props}
    >
      <div className="mg-card__content">{children}</div>
    </Tag>
  );
}
export function Details({
  summary,
  children,
  className = "",
  defaultOpen = false,
  open,
  ...props
}) {
  const [isOpen, setIsOpen] = React.useState(open ?? defaultOpen);
  const isControlled = open !== undefined;
  return (
    <details
      className={`mg-details ${className}`}
      open={isControlled ? open : isOpen}
      onToggle={(e) => {
        if (!isControlled) {
          setIsOpen(e.currentTarget.open);
        }
        props.onToggle?.(e);
      }}
      {...props}
    >
      <summary>{summary}</summary>
      {children}
    </details>
  );
}
export function Notice({ children, variant = "info", role = null, ...props }) {
  return (
    <PublishedNotice variant={variant} role={role} {...props}>
      {children}
    </PublishedNotice>
  );
}
/** Native Mangrove switch: a checkbox with role="switch"; the visible label names it. */
export function Switch({ label, checked, onChange, className = "", ...props }) {
  return (
    <label className={`mg-switch ${className}`}>
      <input role="switch" className="mg-switch__input" type="checkbox" checked={checked} onChange={onChange} {...props} />
      <span className="mg-switch__track" aria-hidden="true"><span className="mg-switch__thumb"></span></span>
      <span className="mg-switch__label">{label}</span>
    </label>
  );
}
export function Actions({ children, className = "" }) {
  return (
    <div className={`flow-actions mg-u-flex mg-u-flex-wrap mg-u-align-items-center mg-u-gap-100 ${className}`}>
      {children}
    </div>
  );
}
export function Icon({ name }) {
  return <span className={`mg-icon mg-icon-${name}`} aria-hidden="true" />;
}
