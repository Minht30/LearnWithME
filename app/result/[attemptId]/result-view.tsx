"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Sparkles, FileText } from "lucide-react";
import { Confetti } from "@/components/ui/confetti";
import { Mascot } from "@/components/ui/mascot";
import { AppBrand, AppHeaderControls } from "@/components/ui/app-header";
import { playSubmit } from "@/lib/sounds";
import { useSoundPref } from "@/lib/theme";
import type { DbAnswer, DbQuestion, DbStudent } from "@/lib/db/types";

type EnrichedAnswer = DbAnswer & { workUrl?: string };

function useCountUp(target: number, duration = 900): number {
  const [v, setV] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(eased * target));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return v;
}

export function ResultView({
  questions, answers, student, percent, correctCount,
}: {
  questions: DbQuestion[];
  answers: EnrichedAnswer[];
  student: DbStudent | null;
  percent: number;
  correctCount: number;
}) {
  const answerMap = new Map(answers.map((a) => [a.question_id, a]));
  const total = questions.length;
  const displayPercent = useCountUp(percent);
  const [fire, setFire] = useState<number | null>(null);
  const { sound } = useSoundPref();

  useEffect(() => {
    if (percent >= 70) {
      const t = setTimeout(() => { setFire(Date.now()); playSubmit(sound); }, 400);
      return () => clearTimeout(t);
    }
  }, [percent, sound]);

  const message =
    percent >= 90 ? "Wow — great job! Look at those results."
      : percent >= 70 ? "Nice work! You've got most of it."
      : percent >= 50 ? "You're getting there. Let's review the tricky ones."
      : "Every practice makes you stronger. Let's look at what to try again.";

  const mood = percent >= 70 ? "cheer" : percent >= 40 ? "thinking" : "sad";

  return (
    <div className="min-h-screen flex flex-col">
      {fire !== null && <Confetti fire={fire} />}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <AppBrand />
          <AppHeaderControls />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full bg-[color-mix(in_oklab,var(--brand)_15%,transparent)] px-3 py-1 text-xs font-semibold text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]">
            <Sparkles className="h-3.5 w-3.5" /> All done!
          </div>
          <div className="mx-auto -mb-2 flex justify-center">
            <Mascot mood={mood} size={120} />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {student?.display_name ?? "Friend"}
            <span className="text-muted-foreground">, here&apos;s how you did</span>
          </h1>
          <p className="mt-2 text-muted-foreground">{message}</p>
        </header>

        <ScoreCircle percent={displayPercent} correct={correctCount} total={total} />

        <div className="mt-12 space-y-3">
          <h2 className="font-display text-2xl font-bold">Question by question</h2>
          {questions.map((q, i) => (
            <ReviewCard key={q.id} index={i} q={q} a={answerMap.get(q.id) ?? null} />
          ))}
        </div>

        <div className="mt-10 flex justify-center gap-3">
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
            Done
          </Link>
          {student && (
            <Link href={`/student/${student.anon_token}`} className={cn(buttonVariants({ variant: "candy" }), "rounded-full h-11 px-6")}>
              Back to my tests
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}

function ScoreCircle({
  percent, correct, total,
}: { percent: number; correct: number; total: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - percent / 100);
  const good = percent >= 70;
  return (
    <Card className="mx-auto flex max-w-md items-center justify-center gap-6 p-6 lwm-card overflow-hidden">
      <div className="relative">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--brand)" />
              <stop offset="100%" stopColor={good ? "var(--brand-2)" : "var(--warning)"} />
            </linearGradient>
          </defs>
          <circle cx="90" cy="90" r={r} fill="none" stroke="color-mix(in oklab, var(--muted-foreground) 22%, transparent)" strokeWidth="12" />
          <motion.circle
            cx="90" cy="90" r={r} fill="none"
            stroke="url(#scoreGrad)"
            strokeWidth="12"
            strokeDasharray={c}
            strokeLinecap="round"
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            transform="rotate(-90 90 90)"
            className="dark:drop-shadow-[0_0_10px_var(--brand)]"
          />
          <text x="90" y="92" textAnchor="middle" dominantBaseline="central"
            className="font-display font-bold"
            fontSize="40" fill="currentColor">
            {percent}%
          </text>
        </svg>
      </div>
      <div>
        <div className="font-mono text-4xl font-bold">
          {correct} <span className="text-muted-foreground text-xl">/ {total}</span>
        </div>
        <div className="text-sm text-muted-foreground">questions correct</div>
      </div>
    </Card>
  );
}

function ReviewCard({
  index, q, a,
}: { index: number; q: DbQuestion; a: EnrichedAnswer | null }) {
  const correct = !!a?.is_correct;
  const response = (a?.response as string) ?? "";
  const correctText = Array.isArray(q.correct) ? q.correct.join(", ") : String(q.correct);
  const mime = (a as unknown as { explanation_mime?: string | null })?.explanation_mime;
  const isImage = a?.workUrl && mime?.startsWith("image/");
  const isPdf = a?.workUrl && mime === "application/pdf";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35 }}
    >
      <Card
        className={`lwm-card p-5 border-2 ${
          correct
            ? "border-[color-mix(in_oklab,var(--success)_50%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)]"
            : "border-[color-mix(in_oklab,var(--warning)_50%,transparent)] bg-[color-mix(in_oklab,var(--warning)_8%,transparent)]"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold text-white ${
              correct ? "bg-[var(--success)]" : "bg-[var(--warning)]"
            }`}
          >
            {correct ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold text-lg">{q.prompt}</p>
            <div className="mt-3 grid gap-2 text-sm">
              <div>
                <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Your answer</span>
                <div className="mt-0.5 rounded-lg border bg-background/60 px-2.5 py-1">
                  {response.trim() || <span className="italic text-muted-foreground">(no answer)</span>}
                </div>
              </div>
              {a?.workUrl && (
                <div>
                  <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Your work</span>
                  {isImage ? (
                    <a href={a.workUrl} target="_blank" rel="noreferrer" className="mt-1 block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.workUrl}
                        alt="Student work"
                        className="max-h-64 rounded-xl border bg-background object-contain"
                      />
                    </a>
                  ) : isPdf ? (
                    <a
                      href={a.workUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm hover:border-foreground/40"
                    >
                      <FileText className="h-4 w-4" /> Open PDF
                    </a>
                  ) : (
                    <a href={a.workUrl} target="_blank" rel="noreferrer" className="text-[var(--brand)] underline">
                      Open uploaded file
                    </a>
                  )}
                </div>
              )}
              {!correct && (
                <div>
                  <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Correct answer</span>
                  <div className="mt-0.5 rounded-lg border-2 border-[color-mix(in_oklab,var(--success)_50%,transparent)] bg-[color-mix(in_oklab,var(--success)_12%,transparent)] px-2.5 py-1 font-semibold">
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
    </motion.div>
  );
}
