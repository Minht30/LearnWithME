import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { signExplanationUrl } from "@/app/actions/upload-explanation";

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

  const answerMap = new Map(answers.map((a) => [a.question_id, a]));
  const gradedTotal = questions.length;
  const scoreSum = questions.reduce(
    (acc, q) => acc + Number(answerMap.get(q.id)?.score ?? 0),
    0
  );
  const percent = Math.round((scoreSum / gradedTotal) * 100);
  const correctCount = questions.filter((q) => answerMap.get(q.id)?.is_correct).length;

  return (
    <ResultView
      questions={questions}
      answers={answers}
      student={student}
      percent={percent}
      correctCount={correctCount}
    />
  );
}
