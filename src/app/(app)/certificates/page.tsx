import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/locale";
import { date } from "@/lib/format";
import { listMyCertificates } from "@/server/certificates";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  const user = await requireUser(["APPLICANT"]);
  const { t, locale } = await getDict();
  const ar = locale === "ar";
  const certs = await listMyCertificates(user);

  return (
    <>
      <PageHeader
        title={t.nav_certificates}
        subtitle={ar ? "كل شهادة تحمل رمز QR يمكن لأي جهة التحقق منه." : "Every certificate carries a QR code that banks and buyers can verify."}
        action={<Link href="/properties" className="btn-primary">+ {t.requestCertificate}</Link>}
      />
      {certs.length === 0 ? (
        <EmptyState title={t.noData} action={<Link href="/properties" className="btn-primary">{t.requestCertificate}</Link>} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>{ar ? "رقم الشهادة" : "Certificate no."}</th>
                <th>{t.type}</th>
                <th>{t.property}</th>
                <th>{t.issued}</th>
                <th>{t.validUntil}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => {
                const expired = c.validUntil < new Date();
                return (
                  <tr key={c.id}>
                    <td className="font-mono text-xs" dir="ltr">{c.number}</td>
                    <td>{t[`cert_${c.type}`]}</td>
                    <td>{c.property.unitNumber}, {c.property.community}</td>
                    <td className="text-metal">{date(c.issuedAt, locale)}</td>
                    <td className={expired ? "text-danger" : "text-metal"}>{date(c.validUntil, locale)}</td>
                    <td className="space-x-3 text-end whitespace-nowrap rtl:space-x-reverse">
                      <a className="text-sm font-medium text-teal-dark hover:underline" href={`/api/certificates/${c.number}/pdf`} target="_blank">{t.download}</a>
                      <Link className="text-sm text-metal hover:underline" href={`/verify/${c.number}`}>{ar ? "تحقق" : "Verify"}</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
