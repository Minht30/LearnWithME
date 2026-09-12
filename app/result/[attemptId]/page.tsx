import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
import type { DbAttempt, DbAnswer, DbQuestion, DbTest, DbStudent } from "@/lib/db/types";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Sparkles } from "lucide-react";

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

  return {
    attempt: attempt as DbAttempt,
    test: test as DbTest,
    questions: questions as DbQuestion[],
    answers: (answers ?? []) as DbAnswer[],
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
  const correctCount = questions.filter(
    (q) => answerMap.get(q.id)?.is_correct
  ).length;

  const message =
    percent >= 90
      ? "Wow — great job! Look at those results."
      : percent >= 70
      ? "Nice work! You've got most of it."
      : percent >= 50
      ? "You're getting there. Let's review the tricky ones."
      : "Every practice makes you stronger. Let's look at what to try again.";

  return (
    <div className="min-h-screen bg-amber-50/40 dark:bg-neutral-950">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5" /> All done!
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {student?.display_name ?? "Friend"}, here&apos;s how you did
          </h1>
          <p className="mt-2 text-muted-foreground">{message}</p>
        </header>

        <ScoreCircle percent={percent} correct={correctCount} total={gradedTotal} />

        <div className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold">Question by question</h2>
          {questions.map((q, i) => {
            const a = answerMap.get(q.id);
            return (
              <ReviewCard key={q.id} index={i} q={q} a={a ?? null} />
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            Done
          </Link>
        </div>
      </main>
    </div>
  );
}

function ScoreCircle({
  percent,
  correct,
  total,
}: {
  percent: number;
  correct: number;
  total: number;
}) {
  const r = 68;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - percent / 100);
  const stroke =
    percent >= 70 ? "#10b981" : percent >= 50 ? "#f59e0b" : "#f472b6";
  return (
    <Card className="mx-auto flex max-w-md items-center justify-center gap-6 p-6">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 80 80)"
        />
        <text
          x="80"
          y="80"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="34"
          fontWeight="600"
          fill="currentColor"
        >
          {percent}%
        </text>
      </svg>
      <div>
        <div className="font-mono text-3xl font-semibold">
          {correct} <span className="text-muted-foreground text-lg">/ {total}</span>
        </div>
        <div className="text-sm text-muted-foreground">questions correct</div>
      </div>
    </Card>
  );
}

function ReviewCard({
  index,
  q,
  a,
}: {
  index: number;
  q: DbQuestion;
  a: DbAnswer | null;
}) {
  const correct = !!a?.is_correct;
  const response = (a?.response as string) ?? "";
  const correctText = Array.isArray(q.correct) ? q.correct.join(", ") : String(q.correct);

  return (
    <Card
      className={`p-5 ${
        correct
          ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20"
          : "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs ${
            correct
              ? "bg-emerald-500 text-white"
              : "bg-amber-400 text-amber-950"
          }`}
        >
          {correct ? <Check className="h-3.5 w-3.5" /> : index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{q.prompt}</p>
          <div className="mt-3 grid gap-2 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Your answer</span>
              <div className="mt-0.5 rounded border bg-background/60 px-2.5 py-1">
                {response.trim() || <span className="italic text-muted-foreground">(no answer)</span>}
              </div>
            </div>
            {a?.explanation && (
              <div>
                <span className="text-xs text-muted-foreground">Your thinking</span>
                <div className="mt-0.5 rounded border bg-background/60 px-2.5 py-1 whitespace-pre-wrap">
                  {a.explanation}
                </div>
              </div>
            )}
            {!correct && (
              <div>
                <span className="text-xs text-muted-foreground">Correct answer</span>
                <div className="mt-0.5 rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1 dark:bg-emerald-950/40">
                  {correctText}
                </div>
              </div>
            )}
            {a?.feedback && (
              <p className="text-sm text-muted-foreground italic">{a.feedback}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
