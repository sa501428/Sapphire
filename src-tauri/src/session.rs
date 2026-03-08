use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SessionSnapshot {
    pub path: String,
    pub content: String,
    pub timestamp: u64,
}

static SESSION_STORE: std::sync::LazyLock<Mutex<HashMap<String, SessionSnapshot>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashMap::new()));

#[tauri::command]
pub fn record_session_snapshot(path: String, content: String) {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let snapshot = SessionSnapshot {
        path: path.clone(),
        content,
        timestamp,
    };
    SESSION_STORE.lock().unwrap().insert(path, snapshot);
}

#[tauri::command]
pub fn get_session_snapshot(path: String) -> Option<String> {
    SESSION_STORE
        .lock()
        .unwrap()
        .get(&path)
        .map(|s| s.content.clone())
}

#[tauri::command]
pub fn clear_session_snapshot(path: String) {
    SESSION_STORE.lock().unwrap().remove(&path);
}

#[tauri::command]
pub fn list_session_snapshots() -> Vec<String> {
    SESSION_STORE
        .lock()
        .unwrap()
        .keys()
        .cloned()
        .collect()
}
