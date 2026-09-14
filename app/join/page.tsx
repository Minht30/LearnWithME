"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { findClassByCode } from "@/app/actions/student-actions";
import { AppBrand, AppHeaderControls } from "@/components/ui/app-header";
import { Mascot } from "@/components/ui/mascot";

export default function JoinIndexPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6) {
      toast.error("Code should be 6 letters and numbers.");
      return;
    }
    setPending(true);
    const cls = await findClassByCode(clean);
    setPending(false);
    if (!cls) {
      toast.error("No class found with that code.");
      return;
    }
    router.push(`/join/${clean}`);
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
            <h1 className="font-display text-3xl font-bold">Join your class</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask your teacher for the 6-character code.
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              autoFocus
              className="text-center text-2xl font-mono tracking-[0.5em] h-14 rounded-2xl"
            />
            <Button type="submit" variant="candy" className="w-full h-12 rounded-full" size="lg" disabled={pending}>
              {pending ? "Checking…" : "Continue"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
