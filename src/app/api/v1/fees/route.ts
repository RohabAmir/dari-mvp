import { z } from "zod";
import { certificateFees, transactionFees } from "@/lib/fees";
import { route } from "@/server/api";

const schema = z.discriminatedUnion("type", [
  z.object({ type: z.enum(["FIRST_SALE", "SELL_PURCHASE"]), price: z.coerce.number().positive() }),
  z.object({ type: z.literal("CERTIFICATE"), certificate: z.enum(["TITLE_DEED", "OWNERSHIP", "VALUATION"]) }),
]);

/** Public fee calculator, e.g. /api/v1/fees?type=SELL_PURCHASE&price=2000000 */
export const GET = route(async (req) => {
  const q = schema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return q.type === "CERTIFICATE" ? certificateFees(q.certificate) : transactionFees(q.type, q.price);
});
