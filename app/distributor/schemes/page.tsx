"use client";

import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Pill } from "@/components/ui";
import { SchemeClaims } from "@/components/distributor";
import { useStore } from "@/lib/store";
import { dayLabel } from "@/lib/seed";

export default function Schemes() {
  const { toast, update } = useStore();
  return (
    <>
      <DeskHeader title="Brands & schemes" sub="Live trade schemes from your brands, and the claims built from what you passed on." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Live schemes">
          <ul className="divide-y divide-line text-[14px]">
            {[["Ruchika Foods", `Buy 10 get 1 · till ${dayLabel(12)}`], ["Spicewell", "Display incentive · ₹500 per outlet"], ["Amma Pickles", "Expiry returns accepted up to 60 days"]].map(([b, t]) => (
              <li key={b} className="flex items-center justify-between gap-2 py-2.5"><span><b className="block">{b}</b><span className="text-ink-2">{t}</span></span><Pill tone="ok">Active</Pill></li>
            ))}
          </ul>
          <Btn size="sm" className="mt-3" onClick={() => {
            let n = 0;
            update((d) => d.retailerOrders.forEach((o) => { if (o.status !== "Delivered" && o.status !== "Paid" && o.scheme === "—") { o.scheme = "Buy 10 get 1"; n++; } }));
            setTimeout(() => toast(n ? `Buy 10 get 1 added to ${n} open order${n === 1 ? "" : "s"}` : "Every open order already has the scheme"), 0);
          }}>Apply to today&apos;s orders</Btn>
        </Panel>
        <SchemeClaims />
      </div>
    </>
  );
}
