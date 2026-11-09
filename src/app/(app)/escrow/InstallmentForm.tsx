"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { payInstallmentAction } from "@/app/actions/escrow";

export function InstallmentForm({ propertyId, label, suggested, locale }: { propertyId: string; label: string; suggested: number; locale: Locale }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(suggested));
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function pay() {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await payInstallmentAction({ propertyId, amount });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex gap-2">
        <input className="input" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount in AED" />
        <button type="button" className="btn-teal shrink-0" disabled={pending} onClick={pay}>{pending ? "..." : label}</button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {done && <p className="mt-2 text-sm text-success-dark">{locale === "ar" ? "تم إيداع الدفعة في حساب الضمان." : "Payment deposited into escrow."}</p>}
    </div>
  );
}
