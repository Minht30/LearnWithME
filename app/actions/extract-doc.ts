"use server";

import { extractText } from "unpdf";
import mammoth from "mammoth";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_CHARS = 12_000; // hard cap on excerpt we pass to the model

export async function extractDocumentText(
  formData: FormData
): Promise<{ ok: true; text: string; filename: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File is too large (10 MB max)." };
  }

  const name = file.name.toLowerCase();
  const buf = new Uint8Array(await file.arrayBuffer());

  try {
    let text = "";
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const result = await extractText(buf, { mergePages: true });
      text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
    } else if (
      name.endsWith(".docx") ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
      text = result.value;
    } else if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
      text = new TextDecoder().decode(buf);
    } else {
      return { ok: false, error: "Only PDF, DOCX, TXT, and MD are supported." };
    }

    text = text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!text) return { ok: false, error: "Couldn't read any text from that file." };
    if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

    return { ok: true, text, filename: file.name };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Extraction failed.",
    };
  }
}
