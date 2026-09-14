"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacherId } from "@/lib/auth/session";

/** Save (or clear) per-question teacher feedback. Debounced from the client. */
export async function saveQuestionFeedback(
  attemptId: string,
  questionId: string,
  feedback: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireTeacherId();
  const admin = createAdminClient();

  const trimmed = feedback.trim();
  const { error } = await admin
    .from("answers")
    .update({
      teacher_feedback: trimmed || null,
      feedback_at: trimmed ? new Date().toISOString() : null,
    })
    .eq("attempt_id", attemptId)
    .eq("question_id", questionId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

type Decision = "approved" | "needs_redo";

export async function decideAttempt(
  attemptId: string,
  decision: Decision,
  teacherNote: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const teacherId = await requireTeacherId();
  const admin = createAdminClient();

  const { error } = await admin
    .from("attempts")
    .update({
      status: decision,
      teacher_note: teacherNote.trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: teacherId,
    })
    .eq("id", attemptId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inbox");
  return { ok: true };
}

/** Assign a test to one or many students with an optional due date. */
export async function assignTestToStudents(
  testId: string,
  studentIds: string[],
  opts: { dueAt: string | null; priority: number; note: string | null }
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const teacherId = await requireTeacherId();
  const admin = createAdminClient();
  if (studentIds.length === 0) return { ok: false, error: "Pick at least one student." };

  const rows = studentIds.map((sid) => ({
    teacher_id: teacherId,
    test_id: testId,
    student_id: sid,
    due_at: opts.dueAt,
    priority: opts.priority,
    note: opts.note,
  }));

  const { data, error } = await admin
    .from("assignments")
    .upsert(rows, { onConflict: "test_id,student_id" })
    .select("id");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true, count: data?.length ?? 0 };
}

export async function unassignTest(
  testId: string,
  studentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireTeacherId();
  const admin = createAdminClient();
  const { error } = await admin
    .from("assignments")
    .delete()
    .eq("test_id", testId)
    .eq("student_id", studentId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Mark one or all notifications read. */
export async function markNotificationRead(
  id: string | "all"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const teacherId = await requireTeacherId();
  const admin = createAdminClient();
  const q = admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("teacher_id", teacherId)
    .is("read_at", null);
  if (id !== "all") q.eq("id", id);
  const { error } = await q;
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Reset a student's password (teacher-driven). Returns the new plain value. */
export async function resetStudentPassword(
  studentId: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireTeacherId();
  if (newPassword.length < 6) return { ok: false, error: "At least 6 characters." };
  const bcrypt = await import("bcryptjs");
  const admin = createAdminClient();
  const hash = await bcrypt.hash(newPassword, 10);
  const { error } = await admin
    .from("students")
    .update({ password_hash: hash, password_plain: newPassword })
    .eq("id", studentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/classes");
  return { ok: true };
}
