import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/locale";
import { db } from "@/lib/db";
import { aed, date } from "@/lib/format";
import { myDeposits } from "@/server/escrow";
import { Card, EmptyState, PageHeader, ProgressBar, Stat } from "@/components/ui";
import { InstallmentForm } from "./InstallmentForm";

export const metadata: Metadata = { title: "Escrow deposits" };

export default async function EscrowPage() {
  const user = await requireUser(["APPLICANT"]);
  const { t, locale } = await getDict();
  const ar = locale === "ar";

  const [deposits, units] = await Promise.all([
    myDeposits(user),
    db.property.findMany({
      where: { ownerId: user.id, isOffPlan: true, project: { escrow: { isNot: null } } },
      include: { project: true, escrowTxns: { where: { payerId: user.id, direction: "INFLOW" } } },
    }),
  ]);
  const total = deposits.reduce((s, d) => s + d.amount, 0);

  return (
    <>
      <PageHeader
        title={t.deposits}
        subtitle={ar ? "دفعاتك محمية في حساب ضمان المشروع ولا تصرف للمطور إلا حسب الإنجاز." : "Your payments are held in the project escrow account and released to the developer only as construction progresses."}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat label={ar ? "إجمالي إيداعاتك" : "Total you have deposited"} value={aed(total, locale)} tone="teal" />
        <Stat label={ar ? "وحدات على الخارطة" : "Off-plan units"} value={String(units.length)} tone="sage" />
      </div>

      {units.length > 0 && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {units.map((u) => {
            const paid = u.escrowTxns.reduce((s, x) => s + x.amount, 0);
            const pct = Math.round((paid / u.marketValue) * 100);
            return (
              <Card key={u.id} className="p-5">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-bold">{u.type} {u.unitNumber}</p>
                    <p className="text-sm text-metal">{u.project?.name}</p>
                  </div>
                  <div className="text-end text-sm">
                    <p className="text-xs text-metal">{ar ? "إنجاز المشروع" : "Construction"}</p>
                    <p className="font-bold">{u.project?.completionPct}%</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-between text-sm">
                  <span className="text-metal">{ar ? "المدفوع" : "Paid"} {aed(paid, locale)} / {aed(u.marketValue, locale)}</span>
                  <span className="font-medium">{pct}%</span>
                </div>
                <div className="mt-2"><ProgressBar value={pct} /></div>
                <InstallmentForm propertyId={u.id} locale={locale} label={t.payInstallment} suggested={Math.round(u.marketValue * 0.1)} />
              </Card>
            );
          })}
        </div>
      )}

      {deposits.length === 0 ? (
        <EmptyState title={t.noData} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>{ar ? "التاريخ" : "Date"}</th><th>{ar ? "الوصف" : "Description"}</th><th>{ar ? "المشروع" : "Project"}</th><th>{ar ? "حساب الضمان" : "Escrow account"}</th><th className="text-end">{ar ? "المبلغ" : "Amount"}</th></tr>
            </thead>
            <tbody>
              {deposits.map((d) => (
                <tr key={d.id}>
                  <td className="text-metal">{date(d.createdAt, locale)}</td>
                  <td>{d.description}</td>
                  <td>{d.property?.project?.name}</td>
                  <td className="font-mono text-xs" dir="ltr">{d.account.accountNumber}</td>
                  <td className="text-end font-medium text-success-dark">{aed(d.amount, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
