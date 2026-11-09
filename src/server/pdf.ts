import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import type { findCertificate } from "./certificates";

type Cert = NonNullable<Awaited<ReturnType<typeof findCertificate>>>;

const INK = rgb(0x13 / 255, 0x0f / 255, 0x26 / 255);
const SAGE = rgb(0xa4 / 255, 0xc8 / 255, 0x9a / 255);
const TEAL = rgb(0x1c / 255, 0x99 / 255, 0x9b / 255);
const METAL = rgb(0x6c / 255, 0x72 / 255, 0x81 / 255);
const MIST = rgb(0xed / 255, 0xf3 / 255, 0xeb / 255);

const TITLES: Record<string, string> = {
  TITLE_DEED: "TITLE DEED",
  OWNERSHIP: "PROPERTY OWNERSHIP CERTIFICATE",
  VALUATION: "PROPERTY VALUATION CERTIFICATE",
};

const fmtDate = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(d);
const fmtAed = (n: number) => `AED ${new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 }).format(n)}`;

export async function renderCertificatePdf(cert: Cert, verifyUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${TITLES[cert.type]} ${cert.number}`);
  pdf.setAuthor("Dari-MVP");
  const page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: INK });
  page.drawRectangle({ x: 40, y: height - 82, width: 34, height: 34, color: SAGE });
  page.drawCircle({ x: 74, y: height - 48, size: 7, color: TEAL });
  page.drawText("Dari-MVP", { x: 86, y: height - 66, size: 20, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Digital real estate ecosystem", { x: 86, y: height - 82, size: 9, font: regular, color: SAGE });
  page.drawText("DEMONSTRATION DOCUMENT", { x: width - 190, y: height - 66, size: 9, font: bold, color: SAGE });

  let y = height - 175;
  page.drawText(TITLES[cert.type], { x: 40, y, size: 22, font: bold, color: INK });
  y -= 22;
  page.drawText(`Certificate No. ${cert.number}`, { x: 40, y, size: 11, font: regular, color: METAL });

  y -= 40;
  page.drawRectangle({ x: 40, y: y - 210, width: width - 80, height: 225, color: MIST });
  const p = cert.property;
  const rows: [string, string][] = [
    ["Registered owner", cert.owner.name],
    ["Emirates ID", cert.owner.emiratesId],
    ["Property", `${p.type} ${p.unitNumber}`],
    ["Plot number", p.plotNumber],
    ["Community", `${p.community}, ${p.district}`],
    ["Project", p.project?.name ?? "-"],
    ["Area", `${p.areaSqm} sqm, ${p.bedrooms} bedrooms`],
    ["Register", p.isOffPlan ? "Initial register (off-plan)" : "Real estate register"],
  ];
  if (cert.type === "VALUATION") rows.push(["Estimated value", fmtAed(p.marketValue)]);
  let ry = y - 10;
  for (const [k, v] of rows) {
    page.drawText(k, { x: 60, y: ry, size: 10, font: regular, color: METAL });
    page.drawText(v, { x: 200, y: ry, size: 11, font: bold, color: INK });
    ry -= 24;
  }

  y = y - 250;
  page.drawText(`Issued on ${fmtDate(cert.issuedAt)}`, { x: 40, y, size: 10, font: regular, color: INK });
  page.drawText(`Valid until ${fmtDate(cert.validUntil)}`, { x: 40, y: y - 16, size: 10, font: regular, color: INK });
  page.drawText(
    "This certificate was issued electronically and does not require a signature.",
    { x: 40, y: y - 44, size: 9, font: regular, color: METAL },
  );
  page.drawText("Scan the QR code or visit the address below to verify its authenticity.", {
    x: 40,
    y: y - 58,
    size: 9,
    font: regular,
    color: METAL,
  });
  page.drawText(verifyUrl, { x: 40, y: y - 76, size: 9, font: bold, color: TEAL });

  const qr = await QRCode.toBuffer(verifyUrl, { margin: 1, width: 240, color: { dark: "#130F26", light: "#FFFFFF" } });
  const qrImg = await pdf.embedPng(qr);
  page.drawImage(qrImg, { x: width - 160, y: y - 80, width: 120, height: 120 });

  page.drawRectangle({ x: 0, y: 0, width, height: 36, color: SAGE });
  page.drawText("Dari-MVP is a demonstration product and is not affiliated with any government entity.", {
    x: 40,
    y: 14,
    size: 8,
    font: regular,
    color: INK,
  });

  return pdf.save();
}
