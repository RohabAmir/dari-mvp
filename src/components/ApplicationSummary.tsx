import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
import { aed, date, dateTime } from "@/lib/format";
import { feesFor } from "@/lib/fees";
import type { getApplicationDetail } from "@/server/applications";
import { asDataPublic } from "@/lib/appData";
import { Card, KeyValue, StatusBadge } from "./ui";
import { Timeline } from "./Timeline";

type Detail = Awaited<ReturnType<typeof getApplicationDetail>>;

export function ApplicationSummary({ app, t, locale, aside }: { app: Detail; t: Dict; locale: Locale; aside?: React.ReactNode }) {
  const data = asDataPublic(app.data);
  const ar = locale === "ar";
  const certType = data.certType as "TITLE_DEED" | "OWNERSHIP" | "VALUATION" | undefined;
  const fees = app.type === "CERTIFICATE" || app.salePrice ? feesFor(app.type, app.salePrice, certType) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card className="p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{ar ? "تفاصيل الطلب" : "Application details"}</h2>
            <StatusBadge status={app.status} t={t} />
          </div>
          <KeyValue
            items={[
              { label: t.type, value: t[`type_${app.type}`] + (certType ? ` · ${t[`cert_${certType}`]}` : "") },
              { label: t.reference, value: <span className="font-mono text-sm" dir="ltr">{app.reference}</span> },
              {
                label: t.property,
                value: app.property ? `${app.property.type} ${app.property.unitNumber}, ${app.property.project?.name ?? app.property.community}` : "-",
              },
              { label: ar ? "مقدم الطلب" : "Applicant", value: app.applicant.company ?? app.applicant.name },
              ...(data.buyer ? [{ label: ar ? "المشتري" : "Buyer", value: `${data.buyer.name} (${data.buyer.emiratesId})` }] : []),
              ...(data.contract
                ? [
                    { label: ar ? "سعر البيع" : "Sale price", value: aed(data.contract.salePrice, locale) },
                    { label: ar ? "تاريخ العقد" : "Contract date", value: date(data.contract.contractDate, locale) },
                  ]
                : []),
              ...(data.contract?.downPaymentPct !== undefined && app.type === "FIRST_SALE"
                ? [{ label: ar ? "الدفعة المقدمة للضمان" : "Down payment to escrow", value: `${data.contract.downPaymentPct}% · ${aed(Math.round((data.contract.salePrice * data.contract.downPaymentPct) / 100), locale)}` }]
                : []),
              { label: t.submitted, value: dateTime(app.submittedAt, locale) },
            ]}
          />
        </Card>

        {app.documents.length > 0 && (
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-bold">{t.step_documents}</h2>
            <ul className="divide-y divide-line">
              {app.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-3 text-sm">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-danger-light text-xs font-bold text-danger">PDF</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.fileName}</p>
                    <p className="text-xs text-metal">{d.kind} · {(d.sizeBytes / 1024).toFixed(0)} KB</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="mb-5 text-lg font-bold">{t.history}</h2>
          <Timeline events={app.events} t={t} locale={locale} />
        </Card>
      </div>

      <aside className="space-y-4">
        {aside}
        {app.certificate && (
          <div className="rounded-2xl border border-success/30 bg-success-light p-5">
            <p className="text-sm font-medium text-success-dark">{ar ? "تم إصدار الشهادة" : "Certificate issued"}</p>
            <p className="mt-1 font-mono text-sm" dir="ltr">{app.certificate.number}</p>
            <div className="mt-4 flex gap-2">
              <a className="btn-primary flex-1 px-3 py-2" href={`/api/certificates/${app.certificate.number}/pdf`} target="_blank">{t.download}</a>
              <Link className="btn-outline px-3 py-2" href={`/verify/${app.certificate.number}`}>{ar ? "تحقق" : "Verify"}</Link>
            </div>
          </div>
        )}
        {fees && (
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{t.fees}</h3>
              {app.payment && <StatusBadge status={app.payment.status} t={t} />}
            </div>
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
            {app.payment && (
              <p className="mt-3 text-xs text-metal">
                {ar ? "إيصال" : "Receipt"} <span className="font-mono" dir="ltr">{app.payment.receiptNo}</span> · {app.payment.method.replace("_", " ")} · {dateTime(app.payment.paidAt, locale)}
              </p>
            )}
          </Card>
        )}
      </aside>
    </div>
  );
}
