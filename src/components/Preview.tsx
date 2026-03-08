import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

// Configure marked
marked.setOptions({ gfm: true, breaks: false });

interface PreviewProps {
  content: string;
}

export function Preview({ content }: PreviewProps) {
  const html = useMemo(() => {
    try {
      const raw = marked.parse(content) as string;
      return DOMPurify.sanitize(raw, {
        ADD_TAGS: ["task-list"],
        FORBID_TAGS: ["script", "iframe", "object", "embed"],
        FORBID_ATTR: ["onerror", "onload", "onclick"],
      });
    } catch {
      return "<p>Preview error</p>";
    }
  }, [content]);

  return (
    <div
      className="preview-content"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
