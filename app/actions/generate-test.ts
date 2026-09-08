"use server";

import { revalidatePath } from "next/cache";
import { generateJson } from "@/lib/ai/client";
import { GENERATION_SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompts";
import { GeneratedTest, TestRequest } from "@/lib/schemas/question";
import { createAdminClient, getDemoTeacherId } from "@/lib/supabase/admin";
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

  let raw: unknown;
  try {
    raw = await generateJson(
      [
        { role: "system", content: GENERATION_SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(req, sourceExcerpt) },
      ],
      { size: "large", temperature: 0.5, maxTokens: 6000 }
    );
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `AI generation failed: ${e.message}`
          : "AI generation failed.",
    };
  }

  const validated = GeneratedTest.safeParse(raw);
  if (!validated.success) {
    return {
      ok: false,
      error: `The AI returned malformed data. ${validated.error.issues.slice(0, 2).map((i) => i.message).join(", ")}`,
    };
  }
  const test = validated.data;

  const teacherId = await getDemoTeacherId();
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
