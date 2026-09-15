"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { saveAnswer, submitAttempt } from "@/app/actions/student-actions";
import { uploadExplanationFile } from "@/app/actions/upload-explanation";
import {
  playChime, playCorrect, playIncorrect, playStreak, playSubmit, playTick,
} from "@/lib/sounds";
import { useSoundPref, useEncouragementPref } from "@/lib/theme";
import { AppHeaderControls, AppBrand } from "@/components/ui/app-header";
import { StreakBadge } from "@/components/ui/streak-badge";
import { Mascot, type MascotMood } from "@/components/ui/mascot";
import type { DbAttempt, DbQuestion, DbTest } from "@/lib/db/types";
import { RichText } from "@/components/ui/rich-text";
import { parseCloze } from "@/lib/render/rich-text";
import {
  StickyNote, Send, Play, Check, Sparkles, Camera, Clock, ListChecks, Info,
  Upload, FileText, X as XIcon, Loader2, Wand2,
} from "lucide-react";

type WorkFile = { url: string; mime: string; path: string };
type QuestionWithMedia = DbQuestion & { imageUrl?: string | null };

type Props = {
  attempt: DbAttempt;
  test: DbTest;
  questions: QuestionWithMedia[];
  initialResponses: Record<string, string>;
  initialNotes: Record<string, string>;
  initialWork: Record<string, WorkFile>;
  isPreview?: boolean;
};

type LocalGrade = {
  isCorrect: boolean;
  correctAnswer: string;
  feedback: string;
  awaitingTeacher?: boolean;
};

type Phase = "briefing" | "answering" | "submitting";

const ENCOURAGEMENTS = [
  "Nice work!", "You got it!", "Right on!", "Great job!", "Yes!",
  "That's it!", "Perfect!", "Beautiful!", "You're on fire!",
];

function stableEncouragement(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ENCOURAGEMENTS[Math.abs(h) % ENCOURAGEMENTS.length];
}

