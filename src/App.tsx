import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { useEditorStore } from "./store/editorStore";
import { useGitStore, DiffResult } from "./store/gitStore";
import { useSettingsStore } from "./store/settingsStore";
import { Editor } from "./components/Editor";
import { Preview } from "./components/Preview";
import { DiffView } from "./components/DiffView";
import { Sidebar } from "./components/Sidebar";
import { TabBar } from "./components/TabBar";
import { StatusBar } from "./components/StatusBar";
import { SettingsModal } from "./components/SettingsModal";
import { useGitStatus } from "./hooks/useGitStatus";
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

export default function App() {
  const {
    files,
    activeIndex,
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

  const { repoInfo, headContent, diffResult, setDiffResult } = useGitStore();
  const { theme, toggleTheme } = useSettingsStore();
  const { refreshGitStatus } = useGitStatus();

  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [diffData, setDiffData] = useState<DiffResult | null>(null);

  const active = getActive();

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Refresh git status when active file changes
  useEffect(() => {
    if (active?.path) {
      refreshGitStatus(active.path);
    }
  }, [active?.path]);

  // Recompute diff when content, baseline, or head content changes
  useEffect(() => {
    if (!active || !diffVisible) {
      setDiffData(null);
      return;
    }

    let baseline: string | null = null;
    let baselineLabel = "HEAD";

    if (diffBaseline === "head") {
      baseline = headContent;
      baselineLabel = "HEAD";
    } else if (diffBaseline === "session") {
      baseline = active.sessionContent;
      baselineLabel = "Session start";
    } else if (diffBaseline === "disk") {
      baseline = active.savedContent;
      baselineLabel = "Disk";
    }

    if (baseline === null) {
      setDiffData(null);
      return;
    }

    invoke<DiffResult>("compute_diff", { old: baseline, newContent: active.content })
      .then(setDiffData)
      .catch(() => setDiffData(null));
  }, [active?.content, diffBaseline, headContent, diffVisible]);

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
      if (mod && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
      if (mod && e.shiftKey && e.key === "S") {
        e.preventDefault();
        handleSaveAs();
      }
      if (mod && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        setDiffVisible(!diffVisible);
      }
      if (mod && e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        setPreviewVisible(!previewVisible);
      }
      if (mod && e.shiftKey && (e.key === "T" || e.key === "t")) {
        e.preventDefault();
        toggleTheme();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave, handleSaveAs, diffVisible, previewVisible, toggleTheme]);

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
        {/* Sidebar */}
        <Sidebar width={sidebarWidth} />

        {/* Main editor area */}
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
                {diffData ? (
                  <DiffView
                    lines={diffData.lines}
                    label={
                      diffBaseline === "head"
                        ? `HEAD (${repoInfo?.short_hash ?? "?"})`
                        : diffBaseline === "session"
                        ? "Session start"
                        : "Disk"
                    }
                    addedCount={diffData.added_count}
                    removedCount={diffData.removed_count}
                  />
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
