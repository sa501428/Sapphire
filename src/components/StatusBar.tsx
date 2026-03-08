import { useGitStore } from "../store/gitStore";
import { useEditorStore } from "../store/editorStore";

interface StatusBarProps {
  line: number;
  col: number;
}

export function StatusBar({ line, col }: StatusBarProps) {
  const { repoInfo } = useGitStore();
  const active = useEditorStore((s) => s.getActive());

  if (!active) return <div className="status-bar" />;

  const name = active.path.split("/").pop() ?? active.path;

  return (
    <div className="status-bar">
      <span className="status-item">
        {active.modified ? "● " : ""}
        {name}
      </span>

      <span className="status-sep">|</span>

      <span className="status-item">Ln {line}, Col {col}</span>

      <div className="status-right">
        {repoInfo ? (
          <>
            <span className="status-item">⎇ {repoInfo.branch}</span>
            <span className="status-sep">|</span>
            <span className="status-item" title={repoInfo.commit_message}>
              {repoInfo.short_hash}
            </span>
            <span className="status-sep">|</span>
            <span className="status-item">
              {repoInfo.is_tracked
                ? repoInfo.is_modified
                  ? "Modified"
                  : "Clean"
                : "Untracked"}
            </span>
          </>
        ) : (
          <span className="status-item">No repo</span>
        )}
        <span className="status-sep">|</span>
        <span className="status-item">UTF-8</span>
      </div>
    </div>
  );
}
