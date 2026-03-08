import { useEditorStore } from "../store/editorStore";

export function TabBar() {
  const { files, activeIndex, setActiveIndex, closeFile } = useEditorStore();

  if (files.length === 0) return null;

  return (
    <div className="tab-bar">
      {files.map((file, i) => (
        <div
          key={file.path}
          className={`tab ${i === activeIndex ? "active" : ""}`}
          onClick={() => setActiveIndex(i)}
        >
          {file.modified && <span className="tab-modified" />}
          <span className="tab-name" title={file.path}>{file.name}</span>
          <span
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              if (file.modified) {
                if (!window.confirm(`Discard unsaved changes in "${file.name}"?`)) return;
              }
              closeFile(i);
            }}
          >
            ×
          </span>
        </div>
      ))}
    </div>
  );
}
