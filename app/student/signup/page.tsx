"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { signUpStudent } from "@/app/actions/student-auth";
import { AppBrand, AppHeaderControls } from "@/components/ui/app-header";
import { Mascot } from "@/components/ui/mascot";

export default function StudentSignupPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showPw, setShowPw] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await signUpStudent(fd);
      if (res.ok) {
        toast.success("Welcome to LearnWithMe!");
        router.push("/student/home");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <main className="min-h-screen flex flex-col">
      <a href="#signup-main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-primary-foreground">
        Skip to sign up form
      </a>
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <AppBrand />
          <AppHeaderControls />
        </div>
      </header>
      <div id="signup-main" className="flex-1 flex items-center justify-center p-6">
        <Card className="lwm-card w-full max-w-md p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex items-center justify-center">
              <Mascot mood="cheer" size={80} />
            </div>
            <h1 className="font-display text-3xl font-bold">Make your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask your teacher for the class code.
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4" aria-label="Student sign up">
            <div>
              <Label htmlFor="code" className="mb-1.5 block">Class code</Label>
              <Input
                id="code"
                name="code"
                required
                maxLength={6}
                autoFocus
                className="text-center text-lg font-mono tracking-[0.4em] uppercase h-12 rounded-2xl"
                placeholder="ABC123"
                aria-describedby="code-help"
              />
              <p id="code-help" className="mt-1 text-xs text-muted-foreground">
                Six letters and numbers from your teacher.
              </p>
            </div>
            <div>
              <Label htmlFor="display_name" className="mb-1.5 block">Your name</Label>
              <Input
                id="display_name"
                name="display_name"
                required
                minLength={2}
                placeholder="Alex"
                className="h-11 rounded-2xl"
                autoComplete="given-name"
              />
            </div>
            <div>
              <Label htmlFor="username" className="mb-1.5 block">Username</Label>
              <Input
                id="username"
                name="username"
                required
                minLength={3}
                maxLength={30}
                pattern="[a-z0-9._-]+"
                placeholder="alex.smith"
                className="h-11 rounded-2xl"
                autoComplete="username"
                aria-describedby="username-help"
              />
              <p id="username-help" className="mt-1 text-xs text-muted-foreground">
                Lowercase letters, numbers, dot, dash, underscore.
              </p>
            </div>
            <div>
              <Label htmlFor="password" className="mb-1.5 block">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="h-11 rounded-2xl pr-11"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              variant="candy"
              className="w-full h-12 rounded-full"
              size="lg"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/student/login" className="font-semibold text-[var(--brand)] underline">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
