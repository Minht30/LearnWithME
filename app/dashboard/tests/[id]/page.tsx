import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacherId } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
import type { DbTest, DbQuestion } from "@/lib/db/types";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, ArrowLeft, Clock, Eye } from "lucide-react";
import { QuestionList } from "./question-list";
import { ShareCard } from "./share-card";
import { AssignCard } from "./assign-card";
import { DeleteTestButton } from "./delete-test-button";
import { signQuestionMediaBatch } from "@/app/actions/question-media";

// Vercel Hobby caps single-invocation duration; make it explicit and
// short so a slow render surfaces a real timeout instead of silently
// hitting the platform default.
export const maxDuration = 10;

async function loadTest(id: string) {
  const startMs = Date.now();
  const stamp = (label: string) => console.log(`[test-detail:${id.slice(0, 8)}] ${label} +${Date.now() - startMs}ms`);
  stamp("start");
  const teacherId = await requireTeacherId();
  stamp("auth");
  const admin = createAdminClient();

  // Owner-check the test alone first so we can bail before touching
  // the questions table for tests this teacher doesn't own.
  const { data: test } = await admin
    .from("tests")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", teacherId)
    .maybeSingle();
  stamp("test-row");
  if (!test) return null;

  // The rest in parallel. Questions capped at 500 rows + count reported
  // so runaway data (from a duplicated insert path) can't blow the
  // Vercel function budget.
  const [{ data: questions, count: qcount }, { data: classTest }, { data: classes }, { data: assignments }] = await Promise.all([
    admin
      .from("questions")
      .select("*", { count: "exact" })
      .eq("test_id", id)
      .order("position")
      .limit(500),
    admin.from("class_tests").select("class_id, classes(id, name, join_code)").eq("test_id", id).limit(1),
    admin.from("classes").select("id, name").eq("teacher_id", teacherId),
    admin.from("assignments").select("student_id, due_at, priority").eq("test_id", id),
  ]);
  stamp(`questions rows=${questions?.length ?? 0} total=${qcount ?? "?"}`);

  const classIds = (classes ?? []).map((c) => c.id);
  const { data: rosterRaw } = classIds.length
    ? await admin
        .from("students")
        .select("id, display_name, username, class_id")
        .in("class_id", classIds)
        .order("display_name")
    : { data: [] };
  stamp("roster");
  const classNameById = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const students = (rosterRaw ?? []).map((s) => ({
    id: s.id,
    display_name: s.display_name,
    username: s.username,
    class_name: classNameById.get(s.class_id) ?? "",
  }));

  // ONE batched Storage call for every image + audio path on the test,
  // with a 3s hard cap inside signQuestionMediaBatch. Replaces the
  // per-question loop that was making N sequential HTTPS calls and
  // burning through the function budget.
  const qs = (questions ?? []) as DbQuestion[];
  const paths = [
    ...qs.map((q) => q.image_path).filter((p): p is string => !!p),
    ...qs.map((q) => q.audio_path).filter((p): p is string => !!p),
  ];
  stamp(`paths=${paths.length}`);
  const signed = paths.length ? await signQuestionMediaBatch(paths) : {};
  stamp("signed");
  const questionsWithMedia = qs.map((q) => ({
    ...q,
    imageUrl: q.image_path ? signed[q.image_path] ?? null : null,
    audioUrl: q.audio_path ? signed[q.audio_path] ?? null : null,
  }));

  const firstJoin = (classTest ?? []).find((ct) => {
    const c = ct.classes;
    return c && !Array.isArray(c) && typeof (c as { join_code?: string }).join_code === "string";
  });
  const joinCode = firstJoin
    ? (firstJoin.classes as unknown as { join_code: string }).join_code
    : null;

  return {
    test: test as DbTest,
    questions: questionsWithMedia,
    joinCode,
    students,
    assignments: (assignments ?? []) as { student_id: string; due_at: string | null; priority: number }[],
  };
}

export default async function TestDetailPage({ params }: PageProps<"/dashboard/tests/[id]">) {
  const { id } = await params;
  const data = await loadTest(id);
  if (!data) return notFound();
  const { test, questions, joinCode, students, assignments } = data;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to tests
        </Link>
      </div>

      <header className="mb-6 flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{test.subject}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono">Grade {test.grade}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {test.duration_min && test.duration_min > 0 ? `${test.duration_min} min` : "Untimed"}
            </span>
            <span aria-hidden>·</span>
            <span>{questions.length} questions</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">{test.title}</h1>
          {test.source_prompt && (
            <p className="mt-2 text-sm text-muted-foreground italic">&ldquo;{test.source_prompt}&rdquo;</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/dashboard/tests/${test.id}/preview`}
            className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Eye className="mr-1 h-4 w-4" /> Preview as student
          </a>
          <a
            href={`/api/tests/${test.id}/pdf?withKey=0`}
            className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="mr-1 h-4 w-4" /> Student PDF
          </a>
          <a
            href={`/api/tests/${test.id}/pdf?withKey=1`}
            className={cn(buttonVariants({ variant: "candy" }), "rounded-full h-9 px-4")}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="mr-1 h-4 w-4" /> Teacher PDF
          </a>
          <DeleteTestButton testId={test.id} title={test.title} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {questions.length === 0 ? (
            <Card className="lwm-card p-10 text-center text-muted-foreground">
              No questions on this test yet.
            </Card>
          ) : (
            <QuestionList questions={questions} testId={test.id} />
          )}
        </div>
        <div className="space-y-4">
          <AssignCard testId={test.id} students={students} assignments={assignments} />
          <ShareCard
            testId={test.id}
            initialJoinCode={joinCode}
            defaultName={`${test.subject} · Grade ${test.grade}`}
            grade={test.grade}
          />
        </div>
      </div>
    </div>
  );
}
