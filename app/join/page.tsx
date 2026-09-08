"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { findClassByCode } from "@/app/actions/student-actions";
import { GraduationCap } from "lucide-react";

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
    <main className="min-h-screen bg-amber-50/40 dark:bg-neutral-950 flex items-center justify-center px-6">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">Join your class</h1>
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
            className="text-center text-2xl font-mono tracking-[0.5em] h-14"
          />
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? "Checking…" : "Continue"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
