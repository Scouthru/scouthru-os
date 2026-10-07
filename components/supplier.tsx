"use client";

import Link from "next/link";
import { useState } from "react";
import { Btn, Field, Modal, Pill, Tag } from "@/components/ui";
import type { PO, RFQ } from "@/lib/types";
import { useStore } from "@/lib/store";
import { dayLabel } from "@/lib/seed";

export const PO_TONE: Record<PO["stage"], "info" | "ok" | "neutral" | "bad" | "warn"> = {
  RFQ: "neutral", Quoted: "neutral", "PO confirmed": "warn", Packed: "info", Dispatched: "ok", GRN: "ok", Paid: "neutral", "Overdue pay": "bad",
};

export function RequestList({ rows, compact }: { rows: RFQ[]; compact?: boolean }) {
  const { update, toast } = useStore();
  const [quote, setQuote] = useState<RFQ | null>(null);
  return (
    <>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className={`w-[70px] shrink-0 rounded-full py-0.5 text-center text-[12px] font-medium ${r.type === "RFQ" ? "bg-info-bg text-info" : "bg-ok-bg text-ok"}`}>{r.type}</span>
            <span className="min-w-[200px] flex-1">
              <span className="block text-[14px] font-semibold">{r.item} · {r.buyer}</span>
              <span className="block text-[12px] text-ink-2">via {r.source} · needed by {r.neededBy} · {r.city}{r.note ? ` · ${r.note}` : ""}</span>
            </span>
            <Pill tone={r.stock === "In stock" ? "ok" : r.stock === "Partial" ? "warn" : "neutral"}>{r.stock}</Pill>
            {r.status === "new" ? (
              <span className="flex gap-2">
                <Btn size="sm" variant="pine" onClick={() => (r.type === "Reorder" ? (update((d) => acceptReorder(d, r.id)), toast("Reorder accepted. PO-2240 created, dispatch planned.")) : setQuote(r))}>{r.type === "Reorder" ? "Accept" : "Quote"}</Btn>
                <Btn size="sm" onClick={() => { update((d) => { d.rfqs.find((x) => x.id === r.id)!.status = "declined"; }); toast("Declined. Buyer notified on " + r.source); }}>Decline</Btn>
              </span>
            ) : (
              <Pill tone={r.status === "declined" ? "neutral" : "ok"}>{r.status === "quoted" ? "Quoted · frozen 15 days" : r.status === "accepted" ? "Accepted → PO" : "Declined"}</Pill>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="py-3 text-[13px] text-ink-2">No open requests.</li>}
      </ul>
      {!compact && null}
      <Modal open={!!quote} onClose={() => setQuote(null)} title={`Quote · ${quote?.item}`}>
        <form className="flex flex-col gap-3" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          update((d) => {
            d.rfqs.find((x) => x.id === quote!.id)!.status = "quoted";
            const lead = d.leads.find((l) => l.req.toLowerCase().includes(quote!.item.split(" ").slice(-2).join(" ").toLowerCase()));
            if (lead) { lead.status = `Quoted ${dayLabel(0)}`; lead.next = `Quote expires ${dayLabel(15)}`; lead.cta = "Open"; }
          });
          toast(`Quote sent back on ${quote!.source} at ₹${f.get("rate")}. Frozen for 15 days.`);
          setQuote(null);
        }}>
          <p className="text-[13px] text-ink-2">{quote?.buyer} · needed by {quote?.neededBy} · {quote?.city}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rate (₹ per unit)"><input name="rate" className="input num" inputMode="decimal" required /></Field>
            <Field label="Dispatch in"><select className="input"><option>Same day</option><option>1 day</option><option>3 days</option><option>7 days</option></select></Field>
          </div>
          <Field label="Credit terms"><select className="input"><option>30 days</option><option>15 days</option><option>Advance</option></select></Field>
          <Btn variant="pine" type="submit">Send quote</Btn>
          <p className="text-[12px] text-ink-3">Reply goes back on the channel it came from ({quote?.source}).</p>
        </form>
      </Modal>
    </>
  );
}

export function acceptReorder(d: import("@/lib/types").State, id: string) {
  const r = d.rfqs.find((x) => x.id === id)!;
  r.status = "accepted";
  if (!d.pos.find((p) => p.id === "PO-2240")) {
    d.pos.unshift({
      id: "PO-2240", title: "10,000 shrink sleeves (repeat)", factory: r.buyer, city: r.city, brandOrder: "SO-1042", stage: "PO confirmed", dispatchBy: dayLabel(5), payment: "30 days from GRN",
      lines: [{ item: "Shrink sleeve, custom print (same artwork)", qty: 10000, rate: "₹1.85", packed: 0, batch: "—" }],
      docs: [{ name: "Tax invoice", status: "Generate" }, { name: "E-way bill", status: "Generate" }, { name: "Packing list", status: "Generate" }, { name: "Artwork proof", status: "Attached" }],
      transport: "own", invoice: 18500, photos: [], activity: [{ at: "Today", text: `Reorder accepted from WhatsApp · repeat of PO-2207` }],
    });
  }
}

export function POLink({ p }: { p: PO }) {
  return <Link href={`/supplier/pos/${p.id}`} className="font-semibold text-ink hover:text-flame">{p.id}</Link>;
}

export { Tag };
