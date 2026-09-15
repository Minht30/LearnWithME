import katex from "katex";

/**
 * Tiny "safe markdown" renderer + inline KaTeX.
 *
 * Supports:
 *   **bold**       →  <strong>
 *   *italic*       →  <em>
 *   `code`         →  <code>
 *   $math$         →  KaTeX inline (single dollars)
 *   $$math$$       →  KaTeX display
 *   line breaks    →  <br/>
 *
 * The output is safe by construction: we HTML-escape everything first,
 * then apply the transforms on the escaped text. Math is rendered by
 * KaTeX (which produces its own trusted HTML).
 *
 * NOT a full markdown parser — no links, no images, no lists. Keep it
 * intentional. Images live in a separate DB column (image_path).
 */

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function renderMath(src: string, displayMode: boolean): string {
  try {
    return katex.renderToString(src, {
      displayMode,
      throwOnError: false,
      output: "html",
    });
  } catch {
    return esc(src);
  }
}

/**
 * Render one line of already-escaped-elsewhere-or-plain text.
 * Extracts $$…$$ blocks first, then $…$, then applies inline formatting.
 */
function renderInline(line: string): string {
  // Split on math tokens so we don't mangle escaped $ inside code, etc.
  // A pragmatic split: keep it simple — no nesting, no escapes.
  const parts: string[] = [];
  let i = 0;
  while (i < line.length) {
    // $$ display
    if (line[i] === "$" && line[i + 1] === "$") {
      const end = line.indexOf("$$", i + 2);
      if (end !== -1) {
        parts.push(renderMath(line.slice(i + 2, end), true));
        i = end + 2;
        continue;
      }
    }
    // $ inline
    if (line[i] === "$") {
      const end = line.indexOf("$", i + 1);
      if (end !== -1) {
        parts.push(renderMath(line.slice(i + 1, end), false));
        i = end + 1;
        continue;
      }
    }
    // else grab a run of non-$ chars
    const next = line.indexOf("$", i);
    const chunkEnd = next === -1 ? line.length : next;
    parts.push(applyInlineMarkdown(esc(line.slice(i, chunkEnd))));
    i = chunkEnd;
  }
  return parts.join("");
}

function applyInlineMarkdown(s: string): string {
  return s
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>");
}

export function renderRichText(input: string): string {
  if (!input) return "";
  const lines = input.split("\n");
  return lines.map(renderInline).join("<br/>");
}

/**
 * For places (like MCQ choices) where we want inline rendering only,
 * no line break handling.
 */
export function renderRichTextInline(input: string): string {
  if (!input) return "";
  return renderInline(input);
}

/**
 * Cloze prompt with [BLANK] markers → array of segments where each
 * text segment is rendered and each blank is marked as "blank" so the
 * client can splat an input in place. Preserves order.
 */
export type ClozeSegment =
  | { kind: "text"; html: string }
  | { kind: "blank"; index: number };

export function parseCloze(prompt: string): ClozeSegment[] {
  const parts = prompt.split(/\[BLANK\]/i);
  const segments: ClozeSegment[] = [];
  parts.forEach((p, i) => {
    if (p.length > 0) segments.push({ kind: "text", html: renderInline(p) });
    if (i < parts.length - 1) segments.push({ kind: "blank", index: i });
  });
  return segments;
}
