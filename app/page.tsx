import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, FileDown, Timer, Users, BookOpen, Sticker } from "lucide-react";
import { AppBrand, AppHeaderControls } from "@/components/ui/app-header";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 pt-8 pb-24">
        <header className="mb-16 flex items-center justify-between">
          <AppBrand />
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="hidden sm:inline text-muted-foreground hover:text-foreground">
              Teacher dashboard
            </Link>
            <Link href="/join" className="hidden sm:inline text-muted-foreground hover:text-foreground">
              Student join
            </Link>
            <AppHeaderControls />
          </div>
        </header>

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs font-mono uppercase tracking-widest text-muted-foreground backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-[var(--brand)] animate-pulse" />
          K-12 Canadian curriculum · demo
        </div>

        <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tight sm:text-7xl">
          Tests, built for
          <br />
          <span className="bg-gradient-to-r from-[var(--brand)] via-[var(--accent)] to-[var(--brand-2)] bg-clip-text text-transparent dark:drop-shadow-[0_0_16px_var(--brand)]">
            curious kids.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Describe your test in one sentence. Hand out a print-ready PDF. Give
          your class a friendly practice environment before exam day. All in the
          time it takes to make a coffee.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "candy", size: "lg" }), "h-12 rounded-full px-6")}
          >
            I&apos;m a teacher — sign in
          </Link>
          <Link
            href="/student/login"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-full px-6")}
          >
            I&apos;m a student — sign in
          </Link>
        </div>

        <div className="mt-20 grid gap-4 border-t pt-10 sm:grid-cols-2 lg:grid-cols-3">
          <Feature icon={<Sparkles />} title="Prompt-to-test"
            body="Type what you want in plain English. An open-weight model generates curriculum-aligned questions in seconds." />
          <Feature icon={<FileDown />} title="Print or share"
            body="One click gives you a student PDF (no answers) and a teacher PDF (with answer key). Share a 6-character code for online practice." />
          <Feature icon={<Timer />} title="Timer that rings"
            body="Kids see a live countdown. Gentle bells at start, one-minute-left, and time's-up. Sound is opt-out." />
          <Feature icon={<Users />} title="Real classroom-ready"
            body="Teacher creates student accounts, assigns tests, and receives results by email. Everything gated behind auth." />
          <Feature icon={<BookOpen />} title="Upload your notes"
            body="Attach a PDF, DOCX, or textbook chapter. Questions come straight from your own material." />
          <Feature icon={<Sticker />} title="Kind by default"
            body="Encouraging feedback, no red X's, streaks that celebrate progress. An environment kids actually want to use." />
        </div>

        <footer className="mt-24 border-t pt-6 text-xs text-muted-foreground">
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
    <div className="lwm-card p-5">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[color-mix(in_oklab,var(--brand)_25%,transparent)] to-[color-mix(in_oklab,var(--brand-2)_25%,transparent)] text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]">
        <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      </div>
      <h3 className="font-display font-bold text-lg">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
