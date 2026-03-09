import { useEffect, useRef } from "react";
import {
  EditorState,
  Extension,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  ViewUpdate,
  Decoration,
  DecorationSet,
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

// ── Hunk highlight StateEffect / StateField ───────────────────────────────────

// Effect carries an array of 1-based line numbers to highlight (or null to clear)
export const setHunkHighlight = StateEffect.define<number[] | null>();

const hunkHighlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setHunkHighlight)) {
        if (!e.value || e.value.length === 0) {
          deco = Decoration.none;
        } else {
          const doc = tr.state.doc;
          const marks = e.value
            .filter((ln) => ln >= 1 && ln <= doc.lines)
            .map((ln) =>
              Decoration.line({ class: "cm-hunk-highlight" }).range(
                doc.line(ln).from
              )
            );
          deco = marks.length > 0 ? Decoration.set(marks) : Decoration.none;
        }
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ── Component ─────────────────────────────────────────────────────────────────

interface EditorProps {
  content: string;
  onChange: (value: string) => void;
  onCursorChange?: (line: number, col: number) => void;
  onEditorReady?: (view: EditorView) => void;
  path: string;
}

export function Editor({
  content,
  onChange,
  onCursorChange,
  onEditorReady,
  path,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { theme, fontSize, fontFamily, softWrap, showLineNumbers } =
    useSettingsStore();

  const buildExtensions = (): Extension[] => {
    const exts: Extension[] = [
      history(),
      drawSelection(),
      bracketMatching(),
      highlightActiveLine(),
      foldGutter(),
      search({ top: true }),
      markdown({ base: markdownLanguage }),
      syntaxHighlighting(defaultHighlightStyle),
      hunkHighlightField,
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
        ".cm-gutters": {
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
          color: "var(--text-muted)",
        },
        ".cm-activeLineGutter": { background: "var(--bg-hover)" },
        ".cm-activeLine": { background: "var(--bg-hover)" },
        ".cm-selectionBackground, ::selection": {
          background: "var(--accent-muted) !important",
        },
        ".cm-cursor": { borderLeftColor: "var(--accent)" },
        // Decoration.line puts a class on the .cm-line div (background only)
        // so ::selection on text nodes inside is still fully visible
        ".cm-hunk-highlight": {
          background: "rgba(250, 196, 25, 0.15)",
          borderLeft: "3px solid rgba(250, 196, 25, 0.8)",
        },
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

    if (showLineNumbers) exts.push(lineNumbers(), highlightActiveLineGutter());
    if (softWrap) exts.push(EditorView.lineWrapping);

    return exts;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: buildExtensions(),
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    onEditorReady?.(view);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // mount once

  // Sync content when switching files
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const cur = view.state.doc.toString();
    if (cur !== content) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
        effects: setHunkHighlight.of(null),
      });
    }
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync content on external changes (revert etc.)
  const lastExternal = useRef(content);
  useEffect(() => {
    if (lastExternal.current === content) return;
    lastExternal.current = content;
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() !== content) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
    }
  }, [content]);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}
    />
  );
}
