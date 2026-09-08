import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { findClassByCode, joinAndStart } from "@/app/actions/student-actions";
import { GraduationCap } from "lucide-react";

export default async function JoinCodePage({
  params,
}: PageProps<"/join/[code]">) {
  const { code } = await params;
  const cls = await findClassByCode(code);
  if (!cls) return notFound();

  return (
    <main className="min-h-screen bg-amber-50/40 dark:bg-neutral-950 flex items-center justify-center px-6">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">Welcome!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;re joining <span className="font-medium text-foreground">{cls.name}</span>.
            <br />What&apos;s your name?
          </p>
        </div>
        <form action={joinAndStart} className="space-y-4">
          <input type="hidden" name="code" value={code} />
          <Input
            name="name"
            placeholder="Your name"
            required
            minLength={1}
            maxLength={40}
            autoFocus
            className="h-12 text-lg"
          />
          <Button type="submit" className="w-full" size="lg">
            Start practising →
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your teacher will see your answers to help you learn. Nothing else is stored.
        </p>
      </Card>
    </main>
  );
}
