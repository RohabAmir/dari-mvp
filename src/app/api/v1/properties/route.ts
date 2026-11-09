import { db } from "@/lib/db";
import { authed, route } from "@/server/api";
import { eligibleProperties } from "@/server/applications";

/** Lists the caller's properties. Pass ?eligibleFor=FIRST_SALE|SELL_PURCHASE to get units that can be sold. */
export const GET = route(async (req) => {
  const user = await authed(req);
  const eligibleFor = new URL(req.url).searchParams.get("eligibleFor");
  if (eligibleFor === "FIRST_SALE" || eligibleFor === "SELL_PURCHASE") return eligibleProperties(user, eligibleFor);
  return db.property.findMany({ where: { ownerId: user.id }, include: { project: true }, orderBy: { createdAt: "asc" } });
});
