"use client";

import Link from "next/link";
import { DeskHeader, Panel } from "@/components/desk";
import { Pill } from "@/components/ui";
import { fmt, useStore } from "@/lib/store";

export default function QCList() {
  const { s } = useStore();
  const list = s.orders.filter((o) => o.qc);
  return (
    <>
      <DeskHeader title="QC" sub="Every batch is checked against your approved golden sample before dispatch." />
      <Panel>
        <ul className="divide-y divide-line">
          {list.map((o) => (
            <li key={o.id}>
              <Link href={`/brand/qc/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-soft/40">
                <span><b className="font-semibold">{o.id}</b> · {o.product} · {fmt(o.qty)} {o.uom}<span className="block text-[13px] text-ink-2">{o.qc!.by} · {o.qc!.defects}% defects vs {o.qc!.limit}% limit</span></span>
                <Pill tone={o.qc!.decision ? "ok" : "warn"}>{o.qc!.decision === "approved" ? "Dispatch approved" : o.qc!.decision === "rework" ? "Rework" : "Your approval needed"}</Pill>
              </Link>
            </li>
          ))}
          {list.length === 0 && <li className="py-3 text-[13px] text-ink-2">No QC reports yet.</li>}
        </ul>
      </Panel>
    </>
  );
}
