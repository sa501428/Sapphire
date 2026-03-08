# Sapphire

A fast, local-only markdown editor with Git-aware session diffing. Built as a native desktop app — no cloud, no telemetry, no network required.

![Sapphire Logo](sapphire.png)

---

## Features

- **CodeMirror 6 editor** — markdown syntax highlighting, fold gutters, search/replace, undo/redo, auto-pair
- **Live preview pane** — locally rendered markdown (no external services)
- **Git diff mode** — compare current buffer against three baselines:
  - `HEAD` — last committed version
  - `Session start` — file state when it was opened
  - `Disk` — current on-disk version
- **File tree & tabs** — open folders, browse files, work across multiple documents
- **Document outline** — jump to headings via the outline panel
- **Status bar** — branch name, commit hash, tracked/modified status, cursor position
- **Light & dark themes** — toggle with `⌘⇧T`, follows your preference
- **Settings** — font family, font size, soft wrap, line numbers, diff style, autosave
- **Fully local** — all editing, preview, and diff computation happens on-device

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Rust + Cargo | stable | [rustup.rs](https://rustup.rs) |
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| npm | ≥ 9 | bundled with Node |
| Git | any | required at runtime for Git features |

**macOS only:** Xcode Command Line Tools must be installed:
```bash
xcode-select --install
```

---

## Development

```bash
# Install frontend dependencies
npm install

# Start dev server (hot-reloads both frontend and Rust backend)
source ~/.cargo/env   # if cargo isn't in PATH
npm run tauri dev
```

The app window will open automatically. The Vite dev server runs on `http://localhost:1420`.

---

## Building for Distribution

```bash
source ~/.cargo/env
npm run tauri build
```

Packaged outputs are written to `src-tauri/target/release/bundle/`:

| Platform | Format | Location |
|---|---|---|
| macOS | `.dmg`, `.app` | `bundle/dmg/`, `bundle/macos/` |
| Windows | `.msi`, `.exe` | `bundle/msi/`, `bundle/nsis/` |
| Linux | `.AppImage`, `.deb` | `bundle/appimage/`, `bundle/deb/` |

---

## Project Structure

```
sapphire/
├── src-tauri/              # Rust backend (Tauri 2)
│   ├── src/
│   │   ├── lib.rs          # App setup + Tauri command registration
│   │   ├── fs_ops.rs       # File open / save / read-dir
│   │   ├── git_ops.rs      # Repo detection, branch info, HEAD content
│   │   ├── diff_ops.rs     # Diff computation (similar crate)
│   │   └── session.rs      # Session snapshots (in-memory)
│   ├── capabilities/
│   │   └── default.json    # Tauri permission declarations
│   └── tauri.conf.json     # App config, window size, bundle targets
│
└── src/                    # React + TypeScript frontend (Vite)
    ├── components/
    │   ├── Editor.tsx       # CodeMirror 6 editor
    │   ├── Preview.tsx      # Markdown preview (marked + DOMPurify)
    │   ├── DiffView.tsx     # Diff display with baseline switcher
    │   ├── Sidebar.tsx      # File tree + outline panel
    │   ├── TabBar.tsx       # Open file tabs
    │   ├── StatusBar.tsx    # Bottom status bar
    │   └── SettingsModal.tsx
    ├── store/
    │   ├── editorStore.ts   # Open files, active tab, pane state
    │   ├── gitStore.ts      # Repo info, HEAD content, diff results
    │   └── settingsStore.ts # Theme, font, preferences
    ├── hooks/
    │   └── useGitStatus.ts  # Refresh git state on file open/save
    └── styles/
        ├── global.css
        └── themes/          # light.css / dark.css (CSS custom properties)
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘S` | Save |
| `⌘⇧S` | Save As |
| `⌘⇧P` | Toggle preview pane |
| `⌘⇧D` | Toggle diff mode |
| `⌘⇧T` | Toggle light/dark theme |
| `⌘F` | Search (CodeMirror built-in) |
| `⌘H` | Find & replace |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop runtime | [Tauri 2](https://tauri.app) |
| Backend language | Rust |
| Git integration | [`git2`](https://crates.io/crates/git2) (libgit2 bindings) |
| Diff engine | [`similar`](https://crates.io/crates/similar) |
| Frontend | React 19 + TypeScript + Vite |
| Editor | [CodeMirror 6](https://codemirror.net) |
| Markdown rendering | [`marked`](https://marked.js.org) + [`DOMPurify`](https://github.com/cure53/DOMPurify) |
| State | [Zustand 5](https://zustand-demo.pmnd.rs) |

---

## License

MIT — Copyright 2026 Muhammad Saad Shamim
