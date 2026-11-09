import "server-only";
import { z } from "zod";
import type { Application, Prisma, User } from "@prisma/client";
import { db } from "@/lib/db";
import { transactionFees } from "@/lib/fees";
import { applicationRef, receiptNo } from "@/lib/ids";
import { isEditable, nextStatus, requiresComment, type WorkflowAction } from "@/lib/workflow";
import { asDataPublic, type ApplicationData } from "@/lib/appData";
import { assert, ServiceError } from "./errors";
import { issueCertificateTx } from "./certificates";

export type TransactionType = "FIRST_SALE" | "SELL_PURCHASE";

export const REQUIRED_DOCUMENTS: Record<TransactionType, { kind: string; label: string; labelAr: string }[]> = {
  FIRST_SALE: [
    { kind: "SPA", label: "Signed sale and purchase agreement", labelAr: "اتفاقية البيع والشراء الموقعة" },
    { kind: "BUYER_ID", label: "Buyer Emirates ID or passport", labelAr: "الهوية الإماراتية أو جواز سفر المشتري" },
    { kind: "PAYMENT_PLAN", label: "Approved payment plan", labelAr: "خطة الدفع المعتمدة" },
  ],
  SELL_PURCHASE: [
    { kind: "SPA", label: "Signed sale and purchase agreement", labelAr: "اتفاقية البيع والشراء الموقعة" },
    { kind: "BUYER_ID", label: "Buyer Emirates ID or passport", labelAr: "الهوية الإماراتية أو جواز سفر المشتري" },
    { kind: "NOC", label: "No-objection certificate", labelAr: "شهادة عدم ممانعة" },
  ],
};

const OPEN_STATUSES = ["DRAFT", "SUBMITTED", "RETURNED"] as const;

export const propertyStepSchema = z.object({ propertyId: z.string().min(1, "Select a property") });

export const buyerStepSchema = z.object({
  emiratesId: z.string().regex(/^784-\d{4}-\d{7}-\d$/, "Emirates ID must look like 784-1990-1234567-1"),
  name: z.string().trim().min(3, "Enter the buyer's full name").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
});

export const contractStepSchema = z.object({
  salePrice: z.coerce.number().positive("Sale price must be greater than zero").max(1_000_000_000),
  contractDate: z.string().min(1, "Contract date is required"),
  downPaymentPct: z.coerce.number().min(0).max(100).optional(),
});

export const documentsStepSchema = z.object({
  documents: z
    .array(z.object({ kind: z.string(), fileName: z.string().min(1), sizeBytes: z.number().int().nonnegative() }))
    .default([]),
});

export const paymentSchema = z.object({
  method: z.enum(["CARD", "APPLE_PAY", "BANK_TRANSFER"]),
  cardLast4: z.string().regex(/^\d{4}$/).optional(),
});

function asData(app: Application): ApplicationData {
  return asDataPublic(app.data);
}

async function loadOwned(user: User, id: string) {
  const app = await db.application.findUnique({ where: { id }, include: { property: { include: { project: true } } } });
  assert(app, "Application not found", 404);
  assert(app.applicantId === user.id, "You do not have access to this application", 403);
  return app;
}

/** Properties a user is allowed to start a transaction on. */
export async function eligibleProperties(user: User, type: TransactionType) {
  const where: Prisma.PropertyWhereInput =
    type === "FIRST_SALE"
      ? { ownerId: null, project: { developerId: user.id, status: "ACTIVE" } }
      : { ownerId: user.id };
  return db.property.findMany({
    where: { ...where, applications: { none: { status: { in: [...OPEN_STATUSES] }, type: { not: "CERTIFICATE" } } } },
    include: { project: true },
    orderBy: [{ community: "asc" }, { unitNumber: "asc" }],
  });
}

export async function createDraft(user: User, type: TransactionType) {
  assert(type === "FIRST_SALE" ? user.role === "DEVELOPER" : user.role === "APPLICANT",
    type === "FIRST_SALE" ? "Only developers can register a first sale" : "Only property owners can register a sale", 403);
  const app = await db.application.create({
    data: { reference: applicationRef(), type, applicantId: user.id },
  });
  await db.applicationEvent.create({
    data: { applicationId: app.id, actorId: user.id, toStatus: "DRAFT", comment: "Application created" },
  });
  return app;
}

