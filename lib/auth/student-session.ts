import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const COOKIE = "lwm.student";
// 60 days — comparable to Supabase teacher session so students stay signed
// in across visits. Rotated on every successful sign-in.
const MAX_AGE = 60 * 60 * 24 * 60;

export async function setStudentSession(anonToken: string) {
  const store = await cookies();
  store.set(COOKIE, anonToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearStudentSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getCurrentStudent() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("students")
    .select("id, class_id, display_name, username, anon_token")
    .eq("anon_token", token)
    .maybeSingle();
  return data ?? null;
}
