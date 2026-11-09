import { route } from "@/server/api";
import { assert } from "@/server/errors";
import { findCertificate } from "@/server/certificates";

/** Public verification endpoint used by banks and buyers. Returns no personal identifiers. */
export const GET = route(async (_req, { params }: { params: Promise<{ number: string }> }) => {
  const cert = await findCertificate((await params).number.toUpperCase());
  assert(cert, "Certificate not found", 404);
  return {
    number: cert.number,
    type: cert.type,
    valid: cert.validUntil > new Date(),
    issuedAt: cert.issuedAt,
    validUntil: cert.validUntil,
    property: {
      unitNumber: cert.property.unitNumber,
      plotNumber: cert.property.plotNumber,
      community: cert.property.community,
      project: cert.property.project?.name ?? null,
    },
  };
});
