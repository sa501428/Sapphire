import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useEditorStore } from "../store/editorStore";
import { useGitStatus } from "../hooks/useGitStatus";

interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: DirEntry[];
}

interface OutlineItem {
  level: number;
  text: string;
  line: number;
}

function FileTreeItem({ entry, depth = 0 }: { entry: DirEntry; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const { openFile, getActive } = useEditorStore();
  const { refreshGitStatus } = useGitStatus();
  const active = getActive();

  const handleClick = async () => {
    if (entry.is_dir) {
      setExpanded((e) => !e);
      return;
    }
    try {
      const result = await invoke<{ path: string; content: string }>("open_file", { path: entry.path });
      await invoke("record_session_snapshot", { path: entry.path, content: result.content });
      openFile({
        path: result.path,
        name: entry.name,
        content: result.content,
        savedContent: result.content,
        sessionContent: result.content,
      });
      await refreshGitStatus(result.path);
    } catch (e) {
      console.error("Failed to open file:", e);
    }
  };

  return (
    <div>
      <div
        className={`file-tree-item ${entry.is_dir ? "dir" : ""} ${active?.path === entry.path ? "active" : ""}`}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
        onClick={handleClick}
      >
        <span>{entry.is_dir ? (expanded ? "▼" : "▶") : "📄"}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{entry.name}</span>
      </div>
      {entry.is_dir && expanded && entry.children?.map((child) => (
        <FileTreeItem key={child.path} entry={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function OutlinePanel({ content }: { content: string }) {
  const items: OutlineItem[] = [];
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    const m = line.match(/^(#{1,6})\s+(.+)/);
    if (m) {
      items.push({ level: m[1].length, text: m[2], line: i + 1 });
    }
  });

  if (items.length === 0) {
    return (
      <div style={{ padding: "20px", color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
        No headings found
      </div>
    );
  }

  return (
    <ul className="outline-list">
      {items.map((item, i) => (
        <li key={i} className="outline-item" data-level={item.level}>
          {item.text}
        </li>
      ))}
    </ul>
  );
}

interface SidebarProps {
  width: number;
}

export function Sidebar({ width }: SidebarProps) {
  const [tab, setTab] = useState<"files" | "outline">("files");
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [rootPath, setRootPath] = useState<string | null>(null);
  const { getActive, openFile } = useEditorStore();
  const { refreshGitStatus } = useGitStatus();
  const active = getActive();

  const openFolder = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (!selected) return;
      const path = typeof selected === "string" ? selected : selected[0];
      const result = await invoke<DirEntry[]>("read_dir_recursive", { path });
      setEntries(result);
      setRootPath(path);
    } catch (e) {
      console.error("Failed to open folder:", e);
    }
  }, []);

  const openSingleFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdown", "txt"] }],
      });
      if (!selected) return;
      const path = typeof selected === "string" ? selected : selected[0];
      const result = await invoke<{ path: string; content: string }>("open_file", { path });
      await invoke("record_session_snapshot", { path: result.path, content: result.content });
      const name = path.split("/").pop() ?? path;
      openFile({ path: result.path, name, content: result.content, savedContent: result.content, sessionContent: result.content });
      await refreshGitStatus(result.path);
    } catch (e) {
      console.error("Failed to open file:", e);
    }
  }, [openFile, refreshGitStatus]);

  return (
    <div className="sidebar" style={{ width }}>
      <div className="sidebar-tabs">
        <button className={`sidebar-tab ${tab === "files" ? "active" : ""}`} onClick={() => setTab("files")}>Files</button>
        <button className={`sidebar-tab ${tab === "outline" ? "active" : ""}`} onClick={() => setTab("outline")}>Outline</button>
      </div>

      <div className="sidebar-content">
        {tab === "files" && (
          <div>
            <div style={{ display: "flex", gap: 4, padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>
              <button className="toolbar-btn" onClick={openSingleFile} title="Open File" style={{ flex: 1, justifyContent: "center" }}>📂 Open</button>
              <button className="toolbar-btn" onClick={openFolder} title="Open Folder" style={{ flex: 1, justifyContent: "center" }}>📁 Folder</button>
            </div>
            <div className="file-tree">
              {entries.length === 0 ? (
                <div style={{ padding: "16px 12px", color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>
                  Open a folder or file to get started
                </div>
              ) : (
                entries.map((e) => <FileTreeItem key={e.path} entry={e} />)
              )}
            </div>
          </div>
        )}

        {tab === "outline" && (
          <OutlinePanel content={active?.content ?? ""} />
        )}
      </div>
    </div>
  );
}
