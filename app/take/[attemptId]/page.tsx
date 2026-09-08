import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
import type { DbAttempt, DbQuestion, DbTest } from "@/lib/db/types";
import { PracticeRoom } from "./practice-room";

async function loadAttempt(attemptId: string) {
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return null;

  const [{ data: test }, { data: questions }, { data: existingAnswers }] = await Promise.all([
    admin.from("tests").select("*").eq("id", attempt.test_id).maybeSingle(),
    admin.from("questions").select("*").eq("test_id", attempt.test_id).order("position"),
    admin.from("answers").select("question_id, response, note").eq("attempt_id", attemptId),
  ]);
  if (!test || !questions) return null;

  const initialResponses: Record<string, string> = {};
  const initialNotes: Record<string, string> = {};
  for (const a of existingAnswers ?? []) {
    if (a.response) initialResponses[a.question_id] = a.response as string;
    if (a.note) initialNotes[a.question_id] = a.note;
  }

  return {
    attempt: attempt as DbAttempt,
    test: test as DbTest,
    questions: questions as DbQuestion[],
    initialResponses,
    initialNotes,
  };
}

export default async function TakePage({ params }: PageProps<"/take/[attemptId]">) {
  const { attemptId } = await params;
  const data = await loadAttempt(attemptId);
  if (!data) return notFound();
  if (data.attempt.submitted_at) {
    return (
      <main className="min-h-screen bg-amber-50/40 flex items-center justify-center p-6 dark:bg-neutral-950">
        <div className="text-center">
          <p className="text-lg">You already submitted this attempt.</p>
          <a href={`/result/${attemptId}`} className="text-amber-600 underline">
            See your result →
          </a>
        </div>
      </main>
    );
  }
  return <PracticeRoom {...data} />;
}
