import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/locale";
import { aed, date } from "@/lib/format";
import { listMyApplications } from "@/server/applications";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { isEditable } from "@/lib/workflow";

export const metadata: Metadata = { title: "My applications" };

export default async function ApplicationsPage() {
  const user = await requireUser(["APPLICANT", "DEVELOPER"]);
  const { t, locale } = await getDict();
  const apps = await listMyApplications(user);

  return (
    <>
      <PageHeader
        title={t.nav_applications}
        subtitle={locale === "ar" ? "تتبع حالة طلباتك ومدفوعاتك." : "Track the status of your applications and payments."}
        action={<Link href="/services" className="btn-primary">+ {t.nav_services}</Link>}
      />
      {apps.length === 0 ? (
        <EmptyState title={t.noData} action={<Link href="/services" className="btn-primary">{t.nav_services}</Link>} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>{t.reference}</th>
                <th>{t.type}</th>
                <th>{t.property}</th>
                <th>{t.fees}</th>
                <th>{t.status}</th>
                <th>{t.updated}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id} className="hover:bg-canvas/60">
                  <td className="font-mono text-xs" dir="ltr">{a.reference}</td>
                  <td>{t[`type_${a.type}`]}</td>
                  <td>{a.property ? `${a.property.unitNumber}, ${a.property.community}` : "-"}</td>
                  <td>{a.feeTotal ? aed(a.feeTotal, locale) : "-"}</td>
                  <td><StatusBadge status={a.status} t={t} /></td>
                  <td className="text-metal">{date(a.updatedAt, locale)}</td>
                  <td className="text-end">
                    <Link
                      className="text-sm font-medium text-teal-dark hover:underline"
                      href={isEditable(a.status) && a.type !== "CERTIFICATE" ? `/applications/${a.id}/edit` : `/applications/${a.id}`}
                    >
                      {isEditable(a.status) && a.type !== "CERTIFICATE" ? (locale === "ar" ? "متابعة" : "Continue") : t.open}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
