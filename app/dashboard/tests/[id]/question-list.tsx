"use client";

import { useState, useTransition, useRef } from "react";
import { AnimatePresence, Reorder } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Trash2, Check, X as XIcon, Pencil, GripVertical, ImagePlus, Loader2,
  Plus, ChevronDown, Calculator, ListChecks, ToggleLeft, TextCursorInput,
  MessageSquare, Type as TypeIcon, Highlighter, ArrowLeftRight, Package,
  BookOpen, Minus, Target, Layers, MoveHorizontal, Mic, Bookmark,
} from "lucide-react";
import {
  deleteQuestion, updateQuestion, reorderQuestions, addQuestion,
} from "@/app/actions/test-actions";
import {
  uploadQuestionImage, removeQuestionImage,
  uploadQuestionAudio,
} from "@/app/actions/question-media";
import {
  saveToBank, listBank, insertFromBank, deleteBankItem,
} from "@/app/actions/question-bank";
import type { DbBankItem } from "@/lib/db/types";
import { RichText } from "@/components/ui/rich-text";
import type { DbQuestion } from "@/lib/db/types";
import type { QuestionType } from "@/lib/schemas/question";

type QuestionWithMedia = DbQuestion & { imageUrl?: string | null; audioUrl?: string | null };

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; help: string }> = {
  mcq:          { label: "Multiple choice",     icon: <ListChecks className="h-3.5 w-3.5" />,      help: "One correct choice from a list." },
  multi_select: { label: "Check all that apply",icon: <ListChecks className="h-3.5 w-3.5" />,      help: "Two or more correct choices." },
  true_false:   { label: "True / False",        icon: <ToggleLeft className="h-3.5 w-3.5" />,      help: "Quick binary check." },
  numeric:      { label: "Number",              icon: <Calculator className="h-3.5 w-3.5" />,      help: "Exact numeric answer." },
  cloze:        { label: "Fill in the blanks",  icon: <TextCursorInput className="h-3.5 w-3.5" />, help: "Use [BLANK] where the student types." },
  word_bank:    { label: "Word bank fill",      icon: <Package className="h-3.5 w-3.5" />,         help: "Cloze where the student picks from a word bank." },
  highlight:    { label: "Highlight words",     icon: <Highlighter className="h-3.5 w-3.5" />,     help: "Student clicks the words that fit." },
  match:        { label: "Match pairs",         icon: <ArrowLeftRight className="h-3.5 w-3.5" />,  help: "Two columns to match up." },
  passage:      { label: "Reading passage",     icon: <BookOpen className="h-3.5 w-3.5" />,        help: "Non-scored text block above other questions." },
  number_line:  { label: "Number line",         icon: <Minus className="h-3.5 w-3.5" />,           help: "Student taps a spot on a number line." },
  coord_plot:   { label: "Coordinate plot",     icon: <Target className="h-3.5 w-3.5" />,          help: "Student plots (x,y) on a grid." },
  hotspot:      { label: "Image hotspot",       icon: <Target className="h-3.5 w-3.5" />,          help: "Student clicks the right area of an image." },
  categorize:   { label: "Sort into buckets",   icon: <Layers className="h-3.5 w-3.5" />,          help: "Student assigns items to categories." },
  reorder:      { label: "Reorder words",       icon: <MoveHorizontal className="h-3.5 w-3.5" />,  help: "Student arranges words in order." },
  short:        { label: "Short answer",        icon: <TypeIcon className="h-3.5 w-3.5" />,        help: "Single line of text." },
  long:         { label: "Written response",    icon: <MessageSquare className="h-3.5 w-3.5" />,   help: "Paragraph, teacher-graded." },
};
const ADD_TYPES: QuestionType[] = [
  "mcq", "multi_select", "true_false", "numeric",
  "cloze", "word_bank", "highlight", "match",
  "categorize", "reorder", "number_line", "coord_plot",
  "hotspot", "passage", "short", "long",
];

