import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStudent } from "@/lib/auth/student-session";
import { signOutStudent } from "@/app/actions/student-auth";
import { startAttemptForStudent } from "@/app/actions/student-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, Clock, CheckCircle2, PlayCircle, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

async function loadAssignedTests() {
  const student = await getCurrentStudent();
  if (!student) redirect("/student/login");
  const admin = createAdminClient();

  const [{ data: cls }, { data: classTests }] = await Promise.all([
    admin.from("classes").select("id, name, grade").eq("id", student.class_id).maybeSingle(),
    admin
      .from("class_tests")
      .select("test_id, mode, assigned_at, tests(id, title, subject, grade, duration_min)")
      .eq("class_id", student.class_id),
  ]);

  const testIds = (classTests ?? []).map((ct) => ct.test_id);
  const { data: attempts } = testIds.length
    ? await admin
        .from("attempts")
        .select("id, test_id, submitted_at, started_at")
        .eq("student_id", student.id)
        .in("test_id", testIds)
    : { data: [] as { id: string; test_id: string; submitted_at: string | null; started_at: string }[] };

  const attemptByTest = new Map<string, { id: string; submitted_at: string | null; started_at: string }>();
  for (const a of attempts ?? []) attemptByTest.set(a.test_id, a);

  return { student, cls, classTests: classTests ?? [], attemptByTest };
}

export default async function StudentHomePage() {
  const { student, cls, classTests, attemptByTest } = await loadAssignedTests();

  return (
    <div className="min-h-screen bg-amber-50/40 dark:bg-neutral-950">
      <header className="border-b bg-background/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-sm font-semibold dark:bg-amber-950 dark:text-amber-300">
              {student.display_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold">Hi, {student.display_name.split(" ")[0]}!</p>
              <p className="text-xs text-muted-foreground">
                {cls?.name} · Grade {cls?.grade}
              </p>
            </div>
          </div>
          <form action={signOutStudent}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Your tests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {classTests.length === 0
              ? "Your teacher hasn't shared a test yet. Check back later."
              : "Tap a test to start or resume."}
          </p>
        </div>

        {classTests.length === 0 ? (
          <Card className="p-10 text-center">
            <GraduationCap className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Nothing assigned yet.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {classTests.map((ct) => {
              const test = ct.tests && !Array.isArray(ct.tests) ? (ct.tests as {
                id: string;
                title: string;
                subject: string;
                grade: string;
                duration_min: number;
              }) : null;
              if (!test) return null;
              const attempt = attemptByTest.get(ct.test_id);
              const submitted = !!attempt?.submitted_at;
              const inProgress = !!attempt && !submitted;
              return (
                <Card key={ct.test_id} className="p-5 transition-all hover:shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        {test.subject} · Grade {test.grade}
                      </div>
                      <h3 className="mt-0.5 font-semibold">{test.title}</h3>
                    </div>
                    <StatusPill status={submitted ? "submitted" : inProgress ? "in-progress" : "new"} />
                  </div>
                  <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {test.duration_min} minutes
                  </div>
                  {submitted && attempt ? (
                    <Link href={`/result/${attempt.id}`} className="w-full">
                      <Button variant="outline" className="w-full">
                        <CheckCircle2 className="mr-1 h-4 w-4" /> See your result
                      </Button>
                    </Link>
                  ) : inProgress && attempt ? (
                    <Link href={`/take/${attempt.id}`} className="w-full">
                      <Button className="w-full">
                        <PlayCircle className="mr-1 h-4 w-4" /> Continue
                      </Button>
                    </Link>
                  ) : (
                    <form action={async () => {
                      "use server";
                      await startAttemptForStudent(test.id);
                    }}>
                      <Button type="submit" className="w-full">
                        <Sparkles className="mr-1 h-4 w-4" /> Start
                      </Button>
                    </form>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: "new" | "in-progress" | "submitted" }) {
  const styles = {
    new: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    "in-progress": "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    submitted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  }[status];
  const label = { new: "New", "in-progress": "In progress", submitted: "Done" }[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>{label}</span>;
}
