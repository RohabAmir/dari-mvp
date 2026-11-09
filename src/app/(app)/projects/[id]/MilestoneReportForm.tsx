"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { aed } from "@/lib/format";
import { submitMilestoneAction } from "@/app/actions/escrow";

export function MilestoneReportForm({
  milestoneId,
  title,
  targetPct,
  estimatedRelease,
  locale,
}: {
  milestoneId: string;
  title: string;
  targetPct: number;
  estimatedRelease: number;
  locale: Locale;
}) {
  const ar = locale === "ar";
  const router = useRouter();
  const [pct, setPct] = useState(String(targetPct));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitMilestoneAction(milestoneId, { completionPct: pct, note });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="card p-5">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-1 text-xs text-metal">
        {ar ? "يتطلب" : "Requires"} {targetPct}% {ar ? "إنجاز. الصرف المتوقع:" : "construction. Estimated release:"}{" "}
        <b className="text-teal-dark">{aed(estimatedRelease, locale)}</b>
      </p>
      <label className="label mt-4">{ar ? "نسبة الإنجاز الفعلية (%)" : "Actual completion (%)"}</label>
      <input className="input" type="number" min={0} max={100} value={pct} onChange={(e) => setPct(e.target.value)} />
      <label className="label mt-3">{ar ? "ملخص تقرير الاستشاري" : "Consultant report summary"}</label>
      <textarea
        className="input min-h-24"
        value={note}
        placeholder={ar ? "صف الأعمال المنجزة..." : "e.g. Structural frame topped out on all 14 floors, certified by the supervising consultant."}
        onChange={(e) => setNote(e.target.value)}
      />
      <button
        type="button"
        className="mt-2 text-xs text-teal-dark hover:underline"
        onClick={() => setNote("Structural frame topped out on all floors. Inspection certificate issued by the supervising consultant.")}
      >
        {ar ? "استخدم نصاً تجريبياً" : "Use sample report text"}
      </button>
      {error && <p className="mt-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}
      <button type="button" className="btn-teal mt-4 w-full" disabled={pending} onClick={submit}>
        {pending ? "..." : ar ? "إرسال للمراجعة" : "Submit for review"}
      </button>
    </div>
  );
}
