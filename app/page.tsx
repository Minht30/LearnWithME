import Link from "next/link";
import { AppBrand, AppHeaderControls } from "@/components/ui/app-header";
import { Sparkles, GraduationCap, ArrowRight } from "lucide-react";
import { Mascot } from "@/components/ui/mascot";

export default function LandingChooser() {
  return (
    <main className="min-h-screen flex flex-col">
      <a href="#choose" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-primary-foreground">
        Skip to sign-in options
      </a>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <AppBrand />
        <AppHeaderControls />
      </header>

      <section id="choose" className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-6 py-10 md:grid-cols-2 md:items-center">
        <TeacherCard />
        <StudentCard />
      </section>

      <footer className="mx-auto w-full max-w-6xl border-t px-6 py-6 text-center text-xs text-muted-foreground">
        LearnWithMe · open-source, MIT ·{" "}
        <a
          href="https://github.com/Minht30/LearnWithME"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          GitHub
        </a>
      </footer>
    </main>
  );
}

function TeacherCard() {
  return (
    <Link
      href="/teachers"
      className="group block rounded-3xl border-2 border-border bg-card p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-[var(--brand)] hover:shadow-xl focus:outline-none focus-visible:border-[var(--brand)] focus-visible:shadow-xl dark:hover:shadow-[0_0_40px_-10px_var(--brand)]"
      aria-label="For teachers"
    >
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-white shadow-md dark:from-[var(--brand)] dark:to-[var(--accent)] dark:shadow-[0_0_14px_rgba(0,240,255,0.4)]">
        <Sparkles className="h-6 w-6" strokeWidth={2.5} />
      </div>
      <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
        For educators
      </p>
      <h2 className="font-display text-3xl font-bold sm:text-4xl">
        I&apos;m a teacher
      </h2>
      <p className="mt-2 text-muted-foreground">
        Prompt-to-test in seconds, print-ready PDFs, and a review inbox for
        every submission — built on the K–12 Canadian curriculum.
      </p>
      <p className="mt-6 inline-flex items-center gap-1 font-semibold text-[var(--brand)]">
        Explore the platform <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </p>
    </Link>
  );
}

function StudentCard() {
  return (
    <Link
      href="/students"
      className="group block rounded-3xl border-2 border-border bg-card p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-[var(--brand-3)] hover:shadow-xl focus:outline-none focus-visible:border-[var(--brand-3)] focus-visible:shadow-xl dark:hover:shadow-[0_0_40px_-10px_var(--brand-3)]"
      aria-label="For students"
    >
      <div className="mb-4 flex items-center">
        <Mascot mood="wave" size={72} />
      </div>
      <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
        For kids
      </p>
      <h2 className="font-display text-3xl font-bold sm:text-4xl">
        I&apos;m a student
      </h2>
      <p className="mt-2 text-muted-foreground">
        Homework, practice, and quick check-ins from your teacher — with a
        cheer for every streak.
      </p>
      <p className="mt-6 inline-flex items-center gap-1 font-semibold text-[color-mix(in_oklab,var(--brand-3)_70%,black)] dark:text-[var(--brand-3)]">
        <GraduationCap className="h-4 w-4" /> Let&apos;s go
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </p>
    </Link>
  );
}
