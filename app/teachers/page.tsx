import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sparkles, FileDown, Timer, Users, BookOpen, Sticker, Inbox,
  ShieldCheck, GraduationCap,
} from "lucide-react";
import { AppBrand, AppHeaderControls } from "@/components/ui/app-header";

export default function TeachersLanding() {
  return (
    <main className="min-h-screen">
      <a href="#hero" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-primary-foreground">
        Skip to main content
      </a>
      <div className="mx-auto max-w-5xl px-6 pt-6 pb-24">
        <header className="mb-14 flex items-center justify-between">
          <AppBrand />
          <div className="flex items-center gap-3 text-sm">
            <Link href="/students" className="hidden sm:inline text-muted-foreground hover:text-foreground">
              Student page →
            </Link>
            <AppHeaderControls />
          </div>
        </header>

        <section id="hero">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs font-mono uppercase tracking-widest text-muted-foreground backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[var(--brand)] animate-pulse" />
            K-12 Canadian curriculum · demo
          </div>

          <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tight sm:text-7xl">
            Tests, built for
            <br />
            <span className="bg-gradient-to-r from-[var(--brand)] via-[var(--accent)] to-[var(--brand-2)] bg-clip-text text-transparent dark:drop-shadow-[0_0_16px_var(--brand)]">
              teachers.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Describe your test in one sentence. Hand out a print-ready PDF.
            Get every submission back in your inbox with per-question feedback
            you can approve or send back to redo.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: "candy", size: "lg" }), "h-12 rounded-full px-6")}
            >
              Sign in as a teacher
            </Link>
            <Link
              href="/signup"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-full px-6")}
            >
              Create a teacher account
            </Link>
          </div>
        </section>

        <section aria-labelledby="features-heading" className="mt-20 border-t pt-10">
          <h2 id="features-heading" className="mb-6 font-display text-3xl font-bold">
            Everything you need
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={<Sparkles />} title="Prompt-to-test"
              body="Type what you want in plain English. An open-weight model generates curriculum-aligned questions in seconds." />
            <Feature icon={<FileDown />} title="Print or share"
              body="One click gives you a student PDF (no answers) and a teacher PDF (with answer key). Share a 6-character code for online practice." />
            <Feature icon={<Timer />} title="Timer that rings"
              body="Kids see a live countdown. Gentle bells at start, one-minute-left, and time's-up. Sound is opt-out." />
            <Feature icon={<Inbox />} title="Review inbox"
              body="Every submission lands in one place. Leave per-question notes and hit Approve or Ask to Redo — the student sees your decision instantly." />
            <Feature icon={<Users />} title="Roster with recovery"
              body="Students can self-sign-up with your class code. See usernames and passwords when they forget — nothing else." />
            <Feature icon={<BookOpen />} title="Upload your notes"
              body="Attach a PDF, DOCX, or textbook chapter. Questions come straight from your own material." />
            <Feature icon={<GraduationCap />} title="Assign as homework"
              body="Pick students, set a due date, add a note. It shows up on their home with a friendly countdown." />
            <Feature icon={<Sticker />} title="Kind by default"
              body="Encouraging feedback, no red X's, streaks that celebrate progress. An environment kids actually want to use." />
            <Feature icon={<ShieldCheck />} title="Accessible"
              body="WCAG AA colors, keyboard navigation, dyslexia-friendly font, and zen mode. Meets every kid where they are." />
          </div>
        </section>

        <footer className="mt-20 border-t pt-6 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>LearnWithMe · open-source, MIT</span>
            <a
              href="https://github.com/Minht30/LearnWithME"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              GitHub →
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="lwm-card p-5">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[color-mix(in_oklab,var(--brand)_25%,transparent)] to-[color-mix(in_oklab,var(--brand-2)_25%,transparent)] text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]">
        <span className="[&_svg]:h-4 [&_svg]:w-4" aria-hidden>{icon}</span>
      </div>
      <h3 className="font-display font-bold text-lg">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </article>
  );
}
