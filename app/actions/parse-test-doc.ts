"use server";

import { extractText } from "unpdf";
import mammoth from "mammoth";
import { z } from "zod";
import { generateJson } from "@/lib/ai/client";
import { Question, QuestionType, Difficulty } from "@/lib/schemas/question";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_CHARS = 15_000;

const ParsedTest = z.object({
  title: z.string().optional(),
  subject: z.string().optional(),
  grade: z.string().optional(),
  questions: z.array(Question).min(1),
});

export type ParsedTest = z.infer<typeof ParsedTest>;

export type ParseResult =
  | { ok: true; parsed: ParsedTest; charsRead: number; filename: string }
  | { ok: false; error: string };

const PARSE_SYSTEM_PROMPT = `You are an assistant that parses existing test documents into a structured JSON format so a teacher can put them into an online practice tool.

Rules:
- Read the document carefully. Find every question.
- For each question, decide the type:
  * "mcq" if it lists multiple choices (A/B/C/D, 1/2/3/4, or bulleted)
  * "numeric" if the expected answer is a number (arithmetic, count, measurement)
  * "short" if a one- or two-word answer is expected
  * "long" if a paragraph/essay/explanation is expected
- Clean up the prompt text: remove leading "1.", "Q1.", "Question 5:" etc.
- For MCQ: extract choices as plain strings (drop the "A." / "1)" prefix). Never include "All of the above" or "None of the above".
- If the document has an answer key, use it to set "correct". For MCQ, "correct" must exactly match one of the choices. For numeric, "correct" is the numeric value as a string. For short, the expected text. For long, put a brief rubric in "rubric" and leave "correct" as the expected key phrase.
- If no answer key is present, still pick the best plausible correct answer for MCQ/numeric/short (mark difficulty "easy" if you're guessing). For long, set "correct" to an empty string and put guidance in "rubric".
- Estimate difficulty ("easy"/"medium"/"hard") from the question complexity.
- If the document names a subject or grade in a header, capture them in top-level "subject" and "grade".
- If there's a title on the document, use it. Otherwise generate a short one.

Output schema (JSON object only, no prose, no code fences):
{
  "title": string | undefined,
  "subject": string | undefined,
  "grade": string | undefined,
  "questions": [
    {
      "type": "mcq" | "short" | "long" | "numeric",
      "prompt": string,
      "choices": string[] | undefined,
      "correct": string | number,
      "rubric": string | undefined,
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}`;

async function extractDocText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buf = new Uint8Array(await file.arrayBuffer());
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const result = await extractText(buf, { mergePages: true });
    return Array.isArray(result.text) ? result.text.join("\n") : result.text;
  }
  if (
    name.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    return result.value;
  }
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return new TextDecoder().decode(buf);
  }
  throw new Error("Only PDF, DOCX, TXT, and MD are supported.");
}

/** Best-effort cleanup so the AI works from tidier text. */
function tidy(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function parseTestFromDoc(formData: FormData): Promise<ParseResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };
  if (file.size > MAX_BYTES) return { ok: false, error: "File is too large (10 MB max)." };

  let text: string;
  try {
    text = tidy(await extractDocText(file));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Extraction failed." };
  }
  if (!text) return { ok: false, error: "Couldn't read any text from that file." };
  const charsRead = text.length;
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

  const suggestedCount = Math.min(30, Math.max(3, Math.ceil(text.length / 400)));
  const maxTokens = Math.min(8000, Math.max(1500, suggestedCount * 250));

  let raw: unknown;
  try {
    raw = await generateJson(
      [
        { role: "system", content: PARSE_SYSTEM_PROMPT },
        {
          role: "user",
          content:
            `Parse the following test document into JSON:\n\n---\n${text}\n---\n\nReturn the JSON object only.`,
        },
      ],
      { size: "large", temperature: 0.15, maxTokens }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/rate_limit|429|OTPM|TPM/i.test(msg)) {
      return { ok: false, error: "The free-tier AI limit was reached. Wait ~60 seconds and try again." };
    }
    return { ok: false, error: `AI parsing failed: ${msg}` };
  }

  const validated = ParsedTest.safeParse(raw);
  if (!validated.success) {
    return {
      ok: false,
      error: `The AI returned malformed data. ${validated.error.issues.slice(0, 2).map((i) => i.message).join(", ")}`,
    };
  }

  // Normalize a couple of fields
  const parsed: ParsedTest = {
    title: validated.data.title?.trim() || undefined,
    subject: validated.data.subject?.trim() || undefined,
    grade: validated.data.grade?.trim() || undefined,
    questions: validated.data.questions.map((q) => ({
      type: q.type as QuestionType,
      prompt: q.prompt.trim(),
      choices: q.choices?.map((c) => String(c).trim()).filter(Boolean),
      correct: Array.isArray(q.correct) ? q.correct.join(", ") : q.correct,
      rubric: q.rubric?.trim() || undefined,
      difficulty: q.difficulty as Difficulty,
      strand: q.strand,
    })),
  };

  return { ok: true, parsed, charsRead, filename: file.name };
}
