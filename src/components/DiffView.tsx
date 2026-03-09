import { DiffLine } from "../store/gitStore";
import { useEditorStore } from "../store/editorStore";
import { HunkInfo } from "../utils/diffHunks";

function DiffLineRow({ line }: { line: DiffLine }) {
  const cls =
    line.tag === "insert" ? "insert" : line.tag === "delete" ? "delete" : "";
  const prefix =
    line.tag === "insert" ? "+" : line.tag === "delete" ? "−" : " ";

  return (
    <div className={`diff-line ${cls}`}>
      <span className="diff-line-no">{line.old_lineno ?? ""}</span>
      <span className="diff-line-no">{line.new_lineno ?? ""}</span>
      <span
        style={{
          width: 14,
          flexShrink: 0,
          paddingLeft: 4,
          opacity: 0.6,
          fontWeight: 700,
          fontFamily: "inherit",
          fontSize: "inherit",
        }}
      >
        {prefix}
      </span>
      <span className="diff-line-content">{line.content}</span>
    </div>
  );
}

interface DiffViewProps {
  hunks: HunkInfo[];
  activeHunkIndex: number;
  onHunkSelect: (i: number) => void;
  onRevert: (hunk: HunkInfo) => void;
  addedCount: number;
  removedCount: number;
  label: string;
}

export function DiffView({
  hunks,
  activeHunkIndex,
  onHunkSelect,
  onRevert,
  addedCount,
  removedCount,
  label,
}: DiffViewProps) {
  const { diffBaseline, setDiffBaseline } = useEditorStore();

  if (hunks.length === 0) {
    return (
      <div
        className="diff-view-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 8,
          color: "var(--text-muted)",
        }}
      >
        <span style={{ fontSize: 28 }}>✓</span>
        <span>No changes from {label}</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Toolbar */}
      <div
        style={{
          padding: "5px 10px",
          fontSize: 12,
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          display: "flex",
          gap: 6,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {(["head", "session", "disk"] as const).map((b) => (
          <button
            key={b}
            onClick={() => setDiffBaseline(b)}
            style={{
              padding: "2px 8px",
              fontSize: 11,
              borderRadius: 3,
              border: "1px solid var(--border)",
              background: diffBaseline === b ? "var(--accent)" : "var(--bg-hover)",
              color: diffBaseline === b ? "#fff" : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            {b === "head" ? "HEAD" : b === "session" ? "Session" : "Disk"}
          </button>
        ))}

        <span style={{ color: "var(--border)", margin: "0 2px" }}>|</span>
        <span style={{ color: "var(--diff-add-text)" }}>+{addedCount}</span>
        <span style={{ color: "var(--diff-del-text)" }}>−{removedCount}</span>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
            {activeHunkIndex + 1} / {hunks.length}
          </span>
          <button
            className="toolbar-btn"
            style={{ padding: "1px 7px", fontSize: 14, lineHeight: 1 }}
            onClick={() => onHunkSelect(Math.max(0, activeHunkIndex - 1))}
            disabled={activeHunkIndex === 0}
            title="Previous change"
          >
            ↑
          </button>
          <button
            className="toolbar-btn"
            style={{ padding: "1px 7px", fontSize: 14, lineHeight: 1 }}
            onClick={() => onHunkSelect(Math.min(hunks.length - 1, activeHunkIndex + 1))}
            disabled={activeHunkIndex === hunks.length - 1}
            title="Next change"
          >
            ↓
          </button>
        </div>
      </div>

      {/* Hunks */}
      <div className="diff-view-container">
        {hunks.map((hunk, i) => {
          const isActive = i === activeHunkIndex;
          const insertCount = hunk.changes.filter((l) => l.tag === "insert").length;
          const deleteCount = hunk.changes.filter((l) => l.tag === "delete").length;

          return (
            <div
              key={hunk.id}
              onClick={() => onHunkSelect(i)}
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                cursor: "pointer",
                outline: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                outlineOffset: "-2px",
                background: isActive ? "var(--accent-muted)" : "transparent",
                borderRadius: 2,
                marginBottom: 1,
              }}
            >
              {/* Hunk header row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "3px 8px",
                  gap: 6,
                  background: isActive ? "transparent" : "var(--bg-elevated)",
                  borderBottom: "1px solid var(--border-subtle)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  userSelect: "none",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                  Change {i + 1}
                </span>
                {insertCount > 0 && (
                  <span style={{ color: "var(--diff-add-text)" }}>+{insertCount}</span>
                )}
                {deleteCount > 0 && (
                  <span style={{ color: "var(--diff-del-text)" }}>−{deleteCount}</span>
                )}

                <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                  <button
                    className="toolbar-btn"
                    style={{
                      fontSize: 11,
                      padding: "1px 8px",
                      border: "1px solid var(--diff-del-text)",
                      color: "var(--diff-del-text)",
                      opacity: 0.85,
                      borderRadius: 3,
                    }}
                    title="Revert this change to baseline"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Revert this change?")) onRevert(hunk);
                    }}
                  >
                    ↩ Revert
                  </button>
                </div>
              </div>

              {/* Diff lines */}
              <div onClick={() => onHunkSelect(i)}>
                {hunk.lines.map((line, j) => (
                  <DiffLineRow key={j} line={line} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
