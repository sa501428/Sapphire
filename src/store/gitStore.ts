import { create } from "zustand";

export interface RepoInfo {
  repo_root: string;
  branch: string;
  short_hash: string;
  commit_message: string;
  is_tracked: boolean;
  is_modified: boolean;
}

export interface DiffResult {
  unified: string;
  lines: DiffLine[];
  has_changes: boolean;
  added_count: number;
  removed_count: number;
}

export interface DiffLine {
  tag: "equal" | "insert" | "delete";
  old_lineno: number | null;
  new_lineno: number | null;
  content: string;
}

interface GitState {
  repoInfo: RepoInfo | null;
  diffResult: DiffResult | null;
  headContent: string | null;

  setRepoInfo: (info: RepoInfo | null) => void;
  setDiffResult: (diff: DiffResult | null) => void;
  setHeadContent: (c: string | null) => void;
}

export const useGitStore = create<GitState>((set) => ({
  repoInfo: null,
  diffResult: null,
  headContent: null,

  setRepoInfo: (info) => set({ repoInfo: info }),
  setDiffResult: (diff) => set({ diffResult: diff }),
  setHeadContent: (c) => set({ headContent: c }),
}));
