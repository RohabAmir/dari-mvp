import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/locale";
import { db } from "@/lib/db";
import { Logo } from "@/components/Logo";
import { LocaleToggle } from "@/components/LocaleToggle";
import { NavLinks, type NavItem } from "@/components/NavLinks";
import { logout } from "@/app/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { t, locale } = await getDict();

  let items: NavItem[];
  if (user.role === "REVIEWER") {
    const [apps, projects, milestones] = await Promise.all([
      db.application.count({ where: { status: "SUBMITTED" } }),
      db.project.count({ where: { status: "PENDING" } }),
      db.milestone.count({ where: { status: "SUBMITTED" } }),
    ]);
    items = [
      { href: "/dashboard", label: t.nav_dashboard, icon: "\u25A6" },
      { href: "/review", label: t.nav_review, icon: "\u2713", badge: apps + projects + milestones },
    ];
  } else if (user.role === "DEVELOPER") {
    items = [
      { href: "/dashboard", label: t.nav_dashboard, icon: "\u25A6" },
      { href: "/services", label: t.nav_services, icon: "\u2726" },
      { href: "/applications", label: t.nav_applications, icon: "\u2630" },
      { href: "/projects", label: t.nav_projects, icon: "\u25B2" },
    ];
  } else {
    items = [
      { href: "/dashboard", label: t.nav_dashboard, icon: "\u25A6" },
      { href: "/services", label: t.nav_services, icon: "\u2726" },
      { href: "/applications", label: t.nav_applications, icon: "\u2630" },
      { href: "/properties", label: t.nav_properties, icon: "\u2302" },
      { href: "/certificates", label: t.nav_certificates, icon: "\u2756" },
      { href: "/escrow", label: t.nav_escrow, icon: "\u25C8" },
    ];
  }

  const displayName = locale === "ar" ? user.nameAr : user.name;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-2">
            <LocaleToggle label={t.language} />
            <div className="hidden items-center gap-3 rounded-xl border border-line px-3 py-1.5 sm:flex">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-sage text-sm font-bold text-ink">
                {user.name.charAt(0)}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-metal">{t[`role_${user.role}`]}{user.company ? ` · ${user.company}` : ""}</p>
              </div>
            </div>
            <form action={logout}>
              <button className="btn-outline px-3 py-2" type="submit">{t.logout}</button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:px-6">
        <aside className="md:w-60 md:shrink-0">
          <div className="md:sticky md:top-22">
            <NavLinks items={items} />
            <div className="mt-6 hidden rounded-2xl bg-sage-mist p-4 text-xs text-ink-soft md:block">
              <p className="font-medium text-ink">{t.demoTitle}</p>
              <p className="mt-1">{t.demoBody}</p>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
