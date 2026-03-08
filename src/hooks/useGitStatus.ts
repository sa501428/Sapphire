import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useGitStore, RepoInfo } from "../store/gitStore";
import { useEditorStore } from "../store/editorStore";

export function useGitStatus() {
  const { setRepoInfo, setHeadContent } = useGitStore();

  const refreshGitStatus = useCallback(async (filePath: string) => {
    try {
      const info = await invoke<RepoInfo | null>("detect_git_repo", { filePath });
      setRepoInfo(info);

      if (info) {
        try {
          const headContent = await invoke<string | null>("get_head_content", {
            repoRoot: info.repo_root,
            filePath,
          });
          setHeadContent(headContent);
        } catch {
          setHeadContent(null);
        }
      } else {
        setHeadContent(null);
      }
    } catch {
      setRepoInfo(null);
      setHeadContent(null);
    }
  }, [setRepoInfo, setHeadContent]);

  return { refreshGitStatus };
}
