"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { Dict, Locale } from "@/lib/i18n";
import { transactionFees } from "@/lib/fees";
import { aed } from "@/lib/format";
import { lookupBuyerAction, saveStepAction, submitAction } from "@/app/actions/applications";

type TxType = "FIRST_SALE" | "SELL_PURCHASE";

export interface WizardProps {
  locale: Locale;
  t: Dict;
  app: {
    id: string;
    reference: string;
    type: TxType;
    status: string;
    currentStep: number;
    propertyId: string | null;
    buyer: { userId: string; name: string; emiratesId: string } | null;
    contract: { salePrice: number; contractDate: string; downPaymentPct?: number } | null;
    lastComment: string | null;
    paid: boolean;
  };
  seller: { name: string; emiratesId: string; kind: "developer" | "owner" };
  properties: {
    id: string;
    unitNumber: string;
    plotNumber: string;
    type: string;
    bedrooms: number;
    areaSqm: number;
    marketValue: number;
    community: string;
    project: string | null;
  }[];
  documents: { kind: string; fileName: string; sizeBytes: number }[];
  requiredDocs: { kind: string; label: string; labelAr: string }[];
}

export function Wizard({ locale, t, app, seller, properties, documents, requiredDocs }: WizardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(Math.min(app.currentStep, 4));
  const [maxStep, setMaxStep] = useState(app.currentStep);
  const [error, setError] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState(app.propertyId ?? "");
  const [emiratesId, setEmiratesId] = useState(app.buyer?.emiratesId ?? "");
  const [buyerName, setBuyerName] = useState(app.buyer?.name ?? "");
  const [buyerFound, setBuyerFound] = useState<boolean | null>(app.buyer ? true : null);
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [salePrice, setSalePrice] = useState(app.contract?.salePrice?.toString() ?? "");
  const [contractDate, setContractDate] = useState(app.contract?.contractDate ?? new Date().toISOString().slice(0, 10));
  const [downPaymentPct, setDownPaymentPct] = useState(app.contract?.downPaymentPct?.toString() ?? "20");
  const [docs, setDocs] = useState(documents);
  const [method, setMethod] = useState<"CARD" | "APPLE_PAY" | "BANK_TRANSFER">("CARD");
  const [card, setCard] = useState({ number: "4111 1111 1111 1111", expiry: "12/29", cvc: "123" });

  const ar = locale === "ar";
  const property = properties.find((p) => p.id === propertyId);
  const priceNum = Number(salePrice);
  const fees = useMemo(() => (priceNum > 0 ? transactionFees(app.type, priceNum) : null), [app.type, priceNum]);

  const steps = [t.step_property, t.step_parties, t.step_contract, t.step_documents, t.step_review];

  function save(target: number, input: unknown) {
    setError(null);
    startTransition(async () => {
      const res = await saveStepAction(app.id, step, input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMaxStep((m) => Math.max(m, target));
      setStep(target);
    });
  }

  function next() {
    switch (step) {
      case 0:
        return save(1, { propertyId });
      case 1:
        return save(2, { emiratesId, name: buyerFound ? "" : buyerName, phone: buyerPhone, email: buyerEmail });
      case 2:
        return save(3, { salePrice, contractDate, downPaymentPct: app.type === "FIRST_SALE" ? downPaymentPct : undefined });
      case 3:
        return save(4, { documents: docs });
    }
  }

  function lookup() {
    setError(null);
    startTransition(async () => {
      const res = await lookupBuyerAction(emiratesId);
      setBuyerFound(res.found);
      setBuyerName(res.name ?? "");
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitAction(app.id, { method, cardLast4: card.number.replace(/\s/g, "").slice(-4) });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/applications/${app.id}?submitted=1`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="card overflow-hidden">
        <ol className="flex border-b border-line bg-canvas/60 px-2">
          {steps.map((label, i) => {
            const done = i < step || i < maxStep;
            const reachable = i <= maxStep;
            return (
              <li key={label} className="flex-1">
                <button
                  type="button"
                  disabled={!reachable || pending}
                  onClick={() => setStep(i)}
                  className={clsx(
                    "flex w-full flex-col items-center gap-1.5 px-1 py-4 text-xs transition sm:flex-row sm:justify-center sm:text-sm",
                    i === step ? "text-ink" : "text-metal",
                    reachable && "cursor-pointer hover:text-ink",
                  )}
                >
                  <span
                    className={clsx(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold",
                      i === step && "border-ink bg-ink text-white",
                      i !== step && done && "border-teal bg-teal text-white",
                      i !== step && !done && "border-disabled bg-white",
                    )}
                  >
                    {done && i !== step ? "\u2713" : i + 1}
                  </span>
                  <span className="hidden text-center md:inline">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="p-6">
          {app.lastComment && (
            <div className="mb-5 rounded-xl border border-warning/30 bg-warning-light p-4 text-sm">
              <p className="font-medium text-warning">{t.reviewerComment}</p>
              <p className="mt-1 text-ink-soft">{app.lastComment}</p>
            </div>
          )}

          {step === 0 && (
            <section>
              <h2 className="text-lg font-bold">{ar ? "اختر العقار" : "Select the property"}</h2>
              <p className="mt-1 text-sm text-metal">
                {app.type === "FIRST_SALE"
                  ? ar ? "الوحدات المتاحة في مشاريعك النشطة." : "Available units in your active off-plan projects."
                  : ar ? "العقارات المسجلة باسمك وليس عليها معاملة مفتوحة." : "Properties registered in your name with no open transaction."}
              </p>
              {properties.length === 0 ? (
                <p className="mt-6 rounded-xl bg-canvas p-6 text-center text-sm text-metal">{t.noData}</p>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {properties.map((p) => (
                    <label
                      key={p.id}
                      className={clsx(
                        "cursor-pointer rounded-xl border p-4 transition",
                        propertyId === p.id ? "border-teal bg-teal-light ring-2 ring-teal/20" : "border-line hover:border-celadon",
                      )}
                    >
                      <input type="radio" name="property" className="sr-only" checked={propertyId === p.id} onChange={() => setPropertyId(p.id)} />
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold">{p.type} {p.unitNumber}</p>
                          <p className="text-sm text-metal">{p.project ?? p.community}</p>
                        </div>
                        <span className="rounded-lg bg-sage-mist px-2 py-0.5 text-xs text-ink-soft">{p.bedrooms} BR</span>
                      </div>
                      <div className="mt-3 flex justify-between text-xs text-metal">
                        <span>{p.areaSqm} m² · Plot {p.plotNumber}</span>
                        <span className="font-medium text-ink">{aed(p.marketValue, locale)}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </section>
          )}

          {step === 1 && (
            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-bold">{ar ? "البائع" : "Seller"}</h2>
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-canvas p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-ink font-bold text-sage">{seller.name.charAt(0)}</div>
                  <div>
                    <p className="font-medium">{seller.name}</p>
                    <p className="font-mono text-xs text-metal" dir="ltr">{seller.emiratesId}</p>
                  </div>
                  <span className="ms-auto rounded-full bg-sage-soft px-2.5 py-0.5 text-xs">{seller.kind === "developer" ? t.role_DEVELOPER : t.owner}</span>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold">{ar ? "المشتري" : "Buyer"}</h2>
                <p className="mt-1 text-sm text-metal">
                  {ar ? "ابحث في السجل برقم الهوية الإماراتية. جرّب 784-1990-7654321-2" : "Look the buyer up in the registry by Emirates ID. Try 784-1990-7654321-2 (Fatima)."}
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    className="input font-mono"
                    dir="ltr"
                    placeholder="784-XXXX-XXXXXXX-X"
                    value={emiratesId}
                    onChange={(e) => {
                      setEmiratesId(e.target.value);
                      setBuyerFound(null);
                    }}
                  />
                  <button type="button" className="btn-outline shrink-0" disabled={pending || emiratesId.length < 10} onClick={lookup}>
                    {ar ? "بحث" : "Look up"}
                  </button>
                </div>
                {buyerFound === true && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-success/30 bg-success-light px-4 py-3 text-sm text-success-dark">
                    <span>{"\u2713"}</span> {ar ? "تم العثور على المشتري:" : "Buyer found in registry:"} <b>{buyerName}</b>
                  </div>
                )}
                {buyerFound === false && (
                  <div className="mt-4 grid gap-4 rounded-xl border border-line p-4 sm:grid-cols-2">
                    <p className="text-sm text-warning sm:col-span-2">
                      {ar ? "المشتري غير مسجل. أدخل بياناته لإضافته." : "Not in the registry yet. Enter their details to add them."}
                    </p>
                    <div className="sm:col-span-2">
                      <label className="label">{ar ? "الاسم الكامل" : "Full name"}</label>
                      <input className="input" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">{ar ? "الهاتف" : "Phone"}</label>
                      <input className="input" dir="ltr" placeholder="+9715XXXXXXXX" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">{ar ? "البريد الإلكتروني" : "Email"}</label>
                      <input className="input" dir="ltr" type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2 className="text-lg font-bold">{ar ? "تفاصيل العقد" : "Contract details"}</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">{ar ? "سعر البيع (درهم)" : "Sale price (AED)"}</label>
                  <input className="input" type="number" min={1} value={salePrice} placeholder={property?.marketValue.toString()} onChange={(e) => setSalePrice(e.target.value)} />
                  {property && (
                    <p className="mt-1 text-xs text-metal">{t.value}: {aed(property.marketValue, locale)}</p>
                  )}
                </div>
                <div>
                  <label className="label">{ar ? "تاريخ العقد" : "Contract date"}</label>
                  <input className="input" type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
                </div>
                {app.type === "FIRST_SALE" && (
                  <div>
                    <label className="label">{ar ? "الدفعة المقدمة (%)" : "Down payment (%)"}</label>
                    <input className="input" type="number" min={10} max={100} value={downPaymentPct} onChange={(e) => setDownPaymentPct(e.target.value)} />
                    {priceNum > 0 && (
                      <p className="mt-1 text-xs text-teal-dark">
                        {ar ? "يودع في حساب الضمان:" : "Deposited to escrow on approval:"} {aed(Math.round((priceNum * Number(downPaymentPct)) / 100), locale)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2 className="text-lg font-bold">{ar ? "المستندات المطلوبة" : "Required documents"}</h2>
              <p className="mt-1 text-sm text-metal">PDF, JPG or PNG. {ar ? "الملفات محاكاة في النسخة التجريبية." : "Files are simulated in this demo; only metadata is stored."}</p>
              <ul className="mt-5 space-y-3">
                {requiredDocs.map((d) => {
                  const current = docs.find((x) => x.kind === d.kind);
                  return (
                    <li key={d.kind} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-4">
                      <span className={clsx("grid h-9 w-9 place-items-center rounded-lg", current ? "bg-success-light text-success-dark" : "bg-canvas text-metal")}>
                        {current ? "\u2713" : "\u21E7"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{ar ? d.labelAr : d.label}</p>
                        <p className="truncate text-xs text-metal">
                          {current ? `${current.fileName} · ${(current.sizeBytes / 1024).toFixed(0)} KB` : ar ? "لم يتم الرفع" : "Not uploaded"}
                        </p>
                      </div>
                      <label className="btn-outline cursor-pointer px-3 py-2 text-xs">
                        {current ? (ar ? "استبدال" : "Replace") : ar ? "رفع" : "Upload"}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setDocs((prev) => [...prev.filter((x) => x.kind !== d.kind), { kind: d.kind, fileName: f.name, sizeBytes: f.size }]);
                          }}
                        />
                      </label>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                className="mt-4 text-sm text-teal-dark underline-offset-2 hover:underline"
                onClick={() =>
                  setDocs(requiredDocs.map((d) => ({ kind: d.kind, fileName: `${d.kind.toLowerCase()}_${app.reference}.pdf`, sizeBytes: 180_000 + Math.floor(Math.random() * 300_000) })))
                }
              >
                {ar ? "استخدم ملفات تجريبية" : "Use sample files for the demo"}
              </button>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-bold">{ar ? "مراجعة الطلب" : "Review your application"}</h2>
                <dl className="mt-4 grid gap-4 rounded-xl bg-canvas p-5 text-sm sm:grid-cols-2">
                  <Item label={t.property} value={property ? `${property.type} ${property.unitNumber}, ${property.project ?? property.community}` : "-"} />
                  <Item label={ar ? "البائع" : "Seller"} value={seller.name} />
                  <Item label={ar ? "المشتري" : "Buyer"} value={`${buyerName} (${emiratesId})`} />
                  <Item label={ar ? "سعر البيع" : "Sale price"} value={priceNum ? aed(priceNum, locale) : "-"} />
                  {app.type === "FIRST_SALE" && <Item label={ar ? "الدفعة المقدمة" : "Down payment"} value={`${downPaymentPct}%`} />}
                  <Item label={t.step_documents} value={`${docs.length} / ${requiredDocs.length}`} />
                </dl>
              </div>

              {app.paid ? (
                <div className="rounded-xl border border-success/30 bg-success-light p-4 text-sm text-success-dark">
                  {ar ? "تم دفع الرسوم مسبقاً. يمكنك إعادة الإرسال دون دفع." : "Fees were already paid. You can resubmit without paying again."}
                </div>
              ) : (
                <div>
                  <h2 className="text-lg font-bold">{ar ? "طريقة الدفع" : "Payment method"}</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {(["CARD", "APPLE_PAY", "BANK_TRANSFER"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={clsx(
                          "rounded-xl border p-3 text-sm font-medium transition",
                          method === m ? "border-teal bg-teal-light ring-2 ring-teal/20" : "border-line hover:border-celadon",
                        )}
                      >
                        {m === "CARD" ? (ar ? "بطاقة ائتمان" : "Credit card") : m === "APPLE_PAY" ? "Apple Pay" : ar ? "تحويل بنكي" : "Bank transfer"}
                      </button>
                    ))}
                  </div>
                  {method === "CARD" && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <input className="input font-mono sm:col-span-2" dir="ltr" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} />
                      <input className="input font-mono" dir="ltr" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} />
                      <input className="input font-mono" dir="ltr" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} />
                    </div>
                  )}
                  <p className="mt-2 text-xs text-metal">{ar ? "بوابة دفع تجريبية. لن يتم خصم أي مبلغ." : "Mock payment gateway. No money is charged."}</p>
                </div>
              )}
            </section>
          )}

          {error && <p className="mt-6 rounded-xl bg-danger-light px-4 py-3 text-sm text-danger">{error}</p>}

          <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
            <button type="button" className="btn-ghost" disabled={step === 0 || pending} onClick={() => setStep(step - 1)}>
              {t.back}
            </button>
            {step < 4 ? (
              <button
                type="button"
                className="btn-primary min-w-32"
                disabled={pending || (step === 0 && !propertyId) || (step === 1 && buyerFound === null)}
                onClick={next}
              >
                {pending ? "..." : t.next}
              </button>
            ) : (
              <button type="button" className="btn-teal min-w-40" disabled={pending} onClick={submit}>
                {pending ? "..." : app.paid ? t.resubmit : `${t.payAndSubmit} ${fees ? aed(fees.total, locale) : ""}`}
              </button>
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card p-5">
          <h3 className="font-bold">{t.fees}</h3>
          {fees ? (
            <ul className="mt-3 space-y-2 text-sm">
              {fees.lines.map((l) => (
                <li key={l.key} className="flex justify-between gap-3">
                  <span className="text-metal">{ar ? l.labelAr : l.label}</span>
                  <span className="shrink-0">{aed(l.amount, locale)}</span>
                </li>
              ))}
              <li className="flex justify-between border-t border-line pt-2 font-bold">
                <span>{t.total}</span>
                <span>{aed(fees.total, locale)}</span>
              </li>
            </ul>
          ) : (
            <p className="mt-2 text-sm text-metal">{ar ? "تُحتسب الرسوم بعد إدخال سعر البيع." : "Fees are calculated once you enter the sale price."}</p>
          )}
        </div>
        {property && (
          <div className="card p-5 text-sm">
            <h3 className="font-bold">{t.property}</h3>
            <p className="mt-2">{property.type} {property.unitNumber}</p>
            <p className="text-metal">{property.project ?? property.community}</p>
            <p className="mt-2 text-metal">{property.areaSqm} m² · {property.bedrooms} BR</p>
          </div>
        )}
        <div className="rounded-2xl bg-sage-mist p-5 text-sm text-ink-soft">
          <p className="font-medium text-ink">{ar ? "ماذا يحدث بعد ذلك؟" : "What happens next?"}</p>
          <p className="mt-1">
            {ar
              ? "يراجع موظف السجل طلبك. عند الاعتماد تنتقل الملكية ويصدر الشهادة تلقائياً."
              : "A registry reviewer checks your application. On approval, ownership transfers and the certificate is issued automatically."}
          </p>
        </div>
      </aside>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-metal">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
