"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const Credentials = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  full_name: z.string().optional(),
});

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string };

export async function signUpTeacher(formData: FormData): Promise<AuthResult> {
  const parsed = Credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { email, password, full_name } = parsed.data;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });
  if (error) return { ok: false, error: error.message };

  // Ensure mirror row in public.users right away (trigger may be missing)
  if (data.user) {
    const admin = createAdminClient();
    await admin.from("users").upsert(
      {
        id: data.user.id,
        email,
        full_name: full_name ?? "",
        role: "teacher",
      },
      { onConflict: "id" }
    );
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function signInTeacher(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, error: "Email and password are required." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function signOutTeacher() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
