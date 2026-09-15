"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacherId } from "@/lib/auth/session";

export async function deleteQuestion(questionId: string, testId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("questions").delete().eq("id", questionId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/tests/${testId}`);
  return { ok: true as const };
}

export async function updateQuestion(
  questionId: string,
  testId: string,
  patch: {
    prompt?: string;
    correct?: unknown;
    rubric?: string | null;
    choices?: string[] | null;
    points?: number;
    image_path?: string | null;
    type?: string;
  }
) {
  const admin = createAdminClient();
  const { error } = await admin.from("questions").update(patch).eq("id", questionId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/tests/${testId}`);
  return { ok: true as const };
}

/** Reorder questions inside a test. `ordered` is an array of question ids in the new order. */
export async function reorderQuestions(testId: string, orderedIds: string[]) {
  const admin = createAdminClient();
  // Use a bulk update via upsert on id
  const rows = orderedIds.map((id, i) => ({ id, position: i + 1 }));
  const { error } = await admin.from("questions").upsert(rows, { onConflict: "id" });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/tests/${testId}`);
  return { ok: true as const };
}

/** Append a new question to a test. Returns the new question id. */
export async function addQuestion(
  testId: string,
  type: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data: last } = await admin
    .from("questions")
    .select("position")
    .eq("test_id", testId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (last?.position ?? 0) + 1;

  const defaults: Record<string, { prompt: string; choices: string[] | null; correct: unknown }> = {
    mcq:          { prompt: "New multiple-choice question", choices: ["Option A", "Option B", "Option C", "Option D"], correct: "Option A" },
    numeric:      { prompt: "New numeric question", choices: null, correct: "0" },
    short:        { prompt: "New short-answer question", choices: null, correct: "" },
    long:         { prompt: "New written question", choices: null, correct: "" },
    true_false:   { prompt: "New true/false statement", choices: null, correct: "true" },
    multi_select: { prompt: "New multi-select question", choices: ["Option A", "Option B", "Option C"], correct: ["Option A"] },
    cloze:        { prompt: "The capital of France is [BLANK].", choices: null, correct: ["Paris"] },
  };
  const d = defaults[type] ?? defaults.short;

  const { data, error } = await admin
    .from("questions")
    .insert({
      test_id: testId,
      type,
      prompt: d.prompt,
      choices: d.choices,
      correct: d.correct,
      difficulty: "medium",
      position,
      points: 1,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Failed to add." };
  revalidatePath(`/dashboard/tests/${testId}`);
  return { ok: true, id: data.id };
}

export async function deleteTest(testId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("tests").delete().eq("id", testId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true as const };
}

function randomCode(len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/**
 * Create a class attached to a test and return a shareable join code.
 * If a class was already created for this test, reuse it (no duplicates).
 */
export async function shareTestWithClass(testId: string, className: string, grade: string) {
  const admin = createAdminClient();
  const teacherId = await requireTeacherId();

  // Try to find existing class for this test
  const { data: existing } = await admin
    .from("class_tests")
    .select("class_id")
    .eq("test_id", testId)
    .maybeSingle();

  if (existing) {
    const { data: cls } = await admin
      .from("classes")
      .select("id, join_code")
      .eq("id", existing.class_id)
      .maybeSingle();
    if (cls) return { ok: true as const, joinCode: cls.join_code, classId: cls.id };
  }

  // Create new class
  let joinCode = randomCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await admin
      .from("classes")
      .insert({
        teacher_id: teacherId,
        name: className,
        grade,
        join_code: joinCode,
      })
      .select("id, join_code")
      .single();
    if (!error && data) {
      await admin.from("class_tests").insert({
        class_id: data.id,
        test_id: testId,
        mode: "practice",
      });
      revalidatePath(`/dashboard/tests/${testId}`);
      return { ok: true as const, joinCode: data.join_code, classId: data.id };
    }
    // If the code collided (unique constraint), pick a new one and retry
    joinCode = randomCode();
  }
  return { ok: false as const, error: "Could not generate a unique join code." };
}
