import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Server-only Supabase client using the service_role key.
 * The service_role JWT is a Postgres superuser — it bypasses RLS entirely.
 * NEVER import from a client component.
 */
export function createAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const DEMO_EMAIL = "demo@learnwithme.local";

let cachedDemoTeacherId: string | null = null;

/**
 * Get (or lazily create) the single demo teacher this app uses while real auth
 * is skipped. Creates the auth user, which triggers the public.users insert.
 * Cached in memory for the lifetime of the server process.
 */
export async function getDemoTeacherId(): Promise<string> {
  if (cachedDemoTeacherId) return cachedDemoTeacherId;
  const admin = createAdminClient();

  const { data: existing, error: readErr } = await admin
    .from("users")
    .select("id")
    .eq("email", DEMO_EMAIL)
    .maybeSingle();
  if (readErr) throw readErr;
  if (existing) {
    cachedDemoTeacherId = existing.id;
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: "Demo Teacher" },
  });
  if (error) throw error;
  const id = data.user.id;

  // The on_auth_user_created trigger should have inserted public.users.
  // As a safety net, upsert in case the trigger was removed.
  await admin
    .from("users")
    .upsert({ id, email: DEMO_EMAIL, full_name: "Demo Teacher", role: "teacher" });

  cachedDemoTeacherId = id;
  return id;
}
