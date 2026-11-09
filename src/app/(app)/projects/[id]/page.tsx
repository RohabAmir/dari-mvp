import { notFound } from "next/navigation";
import clsx from "clsx";
import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/locale";
import { aed, date } from "@/lib/format";
import { getProjectDashboard } from "@/server/escrow";
import { ServiceError } from "@/server/errors";
import { Card, PageHeader, ProgressBar, Stat, StatusBadge } from "@/components/ui";
import { MilestoneReportForm } from "./MilestoneReportForm";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["DEVELOPER", "REVIEWER"]);
  const { t, locale } = await getDict();
  const ar = locale === "ar";
  const { project, totals } = await getProjectDashboard(user, id).catch((e) => {
    if (e instanceof ServiceError) notFound();
    throw e;
  });

  const sold = project.properties.filter((p) => p.ownerId).length;
  const nextMilestone = project.milestones.find((m) => m.status !== "APPROVED");
  const canReport = user.id === project.developerId && project.status === "ACTIVE" && nextMilestone && nextMilestone.status !== "SUBMITTED";

  return (
    <>
      <PageHeader
        title={ar ? project.nameAr : project.name}
        subtitle={`${project.community}, ${project.district} · ${project.developer.company}`}
        back={{ href: "/projects", label: t.nav_projects }}
        action={<StatusBadge status={project.status} t={t} />}
      />

      {project.status === "PENDING" && (
        <div className="mb-6 rounded-2xl border border-warning/30 bg-warning-light p-5 text-sm">
          <p className="font-bold text-warning">{ar ? "بانتظار اعتماد السجل" : "Waiting for registry approval"}</p>
          <p className="mt-1 text-ink-soft">{ar ? "بعد الاعتماد يُفتح حساب الضمان وتُنشأ الوحدات." : "Once approved, the escrow account is opened and units are created for sale."}</p>
        </div>
      )}
      {project.status === "REJECTED" && (
        <div className="mb-6 rounded-2xl border border-danger/30 bg-danger-light p-5 text-sm">
          <p className="font-bold text-danger">{ar ? "تم رفض المشروع" : "Project registration rejected"}</p>
          <p className="mt-1 text-ink-soft">{project.reviewNote}</p>
        </div>
      )}

      {project.escrow && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label={t.escrowBalance} value={aed(totals.balance, locale)} tone="teal" hint={`${project.escrow.bankName} · ${project.escrow.accountNumber}`} />
          <Stat label={t.totalInflow} value={aed(totals.inflow, locale)} />
          <Stat label={t.totalOutflow} value={aed(totals.outflow, locale)} />
          <Stat label={`${t.sold} / ${t.units}`} value={`${sold} / ${project.properties.length}`} tone="sage" />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{t.milestones}</h2>
              <span className="text-sm text-metal">{t.completion}: <b className="text-ink">{project.completionPct}%</b></span>
            </div>
            <div className="mt-3"><ProgressBar value={project.completionPct} /></div>
            <ol className="mt-6 space-y-3">
              {project.milestones.map((m) => (
                <li key={m.id} className={clsx("rounded-xl border p-4", m.id === nextMilestone?.id ? "border-teal/40 bg-teal-light/50" : "border-line")}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={clsx("grid h-8 w-8 place-items-center rounded-full text-sm font-bold", m.status === "APPROVED" ? "bg-success text-white" : "bg-sage-mist")}>
                      {m.status === "APPROVED" ? "\u2713" : m.order}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">{m.title}</p>
                      <p className="text-xs text-metal">{ar ? "عند" : "At"} {m.targetPct}% · {ar ? "يصرف" : "releases"} {m.releasePct}% {ar ? "من الإيداعات" : "of deposits"}</p>
                    </div>
                    <StatusBadge status={m.status} t={t} />
                  </div>
                  {m.reportNote && <p className="mt-3 text-sm text-ink-soft">{m.reportedPct}% · {m.reportNote}</p>}
                  {m.reviewNote && <p className={clsx("mt-2 rounded-lg px-3 py-2 text-sm", m.status === "REJECTED" ? "bg-danger-light text-danger" : "bg-canvas")}>{t.reviewerComment}: {m.reviewNote}</p>}
                </li>
              ))}
            </ol>
          </Card>

          {project.properties.length > 0 && (
            <Card className="overflow-x-auto">
              <div className="p-6 pb-2"><h2 className="text-lg font-bold">{t.units}</h2></div>
              <table className="table-base">
                <thead>
                  <tr><th>{ar ? "الوحدة" : "Unit"}</th><th>{t.type}</th><th>{t.area}</th><th>{ar ? "السعر" : "Price"}</th><th>{t.owner}</th></tr>
                </thead>
                <tbody>
                  {project.properties.map((u) => (
                    <tr key={u.id}>
                      <td className="font-medium">{u.unitNumber}</td>
                      <td>{u.type} · {u.bedrooms} BR</td>
                      <td>{u.areaSqm} m²</td>
                      <td>{aed(u.marketValue, locale)}</td>
                      <td>{u.owner ? u.owner.name : <span className="rounded-full bg-sage-mist px-2 py-0.5 text-xs">{t.available}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          {canReport && nextMilestone && (
            <MilestoneReportForm
              milestoneId={nextMilestone.id}
              locale={locale}
              title={`${t.submitReport}: ${nextMilestone.title}`}
              targetPct={nextMilestone.targetPct}
              estimatedRelease={Math.min(totals.balance, Math.round((totals.inflow * nextMilestone.releasePct) / 100))}
            />
          )}
          {nextMilestone?.status === "SUBMITTED" && (
            <div className="rounded-2xl border border-info/20 bg-info-light p-5 text-sm text-info">
              {ar ? "تقرير الإنجاز قيد المراجعة لدى السجل." : "Your milestone report is with the registry for review."}
            </div>
          )}
          {project.escrow && (
            <Card className="p-5">
              <h3 className="font-bold">{ar ? "حركات حساب الضمان" : "Escrow ledger"}</h3>
              <ul className="mt-3 divide-y divide-line">
                {project.escrow.transactions.length === 0 && <li className="py-3 text-sm text-metal">{t.noData}</li>}
                {project.escrow.transactions.map((x) => (
                  <li key={x.id} className="flex items-start gap-3 py-3 text-sm">
                    <span className={clsx("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs", x.direction === "INFLOW" ? "bg-success-light text-success-dark" : "bg-warning-light text-warning")}>
                      {x.direction === "INFLOW" ? "\u2193" : "\u2191"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{x.description}</p>
                      <p className="text-xs text-metal">{date(x.createdAt, locale)}</p>
                    </div>
                    <span className={clsx("shrink-0 font-medium", x.direction === "INFLOW" ? "text-success-dark" : "text-warning")}>
                      {x.direction === "INFLOW" ? "+" : "-"}{aed(x.amount, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
