import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/locale";
import { db } from "@/lib/db";
import { isEditable } from "@/lib/workflow";
import { asData, eligibleProperties, REQUIRED_DOCUMENTS, type TransactionType } from "@/server/applications";
import { PageHeader } from "@/components/ui";
import { Wizard, type WizardProps } from "./Wizard";

export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["APPLICANT", "DEVELOPER"]);
  const { t, locale } = await getDict();

  const app = await db.application.findUnique({
    where: { id },
    include: { documents: true, payment: true, property: { include: { project: true } } },
  });
  if (!app || app.applicantId !== user.id || app.type === "CERTIFICATE") notFound();
  if (!isEditable(app.status)) redirect(`/applications/${id}`);

  const type = app.type as TransactionType;
  const eligible = await eligibleProperties(user, type);
  if (app.property && !eligible.some((p) => p.id === app.propertyId)) eligible.unshift(app.property);
  const data = asData(app);

  const props: WizardProps = {
    locale,
    t,
    app: {
      id: app.id,
      reference: app.reference,
      type,
      status: app.status,
      currentStep: app.currentStep,
      propertyId: app.propertyId,
      buyer: data.buyer ?? null,
      contract: data.contract ?? null,
      lastComment: app.status === "RETURNED" ? data.lastComment ?? null : null,
      paid: app.payment?.status === "PAID",
    },
    seller: user.company
      ? { name: user.company, emiratesId: user.emiratesId, kind: "developer" }
      : { name: user.name, emiratesId: user.emiratesId, kind: "owner" },
    properties: eligible.map((p) => ({
      id: p.id,
      unitNumber: p.unitNumber,
      plotNumber: p.plotNumber,
      type: p.type,
      bedrooms: p.bedrooms,
      areaSqm: p.areaSqm,
      marketValue: p.marketValue,
      community: p.community,
      project: p.project?.name ?? null,
    })),
    documents: app.documents.map((d) => ({ kind: d.kind, fileName: d.fileName, sizeBytes: d.sizeBytes })),
    requiredDocs: REQUIRED_DOCUMENTS[type],
  };

  return (
    <>
      <PageHeader
        title={t[`type_${type}`]}
        subtitle={`${t.reference}: ${app.reference}`}
        back={{ href: "/applications", label: t.nav_applications }}
      />
      <Wizard {...props} />
    </>
  );
}
