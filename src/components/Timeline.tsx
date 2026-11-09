import clsx from "clsx";
import type { Dict, Locale } from "@/lib/i18n";
import { dateTime } from "@/lib/format";
import { StatusBadge } from "./ui";

export interface TimelineEvent {
  id: string;
  toStatus: string;
  comment: string | null;
  createdAt: Date;
  actor: { name: string; nameAr: string; role: string };
}

export function Timeline({ events, t, locale }: { events: TimelineEvent[]; t: Dict; locale: Locale }) {
  return (
    <ol className="relative space-y-5 border-s border-line ps-6">
      {events.map((e, i) => (
        <li key={e.id} className="relative">
          <span
            className={clsx(
              "absolute -start-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white",
              i === events.length - 1 ? "bg-teal ring-4 ring-teal/15" : "bg-celadon",
            )}
          />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={e.toStatus} t={t} />
            <span className="text-xs text-metal">{dateTime(e.createdAt, locale)}</span>
          </div>
          <p className="mt-1 text-sm">
            <span className="font-medium">{locale === "ar" ? e.actor.nameAr : e.actor.name}</span>
            <span className="text-metal"> · {(t as Record<string, string>)[`role_${e.actor.role}`]}</span>
          </p>
          {e.comment && <p className="mt-1 rounded-lg bg-canvas px-3 py-2 text-sm text-ink-soft">{e.comment}</p>}
        </li>
      ))}
    </ol>
  );
}
