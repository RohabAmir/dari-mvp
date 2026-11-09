"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { toResult, type ActionResult } from "@/server/errors";
import { decideMilestone, decideProject, payInstallment, registerProject, submitMilestoneReport } from "@/server/escrow";

export async function registerProjectAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser(["DEVELOPER"]);
  const res = await toResult(async () => ({ id: (await registerProject(user, input)).id }));
  revalidatePath("/projects");
  return res;
}

export async function decideProjectAction(projectId: string, approve: boolean, note: string): Promise<ActionResult> {
  const user = await requireUser(["REVIEWER"]);
  const res = await toResult(async () => {
    await decideProject(user, projectId, approve, note);
  });
  revalidatePath("/review");
  return res;
}

export async function submitMilestoneAction(milestoneId: string, input: unknown): Promise<ActionResult> {
  const user = await requireUser(["DEVELOPER"]);
  const res = await toResult(async () => {
    await submitMilestoneReport(user, milestoneId, input);
  });
  revalidatePath("/projects");
  return res;
}

export async function decideMilestoneAction(milestoneId: string, approve: boolean, note: string): Promise<ActionResult> {
  const user = await requireUser(["REVIEWER"]);
  const res = await toResult(async () => {
    await decideMilestone(user, milestoneId, approve, note);
  });
  revalidatePath("/review");
  return res;
}

export async function payInstallmentAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser(["APPLICANT"]);
  const res = await toResult(async () => {
    await payInstallment(user, input);
  });
  revalidatePath("/escrow");
  return res;
}
