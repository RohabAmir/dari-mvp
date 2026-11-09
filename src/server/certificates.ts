import "server-only";
import type { CertificateType, Prisma, User } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { certificateFees } from "@/lib/fees";
import { applicationRef, certificateNo, receiptNo } from "@/lib/ids";
import { assert } from "./errors";

export const SYSTEM_USER_EMAIL = "system@dari-mvp.ae";

/** Certificates that are issued instantly; the rest need a registry reviewer. */
export const AUTO_APPROVED: CertificateType[] = ["TITLE_DEED", "OWNERSHIP"];

const VALIDITY_DAYS: Record<CertificateType, number> = { TITLE_DEED: 3650, OWNERSHIP: 90, VALUATION: 180 };

export async function issueCertificateTx(
  tx: Prisma.TransactionClient,
  input: { type: CertificateType; propertyId: string; ownerId: string; applicationId?: string },
) {
  const validUntil = new Date(Date.now() + VALIDITY_DAYS[input.type] * 86_400_000);
  return tx.certificate.create({
    data: { number: certificateNo(), validUntil, ...input },
  });
}

export const certificateRequestSchema = z.object({
  propertyId: z.string().min(1),
  type: z.enum(["TITLE_DEED", "OWNERSHIP", "VALUATION"]),
  method: z.enum(["CARD", "APPLE_PAY", "BANK_TRANSFER"]),
});

export async function requestCertificate(user: User, input: unknown) {
  const { propertyId, type, method } = certificateRequestSchema.parse(input);
  const property = await db.property.findUnique({ where: { id: propertyId } });
  assert(property, "Property not found", 404);
  assert(property.ownerId === user.id, "You can only request certificates for properties you own", 403);
  const fees = certificateFees(type);
  const auto = AUTO_APPROVED.includes(type);
  const system = auto ? await db.user.findUnique({ where: { email: SYSTEM_USER_EMAIL } }) : null;

  return db.$transaction(async (tx) => {
    const app = await tx.application.create({
      data: {
        reference: applicationRef(),
        type: "CERTIFICATE",
        status: auto ? "COMPLETED" : "SUBMITTED",
        propertyId,
        applicantId: user.id,
        reviewerId: system?.id,
        feeTotal: fees.total,
        currentStep: 4,
        data: { certType: type },
        submittedAt: new Date(),
        completedAt: auto ? new Date() : null,
      },
    });
    await tx.payment.create({
      data: { applicationId: app.id, amount: fees.total, method, status: "PAID", paidAt: new Date(), receiptNo: receiptNo() },
    });
    await tx.applicationEvent.create({
      data: { applicationId: app.id, actorId: user.id, fromStatus: "DRAFT", toStatus: "SUBMITTED", comment: `Paid ${fees.total} AED` },
    });
    if (auto) {
      await tx.applicationEvent.create({
        data: {
          applicationId: app.id,
          actorId: system?.id ?? user.id,
          fromStatus: "SUBMITTED",
          toStatus: "COMPLETED",
          comment: "Auto-approved: registry records match",
        },
      });
      await issueCertificateTx(tx, { type, propertyId, ownerId: user.id, applicationId: app.id });
    }
    return app;
  });
}

export async function findCertificate(number: string) {
  return db.certificate.findUnique({
    where: { number },
    include: { property: { include: { project: true } }, owner: true },
  });
}

export async function listMyCertificates(user: User) {
  return db.certificate.findMany({
    where: { ownerId: user.id },
    include: { property: true },
    orderBy: { issuedAt: "desc" },
  });
}
