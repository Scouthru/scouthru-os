"use client";

import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { Pill, type Tone } from "./kit";
import { cn } from "@/lib/cn";

export type PhoneItem = {
  key: string;
  img?: string;
  title: string;
  sub?: string;
  pill?: { tone: Tone; label: string };
  /** Two or three short facts shown under the title, e.g. "50,000 units", "Due 12 Nov". */
  meta?: (string | false | undefined)[];
  selected?: boolean;
  onSelect: () => void;
};

/**
 * Phones only: a list's rows as tappable cards instead of a sideways-scrolling table.
 * Tapping opens the same detail panel the desktop row does and scrolls to it
 * (`detail` is a CSS selector for that panel).
 */
export function PhoneList({ items, detail, empty, className }: { items: PhoneItem[]; detail?: string; empty?: React.ReactNode; className?: string }) {
  const open = (i: PhoneItem) => {
    i.onSelect();
    if (detail) setTimeout(() => document.querySelector(detail)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  return (
    <ul className={cn("space-y-[8px] px-[8px] pb-[10px] lg:hidden", className)}>
      {items.map((i) => (
        <li key={i.key}>
          <button type="button" onClick={() => open(i)} className={cn("flex w-full items-center gap-[12px] rounded-[12px] border bg-white px-[12px] py-[11px] text-left", i.selected ? "border-cs-green ring-1 ring-cs-green/30" : "border-cs-line")}>
            {i.img && <Image src={i.img} alt="" width={88} height={88} className="size-[48px] shrink-0 rounded-[8px] object-cover" />}
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-[8px]">
                <span className="min-w-0 text-[14px] font-medium leading-snug">{i.title}</span>
                {i.pill && <Pill tone={i.pill.tone} className="shrink-0 text-[11px]">{i.pill.label}</Pill>}
              </span>
              {i.sub && <span className="mt-[2px] block truncate text-[12px] text-cs-ink-2">{i.sub}</span>}
              {i.meta && i.meta.filter(Boolean).length > 0 && (
                <span className="mt-[4px] flex flex-wrap gap-x-[10px] gap-y-[2px] text-[12px] text-[#48413b]">
                  {i.meta.filter(Boolean).map((m) => <span key={m as string}>{m}</span>)}
                </span>
              )}
            </span>
            <ChevronRight className="size-[16px] shrink-0 text-cs-ink-2" />
          </button>
        </li>
      ))}
      {items.length === 0 && empty && <li className="py-[18px] text-center text-[13px] text-cs-ink-2">{empty}</li>}
    </ul>
  );
}
