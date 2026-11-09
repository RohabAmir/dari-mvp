import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/locale";
import { getApplicationDetail } from "@/server/applications";
import { ServiceError } from "@/server/errors";
import { asDataPublic } from "@/lib/appData";
import { aed } from "@/lib/format";
import { db } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { ApplicationSummary } from "@/components/ApplicationSummary";
import { ApplicationDecision } from "../ReviewActions";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["REVIEWER"]);
  const { t, locale } = await getDict();
  const ar = locale === "ar";
  const app = await getApplicationDetail(user, id).catch((e) => {
    if (e instanceof ServiceError) notFound();
    throw e;
  });
  const data = asDataPublic(app.data);

  const checks: { label: string; ok: boolean }[] = [];
  if (app.property) {
    const owner = app.property.ownerId;
    checks.push({
      label: app.type === "FIRST_SALE" ? (ar ? "الوحدة غير مباعة" : "Unit is unsold") : ar ? "البائع هو المالك المسجل" : "Seller is the registered owner",
      ok: app.type === "FIRST_SALE" ? owner === null : owner === app.applicantId,
    });
  }
  if (data.contract && app.property) {
    const ratio = data.contract.salePrice / app.property.marketValue;
    checks.push({
      label: `${ar ? "السعر ضمن نطاق السوق" : "Price within market range"} (${Math.round(ratio * 100)}% ${ar ? "من القيمة" : "of value"})`,
      ok: ratio >= 0.7 && ratio <= 1.5,
    });
  }
  checks.push({ label: ar ? "الرسوم مدفوعة" : "Fees paid", ok: app.payment?.status === "PAID" });
  if (app.type !== "CERTIFICATE") checks.push({ label: ar ? "المستندات المطلوبة مرفقة" : "Required documents attached", ok: app.documents.length >= 3 });
  if (data.buyer) {
    const buyerOwns = await db.property.count({ where: { ownerId: data.buyer.userId } });
    checks.push({ label: `${ar ? "المشتري موثق في السجل" : "Buyer verified in registry"} (${buyerOwns} ${ar ? "عقار" : "properties held"})`, ok: true });
  }

  const decision =
    app.status === "SUBMITTED" ? (
      <Card className="p-5">
        <h3 className="font-bold">{ar ? "القرار" : "Decision"}</h3>
        <ul className="my-4 space-y-2 text-sm">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2">
              <span className={c.ok ? "text-success" : "text-danger"}>{c.ok ? "\u2713" : "\u2717"}</span>
              <span className={c.ok ? "" : "text-danger"}>{c.label}</span>
            </li>
          ))}
        </ul>
        {app.type === "FIRST_SALE" && data.contract?.downPaymentPct !== undefined && (
          <p className="mb-4 rounded-lg bg-teal-light px-3 py-2 text-xs text-teal-dark">
            {ar ? "عند الاعتماد يودع" : "On approval"} {aed(Math.round((data.contract.salePrice * data.contract.downPaymentPct) / 100), locale)}{" "}
            {ar ? "في حساب ضمان المشروع." : "is recorded in the project escrow and an ownership certificate is issued to the buyer."}
          </p>
        )}
        <ApplicationDecision
          id={app.id}
          labels={{ approve: t.approve, reject: t.reject, returnApp: t.returnApp, placeholder: ar ? "ملاحظة للمتقدم (مطلوبة عند الإعادة أو الرفض)" : "Comment for the applicant (required to return or reject)" }}
        />
      </Card>
    ) : undefined;

  return (
    <>
      <PageHeader title={t[`type_${app.type}`]} subtitle={`${t.reference}: ${app.reference}`} back={{ href: "/review", label: t.nav_review }} />
      <ApplicationSummary app={app} t={t} locale={locale} aside={decision} />
    </>
  );
}
