import { authed, body, route } from "@/server/api";
import { submitApplication } from "@/server/applications";

export const POST = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await authed(req, ["APPLICANT", "DEVELOPER"]);
  return submitApplication(user, (await params).id, await body(req));
});
