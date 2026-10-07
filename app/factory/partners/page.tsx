"use client";

import { useState } from "react";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Field, Modal, Pill } from "@/components/ui";
import { fmt, useStore } from "@/lib/store";
import type { PartnerUnit } from "@/lib/types";

export default function Partners() {
  const { s, update, toast } = useStore();
  const [share, setShare] = useState<PartnerUnit | null>(null);
  const [units, setUnits] = useState("8000");
  const over = s.enquiries.find((e) => e.fit === "Needs partner unit");
  return (
    <>
      <DeskHeader title="Partner units" sub="Verified factories you can hand overflow to. You stay the buyer's single point of contact." />
      {over && <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 border-apricot bg-peach p-4 text-[14px]"><span><b>{over.product}</b> · {fmt(over.moq)} units is above your free capacity.</span><Pill tone="warn">Needs a partner unit</Pill></div>}
      <div className="grid gap-5 md:grid-cols-3">
        {s.partnerUnits.map((p) => (
          <Panel key={p.code}>
            <div className="flex items-center justify-between"><p className="disp text-[18px]">Unit {p.code}</p><Pill tone="ok">Vetted</Pill></div>
            <p className="mt-1 text-[13px] text-ink-2">{p.city} · {p.licences.join(", ")}</p>
            <p className="mt-2 text-[14px]">{p.lines}</p>
            <p className="mt-2 text-[13px]">Free <b className="num">{fmt(p.free)}</b> units/month</p>
            {p.shared > 0 && <p className="mt-1 text-[13px] text-ok">{fmt(p.shared)} units shared with them</p>}
            <Btn variant="pine" size="sm" className="mt-3" onClick={() => setShare(p)}>Share overflow</Btn>
          </Panel>
        ))}
      </div>
      <Modal open={!!share} onClose={() => setShare(null)} title={`Share overflow with Unit ${share?.code}`}>
        <div className="flex flex-col gap-3 text-[14px]">
          <Field label="Units to share" hint={`They have ${fmt(share?.free ?? 0)} free`}><input className="input num" inputMode="numeric" value={units} onChange={(e) => setUnits(e.target.value)} /></Field>
          <p className="text-ink-2">The buyer sees the split on their order (in-house vs vetted partner). Quality is checked against the same golden sample.</p>
          <Btn variant="pine" onClick={() => {
            const n = Math.min(parseInt(units.replace(/\D/g, ""), 10) || 0, share!.free);
            if (!n) return;
            update((d) => {
              const p = d.partnerUnits.find((x) => x.code === share!.code)!; p.free -= n; p.shared += n;
              const e = d.enquiries.find((x) => x.fit === "Needs partner unit"); if (e) e.fit = "Fits";
            });
            toast(`${fmt(n)} units offered to Unit ${share!.code}. They confirm within 4 hours.`);
            setShare(null);
          }}>Offer units</Btn>
        </div>
      </Modal>
    </>
  );
}
