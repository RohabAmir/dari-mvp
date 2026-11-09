import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/locale";
import { PageHeader } from "@/components/ui";
import { startTransaction } from "@/app/actions/applications";
import { CERTIFICATE_FEES, REGISTRATION_RATE } from "@/lib/fees";

export const metadata: Metadata = { title: "Services" };

interface Service {
  title: string;
  body: string;
  fee: string;
  sla: string;
  action: React.ReactNode;
}

export default async function ServicesPage() {
  const user = await requireUser(["APPLICANT", "DEVELOPER"]);
  const { t, locale } = await getDict();
  const ar = locale === "ar";

  const startBtn = (type: string) => (
    <form action={startTransaction}>
      <input type="hidden" name="type" value={type} />
      <button className="btn-primary w-full" type="submit">{t.startService}</button>
    </form>
  );
  const link = (href: string) => (
    <Link href={href} className="btn-primary w-full">{t.startService}</Link>
  );

  const groups: { title: string; services: Service[] }[] =
    user.role === "DEVELOPER"
      ? [
          {
            title: t.svc_transactions,
            services: [
              {
                title: t.type_FIRST_SALE,
                body: ar ? "سجّل بيع وحدة على الخارطة لمشترٍ، وتودع الدفعة المقدمة في حساب الضمان." : "Register the sale of an off-plan unit to a buyer. The down payment is deposited into the project escrow account.",
                fee: `${REGISTRATION_RATE.FIRST_SALE * 100}% + 200 AED`,
                sla: ar ? "يوم عمل واحد" : "1 working day",
                action: startBtn("FIRST_SALE"),
              },
            ],
          },
          {
            title: t.svc_escrow,
            services: [
              {
                title: t.newProject,
                body: ar ? "سجّل مشروعاً على الخارطة. عند الاعتماد يُفتح حساب ضمان وتُنشأ الوحدات." : "Register an off-plan project. On approval an escrow account is opened and units are created.",
                fee: ar ? "مجاناً" : "Free",
                sla: ar ? "يومان" : "2 working days",
                action: link("/projects/new"),
              },
              {
                title: t.submitReport,
                body: ar ? "قدّم تقرير إنجاز لمرحلة إنشائية لطلب صرف من حساب الضمان." : "Submit a construction progress report to request a release from escrow.",
                fee: ar ? "مجاناً" : "Free",
                sla: ar ? "يوم عمل واحد" : "1 working day",
                action: link("/projects"),
              },
            ],
          },
        ]
      : [
          {
            title: t.svc_transactions,
            services: [
              {
                title: t.type_SELL_PURCHASE,
                body: ar ? "سجّل بيع عقار جاهز تملكه لمشترٍ ونقل الملكية وإصدار سند ملكية جديد." : "Register the sale of a ready property you own, transfer ownership and issue a new title deed to the buyer.",
                fee: `${REGISTRATION_RATE.SELL_PURCHASE * 100}% + 450 AED`,
                sla: ar ? "يوم عمل واحد" : "1 working day",
                action: startBtn("SELL_PURCHASE"),
              },
            ],
          },
          {
            title: t.svc_certificates,
            services: [
              {
                title: t.cert_TITLE_DEED,
                body: ar ? "إصدار فوري لسند ملكية العقار." : "Instant issuance of the title deed for your property.",
                fee: `${CERTIFICATE_FEES.TITLE_DEED} AED`,
                sla: ar ? "فوري" : "Instant",
                action: link("/properties"),
              },
              {
                title: t.cert_OWNERSHIP,
                body: ar ? "شهادة بالعقارات التي تملكها حالياً." : "A certificate confirming the properties you currently own.",
                fee: `${CERTIFICATE_FEES.OWNERSHIP} AED`,
                sla: ar ? "فوري" : "Instant",
                action: link("/properties"),
              },
              {
                title: t.cert_VALUATION,
                body: ar ? "شهادة بالقيمة التقديرية للعقار يراجعها مقيّم معتمد." : "An estimated value certificate, reviewed by a registry valuer.",
                fee: `${CERTIFICATE_FEES.VALUATION} AED`,
                sla: ar ? "يوم عمل واحد" : "1 working day",
                action: link("/properties"),
              },
            ],
          },
          {
            title: t.svc_escrow,
            services: [
              {
                title: ar ? "الاستعلام عن الإيداعات" : "Inquiry about deposits",
                body: ar ? "اطلع على دفعاتك المودعة في حسابات ضمان المشاريع وادفع الأقساط." : "See the payments you have deposited into project escrow accounts and pay installments.",
                fee: ar ? "مجاناً" : "Free",
                sla: ar ? "فوري" : "Instant",
                action: link("/escrow"),
              },
            ],
          },
        ];

  return (
    <>
      <PageHeader title={t.servicesTitle} subtitle={t.servicesBody} />
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="mb-3 text-sm font-medium tracking-wide text-metal uppercase">{g.title}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {g.services.map((s) => (
                <div key={s.title} className="card flex flex-col p-5">
                  <h3 className="font-bold">{s.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-metal">{s.body}</p>
                  <div className="mt-4 flex gap-4 border-t border-line pt-4 text-xs text-ink-soft">
                    <span><span className="text-metal">{t.fees}: </span>{s.fee}</span>
                    <span><span className="text-metal">SLA: </span>{s.sla}</span>
                  </div>
                  <div className="mt-4">{s.action}</div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
