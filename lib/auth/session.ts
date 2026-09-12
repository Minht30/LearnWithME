import { redirect } from "next/navigation";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Return the currently signed-in teacher (Supabase Auth user) or null.
 */
export async function getCurrentTeacher() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Server-component / server-action helper: returns the teacher's id, or
 * redirects to /login if there is no session. Also ensures the mirror row in
 * public.users exists (safety net if the on_auth_user_created trigger was
 * removed).
 */
export async function requireTeacherId(): Promise<string> {
  const user = await getCurrentTeacher();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  await admin
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email!,
        full_name: (user.user_metadata as { full_name?: string } | null)?.full_name ?? "",
        role: "teacher",
      },
      { onConflict: "id" }
    );
  return user.id;
}

/**
 * Return { id, email, name } for the current teacher, or redirect.
 */
export async function requireTeacher(): Promise<{ id: string; email: string; name: string }> {
  const user = await getCurrentTeacher();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("id, email, full_name")
    .eq("id", user.id)
    .maybeSingle();
  const name =
    (profile?.full_name as string | null) ||
    (user.user_metadata as { full_name?: string } | null)?.full_name ||
    (user.email ?? "").split("@")[0];
  const email = profile?.email ?? user.email ?? "";
  return { id: user.id, email, name };
}
