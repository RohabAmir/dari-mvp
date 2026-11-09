import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/locale";
import { db } from "@/lib/db";
import { aed, date } from "@/lib/format";
import { escrowTotals, myProjects } from "@/server/escrow";
import { Card, PageHeader, ProgressBar, Stat, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const { t, locale } = await getDict();
  const ar = locale === "ar";
  const name = (ar ? user.nameAr : user.name).split(" ")[0];

  const recent = await db.application.findMany({
    where: user.role === "REVIEWER" ? { reviewerId: user.id } : { applicantId: user.id },
    include: { property: true },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  let stats: React.ReactNode;
  let actions: { href: string; label: string; body: string }[];
  let extra: React.ReactNode = null;

  if (user.role === "REVIEWER") {
    const [pending, completed, projects, milestones, escrowAgg] = await Promise.all([
      db.application.count({ where: { status: "SUBMITTED" } }),
      db.application.count({ where: { status: "COMPLETED", type: { not: "CERTIFICATE" } } }),
      db.project.count({ where: { status: "PENDING" } }),
      db.milestone.count({ where: { status: "SUBMITTED" } }),
      db.escrowTransaction.groupBy({ by: ["direction"], _sum: { amount: true } }),
    ]);
    const held =
      (escrowAgg.find((r) => r.direction === "INFLOW")?._sum.amount ?? 0) - (escrowAgg.find((r) => r.direction === "OUTFLOW")?._sum.amount ?? 0);
    const fees = await db.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } });
    stats = (
      <>
        <Stat label={ar ? "بانتظار القرار" : "Awaiting decision"} value={String(pending + projects + milestones)} tone="teal" hint={`${pending} ${t.queueApplications} · ${projects} ${t.queueProjects} · ${milestones} ${t.queueMilestones}`} />
        <Stat label={ar ? "معاملات مكتملة" : "Completed transactions"} value={String(completed)} />
        <Stat label={ar ? "الرسوم المحصلة" : "Fees collected"} value={aed(fees._sum.amount ?? 0, locale)} tone="sage" />
        <Stat label={ar ? "أموال محمية في الضمان" : "Buyer money held in escrow"} value={aed(held, locale)} />
      </>
    );
    actions = [
      { href: "/review?tab=applications", label: t.queueApplications, body: ar ? "راجع المعاملات والشهادات" : "Review transactions and valuation requests" },
      { href: "/review?tab=projects", label: t.queueProjects, body: ar ? "اعتمد المشاريع الجديدة" : "Approve new off-plan projects" },
      { href: "/review?tab=milestones", label: t.queueMilestones, body: ar ? "اعتمد صرف الضمان" : "Approve escrow releases" },
    ];
  } else if (user.role === "DEVELOPER") {
    const projects = await myProjects(user);
    const balance = projects.reduce((s, p) => s + p.totals.balance, 0);
    const released = projects.reduce((s, p) => s + p.totals.outflow, 0);
    const sold = projects.reduce((s, p) => s + p.sold, 0);
    const units = projects.reduce((s, p) => s + p._count.properties, 0);
    stats = (
      <>
        <Stat label={t.projects} value={String(projects.length)} />
        <Stat label={`${t.sold} / ${t.units}`} value={`${sold} / ${units}`} tone="sage" />
        <Stat label={t.escrowBalance} value={aed(balance, locale)} tone="teal" />
        <Stat label={t.totalOutflow} value={aed(released, locale)} />
      </>
    );
    actions = [
      { href: "/services", label: t.type_FIRST_SALE, body: ar ? "بِع وحدة على الخارطة" : "Sell an off-plan unit to a buyer" },
      { href: "/projects/new", label: t.newProject, body: ar ? "سجّل مشروعاً جديداً" : "Open a new project with escrow" },
      { href: "/projects", label: t.submitReport, body: ar ? "اطلب صرفاً من الضمان" : "Claim an escrow release" },
    ];
    extra = (
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold">{t.projects}</h2>
        <div className="space-y-4">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="block rounded-xl border border-line p-4 hover:border-celadon">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{ar ? p.nameAr : p.name}</p>
                <StatusBadge status={p.status} t={t} />
              </div>
              <div className="mt-3"><ProgressBar value={p.completionPct} /></div>
              <p className="mt-2 text-xs text-metal">{p.completionPct}% · {t.escrowBalance} {aed(p.totals.balance, locale)}</p>
            </Link>
          ))}
        </div>
      </Card>
    );
  } else {
    const [props, certs, deposits] = await Promise.all([
      db.property.findMany({ where: { ownerId: user.id } }),
      db.certificate.count({ where: { ownerId: user.id } }),
      db.escrowTransaction.aggregate({ where: { payerId: user.id, direction: "INFLOW" }, _sum: { amount: true } }),
    ]);
    stats = (
      <>
        <Stat label={t.nav_properties} value={String(props.length)} />
        <Stat label={ar ? "قيمة المحفظة" : "Portfolio value"} value={aed(props.reduce((s, p) => s + p.marketValue, 0), locale)} tone="sage" />
        <Stat label={t.nav_certificates} value={String(certs)} />
        <Stat label={t.deposits} value={aed(deposits._sum.amount ?? 0, locale)} tone="teal" />
      </>
    );
    actions = [
      { href: "/services", label: t.type_SELL_PURCHASE, body: ar ? "بِع عقاراً جاهزاً" : "Sell a ready property" },
      { href: "/properties", label: t.requestCertificate, body: ar ? "سند ملكية أو شهادة" : "Title deed, ownership or valuation" },
      { href: "/escrow", label: t.payInstallment, body: ar ? "ادفع قسطاً لوحدة على الخارطة" : "Pay towards an off-plan unit" },
    ];
  }

  const escrowSummary =
    user.role === "REVIEWER"
      ? await db.project.findMany({ where: { status: { in: ["ACTIVE", "COMPLETED"] } }, include: { escrow: true } }).then((ps) =>
          Promise.all(ps.map(async (p) => ({ p, totals: p.escrow ? await escrowTotals(db, p.escrow.id) : null }))),
        )
      : [];

  return (
    <>
      <PageHeader title={`${t.welcome}, ${name}`} subtitle={`${t[`role_${user.role}`]}${user.company ? ` · ${user.company}` : ""}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats}</div>

      <h2 className="mt-8 mb-3 text-sm font-medium tracking-wide text-metal uppercase">{t.quickActions}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((a) => (
          <Link key={a.href + a.label} href={a.href} className="group rounded-2xl bg-ink p-5 text-white transition hover:bg-ink-soft">
            <p className="font-bold">{a.label}</p>
            <p className="mt-1 text-sm text-white/70">{a.body}</p>
            <p className="mt-4 text-sm text-sage group-hover:underline">{t.startService} <span className="rtl:hidden">&rarr;</span><span className="hidden rtl:inline">&larr;</span></p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-x-auto">
          <div className="flex items-center justify-between p-6 pb-2">
            <h2 className="text-lg font-bold">{user.role === "REVIEWER" ? (ar ? "قراراتي الأخيرة" : "My recent decisions") : t.recentApplications}</h2>
            {user.role !== "REVIEWER" && <Link href="/applications" className="text-sm text-teal-dark hover:underline">{t.viewAll}</Link>}
          </div>
          {recent.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-metal">{t.noData}</p>
          ) : (
            <table className="table-base">
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={user.role === "REVIEWER" ? `/review/${a.id}` : `/applications/${a.id}`} className="font-medium hover:text-teal-dark">{t[`type_${a.type}`]}</Link>
                      <p className="font-mono text-xs text-metal" dir="ltr">{a.reference}</p>
                    </td>
                    <td className="text-metal">{a.property?.unitNumber ?? "-"}</td>
                    <td><StatusBadge status={a.status} t={t} /></td>
                    <td className="text-metal">{date(a.updatedAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        {extra}
        {user.role === "REVIEWER" && (
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-bold">{ar ? "حسابات الضمان النشطة" : "Active escrow accounts"}</h2>
            <ul className="space-y-4">
              {escrowSummary.map(({ p, totals }) => (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="font-medium hover:text-teal-dark">{ar ? p.nameAr : p.name}</Link>
                  <p className="text-xs text-metal">{p.escrow?.bankName} · {p.completionPct}%</p>
                  <p className="mt-1 text-sm">{t.escrowBalance}: <b>{aed(totals?.balance ?? 0, locale)}</b></p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