function normalizeCorrect(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function blankEq(a: string, b: string) {
  const na = parseFloat(a); const nb = parseFloat(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && String(na) === a.trim() && String(nb) === b.trim()) {
    return Math.abs(na - nb) < 1e-6;
  }
  return norm(a) === norm(b);
}

function gradeLocally(q: DbQuestion, response: string): LocalGrade {
  const trimmed = (response ?? "").trim();
  const correctAnswer = normalizeCorrect(q.correct);

  if (q.type === "passage") {
    return { isCorrect: true, correctAnswer: "", feedback: "" };
  }
  if (q.type === "mcq") {
    const ok = trimmed.toLowerCase() === correctAnswer.toLowerCase();
    return {
      isCorrect: ok,
      correctAnswer,
      feedback: ok ? stableEncouragement(q.id) : "Not quite — here's the right answer.",
    };
  }
  if (q.type === "true_false") {
    const ok = trimmed.toLowerCase() === correctAnswer.toLowerCase();
    return { isCorrect: ok, correctAnswer, feedback: ok ? stableEncouragement(q.id) : "Not quite." };
  }
  if (q.type === "multi_select") {
    const correctArr = (Array.isArray(q.correct) ? q.correct : [String(q.correct)]).map(norm).sort();
    let studentArr: string[] = [];
    try { const p = JSON.parse(trimmed || "[]"); if (Array.isArray(p)) studentArr = p.map((x) => norm(String(x))).sort(); } catch { /* empty */ }
    const ok = correctArr.length === studentArr.length && correctArr.every((c, i) => c === studentArr[i]);
    return {
      isCorrect: ok,
      correctAnswer,
      feedback: ok ? stableEncouragement(q.id) : "Check the boxes again.",
    };
  }
  if (q.type === "cloze" || q.type === "word_bank") {
    const correctArrRaw = Array.isArray(q.correct) ? q.correct : [String(q.correct)];
    let studentArr: string[] = [];
    try { const p = JSON.parse(trimmed || "[]"); if (Array.isArray(p)) studentArr = p.map((x) => String(x)); } catch { /* empty */ }
    while (studentArr.length < correctArrRaw.length) studentArr.push("");
    const matches = correctArrRaw.filter((c, i) => blankEq(String(c), studentArr[i])).length;
    const ok = matches === correctArrRaw.length;
    return {
      isCorrect: ok,
      correctAnswer,
      feedback: ok ? stableEncouragement(q.id) : `Got ${matches} of ${correctArrRaw.length} blanks.`,
    };
  }
  if (q.type === "highlight") {
    const correctSet = new Set((Array.isArray(q.correct) ? q.correct : [String(q.correct)]).map(norm));
    let studentSet = new Set<string>();
    try { const p = JSON.parse(trimmed || "[]"); if (Array.isArray(p)) studentSet = new Set(p.map((x) => norm(String(x)))); } catch { /* empty */ }
    const hits = [...correctSet].filter((c) => studentSet.has(c)).length;
    const wrong = [...studentSet].filter((c) => !correctSet.has(c)).length;
    const ok = hits === correctSet.size && wrong === 0;
    return {
      isCorrect: ok,
      correctAnswer: [...correctSet].join(", "),
      feedback: ok ? stableEncouragement(q.id) : `Found ${hits} of ${correctSet.size}${wrong ? `, ${wrong} extra` : ""}.`,
    };
  }
  if (q.type === "match") {
    const leftArr = Array.isArray(q.choices) ? q.choices : [];
    const rightArr = Array.isArray(q.correct) ? q.correct : [String(q.correct)];
    let studentMap: Record<string, number> = {};
    try {
      const p = JSON.parse(trimmed || "{}");
      if (p && typeof p === "object" && !Array.isArray(p)) studentMap = p as Record<string, number>;
    } catch { /* empty */ }
    let matches = 0;
    for (let i = 0; i < leftArr.length; i++) {
      const pick = studentMap[String(i)];
      if (typeof pick === "number" && norm(String(rightArr[pick] ?? "")) === norm(String(rightArr[i] ?? ""))) {
        matches++;
      }
    }
    const ok = matches === leftArr.length && leftArr.length > 0;
    return {
      isCorrect: ok,
      correctAnswer,
      feedback: ok ? stableEncouragement(q.id) : `Matched ${matches} of ${leftArr.length}.`,
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
  return {
    isCorrect: false,
    correctAnswer,
    feedback: "Saved. Your teacher will review this one.",
    awaitingTeacher: true,
  };
}

export function PracticeRoom({
  attempt, test, questions, initialResponses, initialNotes, initialWork, isPreview,
}: Props) {
  const [phase, setPhase] = useState<Phase>("briefing");
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [responses, setResponses] = useState(initialResponses);
  const [notes, setNotes] = useState(initialNotes);
  const [workUploads, setWorkUploads] = useState<Record<string, WorkFile>>(initialWork);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Record<string, LocalGrade>>({});
  const [showNotes, setShowNotes] = useState(false);
  const [pending, startTransition] = useTransition();
  const [streak, setStreak] = useState(0);
  const [mascot, setMascot] = useState<MascotMood>("wave");

  const { sound } = useSoundPref();
  const [enc] = useEncouragementPref();

  const total = questions.length;
  const q = questions[idx];
  const isChecked = q ? !!checked[q.id] : false;
  const answeredCount = Object.keys(checked).length;
  const correctCount = Object.values(checked).filter((g) => g.isCorrect).length;

  // --- Timer (only ticks in "answering") --------------------------------------
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
  const lastTickRef = useRef(0);
  useEffect(() => {
    if (phase !== "answering") return;
    if (!rangStartRef.current) { rangStartRef.current = true; playChime(sound); }
    if (!rangOneMinRef.current && remaining > 0 && remaining <= 61_000) {
      rangOneMinRef.current = true;
      playChime(sound);
      toast.info("One minute left.");
    }
    if (!rangEndRef.current && remaining <= 0 && totalMs > 0) {
      rangEndRef.current = true;
      playChime(sound);
      toast.info("Time's up — submit when you're ready.");
    }
    // sub-10s ticking
    if (remaining > 0 && remaining <= 10_000) {
      const sec = Math.floor(remaining / 1000);
      if (sec !== lastTickRef.current) {
        lastTickRef.current = sec;
        playTick(sound);
      }
    }
  }, [phase, remaining, totalMs, sound]);

  // --- Debounced autosave ------------------------------------------------------
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = useCallback(
    (questionId: string, response: string, note: string | null) => {
      if (isPreview) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveAnswer(attempt.id, questionId, response, note);
      }, 600);
    },
    [attempt.id, isPreview]
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
    if (isPreview) {
      // In preview: just fake-attach so the check button unlocks
      setWorkUploads((prev) => ({ ...prev, [qid]: { url: URL.createObjectURL(file), mime: file.type, path: "preview" } }));
      return;
    }
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
    if (q.type === "passage") { onNext(); return; }
    const response = responses[q.id] ?? "";
    if (!response.trim()) { toast.error("Answer the question first."); return; }
    const requiresWork = q.type === "numeric" || q.type === "short" || q.type === "long";
    if (requiresWork && !workUploads[q.id]) {
      toast.error("Upload a photo of your work first.");
      return;
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (!isPreview) saveAnswer(attempt.id, q.id, response, notes[q.id] ?? null);

    const grade = gradeLocally(q, response);
    setChecked((prev) => ({ ...prev, [q.id]: grade }));

    if (grade.awaitingTeacher) {
      setMascot("thinking");
    } else if (grade.isCorrect) {
      const next = streak + 1;
      setStreak(next);
      setMascot("cheer");
      if (next >= 3 && next % 3 === 0) {
        playStreak(sound);
        toast.success(`${next} in a row! You're on fire!`, {
          icon: <Sparkles className="h-4 w-4" />,
        });
      } else {
        playCorrect(sound);
      }
    } else {
      setStreak(0);
      setMascot("sad");
      playIncorrect(sound);
    }
  }

  function onNext() {
    if (idx < total - 1) {
      setDir(1);
      setIdx((i) => i + 1);
      setMascot("thinking");
    } else {
      onSubmit();
    }
  }

  function onPrev() {
    if (idx > 0) {
      setDir(-1);
      setIdx((i) => i - 1);
    }
  }

  function onSubmit() {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (isPreview) {
      toast.success("Preview finished — nothing was saved.");
      window.close();
      return;
    }
    setPhase("submitting");
    playSubmit(sound);
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
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <AppBrand />
            <AppHeaderControls />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="lwm-card lwm-scanlines w-full max-w-2xl p-8 sm:p-10 relative overflow-hidden"
          >
            <div className="absolute -top-8 -right-8 opacity-70 dark:opacity-90">
              <Mascot mood="wave" size={110} />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--brand)_15%,transparent)] px-2.5 py-1 text-xs font-semibold text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]">
              <Sparkles className="h-3 w-3" /> Practice time
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {test.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {test.subject} · Grade {test.grade}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <StatChip icon={<ListChecks className="h-4 w-4" />} label="Questions" value={String(total)} />
              <StatChip icon={<Clock className="h-4 w-4" />} label="Time limit" value={`${test.duration_min} min`} />
            </div>

            <div className="mt-6 space-y-2.5">
              <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                How this works
              </div>
              <Tip icon={<Camera className="h-4 w-4" />}>
                Do your work on paper, snap a <b>photo</b>, then upload it before you check.
              </Tip>
              <Tip icon={<Check className="h-4 w-4" />}>
                Tap <b>Check answer</b> — you&apos;ll see right away if you got it.
              </Tip>
              <Tip icon={<Wand2 className="h-4 w-4" />}>
                Answer <b>3 in a row</b> for a streak — the higher, the better!
              </Tip>
              <Tip icon={<Clock className="h-4 w-4" />}>
                A friendly chime plays when time is running low.
              </Tip>
            </div>

            <Button
              onClick={() => { setPhase("answering"); setMascot("thinking"); }}
              size="lg"
              variant="candy"
              className="mt-8 h-14 w-full px-6 text-base"
            >
              <Play className="mr-2 h-5 w-5" />
              Start practising
            </Button>
          </motion.div>
        </main>
      </div>
    );
  }

  // -------- SUBMITTING (brief loading gate) -----------------------------------
  if (phase === "submitting") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Mascot mood="cheer" size={120} />
          </motion.div>
          <p className="mt-4 font-display text-2xl font-semibold">Adding up your score…</p>
          <p className="mt-1 text-sm text-muted-foreground">Just a moment</p>
        </div>
      </div>
    );
  }

  // -------- ANSWERING ---------------------------------------------------------
  const grade = q ? checked[q.id] : undefined;
  const percentDone = (answeredCount / total) * 100;
  const timerHot = remaining <= 60_000;
  const timerCritical = remaining <= 10_000;

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#question" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-primary-foreground">
        Skip to current question
      </a>
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur zen-hide">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <AppBrand />
            <div className="hidden sm:block h-5 w-px bg-border" />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">
                {test.subject} · Grade {test.grade}
              </div>
              <div className="truncate text-sm font-semibold">{test.title}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StreakBadge count={streak} />
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-[var(--brand)]" />
              {correctCount} of {answeredCount || 0}
            </div>
            <div
              role="timer"
              aria-live={timerCritical ? "assertive" : "polite"}
              aria-label={`Time remaining: ${remMin} minutes ${remSec} seconds`}
              className={`rounded-full px-3 py-1 font-mono text-sm tabular-nums transition-colors ${
                timerCritical
                  ? "bg-[var(--danger)] text-white lwm-heartbeat shadow-lg"
                  : timerHot
                  ? "bg-[color-mix(in_oklab,var(--warning)_25%,transparent)] text-[color-mix(in_oklab,var(--warning)_90%,black)] dark:text-[var(--warning)]"
                  : "bg-muted text-foreground"
              }`}
            >
              {String(remMin).padStart(2, "0")}:{String(remSec).padStart(2, "0")}
            </div>
            <AppHeaderControls />
          </div>
        </div>
        <div
          className="lwm-progress h-1.5 rounded-none"
          role="progressbar"
          aria-valuenow={Math.round(percentDone)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Test progress: ${answeredCount} of ${total} answered`}
        >
          <div className="fill" style={{ width: `${percentDone}%` }} />
        </div>
      </header>

      <main id="question" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 relative">
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground zen-hide">
          <span>
            Question <span className="font-semibold text-foreground">{idx + 1}</span> of {total}
          </span>
          <div className="flex items-center gap-2">
            {mascot && <Mascot mood={mascot} size={36} />}
            <span className="hidden sm:inline">{answeredCount} answered</span>
          </div>
        </div>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={q.id}
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 40, scale: 0.98 }),
              center: { opacity: 1, x: 0, scale: 1 },
              exit: (d: number) => ({ opacity: 0, x: d * -40, scale: 0.98 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="lwm-card lwm-scanlines p-6 sm:p-8"
          >
            {q.type !== "cloze" && (
              <RichText
                html={q.prompt}
                className="font-display text-2xl leading-relaxed sm:text-3xl font-semibold"
              />
            )}

            {q.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={q.imageUrl}
                alt=""
                className="mt-4 max-h-80 rounded-2xl border bg-background object-contain"
              />
            )}

            <div className="mt-6">
              {q.type === "passage" ? (
                <div className="rounded-2xl border-2 border-dashed border-[var(--brand)]/40 bg-[color-mix(in_oklab,var(--brand)_5%,transparent)] p-4 text-sm text-muted-foreground">
                  Read the passage above, then continue.
                </div>
              ) : q.type === "highlight" ? (
                <HighlightAnswer
                  q={q}
                  value={responses[q.id] ?? ""}
                  disabled={isChecked}
                  onChange={(v) => setResponse(q.id, v)}
                />
              ) : q.type === "match" ? (
                <MatchAnswer
                  q={q}
                  value={responses[q.id] ?? ""}
                  disabled={isChecked}
                  onChange={(v) => setResponse(q.id, v)}
                />
              ) : q.type === "word_bank" ? (
                <WordBankAnswer
                  q={q}
                  value={responses[q.id] ?? ""}
                  disabled={isChecked}
                  onChange={(v) => setResponse(q.id, v)}
                />
              ) : q.type === "cloze" ? (
                <ClozeAnswer
                  q={q}
                  value={responses[q.id] ?? ""}
                  disabled={isChecked}
                  onChange={(v) => setResponse(q.id, v)}
                />
              ) : q.type === "true_false" ? (
                <div className="flex gap-3" role="radiogroup" aria-label="True or False">
                  {["true", "false"].map((v) => {
                    const selected = responses[q.id] === v;
                    return (
                      <motion.button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        whileTap={{ scale: 0.96 }}
                        disabled={isChecked}
                        onClick={() => setResponse(q.id, v)}
                        className={`h-14 flex-1 rounded-2xl border-2 px-6 text-lg font-bold capitalize transition-all ${
                          selected
                            ? "border-[var(--brand)] bg-[color-mix(in_oklab,var(--brand)_15%,transparent)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_18%,transparent)]"
                            : "border-border bg-muted/30 hover:border-[var(--brand)]"
                        }`}
                      >
                        {v}
                      </motion.button>
                    );
                  })}
                </div>
              ) : q.type === "multi_select" && q.choices ? (
                <MultiSelectAnswer
                  q={q}
                  value={responses[q.id] ?? ""}
                  disabled={isChecked}
                  onChange={(v) => setResponse(q.id, v)}
                />
              ) : q.type === "mcq" && q.choices ? (
                <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Answer choices">
                  {q.choices.map((c, ci) => {
                    const selected = responses[q.id] === String(c);
                    const isCorrectChoice = grade && String(c) === grade.correctAnswer;
                    const isWrongChoiceSelected = grade && selected && !grade.isCorrect;
                    let cls =
                      "border-border/60 bg-muted/30 hover:border-[var(--brand)] hover:bg-[color-mix(in_oklab,var(--brand)_10%,transparent)]";
                    if (isChecked) {
                      if (isCorrectChoice)
                        cls = "border-[var(--success)] bg-[color-mix(in_oklab,var(--success)_18%,transparent)]";
                      else if (isWrongChoiceSelected)
                        cls = "border-[var(--danger)] bg-[color-mix(in_oklab,var(--danger)_15%,transparent)]";
                      else cls = "border-border/40 bg-muted/20 opacity-55";
                    } else if (selected) {
                      cls =
                        "border-[var(--brand)] bg-[color-mix(in_oklab,var(--brand)_15%,transparent)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_18%,transparent)]";
                    }
                    return (
                      <motion.button
                        key={ci}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        whileTap={{ scale: 0.96 }}
                        whileHover={{ y: -2 }}
                        disabled={isChecked}
                        onClick={() => setResponse(q.id, String(c))}
                        className={`text-left rounded-2xl border-2 px-4 py-3.5 text-base transition-all disabled:cursor-default ${cls}`}
                      >
                        <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background font-mono text-sm font-bold shadow-sm">
                          {String.fromCharCode(65 + ci)}
                        </span>
                        <RichText html={c} inline as="span" />
                      </motion.button>
                    );
                  })}
                </div>
              ) : q.type === "numeric" ? (
                <NumericAnswer
                  value={responses[q.id] ?? ""}
                  disabled={isChecked}
                  onChange={(v) => setResponse(q.id, v)}
                />
              ) : q.type === "short" ? (
                <Input
                  value={responses[q.id] ?? ""}
                  onChange={(e) => setResponse(q.id, e.target.value)}
                  placeholder="Write your answer"
                  disabled={isChecked}
                  className="h-12 text-base rounded-2xl"
                />
              ) : (
                <Textarea
                  rows={5}
                  value={responses[q.id] ?? ""}
                  onChange={(e) => setResponse(q.id, e.target.value)}
                  placeholder="Write your answer"
                  disabled={isChecked}
                  className="text-base rounded-2xl"
                />
              )}
            </div>

            {(q.type === "numeric" || q.type === "short" || q.type === "long") && (
            <div className="mt-6">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--brand)_18%,transparent)] text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]">
                  <Camera className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold">Show your work</span>
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
            )}

            <AnimatePresence>
              {isChecked && grade && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, type: "spring", stiffness: 300, damping: 22 }}
                  role="status"
                  aria-live="polite"
                  className={`mt-6 rounded-2xl p-4 sm:p-5 border-2 ${
                    grade.awaitingTeacher
                      ? "bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] border-[color-mix(in_oklab,var(--accent)_35%,transparent)]"
                      : grade.isCorrect
                      ? "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] border-[color-mix(in_oklab,var(--success)_45%,transparent)]"
                      : "bg-[color-mix(in_oklab,var(--warning)_15%,transparent)] border-[color-mix(in_oklab,var(--warning)_50%,transparent)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${
                        grade.awaitingTeacher
                          ? "bg-[var(--accent)]"
                          : grade.isCorrect
                          ? "bg-[var(--success)] dark:shadow-[0_0_16px_var(--success)]"
                          : "bg-[var(--warning)]"
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
                        <span className="font-bold text-lg">!</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-lg">
                        {enc ? grade.feedback : grade.awaitingTeacher ? "Answer saved" : grade.isCorrect ? "Correct" : "Not quite"}
                      </p>
                      {!grade.awaitingTeacher && !grade.isCorrect && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          The correct answer is{" "}
                          <span className="font-semibold text-foreground">{grade.correctAnswer}</span>.
                        </p>
                      )}
                      {grade.awaitingTeacher && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Your teacher will look at this one.
                        </p>
                      )}
                    </div>
                    {grade.isCorrect && !grade.awaitingTeacher && <StarBurst />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {showNotes && (
              <div className="mt-6 rounded-xl border-2 border-dashed border-[var(--brand)]/40 p-4 bg-[color-mix(in_oklab,var(--brand)_5%,transparent)]">
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes((v) => !v)}
              className="rounded-full"
            >
              <StickyNote className="mr-1 h-4 w-4" />
              {showNotes ? "Hide notes" : "Notes"}
            </Button>
            {idx > 0 && (
              <Button variant="ghost" size="sm" onClick={onPrev} className="rounded-full">
                ← Back
              </Button>
            )}
          </div>
          {q.type === "passage" ? (
            <motion.div whileTap={{ scale: 0.96 }}>
              <Button
                onClick={onNext}
                variant="candy"
                size="lg"
                className="min-w-[180px] h-14 px-6 text-base"
              >
                Continue →
              </Button>
            </motion.div>
          ) : !isChecked ? (
            <motion.div whileTap={{ scale: 0.96 }}>
              <Button
                onClick={onCheck}
                variant="candy"
                size="lg"
                className="min-w-[180px] h-14 px-6 text-base"
              >
                <Check className="mr-1.5 h-5 w-5" /> Check answer
              </Button>
            </motion.div>
          ) : (
            <motion.div whileTap={{ scale: 0.96 }}>
              <Button
                onClick={onNext}
                variant="candy"
                size="lg"
                disabled={pending}
                className="min-w-[180px] h-14 px-6 text-base"
              >
                {idx < total - 1 ? (
                  <>Next question →</>
                ) : (
                  <><Send className="mr-1.5 h-5 w-5" /> See my results</>
                )}
              </Button>
            </motion.div>
          )}
        </div>

        {/* Question map */}
        <div className="mt-10 zen-hide">
          <div className="mb-2 text-xs uppercase tracking-wide font-semibold text-muted-foreground">
            Progress
          </div>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((qq, qi) => {
              const g = checked[qq.id];
              const active = qi === idx;
              let cls = "bg-muted text-muted-foreground border-border";
              if (g) {
                cls = g.awaitingTeacher
                  ? "bg-[color-mix(in_oklab,var(--accent)_20%,transparent)] text-foreground border-[var(--accent)]"
                  : g.isCorrect
                  ? "bg-[color-mix(in_oklab,var(--success)_22%,transparent)] text-foreground border-[var(--success)]"
                  : "bg-[color-mix(in_oklab,var(--warning)_20%,transparent)] text-foreground border-[var(--warning)]";
              }
              if (active) cls = "bg-foreground text-background border-foreground scale-110";
              return (
                <button
                  key={qq.id}
                  onClick={() => { setDir(qi > idx ? 1 : -1); setIdx(qi); }}
                  className={`h-9 w-9 rounded-lg border-2 text-xs font-mono font-bold transition-all ${cls}`}
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
    <div className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function Tip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--brand)_15%,transparent)] text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]">
        {icon}
      </div>
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}

