"use client";

import Link from "next/link";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Pill } from "@/components/ui";
import { PO_TONE } from "@/components/supplier";
import { StageTrack } from "@/components/ui";
import { PO_STEPS, poTrack } from "@/lib/ops";
import { useStore } from "@/lib/store";

export default function Dispatch() {
  const { s } = useStore();
  const list = s.pos.filter((p) => ["PO confirmed", "Packed", "Dispatched"].includes(p.stage));
  return (
    <>
      <DeskHeader title="Dispatch" sub="Pack, attach proof and documents, pick transport, mark dispatched." />
      <div className="grid gap-5 md:grid-cols-2">
        {list.map((p) => (
          <Panel key={p.id} title={p.id} right={<Pill tone={PO_TONE[p.stage]}>{p.stage}</Pill>}>
            <p className="text-[14px]">{p.title}</p>
            <div className="mt-3"><StageTrack steps={PO_STEPS} {...poTrack(p)} /></div>
            <p className="text-[13px] text-ink-2">{p.factory}, {p.city} · dispatch by {p.dispatchBy}</p>
            <p className="mt-2 text-[13px] text-ink-2">{p.docs.filter((d) => d.status !== "Generate").length} of {p.docs.length} documents ready · {p.photos.length} photos</p>
            <Btn variant="pine" size="sm" className="mt-3" href={`/supplier/pos/${p.id}`}>{p.stage === "Dispatched" ? "View" : "Prepare dispatch"}</Btn>
          </Panel>
        ))}
      </div>
      {list.length === 0 && <div className="card p-6 text-[14px] text-ink-2">Nothing to dispatch. <Link className="underline" href="/supplier/pos">All POs</Link></div>}
    </>
  );
}
