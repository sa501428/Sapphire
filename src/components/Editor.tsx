import { useEffect, useRef } from "react";
import { EditorState, Extension } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  ViewUpdate,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, search } from "@codemirror/search";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  foldGutter,
  bracketMatching,
} from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { useSettingsStore } from "../store/settingsStore";
import { DiffLine } from "../store/gitStore";

interface EditorProps {
  content: string;
  onChange: (value: string) => void;
  onCursorChange?: (line: number, col: number) => void;
  diffLines?: DiffLine[];
  path: string;
}

export function Editor({ content, onChange, onCursorChange, diffLines, path }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { theme, fontSize, fontFamily, softWrap, showLineNumbers } = useSettingsStore();

  // Build highlighted line set from diff
  const buildDiffDecorations = (lines: DiffLine[]) => {
    const addLines = new Set<number>();
    const delLines = new Set<number>();
    for (const l of lines) {
      if (l.new_lineno !== null) {
        if (l.tag === "insert") addLines.add(l.new_lineno);
      }
    }
    return { addLines, delLines };
  };

  const buildExtensions = (initialContent: string): Extension[] => {
    const exts: Extension[] = [
      history(),
      drawSelection(),
      bracketMatching(),
      highlightActiveLine(),
      foldGutter(),
      search({ top: true }),
      markdown({ base: markdownLanguage }),
      syntaxHighlighting(defaultHighlightStyle),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        indentWithTab,
      ]),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
        if (update.selectionSet && onCursorChange) {
          const pos = update.state.selection.main.head;
          const line = update.state.doc.lineAt(pos);
          onCursorChange(line.number, pos - line.from + 1);
        }
      }),
      EditorView.theme({
        "&": { height: "100%", fontSize: `${fontSize}px`, fontFamily },
        ".cm-scroller": { overflow: "auto", lineHeight: "1.7" },
        ".cm-content": { padding: "8px 0" },
        ".cm-gutters": { background: "var(--bg-surface)", borderRight: "1px solid var(--border)", color: "var(--text-muted)" },
        ".cm-activeLineGutter": { background: "var(--bg-hover)" },
        ".cm-activeLine": { background: "var(--bg-hover)" },
        ".cm-selectionBackground, ::selection": { background: "var(--accent-muted) !important" },
        ".cm-cursor": { borderLeftColor: "var(--accent)" },
        // Diff gutter marks
        ".cm-diff-add-line": { background: "rgba(81, 207, 102, 0.15)" },
        ".cm-diff-del-line": { background: "rgba(255, 107, 107, 0.15)" },
      }),
    ];

    if (theme === "dark") {
      exts.push(oneDark);
    } else {
      exts.push(
        EditorView.theme({
          "&": { background: "var(--bg-surface)", color: "var(--text-primary)" },
        })
      );
    }

    if (showLineNumbers) {
      exts.push(lineNumbers(), highlightActiveLineGutter());
    }

    if (softWrap) {
      exts.push(EditorView.lineWrapping);
    }

    return exts;
  };

  // Mount editor
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: buildExtensions(content),
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // mount once

  // Sync content when file path changes (switching tabs)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
    }
  }, [path]); // when switching files

  // Sync content when content prop changes externally (e.g., revert)
  const lastExternalContent = useRef(content);
  useEffect(() => {
    if (lastExternalContent.current !== content) {
      lastExternalContent.current = content;
      const view = viewRef.current;
      if (!view) return;
      const current = view.state.doc.toString();
      if (current !== content) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: content },
        });
      }
    }
  }, [content]);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}
    />
  );
}
