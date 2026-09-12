"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Save, Trash2, Sparkles, Loader2, ArrowLeft, Upload, FileText } from "lucide-react";
import { createManualTest } from "@/app/actions/create-manual-test";
import { parseTestFromDoc } from "@/app/actions/parse-test-doc";
import type { QuestionType, Difficulty, Question } from "@/lib/schemas/question";

const SUBJECTS = ["Math","English","French","Science","Physics","Chemistry","Biology","History","Geography","Social Studies","Other"];
const GRADES = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const TYPES: { value: QuestionType; label: string }[] = [
  { value: "mcq", label: "Multiple choice" },
  { value: "short", label: "Short answer" },
  { value: "numeric", label: "Numeric" },
  { value: "long", label: "Long answer" },
];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

type Draft = {
  type: QuestionType;
  prompt: string;
  choices: string[];
  correct: string;
  rubric: string;
  difficulty: Difficulty;
};

function newDraft(type: QuestionType = "mcq"): Draft {
  return {
    type,
    prompt: "",
    choices: type === "mcq" ? ["", "", "", ""] : [],
    correct: "",
    rubric: "",
    difficulty: "medium",
  };
}

function questionToDraft(q: Question): Draft {
  const correct = Array.isArray(q.correct) ? q.correct.join(", ") : String(q.correct);
  return {
    type: q.type,
    prompt: q.prompt,
    choices: q.type === "mcq" ? (q.choices?.length ? [...q.choices, "", "", "", ""].slice(0, Math.max(4, q.choices.length)) : ["", "", "", ""]) : [],
    correct,
    rubric: q.rubric ?? "",
    difficulty: q.difficulty,
  };
}

