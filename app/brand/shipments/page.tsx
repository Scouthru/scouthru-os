"use client";

import { DeskHeader } from "@/components/desk";
import { ShipmentCard } from "@/components/shipment";
import { useStore } from "@/lib/store";

export default function Shipments() {
  const { s } = useStore();
  const list = s.orders.filter((o) => o.shipment && o.stage === "dispatch");
  return (
    <>
      <DeskHeader title="Shipments" sub="Live tracking, shipping documents and the dock slot at your warehouse." />
      <div className="grid gap-5 lg:grid-cols-2">
        {list.map((o) => <div key={o.id} id={o.id}><ShipmentCard o={o} /></div>)}
      </div>
      {list.length === 0 && <div className="card p-6 text-[14px] text-ink-2">Nothing in transit right now.</div>}
    </>
  );
}
