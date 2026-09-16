"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacherId } from "@/lib/auth/session";
import type { DbBankItem } from "@/lib/db/types";

export type BankSnapshot = {
  type: string;
  prompt: string;
  choices: string[] | null;
  correct: unknown;
  rubric: string | null;
  difficulty: string;
  strand: string | null;
  points: number;
  image_path: string | null;
  audio_path: string | null;
};

/** Save the current question to the teacher's personal bank. */
export async function saveToBank(
  questionId: string,
  label: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const teacherId = await requireTeacherId();
  const admin = createAdminClient();

  const { data: q } = await admin
    .from("questions")
    .select("*, tests!inner(teacher_id, subject, grade)")
    .eq("id", questionId)
    .maybeSingle();
  if (!q) return { ok: false, error: "Question not found." };
  const test = (q as unknown as { tests: { teacher_id: string; subject: string; grade: string } }).tests;
  if (test.teacher_id !== teacherId) return { ok: false, error: "You don't own that test." };

  const snapshot: BankSnapshot = {
    type: q.type,
    prompt: q.prompt,
    choices: q.choices ?? null,
    correct: q.correct,
    rubric: q.rubric ?? null,
    difficulty: q.difficulty,
    strand: q.strand ?? null,
    points: q.points ?? 1,
    image_path: q.image_path ?? null,
    audio_path: q.audio_path ?? null,
  };

  const { error } = await admin.from("question_bank_items").insert({
    teacher_id: teacherId,
    label: label.trim() || q.prompt.slice(0, 60),
    subject: test.subject,
    grade: test.grade,
    snapshot,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function listBank(): Promise<DbBankItem[]> {
  const teacherId = await requireTeacherId();
  const admin = createAdminClient();
  const { data } = await admin
    .from("question_bank_items")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  return (data ?? []) as DbBankItem[];
}

export async function deleteBankItem(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const teacherId = await requireTeacherId();
  const admin = createAdminClient();
  const { error } = await admin
    .from("question_bank_items")
    .delete()
    .eq("id", id)
    .eq("teacher_id", teacherId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Insert a bank item as a new question in the given test. */
export async function insertFromBank(
  testId: string,
  bankItemId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const teacherId = await requireTeacherId();
  const admin = createAdminClient();

  const { data: t } = await admin
    .from("tests")
    .select("id")
    .eq("id", testId)
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (!t) return { ok: false, error: "Test not found." };

  const { data: item } = await admin
    .from("question_bank_items")
    .select("*")
    .eq("id", bankItemId)
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (!item) return { ok: false, error: "Bank item not found." };

  const s = item.snapshot as BankSnapshot;
  const { data: last } = await admin
    .from("questions")
    .select("position")
    .eq("test_id", testId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (last?.position ?? 0) + 1;

  const { data: q, error } = await admin
    .from("questions")
    .insert({
      test_id: testId,
      type: s.type,
      prompt: s.prompt,
      choices: s.choices,
      correct: s.correct,
      rubric: s.rubric,
      difficulty: s.difficulty ?? "medium",
      strand: s.strand,
      points: s.points ?? 1,
      image_path: s.image_path,
      audio_path: s.audio_path,
      position,
    })
    .select("id")
    .single();
  if (error || !q) return { ok: false, error: error?.message ?? "Insert failed." };
  revalidatePath(`/dashboard/tests/${testId}`);
  return { ok: true, id: q.id };
}
