import { authed, route } from "@/server/api";
import { getApplicationDetail } from "@/server/applications";

export const GET = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const user = await authed(req);
  return getApplicationDetail(user, (await params).id);
});
