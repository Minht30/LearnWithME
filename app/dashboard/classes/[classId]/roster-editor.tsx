"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { addStudent, removeStudent, resetStudentPassword } from "@/app/actions/student-roster";
import {
  UserPlus, Trash2, KeyRound, Eye, EyeOff, Copy, RefreshCw, Sparkles,
} from "lucide-react";

type Student = {
  id: string;
  display_name: string;
  username: string | null;
  password_plain: string | null;
  self_signup?: boolean;
  last_seen_at?: string | null;
  created_at: string;
};

function randomPassword(len = 8) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); toast.success("Copied."); }
  catch { toast.error("Couldn't copy."); }
}

export function RosterEditor({
  classId, students, joinCode,
}: { classId: string; students: Student[]; joinCode: string }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(() => randomPassword());
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [resetForId, setResetForId] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await addStudent({
        classId,
        displayName: name.trim(),
        username: username.trim(),
        password,
      });
      if (res.ok) {
        toast.success(`${name} added.`);
        setName("");
        setUsername("");
        setPassword(randomPassword());
      } else {
        toast.error(res.error);
      }
    });
  }

  function onDelete(studentId: string, displayName: string) {
    if (!confirm(`Remove ${displayName}? Their attempts will be deleted too.`)) return;
    startTransition(async () => {
      const res = await removeStudent(classId, studentId);
      if (res.ok) toast.success("Student removed.");
      else toast.error(res.error);
    });
  }

  function onReset(studentId: string) {
    if (resetPw.length < 6) { toast.error("At least 6 characters."); return; }
    startTransition(async () => {
      const res = await resetStudentPassword(classId, studentId, resetPw);
      if (res.ok) {
        toast.success("Password reset.");
        setResetForId(null);
        setResetPw("");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div>
      <h2 className="mb-3 font-display text-2xl font-bold">Students</h2>

      <Card className="lwm-card p-5 mb-5">
        <p className="mb-3 text-sm font-semibold">Add a student</p>
        <form onSubmit={onAdd} className="grid gap-3 sm:grid-cols-4" aria-label="Add student">
          <div>
            <Label htmlFor="s-name" className="mb-1 block text-xs">Full name</Label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" required />
          </div>
          <div>
            <Label htmlFor="s-user" className="mb-1 block text-xs">Username</Label>
            <Input id="s-user" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="jane" required minLength={3} />
          </div>
          <div>
            <Label htmlFor="s-pw" className="mb-1 block text-xs">Password</Label>
            <div className="flex gap-1.5">
              <Input id="s-pw" value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" required minLength={6} />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setPassword(randomPassword())}
                aria-label="Generate a new password"
              >
                <KeyRound className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="candy" className="w-full rounded-full" disabled={pending}>
              <UserPlus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </form>
      </Card>

      {students.length === 0 ? (
        <Card className="lwm-card p-6 text-center text-sm text-muted-foreground">
          No students yet. Share <span className="font-mono font-semibold text-foreground">{joinCode}</span> so they can self-sign-up, or add one above.
        </Card>
      ) : (
        <Card className="lwm-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Roster with usernames and passwords for recovery.</caption>
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 text-left">Student</th>
                <th scope="col" className="px-4 py-2 text-left">Username</th>
                <th scope="col" className="px-4 py-2 text-left">Password</th>
                <th scope="col" className="px-4 py-2 text-left">Joined</th>
                <th scope="col" className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((s) => {
                const shown = reveal[s.id];
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-xs font-bold text-white">
                          {s.display_name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium">{s.display_name}</span>
                        {s.self_signup && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-[color-mix(in_oklab,var(--brand)_18%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[color-mix(in_oklab,var(--brand)_90%,black)] dark:text-[var(--brand)]" title="Self-signed up">
                            <Sparkles className="h-2.5 w-2.5" /> new
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {s.username ? (
                        <button
                          onClick={() => copy(s.username!)}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          aria-label={`Copy username ${s.username}`}
                        >
                          @{s.username} <Copy className="h-3 w-3 opacity-50" />
                        </button>
                      ) : (
                        <span className="text-muted-foreground italic">guest</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {s.password_plain ? (
                        <span className="inline-flex items-center gap-1">
                          <span aria-label={shown ? "Password visible" : "Password hidden"}>
                            {shown ? s.password_plain : "•".repeat(Math.max(6, s.password_plain.length))}
                          </span>
                          <button
                            onClick={() => setReveal((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                            aria-label={shown ? "Hide password" : "Show password"}
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                          >
                            {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          {shown && (
                            <button
                              onClick={() => copy(s.password_plain!)}
                              aria-label="Copy password"
                              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">(hidden — reset to reveal)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {resetForId === s.id ? (
                          <>
                            <Input
                              value={resetPw}
                              onChange={(e) => setResetPw(e.target.value)}
                              placeholder="new password"
                              className="h-8 w-32 text-xs font-mono"
                              autoFocus
                            />
                            <Button size="sm" variant="candy" className="h-8 rounded-full" onClick={() => onReset(s.id)} disabled={pending}>
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => { setResetForId(null); setResetPw(""); }}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setResetForId(s.id); setResetPw(randomPassword()); }}
                              aria-label={`Reset password for ${s.display_name}`}
                            >
                              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reset
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDelete(s.id, s.display_name)}
                              disabled={pending}
                              aria-label={`Remove ${s.display_name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </Card>
      )}
    </div>
  );
}
