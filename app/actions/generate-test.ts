"use server";

import { revalidatePath } from "next/cache";
import { generateJson } from "@/lib/ai/client";
import { GENERATION_SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompts";
import { GeneratedTest, TestRequest } from "@/lib/schemas/question";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacherId } from "@/lib/auth/session";
import type { z } from "zod";

export type GenerateResult =
  | { ok: true; testId: string }
  | { ok: false; error: string };

export async function generateTest(
  input: z.input<typeof TestRequest>,
  sourceExcerpt?: string
): Promise<GenerateResult> {
  const parsed = TestRequest.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const req = parsed.data;

  // Budget ~280 output tokens per question, clamped to a safe range for the
  // free tier. Bigger tests → bigger budget, up to ~8K.
  const maxTokens = Math.min(8000, Math.max(1200, req.count * 280));

  let raw: unknown;
  try {
    raw = await generateJson(
      [
        { role: "system", content: GENERATION_SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(req, sourceExcerpt) },
      ],
      { size: "large", temperature: 0.5, maxTokens }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/rate_limit|429|too many|OTPM|TPM/i.test(msg)) {
      return {
        ok: false,
        error:
          "The free-tier AI limit was reached for this minute. Wait ~60 seconds and try again, or ask for fewer questions.",
      };
    }
    if (/model_not_found|does not exist/i.test(msg)) {
      return {
        ok: false,
        error:
          "The AI model has been deprecated by Groq. Check GROQ_MODEL_LARGE in your env.",
      };
    }
    return { ok: false, error: `AI generation failed: ${msg}` };
  }

  const validated = GeneratedTest.safeParse(raw);
  if (!validated.success) {
    return {
      ok: false,
      error: `The AI returned malformed data. ${validated.error.issues.slice(0, 2).map((i) => i.message).join(", ")}`,
    };
  }
  const test = validated.data;

  const teacherId = await requireTeacherId();
  const admin = createAdminClient();

  const { data: testRow, error: testErr } = await admin
    .from("tests")
    .insert({
      teacher_id: teacherId,
      title: test.title,
      subject: test.subject,
      grade: test.grade,
      curriculum_ref: req.curriculum_ref ?? null,
      source_prompt: req.prompt,
      duration_min: test.duration_min,
    })
    .select("id")
    .single();
  if (testErr || !testRow) {
    return { ok: false, error: `Could not save test: ${testErr?.message ?? "unknown"}` };
  }

  const questionRows = test.questions.map((q, i) => ({
    test_id: testRow.id,
    type: q.type,
    prompt: q.prompt,
    choices: q.choices ?? null,
    correct: q.correct,
    rubric: q.rubric ?? null,
    difficulty: q.difficulty,
    strand: q.strand ?? null,
    position: i,
  }));
  const { error: qErr } = await admin.from("questions").insert(questionRows);
  if (qErr) {
    return { ok: false, error: `Could not save questions: ${qErr.message}` };
  }

  revalidatePath("/dashboard");
  return { ok: true, testId: testRow.id };
}
