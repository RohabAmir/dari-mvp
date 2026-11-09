import { authed, route } from "@/server/api";

export const GET = route(async (req) => {
  const u = await authed(req);
  return { id: u.id, name: u.name, nameAr: u.nameAr, email: u.email, emiratesId: u.emiratesId, role: u.role, company: u.company };
});