function WorkUpload({
  questionId, current, uploading, disabled, onFile, onClear,
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
      <div className="rounded-2xl border-2 border-[var(--success)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)] p-3">
        <div className="flex items-start gap-3">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.url}
              alt="Your work"
              className="h-24 w-24 shrink-0 rounded-xl object-cover ring-1 ring-[var(--success)]/40"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-background text-[var(--danger)] ring-1 ring-[var(--success)]/40">
              <FileText className="h-8 w-8" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[color-mix(in_oklab,var(--success)_80%,black)] dark:text-[var(--success)]">
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
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-semibold hover:border-foreground/40"
                >
                  <Upload className="h-3.5 w-3.5" /> Replace
                </label>
                <button
                  type="button"
                  onClick={onClear}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
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
            : "cursor-pointer border-[var(--brand)]/40 hover:border-[var(--brand)] hover:bg-[color-mix(in_oklab,var(--brand)_8%,transparent)]"
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
            <span className="text-sm text-muted-foreground">Uploading your work…</span>
          </>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--brand)_15%,transparent)] text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)] shadow-inner">
              <Camera className="h-7 w-7" />
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
    <div className="relative h-10 w-10 shrink-0">
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const dx = Math.cos(angle) * 28;
        const dy = Math.sin(angle) * 28;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--warning)] dark:bg-[var(--brand)] dark:shadow-[0_0_6px_var(--brand)]"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: dx, y: dy, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

