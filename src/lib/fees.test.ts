import { describe, expect, it } from "vitest";
import { ADMIN_FEE, CERTIFICATE_FEES, MIN_REGISTRATION_FEE, TITLE_DEED_ISSUE_FEE, certificateFees, transactionFees } from "./fees";

describe("transactionFees", () => {
  it("charges 2% plus admin and title deed fees on a sell/purchase", () => {
    const f = transactionFees("SELL_PURCHASE", 2_000_000);
    expect(f.lines.map((l) => l.key)).toEqual(["registration", "admin", "titleDeed"]);
    expect(f.total).toBe(40_000 + ADMIN_FEE + TITLE_DEED_ISSUE_FEE);
  });

  it("charges 1% plus admin on an off-plan first sale, with no title deed", () => {
    const f = transactionFees("FIRST_SALE", 1_500_000);
    expect(f.total).toBe(15_000 + ADMIN_FEE);
    expect(f.lines.some((l) => l.key === "titleDeed")).toBe(false);
  });

  it("applies the minimum registration fee to small sales", () => {
    const f = transactionFees("FIRST_SALE", 10_000);
    expect(f.lines[0].amount).toBe(MIN_REGISTRATION_FEE);
  });

  it("rounds to two decimals", () => {
    expect(transactionFees("SELL_PURCHASE", 1_234_567.89).lines[0].amount).toBe(24_691.36);
  });

  it("rejects non-positive prices", () => {
    expect(() => transactionFees("SELL_PURCHASE", 0)).toThrow();
    expect(() => transactionFees("SELL_PURCHASE", Number.NaN)).toThrow();
  });
});

describe("certificateFees", () => {
  it("uses the flat fee for each certificate type", () => {
    for (const type of ["TITLE_DEED", "OWNERSHIP", "VALUATION"] as const) {
      expect(certificateFees(type).total).toBe(CERTIFICATE_FEES[type]);
    }
  });
});
