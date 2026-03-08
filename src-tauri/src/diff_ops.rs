use serde::{Deserialize, Serialize};
use similar::{ChangeTag, TextDiff};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DiffLine {
    pub tag: String, // "equal" | "insert" | "delete"
    pub old_lineno: Option<u32>,
    pub new_lineno: Option<u32>,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DiffResult {
    pub unified: String,
    pub lines: Vec<DiffLine>,
    pub has_changes: bool,
    pub added_count: usize,
    pub removed_count: usize,
}

#[tauri::command]
pub fn compute_diff(old: String, new_content: String) -> DiffResult {
    let diff = TextDiff::from_lines(&old, &new_content);

    let mut lines = Vec::new();
    let mut old_lineno: u32 = 0;
    let mut new_lineno: u32 = 0;
    let mut has_changes = false;
    let mut added_count = 0;
    let mut removed_count = 0;

    for change in diff.iter_all_changes() {
        let tag = match change.tag() {
            ChangeTag::Delete => {
                has_changes = true;
                removed_count += 1;
                "delete"
            }
            ChangeTag::Insert => {
                has_changes = true;
                added_count += 1;
                "insert"
            }
            ChangeTag::Equal => "equal",
        };

        let old_ln = if matches!(change.tag(), ChangeTag::Delete | ChangeTag::Equal) {
            old_lineno += 1;
            Some(old_lineno)
        } else {
            None
        };

        let new_ln = if matches!(change.tag(), ChangeTag::Insert | ChangeTag::Equal) {
            new_lineno += 1;
            Some(new_lineno)
        } else {
            None
        };

        lines.push(DiffLine {
            tag: tag.to_string(),
            old_lineno: old_ln,
            new_lineno: new_ln,
            content: change.to_string(),
        });
    }

    let unified = diff
        .unified_diff()
        .context_radius(3)
        .header("original", "modified")
        .to_string();

    DiffResult {
        unified,
        lines,
        has_changes,
        added_count,
        removed_count,
    }
}
