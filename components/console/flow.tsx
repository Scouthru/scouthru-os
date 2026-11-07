"use client";

import { useState } from "react";
import { ArrowRight, Check, CircleDashed, MessageSquare, TriangleAlert, X } from "lucide-react";
import type { Milestone, NextStep } from "@/lib/console/flow";
// Dates always in India time, like the rest of the app, so the server and browser render the same text.
import { ago, fmtDateTime, fmtDay } from "@/lib/console/format";
import { cn } from "@/lib/cn";

/**
 * "Next step" banner: what is happening, who has to act, and (for the side that acts)
 * the one button that moves it forward. Used at the top of every record.
 */
export function NextAction({ step, onAction, className }: { step: NextStep; onAction?: () => void; className?: string }) {
  const tone = step.state === "closed" ? "closed" : step.state === "done" ? "done" : step.yours ? "yours" : "waiting";
  return (
    <section
      aria-label="Next step"
      className={cn(
        "flex flex-wrap items-center gap-x-[18px] gap-y-[10px] rounded-[12px] border px-[16px] py-[13px]",
        tone === "yours" && "border-cs-green/40 bg-cs-mint/60",
        tone === "waiting" && "border-cs-line bg-[#fffdf9]",
        tone === "done" && "border-cs-ok/30 bg-cs-ok-bg/50",
        tone === "closed" && "border-cs-line bg-[#f6f0e7]",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="eyebrow">{tone === "yours" ? "Your next step" : tone === "waiting" ? "Waiting on" : tone === "done" ? "Done" : "Closed"}</p>
        <p className="mt-[5px] text-[16px] font-medium leading-snug tracking-[-0.01em] text-cs-ink">{step.title}</p>
        <p className="mt-[3px] text-[12.5px] leading-[1.45] text-cs-ink-2">
          {step.state === "open" && <>Responsible: <b className="font-medium text-cs-ink">{step.owner}</b></>}
          {step.state === "open" && step.detail && " · "}
          {step.detail}
        </p>
        {(step.due || step.blocker) && (
          <p className="mt-[5px] flex flex-wrap gap-[6px] text-[11.5px]">
            {step.due && <span className={cn("rounded-full border px-[9px] py-[1px]", new Date(step.due) < new Date() ? "border-cs-red/40 text-cs-red" : "border-[#d5c9b7] text-cs-ink-2")}>Due {fmtDay(step.due)}</span>}
            {step.blocker && <span className="inline-flex items-center gap-[5px] rounded-full border border-cs-orange/40 px-[9px] py-[1px] text-cs-orange"><TriangleAlert className="size-[11px]" />{step.blocker}</span>}
          </p>
        )}
        {step.then && <p className="mt-[3px] flex items-center gap-[6px] text-[12px] text-cs-ink-2"><ArrowRight className="size-[12px]" />Then: {step.then}</p>}
      </div>
      {step.action && step.actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            "inline-flex h-[40px] shrink-0 items-center gap-[8px] rounded-[7px] px-[16px] text-[13.5px] font-medium transition",
            tone === "yours" ? "bg-cs-green text-white hover:bg-[#7c2c14]" : "border border-[#d5c9b7] bg-white text-cs-ink hover:border-[#ad9c8e]",
          )}
        >
          {step.actionLabel}<ArrowRight className="size-[15px]" />
        </button>
      )}
    </section>
  );
}

const DOT: Record<Milestone["tone"], { cls: string; icon: typeof Check }> = {
  done: { cls: "bg-cs-green text-white", icon: Check },
  warn: { cls: "bg-cs-orange-bg text-cs-orange", icon: TriangleAlert },
  bad: { cls: "bg-cs-red-bg text-cs-red", icon: X },
  note: { cls: "bg-[#f1eadf] text-cs-ink-2", icon: MessageSquare },
};

/**
 * Shared timeline: milestones by default, comments behind "Show all activity",
 * and the pending next step at the end so it reads from first event to "what now".
 */
export function Timeline({ items, next, className }: { items: Milestone[]; next?: NextStep; className?: string }) {
  const [all, setAll] = useState(false);
  const [only, setOnly] = useState<string | null>(null);
  // Combined timelines (product workspace) tag each event with its record and can filter by it.
  const tags = Array.from(new Set(items.map((i) => i.tag).filter(Boolean))) as string[];
  const pool = only ? items.filter((i) => i.tag === only) : items;
  const minor = pool.filter((i) => !i.major).length;
  const shown = all ? pool : pool.filter((i) => i.major);
  return (
    <div className={className}>
      {tags.length > 1 && (
        <div className="mb-[12px] flex flex-wrap gap-[6px]" role="group" aria-label="Filter by type">
          {[null, ...tags].map((t) => (
            <button key={t ?? "all"} type="button" aria-pressed={only === t} onClick={() => setOnly(t)}
              className={cn("rounded-full border px-[10px] py-[3px] text-[11.5px]", only === t ? "border-cs-green bg-cs-green text-white" : "border-[#d5c9b7] text-cs-ink-2 hover:border-[#ad9c8e]")}>
              {t ?? "All"}
            </button>
          ))}
        </div>
      )}
      <ol className="relative">
        {shown.map((i, k) => {
          const d = DOT[i.tone];
          return (
            <li key={`${i.at}-${k}`} className="relative flex gap-[12px] pb-[14px]">
              <span aria-hidden className="absolute bottom-0 left-[11px] top-[24px] w-px bg-cs-line" />
              <span className={cn("relative grid size-[23px] shrink-0 place-items-center rounded-full", d.cls)}><d.icon className="size-[12px]" strokeWidth={2.4} /></span>
              <div className="min-w-0 flex-1 pt-[2px]">
                <p className="text-[13px] leading-snug">{i.tag && <span className="monolabel mr-[6px]">{i.tag}</span>}<b className="font-medium">{i.title}</b> <span className="text-cs-ink-2">· {i.who}</span></p>
                <p className="mt-[1px] text-[11.5px] text-cs-ink-2">
                  <time dateTime={i.at}>{fmtDateTime(i.at)}</time>
                  {" · "}{ago(i.at)}
                  {i.change && <span className="ml-[6px] font-mono text-[10.5px] tracking-[0.04em]">{i.change[0]} → {i.change[1]}</span>}
                </p>
                {i.text && <p className="mt-[4px] rounded-[8px] bg-[#f8f3eb] px-[10px] py-[7px] text-[12.5px] leading-[1.45] text-[#48413b]">{i.text}</p>}
              </div>
            </li>
          );
        })}
        {next && next.state === "open" && !only && (
          <li className="relative flex gap-[12px]">
            <span className="relative grid size-[23px] shrink-0 place-items-center rounded-full border-2 border-dashed border-cs-green/60 bg-white text-cs-green"><CircleDashed className="size-[11px]" /></span>
            <div className="min-w-0 flex-1 pt-[2px]">
              <p className="text-[13px] leading-snug"><b className="font-medium text-cs-green">Next: {next.title}</b></p>
              <p className="mt-[1px] text-[11.5px] text-cs-ink-2">Pending · {next.owner}</p>
            </div>
          </li>
        )}
      </ol>
      {minor > 0 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-[10px] text-[12.5px] font-medium text-cs-green hover:underline">
          {all ? "Show milestones only" : `Show all activity (${minor} comment${minor === 1 ? "" : "s"})`}
        </button>
      )}
    </div>
  );
}
