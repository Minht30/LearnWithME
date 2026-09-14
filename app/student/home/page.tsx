import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStudent } from "@/lib/auth/student-session";
import { signOutStudent } from "@/app/actions/student-auth";
import { startAttemptForStudent } from "@/app/actions/student-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, Clock, CheckCircle2, PlayCircle, Sparkles } from "lucide-react";
import { AppBrand, AppHeaderControls } from "@/components/ui/app-header";
import { Mascot } from "@/components/ui/mascot";

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
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <AppBrand />
          <div className="flex items-center gap-3">
            <AppHeaderControls />
            <form action={signOutStudent}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Mascot mood="wave" size={72} />
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight">
              Hi, {student.display_name.split(" ")[0]}!
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {cls?.name} · Grade {cls?.grade} —{" "}
              {classTests.length === 0
                ? "your teacher hasn't shared a test yet."
                : "tap a test to start or resume."}
            </p>
          </div>
        </div>

        {classTests.length === 0 ? (
          <Card className="lwm-card p-10 text-center">
            <GraduationCap className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Nothing assigned yet. Check back soon!</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
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
                <Card key={ct.test_id} className="lwm-card p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                        {test.subject} · Grade {test.grade}
                      </div>
                      <h3 className="mt-0.5 font-display text-xl font-bold">{test.title}</h3>
                    </div>
                    <StatusPill status={submitted ? "submitted" : inProgress ? "in-progress" : "new"} />
                  </div>
                  <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {test.duration_min} minutes
                  </div>
                  {submitted && attempt ? (
                    <Link href={`/result/${attempt.id}`} className="w-full">
                      <Button variant="outline" className="w-full rounded-full">
                        <CheckCircle2 className="mr-1 h-4 w-4" /> See your result
                      </Button>
                    </Link>
                  ) : inProgress && attempt ? (
                    <Link href={`/take/${attempt.id}`} className="w-full">
                      <Button variant="candy" className="w-full rounded-full h-11">
                        <PlayCircle className="mr-1 h-4 w-4" /> Continue
                      </Button>
                    </Link>
                  ) : (
                    <form action={async () => {
                      "use server";
                      await startAttemptForStudent(test.id);
                    }}>
                      <Button type="submit" variant="candy" className="w-full rounded-full h-11">
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
    new: "bg-[color-mix(in_oklab,var(--brand)_18%,transparent)] text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]",
    "in-progress": "bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] text-[color-mix(in_oklab,var(--accent)_80%,black)] dark:text-[var(--accent)]",
    submitted: "bg-[color-mix(in_oklab,var(--success)_20%,transparent)] text-[color-mix(in_oklab,var(--success)_80%,black)] dark:text-[var(--success)]",
  }[status];
  const label = { new: "New", "in-progress": "In progress", submitted: "Done" }[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${styles}`}>{label}</span>;
}
