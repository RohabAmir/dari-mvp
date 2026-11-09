"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { Locale } from "@/lib/i18n";
import { aed } from "@/lib/format";
import { requestCertificateAction } from "@/app/actions/applications";

type CertType = "TITLE_DEED" | "OWNERSHIP" | "VALUATION";

export function CertificateRequest({
  propertyId,
  options,
  locale,
  labels,
}: {
  propertyId: string;
  options: { type: CertType; label: string; fee: number; instant: boolean }[];
  locale: Locale;
  labels: { title: string; total: string; pay: string };
}) {
  const router = useRouter();
  const ar = locale === "ar";
  const [type, setType] = useState<CertType>(options[0].type);
  const [method, setMethod] = useState<"CARD" | "APPLE_PAY">("CARD");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selected = options.find((o) => o.type === type)!;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await requestCertificateAction({ propertyId, type, method });
      if (!res.ok || !res.data) {
        setError(res.ok ? "Request failed" : res.error);
        return;
      }
      router.push(`/applications/${res.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="card sticky top-22 p-5">
      <h3 className="font-bold">{labels.title}</h3>
      <div className="mt-4 space-y-2">
        {options.map((o) => (
          <label
            key={o.type}
            className={clsx(
              "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition",
              type === o.type ? "border-teal bg-teal-light ring-2 ring-teal/20" : "border-line hover:border-celadon",
            )}
          >
            <input type="radio" className="accent-teal" checked={type === o.type} onChange={() => setType(o.type)} />
            <span className="flex-1">
              <span className="block text-sm font-medium">{o.label}</span>
              <span className="text-xs text-metal">
                {o.instant ? (ar ? "إصدار فوري" : "Issued instantly") : ar ? "يراجعه مقيّم السجل" : "Reviewed by a registry valuer"}
              </span>
            </span>
            <span className="text-sm font-medium">{aed(o.fee, locale)}</span>
          </label>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(["CARD", "APPLE_PAY"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={clsx("rounded-xl border p-2.5 text-sm", method === m ? "border-ink bg-ink text-white" : "border-line")}
          >
            {m === "CARD" ? (ar ? "بطاقة" : "Card") : "Apple Pay"}
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-between border-t border-line pt-3 font-bold">
        <span>{labels.total}</span>
        <span>{aed(selected.fee, locale)}</span>
      </div>
      {error && <p className="mt-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}
      <button type="button" className="btn-teal mt-4 w-full" disabled={pending} onClick={submit}>
        {pending ? "..." : labels.pay}
      </button>
      <p className="mt-2 text-center text-xs text-metal">{ar ? "دفع تجريبي" : "Mock payment, nothing is charged"}</p>
    </div>
  );
}
