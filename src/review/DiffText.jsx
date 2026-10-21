import React from "react";

/** One side of a word diff, with each run of changed words in a single highlight. */
export function DiffText({ tokens }) {
  const runs = [];
  for (const token of tokens) {
    const last = runs[runs.length - 1];
    if (last && last.changed === token.changed) last.text += `${token.space ? " " : ""}${token.text}`;
    else runs.push({ changed: token.changed, space: token.space, text: token.text });
  }
  return runs.map((run, index) => <React.Fragment key={index}>{run.space ? " " : ""}{run.changed ? <mark className="diff-word">{run.text}</mark> : run.text}</React.Fragment>);
}
