"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacherId } from "@/lib/auth/session";

const AddStudent = z.object({
  classId: z.string().uuid(),
  displayName: z.string().min(1, "Name is required."),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(24)
    .regex(/^[a-z0-9._-]+$/i, "Letters, numbers, and . _ - only.")
    .transform((s) => s.toLowerCase()),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export type RosterResult = { ok: true } | { ok: false; error: string };

async function assertOwnsClass(classId: string) {
  const teacherId = await requireTeacherId();
  const admin = createAdminClient();
  const { data } = await admin
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (!data) throw new Error("Class not found.");
  return { teacherId, admin };
}

export async function addStudent(input: {
  classId: string;
  displayName: string;
  username: string;
  password: string;
}): Promise<RosterResult> {
  const parsed = AddStudent.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { classId, displayName, username, password } = parsed.data;

  const { admin } = await assertOwnsClass(classId);

  const hash = await bcrypt.hash(password, 10);
  const { error } = await admin.from("students").insert({
    class_id: classId,
    display_name: displayName,
    username,
    password_hash: hash,
    anon_token: crypto.randomUUID(),
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { ok: false, error: `That username is already taken in this class.` };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/dashboard/classes/${classId}`);
  return { ok: true };
}

export async function removeStudent(classId: string, studentId: string): Promise<RosterResult> {
  const { admin } = await assertOwnsClass(classId);
  const { error } = await admin
    .from("students")
    .delete()
    .eq("id", studentId)
    .eq("class_id", classId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/classes/${classId}`);
  return { ok: true };
}

export async function resetStudentPassword(
  classId: string,
  studentId: string,
  newPassword: string
): Promise<RosterResult> {
  if (newPassword.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  const { admin } = await assertOwnsClass(classId);
  const hash = await bcrypt.hash(newPassword, 10);
  const { error } = await admin
    .from("students")
    .update({ password_hash: hash })
    .eq("id", studentId)
    .eq("class_id", classId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