export function QuestionList({
  questions, testId,
}: { questions: QuestionWithMedia[]; testId: string }) {
  const [items, setItems] = useState(questions);
  const [pending, startTransition] = useTransition();
  const [openAdd, setOpenAdd] = useState(false);

  function onReorder(next: QuestionWithMedia[]) {
    setItems(next);
    startTransition(async () => {
      const res = await reorderQuestions(testId, next.map((q) => q.id));
      if (!res.ok) toast.error(res.error);
    });
  }

  function onAdd(type: QuestionType) {
    startTransition(async () => {
      const res = await addQuestion(testId, type);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Question added.");
        setOpenAdd(false);
      }
    });
  }

  return (
    <div>
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={onReorder}
        className="space-y-3"
      >
        <AnimatePresence>
          {items.map((q, i) => (
            <Reorder.Item
              key={q.id}
              value={q}
              className="cursor-default"
              layout
            >
              <QuestionRow
                q={q}
                index={i}
                testId={testId}
                onDeleted={() => setItems((prev) => prev.filter((p) => p.id !== q.id))}
                onImageChange={(url, path) => setItems((prev) => prev.map((p) => p.id === q.id ? { ...p, imageUrl: url, image_path: path } : p))}
              />
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      <div className="mt-6">
        {openAdd ? (
          <Card className="lwm-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Add a question</p>
              <button
                onClick={() => setOpenAdd(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {ADD_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => onAdd(t)}
                  disabled={pending}
                  className="group flex items-start gap-3 rounded-xl border-2 border-transparent bg-muted/40 p-3 text-left transition-all hover:border-[var(--brand)] hover:bg-[color-mix(in_oklab,var(--brand)_8%,transparent)]"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-[var(--brand)]">
                    {TYPE_META[t]?.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{TYPE_META[t]?.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{TYPE_META[t]?.help}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setOpenAdd(true)}
              variant="candy"
              className="rounded-full h-11 px-6"
              disabled={pending}
            >
              <Plus className="mr-1 h-4 w-4" /> Add question
            </Button>
            <BankPicker testId={testId} />
          </div>
        )}
      </div>
    </div>
  );
}

function BankPicker({ testId }: { testId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DbBankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function openPicker() {
    setOpen(true);
    setLoading(true);
    const data = await listBank();
    setItems(data);
    setLoading(false);
  }
  function insert(id: string) {
    startTransition(async () => {
      const res = await insertFromBank(testId, id);
      if (res.ok) { toast.success("Question added from bank."); setOpen(false); }
      else toast.error(res.error);
    });
  }
  function del(id: string) {
    if (!confirm("Remove this bank item permanently?")) return;
    startTransition(async () => {
      const res = await deleteBankItem(id);
      if (res.ok) { setItems((prev) => prev.filter((i) => i.id !== id)); toast.success("Removed from bank."); }
      else toast.error(res.error);
    });
  }

  return (
    <>
      <Button
        variant="outline"
        className="rounded-full h-11 px-4"
        onClick={openPicker}
      >
        <Bookmark className="mr-1 h-4 w-4" /> From bank
      </Button>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-start justify-center p-4 pt-16" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg rounded-3xl bg-popover p-4 shadow-xl max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Question bank"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold">Question bank</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            {loading ? (
              <div className="p-10 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Your bank is empty. Save any question with the bookmark icon on its row to reuse it later.
              </p>
            ) : (
              <ul className="overflow-y-auto space-y-2 flex-1">
                {items.map((it) => (
                  <li key={it.id} className="rounded-2xl border p-3 hover:border-[var(--brand)]/60">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{it.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {(it.snapshot as { type?: string }).type ?? "—"}
                          {it.subject ? ` · ${it.subject}` : ""}
                          {it.grade ? ` · Grade ${it.grade}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => del(it.id)}
                        aria-label="Delete bank item"
                        className="text-muted-foreground hover:text-[var(--danger)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Button
                        onClick={() => insert(it.id)}
                        variant="candy"
                        size="sm"
                        className="rounded-full"
                        disabled={pending}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Insert
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function QuestionRow({
  q, index, testId, onDeleted, onImageChange,
}: {
  q: QuestionWithMedia;
  index: number;
  testId: string;
  onDeleted: () => void;
  onImageChange: (url: string | null, path: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [prompt, setPrompt] = useState(q.prompt);
  const [choices, setChoices] = useState<string[]>(q.choices ?? []);
  const [correct, setCorrect] = useState<string | string[]>(
    Array.isArray(q.correct) ? q.correct : String(q.correct)
  );
  const [points, setPoints] = useState(q.points ?? 1);
  const [rubric, setRubric] = useState(q.rubric ?? "");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  function onSave() {
    startTransition(async () => {
      const res = await updateQuestion(q.id, testId, {
        prompt,
        choices: choices.length ? choices : null,
        correct,
        points,
        rubric: rubric || null,
      });
      if (res.ok) { toast.success("Saved."); setEditing(false); }
      else toast.error(res.error);
    });
  }

  function onDelete() {
    if (!confirm("Delete this question?")) return;
    startTransition(async () => {
      const res = await deleteQuestion(q.id, testId);
      if (res.ok) { toast.success("Deleted."); onDeleted(); }
      else toast.error(res.error);
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("testId", testId);
    fd.append("questionId", q.id);
    const res = await uploadQuestionImage(fd);
    setUploading(false);
    e.target.value = "";
    if (res.ok) { onImageChange(res.url, res.path); toast.success("Image added."); }
    else toast.error(res.error);
  }

  function onRemoveImage() {
    if (!confirm("Remove the image?")) return;
    startTransition(async () => {
      const res = await removeQuestionImage(testId, q.id);
      if (res.ok) { onImageChange(null, null); toast.success("Image removed."); }
      else toast.error(res.error);
    });
  }

  async function onAudioFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingAudio(true);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("testId", testId);
    fd.append("questionId", q.id);
    const res = await uploadQuestionAudio(fd);
    setUploadingAudio(false);
    e.target.value = "";
    if (res.ok) toast.success("Audio added — reload to hear it in the student view.");
    else toast.error(res.error);
  }

  function onSaveToBank() {
    const label = window.prompt("Label this question for your bank:", q.prompt.slice(0, 60));
    if (!label) return;
    startTransition(async () => {
      const res = await saveToBank(q.id, label);
      if (res.ok) toast.success("Saved to bank.");
      else toast.error(res.error);
    });
  }

  const meta = TYPE_META[q.type] ?? TYPE_META.short;

  return (
    <Card className="lwm-card p-5" data-editing={editing || undefined}>
      <div className="flex items-start gap-3">
        <div
          className="mt-1 flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label="Drag to reorder"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono">
              #{index + 1}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--brand)_15%,transparent)] px-2 py-0.5 font-semibold text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]">
              {meta.icon} {meta.label}
            </span>
            <DifficultyPill d={q.difficulty} />
            {q.strand && <span className="text-muted-foreground">· {q.strand}</span>}
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[10px]">
              {q.points ?? 1} pt{(q.points ?? 1) === 1 ? "" : "s"}
            </span>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Prompt</label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={q.type === "cloze" ? 3 : 2}
                  className="rounded-xl"
                  placeholder={q.type === "cloze" ? "The capital of France is [BLANK]." : ""}
                />
                <FormatHelp type={q.type} />
              </div>

              <AnswerEditor
                type={q.type}
                choices={choices}
                setChoices={setChoices}
                correct={correct}
                setCorrect={setCorrect}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Points</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={points}
                    onChange={(e) => setPoints(Math.max(1, parseInt(e.target.value || "1", 10)))}
                    className="rounded-xl h-9 max-w-[100px]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Rubric / hint (optional)</label>
                  <Input
                    value={rubric}
                    onChange={(e) => setRubric(e.target.value)}
                    className="rounded-xl h-9"
                    placeholder="e.g. Give partial credit for correct method"
                  />
                </div>
              </div>

              <ImageEditor
                url={q.imageUrl ?? null}
                uploading={uploading}
                onPick={() => fileRef.current?.click()}
                onRemove={onRemoveImage}
              />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </div>
          ) : (
            <>
              <RichText html={q.prompt} className="prose-invert font-display text-lg leading-relaxed" />
              {q.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={q.imageUrl} alt="" className="mt-3 max-h-64 rounded-xl border object-contain bg-background" />
              )}
              {q.audioUrl && (
                <div className="mt-3">
                  <audio controls src={q.audioUrl} className="w-full max-w-md" preload="none" />
                </div>
              )}
              <div className="mt-3">
                <AnswerPreview q={q} />
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {editing ? (
            <>
              <Button size="icon-sm" variant="ghost" onClick={onSave} disabled={pending} aria-label="Save">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => { setEditing(false); setPrompt(q.prompt); }} aria-label="Cancel">
                <XIcon className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button size="icon-sm" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              {!q.imageUrl && (
                <Button size="icon-sm" variant="ghost" onClick={() => fileRef.current?.click()} aria-label="Add image">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                </Button>
              )}
              {!q.audioUrl && (
                <Button size="icon-sm" variant="ghost" onClick={() => audioRef.current?.click()} aria-label="Add audio">
                  {uploadingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={onSaveToBank}
                disabled={pending}
                aria-label="Save to question bank"
                title="Save to bank"
              >
                <Bookmark className="h-4 w-4" />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={onDelete} disabled={pending} aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={onAudioFile} />
        </div>
      </div>
    </Card>
  );
}

function AnswerEditor({
  type, choices, setChoices, correct, setCorrect,
}: {
  type: string;
  choices: string[];
  setChoices: (c: string[]) => void;
  correct: string | string[];
  setCorrect: (c: string | string[]) => void;
}) {
  if (type === "true_false") {
    const val = String(correct).toLowerCase() === "true" ? "true" : "false";
    return (
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Correct answer</label>
        <div className="flex gap-2">
          {["true", "false"].map((v) => (
            <button
              key={v}
              onClick={() => setCorrect(v)}
              className={`h-10 flex-1 rounded-xl border-2 px-4 text-sm font-semibold capitalize transition-all ${
                val === v
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

  if (type === "mcq" || type === "multi_select") {
    const isMulti = type === "multi_select";
    const correctArr = isMulti
      ? (Array.isArray(correct) ? correct : [String(correct)])
      : null;
    return (
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
          Choices — {isMulti ? "check every correct one" : "click the correct one"}
        </label>
        <div className="space-y-2">
          {choices.map((c, i) => {
            const isCorrect = isMulti
              ? correctArr!.includes(c)
              : String(correct) === c;
            return (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isMulti) {
                      const next = isCorrect
                        ? correctArr!.filter((x) => x !== c)
                        : [...correctArr!, c];
                      setCorrect(next);
                    } else {
                      setCorrect(c);
                    }
                  }}
                  aria-label={`Mark option ${String.fromCharCode(65 + i)} ${isCorrect ? "not correct" : "correct"}`}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    isCorrect
                      ? "border-[var(--success)] bg-[var(--success)] text-white"
                      : "border-border"
                  }`}
                >
                  {isCorrect ? <Check className="h-4 w-4" strokeWidth={3} /> : (
                    <span className="text-xs font-mono">{String.fromCharCode(65 + i)}</span>
                  )}
                </button>
                <Input
                  value={c}
                  onChange={(e) => {
                    const next = [...choices];
                    next[i] = e.target.value;
                    setChoices(next);
                    if (!isMulti && String(correct) === c) setCorrect(e.target.value);
                    if (isMulti && correctArr!.includes(c)) {
                      const nc = correctArr!.map((x) => x === c ? e.target.value : x);
                      setCorrect(nc);
                    }
                  }}
                  className="rounded-xl h-9"
                />
                <button
                  onClick={() => {
                    const next = choices.filter((_, j) => j !== i);
                    setChoices(next);
                    if (isMulti) {
                      setCorrect(correctArr!.filter((x) => x !== c));
                    } else if (String(correct) === c) {
                      setCorrect(next[0] ?? "");
                    }
                  }}
                  aria-label="Remove choice"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          <button
            onClick={() => setChoices([...choices, `Option ${String.fromCharCode(65 + choices.length)}`])}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> Add choice
          </button>
        </div>
      </div>
    );
  }

  if (type === "passage") {
    return (
      <p className="text-xs text-muted-foreground italic">
        This is a display-only passage. It doesn&apos;t count toward the score. Students see the prompt as a text block above the following questions.
      </p>
    );
  }

  if (type === "number_line") {
    const min = String(choices[0] ?? "0");
    const max = String(choices[1] ?? "10");
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Min</label>
            <Input value={min} onChange={(e) => setChoices([e.target.value, max])} className="rounded-xl h-9" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Max</label>
            <Input value={max} onChange={(e) => setChoices([min, e.target.value])} className="rounded-xl h-9" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Target</label>
            <Input value={String(correct)} onChange={(e) => setCorrect(e.target.value)} className="rounded-xl h-9" placeholder="e.g. 7" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Point snaps to a sensible step based on the range.</p>
      </div>
    );
  }

  if (type === "coord_plot") {
    const c = [choices[0] ?? "-5", choices[1] ?? "5", choices[2] ?? "-5", choices[3] ?? "5"].map(String);
    const setC = (idx: number, val: string) => {
      const next = [...c];
      next[idx] = val;
      setChoices(next);
    };
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">X min</label><Input value={c[0]} onChange={(e) => setC(0, e.target.value)} className="rounded-xl h-9" /></div>
          <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">X max</label><Input value={c[1]} onChange={(e) => setC(1, e.target.value)} className="rounded-xl h-9" /></div>
          <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Y min</label><Input value={c[2]} onChange={(e) => setC(2, e.target.value)} className="rounded-xl h-9" /></div>
          <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Y max</label><Input value={c[3]} onChange={(e) => setC(3, e.target.value)} className="rounded-xl h-9" /></div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Target point (x,y)</label>
          <Input value={String(correct)} onChange={(e) => setCorrect(e.target.value)} className="rounded-xl h-9 max-w-[200px]" placeholder="3,4" />
        </div>
      </div>
    );
  }

  if (type === "hotspot") {
    const [tx, ty, tr] = String(correct).split(",").map((s) => s.trim());
    const setPt = (nx: string, ny: string, nr: string) => setCorrect(`${nx},${ny},${nr}`);
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Add an image on this question, then click the correct spot in the preview below to set the target.
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Target X (0–1)</label>
            <Input value={tx ?? "0.5"} onChange={(e) => setPt(e.target.value, ty ?? "0.5", tr ?? "0.15")} className="rounded-xl h-9" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Target Y (0–1)</label>
            <Input value={ty ?? "0.5"} onChange={(e) => setPt(tx ?? "0.5", e.target.value, tr ?? "0.15")} className="rounded-xl h-9" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Radius (0–1)</label>
            <Input value={tr ?? "0.15"} onChange={(e) => setPt(tx ?? "0.5", ty ?? "0.5", e.target.value)} className="rounded-xl h-9" />
          </div>
        </div>
      </div>
    );
  }

  if (type === "categorize") {
    const items = choices;
    const buckets = Array.isArray(correct) ? correct : [];
    const uniqueBuckets = [...new Set(buckets.filter((b) => b && b.trim()))];
    while (buckets.length < items.length) buckets.push("");
    return (
      <div className="space-y-3">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
          Items and their correct bucket
        </label>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 font-mono text-xs text-muted-foreground">#{i + 1}</span>
              <Input
                value={it}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  setChoices(next);
                }}
                placeholder="Item"
                className="rounded-xl h-9 flex-1"
              />
              <span className="text-muted-foreground">→</span>
              <Input
                value={buckets[i] ?? ""}
                onChange={(e) => {
                  const next = [...buckets];
                  next[i] = e.target.value;
                  setCorrect(next);
                }}
                placeholder="Bucket label"
                className="rounded-xl h-9 flex-1"
                list={`buckets-${i}`}
              />
              <datalist id={`buckets-${i}`}>
                {uniqueBuckets.map((b) => <option key={b} value={b} />)}
              </datalist>
              <button
                onClick={() => {
                  setChoices(items.filter((_, j) => j !== i));
                  setCorrect(buckets.filter((_, j) => j !== i));
                }}
                aria-label="Remove item"
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => { setChoices([...items, ""]); setCorrect([...buckets, uniqueBuckets[0] ?? ""]); }}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> Add item
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Buckets are auto-collected from what you type above — you can repeat a label to grow a bucket.
        </p>
      </div>
    );
  }

  if (type === "reorder") {
    const words = choices;
    const order = Array.isArray(correct) ? correct : [];
    return (
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Word tiles (shown scrambled)</label>
          <div className="flex flex-wrap gap-2">
            {words.map((w, i) => (
              <div key={i} className="inline-flex items-center gap-1 rounded-full border-2 border-border bg-background px-2 py-1">
                <Input
                  value={w}
                  onChange={(e) => {
                    const next = [...words];
                    next[i] = e.target.value;
                    setChoices(next);
                  }}
                  className="h-7 w-24 rounded-full border-0 shadow-none focus-visible:ring-0 px-1 text-sm"
                />
                <button
                  onClick={() => setChoices(words.filter((_, j) => j !== i))}
                  aria-label="Remove tile"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setChoices([...words, ""])}
              className="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> Add tile
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Correct order</label>
          <div className="flex flex-wrap gap-2 rounded-2xl border-2 border-dashed border-[var(--brand)]/40 p-3">
            {order.map((w, i) => (
              <div key={i} className="inline-flex items-center gap-1 rounded-full bg-[var(--brand)] text-primary-foreground px-2 py-1 text-sm font-semibold">
                <span className="font-mono text-xs opacity-70">{i + 1}</span>
                {w}
                <button
                  onClick={() => setCorrect(order.filter((_, j) => j !== i))}
                  aria-label="Remove from order"
                  className="opacity-70 hover:opacity-100"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
            {words.filter((w) => w.trim() && !order.includes(w)).map((w, i) => (
              <button
                key={`add-${i}`}
                onClick={() => setCorrect([...order, w])}
                className="rounded-full border-2 border-border bg-background px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                + {w}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Click a tile above to add it to the order. Repeat words are allowed as long as they appear in the tile list.</p>
        </div>
      </div>
    );
  }

  if (type === "highlight") {
    const words = Array.isArray(correct) ? correct : [String(correct)];
    return (
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
          Words the student must click (must appear in the prompt)
        </label>
        <div className="space-y-2">
          {words.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 text-center font-mono text-xs text-muted-foreground">#{i + 1}</span>
              <Input
                value={w}
                onChange={(e) => {
                  const next = [...words];
                  next[i] = e.target.value;
                  setCorrect(next);
                }}
                className="rounded-xl h-9"
              />
              <button
                onClick={() => setCorrect(words.filter((_, j) => j !== i))}
                aria-label="Remove word"
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setCorrect([...words, ""])}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> Add word
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Matching is case-insensitive.
        </p>
      </div>
    );
  }

  if (type === "match") {
    const rights = Array.isArray(correct) ? correct : [String(correct)];
    const lefts = choices;
    const rows = Math.max(lefts.length, rights.length);
    return (
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
          Match pairs — each row is <span className="font-mono">Left ↔ Right</span>. Order defines the correct match.
        </label>
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={lefts[i] ?? ""}
                onChange={(e) => {
                  const next = [...lefts];
                  next[i] = e.target.value;
                  setChoices(next);
                }}
                placeholder="Left side"
                className="rounded-xl h-9 flex-1"
              />
              <span className="text-muted-foreground">↔</span>
              <Input
                value={rights[i] ?? ""}
                onChange={(e) => {
                  const next = [...rights];
                  next[i] = e.target.value;
                  setCorrect(next);
                }}
                placeholder="Right side"
                className="rounded-xl h-9 flex-1"
              />
              <button
                onClick={() => {
                  setChoices(lefts.filter((_, j) => j !== i));
                  setCorrect(rights.filter((_, j) => j !== i));
                }}
                aria-label="Remove pair"
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => { setChoices([...lefts, ""]); setCorrect([...rights, ""]); }}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> Add pair
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          The right column is shuffled for the student — order here only defines what matches what.
        </p>
      </div>
    );
  }

  if (type === "word_bank") {
    const blanks = Array.isArray(correct) ? correct : [String(correct)];
    return (
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Expected answers (one per [BLANK] in order)
          </label>
          <div className="space-y-2">
            {blanks.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-center font-mono text-xs text-muted-foreground">#{i + 1}</span>
                <Input
                  value={b}
                  onChange={(e) => {
                    const next = [...blanks];
                    next[i] = e.target.value;
                    setCorrect(next);
                  }}
                  className="rounded-xl h-9"
                  placeholder="Expected text"
                />
                <button
                  onClick={() => setCorrect(blanks.filter((_, j) => j !== i))}
                  aria-label="Remove blank"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setCorrect([...blanks, ""])}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> Add blank
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Word bank (shown to student as draggable choices)
          </label>
          <div className="space-y-2">
            {choices.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={c}
                  onChange={(e) => {
                    const next = [...choices];
                    next[i] = e.target.value;
                    setChoices(next);
                  }}
                  className="rounded-xl h-9"
                  placeholder="Word"
                />
                <button
                  onClick={() => setChoices(choices.filter((_, j) => j !== i))}
                  aria-label="Remove word"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setChoices([...choices, ""])}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> Add bank word
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Include the correct words above plus a few distractors.
          </p>
        </div>
      </div>
    );
  }

  if (type === "cloze") {
    const blanks = Array.isArray(correct) ? correct : [String(correct)];
    return (
      <div>
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
          Expected answers (one per [BLANK] in order)
        </label>
        <div className="space-y-2">
          {blanks.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-center font-mono text-xs text-muted-foreground">
                #{i + 1}
              </span>
              <Input
                value={b}
                onChange={(e) => {
                  const next = [...blanks];
                  next[i] = e.target.value;
                  setCorrect(next);
                }}
                className="rounded-xl h-9"
                placeholder="Expected text"
              />
              <button
                onClick={() => setCorrect(blanks.filter((_, j) => j !== i))}
                aria-label="Remove blank"
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setCorrect([...blanks, ""])}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" /> Add blank
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Grading is case- and space-insensitive.
        </p>
      </div>
    );
  }

  // numeric / short / long
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">
        {type === "long" ? "Model answer (teacher-graded)" : "Correct answer"}
      </label>
      {type === "long" ? (
        <Textarea
          value={String(correct)}
          onChange={(e) => setCorrect(e.target.value)}
          rows={3}
          className="rounded-xl"
        />
      ) : (
        <Input
          value={String(correct)}
          onChange={(e) => setCorrect(e.target.value)}
          className="rounded-xl h-9"
          placeholder={type === "numeric" ? "e.g. 42" : "e.g. Ottawa"}
          inputMode={type === "numeric" ? "decimal" : undefined}
        />
      )}
    </div>
  );
}

function AnswerPreview({ q }: { q: QuestionWithMedia }) {
  if (q.type === "mcq" && q.choices) {
    return (
      <ul className="space-y-1 text-sm">
        {q.choices.map((c, ci) => {
          const isCorrect = String(c) === String(q.correct);
          return (
            <li
              key={ci}
              className={`rounded border px-3 py-1.5 ${
                isCorrect
                  ? "border-[color-mix(in_oklab,var(--success)_50%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)]"
                  : "border-transparent bg-muted/40"
              }`}
            >
              <span className="mr-2 font-mono text-xs text-muted-foreground">
                {String.fromCharCode(65 + ci)}.
              </span>
              <RichText html={c} inline as="span" />
              {isCorrect && <Check className="ml-2 inline h-3.5 w-3.5 text-[var(--success)]" />}
            </li>
          );
        })}
      </ul>
    );
  }
  if (q.type === "multi_select" && q.choices) {
    const arr = Array.isArray(q.correct) ? q.correct : [String(q.correct)];
    return (
      <ul className="space-y-1 text-sm">
        {q.choices.map((c, ci) => {
          const isCorrect = arr.includes(c);
          return (
            <li
              key={ci}
              className={`rounded border px-3 py-1.5 ${
                isCorrect
                  ? "border-[color-mix(in_oklab,var(--success)_50%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)]"
                  : "border-transparent bg-muted/40"
              }`}
            >
              <span className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded border ${isCorrect ? "border-[var(--success)] bg-[var(--success)] text-white" : "border-muted-foreground/40"}`}>
                {isCorrect && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <RichText html={c} inline as="span" />
            </li>
          );
        })}
      </ul>
    );
  }
  if (q.type === "passage") {
    return (
      <p className="text-xs text-muted-foreground italic">
        Reading passage — not scored.
      </p>
    );
  }
  if (q.type === "number_line") {
    return (
      <p className="rounded-lg border border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)] px-3 py-1.5 text-sm">
        <span className="mr-2 font-mono text-xs uppercase text-[color-mix(in_oklab,var(--success)_80%,black)] dark:text-[var(--success)]">
          Target on line {q.choices?.[0]}…{q.choices?.[1]}
        </span>
        {String(q.correct)}
      </p>
    );
  }
  if (q.type === "coord_plot") {
    return (
      <p className="rounded-lg border border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)] px-3 py-1.5 text-sm">
        <span className="mr-2 font-mono text-xs uppercase text-[color-mix(in_oklab,var(--success)_80%,black)] dark:text-[var(--success)]">
          Target point
        </span>
        ({String(q.correct)})
      </p>
    );
  }
  if (q.type === "hotspot") {
    return (
      <p className="rounded-lg border border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)] px-3 py-1.5 text-sm">
        <span className="mr-2 font-mono text-xs uppercase text-[color-mix(in_oklab,var(--success)_80%,black)] dark:text-[var(--success)]">
          Hotspot at
        </span>
        {String(q.correct)}
        <span className="text-xs text-muted-foreground ml-2">(x, y, radius as fractions of the image)</span>
      </p>
    );
  }
  if (q.type === "categorize") {
    const buckets = Array.isArray(q.correct) ? q.correct : [];
    return (
      <ul className="space-y-1 text-sm">
        {(q.choices ?? []).map((item, i) => (
          <li key={i} className="rounded border border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)] px-2.5 py-1">
            <RichText html={item} inline as="span" />
            <span className="mx-2 text-muted-foreground">→</span>
            <span className="font-semibold">{buckets[i] ?? "?"}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (q.type === "reorder") {
    const order = Array.isArray(q.correct) ? q.correct : [];
    return (
      <p className="rounded-lg border border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)] px-3 py-1.5 text-sm">
        <span className="mr-2 font-mono text-xs uppercase text-[color-mix(in_oklab,var(--success)_80%,black)] dark:text-[var(--success)]">
          Order
        </span>
        {order.join(" → ")}
      </p>
    );
  }
  if (q.type === "highlight") {
    const arr = Array.isArray(q.correct) ? q.correct : [String(q.correct)];
    return (
      <p className="rounded-lg border border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)] px-3 py-1.5 text-sm">
        <span className="mr-2 font-mono text-xs uppercase text-[color-mix(in_oklab,var(--success)_80%,black)] dark:text-[var(--success)]">
          Words to click
        </span>
        {arr.map((w, i) => (
          <span key={i} className="mr-1 inline-block rounded bg-[color-mix(in_oklab,var(--success)_18%,transparent)] px-1.5 py-0.5 font-semibold">
            {w}
          </span>
        ))}
      </p>
    );
  }
  if (q.type === "match") {
    const lefts = Array.isArray(q.choices) ? q.choices : [];
    const rights = Array.isArray(q.correct) ? q.correct : [String(q.correct)];
    return (
      <ul className="space-y-1 text-sm">
        {lefts.map((l, i) => (
          <li key={i} className="rounded border border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)] px-2.5 py-1">
            <span className="font-mono text-xs text-muted-foreground mr-2">{i + 1}.</span>
            <RichText html={l} inline as="span" />
            <span className="mx-2 text-muted-foreground">↔</span>
            <RichText html={String(rights[i] ?? "")} inline as="span" />
          </li>
        ))}
      </ul>
    );
  }
  if (q.type === "word_bank") {
    const blanks = Array.isArray(q.correct) ? q.correct : [String(q.correct)];
    return (
      <div className="text-sm">
        <p className="rounded-lg border border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)] px-3 py-1.5">
          <span className="mr-2 font-mono text-xs uppercase text-[color-mix(in_oklab,var(--success)_80%,black)] dark:text-[var(--success)]">
            Blanks
          </span>
          {blanks.join(" · ")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Bank: {(q.choices ?? []).join(", ") || "(empty)"}
        </p>
      </div>
    );
  }
  const label = q.type === "cloze" ? "Blanks" : "Answer";
  const value = Array.isArray(q.correct) ? q.correct.join(" · ") : String(q.correct);
  return (
    <p className="rounded-lg border border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_8%,transparent)] px-3 py-1.5 text-sm">
      <span className="mr-2 font-mono text-xs uppercase text-[color-mix(in_oklab,var(--success)_80%,black)] dark:text-[var(--success)]">
        {label}
      </span>
      {value || <span className="italic text-muted-foreground">(none)</span>}
    </p>
  );
}

function ImageEditor({
  url, uploading, onPick, onRemove,
}: { url: string | null; uploading: boolean; onPick: () => void; onRemove: () => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">Image (optional)</label>
      {url ? (
        <div className="flex items-start gap-3 rounded-xl border-2 border-border p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-24 w-24 shrink-0 rounded-lg object-cover" />
          <div className="flex flex-col gap-1">
            <Button size="sm" variant="outline" onClick={onPick} className="rounded-full">Replace</Button>
            <Button size="sm" variant="ghost" onClick={onRemove} className="rounded-full text-muted-foreground">Remove</Button>
          </div>
        </div>
      ) : (
        <button
          onClick={onPick}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-[var(--brand)]/40 bg-[color-mix(in_oklab,var(--brand)_5%,transparent)] px-4 py-2 text-sm font-semibold text-[var(--brand)] hover:border-[var(--brand)]"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Add image
        </button>
      )}
    </div>
  );
}

function FormatHelp({ type }: { type: string }) {
  return (
    <details className="mt-1 text-xs text-muted-foreground">
      <summary className="cursor-pointer select-none hover:text-foreground">
        <ChevronDown className="inline h-3 w-3 mr-1" />
        Formatting help
      </summary>
      <div className="mt-1 space-y-0.5 pl-4 font-mono">
        <div><code>**bold**</code> · <code>*italic*</code> · <code>`code`</code></div>
        <div><code>$x^2 + 3$</code> renders as math (KaTeX)</div>
        {type === "cloze" && <div><code>[BLANK]</code> becomes an input for the student</div>}
      </div>
    </details>
  );
}

function DifficultyPill({ d }: { d: "easy" | "medium" | "hard" }) {
  const c =
    d === "easy"
      ? "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[color-mix(in_oklab,var(--success)_80%,black)] dark:text-[var(--success)]"
      : d === "hard"
      ? "bg-[color-mix(in_oklab,var(--danger)_15%,transparent)] text-[color-mix(in_oklab,var(--danger)_80%,black)] dark:text-[var(--danger)]"
      : "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[color-mix(in_oklab,var(--warning)_80%,black)] dark:text-[var(--warning)]";
  return (
    <span className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] uppercase font-semibold ${c}`}>
      {d}
    </span>
  );
}
