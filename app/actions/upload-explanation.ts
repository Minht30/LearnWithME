"use server";

import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
  "application/pdf",
]);
const BUCKET = "student-work";

export type UploadResult =
  | { ok: true; url: string; path: string; mime: string }
  | { ok: false; error: string };

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  return map[mime] ?? "bin";
}

/**
 * Upload a photo/PDF of the student's paper work for a given attempt+question.
 * Stored at `student-work/<attemptId>/<questionId>.<ext>`. Overwrites on
 * repeated upload, so a student can retake the photo.
 */
export async function uploadExplanationFile(
  formData: FormData
): Promise<UploadResult> {
  const file = formData.get("file");
  const attemptId = String(formData.get("attemptId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };
  if (!attemptId || !questionId) return { ok: false, error: "Missing attempt or question id." };
  if (file.size > MAX_BYTES) return { ok: false, error: "File is too large (12 MB max)." };
  if (!ALLOWED.has(file.type)) {
    return { ok: false, error: "Please upload a photo (JPG/PNG/HEIC) or a PDF." };
  }

  const admin = createAdminClient();
  const ext = extFromMime(file.type);
  const path = `${attemptId}/${questionId}.${ext}`;

  const buffer = new Uint8Array(await file.arrayBuffer());

  // Upload with upsert=true so re-uploads replace the previous file.
  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (uploadErr) return { ok: false, error: uploadErr.message };

  // Persist reference on the answer row (create the row if missing).
  const { error: updateErr } = await admin.from("answers").upsert(
    {
      attempt_id: attemptId,
      question_id: questionId,
      explanation_file_path: path,
      explanation_mime: file.type,
      answered_at: new Date().toISOString(),
    },
    { onConflict: "attempt_id,question_id" }
  );
  if (updateErr) return { ok: false, error: updateErr.message };

  // Return a signed URL good for 24 hours so the client can preview immediately.
  const { data: signed } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24);
  if (!signed?.signedUrl) return { ok: false, error: "Could not sign preview URL." };

  return { ok: true, url: signed.signedUrl, path, mime: file.type };
}

/**
 * Server-side helper: given a stored path, mint a signed URL that lasts
 * `expiresInSec` seconds. Used by result page + email formatter.
 */
export async function signExplanationUrl(
  path: string,
  expiresInSec = 60 * 60 * 24 * 7 // 7 days
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, expiresInSec);
  return data?.signedUrl ?? null;
}
