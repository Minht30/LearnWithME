"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { generateTest } from "@/app/actions/generate-test";
import { extractDocumentText } from "@/app/actions/extract-doc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Loader2, Paperclip, X } from "lucide-react";
import type { QuestionType } from "@/lib/schemas/question";

const SUBJECTS = [
  "Math",
  "English",
  "French",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "Social Studies",
];

const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const QTYPES: { value: QuestionType; label: string }[] = [
  { value: "mcq", label: "Multiple choice" },
  { value: "short", label: "Short answer" },
  { value: "numeric", label: "Numeric" },
  { value: "long", label: "Long answer" },
];

export default function NewTestPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState("Math");
  const [grade, setGrade] = useState("4");
  const [count, setCount] = useState(20);
  const [duration, setDuration] = useState(30);
  const [types, setTypes] = useState<QuestionType[]>(["mcq", "short"]);
  const [prompt, setPrompt] = useState(
    "Generate a mix of multiplication and division word problems suitable for a Grade 4 warm-up quiz."
  );
  const [source, setSource] = useState<{ filename: string; text: string } | null>(null);
  const [extracting, setExtracting] = useState(false);

  function toggleType(t: QuestionType) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await extractDocumentText(fd);
    setExtracting(false);
    if (res.ok) {
      setSource({ filename: res.filename, text: res.text });
      toast.success(`Extracted ${res.text.length.toLocaleString()} characters from ${res.filename}`);
    } else {
      toast.error(res.error);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onSubmit() {
    if (types.length === 0) {
      toast.error("Pick at least one question type.");
      return;
    }
    startTransition(async () => {
      const res = await generateTest(
        {
          subject,
          grade,
          count,
          duration_min: duration,
          types,
          prompt,
        },
        source?.text
      );
      if (res.ok) {
        toast.success("Test generated. Opening it now.");
        router.push(`/dashboard/tests/${res.testId}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">New test</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe what you want and we&apos;ll generate the questions.
        </p>
      </header>

      <Card className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">Subject</Label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="mb-1.5 block">Grade</Label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">Number of questions</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 20)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Duration (minutes)</Label>
            <Input
              type="number"
              min={5}
              max={240}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 30)}
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Question types</Label>
          <div className="flex flex-wrap gap-2">
            {QTYPES.map((qt) => {
              const on = types.includes(qt.value);
              return (
                <button
                  key={qt.value}
                  type="button"
                  onClick={() => toggleType(qt.value)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    on
                      ? "border-foreground bg-foreground text-background"
                      : "border-input text-muted-foreground hover:border-foreground/40"
                  }`}
                >
                  {qt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="prompt" className="mb-1.5 block">
            Describe the test
          </Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder='e.g. "100 mixed multiplication and division questions, Grade 4."'
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Be specific about topic, skill, or difficulty. The more you give the AI, the more curriculum-aligned the questions.
          </p>
        </div>

        <div>
          <Label className="mb-1.5 block">Source material (optional)</Label>
          {source ? (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="truncate">
                <Paperclip className="mr-1 inline h-3.5 w-3.5" />
                {source.filename} · {source.text.length.toLocaleString()} chars
              </span>
              <button
                type="button"
                onClick={() => setSource(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={onFile}
                className="hidden"
                id="doc-upload"
              />
              <label
                htmlFor="doc-upload"
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed py-4 text-sm text-muted-foreground hover:border-foreground/40 hover:text-foreground ${
                  extracting ? "pointer-events-none opacity-60" : ""
                }`}
              >
                {extracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Extracting…
                  </>
                ) : (
                  <>
                    <Paperclip className="h-4 w-4" /> Upload a PDF, DOCX, or TXT
                  </>
                )}
              </label>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Questions will draw from this material. 10 MB max.
              </p>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-5">
          <p className="text-xs text-muted-foreground">
            Uses Groq · gpt-oss 120B · ~10-20s
          </p>
          <Button onClick={onSubmit} disabled={pending} size="lg">
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Generate test
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
