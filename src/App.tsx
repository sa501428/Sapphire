import { useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { EditorView } from "@codemirror/view";
import { useEditorStore } from "./store/editorStore";
import { useGitStore, DiffResult } from "./store/gitStore";
import { useSettingsStore } from "./store/settingsStore";
import { Editor, setHunkHighlight } from "./components/Editor";
import { Preview } from "./components/Preview";
import { DiffView } from "./components/DiffView";
import { Sidebar } from "./components/Sidebar";
import { TabBar } from "./components/TabBar";
import { StatusBar } from "./components/StatusBar";
import { SettingsModal } from "./components/SettingsModal";
import { useGitStatus } from "./hooks/useGitStatus";
import { groupIntoHunks, revertHunk, HunkInfo } from "./utils/diffHunks";
import "./styles/global.css";

function EmptyState() {
  return (
    <div className="empty-state">
      <img src="/sapphire.png" className="logo" alt="Sapphire" />
      <h2>Sapphire</h2>
      <p>Fast, local-only markdown editor with Git-aware diffing</p>
      <span className="hint">Open a file or folder from the sidebar to begin</span>
    </div>
  );
}

/** Scroll the CM view to a line range and apply hunk highlight. */
function jumpToHunk(view: EditorView, startLine: number, endLine: number) {
  const doc = view.state.doc;
  const totalLines = doc.lines;
  const from = doc.line(Math.max(1, Math.min(startLine, totalLines))).from;
  const to = doc.line(Math.max(1, Math.min(endLine, totalLines))).to;
  view.dispatch({
    effects: [
      setHunkHighlight.of({ from, to }),
      EditorView.scrollIntoView(from, { y: "center" }),
    ],
  });
}

export default function App() {
  const {
    getActive,
    updateContent,
    markSaved,
    previewVisible,
    diffVisible,
    diffBaseline,
    setPreviewVisible,
    setDiffVisible,
    sidebarWidth,
  } = useEditorStore();

  const { repoInfo, headContent } = useGitStore();
  const { theme, toggleTheme } = useSettingsStore();
  const { refreshGitStatus } = useGitStatus();

  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [diffData, setDiffData] = useState<DiffResult | null>(null);
  const [hunks, setHunks] = useState<HunkInfo[]>([]);
  const [activeHunkIndex, setActiveHunkIndex] = useState(0);

  // Hold a ref to the live CM EditorView so we can dispatch scroll/highlight
  const editorViewRef = useRef<EditorView | null>(null);

  const active = getActive();

  // Apply theme attribute to document root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Refresh git status when active file changes
  useEffect(() => {
    if (active?.path) refreshGitStatus(active.path);
  }, [active?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recompute diff when content / baseline / head content changes
  useEffect(() => {
    if (!active || !diffVisible) {
      setDiffData(null);
      setHunks([]);
      return;
    }

    let baseline: string | null = null;
    if (diffBaseline === "head") baseline = headContent;
    else if (diffBaseline === "session") baseline = active.sessionContent;
    else if (diffBaseline === "disk") baseline = active.savedContent;

    if (baseline === null) {
      setDiffData(null);
      setHunks([]);
      return;
    }

    invoke<DiffResult>("compute_diff", { old: baseline, newContent: active.content })
      .then((result) => {
        setDiffData(result);
        const newHunks = groupIntoHunks(result.lines);
        setHunks(newHunks);
        setActiveHunkIndex(0);
      })
      .catch(() => {
        setDiffData(null);
        setHunks([]);
      });
  }, [active?.content, diffBaseline, headContent, diffVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  // When active hunk changes, scroll editor to it and apply highlight
  const handleHunkSelect = useCallback(
    (i: number) => {
      setActiveHunkIndex(i);
      const hunk = hunks[i];
      if (!hunk || !editorViewRef.current) return;

      const anchor = hunk.newLineAnchor;
      // Compute end line: highest new_lineno in this hunk
      const newLinenos = hunk.lines
        .map((l) => l.new_lineno)
        .filter((n): n is number => n !== null);
      const endLine = newLinenos.length > 0 ? Math.max(...newLinenos) : anchor;

      jumpToHunk(editorViewRef.current, anchor, endLine);
    },
    [hunks]
  );

  // Revert a hunk: apply inverse change to editor buffer
  const handleRevert = useCallback(
    (hunk: HunkInfo) => {
      if (!active) return;
      const newContent = revertHunk(active.content, hunk);
      updateContent(active.path, newContent);
      // Push new content into CM view
      const view = editorViewRef.current;
      if (view && view.state.doc.toString() !== newContent) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: newContent },
          effects: setHunkHighlight.of(null),
        });
      }
    },
    [active, updateContent]
  );

  const handleSave = useCallback(async () => {
    if (!active) return;
    try {
      await invoke("save_file", { path: active.path, content: active.content });
      markSaved(active.path, active.content);
      await refreshGitStatus(active.path);
    } catch (e) {
      console.error("Save failed:", e);
    }
  }, [active, markSaved, refreshGitStatus]);

  const handleSaveAs = useCallback(async () => {
    if (!active) return;
    try {
      const path = await save({
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
      });
      if (!path) return;
      await invoke("save_file", { path, content: active.content });
      markSaved(path, active.content);
    } catch (e) {
      console.error("Save As failed:", e);
    }
  }, [active, markSaved]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.shiftKey && e.key === "s") { e.preventDefault(); handleSave(); }
      if (mod && e.shiftKey && e.key === "S") { e.preventDefault(); handleSaveAs(); }
      if (mod && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault(); setDiffVisible(!diffVisible);
      }
      if (mod && e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault(); setPreviewVisible(!previewVisible);
      }
      if (mod && e.shiftKey && (e.key === "T" || e.key === "t")) {
        e.preventDefault(); toggleTheme();
      }
      // Navigate hunks with Alt+↑/↓ when diff is open
      if (diffVisible && e.altKey && e.key === "ArrowDown") {
        e.preventDefault();
        handleHunkSelect(Math.min(hunks.length - 1, activeHunkIndex + 1));
      }
      if (diffVisible && e.altKey && e.key === "ArrowUp") {
        e.preventDefault();
        handleHunkSelect(Math.max(0, activeHunkIndex - 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave, handleSaveAs, diffVisible, previewVisible, toggleTheme, handleHunkSelect, hunks.length, activeHunkIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const diffLabel =
    diffBaseline === "head"
      ? `HEAD (${repoInfo?.short_hash ?? "?"})`
      : diffBaseline === "session"
      ? "Session start"
      : "Disk";

  return (
    <div className="app">
      {/* Toolbar */}
      <div className="toolbar">
        <button className="toolbar-btn" onClick={handleSave} title="Save (⌘S)">
          💾 Save
        </button>
        <button className="toolbar-btn" onClick={handleSaveAs} title="Save As (⌘⇧S)">
          Save As
        </button>
        <div className="toolbar-sep" />
        <button
          className={`toolbar-btn ${previewVisible ? "active" : ""}`}
          onClick={() => setPreviewVisible(!previewVisible)}
          title="Toggle Preview (⌘⇧P)"
        >
          👁 Preview
        </button>
        <button
          className={`toolbar-btn ${diffVisible ? "active" : ""}`}
          onClick={() => setDiffVisible(!diffVisible)}
          title="Toggle Diff (⌘⇧D)"
        >
          ⊕ Diff
        </button>
        <div className="toolbar-sep" />
        <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
          <button className="toolbar-btn" onClick={toggleTheme} title="Toggle Theme (⌘⇧T)">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className="toolbar-btn" onClick={() => setShowSettings(true)} title="Settings">
            ⚙
          </button>
        </div>
      </div>

      <div className="app-body">
        <Sidebar width={sidebarWidth} />

        <div className="editor-area">
          <TabBar />

          <div className="pane-row">
            {/* Editor pane */}
            <div className="editor-pane">
              {active ? (
                <Editor
                  key={active.path}
                  path={active.path}
                  content={active.content}
                  onChange={(val) => updateContent(active.path, val)}
                  onCursorChange={(l, c) => { setCursorLine(l); setCursorCol(c); }}
                  onEditorReady={(view) => { editorViewRef.current = view; }}
                />
              ) : (
                <EmptyState />
              )}
            </div>

            {/* Preview pane */}
            {previewVisible && active && (
              <div className="preview-pane">
                <div className="pane-header">
                  Preview
                  <div className="pane-header-actions">
                    <button className="toolbar-btn" onClick={() => setPreviewVisible(false)}>×</button>
                  </div>
                </div>
                <Preview content={active.content} />
              </div>
            )}

            {/* Diff pane */}
            {diffVisible && active && (
              <div className="diff-pane">
                <div className="pane-header">
                  Git Diff
                  <div className="pane-header-actions">
                    <button className="toolbar-btn" onClick={() => setDiffVisible(false)}>×</button>
                  </div>
                </div>
                {diffData && hunks.length > 0 ? (
                  <DiffView
                    hunks={hunks}
                    activeHunkIndex={activeHunkIndex}
                    onHunkSelect={handleHunkSelect}
                    onRevert={handleRevert}
                    addedCount={diffData.added_count}
                    removedCount={diffData.removed_count}
                    label={diffLabel}
                  />
                ) : diffData && hunks.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, color: "var(--text-muted)" }}>
                    <span style={{ fontSize: 28 }}>✓</span>
                    <span>No changes from {diffLabel}</span>
                  </div>
                ) : (
                  <div style={{ padding: 16, color: "var(--text-muted)", fontSize: 13 }}>
                    {headContent === null && diffBaseline === "head"
                      ? "File not tracked in Git or no commits yet"
                      : "Loading diff..."}
                  </div>
                )}
              </div>
            )}
          </div>

          <StatusBar line={cursorLine} col={cursorCol} />
        </div>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
