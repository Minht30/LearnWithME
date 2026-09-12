"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { saveAnswer, submitAttempt } from "@/app/actions/student-actions";
import { uploadExplanationFile } from "@/app/actions/upload-explanation";
import { playChime, playCorrect, playIncorrect } from "@/lib/sounds";
import type { DbAttempt, DbQuestion, DbTest } from "@/lib/db/types";
import {
  StickyNote,
  Send,
  Volume2,
  VolumeX,
  Play,
  Check,
  Sparkles,
  Camera,
  Clock,
  ListChecks,
  Info,
  Upload,
  FileText,
  X as XIcon,
  Loader2,
} from "lucide-react";

type WorkFile = { url: string; mime: string; path: string };

type Props = {
  attempt: DbAttempt;
  test: DbTest;
  questions: DbQuestion[];
  initialResponses: Record<string, string>;
  initialNotes: Record<string, string>;
  initialWork: Record<string, WorkFile>;
};

type LocalGrade = {
  isCorrect: boolean;
  correctAnswer: string;
  feedback: string;
  awaitingTeacher?: boolean;
};

type Phase = "briefing" | "answering" | "submitting";

const ENCOURAGEMENTS = ["Nice work!", "You got it!", "Right on!", "Great job!", "Yes!", "That's it!", "Perfect!"];

function stableEncouragement(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ENCOURAGEMENTS[Math.abs(h) % ENCOURAGEMENTS.length];
}

