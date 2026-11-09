import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/locale";
import { aed, date } from "@/lib/format";
import { myProjects } from "@/server/escrow";
import { EmptyState, PageHeader, ProgressBar, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "My projects" };

export default async function ProjectsPage() {
  const user = await requireUser(["DEVELOPER"]);
  const { t, locale } = await getDict();
  const ar = locale === "ar";
  const projects = await myProjects(user);

  return (
    <>
      <PageHeader
        title={t.nav_projects}
        subtitle={ar ? "مشاريعك على الخارطة وحسابات الضمان الخاصة بها." : "Your off-plan projects and their escrow accounts."}
        action={<Link href="/projects/new" className="btn-primary">+ {t.newProject}</Link>}
      />
      {projects.length === 0 ? (
        <EmptyState title={t.noData} action={<Link href="/projects/new" className="btn-primary">{t.newProject}</Link>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="card p-6 transition hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">{ar ? p.nameAr : p.name}</h3>
                  <p className="text-sm text-metal">{p.community} · {ar ? "التسليم" : "Handover"} {date(p.handoverDate, locale)}</p>
                </div>
                <StatusBadge status={p.status} t={t} />
              </div>
              {p.status === "REJECTED" && p.reviewNote && (
                <p className="mt-3 rounded-lg bg-danger-light px-3 py-2 text-sm text-danger">{p.reviewNote}</p>
              )}
              <div className="mt-5 flex justify-between text-sm"><span className="text-metal">{t.completion}</span><span className="font-medium">{p.completionPct}%</span></div>
              <div className="mt-2"><ProgressBar value={p.completionPct} /></div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
                <div><p className="text-xs text-metal">{t.units}</p><p className="font-bold">{p._count.properties || p.totalUnits}</p></div>
                <div><p className="text-xs text-metal">{t.sold}</p><p className="font-bold">{p.sold}</p></div>
                <div><p className="text-xs text-metal">{t.escrowBalance}</p><p className="font-bold">{aed(p.totals.balance, locale)}</p></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
