import { useSettingsStore } from "../store/settingsStore";

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const settings = useSettingsStore();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          Settings
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="setting-row">
            <label>Theme</label>
            <select
              value={settings.theme}
              onChange={(e) => settings.set({ theme: e.target.value as "dark" | "light" })}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div className="setting-row">
            <label>Font Family</label>
            <input
              type="text"
              value={settings.fontFamily}
              onChange={(e) => settings.set({ fontFamily: e.target.value })}
            />
          </div>

          <div className="setting-row">
            <label>Font Size (px)</label>
            <input
              type="number"
              min={10}
              max={28}
              value={settings.fontSize}
              onChange={(e) => settings.set({ fontSize: Number(e.target.value) })}
            />
          </div>

          <div className="setting-row">
            <label>Tab Width</label>
            <input
              type="number"
              min={2}
              max={8}
              value={settings.tabWidth}
              onChange={(e) => settings.set({ tabWidth: Number(e.target.value) })}
            />
          </div>

          <div className="setting-row">
            <label>Soft Wrap</label>
            <input
              type="checkbox"
              checked={settings.softWrap}
              onChange={(e) => settings.set({ softWrap: e.target.checked })}
            />
          </div>

          <div className="setting-row">
            <label>Line Numbers</label>
            <input
              type="checkbox"
              checked={settings.showLineNumbers}
              onChange={(e) => settings.set({ showLineNumbers: e.target.checked })}
            />
          </div>

          <div className="setting-row">
            <label>Diff Style</label>
            <select
              value={settings.diffStyle}
              onChange={(e) => settings.set({ diffStyle: e.target.value as "unified" | "side-by-side" })}
            >
              <option value="unified">Unified</option>
              <option value="side-by-side">Side by Side</option>
            </select>
          </div>

          <div className="setting-row">
            <label>Auto Save</label>
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={(e) => settings.set({ autoSave: e.target.checked })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
