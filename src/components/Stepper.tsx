"use client";

import clsx from "clsx";

export function Stepper({
  steps,
  current,
  reachable,
  onSelect,
}: {
  steps: string[];
  current: number;
  reachable: number;
  onSelect: (i: number) => void;
}) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const canClick = i <= reachable && i !== current;
        return (
          <li key={label} className="flex min-w-fit flex-1 items-center gap-2">
            <button
              type="button"
              disabled={!canClick}
              onClick={() => onSelect(i)}
              className={clsx("flex items-center gap-2.5 rounded-xl px-1 py-1 text-start", canClick && "cursor-pointer hover:opacity-80")}
            >
              <span
                className={clsx(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-bold",
                  active && "border-ink bg-ink text-white",
                  done && "border-teal bg-teal text-white",
                  !active && !done && "border-disabled bg-white text-metal",
                )}
              >
                {done ? "\u2713" : i + 1}
              </span>
              <span className={clsx("text-sm whitespace-nowrap", active ? "font-bold text-ink" : "text-metal")}>{label}</span>
            </button>
            {i < steps.length - 1 && <span className={clsx("h-px min-w-6 flex-1", done ? "bg-teal" : "bg-disabled")} />}
          </li>
        );
      })}
    </ol>
  );
}
