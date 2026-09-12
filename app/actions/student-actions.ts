"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateJson } from "@/lib/ai/client";
import { GRADER_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { sendEmail } from "@/lib/email";
import { signExplanationUrl } from "@/app/actions/upload-explanation";
import { env } from "@/lib/env";
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
 * `explanation` is the student's "show your work" text — required on submit
 * but saved as it's typed so autosave can flush it.
 */
export async function saveAnswer(
  attemptId: string,
  questionId: string,
  response: string,
  note: string | null,
  explanation: string | null = null
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
        explanation,
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
    .select("id, question_id, response, explanation, note")
    .eq("attempt_id", attemptId);
  const answerMap = new Map<string, { id: string; response: string; explanation: string | null; note: string | null }>();
  for (const a of answers ?? [])
    answerMap.set(a.question_id, {
      id: a.id,
      response: (a.response as string) ?? "",
      explanation: (a.explanation as string | null) ?? null,
      note: (a.note as string | null) ?? null,
    });

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
        explanation: stored?.explanation ?? null,
        note: stored?.note ?? null,
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

  // Fire-and-forget email to the teacher who owns the test
  try {
    await emailResultsToTeacher(attemptId);
  } catch {
    /* email is best-effort, do not block redirect */
  }

  revalidatePath(`/result/${attemptId}`);
  redirect(`/result/${attemptId}`);
}

async function emailResultsToTeacher(attemptId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("attempts")
    .select("id, test_id, student_id, submitted_at, duration_used_sec")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return;

  const [{ data: test }, { data: student }, { data: questions }, { data: answers }] =
    await Promise.all([
      admin
        .from("tests")
        .select("id, title, subject, grade, teacher_id")
        .eq("id", attempt.test_id)
        .maybeSingle(),
      admin
        .from("students")
        .select("display_name, username")
        .eq("id", attempt.student_id)
        .maybeSingle(),
      admin
        .from("questions")
        .select("*")
        .eq("test_id", attempt.test_id)
        .order("position"),
      admin.from("answers").select("*").eq("attempt_id", attemptId),
    ]);
  if (!test || !student) return;

  const { data: teacherRow } = await admin
    .from("users")
    .select("email, full_name")
    .eq("id", test.teacher_id)
    .maybeSingle();
  if (!teacherRow?.email) return;

  type AnswerRow = {
    response: string;
    is_correct: boolean | null;
    score: number | null;
    feedback: string | null;
    workUrl: string | null;
    workMime: string | null;
  };
  const answerMap = new Map<string, AnswerRow>();
  for (const a of answers ?? []) {
    const workPath = (a as unknown as { explanation_file_path?: string | null }).explanation_file_path ?? null;
    const workMime = (a as unknown as { explanation_mime?: string | null }).explanation_mime ?? null;
    const workUrl = workPath
      ? await signExplanationUrl(workPath, 60 * 60 * 24 * 7) // 7-day URL for email
      : null;
    answerMap.set(a.question_id, {
      response: (a.response as string) ?? "",
      is_correct: a.is_correct,
      score: a.score,
      feedback: a.feedback,
      workUrl,
      workMime,
    });
  }

  const qs = (questions as DbQuestion[]) ?? [];
  const correctCount = qs.filter((q) => answerMap.get(q.id)?.is_correct).length;
  const total = qs.length;
  const percent = total ? Math.round((correctCount / total) * 100) : 0;
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const resultUrl = `${appUrl}/result/${attemptId}`;

  const html = renderResultsEmail({
    studentName: student.display_name,
    testTitle: test.title,
    subject: test.subject,
    grade: test.grade,
    correctCount,
    total,
    percent,
    resultUrl,
    questions: qs.map((q) => {
      const a = answerMap.get(q.id);
      return {
        prompt: q.prompt,
        correctAnswer: Array.isArray(q.correct) ? q.correct.join(", ") : String(q.correct),
        response: a?.response ?? "",
        workUrl: a?.workUrl ?? null,
        workMime: a?.workMime ?? null,
        isCorrect: !!a?.is_correct,
        feedback: a?.feedback ?? "",
      };
    }),
  });

  const res = await sendEmail({
    to: teacherRow.email,
    subject: `${student.display_name} finished "${test.title}" — ${percent}%`,
    html,
  });

  if (res.sent) {
    await admin
      .from("attempts")
      .update({ results_email_sent_at: new Date().toISOString() })
      .eq("id", attemptId);
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderResultsEmail(o: {
  studentName: string;
  testTitle: string;
  subject: string;
  grade: string;
  correctCount: number;
  total: number;
  percent: number;
  resultUrl: string;
  questions: {
    prompt: string;
    correctAnswer: string;
    response: string;
    workUrl: string | null;
    workMime: string | null;
    isCorrect: boolean;
    feedback: string;
  }[];
}): string {
  const rows = o.questions
    .map((q, i) => {
      const bg = q.isCorrect ? "#f0fdf4" : "#fef3c7";
      const border = q.isCorrect ? "#86efac" : "#fbbf24";
      const badge = q.isCorrect
        ? '<span style="background:#10b981;color:#fff;padding:2px 8px;border-radius:999px;font-size:11px;">Correct</span>'
        : '<span style="background:#f59e0b;color:#fff;padding:2px 8px;border-radius:999px;font-size:11px;">Missed</span>';
      const isImage = q.workUrl && q.workMime?.startsWith("image/");
      const isPdf = q.workUrl && q.workMime === "application/pdf";
      const workRow = q.workUrl
        ? `<tr><td style="color:#666;vertical-align:top;padding-top:8px;">Their work</td><td style="padding-top:8px;">
             ${isImage
               ? `<a href="${q.workUrl}" target="_blank"><img src="${q.workUrl}" alt="Student work" style="max-width:100%;max-height:280px;border:1px solid #ddd;border-radius:6px;background:#fff;" /></a>`
               : isPdf
               ? `<a href="${q.workUrl}" target="_blank" style="display:inline-block;background:#fff;border:1px solid #ddd;border-radius:6px;padding:8px 12px;text-decoration:none;color:#111;font-size:14px;">📄 Open PDF of their work</a>`
               : `<a href="${q.workUrl}" target="_blank" style="color:#b45309;">Open uploaded file</a>`}
             <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Link expires in 7 days.</div>
           </td></tr>`
        : `<tr><td style="color:#666;vertical-align:top;padding-top:6px;">Their work</td><td style="padding-top:6px;color:#94a3b8;font-style:italic;">(no upload)</td></tr>`;
      return `
      <div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:16px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="background:#fff;color:#111;padding:2px 8px;border-radius:999px;font-family:monospace;font-size:11px;">Q${i + 1}</span>
          ${badge}
        </div>
        <p style="margin:0 0 12px;font-weight:600;">${esc(q.prompt)}</p>
        <table cellpadding="4" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr>
            <td style="width:120px;color:#666;vertical-align:top;">Student answer</td>
            <td style="background:#fff;border:1px solid #ddd;border-radius:4px;padding:6px 10px;">${esc(q.response) || "<em>(no answer)</em>"}</td>
          </tr>
          ${workRow}
          ${!q.isCorrect ? `<tr><td style="color:#666;vertical-align:top;padding-top:6px;">Correct answer</td><td style="background:#dcfce7;border:1px solid #86efac;border-radius:4px;padding:6px 10px;">${esc(q.correctAnswer)}</td></tr>` : ""}
        </table>
      </div>`;
    })
    .join("");

  return `
  <!doctype html>
  <html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
      <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <div style="background:linear-gradient(135deg,#fef3c7,#fef9c3);padding:24px;">
          <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#92400e;">LearnWithMe · Attempt submitted</p>
          <h1 style="margin:8px 0 4px;font-size:24px;">${esc(o.studentName)} finished ${esc(o.testTitle)}</h1>
          <p style="margin:0;color:#666;font-size:14px;">${esc(o.subject)} · Grade ${esc(o.grade)}</p>
          <div style="margin-top:16px;display:inline-block;background:#fff;padding:12px 20px;border-radius:8px;">
            <span style="font-size:32px;font-weight:700;color:${o.percent >= 70 ? "#10b981" : o.percent >= 50 ? "#f59e0b" : "#f472b6"};">${o.percent}%</span>
            <span style="color:#666;font-size:14px;margin-left:8px;">(${o.correctCount} / ${o.total})</span>
          </div>
        </div>
        <div style="padding:24px;">
          <h2 style="margin:0 0 16px;font-size:16px;">Question by question</h2>
          ${rows}
          <p style="margin-top:24px;text-align:center;">
            <a href="${o.resultUrl}" style="background:#111;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px;">Open the full result page</a>
          </p>
        </div>
      </div>
      <p style="text-align:center;margin-top:16px;color:#94a3b8;font-size:11px;">You&#39;re receiving this because you own this test in LearnWithMe.</p>
    </div>
  </body></html>`;
}
