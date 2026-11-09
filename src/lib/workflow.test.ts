import { describe, expect, it } from "vitest";
import { isEditable, nextStatus, requiresComment, WorkflowError } from "./workflow";

describe("application workflow", () => {
  it("moves a draft to submitted when the applicant submits", () => {
    expect(nextStatus("DRAFT", "SUBMIT", "APPLICANT")).toBe("SUBMITTED");
    expect(nextStatus("DRAFT", "SUBMIT", "DEVELOPER")).toBe("SUBMITTED");
  });

  it("lets a reviewer approve, reject or return a submitted application", () => {
    expect(nextStatus("SUBMITTED", "APPROVE", "REVIEWER")).toBe("COMPLETED");
    expect(nextStatus("SUBMITTED", "REJECT", "REVIEWER")).toBe("REJECTED");
    expect(nextStatus("SUBMITTED", "RETURN", "REVIEWER")).toBe("RETURNED");
  });

  it("allows a returned application to be resubmitted", () => {
    expect(nextStatus("RETURNED", "RESUBMIT", "APPLICANT")).toBe("SUBMITTED");
  });

  it("blocks applicants from approving their own application", () => {
    expect(() => nextStatus("SUBMITTED", "APPROVE", "APPLICANT")).toThrow(WorkflowError);
  });

  it("blocks decisions on applications that are not under review", () => {
    expect(() => nextStatus("COMPLETED", "REJECT", "REVIEWER")).toThrow(WorkflowError);
    expect(() => nextStatus("DRAFT", "APPROVE", "REVIEWER")).toThrow(WorkflowError);
    expect(() => nextStatus("SUBMITTED", "SUBMIT", "APPLICANT")).toThrow(WorkflowError);
  });

  it("requires a comment only for negative decisions", () => {
    expect(requiresComment("REJECT")).toBe(true);
    expect(requiresComment("RETURN")).toBe(true);
    expect(requiresComment("APPROVE")).toBe(false);
  });

  it("only drafts and returned applications are editable", () => {
    expect(isEditable("DRAFT")).toBe(true);
    expect(isEditable("RETURNED")).toBe(true);
    expect(isEditable("SUBMITTED")).toBe(false);
    expect(isEditable("COMPLETED")).toBe(false);
  });
});
