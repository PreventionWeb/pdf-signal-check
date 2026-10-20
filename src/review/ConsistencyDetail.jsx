import React from "react";
import { Button } from "../ui/react.jsx";
import { Crop } from "../evidence/Crop.jsx";

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
        </dl> : <h3>Page {item.page}: {item.captions[0]?.text || item.source?.text}</h3>}
        {target && <Button onClick={() => onInspect(target)}>Show on page {target.page}</Button>}
      </section>;
    })}
  </section>;
  const item = finding.comparison?.consistency;
  if (item?.left) return <dl className="consistency-values">
    <dt>{where(item.left)}</dt><dd>“{item.left.text}”</dd>
    <dt>{where(item.right)}</dt><dd>“{item.right.text}”</dd>
  </dl>;
  return finding.targets?.length ? <Crop file={file} report={report} targets={finding.targets} /> : null;
}
