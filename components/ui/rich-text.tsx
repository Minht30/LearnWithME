"use client";

import { renderRichText, renderRichTextInline } from "@/lib/render/rich-text";

/**
 * Render a prompt / choice / feedback string with our minimal markdown
 * + inline KaTeX. Content is HTML-escaped inside the renderer.
 *
 * Import "katex/dist/katex.min.css" once at the app root or here — the
 * CSS is small (~24KB gz) and only loads once.
 */
import "katex/dist/katex.min.css";

export function RichText({
  html, className, as: Tag = "div", inline = false,
}: {
  html: string;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  inline?: boolean;
}) {
  const Comp = Tag as React.ElementType;
  return (
    <Comp
      className={className}
      // Safe: renderer HTML-escapes text and passes math through KaTeX.
      dangerouslySetInnerHTML={{ __html: inline ? renderRichTextInline(html) : renderRichText(html) }}
    />
  );
}
