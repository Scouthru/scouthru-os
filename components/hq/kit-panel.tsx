"use client";

import Link from "next/link";
import { ArrowRight, UserPlus } from "lucide-react";
import { DocBoxes, PhotoBoxes } from "./onboarding-kit";
import { TypeBadge } from "./ui";
import { progress } from "@/lib/hq/rules";
import { useHq } from "@/lib/hq/store";
import type { Member } from "@/lib/hq/types";

/**
 * "Onboarding upload boxes": pick a member (or start a new one) and drop each required
 * document and photo onto its own box. Shown on the Owner and Onboarding dashboards.
 */
export function KitPanel({ member, choices, onPick, onNew }: { member?: Member; choices: Member[]; onPick: (id: string) => void; onNew: () => void }) {
  const { s } = useHq();
  const p = member ? progress(s, member) : null;
  return (
    <section id="kit" className="scroll-mt-[130px] rounded-[14px] border-2 border-cs-green/30 bg-white p-[16px] shadow-[0_1px_2px_rgba(60,40,25,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <h2 className="serif text-[19px] font-semibold leading-tight">Onboarding upload boxes</h2>
        <button type="button" onClick={onNew} className="inline-flex h-[34px] items-center gap-[6px] rounded-[8px] bg-cs-green px-[12px] text-[12.5px] font-medium text-white hover:bg-[#7c2c14]"><UserPlus className="size-[15px]" />New onboarding</button>
      </div>
      {!member || !p ? (
        <p className="mt-[14px] rounded-[10px] bg-[#fbf8f3] p-[14px] text-center text-[13px] text-cs-ink-2">Nobody in onboarding. Start one with New onboarding.</p>
      ) : (
        <>
          <label className="mt-[10px] flex items-center gap-[8px] text-[12.5px] text-cs-ink-2">
            For
            <select value={member.id} onChange={(e) => onPick(e.target.value)} className="h-[34px] min-w-0 flex-1 rounded-[8px] border border-cs-line bg-white px-[8px] text-[13px] font-medium text-cs-ink" aria-label="Whose documents">
              {choices.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <TypeBadge type={member.type} />
          </label>
          <p className="mt-[10px] flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <span className="font-semibold">Documents required · {p.checklist.filter((c) => c.state !== "missing" && c.state !== "rejected").length} of {p.checklist.length} in</span>
            <span className="text-cs-ink-2">Drop a file on its box</span>
          </p>
          <div className="mt-[8px]"><DocBoxes m={member} compact /></div>
          {p.needPhotos > 0 && (
            <>
              <p className="mt-[14px] text-[12px] font-semibold">Photos · plant and machinery · {p.photos} of {p.needPhotos} needed</p>
              <div className="mt-[8px]"><PhotoBoxes m={member} compact /></div>
            </>
          )}
          <Link href={`/hq/members/${member.id}`} className="mt-[12px] inline-flex items-center gap-[4px] text-[12.5px] font-medium text-cs-green hover:underline">Open {member.name}&apos;s full file <ArrowRight className="size-[13px]" /></Link>
        </>
      )}
    </section>
  );
}
