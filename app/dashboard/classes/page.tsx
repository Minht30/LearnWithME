import Link from "next/link";
import { createAdminClient, getDemoTeacherId } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
import { Card } from "@/components/ui/card";
import { GraduationCap, Copy } from "lucide-react";

type ClassRow = {
  id: string;
  name: string;
  grade: string;
  join_code: string;
  created_at: string;
  class_tests: { test_id: string; tests: { title: string } | null }[];
  students: { count: number }[];
};

async function loadClasses(): Promise<ClassRow[]> {
  const teacherId = await getDemoTeacherId();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("classes")
    .select("id, name, grade, join_code, created_at, class_tests(test_id, tests(title)), students(count)")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ClassRow[];
}

export default async function ClassesPage() {
  const classes = await loadClasses();
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Your classes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {classes.length === 0
            ? "No classes yet — share a test with a class to create one."
            : `${classes.length} class${classes.length === 1 ? "" : "es"} on file.`}
        </p>
      </header>

      {classes.length === 0 ? (
        <Card className="p-10 text-center">
          <GraduationCap className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold">No classes yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a test and click <span className="font-medium text-foreground">Share with a class</span> to create one.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Grade {c.grade} · {c.students[0]?.count ?? 0} students joined
                  </p>
                </div>
                <span className="rounded-md border-2 border-dashed px-2 py-1 font-mono text-sm tracking-widest">
                  {c.join_code}
                </span>
              </div>
              <div className="mt-3 space-y-1">
                {c.class_tests.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No test attached.</p>
                ) : (
                  c.class_tests.map((ct) => (
                    <Link
                      key={ct.test_id}
                      href={`/dashboard/tests/${ct.test_id}`}
                      className="block truncate text-sm text-muted-foreground hover:text-foreground"
                    >
                      · {ct.tests?.title ?? "(untitled test)"}
                    </Link>
                  ))
                )}
              </div>
              <div className="mt-3 flex items-center gap-1 rounded bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground">
                <Copy className="h-3 w-3" />
                /join/{c.join_code}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
