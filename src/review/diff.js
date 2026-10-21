/**
 * Word-level comparison of two short values (titles, names), for showing what differs.
 * Case is ignored, matching the consistency rules. Returns each side as tokens marked same or changed.
 */
const tokens = text => [...String(text || '').matchAll(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]+/gu)]
  .map(match => ({ text: match[0], space: match.index > 0 && /\s/.test(match.input[match.index - 1]) }));
const key = token => token.normalize('NFKC').toLocaleLowerCase();

export function wordDiff(left, right) {
  const a = tokens(left), b = tokens(right);
  // Longest common subsequence over tokens; values here are short, so the table stays small.
  const table = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    table[i][j] = key(a[i].text) === key(b[j].text) ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const sameA = new Set(), sameB = new Set();
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (key(a[i].text) === key(b[j].text)) { sameA.add(i++); sameB.add(j++); }
    else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  const mark = (list, same) => list.map((token, index) => ({ ...token, changed: !same.has(index) }));
  // Marking is only useful when the values share words; two unrelated values would be marked end to end.
  const words = list => list.filter(token => /[\p{L}\p{N}]/u.test(token.text)).length;
  const shared = [...sameA].filter(index => /[\p{L}\p{N}]/u.test(a[index].text)).length;
  return { left: mark(a, sameA), right: mark(b, sameB), changed: sameA.size !== a.length || sameB.size !== b.length,
    comparable: shared > 0 && shared >= Math.min(words(a), words(b)) / 3 };
}

/** Words that differ on one side, for a screen-reader summary. */
export const changedWords = side => side.filter(token => token.changed).map(token => token.text).join(' ');
