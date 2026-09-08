"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shareTestWithClass } from "@/app/actions/test-actions";
import { toast } from "sonner";
import { Copy, Users, Check } from "lucide-react";

export function ShareCard({
  testId,
  initialJoinCode,
  defaultName,
  grade,
}: {
  testId: string;
  initialJoinCode: string | null;
  defaultName: string;
  grade: string;
}) {
  const [code, setCode] = useState<string | null>(initialJoinCode);
  const [name, setName] = useState(defaultName);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function onShare() {
    startTransition(async () => {
      const res = await shareTestWithClass(testId, name, grade);
      if (res.ok) {
        setCode(res.joinCode);
        toast.success("Ready to share.");
      } else toast.error(res.error);
    });
  }

  const shareUrl =
    typeof window !== "undefined" && code
      ? `${window.location.origin}/join/${code}`
      : "";

  async function copyUrl() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Link copied.");
  }

  if (code) {
    return (
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-emerald-600" />
          Ready for your class
        </div>
        <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
          Join code
        </Label>
        <div className="mb-4 rounded-lg border-2 border-dashed py-4 text-center font-mono text-3xl font-bold tracking-widest">
          {code}
        </div>
        <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
          Or share this link
        </Label>
        <div className="flex gap-2">
          <Input value={shareUrl} readOnly className="font-mono text-xs" />
          <Button size="icon" variant="outline" onClick={copyUrl}>
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Students can practise without an account — just the code or link.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4" />
        Share with a class
      </div>
      <Label htmlFor="cls" className="mb-1.5 block">
        Class name
      </Label>
      <Input
        id="cls"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Room 12 · Ms. Tran"
        className="mb-3"
      />
      <Button className="w-full" onClick={onShare} disabled={pending || !name}>
        {pending ? "Creating…" : "Generate join code"}
      </Button>
    </Card>
  );
}
