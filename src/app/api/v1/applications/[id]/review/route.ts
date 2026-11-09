import { z } from "zod";
import { authed, body, route } from "@/server/api";
import { reviewApplication } from "@/server/applications";

const schema = z.object({ action: z.enum(["APPROVE", "REJECT", "RETURN"]), comment: z.string().optional() });

export const POST = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await authed(req, ["REVIEWER"]);
  const { action, comment } = schema.parse(await body(req));
  return reviewApplication(user, (await params).id, action, comment);
});
