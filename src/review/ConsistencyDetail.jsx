import React from "react";
import { consistencyMemberText } from "./workspace.js";
import { ShowOnPage } from "./places.jsx";
import { wordDiff, changedWords } from "./diff.js";
import { DiffText } from "./DiffText.jsx";

const ROLES = { saved: "Saved title (document properties)", cover: "Cover", running: "Page headers and footers" };
/** The two values with the words that differ marked, so a changed year or word stands out. */
export function DiffValues({ left, right, leftLabel, rightLabel }) {
  const diff = wordDiff(left, right);
  const words = side => diff.comparable ? <DiffText tokens={side} /> : side.map(token => `${token.space ? " " : ""}${token.text}`).join("");
  const summary = diff.changed && diff.comparable && [changedWords(diff.left), changedWords(diff.right)].filter(Boolean).join(" versus ");
  // A <dl> may only hold dt/dd, so the spoken summary of the differences sits after it.
  return <>
    <dl className="consistency-values">
      <dt>{leftLabel}</dt><dd>“{words(diff.left)}”</dd>
      <dt>{rightLabel}</dt><dd>“{words(diff.right)}”</dd>
    </dl>
    {summary && <p className="mg-u-sr-only">Words that differ: {summary}.</p>}
  </>;
}
const where = name => name.role === "running" ? `${ROLES.running}, ${name.pages.length} pages` : ROLES[name.role];

/** The values that disagree, side by side; grouped tasks list each member with its own page link. */
export function ConsistencyDetail({ finding, file, report, onInspect }) {
  if (finding.members) return <section aria-label="Places to check" className="heading-review-list">
    {finding.members.map(member => {
      const item = member.comparison.consistency;
      const target = member.targets?.[0];
      return <section key={member.id} className="heading-review-pair">
        {item.left ? <DiffValues left={item.left.text} right={item.right.text} leftLabel={where(item.left)} rightLabel={where(item.right)} />
          : <h3>{consistencyMemberText(item)}</h3>}
        <ShowOnPage target={target} onInspect={onInspect} />
      </section>;
    })}
  </section>;
  const item = finding.comparison?.consistency;
  if (item?.left) return <DiffValues left={item.left.text} right={item.right.text} leftLabel={where(item.left)} rightLabel={where(item.right)} />;
  // Two sentences that disagree: show both, each with its own page link.
  if (item?.kind === "same-fact") return <section aria-label="The two sentences" className="heading-review-list">
    {[item.a, item.b].map((sentence, index) => <section key={index} className="heading-review-pair">
      <p className="heading-review-excerpt"><span>Page {sentence.page}:</span> “{sentence.text}”</p>
      <ShowOnPage target={finding.targets?.[index]} onInspect={onInspect} />
    </section>)}
  </section>;
  return null;
}
