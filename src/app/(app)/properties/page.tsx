import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/locale";
import { db } from "@/lib/db";
import { aed } from "@/lib/format";
import { EmptyState, PageHeader, Stat } from "@/components/ui";

export const metadata: Metadata = { title: "My properties" };

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const user = await requireUser(["APPLICANT"]);
  const { t, locale } = await getDict();
  const ar = locale === "ar";
  const { q = "", kind = "all" } = await searchParams;

  const all = await db.property.findMany({
    where: { ownerId: user.id },
    include: { project: true, certificates: { where: { ownerId: user.id } } },
    orderBy: { marketValue: "desc" },
  });
  const props = all.filter(
    (p) =>
      (kind === "all" || (kind === "offplan" ? p.isOffPlan : !p.isOffPlan)) &&
      (!q || `${p.unitNumber} ${p.community} ${p.type} ${p.project?.name ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );
  const totalValue = all.reduce((s, p) => s + p.marketValue, 0);

  return (
    <>
      <PageHeader title={t.nav_properties} subtitle={ar ? "العقارات المسجلة باسمك في السجل العقاري." : "Properties registered in your name in the real estate register."} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label={ar ? "عدد العقارات" : "Properties"} value={String(all.length)} />
        <Stat label={ar ? "القيمة الإجمالية" : "Portfolio value"} value={aed(totalValue, locale)} tone="sage" />
        <Stat label={ar ? "على الخارطة" : "Off-plan units"} value={String(all.filter((p) => p.isOffPlan).length)} tone="teal" />
      </div>

      <form className="mb-5 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} className="input max-w-xs" placeholder={ar ? "ابحث بالوحدة أو المجتمع" : "Search unit, community, project"} />
        <select name="kind" defaultValue={kind} className="input w-auto">
          <option value="all">{ar ? "الكل" : "All"}</option>
          <option value="ready">{ar ? "جاهز" : "Ready"}</option>
          <option value="offplan">{ar ? "على الخارطة" : "Off-plan"}</option>
        </select>
        <button className="btn-outline" type="submit">{ar ? "تصفية" : "Filter"}</button>
      </form>

      {props.length === 0 ? (
        <EmptyState title={t.noData} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {props.map((p) => (
            <Link key={p.id} href={`/properties/${p.id}`} className="card group overflow-hidden transition hover:shadow-md">
              <div className="relative h-32 bg-gradient-to-br from-sage-soft to-teal-light">
                <svg viewBox="0 0 200 80" className="absolute inset-x-0 bottom-0 h-20 w-full text-sage" aria-hidden="true">
                  <path fill="currentColor" d="M0 80V50h20V30h25v20h15V15h30v35h10V35h25v15h20V25h30v55z" opacity=".55" />
                </svg>
                <span className="absolute top-3 start-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium">
                  {p.isOffPlan ? (ar ? "على الخارطة" : "Off-plan") : ar ? "جاهز" : "Ready"}
                </span>
              </div>
              <div className="p-5">
                <p className="font-bold group-hover:text-teal-dark">{p.type} {p.unitNumber}</p>
                <p className="text-sm text-metal">{p.project?.name ?? p.community}, {p.district}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-metal">{p.areaSqm} m² · {p.bedrooms} BR</span>
                  <span className="font-bold">{aed(p.marketValue, locale)}</span>
                </div>
                <p className="mt-3 border-t border-line pt-3 text-xs text-metal">
                  {p.certificates.length} {ar ? "شهادة صادرة" : "certificates issued"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
