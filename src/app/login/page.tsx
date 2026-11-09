import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { LocaleToggle } from "@/components/LocaleToggle";
import { getDict } from "@/lib/locale";
import { db } from "@/lib/db";
import { loginAs } from "@/app/actions/auth";
import { SYSTEM_USER_EMAIL } from "@/server/certificates";

export const metadata: Metadata = { title: "Log in" };

const PERSONA_HINTS: Record<string, { en: string; ar: string }> = {
  "ahmed@demo.dari-mvp.ae": {
    en: "Owns 3 ready properties and 2 off-plan units. Sell a property, request a title deed, pay escrow installments.",
    ar: "يملك 3 عقارات جاهزة ووحدتين على الخارطة. بِع عقاراً، واطلب سند ملكية، وادفع أقساط الضمان.",
  },
  "fatima@demo.dari-mvp.ae": {
    en: "Buyer persona. Sees properties transferred to her once the registry approves a sale.",
    ar: "شخصية المشتري. تظهر لها العقارات بعد اعتماد السجل لعملية البيع.",
  },
  "omar@saadiyat-horizon.ae": {
    en: "Developer. Registers projects, sells off-plan units and claims escrow releases per milestone.",
    ar: "مطور عقاري. يسجل المشاريع ويبيع الوحدات على الخارطة ويطلب صرف الضمان حسب المراحل.",
  },
  "mariam@registry.dari-mvp.ae": {
    en: "Registry reviewer. Approves, rejects or returns applications, projects and milestone reports.",
    ar: "مراجعة السجل العقاري. تعتمد أو ترفض أو تعيد الطلبات والمشاريع وتقارير الإنجاز.",
  },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { t, locale } = await getDict();
  const { error } = await searchParams;
  const users = await db.user.findMany({
    where: { email: { in: Object.keys(PERSONA_HINTS) }, NOT: { email: SYSTEM_USER_EMAIL } },
    orderBy: { role: "asc" },
  });

  return (
    <div className="min-h-screen bg-sage-mist">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Logo />
        <LocaleToggle label={t.language} />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-medium text-ink-soft shadow-sm">
            <span className="h-2 w-2 rounded-full bg-success" /> UAE Pass (simulated)
          </div>
          <h1 className="text-3xl font-bold">{t.loginTitle}</h1>
          <p className="mt-2 text-metal">{t.loginBody}</p>
          {error && <p className="mt-4 rounded-xl bg-danger-light px-4 py-2 text-sm text-danger">Unknown demo user.</p>}
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {users.map((u) => (
            <form key={u.id} action={loginAs} className="card flex flex-col p-6">
              <input type="hidden" name="userId" value={u.id} />
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-ink text-lg font-bold text-sage">{u.name.charAt(0)}</div>
                <div>
                  <p className="font-bold">{locale === "ar" ? u.nameAr : u.name}</p>
                  <p className="text-sm text-teal-dark">{t[`role_${u.role}`]}{u.company ? ` · ${u.company}` : ""}</p>
                </div>
              </div>
              <p className="mt-4 flex-1 text-sm text-metal">{PERSONA_HINTS[u.email][locale]}</p>
              <p className="mt-3 font-mono text-xs text-metal" dir="ltr">EID {u.emiratesId}</p>
              <button type="submit" className="btn-primary mt-5 w-full">
                {t.continueAs} {locale === "ar" ? u.nameAr : u.name.split(" ")[0]}
              </button>
            </form>
          ))}
        </div>
      </main>
    </div>
  );
}
