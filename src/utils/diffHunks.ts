import { DiffLine } from "../store/gitStore";

export interface HunkInfo {
  id: number;
  lines: DiffLine[];         // all lines in this hunk (context + changes)
  changes: DiffLine[];       // only insert/delete lines
  // Scroll anchor: first new_lineno present in this hunk
  newLineAnchor: number;
  // Range of new lines to remove on revert (null if pure deletion)
  insertNewStart: number | null;
  insertNewEnd: number | null;
  // Old content to restore on revert
  deleteOldLines: string[];
  // For pure deletions: insert restored lines after this new_lineno in buffer
  insertAfterNewLine: number;
}

const CONTEXT = 3;

export function groupIntoHunks(lines: DiffLine[]): HunkInfo[] {
  // Find indices of all changed lines
  const changedIndices = lines
    .map((l, i) => i)
    .filter((i) => lines[i].tag !== "equal");

  if (changedIndices.length === 0) return [];

  // Cluster changed indices together if within 2*CONTEXT of each other
  const clusters: number[][] = [];
  let current = [changedIndices[0]];
  for (let i = 1; i < changedIndices.length; i++) {
    if (changedIndices[i] - changedIndices[i - 1] <= 2 * CONTEXT) {
      current.push(changedIndices[i]);
    } else {
      clusters.push(current);
      current = [changedIndices[i]];
    }
  }
  clusters.push(current);

  return clusters.map((cluster, hunkId) => {
    const firstIdx = Math.max(0, cluster[0] - CONTEXT);
    const lastIdx = Math.min(lines.length - 1, cluster[cluster.length - 1] + CONTEXT);
    const hunkLines = lines.slice(firstIdx, lastIdx + 1);

    const changes = hunkLines.filter((l) => l.tag !== "equal");
    const insertLines = hunkLines.filter((l) => l.tag === "insert");
    const deleteLines = hunkLines.filter((l) => l.tag === "delete");

    const newLinenos = insertLines
      .map((l) => l.new_lineno)
      .filter((n): n is number => n !== null);

    const insertNewStart = newLinenos.length > 0 ? Math.min(...newLinenos) : null;
    const insertNewEnd = newLinenos.length > 0 ? Math.max(...newLinenos) : null;

    // Find the new_lineno of the last equal line before the first change —
    // used as insertion anchor when reverting pure deletions
    let insertAfterNewLine = 0;
    for (let i = cluster[0] - 1; i >= 0; i--) {
      if (lines[i].new_lineno !== null) {
        insertAfterNewLine = lines[i].new_lineno!;
        break;
      }
    }

    // First new_lineno present in hunk (for scrolling editor to this hunk)
    const newLineAnchor =
      hunkLines.find((l) => l.new_lineno !== null)?.new_lineno ?? 1;

    return {
      id: hunkId,
      lines: hunkLines,
      changes,
      newLineAnchor,
      insertNewStart,
      insertNewEnd,
      deleteOldLines: deleteLines.map((l) => l.content.replace(/\n$/, "")),
      insertAfterNewLine,
    };
  });
}

/** Apply the inverse of one hunk to the buffer, returning updated content. */
export function revertHunk(content: string, hunk: HunkInfo): string {
  const lines = content.split("\n");

  if (hunk.insertNewStart !== null && hunk.insertNewEnd !== null) {
    // There are inserted lines in this hunk — remove them and put old lines back
    const start = hunk.insertNewStart - 1; // 0-indexed
    const count = hunk.insertNewEnd - hunk.insertNewStart + 1;
    lines.splice(start, count, ...hunk.deleteOldLines);
  } else if (hunk.deleteOldLines.length > 0) {
    // Pure deletion — reinsert the old lines at the anchor
    lines.splice(hunk.insertAfterNewLine, 0, ...hunk.deleteOldLines);
  }

  return lines.join("\n");
}
