import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LocaleToggle } from "@/components/LocaleToggle";
import { getDict } from "@/lib/locale";
import { date } from "@/lib/format";
import { findCertificate } from "@/server/certificates";

export const metadata: Metadata = { title: "Verify certificate" };

function maskName(name: string) {
  return name
    .split(" ")
    .map((w, i) => (i === 0 ? w : `${w.charAt(0)}${"*".repeat(Math.max(2, w.length - 1))}`))
    .join(" ");
}

export default async function VerifyPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const { t, locale } = await getDict();
  const ar = locale === "ar";
  const cert = await findCertificate(decodeURIComponent(number).toUpperCase());
  const expired = cert ? cert.validUntil < new Date() : false;

  return (
    <div className="min-h-screen bg-sage-mist">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <Logo />
        <LocaleToggle label={t.language} />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-center text-2xl font-bold">{t.verifyTitle}</h1>
        <div className="card mt-6 overflow-hidden">
          {cert ? (
            <>
              <div className={expired ? "bg-warning-light p-6" : "bg-success-light p-6"}>
                <div className="flex items-center gap-4">
                  <span className={`grid h-12 w-12 place-items-center rounded-full text-xl text-white ${expired ? "bg-warning" : "bg-success"}`}>
                    {expired ? "!" : "\u2713"}
                  </span>
                  <div>
                    <p className={`text-lg font-bold ${expired ? "text-warning" : "text-success-dark"}`}>
                      {expired ? (ar ? "الشهادة صحيحة لكنها منتهية" : "Authentic, but this certificate has expired") : t.verified}
                    </p>
                    <p className="font-mono text-sm text-ink-soft" dir="ltr">{cert.number}</p>
                  </div>
                </div>
              </div>
              <dl className="grid gap-5 p-6 sm:grid-cols-2">
                <Row label={t.type} value={t[`cert_${cert.type}`]} />
                <Row label={t.owner} value={maskName(cert.owner.name)} />
                <Row label={t.property} value={`${cert.property.type} ${cert.property.unitNumber}`} />
                <Row label={t.community} value={`${cert.property.project?.name ?? cert.property.community}, ${cert.property.district}`} />
                <Row label={t.issued} value={date(cert.issuedAt, locale)} />
                <Row label={t.validUntil} value={date(cert.validUntil, locale)} />
              </dl>
              <p className="border-t border-line px-6 py-4 text-xs text-metal">
                {ar ? "تُخفى بيانات المالك جزئياً لحماية الخصوصية." : "Owner details are partially masked to protect privacy."}
              </p>
            </>
          ) : (
            <div className="p-10 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger text-xl text-white">{"\u2717"}</span>
              <p className="mt-4 text-lg font-bold text-danger">{t.notVerified}</p>
              <p className="mt-1 font-mono text-sm text-metal" dir="ltr">{decodeURIComponent(number)}</p>
            </div>
          )}
        </div>
        <p className="mt-6 text-center">
          <Link href="/" className="text-sm text-teal-dark hover:underline">{ar ? "العودة للرئيسية" : "Back to home"}</Link>
        </p>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-metal">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
