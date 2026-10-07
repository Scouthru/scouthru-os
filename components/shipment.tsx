"use client";

import Link from "next/link";
import { Phone, Share2 } from "lucide-react";
import { Panel } from "@/components/desk";
import { Btn, Pill } from "@/components/ui";
import type { Order } from "@/lib/types";
import { fmt, useStore } from "@/lib/store";
import { receiveShipment } from "@/lib/ops";
import { cn } from "@/lib/cn";

export function ShipmentCard({ o }: { o: Order }) {
  const { update, toast } = useStore();
  if (!o.shipment) return null;
  const sh = o.shipment;
  return (
    <Panel title={`Shipment · ${o.id}`} right={<span className="text-right"><span className="cap block">ETA</span><span className="num text-[14px] text-ink">{sh.eta}</span></span>}>
      <p className="-mt-2 mb-3 text-[13px] text-ink-2">{o.product} · {fmt(o.qty)} · {sh.carrier} · {sh.lr}</p>
      <ol className="relative ml-2 border-l border-line-2 pl-5">
        {sh.steps.map((s, i) => (
          <li key={i} className="relative pb-3 last:pb-0">
            <span className={cn("absolute -left-[26px] top-1 size-2.5 rounded-full ring-4 ring-white", s.done ? "bg-pine" : "bg-line-2")} />
            <p className="num text-[12px] text-ink-2">{s.at}</p>
            <p className={cn("text-[14px]", !s.done && "text-ink-2")}>{s.text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn size="sm" onClick={() => toast("Calling driver via masked number…")}><Phone className="size-4" />Call driver (masked)</Btn>
        <Btn size="sm" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/brand/shipments#${o.id}`).catch(() => {}); toast("Tracking link copied"); }}><Share2 className="size-4" />Share tracking link</Btn>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-[14px] font-semibold">Shipping documents</p>
          <ul className="mt-1.5 divide-y divide-line text-[13px]">
            {sh.docs.map((d) => <li key={d.name} className="flex justify-between py-1.5"><span>{d.name}</span><Pill tone={d.status === "Pending" ? "warn" : "ok"}>{d.status}</Pill></li>)}
          </ul>
        </div>
        <div className="rounded-[10px] bg-soft p-3 text-[13px]">
          <p className="font-semibold">Receiving at warehouse</p>
          <p className="mt-1 text-ink-2">Dock slot booked</p>
          <p className="mt-2 flex justify-between"><span className="text-ink-2">Slot</span><span>{sh.slot}</span></p>
          <p className="flex justify-between"><span className="text-ink-2">Receiver</span><span>{sh.receiver}</span></p>
          {o.stage === "dispatch" ? (
            <Btn variant="pine" size="sm" className="mt-3 w-full" onClick={() => { update((d) => receiveShipment(d, o.id)); toast("Delivered. 7-day complaint window started."); }}>Mark received · go to delivery check</Btn>
          ) : (
            <Link href={`/brand/deliveries/${o.id}`} className="mt-3 block text-[13px] font-semibold text-flame">Go to delivery check →</Link>
          )}
        </div>
      </div>
    </Panel>
  );
}
