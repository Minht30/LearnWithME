"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacherId } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

const BUCKET = "question-media";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export type UploadImageResult =
  | { ok: true; url: string; path: string }
  | { ok: false; error: string };

/**
 * Upload an image for a specific test's question set. Stored at
 * `question-media/<testId>/<questionId>-<ts>.<ext>` and returned as a
 * 30-day signed URL for immediate preview.
 */
export async function uploadQuestionImage(formData: FormData): Promise<UploadImageResult> {
  const teacherId = await requireTeacherId();
  const file = formData.get("file");
  const testId = String(formData.get("testId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };
  if (!testId || !questionId) return { ok: false, error: "Missing test or question id." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Image too large (8 MB max)." };
  if (!ALLOWED.has(file.type)) return { ok: false, error: "PNG, JPG, GIF, WebP, or SVG only." };

  const admin = createAdminClient();
  // Assert teacher owns the test
  const { data: t } = await admin
    .from("tests").select("id").eq("id", testId).eq("teacher_id", teacherId).maybeSingle();
  if (!t) return { ok: false, error: "You don't own that test." };

  const ext = EXT[file.type] ?? "bin";
  const path = `${testId}/${questionId}-${Date.now()}.${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (upErr) return { ok: false, error: upErr.message };

  const { error: qErr } = await admin
    .from("questions")
    .update({ image_path: path })
    .eq("id", questionId);
  if (qErr) return { ok: false, error: qErr.message };

  const { data: signed } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 30);
  if (!signed?.signedUrl) return { ok: false, error: "Could not mint preview URL." };

  revalidatePath(`/dashboard/tests/${testId}`);
  return { ok: true, url: signed.signedUrl, path };
}

/**
 * Upload an image before the question row exists (manual builder flow).
 * Stored under `question-media/drafts/<teacherId>/<uuid>.<ext>`. Not
 * associated with any question yet; the path is returned so the client
 * can send it along when createManualTest inserts the question.
 */
export async function uploadDraftImage(formData: FormData): Promise<UploadImageResult> {
  const teacherId = await requireTeacherId();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Image too large (8 MB max)." };
  if (!ALLOWED.has(file.type)) return { ok: false, error: "PNG, JPG, GIF, WebP, or SVG only." };

  const admin = createAdminClient();
  const ext = EXT[file.type] ?? "bin";
  const path = `drafts/${teacherId}/${crypto.randomUUID()}.${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (upErr) return { ok: false, error: upErr.message };

  const { data: signed } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 30);
  if (!signed?.signedUrl) return { ok: false, error: "Could not mint preview URL." };
  return { ok: true, url: signed.signedUrl, path };
}

export async function removeQuestionImage(
  testId: string,
  questionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireTeacherId();
  const admin = createAdminClient();
  const { data: q } = await admin.from("questions").select("image_path").eq("id", questionId).maybeSingle();
  if (!q?.image_path) return { ok: true };
  await admin.storage.from(BUCKET).remove([q.image_path]);
  const { error } = await admin.from("questions").update({ image_path: null }).eq("id", questionId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/tests/${testId}`);
  return { ok: true };
}

/** Server-side helper to sign a URL for viewing. Used at page-load time. */
export async function signQuestionImage(path: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}
