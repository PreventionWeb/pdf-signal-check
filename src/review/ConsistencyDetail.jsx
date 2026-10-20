import React from "react";
import { Button } from "../ui/react.jsx";
import { consistencyMemberText } from "./workspace.js";

const ROLES = { saved: "Saved title (document properties)", cover: "Cover", running: "Page headers and footers" };
const where = name => name.role === "running" ? `${ROLES.running}, ${name.pages.length} pages` : ROLES[name.role];

/** The values that disagree, side by side; grouped tasks list each member with its own page link. */
export function ConsistencyDetail({ finding, file, report, onInspect }) {
  if (finding.members) return <section aria-label="Places to check" className="heading-review-list">
    {finding.members.map(member => {
      const item = member.comparison.consistency;
      const target = member.targets?.[0];
      return <section key={member.id} className="heading-review-pair">
        {item.left ? <dl className="consistency-values">
          <dt>{where(item.left)}</dt><dd>“{item.left.text}”</dd>
          <dt>{where(item.right)}</dt><dd>“{item.right.text}”</dd>
        </dl> : <h3>{consistencyMemberText(item)}</h3>}
        {target && <Button onClick={() => onInspect(target)}>Show on page {target.page}</Button>}
      </section>;
    })}
  </section>;
  const item = finding.comparison?.consistency;
  if (item?.left) return <dl className="consistency-values">
    <dt>{where(item.left)}</dt><dd>“{item.left.text}”</dd>
    <dt>{where(item.right)}</dt><dd>“{item.right.text}”</dd>
  </dl>;
  // Two sentences that disagree: show both, each with its own page link.
  if (item?.kind === "same-fact") return <section aria-label="The two sentences" className="heading-review-list">
    {[item.a, item.b].map((sentence, index) => <section key={index} className="heading-review-pair">
      <p className="heading-review-excerpt"><span>Page {sentence.page}:</span> “{sentence.text}”</p>
      {finding.targets?.[index] && <Button onClick={() => onInspect(finding.targets[index])}>Show on page {sentence.page}</Button>}
    </section>)}
  </section>;
  return null;
}
