"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateJson } from "@/lib/ai/client";
import { GRADER_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import type { DbQuestion } from "@/lib/db/types";

/**
 * Look up a class by join code. Returns null if not found.
 */
export async function findClassByCode(code: string) {
  const admin = createAdminClient();
  const cleaned = code.trim().toUpperCase();
  if (cleaned.length !== 6) return null;
  const { data } = await admin
    .from("classes")
    .select("id, name, grade")
    .eq("join_code", cleaned)
    .maybeSingle();
  return data;
}

/**
 * Create a student session and a fresh attempt on the class's active test.
 * Redirects to /take/[attemptId].
 */
export async function joinAndStart(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const displayName = String(formData.get("name") ?? "").trim();
  if (!code || !displayName) throw new Error("Missing code or name.");

  const admin = createAdminClient();
  const { data: cls } = await admin
    .from("classes")
    .select("id, grade")
    .eq("join_code", code)
    .maybeSingle();
  if (!cls) throw new Error("Class not found — check the code.");

  const { data: ct } = await admin
    .from("class_tests")
    .select("test_id")
    .eq("class_id", cls.id)
    .maybeSingle();
  if (!ct) throw new Error("No test attached to this class yet.");

  const { data: student, error: sErr } = await admin
    .from("students")
    .insert({
      class_id: cls.id,
      display_name: displayName,
      anon_token: crypto.randomUUID(),
    })
    .select("id")
    .single();
  if (sErr || !student) throw new Error(sErr?.message ?? "Could not create student.");

  const { data: attempt, error: aErr } = await admin
    .from("attempts")
    .insert({
      test_id: ct.test_id,
      student_id: student.id,
      mode: "practice",
    })
    .select("id")
    .single();
  if (aErr || !attempt) throw new Error(aErr?.message ?? "Could not start attempt.");

  redirect(`/take/${attempt.id}`);
}

/**
 * Save (or update) an answer for a single question.
 */
export async function saveAnswer(
  attemptId: string,
  questionId: string,
  response: string,
  note: string | null
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("answers")
    .upsert(
      {
        attempt_id: attemptId,
        question_id: questionId,
        response,
        note,
        answered_at: new Date().toISOString(),
      },
      { onConflict: "attempt_id,question_id" }
    );
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/**
 * Grade a single response. Returns is_correct, score, feedback.
 */
async function gradeOne(
  q: DbQuestion,
  response: string
): Promise<{ is_correct: boolean; score: number; feedback: string }> {
  const trimmed = (response ?? "").trim();

  if (q.type === "mcq") {
    const correct = String(q.correct).trim();
    const ok = trimmed.toLowerCase() === correct.toLowerCase();
    return {
      is_correct: ok,
      score: ok ? 1 : 0,
      feedback: ok ? "Correct" : `Correct answer: ${correct}`,
    };
  }

  if (q.type === "numeric") {
    const a = parseFloat(trimmed);
    const b = parseFloat(String(q.correct));
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return { is_correct: false, score: 0, feedback: `Correct answer: ${q.correct}` };
    }
    const ok = Math.abs(a - b) < 1e-6;
    return {
      is_correct: ok,
      score: ok ? 1 : 0,
      feedback: ok ? "Correct" : `Correct answer: ${q.correct}`,
    };
  }

  // short / long — use the small model to judge against rubric/expected answer
  if (!trimmed) {
    return { is_correct: false, score: 0, feedback: "No answer given." };
  }
  try {
    const judged = await generateJson<{
      score: number;
      feedback: string;
      is_correct: boolean;
    }>(
      [
        { role: "system", content: GRADER_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            question: q.prompt,
            expected: q.correct,
            rubric: q.rubric ?? null,
            student_answer: trimmed,
          }),
        },
      ],
      { size: "small", temperature: 0.2, maxTokens: 400 }
    );
    return {
      is_correct: !!judged.is_correct,
      score: Math.max(0, Math.min(1, Number(judged.score) || 0)),
      feedback: String(judged.feedback ?? ""),
    };
  } catch {
    return {
      is_correct: false,
      score: 0,
      feedback: `Reference answer: ${Array.isArray(q.correct) ? q.correct.join(", ") : q.correct}`,
    };
  }
}

/**
 * Submit an attempt — grade every answer, mark submitted_at, redirect to result.
 */
export async function submitAttempt(attemptId: string) {
  const admin = createAdminClient();

  const { data: attempt } = await admin
    .from("attempts")
    .select("id, test_id, started_at")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) throw new Error("Attempt not found.");

  const { data: questions } = await admin
    .from("questions")
    .select("*")
    .eq("test_id", attempt.test_id)
    .order("position");
  if (!questions) throw new Error("No questions on this test.");

  const { data: answers } = await admin
    .from("answers")
    .select("id, question_id, response")
    .eq("attempt_id", attemptId);
  const answerMap = new Map<string, { id: string; response: string }>();
  for (const a of answers ?? [])
    answerMap.set(a.question_id, { id: a.id, response: (a.response as string) ?? "" });

  // Grade sequentially — for MVP scale (a class of 30 with 20q each) parallelism
  // is not worth the free-tier rate-limit risk.
  const updates = await Promise.all(
    (questions as DbQuestion[]).map(async (q) => {
      const stored = answerMap.get(q.id);
      const grade = await gradeOne(q, stored?.response ?? "");
      return {
        attempt_id: attemptId,
        question_id: q.id,
        response: stored?.response ?? "",
        is_correct: grade.is_correct,
        score: grade.score,
        feedback: grade.feedback,
        answered_at: new Date().toISOString(),
      };
    })
  );

  await admin
    .from("answers")
    .upsert(updates, { onConflict: "attempt_id,question_id" });

  const startedMs = new Date(attempt.started_at).getTime();
  const duration = Math.max(1, Math.round((Date.now() - startedMs) / 1000));

  await admin
    .from("attempts")
    .update({
      submitted_at: new Date().toISOString(),
      duration_used_sec: duration,
    })
    .eq("id", attemptId);

  revalidatePath(`/result/${attemptId}`);
  redirect(`/result/${attemptId}`);
}
