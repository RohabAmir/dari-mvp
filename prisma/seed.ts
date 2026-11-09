import { PrismaClient, type Prisma } from "@prisma/client";

const db = new PrismaClient();

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
let seq = 100;
const ref = (p: string) => `${p}-202611-${String(++seq).padStart(6, "0")}`;

async function reset() {
  await db.escrowTransaction.deleteMany();
  await db.certificate.deleteMany();
  await db.payment.deleteMany();
  await db.document.deleteMany();
  await db.applicationEvent.deleteMany();
  await db.application.deleteMany();
  await db.milestone.deleteMany();
  await db.escrowAccount.deleteMany();
  await db.property.deleteMany();
  await db.project.deleteMany();
  await db.user.deleteMany();
}

async function main() {
  await reset();

  const [system, ahmed, fatima, omar, mariam] = await Promise.all([
    db.user.create({
      data: { name: "Dari-MVP System", nameAr: "نظام داري", email: "system@dari-mvp.ae", emiratesId: "784-0000-0000000-0", phone: "+97180032724", role: "REVIEWER" },
    }),
    db.user.create({
      data: { name: "Ahmed Al Mansoori", nameAr: "أحمد المنصوري", email: "ahmed@demo.dari-mvp.ae", emiratesId: "784-1985-1234567-1", phone: "+971501234567", role: "APPLICANT" },
    }),
    db.user.create({
      data: { name: "Fatima Al Hashimi", nameAr: "فاطمة الهاشمي", email: "fatima@demo.dari-mvp.ae", emiratesId: "784-1990-7654321-2", phone: "+971502345678", role: "APPLICANT" },
    }),
    db.user.create({
      data: { name: "Omar Haddad", nameAr: "عمر حداد", email: "omar@saadiyat-horizon.ae", emiratesId: "784-1978-1112223-3", phone: "+971503456789", role: "DEVELOPER", company: "Saadiyat Horizon Developments" },
    }),
    db.user.create({
      data: { name: "Mariam Al Dhaheri", nameAr: "مريم الظاهري", email: "mariam@registry.dari-mvp.ae", emiratesId: "784-1988-4445556-4", phone: "+971504567890", role: "REVIEWER" },
    }),
  ]);

  // Ready properties
  const reemApt = await db.property.create({
    data: { unitNumber: "1804", plotNumber: "RM-C3-12", type: "Apartment", bedrooms: 2, areaSqm: 128, marketValue: 1_850_000, community: "Al Reem Island", district: "Abu Dhabi City", ownerId: ahmed.id },
  });
  const yasVilla = await db.property.create({
    data: { unitNumber: "V-27", plotNumber: "YS-W-88", type: "Villa", bedrooms: 4, areaSqm: 345, marketValue: 4_200_000, community: "Yas Island", district: "Abu Dhabi City", ownerId: ahmed.id },
  });
  await db.property.create({
    data: { unitNumber: "T-11", plotNumber: "KH-A-04", type: "Townhouse", bedrooms: 3, areaSqm: 230, marketValue: 2_750_000, community: "Khalifa City", district: "Abu Dhabi City", ownerId: ahmed.id },
  });
  await db.property.create({
    data: { unitNumber: "602", plotNumber: "SD-CU-31", type: "Apartment", bedrooms: 1, areaSqm: 81, marketValue: 1_300_000, community: "Saadiyat Island", district: "Abu Dhabi City", ownerId: fatima.id },
  });

  // Active off-plan project with escrow
  const grove = await db.project.create({
    data: {
      name: "Saadiyat Grove Residences",
      nameAr: "مساكن سعديات جروف",
      community: "Saadiyat Island",
      district: "Abu Dhabi City",
      totalUnits: 16,
      completionPct: 20,
      status: "ACTIVE",
      escrowBank: "First Abu Dhabi Bank",
      startDate: daysAgo(240),
      handoverDate: new Date(Date.now() + 540 * 86_400_000),
      developerId: omar.id,
      createdAt: daysAgo(260),
    },
  });
  const escrow = await db.escrowAccount.create({
    data: { projectId: grove.id, bankName: "First Abu Dhabi Bank", accountNumber: "AE070331234567890123456" },
  });
  const types = [
    { type: "Apartment", bedrooms: 1, areaSqm: 72, value: 1_050_000 },
    { type: "Apartment", bedrooms: 2, areaSqm: 115, value: 1_650_000 },
    { type: "Apartment", bedrooms: 3, areaSqm: 160, value: 2_400_000 },
    { type: "Townhouse", bedrooms: 3, areaSqm: 210, value: 3_100_000 },
  ];
  const units = [];
  for (let i = 0; i < 16; i++) {
    const t = types[i % types.length];
    units.push(
      await db.property.create({
        data: {
          unitNumber: `SGR-${String(i + 1).padStart(3, "0")}`,
          plotNumber: "SD-GR-07",
          type: t.type,
          bedrooms: t.bedrooms,
          areaSqm: t.areaSqm,
          marketValue: t.value,
          community: "Saadiyat Island",
          district: "Abu Dhabi City",
          isOffPlan: true,
          projectId: grove.id,
        },
      }),
    );
  }

  const milestones = [
    { title: "Foundation and substructure", targetPct: 20, releasePct: 15 },
    { title: "Superstructure complete", targetPct: 50, releasePct: 30 },
    { title: "MEP and finishing works", targetPct: 80, releasePct: 30 },
    { title: "Completion and handover", targetPct: 100, releasePct: 25 },
  ];
  const ms = [];
  for (const [i, m] of milestones.entries()) {
    ms.push(
      await db.milestone.create({
        data: {
          ...m,
          order: i + 1,
          projectId: grove.id,
          ...(i === 0
            ? { status: "APPROVED" as const, reportNote: "Piling and raft foundation complete, inspected by consultant.", reportedPct: 22, submittedAt: daysAgo(60), decidedAt: daysAgo(55) }
            : {}),
        },
      }),
    );
  }

  // Sold units: buyers and their escrow deposits, then milestone 1 release
  const sales: { unit: (typeof units)[number]; buyer: typeof ahmed; price: number; dp: number; at: number }[] = [
    { unit: units[0], buyer: ahmed, price: 1_080_000, dp: 20, at: 200 },
    { unit: units[1], buyer: fatima, price: 1_700_000, dp: 20, at: 180 },
    { unit: units[2], buyer: fatima, price: 2_450_000, dp: 10, at: 150 },
    { unit: units[5], buyer: ahmed, price: 1_690_000, dp: 15, at: 120 },
  ];
  let inflow = 0;
  for (const s of sales) {
    await db.property.update({ where: { id: s.unit.id }, data: { ownerId: s.buyer.id, marketValue: s.price } });
    const amount = Math.round((s.price * s.dp) / 100);
    inflow += amount;
    const app = await db.application.create({
      data: {
        reference: ref("APP"),
        type: "FIRST_SALE",
        status: "COMPLETED",
        currentStep: 4,
        propertyId: s.unit.id,
        applicantId: omar.id,
        reviewerId: mariam.id,
        salePrice: s.price,
        feeTotal: Math.max(s.price * 0.01, 500) + 200,
        data: {
          buyer: { userId: s.buyer.id, name: s.buyer.name, emiratesId: s.buyer.emiratesId },
          contract: { salePrice: s.price, contractDate: daysAgo(s.at + 2).toISOString().slice(0, 10), downPaymentPct: s.dp },
        } as Prisma.InputJsonValue,
        submittedAt: daysAgo(s.at + 1),
        completedAt: daysAgo(s.at),
        createdAt: daysAgo(s.at + 3),
      },
    });
    await db.applicationEvent.createMany({
      data: [
        { applicationId: app.id, actorId: omar.id, toStatus: "DRAFT", comment: "Application created", createdAt: daysAgo(s.at + 3) },
        { applicationId: app.id, actorId: omar.id, fromStatus: "DRAFT", toStatus: "SUBMITTED", comment: "Submitted and paid", createdAt: daysAgo(s.at + 1) },
        { applicationId: app.id, actorId: mariam.id, fromStatus: "SUBMITTED", toStatus: "COMPLETED", comment: "Approved", createdAt: daysAgo(s.at) },
      ],
    });
    await db.payment.create({
      data: { applicationId: app.id, amount: app.feeTotal, method: "CARD", status: "PAID", paidAt: daysAgo(s.at + 1), receiptNo: ref("RCP") },
    });
    await db.escrowTransaction.create({
      data: { accountId: escrow.id, direction: "INFLOW", amount, description: `Down payment for unit ${s.unit.unitNumber} (${app.reference})`, propertyId: s.unit.id, payerId: s.buyer.id, createdAt: daysAgo(s.at) },
    });
    await db.certificate.create({
      data: { number: ref("CRT"), type: "OWNERSHIP", propertyId: s.unit.id, ownerId: s.buyer.id, applicationId: app.id, issuedAt: daysAgo(s.at), validUntil: new Date(Date.now() + 90 * 86_400_000) },
    });
  }
  await db.escrowTransaction.create({
    data: { accountId: escrow.id, direction: "INFLOW", amount: 170_000, description: `Installment for unit ${units[1].unitNumber}`, propertyId: units[1].id, payerId: fatima.id, createdAt: daysAgo(70) },
  });
  inflow += 170_000;
  await db.escrowTransaction.create({
    data: { accountId: escrow.id, direction: "OUTFLOW", amount: Math.round(inflow * 0.15), description: "Milestone 1 release: Foundation and substructure", milestoneId: ms[0].id, createdAt: daysAgo(55) },
  });

  // Pending project for the reviewer queue
  await db.project.create({
    data: {
      name: "Yas Bay Heights",
      nameAr: "مرتفعات ياس باي",
      community: "Yas Island",
      district: "Abu Dhabi City",
      totalUnits: 24,
      escrowBank: "Abu Dhabi Commercial Bank",
      startDate: new Date(Date.now() + 30 * 86_400_000),
      handoverDate: new Date(Date.now() + 760 * 86_400_000),
      developerId: omar.id,
      milestones: { create: milestones.map((m, i) => ({ ...m, order: i + 1 })) },
    },
  });

  // Submitted sell/purchase waiting in the reviewer queue
  const sale = await db.application.create({
    data: {
      reference: ref("APP"),
      type: "SELL_PURCHASE",
      status: "SUBMITTED",
      currentStep: 4,
      propertyId: yasVilla.id,
      applicantId: ahmed.id,
      salePrice: 4_350_000,
      feeTotal: 4_350_000 * 0.02 + 200 + 250,
      data: {
        buyer: { userId: fatima.id, name: fatima.name, emiratesId: fatima.emiratesId },
        contract: { salePrice: 4_350_000, contractDate: daysAgo(3).toISOString().slice(0, 10) },
      } as Prisma.InputJsonValue,
      submittedAt: daysAgo(1),
      createdAt: daysAgo(2),
    },
  });
  await db.applicationEvent.createMany({
    data: [
      { applicationId: sale.id, actorId: ahmed.id, toStatus: "DRAFT", comment: "Application created", createdAt: daysAgo(2) },
      { applicationId: sale.id, actorId: ahmed.id, fromStatus: "DRAFT", toStatus: "SUBMITTED", comment: `Submitted and paid ${sale.feeTotal.toFixed(2)} AED`, createdAt: daysAgo(1) },
    ],
  });
  await db.document.createMany({
    data: [
      { applicationId: sale.id, kind: "SPA", fileName: "SPA_Yas_V27_signed.pdf", sizeBytes: 482_113 },
      { applicationId: sale.id, kind: "BUYER_ID", fileName: "Fatima_EID.pdf", sizeBytes: 201_554 },
      { applicationId: sale.id, kind: "NOC", fileName: "Yas_master_developer_NOC.pdf", sizeBytes: 133_902 },
    ],
  });
  await db.payment.create({
    data: { applicationId: sale.id, amount: sale.feeTotal, method: "CARD", status: "PAID", paidAt: daysAgo(1), receiptNo: ref("RCP") },
  });

  // An issued title deed for Ahmed's Reem apartment
  const certApp = await db.application.create({
    data: {
      reference: ref("APP"),
      type: "CERTIFICATE",
      status: "COMPLETED",
      currentStep: 4,
      propertyId: reemApt.id,
      applicantId: ahmed.id,
      reviewerId: system.id,
      feeTotal: 250,
      data: { certType: "TITLE_DEED" },
      submittedAt: daysAgo(20),
      completedAt: daysAgo(20),
      createdAt: daysAgo(20),
    },
  });
  await db.applicationEvent.createMany({
    data: [
      { applicationId: certApp.id, actorId: ahmed.id, fromStatus: "DRAFT", toStatus: "SUBMITTED", comment: "Paid 250 AED", createdAt: daysAgo(20) },
      { applicationId: certApp.id, actorId: system.id, fromStatus: "SUBMITTED", toStatus: "COMPLETED", comment: "Auto-approved: registry records match", createdAt: daysAgo(20) },
    ],
  });
  await db.payment.create({
    data: { applicationId: certApp.id, amount: 250, method: "APPLE_PAY", status: "PAID", paidAt: daysAgo(20), receiptNo: ref("RCP") },
  });
  await db.certificate.create({
    data: { number: "CRT-202611-000001", type: "TITLE_DEED", propertyId: reemApt.id, ownerId: ahmed.id, applicationId: certApp.id, issuedAt: daysAgo(20), validUntil: new Date(Date.now() + 3650 * 86_400_000) },
  });

  console.log("Seeded demo data: 5 users, 1 active + 1 pending project, 20 properties.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
