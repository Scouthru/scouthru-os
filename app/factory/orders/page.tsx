"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Field, Modal, Pill, StageTrack } from "@/components/ui";
import { HEALTH_TONE } from "@/components/brand";
import { fmt, inr, useStore } from "@/lib/store";
import { BRAND_NAME, FACTORY_ID, ORDER_STEPS, orderTrack, orderValue } from "@/lib/ops";
import { dayLabel } from "@/lib/seed";

export default function Page() {
  return <Suspense><FactoryOrders /></Suspense>;
}

function FactoryOrders() {
  const { s, update, toast } = useStore();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (params.get("new")) setOpen(true); }, [params]);
  const mine = s.orders.filter((o) => o.factoryId === FACTORY_ID);

  return (
    <>
      <DeskHeader title="Orders" sub="Every order from sample to final payment, including ones that never came from Scouthru." actions={<Btn variant="flame" onClick={() => setOpen(true)}>New order</Btn>} />
      <Panel pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr><th className="th pl-6">Order</th><th className="th">Buyer</th><th className="th">Stage</th><th className="th">Value</th><th className="th">Next</th><th className="th pr-6">Status</th></tr></thead>
            <tbody>
              {mine.map((o) => (
                <tr key={o.id} className="hover:bg-soft/50">
                  <td className="td pl-6"><Link href={`/factory/orders/${o.id}`} className="font-semibold text-ink hover:text-flame">{o.id}</Link><p className="text-[12px] text-ink-2">{o.product} · {fmt(o.qty)} {o.uom}</p></td>
                  <td className="td">{BRAND_NAME[o.brandId] ?? o.brandId}</td>
                  <td className="td"><StageTrack steps={ORDER_STEPS} {...orderTrack(o)} /></td>
                  <td className="td num">{inr(orderValue(o))}</td>
                  <td className="td">{o.next}</td>
                  <td className="td pr-6"><Pill tone={HEALTH_TONE[o.health]}>{o.health}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Modal open={open} onClose={() => setOpen(false)} title="New order (from any source)">
        <form className="flex flex-col gap-3" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const qty = parseInt(String(f.get("qty")).replace(/\D/g, ""), 10) || 0;
          const price = parseFloat(String(f.get("price"))) || 0;
          if (!qty || !price) return;
          update((d) => {
            const base = structuredClone(d.orders.find((o) => o.id === "SO-2019")!);
            const id = `SO-${2040 + d.orders.length}`;
            d.orders.unshift({ ...base, id, brandId: String(f.get("buyer")) || "Direct buyer", product: String(f.get("product")), qty, unitPrice: price, stage: "agreed", progress: 8, next: "Advance on e-sign", due: dayLabel(1), deliverBy: dayLabel(30), frozenTill: dayLabel(15), proofs: [], changes: [], chat: [] });
            d.capacity.booked += qty;
          });
          toast("Order created with the standard 20/30/30/20 milestones. Capacity updated.");
          setOpen(false);
        }}>
          <Field label="Buyer"><input name="buyer" className="input" required placeholder="e.g. Snackly" /></Field>
          <Field label="Product"><input name="product" className="input" required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity"><input name="qty" className="input" inputMode="numeric" required /></Field>
            <Field label="Price per unit (₹)"><input name="price" className="input" inputMode="decimal" required /></Field>
          </div>
          <Btn variant="pine" type="submit">Create order</Btn>
        </form>
      </Modal>
    </>
  );
}
