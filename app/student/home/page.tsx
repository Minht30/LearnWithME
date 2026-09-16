import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStudent } from "@/lib/auth/student-session";
import { signOutStudent } from "@/app/actions/student-auth";
import { startAttemptForStudent } from "@/app/actions/student-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, LogOut, Clock, CheckCircle2, PlayCircle, Sparkles,
  Calendar, AlertCircle, RotateCcw, History,
} from "lucide-react";
import { AppBrand, AppHeaderControls } from "@/components/ui/app-header";
import { Mascot } from "@/components/ui/mascot";
import { formatDueDate, formatDistanceToNow } from "@/lib/utils/date";
import type { AttemptStatus } from "@/lib/db/types";

export const dynamic = "force-dynamic";

type TestRef = { id: string; title: string; subject: string; grade: string; duration_min: number };
type AttemptRow = {
  id: string; test_id: string; status: AttemptStatus;
  submitted_at: string | null; started_at: string;
  teacher_note: string | null; reviewed_at: string | null;
  feedback_read_at: string | null;
};

async function loadHome() {
  const student = await getCurrentStudent();
  if (!student) redirect("/student/login");
  const admin = createAdminClient();

  const [{ data: cls }, { data: assignments }, { data: attempts }] = await Promise.all([
    admin.from("classes").select("id, name, grade").eq("id", student.class_id).maybeSingle(),
    admin
      .from("assignments")
      .select("id, test_id, due_at, priority, note, tests(id, title, subject, grade, duration_min)")
      .eq("student_id", student.id)
      .order("due_at", { ascending: true, nullsFirst: false }),
    admin
      .from("attempts")
      .select("id, test_id, status, submitted_at, started_at, teacher_note, reviewed_at, feedback_read_at")
      .eq("student_id", student.id)
      .order("started_at", { ascending: false }),
  ]);

  const attemptByTest = new Map<string, AttemptRow>();
  for (const a of (attempts ?? []) as AttemptRow[]) {
    if (!attemptByTest.has(a.test_id)) attemptByTest.set(a.test_id, a);
  }

  type RawAssignment = {
    id: string; test_id: string; due_at: string | null; priority: number; note: string | null;
    tests: TestRef | TestRef[] | null;
  };
  const normalized = ((assignments ?? []) as unknown as RawAssignment[]).map((a) => ({
    id: a.id,
    test_id: a.test_id,
    due_at: a.due_at,
    priority: a.priority,
    note: a.note,
    tests: Array.isArray(a.tests) ? (a.tests[0] ?? null) : a.tests,
  }));

  return {
    student,
    cls,
    assignments: normalized,
    attempts: (attempts ?? []) as AttemptRow[],
    attemptByTest,
    nowMs: Date.now(),
  };
}

