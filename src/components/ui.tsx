import clsx from "clsx";
import Link from "next/link";
import type { Dict } from "@/lib/i18n";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-canvas text-metal border-line",
  SUBMITTED: "bg-info-light text-info border-info/20",
  PENDING: "bg-warning-light text-warning border-warning/20",
  RETURNED: "bg-warning-light text-warning border-warning/20",
  REJECTED: "bg-danger-light text-danger border-danger/20",
  COMPLETED: "bg-success-light text-success-dark border-success/20",
  APPROVED: "bg-success-light text-success-dark border-success/20",
  ACTIVE: "bg-teal-light text-teal-dark border-teal/20",
  PLANNED: "bg-canvas text-metal border-line",
  PAID: "bg-success-light text-success-dark border-success/20",
};

export function StatusBadge({ status, t }: { status: string; t: Dict }) {
  const label = (t as Record<string, string>)[`status_${status}`] ?? status;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <Link href={back.href} className="mb-2 inline-block text-sm text-metal hover:text-ink">
            <span className="rtl:hidden">&larr;</span>
            <span className="hidden rtl:inline">&rarr;</span> {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold text-ink md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-metal">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("card", className)}>{children}</div>;
}

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: string; hint?: string; tone?: "default" | "teal" | "sage" }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border p-5",
        tone === "teal" && "border-teal/20 bg-teal-light",
        tone === "sage" && "border-sage/40 bg-sage-mist",
        tone === "default" && "border-line bg-white",
      )}
    >
      <p className="text-sm text-metal">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-metal">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-disabled bg-white px-6 py-14 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-sage-mist text-xl text-teal">&#9675;</div>
      <p className="font-medium text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-metal">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function KeyValue({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.label}>
          <dt className="text-xs text-metal">{i.label}</dt>
          <dd className="mt-0.5 font-medium text-ink">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