export default function ManualBuilderPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Math");
  const [grade, setGrade] = useState("4");
  const [duration, setDuration] = useState(30);
  const [questions, setQuestions] = useState<Draft[]>([newDraft("mcq")]);

  function patchQ(idx: number, patch: Partial<Draft>) {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }
  function patchChoice(idx: number, choiceIdx: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== idx) return q;
        const choices = [...q.choices];
        choices[choiceIdx] = value;
        return { ...q, choices };
      })
    );
  }
  function addQ() {
    setQuestions((prev) => [...prev, newDraft("mcq")]);
  }
  function removeQ(idx: number) {
    if (questions.length === 1) {
      toast.error("A test needs at least one question.");
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }
  function changeType(idx: number, nextType: QuestionType) {
    const cur = questions[idx];
    patchQ(idx, {
      type: nextType,
      choices: nextType === "mcq" ? (cur.choices.length ? cur.choices : ["", "", "", ""]) : [],
      correct: nextType === "mcq" ? "" : cur.correct,
    });
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await parseTestFromDoc(fd);
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const drafts = res.parsed.questions.map(questionToDraft);
    // Replace an initial empty draft; otherwise append.
    setQuestions((prev) => {
      const isPrevEmpty =
        prev.length === 1 && !prev[0].prompt.trim() && !prev[0].correct.trim();
      return isPrevEmpty ? drafts : [...prev, ...drafts];
    });
    if (!title.trim() && res.parsed.title) setTitle(res.parsed.title);
    if (res.parsed.subject && SUBJECTS.includes(res.parsed.subject)) setSubject(res.parsed.subject);
    if (res.parsed.grade && GRADES.includes(res.parsed.grade)) setGrade(res.parsed.grade);
    toast.success(
      `Imported ${drafts.length} question${drafts.length === 1 ? "" : "s"} from ${res.filename}. Review and edit any that need it.`
    );
  }

  function validate(): string | null {
    if (!title.trim()) return "Give your test a title.";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const label = `Question ${i + 1}`;
      if (!q.prompt.trim()) return `${label}: write the question.`;
      if (q.type === "mcq") {
        const filled = q.choices.filter((c) => c.trim());
        if (filled.length < 2) return `${label}: MCQ needs at least 2 choices.`;
        if (!q.correct.trim()) return `${label}: pick which choice is correct.`;
        if (!q.choices.includes(q.correct)) return `${label}: correct answer must be one of the choices.`;
      } else if (!q.correct.trim() && q.type !== "long") {
        return `${label}: fill in the correct answer.`;
      }
      if (q.type === "long" && !q.rubric.trim() && !q.correct.trim()) {
        return `${label}: for long answers, add a rubric or expected answer for grading.`;
      }
    }
    return null;
  }

  function onSave() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    startTransition(async () => {
      const res = await createManualTest({
        title: title.trim(),
        subject,
        grade,
        duration_min: duration,
        questions: questions.map((q) => ({
          type: q.type,
          prompt: q.prompt.trim(),
          choices: q.type === "mcq" ? q.choices.filter((c) => c.trim()) : undefined,
          correct: q.type === "numeric" ? Number(q.correct) : q.correct.trim(),
          rubric: q.rubric.trim() || undefined,
          difficulty: q.difficulty,
        })),
      });
      if (res.ok) {
        toast.success("Test saved.");
        router.push(`/dashboard/tests/${res.testId}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to tests
        </Link>
      </div>

      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Build a test manually</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Type each question yourself — no AI. Students take it the same way as a generated test.
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:border-foreground/40 hover:text-foreground"
        >
          <Sparkles className="h-3.5 w-3.5" /> Or generate with AI
        </Link>
      </header>

      <Card className="p-6 space-y-6">
        <div>
          <Label htmlFor="title" className="mb-1.5 block">Test title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Multiplication Warm-up · Week 3"
            className="h-11 text-base"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="mb-1.5 block">Subject</Label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label className="mb-1.5 block">Grade</Label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
          <div>
            <Label className="mb-1.5 block">Duration (min)</Label>
            <Input
              type="number"
              min={5}
              max={240}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 30)}
            />
          </div>
        </div>
      </Card>

      {/* Import callout */}
      <Card className="mt-6 border-dashed p-5">
        <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">Have a test already?</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Upload a PDF, DOCX, or TXT and AI will pull out every question into editable form. You review, tweak, and save.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={onImport}
            className="hidden"
            id="import-test-doc"
          />
          <label
            htmlFor="import-test-doc"
            className={`inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer hover:border-foreground/40 ${
              importing ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Parsing…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Import file
              </>
            )}
          </label>
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Questions <span className="text-muted-foreground font-normal">({questions.length})</span></h2>
        <Button variant="outline" size="sm" onClick={addQ}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add question
        </Button>
      </div>

      <div className="mt-3 space-y-4">
        {questions.map((q, i) => (
          <Card key={i} className="p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted font-mono text-xs">
                  {i + 1}
                </span>
                <select
                  value={q.type}
                  onChange={(e) => changeType(i, e.target.value as QuestionType)}
                  className="h-7 rounded-md border border-input bg-transparent px-2 text-xs"
                >
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select
                  value={q.difficulty}
                  onChange={(e) => patchQ(i, { difficulty: e.target.value as Difficulty })}
                  className="h-7 rounded-md border border-input bg-transparent px-2 text-xs"
                >
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeQ(i)}
                aria-label="Remove question"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <Label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
              Question
            </Label>
            <Textarea
              rows={2}
              value={q.prompt}
              onChange={(e) => patchQ(i, { prompt: e.target.value })}
              placeholder="What are you asking?"
              className="mb-4"
            />

            {q.type === "mcq" && (
              <>
                <Label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                  Choices (click the radio next to the correct one)
                </Label>
                <div className="space-y-2">
                  {q.choices.map((c, ci) => (
                    <div key={ci} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => patchQ(i, { correct: c })}
                        aria-label={`Mark choice ${ci + 1} correct`}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          q.correct && q.correct === c && c.trim()
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-input hover:border-foreground/40"
                        }`}
                      >
                        {q.correct && q.correct === c && c.trim() && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </button>
                      <span className="w-4 font-mono text-xs text-muted-foreground">
                        {String.fromCharCode(65 + ci)}.
                      </span>
                      <Input
                        value={c}
                        onChange={(e) => {
                          const oldVal = c;
                          patchChoice(i, ci, e.target.value);
                          // if the changed choice was the correct one, follow the edit
                          if (q.correct === oldVal) patchQ(i, { correct: e.target.value });
                        }}
                        placeholder={`Choice ${String.fromCharCode(65 + ci)}`}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {(q.type === "short" || q.type === "numeric") && (
              <>
                <Label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                  Correct answer
                </Label>
                <Input
                  type={q.type === "numeric" ? "number" : "text"}
                  value={q.correct}
                  onChange={(e) => patchQ(i, { correct: e.target.value })}
                  placeholder={q.type === "numeric" ? "e.g. 42" : "e.g. Ottawa"}
                />
              </>
            )}

            {q.type === "long" && (
              <>
                <Label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
                  Expected answer or rubric (used to grade student responses)
                </Label>
                <Textarea
                  rows={3}
                  value={q.rubric}
                  onChange={(e) => patchQ(i, { rubric: e.target.value })}
                  placeholder="Describe what a good answer includes — key points, minimum length, etc."
                />
              </>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={addQ}>
          <Plus className="mr-1 h-4 w-4" /> Add another
        </Button>
        <Button onClick={onSave} disabled={pending} size="lg">
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save test
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
