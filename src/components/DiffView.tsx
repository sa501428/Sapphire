import { useMemo } from "react";
import { DiffLine } from "../store/gitStore";
import { useEditorStore } from "../store/editorStore";

interface DiffViewProps {
  lines: DiffLine[];
  label: string;
  addedCount: number;
  removedCount: number;
}

export function DiffView({ lines, label, addedCount, removedCount }: DiffViewProps) {
  const { diffBaseline, setDiffBaseline } = useEditorStore();

  if (lines.length === 0) {
    return (
      <div className="diff-view-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 32 }}>✓</span>
        <span>No changes from {label}</span>
      </div>
    );
  }

  return (
    <div className="diff-view-container">
      <div style={{ padding: "6px 12px", fontSize: 12, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)", display: "flex", gap: 12, alignItems: "center" }}>
        <span>vs <strong style={{ color: "var(--text-primary)" }}>{label}</strong></span>
        <span style={{ color: "var(--diff-add-text)" }}>+{addedCount}</span>
        <span style={{ color: "var(--diff-del-text)" }}>-{removedCount}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
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
        </div>
      </div>

      <div>
        {lines.map((line, i) => (
          <div key={i} className={`diff-line ${line.tag === "insert" ? "insert" : line.tag === "delete" ? "delete" : ""}`}>
            <span className="diff-line-no">{line.old_lineno ?? " "}</span>
            <span className="diff-line-no">{line.new_lineno ?? " "}</span>
            <span className="diff-line-content">
              {line.tag === "insert" ? "+" : line.tag === "delete" ? "-" : " "}
              {line.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
