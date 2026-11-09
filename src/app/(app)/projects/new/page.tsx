import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/locale";
import { PageHeader } from "@/components/ui";
import { MILESTONE_TEMPLATE } from "@/server/escrow";
import { ProjectForm } from "./ProjectForm";

export const metadata: Metadata = { title: "Register project" };

export default async function NewProjectPage() {
  await requireUser(["DEVELOPER"]);
  const { t, locale } = await getDict();
  const ar = locale === "ar";
  return (
    <>
      <PageHeader
        title={t.newProject}
        subtitle={ar ? "بعد الاعتماد يُفتح حساب ضمان للمشروع ويمكنك بيع الوحدات." : "Once approved, an escrow account is opened and you can start selling units."}
        back={{ href: "/projects", label: t.nav_projects }}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ProjectForm locale={locale} />
        <aside className="card h-fit p-5">
          <h3 className="font-bold">{ar ? "جدول صرف الضمان" : "Escrow release schedule"}</h3>
          <p className="mt-1 text-xs text-metal">
            {ar ? "تُصرف الأموال للمطور فقط بعد اعتماد كل مرحلة." : "Buyer money is released to you only after the registry approves each milestone."}
          </p>
          <ol className="mt-4 space-y-3">
            {MILESTONE_TEMPLATE.map((m, i) => (
              <li key={m.title} className="flex gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sage-mist text-xs font-bold">{i + 1}</span>
                <span className="flex-1">{m.title}<span className="block text-xs text-metal">{ar ? "عند" : "At"} {m.targetPct}% {ar ? "إنجاز" : "built"}</span></span>
                <span className="font-medium text-teal-dark">{m.releasePct}%</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </>
  );
}
