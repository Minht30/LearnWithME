"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BookOpen, Loader2 } from "lucide-react";
import { signUpTeacher } from "@/app/actions/auth-actions";

export default function SignupPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await signUpTeacher(fd);
      if (res.ok) {
        toast.success("Account created. You're in.");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <Link href="/" className="mb-4 inline-flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-500" />
            <span className="font-semibold tracking-tight">LearnWithMe</span>
          </Link>
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Free forever for one teacher.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name" className="mb-1.5 block">Full name</Label>
            <Input id="full_name" name="full_name" type="text" placeholder="Ms. Tran" autoFocus />
          </div>
          <div>
            <Label htmlFor="email" className="mb-1.5 block">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password" className="mb-1.5 block">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} placeholder="Minimum 8 characters" />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
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
          Already have one?{" "}
          <Link href="/login" className="font-medium text-foreground underline">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
