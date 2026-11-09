import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/locale";
import { aed, date, dateTime } from "@/lib/format";
import { db } from "@/lib/db";
import { reviewQueue } from "@/server/applications";
import { escrowTotals, pendingMilestones, pendingProjects } from "@/server/escrow";
import { Card, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { MilestoneDecision, ProjectDecision } from "./ReviewActions";

export const metadata: Metadata = { title: "Review queue" };

type Tab = "applications" | "projects" | "milestones";

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireUser(["REVIEWER"]);
  const { t, locale } = await getDict();
  const ar = locale === "ar";
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "projects" || rawTab === "milestones" ? rawTab : "applications";

  const [apps, projects, milestones] = await Promise.all([reviewQueue(), pendingProjects(), pendingMilestones()]);
  const labels = {
    approve: t.approve,
    reject: t.reject,
    returnApp: t.returnApp,
    placeholder: ar ? "ملاحظة (مطلوبة عند الرفض)" : "Comment (required to reject)",
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "applications", label: t.queueApplications, count: apps.length },
    { key: "projects", label: t.queueProjects, count: projects.length },
    { key: "milestones", label: t.queueMilestones, count: milestones.length },
  ];

  const milestoneTotals = await Promise.all(
    milestones.map(async (m) => {
      const esc = await db.escrowAccount.findUnique({ where: { projectId: m.projectId } });
      return esc ? escrowTotals(db, esc.id) : { inflow: 0, outflow: 0, balance: 0 };
    }),
  );

  return (
    <>
      <PageHeader
        title={t.nav_review}
        subtitle={ar ? "راجع الطلبات المقدمة واتخذ القرار." : "Everything waiting for a registry decision, oldest first."}
      />
      <div className="mb-5 flex gap-2 overflow-x-auto">
        {tabs.map((x) => (
          <Link
            key={x.key}
            href={`/review?tab=${x.key}`}
            className={clsx(
              "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm whitespace-nowrap",
              tab === x.key ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-ink",
            )}
          >
            {x.label}
            <span className={clsx("rounded-full px-2 text-xs", tab === x.key ? "bg-sage text-ink" : "bg-canvas")}>{x.count}</span>
          </Link>
        ))}
      </div>

      {tab === "applications" &&
        (apps.length === 0 ? (
          <EmptyState title={ar ? "لا توجد طلبات بانتظار المراجعة" : "No applications waiting"} body={ar ? "أحسنت!" : "The queue is clear."} />
        ) : (
          <Card className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>{t.reference}</th>
                  <th>{t.type}</th>
                  <th>{ar ? "مقدم الطلب" : "Applicant"}</th>
                  <th>{t.property}</th>
                  <th>{ar ? "القيمة" : "Value"}</th>
                  <th>{t.submitted}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id} className="hover:bg-canvas/60">
                    <td className="font-mono text-xs" dir="ltr">{a.reference}</td>
                    <td>{t[`type_${a.type}`]}</td>
                    <td>{a.applicant.company ?? a.applicant.name}</td>
                    <td>{a.property ? `${a.property.unitNumber}, ${a.property.community}` : "-"}</td>
                    <td>{a.salePrice ? aed(a.salePrice, locale) : "-"}</td>
                    <td className="text-metal">{dateTime(a.submittedAt, locale)}</td>
                    <td className="text-end">
                      <Link href={`/review/${a.id}`} className="btn-primary px-3 py-1.5 text-xs">{ar ? "مراجعة" : "Review"}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}

      {tab === "projects" &&
        (projects.length === 0 ? (
          <EmptyState title={ar ? "لا توجد مشاريع بانتظار الاعتماد" : "No projects waiting"} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((p) => (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold">{ar ? p.nameAr : p.name}</h3>
                    <p className="text-sm text-metal">{p.developer.company} · {p.community}</p>
                  </div>
                  <span className="rounded-lg bg-sage-mist px-2 py-1 text-xs">{p.totalUnits} {t.units}</span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-metal">{ar ? "البدء" : "Start"}</dt><dd>{date(p.startDate, locale)}</dd></div>
                  <div><dt className="text-xs text-metal">{ar ? "التسليم" : "Handover"}</dt><dd>{date(p.handoverDate, locale)}</dd></div>
                  <div className="col-span-2"><dt className="text-xs text-metal">{ar ? "بنك الضمان" : "Escrow bank"}</dt><dd>{p.escrowBank}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-metal">
                  {ar ? "الاعتماد يفتح حساب ضمان وينشئ الوحدات للبيع." : "Approving opens the escrow account and creates the units for sale."}
                </p>
                <div className="mt-4"><ProjectDecision id={p.id} labels={labels} /></div>
              </Card>
            ))}
          </div>
        ))}

      {tab === "milestones" &&
        (milestones.length === 0 ? (
          <EmptyState title={ar ? "لا توجد تقارير إنجاز" : "No milestone reports waiting"} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {milestones.map((m, i) => {
              const totals = milestoneTotals[i];
              const release = Math.min(totals.balance, Math.round((totals.inflow * m.releasePct) / 100));
              return (
                <Card key={m.id} className="p-5">
                  <p className="text-xs text-metal">{m.project.name} · {m.project.developer.company}</p>
                  <h3 className="mt-1 font-bold">{ar ? "المرحلة" : "Milestone"} {m.order}: {m.title}</h3>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-metal">{ar ? "الإنجاز المعلن" : "Reported completion"}</span><span className="font-medium">{m.reportedPct}% / {ar ? "المطلوب" : "target"} {m.targetPct}%</span></div>
                    <ProgressBar value={m.reportedPct ?? 0} />
                    <p className="rounded-lg bg-canvas px-3 py-2 text-ink-soft">{m.reportNote}</p>
                    <div className="flex justify-between"><span className="text-metal">{t.escrowBalance}</span><span>{aed(totals.balance, locale)}</span></div>
                    <div className="flex justify-between font-bold"><span>{ar ? "مبلغ الصرف" : "Release on approval"} ({m.releasePct}%)</span><span className="text-teal-dark">{aed(release, locale)}</span></div>
                  </div>
                  <div className="mt-4"><MilestoneDecision id={m.id} labels={labels} /></div>
                </Card>
              );
            })}
          </div>
        ))}
    </>
  );
}
