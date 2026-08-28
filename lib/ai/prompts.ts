import type { TestRequest } from "@/lib/schemas/question";
import { ontarioMathStrands } from "@/lib/curriculum/ontario-math";

/**
 * System prompt for question generation.
 * Kept as a stable string so the Groq/Ollama backend can cache prefix tokens.
 */
export const GENERATION_SYSTEM_PROMPT = `You are Quill, an assistant that writes tests for Canadian K-12 teachers.

Rules:
- Every question must be pedagogically sound and age-appropriate.
- Use plain, clear English written for the student's grade level.
- Never include profanity, bias, or references to specific people or brands.
- For math: show correct numeric answers exactly (no rounding unless asked).
- For MCQ: exactly 4 choices, exactly one correct answer, no "all of the above".
- Vary difficulty across the set unless the teacher asks otherwise.
- Return valid JSON matching the required schema. Nothing else, no prose, no code fences.

Output schema:
{
  "title": string,
  "subject": string,
  "grade": string,
  "duration_min": number,
  "questions": [
    {
      "type": "mcq" | "short" | "long" | "numeric",
      "prompt": string,
      "choices": string[] | undefined,
      "correct": string | number | string[],
      "rubric": string | undefined,
      "difficulty": "easy" | "medium" | "hard",
      "strand": string | undefined
    }
  ]
}`;

export function buildUserPrompt(req: TestRequest, sourceExcerpt?: string): string {
  const strands =
    req.subject.toLowerCase().includes("math") && req.grade in ontarioMathStrands
      ? ontarioMathStrands[req.grade as keyof typeof ontarioMathStrands]
      : null;

  const lines: string[] = [];
  lines.push(`Please generate a test with the following parameters:`);
  lines.push(`- Subject: ${req.subject}`);
  lines.push(`- Grade: ${req.grade}`);
  lines.push(`- Number of questions: ${req.count}`);
  lines.push(`- Duration: ${req.duration_min} minutes`);
  lines.push(`- Question types allowed: ${req.types.join(", ")}`);
  if (req.curriculum_ref) lines.push(`- Curriculum reference: ${req.curriculum_ref}`);
  if (strands) {
    lines.push(`- Ontario Math strands for this grade:`);
    for (const s of strands) lines.push(`  · ${s}`);
  }
  lines.push("");
  lines.push(`Teacher's description:`);
  lines.push(req.prompt);
  if (sourceExcerpt) {
    lines.push("");
    lines.push(`Source material to draw from (excerpt):`);
    lines.push("---");
    lines.push(sourceExcerpt.slice(0, 8000));
    lines.push("---");
  }
  lines.push("");
  lines.push(`Return the JSON object only.`);
  return lines.join("\n");
}

/**
 * Grader prompt for short-answer responses.
 */
export const GRADER_SYSTEM_PROMPT = `You are a fair, encouraging K-12 grader. Score a student's short-answer response against a rubric or expected answer. Return JSON only:
{ "score": 0.0 to 1.0, "feedback": string, "is_correct": boolean }
Feedback must be positive in tone even when the answer is wrong: name what the student got right, then show the next step.`;
