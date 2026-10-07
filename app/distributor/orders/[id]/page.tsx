"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { CalendarClock, ClipboardCheck, IndianRupee, Package } from "lucide-react";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Pill, StageTrack, Steps } from "@/components/ui";
import { inr, useStore } from "@/lib/store";
import { RETAIL_CTA, RETAIL_STEPS, retailAct, retailTrack } from "@/lib/ops";
import type { RetailerOrder } from "@/lib/types";

const NEXT: Record<RetailerOrder["status"], string> = {
  New: "Confirm the order so the warehouse starts packing.",
  "Credit hold": "This shop has old dues. Approve credit or ask for cash before packing.",
  Picking: "Warehouse is packing the items.",
  "Short 2 SKUs": "2 items are out of stock. Offer substitutes or send the rest.",
  Picked: "Packed and ready. It goes out on the next van.",
  Delivered: "Delivered. Send the invoice and collect payment.",
  Paid: "Paid in full. Nothing left to do.",
};

const CREDIT_TONE: Record<RetailerOrder["credit"], "ok" | "bad" | "neutral"> = { OK: "ok", "Over limit": "bad", Cash: "neutral", Prepaid: "ok" };

export default function RetailerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { s, update, toast, ready } = useStore();
  const o = s.retailerOrders.find((x) => x.id === id);
  if (!o) {
    if (!ready) return <p className="p-6 text-[14px] text-ink-2">Loading…</p>;
    notFound();
  }
  const track = retailTrack(o);
  const act = () => { let msg = ""; update((d) => { msg = retailAct(d, o.id); }); setTimeout(() => toast(msg), 0); };

  const tiles = [
    { icon: ClipboardCheck, label: "Stage", body: <StageTrack steps={RETAIL_STEPS} {...track} /> },
    { icon: Package, label: "Items", body: <><p className="text-[14px] font-semibold">{o.lines} items</p><p className="text-[12px] text-ink-2">{o.stock === "All in" ? "All in stock" : "2 items short"}</p></> },
    { icon: CalendarClock, label: "Delivery", body: <><p className="text-[14px] font-semibold">{o.route}</p><p className="text-[12px] text-ink-2">Today</p></> },
    { icon: IndianRupee, label: "Money", body: <><p className="num text-[14px] font-semibold">{inr(o.value)}</p><p className="mt-1"><Pill tone={CREDIT_TONE[o.credit]}>{o.credit === "OK" ? "Credit OK" : o.credit === "Over limit" ? "Old dues unpaid" : o.credit}</Pill></p></> },
  ];

  return (
    <>
      <DeskHeader
        back={{ href: "/distributor/orders", label: "Retailer orders" }}
        title={o.retailer}
        sub={`${o.area} · order came by ${o.source}`}
        actions={o.status !== "Paid" && o.status !== "Picking" && o.status !== "Picked" ? <Btn variant="flame" onClick={act}>{RETAIL_CTA[o.status]}</Btn> : undefined}
      />
      <Steps steps={RETAIL_STEPS} at={track.at} tone="pine" />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4">
            <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-ink-2"><t.icon className="size-3.5" aria-hidden />{t.label}</p>
            {t.body}
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="What happens next">
          <p className="text-[15px]">{NEXT[o.status]}</p>
        </Panel>
        <Panel title="Order details">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[14px]">
            <dt className="text-ink-2">Shop</dt><dd>{o.retailer}, {o.area}</dd>
            <dt className="text-ink-2">Came by</dt><dd>{o.source}{o.inbox && o.inbox !== o.source ? ` · ${o.inbox}` : ""}</dd>
            <dt className="text-ink-2">Items</dt><dd>{o.lines}</dd>
            <dt className="text-ink-2">Value</dt><dd className="num">{inr(o.value)}</dd>
            <dt className="text-ink-2">Offer</dt><dd>{o.scheme === "—" ? "None" : o.scheme}</dd>
            <dt className="text-ink-2">Route</dt><dd>{o.route}</dd>
          </dl>
        </Panel>
      </div>
    </>
  );
}
