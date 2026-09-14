"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { assignTestToStudents, unassignTest } from "@/app/actions/review-actions";
import { CalendarClock, CheckCircle2, User, X as XIcon, Send } from "lucide-react";
import { formatDueDate } from "@/lib/utils/date";

type Student = {
  id: string;
  display_name: string;
  username: string | null;
  class_name: string;
};

type Assignment = {
  student_id: string;
  due_at: string | null;
  priority: number;
};

export function AssignCard({
  testId,
  students,
  assignments,
}: {
  testId: string;
  students: Student[];
  assignments: Assignment[];
}) {
  const assignedMap = new Map(assignments.map((a) => [a.student_id, a]));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dueAt, setDueAt] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(students.map((s) => s.id))); }
  function selectNone() { setSelected(new Set()); }

  function submit() {
    if (selected.size === 0) { toast.error("Pick at least one student."); return; }
    startTransition(async () => {
      const res = await assignTestToStudents(testId, Array.from(selected), {
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        priority: 1,
        note: note.trim() || null,
      });
      if (res.ok) {
        toast.success(`Assigned to ${res.count} student${res.count === 1 ? "" : "s"}.`);
        setSelected(new Set());
      } else {
        toast.error(res.error);
      }
    });
  }

  function remove(studentId: string) {
    startTransition(async () => {
      const res = await unassignTest(testId, studentId);
      if (res.ok) toast.success("Removed.");
      else toast.error(res.error);
    });
  }

  return (
    <Card className="lwm-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Assign homework</h3>
        <span className="text-xs text-muted-foreground">{assignments.length} assigned</span>
      </div>

      <div className="mb-3 space-y-2">
        <div>
          <Label htmlFor="due" className="mb-1 block text-xs">Due date <span className="text-muted-foreground">(optional)</span></Label>
          <div className="relative">
            <CalendarClock className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="pl-9 h-10 rounded-2xl"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="note" className="mb-1 block text-xs">Note <span className="text-muted-foreground">(optional)</span></Label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Read Ch. 4 first"
            className="h-10 rounded-2xl"
          />
        </div>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No students in your classes yet.
        </p>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{selected.size} picked</span>
            <div className="flex gap-1">
              <button onClick={selectAll} className="underline hover:text-foreground">All</button>
              <span aria-hidden>·</span>
              <button onClick={selectNone} className="underline hover:text-foreground">None</button>
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto space-y-1 rounded-xl border bg-background/60 p-1">
            {students.map((s) => {
              const active = selected.has(s.id);
              const assigned = assignedMap.get(s.id);
              return (
                <li key={s.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-[color-mix(in_oklab,var(--brand)_15%,transparent)]"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggle(s.id)}
                      className="h-4 w-4 accent-[var(--brand)]"
                      aria-label={`Assign to ${s.display_name}`}
                    />
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-[10px] font-bold text-white">
                      {s.display_name[0]?.toUpperCase()}
                    </div>
                    <span className="min-w-0 flex-1 truncate">{s.display_name}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{s.class_name}</span>
                    {assigned && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-[color-mix(in_oklab,var(--success)_20%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[color-mix(in_oklab,var(--success)_80%,black)] dark:text-[var(--success)]">
                        <CheckCircle2 className="h-2.5 w-2.5" /> on
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Button
        onClick={submit}
        disabled={pending || selected.size === 0}
        variant="candy"
        className="mt-3 w-full rounded-full h-10"
      >
        <Send className="mr-1 h-4 w-4" /> Assign to {selected.size || "…"}
      </Button>

      {assignments.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs uppercase tracking-wide font-semibold text-muted-foreground">
            Currently assigned
          </p>
          <ul className="space-y-1 text-sm">
            {assignments.map((a) => {
              const s = students.find((st) => st.id === a.student_id);
              if (!s) return null;
              return (
                <li key={a.student_id} className="flex items-center gap-2 rounded-lg border bg-background/50 px-2 py-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{s.display_name}</span>
                  {a.due_at && (
                    <span className="text-xs text-muted-foreground">Due {formatDueDate(a.due_at)}</span>
                  )}
                  <button
                    onClick={() => remove(a.student_id)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Unassign ${s.display_name}`}
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
