import { authed, body, route } from "@/server/api";
import { saveStep } from "@/server/applications";
import { assert } from "@/server/errors";

const STEPS = ["property", "parties", "contract", "documents"];

/** PUT /api/v1/applications/:id/steps/{property|parties|contract|documents} */
export const PUT = route(async (req, { params }: { params: Promise<{ id: string; step: string }> }) => {
  const user = await authed(req, ["APPLICANT", "DEVELOPER"]);
  const { id, step } = await params;
  const index = STEPS.indexOf(step);
  assert(index >= 0, `Unknown step "${step}". Use one of: ${STEPS.join(", ")}`, 404);
  return saveStep(user, id, index, await body(req));
});
