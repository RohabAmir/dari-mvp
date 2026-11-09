import { authed, route } from "@/server/api";
import { getProjectDashboard } from "@/server/escrow";

export const GET = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await authed(req, ["DEVELOPER", "REVIEWER"]);
  return getProjectDashboard(user, (await params).id);
});
