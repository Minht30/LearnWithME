"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { signInStudent } from "@/app/actions/student-auth";
import { AppBrand, AppHeaderControls } from "@/components/ui/app-header";
import { Mascot } from "@/components/ui/mascot";

export default function StudentLoginPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await signInStudent(fd);
      if (res.ok) {
        toast.success("Welcome back!");
        router.push("/student/home");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

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
            <div className="mx-auto mb-3 flex items-center justify-center">
              <Mascot mood="wave" size={80} />
            </div>
            <h1 className="font-display text-3xl font-bold">Student sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the account your teacher made for you.
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code" className="mb-1.5 block">Class code</Label>
              <Input
                id="code"
                name="code"
                maxLength={6}
                required
                autoFocus
                className="text-center text-lg font-mono tracking-[0.4em] uppercase h-12 rounded-2xl"
                placeholder="ABC123"
              />
            </div>
            <div>
              <Label htmlFor="username" className="mb-1.5 block">Username</Label>
              <Input id="username" name="username" required minLength={3} className="text-base h-11 rounded-2xl" />
            </div>
            <div>
              <Label htmlFor="password" className="mb-1.5 block">Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} className="text-base h-11 rounded-2xl" />
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
          <p className="mt-6 text-center text-xs text-muted-foreground">
            No account?{" "}
            <Link href="/join" className="font-semibold text-[var(--brand)] underline">
              Join as a guest with just a code
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
