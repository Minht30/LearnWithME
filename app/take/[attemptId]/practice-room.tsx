"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { saveAnswer, submitAttempt } from "@/app/actions/student-actions";
import type { DbAttempt, DbQuestion, DbTest } from "@/lib/db/types";
import {
  ChevronLeft,
  ChevronRight,
  StickyNote,
  Send,
  Volume2,
  VolumeX,
} from "lucide-react";

type Props = {
  attempt: DbAttempt;
  test: DbTest;
  questions: DbQuestion[];
  initialResponses: Record<string, string>;
  initialNotes: Record<string, string>;
};

// --- Timer ring: synthesized in-browser via WebAudio, no asset needed --------
function playRing(enabled: boolean) {
  if (!enabled) return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.15;
    o.connect(g).connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.frequency.value = 660;
    }, 180);
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 420);
  } catch {
    /* audio unavailable */
  }
}

export function PracticeRoom({
  attempt,
  test,
  questions,
  initialResponses,
  initialNotes,
}: Props) {
  const [idx, setIdx] = useState(0);
  const [responses, setResponses] = useState(initialResponses);
  const [notes, setNotes] = useState(initialNotes);
  const [showNotes, setShowNotes] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [pending, startTransition] = useTransition();

  const total = questions.length;
  const q = questions[idx];
  const responded = Object.keys(responses).filter((k) => responses[k]?.trim()).length;

  // --- Timer -----------------------------------------------------------------
  const startedMs = new Date(attempt.started_at).getTime();
  const totalMs = test.duration_min * 60_000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.max(0, now - startedMs);
  const remaining = Math.max(0, totalMs - elapsed);
  const remMin = Math.floor(remaining / 60_000);
  const remSec = Math.floor((remaining % 60_000) / 1000);

  // Bells at start, 1 min left, and end.
  const rangStartRef = useRef(false);
  const rangOneMinRef = useRef(false);
  const rangEndRef = useRef(false);
  useEffect(() => {
    if (!rangStartRef.current && elapsed >= 0 && elapsed < 3000) {
      rangStartRef.current = true;
      playRing(soundOn);
    }
    if (!rangOneMinRef.current && remaining > 0 && remaining <= 61_000) {
      rangOneMinRef.current = true;
      playRing(soundOn);
      toast.info("One minute left.");
    }
    if (!rangEndRef.current && remaining <= 0 && totalMs > 0) {
      rangEndRef.current = true;
      playRing(soundOn);
      toast.info("Time's up — please submit.");
    }
  }, [remaining, elapsed, soundOn, totalMs]);

  // --- Debounced autosave ----------------------------------------------------
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  function onSubmit() {
    if (
      responded < total &&
      !confirm(
        `You've answered ${responded} of ${total} questions. Submit anyway?`
      )
    )
      return;
    // Flush pending save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    startTransition(async () => {
      try {
        await submitAttempt(attempt.id);
      } catch (e) {
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) return;
        toast.error("Could not submit. Try again.");
      }
    });
  }

  return (
    <div className="min-h-screen bg-amber-50/40 dark:bg-neutral-950">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">
              {test.subject} · Grade {test.grade}
            </div>
            <div className="truncate text-sm font-semibold">{test.title}</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundOn((v) => !v)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={soundOn ? "Mute" : "Unmute"}
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <div
              className={`rounded-md px-3 py-1 font-mono text-sm tabular-nums ${
                remaining <= 60_000 ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-muted"
              }`}
            >
              {String(remMin).padStart(2, "0")}:{String(remSec).padStart(2, "0")}
            </div>
          </div>
        </div>
        {/* Progress */}
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-amber-400 transition-all"
            style={{ width: `${((idx + 1) / total) * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Question <span className="font-semibold text-foreground">{idx + 1}</span> of {total}
          </span>
          <span>{responded} / {total} answered</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="rounded-2xl border bg-background p-6 shadow-sm sm:p-8"
          >
            <p className="text-lg leading-relaxed sm:text-xl">{q.prompt}</p>

            <div className="mt-6">
              {q.type === "mcq" && q.choices ? (
                <div className="grid gap-2">
                  {q.choices.map((c, ci) => {
                    const selected = responses[q.id] === String(c);
                    return (
                      <button
                        key={ci}
                        onClick={() => setResponse(q.id, String(c))}
                        className={`text-left rounded-xl border-2 px-4 py-3 text-base transition-all ${
                          selected
                            ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40"
                            : "border-transparent bg-muted/40 hover:border-muted-foreground/20"
                        }`}
                      >
                        <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background font-mono text-xs">
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
                  className="h-12 max-w-xs text-lg"
                />
              ) : q.type === "short" ? (
                <Input
                  value={responses[q.id] ?? ""}
                  onChange={(e) => setResponse(q.id, e.target.value)}
                  placeholder="Write your answer"
                  className="h-12 text-base"
                />
              ) : (
                <Textarea
                  rows={6}
                  value={responses[q.id] ?? ""}
                  onChange={(e) => setResponse(q.id, e.target.value)}
                  placeholder="Write your answer"
                  className="text-base"
                />
              )}
            </div>

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

        {/* Bottom bar */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotes((v) => !v)}
          >
            <StickyNote className="mr-1 h-4 w-4" />
            {showNotes ? "Hide notes" : "Show notes"}
          </Button>
          {idx < total - 1 ? (
            <Button onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={onSubmit} disabled={pending}>
              <Send className="mr-1 h-4 w-4" />
              {pending ? "Submitting…" : "Submit"}
            </Button>
          )}
        </div>

        {/* Question map */}
        <div className="mt-8">
          <div className="mb-2 text-xs text-muted-foreground">Jump to question</div>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((qq, qi) => {
              const done = !!responses[qq.id]?.trim();
              const active = qi === idx;
              return (
                <button
                  key={qq.id}
                  onClick={() => setIdx(qi)}
                  className={`h-8 w-8 rounded-md text-xs font-mono transition-all ${
                    active
                      ? "bg-foreground text-background"
                      : done
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                  }`}
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
