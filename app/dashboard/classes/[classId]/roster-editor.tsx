"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { addStudent, removeStudent } from "@/app/actions/student-roster";
import { UserPlus, Trash2, KeyRound } from "lucide-react";

type Student = {
  id: string;
  display_name: string;
  username: string | null;
  created_at: string;
};

function randomPassword(len = 8) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function RosterEditor({
  classId,
  students,
  joinCode,
}: {
  classId: string;
  students: Student[];
  joinCode: string;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(() => randomPassword());
  const [lastCredential, setLastCredential] = useState<{ name: string; username: string; password: string } | null>(null);

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await addStudent({ classId, displayName: name.trim(), username: username.trim(), password });
      if (res.ok) {
        setLastCredential({ name: name.trim(), username: username.trim(), password });
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

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">Students</h2>

      <Card className="p-5 mb-5">
        <p className="mb-3 text-sm font-medium">Add a student</p>
        <form onSubmit={onAdd} className="grid gap-3 sm:grid-cols-4">
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
            <Button type="submit" className="w-full" disabled={pending}>
              <UserPlus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </form>

        {lastCredential && (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:bg-emerald-950/30 dark:border-emerald-800">
            <p className="font-medium text-emerald-900 dark:text-emerald-200">Credentials for {lastCredential.name}</p>
            <div className="mt-2 grid gap-1 font-mono text-xs">
              <div>Class code: <span className="font-semibold">{joinCode}</span></div>
              <div>Username: <span className="font-semibold">{lastCredential.username}</span></div>
              <div>Password: <span className="font-semibold">{lastCredential.password}</span></div>
            </div>
            <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-300">
              Copy these now — the password is not shown again. Students sign in at <span className="font-mono">/student/login</span>.
            </p>
          </div>
        )}
      </Card>

      {students.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No students yet. Add one above.
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {students.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs font-semibold dark:bg-amber-950 dark:text-amber-300">
                  {s.display_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.display_name}</p>
                  <p className="truncate text-xs text-muted-foreground font-mono">
                    {s.username ? `@${s.username}` : "guest (no login)"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(s.id, s.display_name)}
                  disabled={pending}
                  aria-label="Remove student"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