export async function saveStep(user: User, id: string, step: number, input: unknown) {
  const app = await loadOwned(user, id);
  assert(isEditable(app.status), "This application can no longer be edited");
  assert(app.type !== "CERTIFICATE", "Certificate requests have no editable steps");
  const type = app.type as TransactionType;
  const data = asData(app);

  switch (step) {
    case 0: {
      const { propertyId } = propertyStepSchema.parse(input);
      const allowed = await eligibleProperties(user, type);
      const ok = allowed.some((p) => p.id === propertyId) || app.propertyId === propertyId;
      assert(ok, "This property is not available for this transaction");
      await db.application.update({ where: { id }, data: { propertyId, currentStep: Math.max(app.currentStep, 1) } });
      break;
    }
    case 1: {
      const parsed = buyerStepSchema.parse(input);
      let buyer = await db.user.findUnique({ where: { emiratesId: parsed.emiratesId } });
      if (!buyer) {
        assert(parsed.name, "Buyer not found in the registry. Enter their full name to add them.");
        buyer = await db.user.create({
          data: {
            name: parsed.name,
            nameAr: parsed.name,
            emiratesId: parsed.emiratesId,
            phone: parsed.phone || "+971500000000",
            email: parsed.email || `${parsed.emiratesId.replace(/-/g, "")}@buyer.dari-mvp.ae`,
            role: "APPLICANT",
          },
        });
      }
      assert(buyer.id !== user.id, "The buyer cannot be the same person as the seller");
      assert(buyer.role === "APPLICANT", "Buyer must be an individual or company registered as an owner");
      data.buyer = { userId: buyer.id, name: buyer.name, emiratesId: buyer.emiratesId };
      await db.application.update({
        where: { id },
        data: { data: data as Prisma.InputJsonValue, currentStep: Math.max(app.currentStep, 2) },
      });
      break;
    }
    case 2: {
      const c = contractStepSchema.parse(input);
      if (type === "FIRST_SALE") {
        assert(c.downPaymentPct !== undefined && c.downPaymentPct >= 10,
          "Off-plan sales require a down payment of at least 10%");
      }
      data.contract = { salePrice: c.salePrice, contractDate: c.contractDate, downPaymentPct: c.downPaymentPct };
      await db.application.update({
        where: { id },
        data: {
          data: data as Prisma.InputJsonValue,
          salePrice: c.salePrice,
          feeTotal: transactionFees(type, c.salePrice).total,
          currentStep: Math.max(app.currentStep, 3),
        },
      });
      break;
    }
    case 3: {
      const { documents } = documentsStepSchema.parse(input);
      const required = REQUIRED_DOCUMENTS[type].map((d) => d.kind);
      const missing = required.filter((k) => !documents.some((d) => d.kind === k));
      assert(missing.length === 0, `Missing required documents: ${missing.join(", ")}`);
      await db.$transaction([
        db.document.deleteMany({ where: { applicationId: id } }),
        db.document.createMany({ data: documents.map((d) => ({ ...d, applicationId: id })) }),
        db.application.update({ where: { id }, data: { currentStep: Math.max(app.currentStep, 4) } }),
      ]);
      break;
    }
    default:
      throw new ServiceError("Unknown step");
  }
  return db.application.findUniqueOrThrow({ where: { id } });
}

export async function submitApplication(user: User, id: string, paymentInput: unknown) {
  const app = await loadOwned(user, id);
  const data = asData(app);
  assert(app.propertyId, "Select a property first");
  assert(data.buyer, "Add the buyer details first");
  assert(data.contract && app.salePrice, "Complete the contract details first");
  const docs = await db.document.count({ where: { applicationId: id } });
  assert(docs >= REQUIRED_DOCUMENTS[app.type as TransactionType].length, "Upload the required documents first");

  const action: WorkflowAction = app.status === "RETURNED" ? "RESUBMIT" : "SUBMIT";
  const to = nextStatus(app.status, action, user.role);
  const fees = transactionFees(app.type as TransactionType, app.salePrice);

  return db.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({ where: { applicationId: id } });
    if (!existing) {
      const pay = paymentSchema.parse(paymentInput);
      await tx.payment.create({
        data: {
          applicationId: id,
          amount: fees.total,
          method: pay.method,
          status: "PAID",
          paidAt: new Date(),
          receiptNo: receiptNo(),
        },
      });
    }
    await tx.applicationEvent.create({
      data: {
        applicationId: id,
        actorId: user.id,
        fromStatus: app.status,
        toStatus: to,
        comment: action === "RESUBMIT" ? "Resubmitted after correction" : `Submitted and paid ${fees.total.toFixed(2)} AED`,
      },
    });
    return tx.application.update({
      where: { id },
      data: { status: to, feeTotal: fees.total, submittedAt: new Date(), currentStep: 4 },
    });
  });
}

