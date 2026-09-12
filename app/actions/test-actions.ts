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
  patch: { prompt?: string; correct?: unknown; rubric?: string }
) {
  const admin = createAdminClient();
  const { error } = await admin.from("questions").update(patch).eq("id", questionId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/tests/${testId}`);
  return { ok: true as const };
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
