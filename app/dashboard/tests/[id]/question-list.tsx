"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { deleteQuestion, updateQuestion } from "@/app/actions/test-actions";
import { toast } from "sonner";
import { Trash2, Check, X, Pencil } from "lucide-react";
import type { DbQuestion } from "@/lib/db/types";

export function QuestionList({
  questions,
  testId,
}: {
  questions: DbQuestion[];
  testId: string;
}) {
  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <QuestionRow key={q.id} q={q} index={i} testId={testId} />
      ))}
    </div>
  );
}

function QuestionRow({
  q,
  index,
  testId,
}: {
  q: DbQuestion;
  index: number;
  testId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(q.prompt);
  const [pending, startTransition] = useTransition();

  function onSave() {
    if (prompt === q.prompt) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const res = await updateQuestion(q.id, testId, { prompt });
      if (res.ok) {
        toast.success("Question updated.");
        setEditing(false);
      } else toast.error(res.error);
    });
  }

  function onDelete() {
    if (!confirm("Delete this question?")) return;
    startTransition(async () => {
      const res = await deleteQuestion(q.id, testId);
      if (res.ok) toast.success("Question deleted.");
      else toast.error(res.error);
    });
  }

  const correctText = Array.isArray(q.correct)
    ? q.correct.join(", ")
    : String(q.correct);

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono uppercase">
              {q.type}
            </span>
            <DifficultyPill d={q.difficulty} />
            {q.strand && <span className="text-muted-foreground">{q.strand}</span>}
          </div>

          {editing ? (
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              autoFocus
            />
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed">{q.prompt}</p>
          )}

          {q.type === "mcq" && q.choices && (
            <ul className="mt-3 space-y-1 text-sm">
              {q.choices.map((c, ci) => {
                const isCorrect = String(c) === String(q.correct);
                return (
                  <li
                    key={ci}
                    className={`rounded border px-3 py-1.5 ${
                      isCorrect
                        ? "border-emerald-400/50 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-transparent bg-muted/40"
                    }`}
                  >
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {String.fromCharCode(65 + ci)}.
                    </span>
                    {c}
                    {isCorrect && (
                      <Check className="ml-2 inline h-3.5 w-3.5 text-emerald-600" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {q.type !== "mcq" && (
            <p className="mt-3 rounded border border-emerald-400/40 bg-emerald-50 px-3 py-1.5 text-sm dark:bg-emerald-950/30">
              <span className="mr-2 font-mono text-xs uppercase text-emerald-700 dark:text-emerald-400">
                Answer
              </span>
              {correctText}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {editing ? (
            <>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={onSave}
                disabled={pending}
                aria-label="Save"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  setPrompt(q.prompt);
                  setEditing(false);
                }}
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setEditing(true)}
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={onDelete}
                disabled={pending}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function DifficultyPill({ d }: { d: "easy" | "medium" | "hard" }) {
  const c =
    d === "easy"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : d === "hard"
      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return (
    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${c}`}>
      {d}
    </span>
  );
}
