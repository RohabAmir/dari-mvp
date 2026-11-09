import { getCurrentUser } from "@/lib/session";
import { baseUrl } from "@/lib/baseUrl";
import { findCertificate } from "@/server/certificates";
import { renderCertificatePdf } from "@/server/pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const cert = await findCertificate(number);
  if (!cert) return new Response("Not found", { status: 404 });
  if (cert.ownerId !== user.id && user.role !== "REVIEWER") return new Response("Forbidden", { status: 403 });

  const bytes = await renderCertificatePdf(cert, `${await baseUrl()}/verify/${cert.number}`);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${cert.number}.pdf"`,
    },
  });
}
