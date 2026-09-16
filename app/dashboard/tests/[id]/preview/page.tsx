import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacherId } from "@/lib/auth/session";
import { signQuestionImage, signQuestionAudio } from "@/app/actions/question-media";
import { PracticeRoom } from "@/app/take/[attemptId]/practice-room";
import { Card } from "@/components/ui/card";
import { Eye } from "lucide-react";
import type { DbAttempt, DbQuestion, DbTest } from "@/lib/db/types";

export const dynamic = "force-dynamic";

/**
 * Teacher-only preview of a test in the real student practice UI.
 * We synthesize a throwaway DbAttempt in-memory (not persisted) so the
 * teacher can click around every question without touching real data.
 */
export default async function TeacherTestPreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacherId = await requireTeacherId();
  const admin = createAdminClient();

  const [{ data: test }, { data: questions }] = await Promise.all([
    admin.from("tests").select("*").eq("id", id).eq("teacher_id", teacherId).maybeSingle(),
    admin.from("questions").select("*").eq("test_id", id).order("position"),
  ]);
  if (!test) return notFound();

  const questionsWithMedia = await Promise.all(
    ((questions ?? []) as DbQuestion[]).map(async (q) => ({
      ...q,
      imageUrl: q.image_path ? await signQuestionImage(q.image_path) : null,
      audioUrl: q.audio_path ? await signQuestionAudio(q.audio_path) : null,
    }))
  );

  const now = new Date().toISOString();
  const fakeAttempt: DbAttempt = {
    id: "preview",
    test_id: id,
    student_id: "preview",
    mode: "practice",
    started_at: now,
    submitted_at: null,
    duration_used_sec: null,
    status: "in_progress",
    teacher_note: null,
    reviewed_at: null,
    reviewed_by: null,
    results_email_sent_at: null,
  };

  return (
    <>
      <div className="fixed left-4 top-4 z-50">
        <Card className="lwm-card px-4 py-2 flex items-center gap-2 shadow-lg">
          <Eye className="h-4 w-4 text-[var(--brand)]" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Preview mode — nothing is saved
          </span>
        </Card>
      </div>
      <PracticeRoom
        attempt={fakeAttempt}
        test={test as DbTest}
        questions={questionsWithMedia}
        initialResponses={{}}
        initialNotes={{}}
        initialWork={{}}
        isPreview
      />
    </>
  );
}
