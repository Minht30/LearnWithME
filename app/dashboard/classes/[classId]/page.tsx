import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacherId } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Copy, GraduationCap } from "lucide-react";
import { RosterEditor } from "./roster-editor";

export const dynamic = "force-dynamic";

async function loadClass(classId: string) {
  const teacherId = await requireTeacherId();
  const admin = createAdminClient();
  const { data: cls } = await admin
    .from("classes")
    .select("id, name, grade, join_code, teacher_id")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (!cls) return null;
  const { data: students } = await admin
    .from("students")
    .select("id, display_name, username, created_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  const { data: classTests } = await admin
    .from("class_tests")
    .select("test_id, tests(title)")
    .eq("class_id", classId);
  return { cls, students: students ?? [], classTests: classTests ?? [] };
}

export default async function ClassPage({
  params,
}: PageProps<"/dashboard/classes/[classId]">) {
  const { classId } = await params;
  const data = await loadClass(classId);
  if (!data) return notFound();
  const { cls, students, classTests } = data;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/classes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to classes
        </Link>
      </div>

      <header className="mb-6 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Grade {cls.grade}</span>
            <span>·</span>
            <span>{students.length} student{students.length === 1 ? "" : "s"}</span>
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{cls.name}</h1>
        </div>
        <Card className="p-4 min-w-[220px]">
          <div className="text-xs uppercase text-muted-foreground">Join code</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-widest">{cls.join_code}</div>
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Copy className="h-3 w-3" /> /join/{cls.join_code}
          </div>
        </Card>
      </header>

      <div className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Assigned tests</h2>
        {classTests.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No tests yet. Open a test and click <span className="font-medium text-foreground">Share with a class</span> to attach it.
          </p>
        ) : (
          <div className="space-y-1">
            {classTests.map((ct) => {
              const testInfo = ct.tests && !Array.isArray(ct.tests) ? (ct.tests as { title: string }) : null;
              return (
                <Link
                  key={ct.test_id}
                  href={`/dashboard/tests/${ct.test_id}`}
                  className="block rounded-md border px-3 py-2 text-sm hover:border-foreground/40"
                >
                  {testInfo?.title ?? "(untitled)"}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <RosterEditor classId={classId} students={students} joinCode={cls.join_code} />
    </div>
  );
}
