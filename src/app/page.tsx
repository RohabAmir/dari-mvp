import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LocaleToggle } from "@/components/LocaleToggle";
import { getDict } from "@/lib/locale";
import { db } from "@/lib/db";
import { num } from "@/lib/format";

async function verify(formData: FormData) {
  "use server";
  const n = String(formData.get("number") ?? "").trim().toUpperCase();
  if (n) redirect(`/verify/${encodeURIComponent(n)}`);
}

export default async function Landing() {
  const { t, locale } = await getDict();
  const [transactions, certificates, projects] = await Promise.all([
    db.application.count({ where: { status: "COMPLETED", type: { not: "CERTIFICATE" } } }),
    db.certificate.count(),
    db.project.count({ where: { status: { in: ["ACTIVE", "COMPLETED"] } } }),
  ]);

  const features = [
    {
      icon: "\u21C4",
      title: locale === "ar" ? "تسجيل المعاملات العقارية" : "Transaction registration",
      body:
        locale === "ar"
          ? "معالج من خمس خطوات لتسجيل البيع الأول أو البيع والشراء، مع احتساب الرسوم والدفع وسير اعتماد المراجع."
          : "A five-step wizard for first-sale and sell/purchase registration with live fee calculation, payment and a registry approval workflow.",
    },
    {
      icon: "\u25C8",
      title: locale === "ar" ? "مشاريع على الخارطة وحسابات الضمان" : "Off-plan projects and escrow",
      body:
        locale === "ar"
          ? "تسجيل المشاريع، وإيداعات المشترين في حساب الضمان، وصرف الدفعات للمطور حسب مراحل الإنجاز المعتمدة."
          : "Project registration, buyer deposits held in escrow and milestone-based releases to developers only after registry approval.",
    },
    {
      icon: "\u2756",
      title: locale === "ar" ? "الملكية والشهادات الموثقة" : "Ownership and verified certificates",
      body:
        locale === "ar"
          ? "محفظة عقارات المالك وإصدار سندات الملكية والشهادات فوراً مع رمز QR للتحقق العام."
          : "An owner's property portfolio with instant title deeds and certificates, each carrying a QR code anyone can verify.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <LocaleToggle label={t.language} />
            <Link href="/login" className="btn-primary">{t.login}</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-sage-mist">
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-sage/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-teal/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
          <div>
            <span className="inline-block rounded-full border border-sage bg-white px-3 py-1 text-xs font-medium text-teal-dark">
              {t.tagline}
            </span>
            <h1 className="mt-5 text-4xl leading-tight font-bold text-ink md:text-5xl">{t.heroTitle}</h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">{t.heroBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary px-6 py-3">{t.getStarted}</Link>
              <a href="#verify" className="btn-outline px-6 py-3">{t.verifyCertificate}</a>
            </div>
          </div>
          <div className="grid content-center gap-4 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
            {[
              { v: transactions, l: locale === "ar" ? "معاملات مسجلة" : "Registered transactions" },
              { v: certificates, l: locale === "ar" ? "شهادات صادرة" : "Certificates issued" },
              { v: projects, l: locale === "ar" ? "مشاريع بحساب ضمان" : "Projects under escrow" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-white bg-white/80 p-6 shadow-sm backdrop-blur">
                <p className="text-4xl font-bold text-ink">{num(s.v, locale)}</p>
                <p className="mt-1 text-sm text-metal">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <h2 className="text-2xl font-bold md:text-3xl">{locale === "ar" ? "ثلاث خدمات أساسية" : "Three core services"}</h2>
        <p className="mt-2 text-metal">
          {locale === "ar"
            ? "الخدمات التي تقوم عليها قيمة منصة السجل العقاري الرقمي."
            : "The services that carry the business value of a digital land registry."}
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-ink text-xl text-sage">{f.icon}</div>
              <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-metal">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="verify" className="bg-ink">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <h2 className="text-2xl font-bold text-white">{t.verifyTitle}</h2>
            <p className="mt-1 text-white/70">
              {locale === "ar" ? "أدخل رقم الشهادة للتحقق من صحتها." : "Enter a certificate number to confirm it is authentic. Try CRT-202611-000001."}
            </p>
          </div>
          <form action={verify} className="flex w-full max-w-md gap-2">
            <input name="number" className="input border-white/20" placeholder="CRT-202611-000001" required />
            <button className="btn bg-sage text-ink hover:bg-celadon" type="submit">{t.verifyCertificate}</button>
          </form>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-metal md:px-6">
          <span>Dari-MVP. A demonstration build. Not affiliated with any government entity.</span>
          <span>Next.js · TypeScript · Prisma · PostgreSQL</span>
        </div>
      </footer>
    </div>
  );
}
