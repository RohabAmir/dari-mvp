"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { registerProjectAction } from "@/app/actions/escrow";

const BANKS = ["First Abu Dhabi Bank", "Abu Dhabi Commercial Bank", "Abu Dhabi Islamic Bank", "Emirates NBD", "Mashreq"];
const COMMUNITIES = ["Saadiyat Island", "Yas Island", "Al Reem Island", "Al Raha Beach", "Masdar City", "Al Maryah Island"];

export function ProjectForm({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const in2y = new Date(Date.now() + 730 * 86_400_000).toISOString().slice(0, 10);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await registerProjectAction(Object.fromEntries(formData));
      if (!res.ok || !res.data) {
        setError(res.ok ? "Failed" : res.error);
        return;
      }
      router.push(`/projects/${res.data.id}`);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="card grid gap-4 p-6 sm:grid-cols-2">
      <div>
        <label className="label">{ar ? "اسم المشروع (إنجليزي)" : "Project name (English)"}</label>
        <input name="name" className="input" required defaultValue="Al Raha Waterfront Lofts" />
      </div>
      <div>
        <label className="label">{ar ? "اسم المشروع (عربي)" : "Project name (Arabic)"}</label>
        <input name="nameAr" className="input" dir="rtl" required defaultValue="لوفتس واجهة الراحة البحرية" />
      </div>
      <div>
        <label className="label">{ar ? "المجتمع" : "Community"}</label>
        <select name="community" className="input" defaultValue="Al Raha Beach">
          {COMMUNITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{ar ? "المنطقة" : "District"}</label>
        <input name="district" className="input" required defaultValue="Abu Dhabi City" />
      </div>
      <div>
        <label className="label">{ar ? "عدد الوحدات" : "Number of units"}</label>
        <input name="totalUnits" type="number" min={4} max={60} className="input" required defaultValue={12} />
      </div>
      <div>
        <label className="label">{ar ? "بنك حساب الضمان" : "Escrow bank"}</label>
        <select name="bankName" className="input">
          {BANKS.map((b) => <option key={b}>{b}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{ar ? "تاريخ البدء" : "Construction start"}</label>
        <input name="startDate" type="date" className="input" required defaultValue={in30} />
      </div>
      <div>
        <label className="label">{ar ? "تاريخ التسليم" : "Expected handover"}</label>
        <input name="handoverDate" type="date" className="input" required defaultValue={in2y} />
      </div>
      {error && <p className="rounded-lg bg-danger-light px-3 py-2 text-sm text-danger sm:col-span-2">{error}</p>}
      <div className="flex justify-end border-t border-line pt-4 sm:col-span-2">
        <button className="btn-primary" disabled={pending} type="submit">{pending ? "..." : ar ? "إرسال للاعتماد" : "Submit for approval"}</button>
      </div>
    </form>
  );
}
