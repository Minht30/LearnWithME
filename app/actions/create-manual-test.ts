"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacherId } from "@/lib/auth/session";
import { Question } from "@/lib/schemas/question";

const ManualTest = z.object({
  title: z.string().min(1, "Give your test a title."),
  subject: z.string().min(1),
  grade: z.string().min(1),
  duration_min: z.number().int().min(1).max(240),
  questions: z.array(Question).min(1, "Add at least one question."),
});

export type ManualTestInput = z.input<typeof ManualTest>;

export type CreateResult =
  | { ok: true; testId: string }
  | { ok: false; error: string };

export async function createManualTest(
  input: ManualTestInput
): Promise<CreateResult> {
  const parsed = ManualTest.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }
  const test = parsed.data;

  const teacherId = await requireTeacherId();
  const admin = createAdminClient();

  const { data: testRow, error: testErr } = await admin
    .from("tests")
    .insert({
      teacher_id: teacherId,
      title: test.title,
      subject: test.subject,
      grade: test.grade,
      curriculum_ref: null,
      source_prompt: "(built manually)",
      duration_min: test.duration_min,
    })
    .select("id")
    .single();
  if (testErr || !testRow) {
    return { ok: false, error: `Could not save test: ${testErr?.message ?? "unknown"}` };
  }

  const rows = test.questions.map((q, i) => ({
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
  const { error: qErr } = await admin.from("questions").insert(rows);
  if (qErr) {
    return { ok: false, error: `Could not save questions: ${qErr.message}` };
  }

  revalidatePath("/dashboard");
  return { ok: true, testId: testRow.id };
}
