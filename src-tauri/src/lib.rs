mod diff_ops;
mod fs_ops;
mod git_ops;
mod session;

use diff_ops::compute_diff;
use fs_ops::{create_file, open_file, read_dir_recursive, revert_file, save_file};
use git_ops::{detect_git_repo, get_file_git_status, get_head_content};
use session::{
    clear_session_snapshot, get_session_snapshot, list_session_snapshots,
    record_session_snapshot,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            // File operations
            open_file,
            save_file,
            revert_file,
            create_file,
            read_dir_recursive,
            // Git operations
            detect_git_repo,
            get_file_git_status,
            get_head_content,
            // Diff operations
            compute_diff,
            // Session management
            record_session_snapshot,
            get_session_snapshot,
            clear_session_snapshot,
            list_session_snapshots,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Sapphire");
}
