"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/errors";

export interface DecisionOption {
  value: string;
  label: string;
  tone: "teal" | "danger" | "outline";
  needsComment?: boolean;
}

export function DecisionForm({
  options,
  onDecide,
  placeholder,
  doneHref,
  compact = false,
}: {
  options: DecisionOption[];
  onDecide: (value: string, comment: string) => Promise<ActionResult>;
  placeholder: string;
  doneHref?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(o: DecisionOption) {
    setError(null);
    if (o.needsComment && comment.trim().length < 5) {
      setError(placeholder);
      return;
    }
    startTransition(async () => {
      const res = await onDecide(o.value, comment);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setComment("");
      if (doneHref) router.push(doneHref);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        className="input min-h-20 resize-y"
        rows={compact ? 2 : 3}
        placeholder={placeholder}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <p className="rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}
      <div className={compact ? "flex flex-wrap gap-2" : "grid gap-2"}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={pending}
            onClick={() => decide(o)}
            className={o.tone === "teal" ? "btn-teal" : o.tone === "danger" ? "btn-danger" : "btn-outline"}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