function parseArray(json: string): string[] {
  try { const p = JSON.parse(json); return Array.isArray(p) ? p.map(String) : []; }
  catch { return []; }
}

function MultiSelectAnswer({
  q, value, disabled, onChange,
}: {
  q: QuestionWithMedia;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const chosen = parseArray(value);
  function toggle(c: string) {
    const next = chosen.includes(c) ? chosen.filter((x) => x !== c) : [...chosen, c];
    onChange(JSON.stringify(next));
  }
  return (
    <div className="grid gap-2.5 sm:grid-cols-2" role="group" aria-label="Check every correct answer">
      {(q.choices ?? []).map((c, ci) => {
        const selected = chosen.includes(c);
        return (
          <motion.button
            key={ci}
            type="button"
            role="checkbox"
            aria-checked={selected}
            whileTap={{ scale: 0.96 }}
            whileHover={{ y: -2 }}
            disabled={disabled}
            onClick={() => toggle(c)}
            className={`text-left rounded-2xl border-2 px-4 py-3.5 text-base transition-all disabled:cursor-default flex items-center gap-3 ${
              selected
                ? "border-[var(--brand)] bg-[color-mix(in_oklab,var(--brand)_15%,transparent)]"
                : "border-border/60 bg-muted/30 hover:border-[var(--brand)]"
            }`}
          >
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md border-2 shrink-0 ${
              selected
                ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                : "border-border bg-background"
            }`}>
              {selected && <Check className="h-4 w-4" strokeWidth={3} />}
            </span>
            <RichText html={c} inline as="span" />
          </motion.button>
        );
      })}
    </div>
  );
}

function ClozeAnswer({
  q, value, disabled, onChange,
}: {
  q: QuestionWithMedia;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const segments = parseCloze(q.prompt);
  const blanks = parseArray(value);
  const expectedCount = segments.filter((s) => s.kind === "blank").length;
  while (blanks.length < expectedCount) blanks.push("");

  function setBlank(i: number, v: string) {
    const next = [...blanks];
    next[i] = v;
    onChange(JSON.stringify(next));
  }

  return (
    <div className="font-display text-xl leading-loose sm:text-2xl">
      {segments.map((s, i) => {
        if (s.kind === "text") return <span key={i} dangerouslySetInnerHTML={{ __html: s.html }} />;
        return (
          <Input
            key={i}
            value={blanks[s.index] ?? ""}
            onChange={(e) => setBlank(s.index, e.target.value)}
            disabled={disabled}
            aria-label={`Blank ${s.index + 1}`}
            className="inline-block h-10 mx-1 w-32 rounded-xl border-2 border-[var(--brand)]/40 bg-[color-mix(in_oklab,var(--brand)_5%,transparent)] text-base text-center font-medium"
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wave 2 widgets
// ---------------------------------------------------------------------------

const MATH_KEYS = ["7","8","9","÷","4","5","6","×","1","2","3","−","0",".","(",")","π","√","²","³","±","/","x","="];

function NumericAnswer({
  value, disabled, onChange,
}: { value: string; disabled: boolean; onChange: (v: string) => void }) {
  const [padOpen, setPadOpen] = useState(false);
  function insert(k: string) {
    // Some keys map to standard characters for parseFloat friendliness.
    const map: Record<string, string> = { "×": "*", "÷": "/", "−": "-" };
    onChange(value + (map[k] ?? k));
  }
  return (
    <div>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer"
          disabled={disabled}
          className="h-14 max-w-xs text-xl font-medium rounded-2xl"
        />
        {!disabled && (
          <button
            type="button"
            onClick={() => setPadOpen((p) => !p)}
            aria-pressed={padOpen}
            className="inline-flex items-center gap-1 rounded-full border-2 border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-[var(--brand)] hover:text-foreground"
            aria-label="Toggle math keyboard"
          >
            <span aria-hidden>π√</span>
            <span className="hidden sm:inline">Math pad</span>
          </button>
        )}
      </div>
      {padOpen && !disabled && (
        <div className="mt-3 grid grid-cols-4 gap-1.5 max-w-xs rounded-2xl border-2 border-[var(--brand)]/30 bg-[color-mix(in_oklab,var(--brand)_5%,transparent)] p-2">
          {MATH_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => insert(k)}
              className="h-9 rounded-lg bg-background text-sm font-semibold hover:bg-[color-mix(in_oklab,var(--brand)_10%,transparent)]"
              aria-label={`Insert ${k}`}
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange(value.slice(0, -1))}
            className="col-span-4 h-9 rounded-lg border border-[var(--brand)]/40 text-sm font-semibold text-muted-foreground hover:bg-[color-mix(in_oklab,var(--brand)_10%,transparent)]"
            aria-label="Backspace"
          >
            ⌫  Backspace
          </button>
        </div>
      )}
    </div>
  );
}

function HighlightAnswer({
  q, value, disabled, onChange,
}: { q: QuestionWithMedia; value: string; disabled: boolean; onChange: (v: string) => void }) {
  // Tokenize the prompt: keep words and spaces separate so punctuation stays put.
  const tokens = q.prompt.split(/(\s+|[.,;:!?"'()\[\]—-])/).filter((t) => t.length > 0);
  let chosen: string[] = [];
  try { const p = JSON.parse(value || "[]"); if (Array.isArray(p)) chosen = p.map(String); } catch { /* empty */ }
  const chosenLower = new Set(chosen.map((s) => s.toLowerCase()));

  function toggle(word: string) {
    if (disabled) return;
    const key = word.toLowerCase();
    const next = chosenLower.has(key)
      ? chosen.filter((c) => c.toLowerCase() !== key)
      : [...chosen, word];
    onChange(JSON.stringify(next));
  }

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        Click every word that fits — click again to unpick.
      </p>
      <div className="rounded-2xl border-2 border-border bg-muted/20 p-4 text-lg leading-loose">
        {tokens.map((t, i) => {
          if (!/\w/.test(t)) return <span key={i}>{t}</span>;
          const picked = chosenLower.has(t.toLowerCase());
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => toggle(t)}
              aria-pressed={picked}
              className={`inline-block rounded-md px-1 -mx-0.5 transition-colors ${
                picked
                  ? "bg-[var(--brand)] text-primary-foreground font-semibold"
                  : "hover:bg-[color-mix(in_oklab,var(--brand)_15%,transparent)]"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchAnswer({
  q, value, disabled, onChange,
}: { q: QuestionWithMedia; value: string; disabled: boolean; onChange: (v: string) => void }) {
  const leftArr = Array.isArray(q.choices) ? q.choices : [];
  const rightArr = Array.isArray(q.correct) ? q.correct : [String(q.correct)];
  // Shuffle right column display order deterministically per question so it doesn't
  // reshuffle on every render but is different from left order.
  const rightOrder = deterministicShuffle(rightArr.map((_, i) => i), q.id);

  let mapping: Record<string, number> = {};
  try {
    const p = JSON.parse(value || "{}");
    if (p && typeof p === "object" && !Array.isArray(p)) mapping = p as Record<string, number>;
  } catch { /* empty */ }

  function pick(leftIdx: number, rightIdx: number) {
    if (disabled) return;
    const next = { ...mapping };
    // If this rightIdx was already assigned elsewhere, clear it there.
    for (const k of Object.keys(next)) if (next[k] === rightIdx) delete next[k];
    next[String(leftIdx)] = rightIdx;
    onChange(JSON.stringify(next));
  }

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        For each item on the left, tap its match on the right.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {leftArr.map((left, li) => {
          const picked = mapping[String(li)];
          return (
            <div key={li} className="contents">
              <div className={`rounded-xl border-2 px-3 py-2 text-sm ${
                typeof picked === "number"
                  ? "border-[var(--brand)] bg-[color-mix(in_oklab,var(--brand)_10%,transparent)]"
                  : "border-border bg-muted/30"
              }`}>
                <span className="mr-2 font-mono text-xs text-muted-foreground">{li + 1}.</span>
                <RichText html={left} inline as="span" />
                {typeof picked === "number" && (
                  <span className="ml-2 text-xs text-[var(--brand)]">→ {String.fromCharCode(65 + picked)}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {rightOrder.map((ri) => {
                  const isMine = picked === ri;
                  return (
                    <button
                      key={ri}
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(li, ri)}
                      className={`rounded-full border-2 px-2.5 py-1 text-xs font-semibold transition-all ${
                        isMine
                          ? "border-[var(--brand)] bg-[var(--brand)] text-primary-foreground"
                          : "border-border bg-background hover:border-[var(--brand)]"
                      }`}
                    >
                      <span className="mr-1 opacity-70">{String.fromCharCode(65 + ri)}.</span>
                      <RichText html={String(rightArr[ri])} inline as="span" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WordBankAnswer({
  q, value, disabled, onChange,
}: { q: QuestionWithMedia; value: string; disabled: boolean; onChange: (v: string) => void }) {
  const segments = parseCloze(q.prompt);
  const blanks = segments.filter((s) => s.kind === "blank").length;
  const bank = (Array.isArray(q.choices) ? q.choices : []).filter((w) => w.trim());

  let picks: (string | null)[] = [];
  try {
    const p = JSON.parse(value || "[]");
    if (Array.isArray(p)) picks = p.map((v) => (v == null ? null : String(v)));
  } catch { /* empty */ }
  while (picks.length < blanks) picks.push(null);

  const usedCounts: Record<string, number> = {};
  for (const p of picks) if (p) usedCounts[p] = (usedCounts[p] ?? 0) + 1;

  function assign(blankIdx: number, word: string) {
    const next = [...picks];
    next[blankIdx] = word;
    onChange(JSON.stringify(next));
  }
  function clearBlank(blankIdx: number) {
    const next = [...picks];
    next[blankIdx] = null;
    onChange(JSON.stringify(next));
  }

  const [activeBlank, setActiveBlank] = useState<number | null>(null);

  return (
    <div>
      <div className="font-display text-xl leading-loose sm:text-2xl">
        {segments.map((s, i) => {
          if (s.kind === "text") return <span key={i} dangerouslySetInnerHTML={{ __html: s.html }} />;
          const p = picks[s.index];
          const isActive = activeBlank === s.index;
          return (
            <button
              key={i}
              type="button"
              onClick={() => (disabled ? undefined : (p ? clearBlank(s.index) : setActiveBlank(s.index)))}
              disabled={disabled}
              aria-label={p ? `Blank ${s.index + 1} filled with ${p}. Click to clear.` : `Blank ${s.index + 1}. Click, then pick from bank.`}
              className={`mx-1 inline-block min-w-[6rem] rounded-xl border-2 px-3 py-1 text-base font-medium transition-all ${
                isActive
                  ? "border-[var(--brand)] bg-[color-mix(in_oklab,var(--brand)_20%,transparent)] ring-4 ring-[color-mix(in_oklab,var(--brand)_15%,transparent)]"
                  : p
                  ? "border-[var(--brand)] bg-[color-mix(in_oklab,var(--brand)_10%,transparent)]"
                  : "border-dashed border-[var(--brand)]/40 bg-[color-mix(in_oklab,var(--brand)_5%,transparent)] text-muted-foreground"
              }`}
            >
              {p ?? "___"}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs text-muted-foreground">
          {activeBlank == null
            ? "Tap a blank above, then choose a word."
            : `Choose a word for blank ${activeBlank + 1}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          {bank.map((w, wi) => {
            const usedElsewhere = usedCounts[w] > 0 && !picks.includes(w);
            return (
              <button
                key={wi}
                type="button"
                disabled={disabled || activeBlank == null}
                onClick={() => {
                  if (activeBlank == null) return;
                  assign(activeBlank, w);
                  // Jump to next unfilled blank if any
                  const next = picks.findIndex((v, i) => v == null && i !== activeBlank);
                  setActiveBlank(next === -1 ? null : next);
                }}
                className={`rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-all ${
                  usedElsewhere
                    ? "border-border/40 bg-muted/20 text-muted-foreground line-through"
                    : "border-border bg-background hover:border-[var(--brand)] hover:bg-[color-mix(in_oklab,var(--brand)_10%,transparent)]"
                } ${activeBlank == null ? "opacity-50" : ""}`}
              >
                {w}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Deterministic shuffle for match-right column, seeded by question id
function deterministicShuffle<T>(arr: T[], seed: string): T[] {
  const out = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const rand = () => {
    h = (h * 9301 + 49297) & 0x7fffffff;
    return h / 0x7fffffff;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
