"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { setStudentSession, clearStudentSession } from "@/lib/auth/student-session";

export type StudentAuthResult = { ok: true } | { ok: false; error: string };

/**
 * Student login: class code + username + password.
 */
export async function signInStudent(formData: FormData): Promise<StudentAuthResult> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!code || !username || !password) return { ok: false, error: "Fill in every field." };

  const admin = createAdminClient();
  const { data: cls } = await admin
    .from("classes")
    .select("id")
    .eq("join_code", code)
    .maybeSingle();
  if (!cls) return { ok: false, error: "Class code not found." };

  const { data: student } = await admin
    .from("students")
    .select("id, anon_token, password_hash, display_name")
    .eq("class_id", cls.id)
    .eq("username", username)
    .maybeSingle();
  if (!student || !student.password_hash) return { ok: false, error: "Wrong username or password." };

  const ok = await bcrypt.compare(password, student.password_hash);
  if (!ok) return { ok: false, error: "Wrong username or password." };

  await setStudentSession(student.anon_token);
  return { ok: true };
}

export async function signOutStudent() {
  await clearStudentSession();
  redirect("/student/login");
}

/**
 * Start (or resume) an attempt on a given test as the current student.
 */
export async function startAttemptForStudent(testId: string) {
  const { getCurrentStudent } = await import("@/lib/auth/student-session");
  const student = await getCurrentStudent();
  if (!student) redirect("/student/login");

  const admin = createAdminClient();
  // Resume an unsubmitted attempt if one exists
  const { data: existing } = await admin
    .from("attempts")
    .select("id")
    .eq("student_id", student.id)
    .eq("test_id", testId)
    .is("submitted_at", null)
    .maybeSingle();
  if (existing) redirect(`/take/${existing.id}`);

  const { data: attempt, error } = await admin
    .from("attempts")
    .insert({ test_id: testId, student_id: student.id, mode: "practice" })
    .select("id")
    .single();
  if (error || !attempt) throw new Error(error?.message ?? "Could not start attempt.");
  redirect(`/take/${attempt.id}`);
}