function normalizeCorrect(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function gradeLocally(q: DbQuestion, response: string): LocalGrade {
  const trimmed = (response ?? "").trim();
  const correctAnswer = normalizeCorrect(q.correct);

  if (q.type === "mcq") {
    const ok = trimmed.toLowerCase() === correctAnswer.toLowerCase();
    return {
      isCorrect: ok,
      correctAnswer,
      feedback: ok ? stableEncouragement(q.id) : "Not quite — here's the right answer.",
    };
  }
  if (q.type === "numeric") {
    const a = parseFloat(trimmed);
    const b = parseFloat(correctAnswer);
    const ok = Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-6;
    return {
      isCorrect: ok,
      correctAnswer,
      feedback: ok ? stableEncouragement(q.id) : "Close! Let's look at this one.",
    };
  }
  // short / long: don't grade locally — teacher will (or the server will use the small model on submit)
  return {
    isCorrect: false,
    correctAnswer,
    feedback: "Saved. Your teacher will review this one.",
    awaitingTeacher: true,
  };
}

export function PracticeRoom({
  attempt,
  test,
  questions,
  initialResponses,
  initialNotes,
  initialWork,
}: Props) {
  const [phase, setPhase] = useState<Phase>("briefing");
  const [idx, setIdx] = useState(0);
  const [responses, setResponses] = useState(initialResponses);
  const [notes, setNotes] = useState(initialNotes);
  const [workUploads, setWorkUploads] = useState<Record<string, WorkFile>>(initialWork);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Record<string, LocalGrade>>({});
  const [showNotes, setShowNotes] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [pending, startTransition] = useTransition();

  // Load persisted sound setting once
  useEffect(() => {
    try {
      const stored = localStorage.getItem("lwm.sound");
      if (stored === "0") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSoundOn(false);
      }
    } catch { /* private mode */ }
  }, []);
  function toggleSound() {
    setSoundOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("lwm.sound", next ? "1" : "0");
      } catch { /* ignore */ }
      return next;
    });
  }

  const total = questions.length;
  const q = questions[idx];
  const isChecked = q ? !!checked[q.id] : false;
  const answeredCount = Object.keys(checked).length;
  const correctCount = Object.values(checked).filter((g) => g.isCorrect).length;

  // --- Timer (only ticks in "answering" phase) --------------------------------
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (phase !== "answering") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const startedMs = new Date(attempt.started_at).getTime();
  const totalMs = test.duration_min * 60_000;
  const elapsed = phase === "answering" ? Math.max(0, now - startedMs) : 0;
  const remaining = Math.max(0, totalMs - elapsed);
  const remMin = Math.floor(remaining / 60_000);
  const remSec = Math.floor((remaining % 60_000) / 1000);

  const rangStartRef = useRef(false);
  const rangOneMinRef = useRef(false);
  const rangEndRef = useRef(false);
  useEffect(() => {
    if (phase !== "answering") return;
    if (!rangStartRef.current) {
      rangStartRef.current = true;
      playChime(soundOn);
    }
    if (!rangOneMinRef.current && remaining > 0 && remaining <= 61_000) {
      rangOneMinRef.current = true;
      playChime(soundOn);
      toast.info("One minute left.");
    }
    if (!rangEndRef.current && remaining <= 0 && totalMs > 0) {
      rangEndRef.current = true;
      playChime(soundOn);
      toast.info("Time's up — submit when you're ready.");
    }
  }, [phase, remaining, totalMs, soundOn]);

  // --- Debounced autosave (response + notes only) ----------------------------
  // Uploaded files persist via their own server action; no need to include here.
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = useCallback(
    (questionId: string, response: string, note: string | null) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveAnswer(attempt.id, questionId, response, note);
      }, 600);
    },
    [attempt.id]
  );

  function setResponse(qid: string, val: string) {
    setResponses((prev) => ({ ...prev, [qid]: val }));
    scheduleSave(qid, val, notes[qid] ?? null);
  }
  function setNote(qid: string, val: string) {
    setNotes((prev) => ({ ...prev, [qid]: val }));
    scheduleSave(qid, responses[qid] ?? "", val);
  }

  async function uploadWork(qid: string, file: File) {
    setUploading((prev) => ({ ...prev, [qid]: true }));
    const fd = new FormData();
    fd.append("file", file);
    fd.append("attemptId", attempt.id);
    fd.append("questionId", qid);
    const res = await uploadExplanationFile(fd);
    setUploading((prev) => ({ ...prev, [qid]: false }));
    if (res.ok) {
      setWorkUploads((prev) => ({
        ...prev,
        [qid]: { url: res.url, mime: res.mime, path: res.path },
      }));
    } else {
      toast.error(res.error);
    }
  }

  function onCheck() {
    if (!q) return;
    const response = responses[q.id] ?? "";
    if (!response.trim()) {
      toast.error("Type an answer first.");
      return;
    }
    if (!workUploads[q.id]) {
      toast.error("Upload a photo of your work first.");
      return;
    }
    // Flush pending autosave immediately
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveAnswer(attempt.id, q.id, response, notes[q.id] ?? null);

    const grade = gradeLocally(q, response);
    setChecked((prev) => ({ ...prev, [q.id]: grade }));
    if (grade.awaitingTeacher) {
      // neutral acknowledgement, no sound
    } else if (grade.isCorrect) {
      playCorrect(soundOn);
    } else {
      playIncorrect(soundOn);
    }
  }

  function onNext() {
    if (idx < total - 1) {
      setIdx((i) => i + 1);
    } else {
      onSubmit();
    }
  }

  function onSubmit() {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setPhase("submitting");
    startTransition(async () => {
      try {
        await submitAttempt(attempt.id);
      } catch (e) {
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) return;
        toast.error("Could not submit. Try again.");
        setPhase("answering");
      }
    });
  }

  // -------- BRIEFING SCREEN ---------------------------------------------------
  if (phase === "briefing") {
    return (
      <div className="min-h-screen bg-amber-50/40 dark:bg-neutral-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 sm:p-10">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Sparkles className="h-3 w-3" /> Practice time
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {test.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {test.subject} · Grade {test.grade}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatChip icon={<ListChecks className="h-4 w-4" />} label="Questions" value={String(total)} />
            <StatChip icon={<Clock className="h-4 w-4" />} label="Time limit" value={`${test.duration_min} min`} />
          </div>

          <div className="mt-6 space-y-3">
            <SectionHeading>How this works</SectionHeading>
            <Tip icon={<Camera className="h-4 w-4" />}>
              Do your work on paper, then take a <b>photo</b> and upload it before you check.
            </Tip>
            <Tip icon={<Check className="h-4 w-4" />}>
              Tap <b>Check answer</b>. You&apos;ll see right away if you got it. If not, we&apos;ll show you the right answer.
            </Tip>
            <Tip icon={<StickyNote className="h-4 w-4" />}>
              Need to think? Open the <b>Notes</b> pad — that stays private.
            </Tip>
            <Tip icon={<Clock className="h-4 w-4" />}>
              A friendly chime plays when time is running low.
            </Tip>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex items-center gap-2">
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span>Sound {soundOn ? "on" : "off"}</span>
            </div>
            <button
              onClick={toggleSound}
              className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {soundOn ? "Turn off" : "Turn on"}
            </button>
          </div>

          <Button
            onClick={() => setPhase("answering")}
            size="lg"
            className="mt-8 w-full h-14 text-base"
          >
            <Play className="mr-2 h-5 w-5" />
            Start practising
          </Button>
        </Card>
      </div>
    );
  }

  // -------- SUBMITTING (brief loading gate) -----------------------------------
  if (phase === "submitting") {
    return (
      <div className="min-h-screen bg-amber-50/40 flex items-center justify-center p-6 dark:bg-neutral-950">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center"
          >
            <Sparkles className="h-6 w-6 text-amber-600" />
          </motion.div>
          <p className="text-lg font-medium">Adding up your score…</p>
          <p className="mt-1 text-sm text-muted-foreground">Just a moment</p>
        </div>
      </div>
    );
  }

  // -------- ANSWERING ---------------------------------------------------------
  const grade = q ? checked[q.id] : undefined;
  const percentDone = (answeredCount / total) * 100;

  return (
    <div className="min-h-screen bg-amber-50/40 dark:bg-neutral-950">
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">
              {test.subject} · Grade {test.grade}
            </div>
            <div className="truncate text-sm font-semibold">{test.title}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-amber-500" />
              {correctCount} of {answeredCount || 0}
            </div>
            <button
              onClick={toggleSound}
              className="text-muted-foreground hover:text-foreground"
              aria-label={soundOn ? "Mute" : "Unmute"}
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <div
              className={`rounded-md px-3 py-1 font-mono text-sm tabular-nums transition-colors ${
                remaining <= 60_000
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse"
                  : "bg-muted"
              }`}
            >
              {String(remMin).padStart(2, "0")}:{String(remSec).padStart(2, "0")}
            </div>
          </div>
        </div>
        <div className="relative h-1.5 w-full bg-muted overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-amber-400"
            animate={{ width: `${percentDone}%` }}
            transition={{ duration: 0.35 }}
          />
          {/* milestone stars */}
          {[25, 50, 75].map((m) => (
            <span
              key={m}
              className="absolute top-0 h-full w-px bg-background/50"
              style={{ left: `${m}%` }}
            />
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Question <span className="font-semibold text-foreground">{idx + 1}</span> of {total}
          </span>
          <span className="hidden sm:inline">{answeredCount} answered</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="rounded-3xl border-2 bg-background p-6 shadow-sm sm:p-8"
          >
            <p className="text-xl leading-relaxed sm:text-2xl font-medium">{q.prompt}</p>

            <div className="mt-6">
              {q.type === "mcq" && q.choices ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {q.choices.map((c, ci) => {
                    const selected = responses[q.id] === String(c);
                    const isCorrectChoice = grade && String(c) === grade.correctAnswer;
                    const isWrongChoiceSelected = grade && selected && !grade.isCorrect;
                    let cls = "border-transparent bg-muted/40 hover:border-muted-foreground/20";
                    if (isChecked) {
                      if (isCorrectChoice) cls = "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40";
                      else if (isWrongChoiceSelected) cls = "border-rose-400 bg-rose-50 dark:bg-rose-950/40";
                      else cls = "border-transparent bg-muted/30 opacity-60";
                    } else if (selected) {
                      cls = "border-amber-400 bg-amber-50 dark:bg-amber-950/40";
                    }
                    return (
                      <button
                        key={ci}
                        disabled={isChecked}
                        onClick={() => setResponse(q.id, String(c))}
                        className={`text-left rounded-2xl border-2 px-4 py-3.5 text-base transition-all disabled:cursor-default ${cls}`}
                      >
                        <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background font-mono text-xs font-semibold">
                          {String.fromCharCode(65 + ci)}
                        </span>
                        {c}
                      </button>
                    );
                  })}
                </div>
              ) : q.type === "numeric" ? (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={responses[q.id] ?? ""}
                  onChange={(e) => setResponse(q.id, e.target.value)}
                  placeholder="Type your answer"
                  disabled={isChecked}
                  className="h-14 max-w-xs text-xl font-medium"
                />
              ) : q.type === "short" ? (
                <Input
                  value={responses[q.id] ?? ""}
                  onChange={(e) => setResponse(q.id, e.target.value)}
                  placeholder="Write your answer"
                  disabled={isChecked}
                  className="h-12 text-base"
                />
              ) : (
                <Textarea
                  rows={5}
                  value={responses[q.id] ?? ""}
                  onChange={(e) => setResponse(q.id, e.target.value)}
                  placeholder="Write your answer"
                  disabled={isChecked}
                  className="text-base"
                />
              )}
            </div>

            {/* Show your work — upload a photo of paper work (required) */}
            <div className="mt-6">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  <Camera className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-medium">
                  Show your work
                </span>
                <span className="text-xs text-muted-foreground">(photo of your paper — required)</span>
              </div>
              <WorkUpload
                questionId={q.id}
                current={workUploads[q.id]}
                uploading={!!uploading[q.id]}
                disabled={isChecked}
                onFile={(f) => uploadWork(q.id, f)}
                onClear={() => setWorkUploads((prev) => {
                  const next = { ...prev };
                  delete next[q.id];
                  return next;
                })}
              />
            </div>

            <AnimatePresence>
              {isChecked && grade && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, type: "spring", stiffness: 300, damping: 22 }}
                  className={`mt-6 rounded-2xl p-4 sm:p-5 ${
                    grade.awaitingTeacher
                      ? "bg-sky-50 border border-sky-200 dark:bg-sky-950/30 dark:border-sky-800"
                      : grade.isCorrect
                      ? "bg-emerald-50 border border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800"
                      : "bg-amber-50 border border-amber-300 dark:bg-amber-950/30 dark:border-amber-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${
                        grade.awaitingTeacher
                          ? "bg-sky-500"
                          : grade.isCorrect
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                    >
                      {grade.awaitingTeacher ? (
                        <Info className="h-5 w-5" />
                      ) : grade.isCorrect ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: [0, 1.4, 1] }}
                          transition={{ duration: 0.5 }}
                        >
                          <Check className="h-5 w-5" strokeWidth={3} />
                        </motion.span>
                      ) : (
                        <span className="font-bold">!</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {grade.awaitingTeacher
                          ? "Answer saved"
                          : grade.isCorrect
                          ? grade.feedback
                          : grade.feedback}
                      </p>
                      {!grade.awaitingTeacher && !grade.isCorrect && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          The correct answer is{" "}
                          <span className="font-medium text-foreground">{grade.correctAnswer}</span>.
                        </p>
                      )}
                      {grade.awaitingTeacher && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Your teacher will look at this one.
                        </p>
                      )}
                    </div>
                    {grade.isCorrect && !grade.awaitingTeacher && (
                      <StarBurst />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {showNotes && (
              <div className="mt-6 rounded-xl border border-dashed p-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <StickyNote className="h-3.5 w-3.5" /> Scratch notes (only you see these)
                </div>
                <Textarea
                  rows={3}
                  value={notes[q.id] ?? ""}
                  onChange={(e) => setNote(q.id, e.target.value)}
                  placeholder="Try things out here…"
                  className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotes((v) => !v)}
          >
            <StickyNote className="mr-1 h-4 w-4" />
            {showNotes ? "Hide notes" : "Notes"}
          </Button>
          {!isChecked ? (
            <Button onClick={onCheck} size="lg" className="min-w-[160px] h-12 text-base">
              <Check className="mr-1.5 h-4 w-4" /> Check answer
            </Button>
          ) : (
            <Button
              onClick={onNext}
              size="lg"
              disabled={pending}
              className="min-w-[160px] h-12 text-base"
            >
              {idx < total - 1 ? (
                <>Next question →</>
              ) : (
                <>
                  <Send className="mr-1.5 h-4 w-4" /> See my results
                </>
              )}
            </Button>
          )}
        </div>

        {/* Question map */}
        <div className="mt-10">
          <div className="mb-2 text-xs text-muted-foreground">Progress</div>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((qq, qi) => {
              const g = checked[qq.id];
              const active = qi === idx;
              let cls = "bg-muted text-muted-foreground";
              if (g) {
                cls = g.awaitingTeacher
                  ? "bg-sky-200 text-sky-900 dark:bg-sky-900 dark:text-sky-100"
                  : g.isCorrect
                  ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100"
                  : "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100";
              }
              if (active) cls = "bg-foreground text-background";
              return (
                <button
                  key={qq.id}
                  onClick={() => setIdx(qi)}
                  className={`h-8 w-8 rounded-md text-xs font-mono transition-all ${cls}`}
                  aria-label={`Question ${qi + 1}`}
                >
                  {qi + 1}
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Small helpers -----------------------------------------------------------

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold">{value}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
      {children}
    </div>
  );
}

function Tip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
        {icon}
      </div>
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}

function WorkUpload({
  questionId,
  current,
  uploading,
  disabled,
  onFile,
  onClear,
}: {
  questionId: string;
  current: WorkFile | undefined;
  uploading: boolean;
  disabled: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputId = `work-${questionId}`;
  const isImage = current?.mime?.startsWith("image/");
  const isPdf = current?.mime === "application/pdf";

  if (current) {
    return (
      <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
        <div className="flex items-start gap-3">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.url}
              alt="Your work"
              className="h-24 w-24 shrink-0 rounded-lg object-cover ring-1 ring-emerald-200"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-white text-rose-600 ring-1 ring-emerald-200">
              <FileText className="h-8 w-8" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
              Work uploaded
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isPdf ? "PDF ready to submit." : "Photo ready to submit."}{" "}
              {!disabled && "You can replace it below."}
            </p>
            {!disabled && (
              <div className="mt-3 flex gap-2">
                <label
                  htmlFor={inputId}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:border-foreground/40"
                >
                  <Upload className="h-3.5 w-3.5" /> Replace
                </label>
                <button
                  type="button"
                  onClick={onClear}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            )}
          </div>
        </div>
        <input
          id={inputId}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <>
      <input
        id={inputId}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
        disabled={disabled}
      />
      <label
        htmlFor={inputId}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-8 text-center transition-colors ${
          disabled
            ? "pointer-events-none opacity-50"
            : "cursor-pointer hover:border-amber-400 hover:bg-amber-50/40 dark:hover:bg-amber-950/20"
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            <span className="text-sm text-muted-foreground">Uploading your work…</span>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">Take a photo of your paper</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                or pick an image / PDF (12 MB max)
              </p>
            </div>
          </>
        )}
      </label>
    </>
  );
}

function StarBurst() {
  return (
    <div className="relative h-9 w-9 shrink-0">
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const dx = Math.cos(angle) * 22;
        const dy = Math.sin(angle) * 22;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: dx, y: dy, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}
