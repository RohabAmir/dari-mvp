import { authed, body, json, route } from "@/server/api";
import { listMyCertificates, requestCertificate } from "@/server/certificates";

export const GET = route(async (req) => listMyCertificates(await authed(req)));

export const POST = route(async (req) => {
  const user = await authed(req, ["APPLICANT"]);
  return json({ data: await requestCertificate(user, await body(req)) }, 201);
});
