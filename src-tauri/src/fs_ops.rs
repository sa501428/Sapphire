use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileContent {
    pub path: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<DirEntry>>,
}

#[tauri::command]
pub fn open_file(path: String) -> Result<FileContent, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("Cannot read file: {e}"))?;
    Ok(FileContent { path, content })
}

#[tauri::command]
pub fn save_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| format!("Cannot save file: {e}"))
}

#[tauri::command]
pub fn revert_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Cannot read file: {e}"))
}

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    // Create parent dirs if needed
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Cannot create directory: {e}"))?;
    }
    fs::write(&path, "").map_err(|e| format!("Cannot create file: {e}"))
}

#[tauri::command]
pub fn read_dir_recursive(path: String) -> Result<Vec<DirEntry>, String> {
    read_dir_inner(&path)
}

fn read_dir_inner(path: &str) -> Result<Vec<DirEntry>, String> {
    let entries = fs::read_dir(path).map_err(|e| format!("Cannot read directory: {e}"))?;
    let mut result = Vec::new();

    for entry in entries.flatten() {
        let fpath = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden entries
        if name.starts_with('.') {
            continue;
        }

        let path_str = fpath.to_string_lossy().to_string();

        if fpath.is_dir() {
            let children = read_dir_inner(&path_str).ok();
            result.push(DirEntry {
                name,
                path: path_str,
                is_dir: true,
                children,
            });
        } else {
            let ext = fpath
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("");
            if matches!(ext, "md" | "markdown" | "mdown" | "txt") {
                result.push(DirEntry {
                    name,
                    path: path_str,
                    is_dir: false,
                    children: None,
                });
            }
        }
    }

    result.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.cmp(&b.name),
    });

    Ok(result)
}
