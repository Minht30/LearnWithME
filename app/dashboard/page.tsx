import Link from "next/link";
import { createAdminClient, getDemoTeacherId } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { FileText, Plus, Clock } from "lucide-react";
import type { DbTest } from "@/lib/db/types";

async function loadTests(): Promise<DbTest[]> {
  const teacherId = await getDemoTeacherId();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tests")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbTest[];
}

export default async function DashboardPage() {
  const tests = await loadTests();
  return (
    <div>
      <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your tests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tests.length === 0
              ? "No tests yet — generate your first one to get started."
              : `${tests.length} test${tests.length === 1 ? "" : "s"} on file.`}
          </p>
        </div>
        <Link href="/dashboard/new" className={cn(buttonVariants({ size: "lg" }))}>
          <Plus className="mr-1 h-4 w-4" /> New test
        </Link>
      </header>

      {tests.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => (
            <TestCard key={t.id} test={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="p-10 text-center">
      <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Nothing here yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Describe a test in a sentence and get back questions in seconds.
      </p>
      <Link
        href="/dashboard/new"
        className={cn(buttonVariants({ size: "lg" }), "mt-6")}
      >
        Generate your first test
      </Link>
    </Card>
  );
}

function TestCard({ test }: { test: DbTest }) {
  return (
    <Link href={`/dashboard/tests/${test.id}`}>
      <Card className="p-5 transition-all hover:border-foreground/20 hover:shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{test.subject}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono">Grade {test.grade}</span>
            </div>
            <h3 className="mt-2 line-clamp-2 font-semibold">{test.title}</h3>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {test.duration_min} min
          </span>
          <span>·</span>
          <span>{new Date(test.created_at).toLocaleDateString()}</span>
        </div>
      </Card>
    </Link>
  );
}
