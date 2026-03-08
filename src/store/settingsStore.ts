import { create } from "zustand";

export type Theme = "dark" | "light";
export type DiffStyle = "unified" | "side-by-side";

interface Settings {
  theme: Theme;
  fontSize: number;
  fontFamily: string;
  tabWidth: number;
  softWrap: boolean;
  showLineNumbers: boolean;
  autoSave: boolean;
  diffStyle: DiffStyle;
}

interface SettingsState extends Settings {
  set: (partial: Partial<Settings>) => void;
  toggleTheme: () => void;
}

const DEFAULTS: Settings = {
  theme: "dark",
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  tabWidth: 2,
  softWrap: true,
  showLineNumbers: true,
  autoSave: false,
  diffStyle: "unified",
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  set: (partial) => set(partial),
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
}));
