import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpen, Sparkles, FileDown, Timer, Users, Sticker } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 pt-16 pb-24">
        <header className="mb-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-500" />
            <span className="font-semibold tracking-tight">LearnWithMe</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              Teacher dashboard
            </Link>
            <Link href="/join" className="text-muted-foreground hover:text-foreground">
              Student join
            </Link>
          </div>
        </header>

        <div className="mb-6 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          K-12 Canadian curriculum · demo
        </div>

        <h1 className="text-5xl leading-[0.98] font-semibold tracking-tight sm:text-7xl">
          Tests, built for teachers.
        </h1>

        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Describe your test in one sentence. Hand out a print-ready PDF. Give
          your class a friendly practice environment before exam day. All in the
          time it takes to make a coffee.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }))}>
            I&apos;m a teacher — open dashboard
          </Link>
          <Link
            href="/join"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
          >
            I&apos;m a student — join a class
          </Link>
        </div>

        <div className="mt-20 grid gap-6 border-t pt-10 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon={<Sparkles className="h-4 w-4 text-amber-500" />}
            title="Prompt-to-test"
            body="Type what you want in plain English. Llama 3.3 generates 100 curriculum-aligned questions in seconds."
          />
          <Feature
            icon={<FileDown className="h-4 w-4 text-amber-500" />}
            title="Print or share"
            body="One click gives you a student PDF (no answers) and a teacher PDF (with answer key). Share a 6-character code for online practice."
          />
          <Feature
            icon={<Timer className="h-4 w-4 text-amber-500" />}
            title="Timer that rings"
            body="Kids see a live countdown. Gentle bells at start, one-minute-left, and time's-up. Sound is opt-out."
          />
          <Feature
            icon={<Users className="h-4 w-4 text-amber-500" />}
            title="No student accounts"
            body="Students join with a code and a first name. Nothing else stored — designed for Canadian PIPEDA compliance."
          />
          <Feature
            icon={<BookOpen className="h-4 w-4 text-amber-500" />}
            title="Upload your notes"
            body="Attach a PDF, DOCX, or textbook chapter. Questions come straight from your own material."
          />
          <Feature
            icon={<Sticker className="h-4 w-4 text-amber-500" />}
            title="Kind by default"
            body="Encouraging feedback, no red X's, one mascot moment at the end. An environment kids actually want to use."
          />
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

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
