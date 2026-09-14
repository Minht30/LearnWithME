import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacherId } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { Inbox as InboxIcon, MessageSquare, UserPlus, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { markNotificationRead } from "@/app/actions/review-actions";
import { formatDistanceToNow } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const teacherId = await requireTeacherId();
  const admin = createAdminClient();

  const [{ data: submissions }, { data: notifications }] = await Promise.all([
    admin
      .from("attempts")
      .select("id, status, submitted_at, reviewed_at, students(id, display_name, username, class_id), tests(id, title, subject, grade, teacher_id)")
      .in("status", ["submitted"])
      .order("submitted_at", { ascending: false })
      .limit(200),
    admin
      .from("notifications")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  type SubRow = {
    id: string;
    status: string;
    submitted_at: string | null;
    reviewed_at: string | null;
    students: { id: string; display_name: string; username: string | null; class_id: string } | null;
    tests: { id: string; title: string; subject: string; grade: string; teacher_id: string } | null;
  };
  const own = ((submissions ?? []) as unknown as SubRow[]).filter(
    (s) => s.tests?.teacher_id === teacherId && s.students && s.tests
  );

  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submissions waiting for your review, and updates from your students.
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={async () => { "use server"; await markNotificationRead("all"); }}>
            <button
              type="submit"
              className="rounded-full border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              Mark all read
            </button>
          </form>
        )}
      </div>

      <section aria-labelledby="pending-heading" className="mb-10">
        <h2 id="pending-heading" className="mb-3 flex items-center gap-2 font-display text-2xl font-bold">
          <InboxIcon className="h-5 w-5 text-[var(--brand)]" /> Waiting for review
          <span className="ml-1 rounded-full bg-[var(--brand)] px-2 py-0.5 text-xs text-white">
            {own.length}
          </span>
        </h2>
        {own.length === 0 ? (
          <Card className="lwm-card p-8 text-center text-muted-foreground">
            All caught up. When students submit, their work lands here.
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {own.map((s) => (
              <li key={s.id}>
                <Link href={`/dashboard/review/${s.id}`} className="block focus:outline-none">
                  <Card className="lwm-card p-4 hover:border-[var(--brand)]/60 focus-within:border-[var(--brand)]">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                          {s.tests!.subject} · Grade {s.tests!.grade}
                        </div>
                        <p className="font-display text-lg font-bold">{s.tests!.title}</p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-xs font-bold text-white">
                        {s.students!.display_name[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium">{s.students!.display_name}</span>
                      {s.students!.username && (
                        <span className="text-xs text-muted-foreground">@{s.students!.username}</span>
                      )}
                      <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {s.submitted_at ? formatDistanceToNow(s.submitted_at) : ""}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="feed-heading">
        <h2 id="feed-heading" className="mb-3 flex items-center gap-2 font-display text-2xl font-bold">
          <MessageSquare className="h-5 w-5 text-[var(--brand)]" /> Recent activity
          {unreadCount > 0 && (
            <span className="ml-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-white">
              {unreadCount} new
            </span>
          )}
        </h2>
        {(notifications ?? []).length === 0 ? (
          <Card className="lwm-card p-6 text-center text-muted-foreground">
            Nothing to show yet.
          </Card>
        ) : (
          <ul className="space-y-2">
            {(notifications ?? []).map((n) => (
              <li key={n.id}>
                <NotificationRow n={n} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    submitted:  { label: "New",       cls: "bg-[color-mix(in_oklab,var(--brand)_18%,transparent)] text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]", icon: <AlertCircle className="h-3 w-3" /> },
    approved:   { label: "Approved",  cls: "bg-[color-mix(in_oklab,var(--success)_20%,transparent)] text-[color-mix(in_oklab,var(--success)_80%,black)] dark:text-[var(--success)]", icon: <CheckCircle2 className="h-3 w-3" /> },
    needs_redo: { label: "Redo",      cls: "bg-[color-mix(in_oklab,var(--warning)_20%,transparent)] text-[color-mix(in_oklab,var(--warning)_80%,black)] dark:text-[var(--warning)]", icon: <AlertCircle className="h-3 w-3" /> },
    in_progress:{ label: "Working",   cls: "bg-muted text-muted-foreground", icon: <Clock className="h-3 w-3" /> },
  };
  const it = map[status] ?? map.in_progress;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${it.cls}`}>
      {it.icon} {it.label}
    </span>
  );
}

function NotificationRow({ n }: { n: { id: string; kind: string; payload: Record<string, unknown>; read_at: string | null; created_at: string } }) {
  const unread = !n.read_at;
  const p = n.payload;
  const display = String(p.display_name ?? "");
  const cls = String(p.class_name ?? "");
  const username = String(p.username ?? "");
  return (
    <Card className={`lwm-card p-4 flex items-center gap-3 ${unread ? "border-[var(--brand)]/60" : ""}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--brand)_18%,transparent)]">
        {n.kind === "student_joined" ? (
          <UserPlus className="h-4 w-4 text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]" />
        ) : (
          <MessageSquare className="h-4 w-4 text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]" />
        )}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        {n.kind === "student_joined" ? (
          <p>
            <b>{display}</b>
            {username && <span className="text-muted-foreground"> (@{username})</span>}
            {" "}joined <b>{cls}</b>.
          </p>
        ) : (
          <p className="text-muted-foreground">{n.kind}</p>
        )}
        <p className="text-xs text-muted-foreground">{formatDistanceToNow(n.created_at)}</p>
      </div>
      {unread && (
        <form action={async () => { "use server"; await markNotificationRead(n.id); }}>
          <button
            type="submit"
            className="rounded-full border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Mark read"
          >
            Mark read
          </button>
        </form>
      )}
    </Card>
  );
}
