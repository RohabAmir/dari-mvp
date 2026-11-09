import type { Metadata } from "next";
import localFont from "next/font/local";
import { getLocale } from "@/lib/locale";
import "./globals.css";

const tajawal = localFont({
  src: [
    { path: "../fonts/Tajawal-Regular.woff2", weight: "400" },
    { path: "../fonts/Tajawal-Medium.woff2", weight: "500" },
    { path: "../fonts/Tajawal-Bold.woff2", weight: "700" },
  ],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Dari-MVP | Digital real estate ecosystem", template: "%s | Dari-MVP" },
  description:
    "Register property transactions, manage off-plan escrow and issue verifiable ownership certificates online.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={tajawal.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