export async function reviewApplication(reviewer: User, id: string, action: "APPROVE" | "REJECT" | "RETURN", comment?: string) {
  const app = await db.application.findUnique({ where: { id }, include: { property: { include: { project: { include: { escrow: true } } } } } });
  assert(app, "Application not found", 404);
  const to = nextStatus(app.status, action, reviewer.role);
  if (requiresComment(action)) assert(comment && comment.trim().length >= 5, "Please give the applicant a reason (at least 5 characters)");
  const data = asData(app);

  return db.$transaction(async (tx) => {
    // Re-check inside the transaction so two reviewers can't decide the same application.
    const fresh = await tx.application.findUniqueOrThrow({ where: { id } });
    assert(fresh.status === app.status, "This application was already processed by another reviewer", 409);

    if (action === "APPROVE") await completeApplication(tx, app, data, reviewer);

    await tx.applicationEvent.create({
      data: { applicationId: id, actorId: reviewer.id, fromStatus: app.status, toStatus: to, comment: comment?.trim() || "Approved" },
    });
    return tx.application.update({
      where: { id },
      data: {
        status: to,
        reviewerId: reviewer.id,
        completedAt: to === "COMPLETED" ? new Date() : null,
        data: { ...data, lastComment: comment?.trim() || undefined } as Prisma.InputJsonValue,
      },
    });
  });
}

type AppWithProperty = Prisma.ApplicationGetPayload<{ include: { property: { include: { project: { include: { escrow: true } } } } } }>;

async function completeApplication(tx: Prisma.TransactionClient, app: AppWithProperty, data: ApplicationData, reviewer: User) {
  if (app.type === "CERTIFICATE") {
    assert(app.propertyId, "Certificate request has no property");
    await issueCertificateTx(tx, {
      type: (data.certType as "TITLE_DEED" | "OWNERSHIP" | "VALUATION") ?? "OWNERSHIP",
      propertyId: app.propertyId,
      ownerId: app.applicantId,
      applicationId: app.id,
    });
    return;
  }
  assert(app.property && data.buyer && data.contract, "Application is incomplete");
  const property = app.property;

  if (app.type === "SELL_PURCHASE") {
    assert(property.ownerId === app.applicantId, "Seller no longer owns this property");
  } else {
    assert(property.ownerId === null, "This unit has already been sold");
  }

  await tx.property.update({
    where: { id: property.id },
    data: { ownerId: data.buyer.userId, marketValue: data.contract.salePrice },
  });

  if (app.type === "FIRST_SALE" && property.project?.escrow) {
    const deposit = Math.round(data.contract.salePrice * ((data.contract.downPaymentPct ?? 10) / 100));
    await tx.escrowTransaction.create({
      data: {
        accountId: property.project.escrow.id,
        direction: "INFLOW",
        amount: deposit,
        description: `Down payment for unit ${property.unitNumber} (${app.reference})`,
        propertyId: property.id,
        payerId: data.buyer.userId,
      },
    });
  }

  await issueCertificateTx(tx, {
    type: app.type === "FIRST_SALE" ? "OWNERSHIP" : "TITLE_DEED",
    propertyId: property.id,
    ownerId: data.buyer.userId,
    applicationId: app.id,
  });
  void reviewer;
}

export async function listMyApplications(user: User) {
  return db.application.findMany({
    where: { applicantId: user.id },
    include: { property: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getApplicationDetail(user: User, id: string) {
  const app = await db.application.findUnique({
    where: { id },
    include: {
      property: { include: { project: true, owner: true } },
      applicant: true,
      reviewer: true,
      documents: true,
      payment: true,
      certificate: true,
      events: { include: { actor: true }, orderBy: { createdAt: "asc" } },
    },
  });
  assert(app, "Application not found", 404);
  const isBuyer = asData(app).buyer?.userId === user.id;
  assert(user.role === "REVIEWER" || app.applicantId === user.id || isBuyer, "You do not have access to this application", 403);
  return app;
}

export async function reviewQueue() {
  return db.application.findMany({
    where: { status: "SUBMITTED" },
    include: { property: true, applicant: true },
    orderBy: { submittedAt: "asc" },
  });
}

export { asData };
