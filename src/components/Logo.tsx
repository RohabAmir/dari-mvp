import Link from "next/link";
import { getDict } from "@/lib/locale";

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#130F26" />
      <path d="M11 29V17.5L20 11l9 6.5V29h-6.5v-7h-5v7H11z" fill="#A4C89A" />
      <circle cx="29" cy="11" r="4" fill="#1C999B" />
    </svg>
  );
}

export async function Logo({ href = "/" }: { href?: string }) {
  const { t } = await getDict();
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <LogoMark />
      <span className="leading-tight">
        <span className="block text-lg font-bold tracking-tight text-ink">
          Dari<span className="text-teal">-MVP</span>
        </span>
        <span className="block text-[11px] text-metal">{t.tagline}</span>
      </span>
    </Link>
  );
}
