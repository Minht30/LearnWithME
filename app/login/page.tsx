"use client";

import { Suspense, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { signInTeacher } from "@/app/actions/auth-actions";
import { AppBrand, AppHeaderControls } from "@/components/ui/app-header";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get("next") || "/dashboard";
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await signInTeacher(fd);
      if (res.ok) {
        toast.success("Welcome back.");
        router.push(nextPath);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email" className="mb-1.5 block">Email</Label>
        <Input id="email" name="email" type="email" required autoFocus className="h-11 rounded-2xl" />
      </div>
      <div>
        <Label htmlFor="password" className="mb-1.5 block">Password</Label>
        <Input id="password" name="password" type="password" required minLength={8} className="h-11 rounded-2xl" />
      </div>
      <Button type="submit" variant="candy" className="w-full h-12 rounded-full" size="lg" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <AppBrand />
          <AppHeaderControls />
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="lwm-card w-full max-w-md p-8">
          <div className="mb-6 text-center">
            <h1 className="font-display text-3xl font-bold">Teacher sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Welcome back. Sign in to your classroom.
            </p>
          </div>
          <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading…</div>}>
            <LoginForm />
          </Suspense>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-[var(--brand)] underline">
              Create a teacher account
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Students: <Link href="/student/login" className="underline hover:text-foreground">sign in here →</Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
