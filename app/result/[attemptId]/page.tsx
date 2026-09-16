import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { signExplanationUrl } from "@/app/actions/upload-explanation";
import { getCurrentStudent } from "@/lib/auth/student-session";

export const dynamic = "force-dynamic";
import type { DbAttempt, DbAnswer, DbQuestion, DbTest, DbStudent } from "@/lib/db/types";
import { ResultView } from "./result-view";

type EnrichedAnswer = DbAnswer & { workUrl?: string };

async function loadResult(attemptId: string) {
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return null;

  const [{ data: test }, { data: questions }, { data: answers }, { data: student }] = await Promise.all([
    admin.from("tests").select("*").eq("id", attempt.test_id).maybeSingle(),
    admin.from("questions").select("*").eq("test_id", attempt.test_id).order("position"),
    admin.from("answers").select("*").eq("attempt_id", attemptId),
    admin.from("students").select("*").eq("id", attempt.student_id).maybeSingle(),
  ]);
  if (!test || !questions) return null;

  const enriched: EnrichedAnswer[] = await Promise.all(
    ((answers ?? []) as DbAnswer[]).map(async (a) => {
      const path = (a as unknown as { explanation_file_path?: string | null }).explanation_file_path;
      if (path) {
        const url = await signExplanationUrl(path, 60 * 60 * 24);
        return { ...a, workUrl: url ?? undefined };
      }
      return a as EnrichedAnswer;
    })
  );

  return {
    attempt: attempt as DbAttempt,
    test: test as DbTest,
    questions: questions as DbQuestion[],
    answers: enriched,
    student: (student ?? null) as DbStudent | null,
  };
}

export default async function ResultPage({ params }: PageProps<"/result/[attemptId]">) {
  const { attemptId } = await params;
  const data = await loadResult(attemptId);
  if (!data) return notFound();
  const { questions, answers, student } = data;

  // Mark teacher feedback as read the first time the student opens the page.
  // Silent + best-effort — teachers viewing this same page don't flip the flag
  // because they aren't the signed-in student.
  if (data.attempt.reviewed_at && !data.attempt.feedback_read_at) {
    const viewer = await getCurrentStudent();
    if (viewer?.id === data.attempt.student_id) {
      const admin = createAdminClient();
      await admin
        .from("attempts")
        .update({ feedback_read_at: new Date().toISOString() })
        .eq("id", attemptId);
      data.attempt.feedback_read_at = new Date().toISOString();
    }
  }

  const answerMap = new Map(answers.map((a) => [a.question_id, a]));
  // Passages don't count towards the score.
  const graded = questions.filter((q) => q.type !== "passage");
  const gradedTotal = graded.length || 1;
  const scoreSum = graded.reduce(
    (acc, q) => acc + Number(answerMap.get(q.id)?.score ?? 0),
    0
  );
  const percent = Math.round((scoreSum / gradedTotal) * 100);
  const correctCount = graded.filter((q) => answerMap.get(q.id)?.is_correct).length;

  return (
    <ResultView
      attempt={data.attempt}
      questions={questions}
      answers={answers}
      student={student}
      percent={percent}
      correctCount={correctCount}
    />
  );
}
