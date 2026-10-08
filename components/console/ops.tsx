"use client";

import { Truck } from "lucide-react";
import { cn } from "@/lib/cn";

/** Carrier shown as styled text with a neutral icon (no third-party logos). */
export function Carrier({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("flex items-center gap-[6px] text-[11.5px] font-semibold leading-tight text-[#2b302d]", className)}>
      <span className="grid size-[20px] shrink-0 place-items-center rounded-full bg-[#eef0ec] text-[#4b524e]"><Truck className="size-[11px]" strokeWidth={2} /></span>
      <span className="whitespace-pre-line">{name.replace(" Freight", "\nFreight")}</span>
    </span>
  );
}

/** Table header cell used on the list screens: 11px, sentence case, muted. */
export const th = "whitespace-nowrap px-[8px] pb-[10px] pt-[10px] text-left text-[11px] font-medium text-[#4b524e]";

/** The date-window select: the empty value is the default window shown as its label. */
export const WINDOWS = { "Last 7 Days": 7, "Last 30 Days": 30, "Last 90 Days": 90, "All Time": 100000 } as const;

export function inWindow(iso: string, days: number) {
  return Math.abs(Date.now() - new Date(iso).getTime()) <= days * 864e5;
}

/** Thin progress bar. */
export function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-[8px] overflow-hidden rounded-full bg-[#e9ebe6]", className)}>
      <div className="h-full rounded-full bg-cs-green" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
