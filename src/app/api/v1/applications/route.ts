import { z } from "zod";
import { authed, body, json, route } from "@/server/api";
import { createDraft, listMyApplications, reviewQueue } from "@/server/applications";

export const GET = route(async (req) => {
  const user = await authed(req);
  return user.role === "REVIEWER" ? reviewQueue() : listMyApplications(user);
});

const createSchema = z.object({ type: z.enum(["FIRST_SALE", "SELL_PURCHASE"]) });

export const POST = route(async (req) => {
  const user = await authed(req, ["APPLICANT", "DEVELOPER"]);
  const { type } = createSchema.parse(await body(req));
  return json({ data: await createDraft(user, type) }, 201);
});
