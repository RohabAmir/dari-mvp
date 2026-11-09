import "server-only";
import { z } from "zod";
import type { Prisma, User } from "@prisma/client";
import { db } from "@/lib/db";
import { escrowAccountNo } from "@/lib/ids";
import { assert } from "./errors";

export const MILESTONE_TEMPLATE = [
  { title: "Foundation and substructure", targetPct: 20, releasePct: 15 },
  { title: "Superstructure complete", targetPct: 50, releasePct: 30 },
  { title: "MEP and finishing works", targetPct: 80, releasePct: 30 },
  { title: "Completion and handover", targetPct: 100, releasePct: 25 },
];

const UNIT_TYPES = [
  { type: "Apartment", bedrooms: 1, areaSqm: 72, value: 1_050_000 },
  { type: "Apartment", bedrooms: 2, areaSqm: 115, value: 1_650_000 },
  { type: "Apartment", bedrooms: 3, areaSqm: 160, value: 2_400_000 },
  { type: "Townhouse", bedrooms: 3, areaSqm: 210, value: 3_100_000 },
];

export const projectSchema = z.object({
  name: z.string().trim().min(3, "Project name is required"),
  nameAr: z.string().trim().min(2, "Arabic name is required"),
  community: z.string().trim().min(2, "Community is required"),
  district: z.string().trim().min(2, "District is required"),
  totalUnits: z.coerce.number().int().min(4, "At least 4 units").max(60, "MVP limit is 60 units"),
  startDate: z.coerce.date(),
  handoverDate: z.coerce.date(),
  bankName: z.string().trim().min(2, "Escrow bank is required"),
});

export async function registerProject(developer: User, input: unknown) {
  assert(developer.role === "DEVELOPER", "Only developers can register projects", 403);
  const p = projectSchema.parse(input);
  assert(p.handoverDate > p.startDate, "Handover date must be after the start date");
  return db.project.create({
    data: {
      name: p.name,
      nameAr: p.nameAr,
      community: p.community,
      district: p.district,
      totalUnits: p.totalUnits,
      startDate: p.startDate,
      handoverDate: p.handoverDate,
      escrowBank: p.bankName,
      developerId: developer.id,
      milestones: { create: MILESTONE_TEMPLATE.map((m, i) => ({ ...m, order: i + 1 })) },
    },
  });
}

export async function decideProject(reviewer: User, projectId: string, approve: boolean, note?: string) {
  assert(reviewer.role === "REVIEWER", "Only registry reviewers can approve projects", 403);
  const project = await db.project.findUnique({ where: { id: projectId } });
  assert(project, "Project not found", 404);
  assert(project.status === "PENDING", "This project was already processed", 409);

  if (!approve) {
    assert(note && note.trim().length >= 5, "Give the developer a reason (at least 5 characters)");
    return db.project.update({ where: { id: projectId }, data: { status: "REJECTED", reviewNote: note.trim() } });
  }

  return db.$transaction(async (tx) => {
    await tx.escrowAccount.create({ data: { projectId, bankName: project.escrowBank, accountNumber: escrowAccountNo() } });
    const prefix = project.name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "UNT";
    const plot = `P-${Math.floor(1000 + Math.random() * 9000)}`;
    await tx.property.createMany({
      data: Array.from({ length: project.totalUnits }, (_, i) => {
        const u = UNIT_TYPES[i % UNIT_TYPES.length];
        return {
          unitNumber: `${prefix}-${String(i + 1).padStart(3, "0")}`,
          plotNumber: plot,
          type: u.type,
          bedrooms: u.bedrooms,
          areaSqm: u.areaSqm,
          marketValue: u.value,
          community: project.community,
          district: project.district,
          isOffPlan: true,
          projectId,
        };
      }),
    });
    return tx.project.update({ where: { id: projectId }, data: { status: "ACTIVE", reviewNote: note?.trim() || null } });
  });
}

export const milestoneReportSchema = z.object({
  completionPct: z.coerce.number().int().min(0).max(100),
  note: z.string().trim().min(10, "Describe the progress in at least 10 characters"),
});

export async function submitMilestoneReport(developer: User, milestoneId: string, input: unknown) {
  const { completionPct, note } = milestoneReportSchema.parse(input);
  const m = await db.milestone.findUnique({ where: { id: milestoneId }, include: { project: { include: { milestones: true } } } });
  assert(m, "Milestone not found", 404);
  assert(m.project.developerId === developer.id, "This is not your project", 403);
  assert(m.project.status === "ACTIVE", "Project must be active");
  assert(m.status === "PLANNED" || m.status === "REJECTED", "This milestone report was already submitted");
  const earlierOpen = m.project.milestones.some((x) => x.order < m.order && x.status !== "APPROVED");
  assert(!earlierOpen, "Complete the earlier milestones first");
  assert(completionPct >= m.targetPct, `Construction must reach ${m.targetPct}% to claim this milestone`);
  return db.milestone.update({
    where: { id: milestoneId },
    data: { status: "SUBMITTED", reportNote: note, reportedPct: completionPct, reviewNote: null, submittedAt: new Date() },
  });
}

