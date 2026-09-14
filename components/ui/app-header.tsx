"use client";

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { SoundToggle } from "./sound-toggle";
import { PrefsMenu } from "./prefs-menu";
import { Sparkles } from "lucide-react";

/**
 * Global-ish header row. Pages can include their own header if they
 * want a totally custom look, but this is the "one line of controls"
 * students and teachers see everywhere.
 */
export function AppHeaderControls({ withPrefs = true }: { withPrefs?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {withPrefs && <PrefsMenu />}
      <SoundToggle />
      <ThemeToggle />
    </div>
  );
}

export function AppBrand() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-white shadow-md dark:from-[var(--brand)] dark:to-[var(--accent)] dark:shadow-[0_0_14px_rgba(0,240,255,0.4)]">
        <Sparkles className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <span className="font-display">LearnWithMe</span>
    </Link>
  );
}
