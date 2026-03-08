use git2::{Repository, StatusOptions};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RepoInfo {
    pub repo_root: String,
    pub branch: String,
    pub short_hash: String,
    pub commit_message: String,
    pub is_tracked: bool,
    pub is_modified: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileGitStatus {
    pub is_tracked: bool,
    pub is_modified: bool,
    pub is_staged: bool,
    pub label: String, // "clean" | "modified" | "untracked" | "staged"
}

#[tauri::command]
pub fn detect_git_repo(file_path: String) -> Option<RepoInfo> {
    let path = Path::new(&file_path);
    let repo = Repository::discover(path).ok()?;

    let repo_root = repo
        .workdir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let head = repo.head().ok()?;
    let branch = head.shorthand().unwrap_or("HEAD").to_string();

    let commit = head.peel_to_commit().ok()?;
    let id_str = commit.id().to_string();
    let short_hash = id_str[..7.min(id_str.len())].to_string();
    let commit_message = commit.summary().unwrap_or("").to_string();

    // Determine tracked/modified status for this file
    let abs = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    let root = Path::new(&repo_root)
        .canonicalize()
        .unwrap_or_else(|_| Path::new(&repo_root).to_path_buf());
    let rel = abs.strip_prefix(&root).ok()?.to_string_lossy().to_string();

    let mut opts = StatusOptions::new();
    opts.pathspec(&rel);
    let statuses = repo.statuses(Some(&mut opts)).ok()?;

    let (is_tracked, is_modified) = if statuses.is_empty() {
        (true, false)
    } else {
        let st = statuses.get(0)?.status();
        let untracked = st.contains(git2::Status::WT_NEW);
        let modified = st.contains(git2::Status::WT_MODIFIED)
            || st.contains(git2::Status::INDEX_MODIFIED);
        (!untracked, modified)
    };

    Some(RepoInfo {
        repo_root,
        branch,
        short_hash,
        commit_message,
        is_tracked,
        is_modified,
    })
}

#[tauri::command]
pub fn get_file_git_status(repo_root: String, file_path: String) -> FileGitStatus {
    let default = FileGitStatus {
        is_tracked: false,
        is_modified: false,
        is_staged: false,
        label: "untracked".to_string(),
    };

    let repo = match Repository::open(&repo_root) {
        Ok(r) => r,
        Err(_) => return default,
    };

    let abs = Path::new(&file_path)
        .canonicalize()
        .unwrap_or_else(|_| Path::new(&file_path).to_path_buf());
    let root = Path::new(&repo_root)
        .canonicalize()
        .unwrap_or_else(|_| Path::new(&repo_root).to_path_buf());

    let rel = match abs.strip_prefix(&root) {
        Ok(r) => r.to_string_lossy().to_string(),
        Err(_) => return default,
    };

    let mut opts = StatusOptions::new();
    opts.pathspec(&rel);

    let statuses = match repo.statuses(Some(&mut opts)) {
        Ok(s) => s,
        Err(_) => return default,
    };

    if statuses.is_empty() {
        return FileGitStatus {
            is_tracked: true,
            is_modified: false,
            is_staged: false,
            label: "clean".to_string(),
        };
    }

    let st = statuses.get(0).map(|e| e.status()).unwrap_or(git2::Status::empty());
    let is_untracked = st.contains(git2::Status::WT_NEW);
    let is_modified = st.contains(git2::Status::WT_MODIFIED);
    let is_staged = st.contains(git2::Status::INDEX_MODIFIED)
        || st.contains(git2::Status::INDEX_NEW);

    let label = if is_untracked {
        "untracked"
    } else if is_staged {
        "staged"
    } else if is_modified {
        "modified"
    } else {
        "clean"
    }
    .to_string();

    FileGitStatus {
        is_tracked: !is_untracked,
        is_modified,
        is_staged,
        label,
    }
}

#[tauri::command]
pub fn get_head_content(repo_root: String, file_path: String) -> Option<String> {
    let repo = Repository::open(&repo_root).ok()?;
    let head = repo.head().ok()?;
    let tree = head.peel_to_tree().ok()?;

    let abs = Path::new(&file_path)
        .canonicalize()
        .unwrap_or_else(|_| Path::new(&file_path).to_path_buf());
    let root = Path::new(&repo_root)
        .canonicalize()
        .unwrap_or_else(|_| Path::new(&repo_root).to_path_buf());
    let rel = abs.strip_prefix(&root).ok()?;

    let entry = tree.get_path(rel).ok()?;
    let blob = repo.find_blob(entry.id()).ok()?;
    let content = std::str::from_utf8(blob.content()).ok()?.to_string();
    Some(content)
}