export async function decideMilestone(reviewer: User, milestoneId: string, approve: boolean, note?: string) {
  assert(reviewer.role === "REVIEWER", "Only registry reviewers can approve milestones", 403);
  const m = await db.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: { include: { escrow: true, milestones: true } } },
  });
  assert(m, "Milestone not found", 404);
  assert(m.status === "SUBMITTED", "This milestone was already processed", 409);
  assert(m.project.escrow, "Project has no escrow account");
  const escrow = m.project.escrow;

  if (!approve) {
    assert(note && note.trim().length >= 5, "Give the developer a reason (at least 5 characters)");
    return db.milestone.update({
      where: { id: milestoneId },
      data: { status: "REJECTED", reviewNote: note.trim(), decidedAt: new Date() },
    });
  }

  return db.$transaction(async (tx) => {
    const { inflow, balance } = await escrowTotals(tx, escrow.id);
    const release = Math.min(balance, Math.round((inflow * m.releasePct) / 100));
    if (release > 0) {
      await tx.escrowTransaction.create({
        data: {
          accountId: escrow.id,
          direction: "OUTFLOW",
          amount: release,
          description: `Milestone ${m.order} release: ${m.title}`,
          milestoneId: m.id,
        },
      });
    }
    const isLast = m.order === Math.max(...m.project.milestones.map((x) => x.order));
    await tx.project.update({
      where: { id: m.projectId },
      data: { completionPct: m.targetPct, status: isLast ? "COMPLETED" : "ACTIVE" },
    });
    if (isLast) {
      await tx.property.updateMany({ where: { projectId: m.projectId }, data: { isOffPlan: false } });
    }
    return tx.milestone.update({
      where: { id: milestoneId },
      data: { status: "APPROVED", reviewNote: note?.trim() || null, decidedAt: new Date() },
    });
  });
}

export async function pendingProjects() {
  return db.project.findMany({ where: { status: "PENDING" }, include: { developer: true }, orderBy: { createdAt: "asc" } });
}

export async function pendingMilestones() {
  return db.milestone.findMany({
    where: { status: "SUBMITTED" },
    include: { project: { include: { developer: true } } },
    orderBy: { submittedAt: "asc" },
  });
}

export async function escrowTotals(client: Prisma.TransactionClient | typeof db, accountId: string) {
  const rows = await client.escrowTransaction.groupBy({ by: ["direction"], where: { accountId }, _sum: { amount: true } });
  const inflow = rows.find((r) => r.direction === "INFLOW")?._sum.amount ?? 0;
  const outflow = rows.find((r) => r.direction === "OUTFLOW")?._sum.amount ?? 0;
  return { inflow, outflow, balance: inflow - outflow };
}

export const installmentSchema = z.object({
  propertyId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be greater than zero").max(50_000_000),
});

export async function payInstallment(buyer: User, input: unknown) {
  const { propertyId, amount } = installmentSchema.parse(input);
  const property = await db.property.findUnique({ where: { id: propertyId }, include: { project: { include: { escrow: true } } } });
  assert(property, "Property not found", 404);
  assert(property.ownerId === buyer.id, "You can only pay installments on units you own", 403);
  assert(property.isOffPlan && property.project?.escrow, "This unit is not linked to an escrow account");
  const paid = await db.escrowTransaction.aggregate({
    where: { propertyId, payerId: buyer.id, direction: "INFLOW" },
    _sum: { amount: true },
  });
  const remaining = property.marketValue - (paid._sum.amount ?? 0);
  assert(amount <= remaining, `Amount exceeds the outstanding balance of AED ${Math.max(0, remaining).toLocaleString("en-AE")}`);
  return db.escrowTransaction.create({
    data: {
      accountId: property.project.escrow.id,
      direction: "INFLOW",
      amount,
      description: `Installment for unit ${property.unitNumber}`,
      propertyId,
      payerId: buyer.id,
    },
  });
}

export async function myDeposits(user: User) {
  return db.escrowTransaction.findMany({
    where: { payerId: user.id, direction: "INFLOW" },
    include: { property: { include: { project: true } }, account: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectDashboard(user: User, projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      developer: true,
      escrow: { include: { transactions: { orderBy: { createdAt: "desc" }, include: { property: true } } } },
      milestones: { orderBy: { order: "asc" } },
      properties: { include: { owner: true }, orderBy: { unitNumber: "asc" } },
    },
  });
  assert(project, "Project not found", 404);
  assert(user.role === "REVIEWER" || project.developerId === user.id, "You do not have access to this project", 403);
  const totals = project.escrow ? await escrowTotals(db, project.escrow.id) : { inflow: 0, outflow: 0, balance: 0 };
  return { project, totals };
}

export async function myProjects(developer: User) {
  const projects = await db.project.findMany({
    where: { developerId: developer.id },
    include: { escrow: true, _count: { select: { properties: true } }, properties: { select: { ownerId: true } } },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(
    projects.map(async (p) => ({
      ...p,
      sold: p.properties.filter((u) => u.ownerId).length,
      totals: p.escrow ? await escrowTotals(db, p.escrow.id) : { inflow: 0, outflow: 0, balance: 0 },
    })),
  );
}
