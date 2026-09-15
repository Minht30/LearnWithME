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
import {
  Plus, Save, Trash2, Sparkles, Loader2, ArrowLeft, Upload, FileText,
  Check, X as XIcon, ImagePlus,
} from "lucide-react";
import { createManualTest } from "@/app/actions/create-manual-test";
import { parseTestFromDoc } from "@/app/actions/parse-test-doc";
import type { QuestionType, Difficulty, Question } from "@/lib/schemas/question";

const SUBJECTS = ["Math","English","French","Science","Physics","Chemistry","Biology","History","Geography","Social Studies","Other"];
const GRADES = ["1","2","3","4","5","6","7","8","9","10","11","12"];

const TYPES: { value: QuestionType; label: string; hint: string }[] = [
  { value: "mcq",          label: "Multiple choice",       hint: "One correct choice." },
  { value: "multi_select", label: "Check all that apply",  hint: "Two or more correct choices." },
  { value: "true_false",   label: "True / False",          hint: "Quick binary check." },
  { value: "numeric",      label: "Number",                hint: "Exact numeric answer." },
  { value: "cloze",        label: "Fill in the blanks",    hint: "Use [BLANK] where the student types." },
  { value: "short",        label: "Short answer",          hint: "Single line of text." },
  { value: "long",         label: "Written response",      hint: "Paragraph, teacher-graded." },
];

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

type Draft = {
  type: QuestionType;
  prompt: string;
  choices: string[];
  correct: string | string[];   // string for mcq/tf/numeric/short/long; string[] for multi_select / cloze
  rubric: string;
  difficulty: Difficulty;
  points: number;
};

function newDraft(type: QuestionType = "mcq"): Draft {
  const seed: Draft = {
    type,
    prompt: "",
    choices: [],
    correct: "",
    rubric: "",
    difficulty: "medium",
    points: 1,
  };
  if (type === "mcq")          { seed.choices = ["", "", "", ""]; seed.correct = ""; seed.prompt = ""; }
  if (type === "multi_select") { seed.choices = ["", "", "", ""]; seed.correct = []; }
  if (type === "true_false")   { seed.correct = "true"; }
  if (type === "cloze")        { seed.prompt = "The capital of France is [BLANK]."; seed.correct = [""]; }
  return seed;
}

