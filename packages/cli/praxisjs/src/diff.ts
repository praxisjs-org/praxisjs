interface Op { kind: " " | "-" | "+"; line: string }

/** Line operations turning `before` into `after`, from a longest-common-subsequence table. */
function operations(before: string[], after: string[]): Op[] {
  const n = before.length;
  const m = after.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = before[i] === after[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      ops.push({ kind: " ", line: before[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ kind: "-", line: before[i++] });
    } else {
      ops.push({ kind: "+", line: after[j++] });
    }
  }
  while (i < n) ops.push({ kind: "-", line: before[i++] });
  while (j < m) ops.push({ kind: "+", line: after[j++] });
  return ops;
}

/**
 * A unified-style diff of two texts: changed lines with `context` unchanged lines around them,
 * `…` between distant hunks. Empty when the texts are equal.
 */
export function lineDiff(before: string, after: string, context = 3): string {
  const ops = operations(before.replace(/\r\n/g, "\n").split("\n"), after.replace(/\r\n/g, "\n").split("\n"));
  const keep = new Array<boolean>(ops.length).fill(false);
  ops.forEach((op, k) => {
    if (op.kind === " ") return;
    for (let c = Math.max(0, k - context); c <= Math.min(ops.length - 1, k + context); c++) keep[c] = true;
  });
  const lines: string[] = [];
  let skipped = false;
  ops.forEach((op, k) => {
    if (!keep[k]) {
      skipped = true;
      return;
    }
    if (skipped && lines.length > 0) lines.push("…");
    skipped = false;
    lines.push(`${op.kind} ${op.line}`);
  });
  return lines.join("\n");
}
