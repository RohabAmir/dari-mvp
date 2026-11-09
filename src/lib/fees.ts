import type { ApplicationType, CertificateType } from "@prisma/client";

export interface FeeLine {
  key: string;
  label: string;
  labelAr: string;
  amount: number;
}

export interface FeeBreakdown {
  lines: FeeLine[];
  total: number;
}

/** Registration fee rate applied to the declared sale price. */
export const REGISTRATION_RATE: Record<"FIRST_SALE" | "SELL_PURCHASE", number> = {
  FIRST_SALE: 0.01,
  SELL_PURCHASE: 0.02,
};

export const ADMIN_FEE = 200;
export const TITLE_DEED_ISSUE_FEE = 250;
export const MIN_REGISTRATION_FEE = 500;

export const CERTIFICATE_FEES: Record<CertificateType, number> = {
  TITLE_DEED: 250,
  OWNERSHIP: 100,
  VALUATION: 500,
};

const round = (n: number) => Math.round(n * 100) / 100;

export function transactionFees(
  type: "FIRST_SALE" | "SELL_PURCHASE",
  salePrice: number,
): FeeBreakdown {
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    throw new Error("Sale price must be a positive number");
  }
  const registration = round(Math.max(salePrice * REGISTRATION_RATE[type], MIN_REGISTRATION_FEE));
  const lines: FeeLine[] = [
    {
      key: "registration",
      label: `Registration fee (${REGISTRATION_RATE[type] * 100}% of sale price)`,
      labelAr: `رسوم التسجيل (${REGISTRATION_RATE[type] * 100}٪ من سعر البيع)`,
      amount: registration,
    },
    { key: "admin", label: "Administrative fee", labelAr: "رسوم إدارية", amount: ADMIN_FEE },
  ];
  if (type === "SELL_PURCHASE") {
    lines.push({
      key: "titleDeed",
      label: "Title deed issuance",
      labelAr: "إصدار سند الملكية",
      amount: TITLE_DEED_ISSUE_FEE,
    });
  }
  return { lines, total: round(lines.reduce((s, l) => s + l.amount, 0)) };
}

export function certificateFees(type: CertificateType): FeeBreakdown {
  const amount = CERTIFICATE_FEES[type];
  return {
    lines: [{ key: "certificate", label: "Certificate fee", labelAr: "رسوم الشهادة", amount }],
    total: amount,
  };
}

export function feesFor(type: ApplicationType, salePrice?: number | null, certType?: CertificateType): FeeBreakdown {
  if (type === "CERTIFICATE") return certificateFees(certType ?? "OWNERSHIP");
  return transactionFees(type, salePrice ?? 0);
}
