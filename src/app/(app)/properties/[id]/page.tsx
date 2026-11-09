import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/locale";
import { db } from "@/lib/db";
import { aed, date } from "@/lib/format";
import { CERTIFICATE_FEES } from "@/lib/fees";
import { AUTO_APPROVED } from "@/server/certificates";
import { Card, KeyValue, PageHeader, ProgressBar, StatusBadge } from "@/components/ui";
import { CertificateRequest } from "./CertificateRequest";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["APPLICANT"]);
  const { t, locale } = await getDict();
  const ar = locale === "ar";

  const p = await db.property.findUnique({
    where: { id },
    include: {
      project: { include: { developer: true } },
      certificates: { where: { ownerId: user.id }, orderBy: { issuedAt: "desc" } },
      applications: { where: { applicantId: user.id }, orderBy: { createdAt: "desc" }, take: 5 },
      escrowTxns: { where: { payerId: user.id } },
    },
  });
  if (!p || p.ownerId !== user.id) notFound();
  const paid = p.escrowTxns.reduce((s, x) => s + x.amount, 0);

  return (
    <>
      <PageHeader
        title={`${p.type} ${p.unitNumber}`}
        subtitle={`${p.project?.name ?? p.community}, ${p.district}`}
        back={{ href: "/properties", label: t.nav_properties }}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-5 text-lg font-bold">{ar ? "بيانات العقار" : "Property details"}</h2>
            <KeyValue
              items={[
                { label: ar ? "رقم الوحدة" : "Unit number", value: p.unitNumber },
                { label: ar ? "رقم القطعة" : "Plot number", value: p.plotNumber },
                { label: t.community, value: p.community },
                { label: t.type, value: `${p.type} · ${p.bedrooms} BR` },
                { label: t.area, value: `${p.areaSqm} m²` },
                { label: t.value, value: aed(p.marketValue, locale) },
                { label: ar ? "السجل" : "Register", value: p.isOffPlan ? (ar ? "السجل المبدئي (على الخارطة)" : "Initial register (off-plan)") : ar ? "السجل العقاري" : "Real estate register" },
                ...(p.project ? [{ label: t.role_DEVELOPER, value: p.project.developer.company ?? p.project.developer.name }] : []),
              ]}
            />
          </Card>

          {p.project && p.isOffPlan && (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{ar ? "تقدم المشروع" : "Project progress"}</h2>
                <Link href="/escrow" className="text-sm text-teal-dark hover:underline">{t.deposits}</Link>
              </div>
              <div className="mt-4 flex justify-between text-sm"><span className="text-metal">{t.completion}</span><span className="font-medium">{p.project.completionPct}%</span></div>
              <div className="mt-2"><ProgressBar value={p.project.completionPct} /></div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-metal">{ar ? "المدفوع في الضمان" : "Paid into escrow"}</p><p className="font-bold">{aed(paid, locale)}</p></div>
                <div><p className="text-xs text-metal">{ar ? "التسليم المتوقع" : "Expected handover"}</p><p className="font-bold">{date(p.project.handoverDate, locale)}</p></div>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-bold">{t.nav_certificates}</h2>
            {p.certificates.length === 0 ? (
              <p className="text-sm text-metal">{t.noData}</p>
            ) : (
              <ul className="divide-y divide-line">
                {p.certificates.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="flex-1">
                      <p className="font-medium">{t[`cert_${c.type}`]}</p>
                      <p className="font-mono text-xs text-metal" dir="ltr">{c.number} · {date(c.issuedAt, locale)}</p>
                    </div>
                    <a className="btn-outline px-3 py-1.5 text-xs" href={`/api/certificates/${c.number}/pdf`} target="_blank">{t.download}</a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {p.applications.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-bold">{t.recentApplications}</h2>
              <ul className="divide-y divide-line">
                {p.applications.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-3 text-sm">
                    <Link href={`/applications/${a.id}`} className="flex-1 hover:text-teal-dark">{t[`type_${a.type}`]} <span className="font-mono text-xs text-metal">{a.reference}</span></Link>
                    <StatusBadge status={a.status} t={t} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside>
          <CertificateRequest
            propertyId={p.id}
            locale={locale}
            labels={{ title: t.requestCertificate, total: t.total, pay: t.payAndSubmit }}
            options={(["TITLE_DEED", "OWNERSHIP", "VALUATION"] as const)
              .filter((c) => c !== "TITLE_DEED" || !p.isOffPlan)
              .map((c) => ({ type: c, label: t[`cert_${c}`], fee: CERTIFICATE_FEES[c], instant: AUTO_APPROVED.includes(c) }))}
          />
        </aside>
      </div>
    </>
  );
}
