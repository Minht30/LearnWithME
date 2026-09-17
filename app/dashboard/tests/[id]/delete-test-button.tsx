"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteTest } from "@/app/actions/test-actions";

/**
 * Delete-test control on the test detail page. Two-click confirm inline
 * (no browser modal, kid-friendly). Only owning teacher can hit this,
 * enforced server-side too.
 */
export function DeleteTestButton({ testId, title }: { testId: string; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      const res = await deleteTest(testId);
      if (res.ok) {
        toast.success(`Deleted "${title}"`);
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(res.error);
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <Button
        variant="outline"
        onClick={() => setConfirming(true)}
        className="rounded-full text-[var(--danger)] hover:bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] hover:text-[var(--danger)] hover:border-[var(--danger)]/60"
        aria-label={`Delete test ${title}`}
      >
        <Trash2 className="mr-1 h-4 w-4" /> Delete
      </Button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--danger)]/50 bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] p-1 pl-3">
      <span className="text-xs font-semibold text-[var(--danger)]">Delete this test?</span>
      <Button
        variant="destructive"
        onClick={onDelete}
        disabled={pending}
        className="rounded-full h-8 px-3 text-xs"
      >
        {pending ? (
          <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Deleting…</>
        ) : (
          <>Yes, delete</>
        )}
      </Button>
      <Button
        variant="ghost"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="rounded-full h-8 px-3 text-xs"
      >
        Cancel
      </Button>
    </div>
  );
}
