import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppBrand, AppHeaderControls } from "@/components/ui/app-header";
import { Mascot } from "@/components/ui/mascot";
import { Sparkles, Volume2, Flame, Camera, GraduationCap } from "lucide-react";

export default function StudentsLanding() {
  return (
    <main className="min-h-screen">
      <a href="#hero" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-primary-foreground">
        Skip to main content
      </a>
      <div className="mx-auto max-w-5xl px-6 pt-6 pb-24">
        <header className="mb-10 flex items-center justify-between">
          <AppBrand />
          <div className="flex items-center gap-3 text-sm">
            <Link href="/teachers" className="hidden sm:inline text-muted-foreground hover:text-foreground">
              Teacher page →
            </Link>
            <AppHeaderControls />
          </div>
        </header>

        <section id="hero" className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[color-mix(in_oklab,var(--brand)_15%,transparent)] px-3 py-1 text-xs font-semibold text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]">
              <Sparkles className="h-3.5 w-3.5" /> Hi friend!
            </div>
            <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tight sm:text-6xl">
              Practice like a
              <br />
              <span className="bg-gradient-to-r from-[var(--brand)] via-[var(--accent)] to-[var(--brand-2)] bg-clip-text text-transparent dark:drop-shadow-[0_0_16px_var(--brand)]">
                superhero.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              Get your homework, take photos of your work, see stars for every
              answer you crack.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/student/signup"
                className={cn(buttonVariants({ variant: "candy", size: "lg" }), "h-14 rounded-full px-6 text-base")}
              >
                <GraduationCap className="mr-2 h-5 w-5" /> Make my account
              </Link>
              <Link
                href="/student/login"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-14 rounded-full px-6 text-base")}
              >
                I already have one
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Ask your teacher for the 6-letter class code before you sign up.
            </p>
          </div>
          <div className="hidden md:block">
            <Mascot mood="cheer" size={220} />
          </div>
        </section>

        <section aria-labelledby="how-heading" className="mt-16 border-t pt-10">
          <h2 id="how-heading" className="mb-6 font-display text-2xl font-bold">
            What&apos;s inside
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Feature icon={<Camera />} title="Show your work"
              body="Do it on paper, snap a photo, upload it. Your teacher sees exactly how you did it." />
            <Feature icon={<Flame />} title="Streaks"
              body="Get three right in a row for a flame. The higher the streak, the bigger the cheer." />
            <Feature icon={<Volume2 />} title="Timer that chimes"
              body="Gentle bells at start and one-minute-left. Turn sound off any time." />
          </div>
        </section>

        <footer className="mt-16 border-t pt-6 text-xs text-muted-foreground">
          Made for practice, not for grades. Have fun.
        </footer>
      </div>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="lwm-card p-5">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[color-mix(in_oklab,var(--brand)_25%,transparent)] to-[color-mix(in_oklab,var(--brand-2)_25%,transparent)] text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]">
        <span className="[&_svg]:h-5 [&_svg]:w-5" aria-hidden>{icon}</span>
      </div>
      <h3 className="font-display font-bold text-lg">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </article>
  );
}
