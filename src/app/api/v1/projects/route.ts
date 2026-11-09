import { authed, body, json, route } from "@/server/api";
import { myProjects, pendingProjects, registerProject } from "@/server/escrow";

export const GET = route(async (req) => {
  const user = await authed(req, ["DEVELOPER", "REVIEWER"]);
  return user.role === "REVIEWER" ? pendingProjects() : myProjects(user);
});

export const POST = route(async (req) => {
  const user = await authed(req, ["DEVELOPER"]);
  return json({ data: await registerProject(user, await body(req)) }, 201);
});
