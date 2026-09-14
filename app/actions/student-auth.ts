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

  // Touch last-seen; ignore failure.
  await admin.from("students").update({ last_seen_at: new Date().toISOString() }).eq("id", student.id);

  await setStudentSession(student.anon_token);
  return { ok: true };
}

/**
 * Student self-signup: class code + display name + username + password.
 * Creates a student row and drops a notification on the teacher's inbox.
 */
export async function signUpStudent(formData: FormData): Promise<StudentAuthResult> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!code || !displayName || !usernameRaw || !password) {
    return { ok: false, error: "Fill in every field." };
  }
  if (!/^[a-z0-9._-]{3,30}$/.test(usernameRaw)) {
    return { ok: false, error: "Username: 3–30 letters, numbers, dot, dash, underscore." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Password should be at least 6 characters." };
  }

  const admin = createAdminClient();
  const { data: cls } = await admin
    .from("classes")
    .select("id, teacher_id, name")
    .eq("join_code", code)
    .maybeSingle();
  if (!cls) return { ok: false, error: "That class code doesn't exist. Ask your teacher." };

  const { data: existing } = await admin
    .from("students")
    .select("id")
    .eq("class_id", cls.id)
    .eq("username", usernameRaw)
    .maybeSingle();
  if (existing) return { ok: false, error: "That username is already taken in this class." };

  const hash = await bcrypt.hash(password, 10);
  const anonToken = crypto.randomUUID().replace(/-/g, "");
  const { data: student, error } = await admin
    .from("students")
    .insert({
      class_id: cls.id,
      display_name: displayName,
      username: usernameRaw,
      password_hash: hash,
      password_plain: password,      // teacher-visible recovery copy
      self_signup: true,
      anon_token: anonToken,
      last_seen_at: new Date().toISOString(),
    })
    .select("id, anon_token, display_name")
    .single();
  if (error || !student) return { ok: false, error: error?.message ?? "Could not create account." };

  // Notify the teacher (best-effort; ignore failures)
  await admin.from("notifications").insert({
    teacher_id: cls.teacher_id,
    kind: "student_joined",
    payload: {
      student_id: student.id,
      display_name: student.display_name,
      class_id: cls.id,
      class_name: cls.name,
      username: usernameRaw,
    },
  });

  await setStudentSession(student.anon_token);
  return { ok: true };
}

export async function signOutStudent() {
  await clearStudentSession();
  redirect("/student/login");
}

/**
 * Start (or resume) an attempt on a given test as the current student.
 * If the attempt was marked needs_redo, it flips back to in_progress.
 */
export async function startAttemptForStudent(testId: string) {
  const { getCurrentStudent } = await import("@/lib/auth/student-session");
  const student = await getCurrentStudent();
  if (!student) redirect("/student/login");

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("attempts")
    .select("id, status")
    .eq("student_id", student.id)
    .eq("test_id", testId)
    .in("status", ["in_progress", "needs_redo"])
    .maybeSingle();
  if (existing) {
    if (existing.status === "needs_redo") {
      await admin
        .from("attempts")
        .update({
          status: "in_progress",
          submitted_at: null,
          reviewed_at: null,
          reviewed_by: null,
        })
        .eq("id", existing.id);
    }
    redirect(`/take/${existing.id}`);
  }

  const { data: attempt, error } = await admin
    .from("attempts")
    .insert({ test_id: testId, student_id: student.id, mode: "practice" })
    .select("id")
    .single();
  if (error || !attempt) throw new Error(error?.message ?? "Could not start attempt.");
  redirect(`/take/${attempt.id}`);
}
