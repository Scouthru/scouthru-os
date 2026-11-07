"use client";

import Link from "next/link";
import { useState } from "react";
import { Moon, Search } from "lucide-react";
import { StagePill, TypeBadge } from "@/components/hq/ui";
import { STAGES, TYPE_LABEL, progress, quietDays } from "@/lib/hq/rules";
import { useHq } from "@/lib/hq/store";
import { useHqMe } from "@/components/hq/shell";
import type { MemberType } from "@/lib/hq/types";
import { cn } from "@/lib/cn";

const FILTERS: ("all" | MemberType)[] = ["all", "maker", "supplier", "distributor", "brand"];
const HINT: Record<string, string> = { New: "Send the welcome kit", Documents: "Collect and check", Visit: "Visit and photos", Review: "Your approval", Live: "On Scouthru" };

/** Members: the onboarding pipeline, one column per stage. */
export default function Members() {
  const { s } = useHq();
  const [filter, setFilter] = useState<"all" | MemberType>("all");
  const [q, setQ] = useState("");
  const me = useHqMe();
  const list = s.members.filter((m) => (me.role !== "field" || m.fieldId === me.id) && (filter === "all" || m.type === filter) && `${m.name} ${m.city} ${m.state}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="grid gap-[16px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="serif text-[30px] font-semibold leading-tight tracking-[-0.02em]">Members</h1>
          <p className="mt-[2px] text-[13.5px] text-cs-ink-2">Every member moves left to right. Product owners skip the visit.</p>
        </div>
        <label className="flex h-[38px] w-full items-center gap-[8px] rounded-[9px] border border-cs-line bg-white px-[11px] sm:w-[260px]">
          <Search className="size-[15px] text-cs-ink-2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or city" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" aria-label="Search members" />
        </label>
      </div>
      <div className="flex flex-wrap gap-[6px]">
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-full px-[12px] py-[5px] text-[12.5px]", filter === f ? "bg-cs-deep text-white" : "bg-white text-[#48413b] ring-1 ring-cs-line hover:bg-[#f6f0e6]")}>
            {f === "all" ? `All (${s.members.length})` : `${TYPE_LABEL[f]} (${s.members.filter((m) => m.type === f).length})`}
          </button>
        ))}
      </div>

      <div className="grid gap-[12px] md:grid-cols-2 xl:grid-cols-5">
        {STAGES.map((st) => {
          const col = list.filter((m) => progress(s, m).stage === st);
          return (
            <section key={st} id={st.toLowerCase()} className="flex min-w-0 scroll-mt-[130px] flex-col rounded-[14px] bg-[#f3ebde] p-[10px]">
              <header className="mb-[8px] flex items-center justify-between px-[4px]">
                <span className="flex items-center gap-[8px]"><StagePill stage={st} /><span className="text-[12px] text-cs-ink-2">{HINT[st]}</span></span>
                <span className="serif text-[18px] font-semibold">{col.length}</span>
              </header>
              <ul className="grid gap-[8px]">
                {col.map((m) => {
                  const p = progress(s, m);
                  const quiet = quietDays(s, m);
                  return (
                    <li key={m.id}>
                      <Link href={`/hq/members/${m.id}`} className="block rounded-[10px] border border-cs-line bg-white p-[11px] hover:border-cs-green-2/60 hover:shadow-sm">
                        <p className="truncate text-[13.5px] font-semibold">{m.name}</p>
                        <p className="mt-[4px] flex flex-wrap items-center gap-[6px] text-[11.5px] text-cs-ink-2"><TypeBadge type={m.type} />{m.city}</p>
                        <p className={cn("mt-[8px] text-[12px]", st === "Review" ? "font-semibold text-cs-green" : "text-[#48413b]")}>{p.nextText}</p>
                        {quiet >= 3 && <p className="mt-[6px] inline-flex items-center gap-[4px] rounded-full bg-cs-orange-bg px-[7px] py-[1px] text-[11px] font-medium text-[#a9713f]"><Moon className="size-[11px]" />Quiet {quiet} days</p>}
                      </Link>
                    </li>
                  );
                })}
                {col.length === 0 && <li className="rounded-[10px] border border-dashed border-[#ddd6c8] px-[10px] py-[14px] text-center text-[12px] text-cs-ink-2">Nobody here</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
