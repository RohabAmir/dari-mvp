import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/locale";
import { getApplicationDetail } from "@/server/applications";
import { ServiceError } from "@/server/errors";
import { isEditable } from "@/lib/workflow";
import { asDataPublic } from "@/lib/appData";
import { PageHeader } from "@/components/ui";
import { ApplicationSummary } from "@/components/ApplicationSummary";

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { id } = await params;
  const { submitted } = await searchParams;
  const user = await requireUser();
  const { t, locale } = await getDict();
  const ar = locale === "ar";

  const app = await getApplicationDetail(user, id).catch((e) => {
    if (e instanceof ServiceError) notFound();
    throw e;
  });
  const data = asDataPublic(app.data);
  const canEdit = app.applicantId === user.id && isEditable(app.status) && app.type !== "CERTIFICATE";

  return (
    <>
      <PageHeader
        title={t[`type_${app.type}`]}
        subtitle={`${t.reference}: ${app.reference}`}
        back={{ href: user.role === "REVIEWER" ? "/review" : "/applications", label: user.role === "REVIEWER" ? t.nav_review : t.nav_applications }}
        action={canEdit ? <Link href={`/applications/${app.id}/edit`} className="btn-primary">{app.status === "RETURNED" ? (ar ? "تعديل وإعادة الإرسال" : "Correct and resubmit") : ar ? "متابعة الطلب" : "Continue application"}</Link> : undefined}
      />
      {submitted && app.status === "SUBMITTED" && (
        <div className="mb-6 flex items-start gap-4 rounded-2xl border border-success/30 bg-success-light p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success text-lg text-white">{"\u2713"}</span>
          <div>
            <p className="font-bold text-success-dark">{ar ? "تم إرسال طلبك بنجاح" : "Your application was submitted"}</p>
            <p className="text-sm text-ink-soft">
              {ar ? "تم استلام الدفع وإرسال الطلب لمراجع السجل العقاري." : "Payment received and the application is now with a registry reviewer. You will see their decision in the history below."}
            </p>
          </div>
        </div>
      )}
      {app.status === "RETURNED" && data.lastComment && (
        <div className="mb-6 rounded-2xl border border-warning/30 bg-warning-light p-5 text-sm">
          <p className="font-bold text-warning">{t.reviewerComment}</p>
          <p className="mt-1 text-ink-soft">{data.lastComment}</p>
        </div>
      )}
      {app.status === "REJECTED" && data.lastComment && (
        <div className="mb-6 rounded-2xl border border-danger/30 bg-danger-light p-5 text-sm">
          <p className="font-bold text-danger">{ar ? "سبب الرفض" : "Reason for rejection"}</p>
          <p className="mt-1 text-ink-soft">{data.lastComment}</p>
        </div>
      )}
      <ApplicationSummary app={app} t={t} locale={locale} />
    </>
  );
}
