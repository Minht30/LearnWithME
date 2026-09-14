"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Check, X as XIcon, ArrowLeft, FileText, Send, RotateCcw,
  MessageSquare, CheckCircle2, User,
} from "lucide-react";
import { saveQuestionFeedback, decideAttempt } from "@/app/actions/review-actions";
import type { DbAttempt, DbAnswer, DbQuestion, DbTest, DbStudent } from "@/lib/db/types";

type EnrichedAnswer = DbAnswer & { workUrl?: string };

export function ReviewClient({
  attempt, test, questions, answers, student,
}: {
  attempt: DbAttempt;
  test: DbTest;
  questions: DbQuestion[];
  answers: EnrichedAnswer[];
  student: DbStudent;
}) {
  const router = useRouter();
  const answerMap = new Map(answers.map((a) => [a.question_id, a]));
  const [feedback, setFeedback] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const a of answers) if (a.teacher_feedback) m[a.question_id] = a.teacher_feedback;
    return m;
  });
  const [note, setNote] = useState(attempt.teacher_note ?? "");
  const [pending, startTransition] = useTransition();
  const readOnly = attempt.status === "approved";

  const totalCorrect = answers.filter((a) => a.is_correct).length;
  const percent = questions.length ? Math.round((totalCorrect / questions.length) * 100) : 0;

  const saveRefs = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const scheduleFeedbackSave = useCallback((qid: string, val: string) => {
    if (saveRefs.current[qid]) clearTimeout(saveRefs.current[qid]!);
    saveRefs.current[qid] = setTimeout(() => {
      saveQuestionFeedback(attempt.id, qid, val);
    }, 500);
  }, [attempt.id]);

  function onFeedbackChange(qid: string, val: string) {
    setFeedback((prev) => ({ ...prev, [qid]: val }));
    scheduleFeedbackSave(qid, val);
  }

  function submitDecision(decision: "approved" | "needs_redo") {
    // flush pending feedback saves
    for (const qid of Object.keys(saveRefs.current)) {
      if (saveRefs.current[qid]) clearTimeout(saveRefs.current[qid]!);
      const val = feedback[qid] ?? "";
      saveQuestionFeedback(attempt.id, qid, val);
    }
    startTransition(async () => {
      const res = await decideAttempt(attempt.id, decision, note);
      if (res.ok) {
        toast.success(decision === "approved" ? "Approved. The student will see your feedback." : "Sent back for another try.");
        router.push("/dashboard/inbox");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard/inbox"
          className="inline-flex h-9 items-center gap-1 rounded-full border bg-background px-3 text-sm hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" /> Inbox
        </Link>
        <div className="flex-1" />
        <StatusRibbon status={attempt.status} />
      </div>

      <header className="mb-8">
        <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
          {test.subject} · Grade {test.grade}
        </div>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{test.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{student.display_name}</span>
            {student.username && (
              <span className="text-muted-foreground">@{student.username}</span>
            )}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs">
            {totalCorrect}/{questions.length} · {percent}%
          </span>
        </div>
      </header>

      <ol className="space-y-4" aria-label="Questions with student answers">
        {questions.map((q, i) => {
          const a = answerMap.get(q.id) ?? null;
          return (
            <li key={q.id}>
              <QuestionReviewCard
                index={i}
                q={q}
                a={a}
                feedback={feedback[q.id] ?? ""}
                onFeedbackChange={(v) => onFeedbackChange(q.id, v)}
                readOnly={readOnly}
              />
            </li>
          );
        })}
      </ol>

      <div className="mt-10 lwm-card p-6 sticky bottom-4">
        <label htmlFor="teacher-note" className="mb-2 block text-sm font-semibold">
          Overall note to the student <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="teacher-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="What went well? What should they focus on next time?"
          disabled={readOnly}
          className="rounded-2xl"
        />
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          {readOnly ? (
            <div className="text-sm text-muted-foreground">
              Already approved. Reset from your Tests page to edit.
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => submitDecision("needs_redo")}
                disabled={pending}
                className="rounded-full"
              >
                <RotateCcw className="mr-1.5 h-4 w-4" /> Ask to redo
              </Button>
              <Button
                variant="candy"
                onClick={() => submitDecision("approved")}
                disabled={pending}
                className="rounded-full h-11 px-6"
              >
                <Send className="mr-1.5 h-4 w-4" /> Approve &amp; send
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionReviewCard({
  index, q, a, feedback, onFeedbackChange, readOnly,
}: {
  index: number;
  q: DbQuestion;
  a: EnrichedAnswer | null;
  feedback: string;
  onFeedbackChange: (v: string) => void;
  readOnly: boolean;
}) {
  const correct = !!a?.is_correct;
  const response = String(a?.response ?? "").trim();
  const correctText = Array.isArray(q.correct) ? q.correct.join(", ") : String(q.correct);
  const isImage = a?.workUrl && a.explanation_mime?.startsWith("image/");
  const isPdf = a?.workUrl && a.explanation_mime === "application/pdf";
  const feedbackId = `fb-${q.id}`;

  return (
    <Card
      className={`lwm-card p-5 border-2 ${
        correct
          ? "border-[color-mix(in_oklab,var(--success)_40%,transparent)]"
          : "border-[color-mix(in_oklab,var(--warning)_40%,transparent)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
            correct ? "bg-[var(--success)]" : "bg-[var(--warning)]"
          }`}
          aria-hidden
        >
          {correct ? <Check className="h-4 w-4" strokeWidth={3} /> : <XIcon className="h-4 w-4" strokeWidth={3} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
            Question {index + 1} · {q.type.toUpperCase()}
          </p>
          <p className="mt-1 font-display text-lg font-semibold">{q.prompt}</p>

          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                Student answer
              </span>
              <div className="mt-0.5 rounded-lg border bg-background/60 px-2.5 py-1.5">
                {response || <span className="italic text-muted-foreground">(blank)</span>}
              </div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                Correct
              </span>
              <div className="mt-0.5 rounded-lg border-2 border-[color-mix(in_oklab,var(--success)_50%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)] px-2.5 py-1.5 font-semibold">
                {correctText}
              </div>
            </div>
          </div>

          {a?.workUrl && (
            <div className="mt-3">
              <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                Their work
              </span>
              {isImage ? (
                <a href={a.workUrl} target="_blank" rel="noreferrer" className="mt-1 block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.workUrl}
                    alt={`Student's work for question ${index + 1}`}
                    className="max-h-64 rounded-xl border bg-background object-contain"
                  />
                </a>
              ) : isPdf ? (
                <a
                  href={a.workUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm hover:border-foreground/40"
                >
                  <FileText className="h-4 w-4" /> Open PDF
                </a>
              ) : null}
            </div>
          )}

          <div className="mt-4">
            <label htmlFor={feedbackId} className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide font-semibold text-muted-foreground">
              <MessageSquare className="h-3 w-3" /> Your feedback
            </label>
            <Textarea
              id={feedbackId}
              rows={2}
              value={feedback}
              onChange={(e) => onFeedbackChange(e.target.value)}
              placeholder="Optional — a note on this question."
              disabled={readOnly}
              className="rounded-2xl"
              aria-describedby={`${feedbackId}-help`}
            />
            <p id={`${feedbackId}-help`} className="mt-1 text-xs text-muted-foreground">
              The student sees this on their result page.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatusRibbon({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--success)_20%,transparent)] px-3 py-1 text-sm font-semibold text-[color-mix(in_oklab,var(--success)_80%,black)] dark:text-[var(--success)]">
        <CheckCircle2 className="h-4 w-4" /> Approved
      </span>
    );
  }
  if (status === "needs_redo") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--warning)_25%,transparent)] px-3 py-1 text-sm font-semibold text-[color-mix(in_oklab,var(--warning)_80%,black)] dark:text-[var(--warning)]">
        <RotateCcw className="h-4 w-4" /> Sent back to redo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--brand)_18%,transparent)] px-3 py-1 text-sm font-semibold text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]">
      Waiting for your review
    </span>
  );
}
