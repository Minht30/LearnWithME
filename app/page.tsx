import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 pt-24 pb-16">
        <div className="mb-6 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          LearnWithMe · in development
        </div>

        <h1 className="text-5xl leading-[0.98] font-semibold tracking-tight sm:text-7xl">
          Tests, built for teachers.
        </h1>

        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          A K-12 Canadian curriculum test generator. Describe your test in one
          sentence, hand out a PDF, and give your class a practice environment
          for the days before.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
            I&apos;m a teacher — get started
          </Link>
          <Link
            href="/join"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
          >
            I&apos;m a student — join a class
          </Link>
        </div>

        <div className="mt-24 grid gap-6 border-t pt-10 sm:grid-cols-3">
          <Feature
            title="Prompt-to-test"
            body="Type what you need. Get 20 curriculum-aligned questions back in seconds."
          />
          <Feature
            title="Print or practise"
            body="Download a print-ready PDF, or share a class code students can practise on."
          />
          <Feature
            title="Kind by default"
            body="Timers, notes, encouraging results — an environment kids actually want to use."
          />
        </div>
      </div>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