function questionToDraft(q: Question): Draft {
  const correct: string | string[] = Array.isArray(q.correct)
    ? q.correct.map(String)
    : String(q.correct);
  return {
    type: q.type,
    prompt: q.prompt,
    choices: q.choices ?? (q.type === "mcq" ? ["", "", "", ""] : []),
    correct,
    rubric: q.rubric ?? "",
    difficulty: q.difficulty,
    points: q.points ?? 1,
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
        const oldVal = choices[choiceIdx];
        choices[choiceIdx] = value;
        // Keep the correct answer in sync when its label is edited
        let correct = q.correct;
        if (q.type === "mcq" && correct === oldVal) correct = value;
        if (q.type === "multi_select" && Array.isArray(correct)) {
          correct = correct.map((c) => (c === oldVal ? value : c));
        }
        return { ...q, choices, correct };
      })
    );
  }
  function addQ(type: QuestionType = "mcq") {
    setQuestions((prev) => [...prev, newDraft(type)]);
  }
  function removeQ(idx: number) {
    if (questions.length === 1) {
      toast.error("A test needs at least one question.");
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }
  function changeType(idx: number, nextType: QuestionType) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== idx) return q;
      const fresh = newDraft(nextType);
      // Keep prompt/difficulty/points across type change
      return {
        ...fresh,
        prompt: q.prompt || fresh.prompt,
        difficulty: q.difficulty,
        points: q.points,
      };
    }));
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
    setQuestions((prev) => {
      const isPrevEmpty =
        prev.length === 1 &&
        !prev[0].prompt.trim() &&
        (typeof prev[0].correct === "string" ? !prev[0].correct.trim() : !prev[0].correct.length);
      return isPrevEmpty ? drafts : [...prev, ...drafts];
    });
    if (!title.trim() && res.parsed.title) setTitle(res.parsed.title);
    if (res.parsed.subject && SUBJECTS.includes(res.parsed.subject)) setSubject(res.parsed.subject);
    if (res.parsed.grade && GRADES.includes(res.parsed.grade)) setGrade(res.parsed.grade);
    toast.success(
      `Imported ${drafts.length} question${drafts.length === 1 ? "" : "s"} from ${res.filename}.`
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
        if (filled.length < 2) return `${label}: multiple choice needs at least 2 choices.`;
        const correct = String(q.correct);
        if (!correct.trim()) return `${label}: pick which choice is correct.`;
        if (!q.choices.includes(correct)) return `${label}: correct answer must be one of the choices.`;
      } else if (q.type === "multi_select") {
        const filled = q.choices.filter((c) => c.trim());
        if (filled.length < 2) return `${label}: multi-select needs at least 2 choices.`;
        const arr = Array.isArray(q.correct) ? q.correct : [];
        if (arr.length === 0) return `${label}: mark at least one correct choice.`;
      } else if (q.type === "cloze") {
        if (!q.prompt.includes("[BLANK]")) return `${label}: cloze prompt needs at least one [BLANK].`;
        const blanks = q.prompt.match(/\[BLANK\]/g)?.length ?? 0;
        const arr = Array.isArray(q.correct) ? q.correct : [];
        if (arr.length !== blanks) return `${label}: fill in ${blanks} expected answer${blanks === 1 ? "" : "s"} (one per blank).`;
        if (arr.some((a) => !a.trim())) return `${label}: every blank needs an expected answer.`;
      } else if (q.type === "true_false") {
        const v = String(q.correct).toLowerCase();
        if (v !== "true" && v !== "false") return `${label}: pick True or False.`;
      } else if (q.type !== "long") {
        if (typeof q.correct === "string" && !q.correct.trim()) return `${label}: fill in the correct answer.`;
      }
      if (q.type === "long" && !q.rubric.trim() && typeof q.correct === "string" && !q.correct.trim()) {
        return `${label}: add a model answer or rubric so it can be graded.`;
      }
    }
    return null;
  }

  function onSave() {
    const err = validate();
    if (err) { toast.error(err); return; }
    startTransition(async () => {
      const res = await createManualTest({
        title: title.trim(),
        subject,
        grade,
        duration_min: duration,
        questions: questions.map((q) => {
          const type = q.type;
          const choices =
            type === "mcq" || type === "multi_select"
              ? q.choices.filter((c) => c.trim())
              : undefined;
          let correct: string | number | string[] = "";
          if (type === "multi_select" || type === "cloze") {
            correct = Array.isArray(q.correct) ? q.correct : [String(q.correct)];
          } else if (type === "numeric") {
            correct = String(q.correct).trim();
          } else if (type === "true_false") {
            correct = String(q.correct).toLowerCase() === "true" ? "true" : "false";
          } else {
            correct = String(q.correct).trim();
          }
          return {
            type,
            prompt: q.prompt.trim(),
            choices,
            correct,
            rubric: q.rubric.trim() || undefined,
            difficulty: q.difficulty,
            points: q.points,
          };
        }),
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
          <h1 className="font-display text-3xl font-bold tracking-tight">Build a test manually</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Type each question yourself — no AI. Use <code className="rounded bg-muted px-1 py-0.5 text-xs">**bold**</code>, <code className="rounded bg-muted px-1 py-0.5 text-xs">$x^2$</code> for math, and <code className="rounded bg-muted px-1 py-0.5 text-xs">[BLANK]</code> in fill-in-the-blank prompts.
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-muted-foreground hover:border-foreground/40 hover:text-foreground"
        >
          <Sparkles className="h-3.5 w-3.5" /> Or generate with AI
        </Link>
      </header>

      <Card className="lwm-card p-6 space-y-6">
        <div>
          <Label htmlFor="title" className="mb-1.5 block">Test title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Multiplication Warm-up · Week 3"
            className="h-11 text-base rounded-2xl"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="mb-1.5 block">Subject</Label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
            >
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label className="mb-1.5 block">Grade</Label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
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
              className="h-10 rounded-xl"
            />
          </div>
        </div>
      </Card>

      <Card className="lwm-card mt-6 border-dashed p-5">
        <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--brand)_15%,transparent)] text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">Have a test already?</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Upload a PDF, DOCX, or TXT and AI pulls out every question into editable form.
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
            className={`inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer hover:border-foreground/40 ${
              importing ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Parsing…</> : <><Upload className="h-4 w-4" /> Import file</>}
          </label>
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">
          Questions <span className="text-muted-foreground font-normal text-base">({questions.length})</span>
        </h2>
      </div>

      <div className="mt-3 space-y-4">
        {questions.map((q, i) => (
          <DraftCard
            key={i}
            q={q}
            index={i}
            onPatch={(p) => patchQ(i, p)}
            onPatchChoice={(ci, v) => patchChoice(i, ci, v)}
            onRemove={() => removeQ(i)}
            onChangeType={(t) => changeType(i, t)}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
        <TypePicker onPick={(t) => addQ(t)} />
        <Button
          onClick={onSave}
          disabled={pending}
          variant="candy"
          size="lg"
          className="rounded-full h-12 px-6"
        >
          {pending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            <><Save className="mr-2 h-4 w-4" /> Save test</>
          )}
        </Button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Tip: After saving you can <b>add images</b>, <b>drag to reorder</b>, and <b>preview as a student</b> on the test page.
      </p>
    </div>
  );
}

function DraftCard({
  q, index, onPatch, onPatchChoice, onRemove, onChangeType,
}: {
  q: Draft;
  index: number;
  onPatch: (p: Partial<Draft>) => void;
  onPatchChoice: (ci: number, v: string) => void;
  onRemove: () => void;
  onChangeType: (t: QuestionType) => void;
}) {
  return (
    <Card className="lwm-card p-5">
      <div className="mb-3 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted font-mono text-xs font-bold">
            {index + 1}
          </span>
          <select
            value={q.type}
            onChange={(e) => onChangeType(e.target.value as QuestionType)}
            className="h-8 rounded-full border border-input bg-transparent px-3 text-xs font-semibold"
            aria-label="Question type"
          >
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={q.difficulty}
            onChange={(e) => onPatch({ difficulty: e.target.value as Difficulty })}
            className="h-8 rounded-full border border-input bg-transparent px-3 text-xs"
            aria-label="Difficulty"
          >
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <div className="inline-flex items-center gap-1.5 h-8 rounded-full border border-input bg-transparent px-3 text-xs">
            <span className="text-muted-foreground">pts</span>
            <input
              type="number"
              min={1}
              max={100}
              value={q.points}
              onChange={(e) => onPatch({ points: Math.max(1, parseInt(e.target.value || "1", 10)) })}
              className="w-10 bg-transparent text-right outline-none"
              aria-label="Points"
            />
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove question">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Label className="mb-1.5 block text-xs uppercase tracking-wide font-semibold text-muted-foreground">
        {q.type === "cloze" ? "Prompt (use [BLANK] where students type)" : "Question"}
      </Label>
      <Textarea
        rows={q.type === "cloze" ? 3 : 2}
        value={q.prompt}
        onChange={(e) => onPatch({ prompt: e.target.value })}
        placeholder={q.type === "cloze" ? "The capital of France is [BLANK]." : "What are you asking? Supports **bold**, *italic*, $x^2$ math."}
        className="mb-4 rounded-xl"
      />

      <AnswerEditor q={q} onPatch={onPatch} onPatchChoice={onPatchChoice} />
    </Card>
  );
}

function AnswerEditor({
  q, onPatch, onPatchChoice,
}: {
  q: Draft;
  onPatch: (p: Partial<Draft>) => void;
  onPatchChoice: (ci: number, v: string) => void;
}) {
  if (q.type === "true_false") {
    const cur = String(q.correct).toLowerCase();
    return (
      <div>
        <Label className="mb-1.5 block text-xs uppercase tracking-wide font-semibold text-muted-foreground">
          Correct answer
        </Label>
        <div className="flex gap-2">
          {["true", "false"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onPatch({ correct: v })}
              className={`h-10 flex-1 rounded-xl border-2 px-4 text-sm font-semibold capitalize transition-all ${
                cur === v
                  ? "border-[var(--success)] bg-[color-mix(in_oklab,var(--success)_15%,transparent)]"
                  : "border-border hover:border-foreground/40"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (q.type === "mcq" || q.type === "multi_select") {
    const isMulti = q.type === "multi_select";
    const correctArr = isMulti ? (Array.isArray(q.correct) ? q.correct : []) : null;
    return (
      <>
        <Label className="mb-1.5 block text-xs uppercase tracking-wide font-semibold text-muted-foreground">
          {isMulti ? "Choices (check every correct one)" : "Choices (click the correct one)"}
        </Label>
        <div className="space-y-2">
          {q.choices.map((c, ci) => {
            const isCorrect = isMulti
              ? correctArr!.includes(c) && !!c.trim()
              : q.correct === c && !!c.trim();
            return (
              <div key={ci} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!c.trim()) return;
                    if (isMulti) {
                      const next = isCorrect
                        ? correctArr!.filter((x) => x !== c)
                        : [...correctArr!, c];
                      onPatch({ correct: next });
                    } else {
                      onPatch({ correct: c });
                    }
                  }}
                  aria-label={`Mark choice ${String.fromCharCode(65 + ci)} correct`}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 transition-colors ${
                    isMulti ? "rounded-md" : "rounded-full"
                  } ${
                    isCorrect
                      ? "border-[var(--success)] bg-[var(--success)] text-white"
                      : "border-input hover:border-foreground/40"
                  }`}
                >
                  {isCorrect && <Check className="h-4 w-4" strokeWidth={3} />}
                </button>
                <span className="w-4 font-mono text-xs text-muted-foreground">
                  {String.fromCharCode(65 + ci)}.
                </span>
                <Input
                  value={c}
                  onChange={(e) => onPatchChoice(ci, e.target.value)}
                  placeholder={`Choice ${String.fromCharCode(65 + ci)}`}
                  className="rounded-xl h-9"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = q.choices.filter((_, j) => j !== ci);
                    if (isMulti) {
                      onPatch({ choices: next, correct: correctArr!.filter((x) => x !== c) });
                    } else {
                      onPatch({ choices: next, correct: q.correct === c ? "" : q.correct });
                    }
                  }}
                  aria-label={`Remove choice ${String.fromCharCode(65 + ci)}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => onPatch({ choices: [...q.choices, ""] })}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> Add choice
          </button>
        </div>
      </>
    );
  }

  if (q.type === "cloze") {
    const blanks = q.prompt.match(/\[BLANK\]/g)?.length ?? 0;
    const arr = Array.isArray(q.correct) ? q.correct : [];
    // Keep the correct array length in sync with blanks
    while (arr.length < blanks) arr.push("");
    while (arr.length > blanks) arr.pop();
    return (
      <div>
        <Label className="mb-1.5 block text-xs uppercase tracking-wide font-semibold text-muted-foreground">
          Expected answers ({blanks} blank{blanks === 1 ? "" : "s"} in your prompt)
        </Label>
        {blanks === 0 ? (
          <p className="text-xs text-muted-foreground italic">Add <code className="rounded bg-muted px-1 py-0.5">[BLANK]</code> to your prompt above to create fill-in spots.</p>
        ) : (
          <div className="space-y-2">
            {arr.map((val, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-center font-mono text-xs text-muted-foreground">#{i + 1}</span>
                <Input
                  value={val}
                  onChange={(e) => {
                    const next = [...arr];
                    next[i] = e.target.value;
                    onPatch({ correct: next });
                  }}
                  placeholder="Expected text"
                  className="rounded-xl h-9"
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Grading is case- and space-insensitive.</p>
          </div>
        )}
      </div>
    );
  }

  if (q.type === "numeric" || q.type === "short") {
    return (
      <>
        <Label className="mb-1.5 block text-xs uppercase tracking-wide font-semibold text-muted-foreground">
          Correct answer
        </Label>
        <Input
          type={q.type === "numeric" ? "text" : "text"}
          inputMode={q.type === "numeric" ? "decimal" : undefined}
          value={String(q.correct)}
          onChange={(e) => onPatch({ correct: e.target.value })}
          placeholder={q.type === "numeric" ? "e.g. 42" : "e.g. Ottawa"}
          className="rounded-xl h-10"
        />
      </>
    );
  }

  // long
  return (
    <>
      <Label className="mb-1.5 block text-xs uppercase tracking-wide font-semibold text-muted-foreground">
        Model answer or rubric (used to grade the student)
      </Label>
      <Textarea
        rows={3}
        value={q.rubric || String(q.correct)}
        onChange={(e) => onPatch({ rubric: e.target.value, correct: "" })}
        placeholder="Describe what a good answer includes — key points, minimum length, etc."
        className="rounded-xl"
      />
    </>
  );
}

function TypePicker({ onPick }: { onPick: (t: QuestionType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        variant="outline"
        className="rounded-full"
        onClick={() => setOpen((o) => !o)}
      >
        <Plus className="mr-1 h-4 w-4" /> Add question
      </Button>
      {open && (
        <>
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default bg-transparent"
          />
          <div className="absolute left-0 top-11 z-20 grid w-[320px] gap-1 rounded-2xl border bg-popover p-2 shadow-lg">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => { onPick(t.value); setOpen(false); }}
                className="flex flex-col rounded-xl border-2 border-transparent px-3 py-2 text-left transition-all hover:border-[var(--brand)] hover:bg-[color-mix(in_oklab,var(--brand)_8%,transparent)]"
              >
                <span className="text-sm font-semibold">{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.hint}</span>
              </button>
            ))}
            <div className="mt-1 border-t pt-2 text-xs text-muted-foreground px-3 flex items-center gap-1.5">
              <ImagePlus className="h-3 w-3" /> Add images after saving on the test page.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
