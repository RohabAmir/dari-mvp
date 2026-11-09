"use client";

import { DecisionForm } from "@/components/DecisionForm";
import { reviewAction } from "@/app/actions/applications";
import { decideMilestoneAction, decideProjectAction } from "@/app/actions/escrow";

interface Labels {
  approve: string;
  reject: string;
  returnApp: string;
  placeholder: string;
}

export function ApplicationDecision({ id, labels }: { id: string; labels: Labels }) {
  return (
    <DecisionForm
      placeholder={labels.placeholder}
      doneHref="/review"
      options={[
        { value: "APPROVE", label: labels.approve, tone: "teal" },
        { value: "RETURN", label: labels.returnApp, tone: "outline", needsComment: true },
        { value: "REJECT", label: labels.reject, tone: "danger", needsComment: true },
      ]}
      onDecide={(v, c) => reviewAction(id, v as "APPROVE" | "REJECT" | "RETURN", c)}
    />
  );
}

export function ProjectDecision({ id, labels }: { id: string; labels: Labels }) {
  return (
    <DecisionForm
      compact
      placeholder={labels.placeholder}
      options={[
        { value: "1", label: labels.approve, tone: "teal" },
        { value: "0", label: labels.reject, tone: "danger", needsComment: true },
      ]}
      onDecide={(v, c) => decideProjectAction(id, v === "1", c)}
    />
  );
}

export function MilestoneDecision({ id, labels }: { id: string; labels: Labels }) {
  return (
    <DecisionForm
      compact
      placeholder={labels.placeholder}
      options={[
        { value: "1", label: labels.approve, tone: "teal" },
        { value: "0", label: labels.reject, tone: "danger", needsComment: true },
      ]}
      onDecide={(v, c) => decideMilestoneAction(id, v === "1", c)}
    />
  );
}
