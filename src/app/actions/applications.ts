"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { toResult, type ActionResult } from "@/server/errors";
import {
  createDraft,
  reviewApplication,
  saveStep,
  submitApplication,
  type TransactionType,
} from "@/server/applications";
import { requestCertificate } from "@/server/certificates";

export async function startTransaction(formData: FormData) {
  const user = await requireUser(["APPLICANT", "DEVELOPER"]);
  const type = formData.get("type") === "FIRST_SALE" ? "FIRST_SALE" : "SELL_PURCHASE";
  const app = await createDraft(user, type as TransactionType);
  redirect(`/applications/${app.id}/edit`);
}

export async function saveStepAction(id: string, step: number, input: unknown): Promise<ActionResult> {
  const user = await requireUser(["APPLICANT", "DEVELOPER"]);
  const res = await toResult(async () => {
    await saveStep(user, id, step, input);
  });
  revalidatePath(`/applications/${id}`);
  return res;
}

export async function submitAction(id: string, payment: unknown): Promise<ActionResult> {
  const user = await requireUser(["APPLICANT", "DEVELOPER"]);
  const res = await toResult(async () => {
    await submitApplication(user, id, payment);
  });
  revalidatePath("/applications");
  return res;
}

export async function reviewAction(
  id: string,
  action: "APPROVE" | "REJECT" | "RETURN",
  comment: string,
): Promise<ActionResult> {
  const user = await requireUser(["REVIEWER"]);
  const res = await toResult(async () => {
    await reviewApplication(user, id, action, comment);
  });
  revalidatePath("/review");
  revalidatePath(`/review/${id}`);
  return res;
}

export async function lookupBuyerAction(emiratesId: string): Promise<{ found: boolean; name?: string }> {
  await requireUser(["APPLICANT", "DEVELOPER"]);
  const u = await db.user.findUnique({ where: { emiratesId: emiratesId.trim() } });
  if (!u || u.role !== "APPLICANT") return { found: false };
  return { found: true, name: u.name };
}

export async function requestCertificateAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser(["APPLICANT"]);
  const res = await toResult(async () => {
    const app = await requestCertificate(user, input);
    return { id: app.id };
  });
  revalidatePath("/certificates");
  return res;
}