export default async function StudentHomePage() {
  // Read the clock in loadHome so this render body stays pure per lint rules.
  const { student, cls, assignments, attempts, attemptByTest, nowMs } = await loadHome();

  const activeAttempt = attempts.find((a) => a.status === "in_progress" || a.status === "needs_redo");

  // Split assignments into pending/done categories
  const pending = assignments.filter((a) => {
    const at = attemptByTest.get(a.test_id);
    return !at || at.status === "in_progress" || at.status === "needs_redo";
  });
  const awaiting = assignments.filter((a) => attemptByTest.get(a.test_id)?.status === "submitted");
  const approved = assignments.filter((a) => attemptByTest.get(a.test_id)?.status === "approved");

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-primary-foreground">
        Skip to main content
      </a>
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="shrink-0"><AppBrand /></div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <AppHeaderControls />
            <form action={signOutStudent}>
              <button
                type="submit"
                aria-label="Sign out"
                className="flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex items-center gap-4 min-w-0">
          <div className="shrink-0">
            <Mascot mood={pending.length > 0 ? "cheer" : "wave"} size={72} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight truncate">
              Hi, {student.display_name.split(" ")[0]}!
            </h1>
            <p className="mt-1 text-sm text-muted-foreground truncate">
              {cls?.name} · Grade {cls?.grade}
            </p>
          </div>
        </div>

        {activeAttempt && (
          <ResumeCard
            attempt={activeAttempt}
            test={assignments.find((a) => a.test_id === activeAttempt.test_id)?.tests ?? null}
          />
        )}

        <Section
          title="This week's homework"
          icon={<Calendar className="h-5 w-5 text-[var(--brand)]" />}
          count={pending.length}
          empty={approved.length === assignments.length && assignments.length > 0
            ? "You've done every assignment! Ask your teacher for more."
            : "Nothing due yet. Your teacher will add work here."}
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {pending.map((a) => {
              if (!a.tests) return null;
              const attempt = attemptByTest.get(a.test_id);
              return (
                <li key={a.id}>
                  <AssignmentCard
                    testId={a.tests.id}
                    title={a.tests.title}
                    subject={a.tests.subject}
                    grade={a.tests.grade}
                    durationMin={a.tests.duration_min}
                    dueAt={a.due_at}
                    priority={a.priority}
                    note={a.note}
                    attempt={attempt}
                    nowMs={nowMs}
                  />
                </li>
              );
            })}
          </ul>
        </Section>

        {awaiting.length > 0 && (
          <Section
            title="Waiting for teacher"
            icon={<Clock className="h-5 w-5 text-[var(--accent)]" />}
            count={awaiting.length}
          >
            <ul className="grid gap-3 sm:grid-cols-2">
              {awaiting.map((a) => {
                if (!a.tests) return null;
                const attempt = attemptByTest.get(a.test_id);
                return (
                  <li key={a.id}>
                    <AssignmentCard
                      testId={a.tests.id}
                      title={a.tests.title}
                      subject={a.tests.subject}
                      grade={a.tests.grade}
                      durationMin={a.tests.duration_min}
                      dueAt={a.due_at}
                      priority={a.priority}
                      note={a.note}
                      attempt={attempt}
                      nowMs={nowMs}
                    />
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {approved.length > 0 && (
          <Section
            title="Approved by teacher"
            icon={<CheckCircle2 className="h-5 w-5 text-[var(--success)]" />}
            count={approved.length}
          >
            <ul className="grid gap-3 sm:grid-cols-2">
              {approved.map((a) => {
                if (!a.tests) return null;
                const attempt = attemptByTest.get(a.test_id);
                return (
                  <li key={a.id}>
                    <AssignmentCard
                      testId={a.tests.id}
                      title={a.tests.title}
                      subject={a.tests.subject}
                      grade={a.tests.grade}
                      durationMin={a.tests.duration_min}
                      dueAt={a.due_at}
                      priority={a.priority}
                      note={a.note}
                      attempt={attempt}
                      nowMs={nowMs}
                    />
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {attempts.length > 0 && (
          <Section
            title="Your history"
            icon={<History className="h-5 w-5 text-muted-foreground" />}
            count={attempts.length}
            muted
          >
            <ul className="divide-y rounded-2xl border bg-card/50">
              {attempts.slice(0, 10).map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <StatusDot status={a.status} />
                  <span className="min-w-0 flex-1 truncate">
                    {a.submitted_at
                      ? `Submitted ${formatDistanceToNow(a.submitted_at)}`
                      : `Started ${formatDistanceToNow(a.started_at)}`}
                  </span>
                  <Link
                    href={a.status === "in_progress" || a.status === "needs_redo" ? `/take/${a.id}` : `/result/${a.id}`}
                    className="text-xs font-semibold text-[var(--brand)] underline"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {assignments.length === 0 && attempts.length === 0 && (
          <Card className="lwm-card p-10 text-center">
            <GraduationCap className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Nothing assigned yet. Check back soon!</p>
          </Card>
        )}
      </main>
    </div>
  );
}

function Section({
  title, icon, count, empty, muted, children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  empty?: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`sec-${title}`} className="mt-10">
      <h2 id={`sec-${title}`} className="mb-3 flex items-center gap-2 font-display text-xl font-bold">
        {icon}
        {title}
        <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${muted ? "bg-muted text-muted-foreground" : "bg-[var(--brand)] text-white"}`}>
          {count}
        </span>
      </h2>
      {count === 0 && empty ? (
        <Card className="lwm-card p-6 text-center text-sm text-muted-foreground">{empty}</Card>
      ) : children}
    </section>
  );
}

function ResumeCard({ attempt, test }: { attempt: AttemptRow; test: TestRef | null }) {
  return (
    <Card
      className="lwm-card mb-6 p-5 border-2 border-[color-mix(in_oklab,var(--brand)_45%,transparent)] bg-[color-mix(in_oklab,var(--brand)_8%,transparent)]"
      aria-label="Resume where you left off"
    >
      <div className="flex items-center gap-3">
        <PlayCircle className="h-8 w-8 text-[var(--brand)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold">
            {attempt.status === "needs_redo" ? "One more try — teacher sent this back" : "Pick up where you left off"}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {test?.title ?? "In-progress test"} · started {formatDistanceToNow(attempt.started_at)}
          </p>
          {attempt.teacher_note && attempt.status === "needs_redo" && (
            <p className="mt-1 rounded-lg bg-background/60 p-2 text-sm">
              <b>Teacher:</b> {attempt.teacher_note}
            </p>
          )}
        </div>
        <Link href={`/take/${attempt.id}`}>
          <Button variant="candy" className="rounded-full h-11 px-5">
            {attempt.status === "needs_redo" ? "Redo now" : "Resume"}
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function AssignmentCard({
  testId, title, subject, grade, durationMin, dueAt, priority, note, attempt, nowMs,
}: {
  testId: string;
  title: string; subject: string; grade: string; durationMin: number;
  dueAt: string | null; priority: number; note: string | null;
  attempt: AttemptRow | undefined;
  nowMs: number;
}) {
  const status = attempt?.status;
  const isSubmitted = status === "submitted";
  const isApproved = status === "approved";
  const isRedo = status === "needs_redo";
  const isInProgress = status === "in_progress";
  const isDone = isApproved;
  const overdue = dueAt && !isDone && !isSubmitted && new Date(dueAt).getTime() < nowMs;

  const borderCls = overdue
    ? "border-[var(--danger)]/50"
    : isApproved
    ? "border-[color-mix(in_oklab,var(--success)_45%,transparent)]"
    : isRedo
    ? "border-[color-mix(in_oklab,var(--warning)_45%,transparent)]"
    : "border-border";

  return (
    <Card className={`lwm-card p-4 border-2 ${borderCls}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
            {subject} · Grade {grade}
          </div>
          <h3 className="mt-0.5 font-display text-lg font-bold truncate">{title}</h3>
        </div>
        <StatusPill status={status ?? "new"} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {durationMin} min</span>
        {dueAt && (
          <span className={`flex items-center gap-1 ${overdue ? "text-[var(--danger)] font-semibold" : ""}`}>
            <Calendar className="h-3 w-3" /> Due {formatDueDate(dueAt)}
          </span>
        )}
        {priority >= 3 && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--danger)]/15 px-1.5 py-0.5 text-[10px] font-bold text-[var(--danger)]">
            <AlertCircle className="h-2.5 w-2.5" /> Urgent
          </span>
        )}
      </div>
      {note && <p className="mt-2 text-sm italic text-muted-foreground">&ldquo;{note}&rdquo;</p>}
      {isRedo && attempt?.teacher_note && (
        <div className="mt-2 rounded-lg border border-[var(--warning)]/30 bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] p-2 text-sm">
          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <b className="text-foreground">Teacher says</b>
            {attempt.reviewed_at && (
              <span>· {formatDistanceToNow(attempt.reviewed_at)}</span>
            )}
            {attempt.reviewed_at && !attempt.feedback_read_at && (
              <span className="rounded-full bg-[var(--brand)] px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>
            )}
          </div>
          {attempt.teacher_note}
        </div>
      )}
      <div className="mt-3">
        {isApproved && attempt ? (
          <Link href={`/result/${attempt.id}`} className="relative block">
            <Button variant="outline" className="w-full rounded-full">
              <CheckCircle2 className="mr-1 h-4 w-4" /> See feedback
              {attempt.reviewed_at && !attempt.feedback_read_at && (
                <span className="ml-2 rounded-full bg-[var(--brand)] px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>
              )}
            </Button>
          </Link>
        ) : isSubmitted && attempt ? (
          <Link href={`/result/${attempt.id}`}>
            <Button variant="outline" className="w-full rounded-full">Waiting for review</Button>
          </Link>
        ) : isRedo && attempt ? (
          <form action={async () => { "use server"; await startAttemptForStudent(testId); }}>
            <Button type="submit" variant="candy" className="w-full rounded-full h-10">
              <RotateCcw className="mr-1 h-4 w-4" /> Try again
            </Button>
          </form>
        ) : isInProgress && attempt ? (
          <Link href={`/take/${attempt.id}`}>
            <Button variant="candy" className="w-full rounded-full h-10">
              <PlayCircle className="mr-1 h-4 w-4" /> Continue
            </Button>
          </Link>
        ) : (
          <form action={async () => { "use server"; await startAttemptForStudent(testId); }}>
            <Button type="submit" variant="candy" className="w-full rounded-full h-10">
              <Sparkles className="mr-1 h-4 w-4" /> Start
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
}

function StatusPill({ status }: { status: AttemptStatus | "new" }) {
  const map: Record<string, { label: string; cls: string }> = {
    new:          { label: "New",       cls: "bg-[color-mix(in_oklab,var(--brand)_18%,transparent)] text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]" },
    in_progress:  { label: "Working",   cls: "bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] text-[color-mix(in_oklab,var(--accent)_80%,black)] dark:text-[var(--accent)]" },
    submitted:    { label: "Waiting",   cls: "bg-muted text-muted-foreground" },
    approved:     { label: "Approved",  cls: "bg-[color-mix(in_oklab,var(--success)_20%,transparent)] text-[color-mix(in_oklab,var(--success)_80%,black)] dark:text-[var(--success)]" },
    needs_redo:   { label: "Redo",      cls: "bg-[color-mix(in_oklab,var(--warning)_20%,transparent)] text-[color-mix(in_oklab,var(--warning)_80%,black)] dark:text-[var(--warning)]" },
  };
  const it = map[status] ?? map.new;
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${it.cls}`}>{it.label}</span>;
}

function StatusDot({ status }: { status: AttemptStatus }) {
  const cls = {
    in_progress: "bg-[var(--accent)]",
    submitted:   "bg-muted-foreground",
    approved:    "bg-[var(--success)]",
    needs_redo:  "bg-[var(--warning)]",
  }[status];
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} aria-label={status.replace("_", " ")} />;
}
