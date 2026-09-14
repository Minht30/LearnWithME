import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacherId } from "@/lib/auth/session";
import { signExplanationUrl } from "@/app/actions/upload-explanation";
import { ReviewClient } from "./review-client";
import type { DbAttempt, DbAnswer, DbQuestion, DbTest, DbStudent } from "@/lib/db/types";

export const dynamic = "force-dynamic";

type EnrichedAnswer = DbAnswer & { workUrl?: string };

async function loadReviewData(attemptId: string) {
  const teacherId = await requireTeacherId();
  const admin = createAdminClient();

  const { data: attempt } = await admin
    .from("attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return null;

  const [{ data: test }, { data: questions }, { data: answers }, { data: student }] = await Promise.all([
    admin.from("tests").select("*").eq("id", attempt.test_id).maybeSingle(),
    admin.from("questions").select("*").eq("test_id", attempt.test_id).order("position"),
    admin.from("answers").select("*").eq("attempt_id", attemptId),
    admin.from("students").select("*").eq("id", attempt.student_id).maybeSingle(),
  ]);
  if (!test || !questions) return null;
  if ((test as DbTest).teacher_id !== teacherId) return null;

  const enriched: EnrichedAnswer[] = await Promise.all(
    ((answers ?? []) as DbAnswer[]).map(async (a) => {
      if (a.explanation_file_path) {
        const url = await signExplanationUrl(a.explanation_file_path, 60 * 60 * 24);
        return { ...a, workUrl: url ?? undefined };
      }
      return a as EnrichedAnswer;
    })
  );

  return {
    attempt: attempt as DbAttempt,
    test: test as DbTest,
    questions: questions as DbQuestion[],
    answers: enriched,
    student: student as DbStudent,
  };
}

export default async function ReviewPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const data = await loadReviewData(attemptId);
  if (!data) return notFound();
  if (data.attempt.status === "in_progress") {
    // Student still working — nothing to review yet.
    redirect("/dashboard/inbox");
  }
  return <ReviewClient {...data} />;
}
