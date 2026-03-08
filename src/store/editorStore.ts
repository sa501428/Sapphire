import { create } from "zustand";

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  savedContent: string;   // content as last saved to disk
  sessionContent: string; // content at session open
  modified: boolean;
}

interface EditorState {
  files: OpenFile[];
  activeIndex: number;
  sidebarWidth: number;
  previewVisible: boolean;
  diffVisible: boolean;
  diffBaseline: "head" | "session" | "disk";

  openFile: (file: Omit<OpenFile, "modified">) => void;
  closeFile: (index: number) => void;
  setActiveIndex: (i: number) => void;
  updateContent: (path: string, content: string) => void;
  markSaved: (path: string, content: string) => void;
  setSidebarWidth: (w: number) => void;
  setPreviewVisible: (v: boolean) => void;
  setDiffVisible: (v: boolean) => void;
  setDiffBaseline: (b: "head" | "session" | "disk") => void;
  getActive: () => OpenFile | null;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  files: [],
  activeIndex: -1,
  sidebarWidth: 220,
  previewVisible: false,
  diffVisible: false,
  diffBaseline: "head",

  openFile: (file) => {
    const { files } = get();
    const existing = files.findIndex((f) => f.path === file.path);
    if (existing !== -1) {
      set({ activeIndex: existing });
      return;
    }
    const newFile: OpenFile = { ...file, modified: false };
    set({ files: [...files, newFile], activeIndex: files.length });
  },

  closeFile: (index) => {
    const { files, activeIndex } = get();
    const next = files.filter((_, i) => i !== index);
    let nextActive = activeIndex;
    if (index === activeIndex) {
      nextActive = Math.max(0, index - 1);
    } else if (index < activeIndex) {
      nextActive = activeIndex - 1;
    }
    set({ files: next, activeIndex: next.length === 0 ? -1 : Math.min(nextActive, next.length - 1) });
  },

  setActiveIndex: (i) => set({ activeIndex: i }),

  updateContent: (path, content) => {
    set((s) => ({
      files: s.files.map((f) =>
        f.path === path
          ? { ...f, content, modified: content !== f.savedContent }
          : f
      ),
    }));
  },

  markSaved: (path, content) => {
    set((s) => ({
      files: s.files.map((f) =>
        f.path === path ? { ...f, content, savedContent: content, modified: false } : f
      ),
    }));
  },

  setSidebarWidth: (w) => set({ sidebarWidth: w }),
  setPreviewVisible: (v) => set({ previewVisible: v }),
  setDiffVisible: (v) => set({ diffVisible: v }),
  setDiffBaseline: (b) => set({ diffBaseline: b }),

  getActive: () => {
    const { files, activeIndex } = get();
    return activeIndex >= 0 && activeIndex < files.length ? files[activeIndex] : null;
  },
}));
