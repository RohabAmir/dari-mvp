import type { ApplicationStatus, Role } from "@prisma/client";
import { ServiceError } from "@/server/errors";

export type WorkflowAction = "SUBMIT" | "APPROVE" | "REJECT" | "RETURN" | "RESUBMIT";

const TRANSITIONS: Record<WorkflowAction, { from: ApplicationStatus[]; to: ApplicationStatus; roles: Role[] }> = {
  SUBMIT: { from: ["DRAFT"], to: "SUBMITTED", roles: ["APPLICANT", "DEVELOPER"] },
  RESUBMIT: { from: ["RETURNED"], to: "SUBMITTED", roles: ["APPLICANT", "DEVELOPER"] },
  APPROVE: { from: ["SUBMITTED"], to: "COMPLETED", roles: ["REVIEWER"] },
  REJECT: { from: ["SUBMITTED"], to: "REJECTED", roles: ["REVIEWER"] },
  RETURN: { from: ["SUBMITTED"], to: "RETURNED", roles: ["REVIEWER"] },
};

export class WorkflowError extends ServiceError {}

export function nextStatus(current: ApplicationStatus, action: WorkflowAction, role: Role): ApplicationStatus {
  const rule = TRANSITIONS[action];
  if (!rule.roles.includes(role)) {
    throw new WorkflowError(`Role ${role} cannot ${action.toLowerCase()} an application`);
  }
  if (!rule.from.includes(current)) {
    throw new WorkflowError(`Cannot ${action.toLowerCase()} an application that is ${current.toLowerCase()}`);
  }
  return rule.to;
}

export function requiresComment(action: WorkflowAction): boolean {
  return action === "REJECT" || action === "RETURN";
}

export function isEditable(status: ApplicationStatus): boolean {
  return status === "DRAFT" || status === "RETURNED";
}
