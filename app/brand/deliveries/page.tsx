"use client";

import Link from "next/link";
import { DeskHeader, Panel } from "@/components/desk";
import { Pill } from "@/components/ui";
import { fmt, useStore } from "@/lib/store";

export default function Deliveries() {
  const { s } = useStore();
  const list = s.orders.filter((o) => o.delivery);
  return (
    <>
      <DeskHeader title="Deliveries" sub="Count what arrived, raise an issue inside the 7-day window, then release the final payment." />
      <Panel>
        <ul className="divide-y divide-line">
          {list.map((o) => (
            <li key={o.id}>
              <Link href={`/brand/deliveries/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span><b className="font-semibold">{o.id}</b> · {o.product}<span className="block text-[13px] text-ink-2">{fmt(o.delivery!.received)} of {fmt(o.delivery!.ordered)} received · {o.factory}</span></span>
                <Pill tone={o.delivery!.settled ? "ok" : o.delivery!.issue ? "warn" : "neutral"}>{o.delivery!.settled ? "Settled" : o.delivery!.issue ? "Issue open" : "Window open"}</Pill>
              </Link>
            </li>
          ))}
          {list.length === 0 && <li className="py-3 text-[13px] text-ink-2">No deliveries yet.</li>}
        </ul>
      </Panel>
    </>
  );
}
