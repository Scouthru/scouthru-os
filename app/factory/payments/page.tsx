"use client";

import Link from "next/link";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Pill, Stat } from "@/components/ui";
import { inr, lakh, useStore } from "@/lib/store";
import { BRAND_NAME, FACTORY_ID, notify, payAmount } from "@/lib/ops";

export default function FactoryPayments() {
  const { s, update, toast } = useStore();
  const rows = s.orders.filter((o) => o.factoryId === FACTORY_ID).flatMap((o) => o.payments.map((p) => ({ o, p, amt: payAmount(o, p.pct) })));
  const sum = (st: string) => rows.filter((r) => r.p.status === st).reduce((a, r) => a + r.amt, 0);
  return (
    <>
      <DeskHeader title="Payments" sub="Structured milestones with automatic reminders. Escrow releases each one on your proof." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Received" value={lakh(sum("paid"))} tone="ok" />
        <Stat label="Due from buyers" value={lakh(sum("due"))} tone={sum("due") ? "bad" : undefined} />
        <Stat label="Unlocks on your proof" value={lakh(sum("proof"))} />
        <Stat label="Later" value={lakh(sum("later"))} />
      </div>
      <Panel className="mt-5" pad={false} title="Milestones">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead><tr><th className="th pl-6">Order</th><th className="th">Buyer</th><th className="th">Milestone</th><th className="th">Amount</th><th className="th">Status</th><th className="th pr-6" /></tr></thead>
            <tbody>
              {rows.map(({ o, p, amt }) => (
                <tr key={o.id + p.label}>
                  <td className="td pl-6"><Link href={`/factory/orders/${o.id}`} className="font-semibold text-ink hover:text-flame">{o.id}</Link></td>
                  <td className="td">{BRAND_NAME[o.brandId] ?? o.brandId}</td>
                  <td className="td">{p.label}</td>
                  <td className="td num">{inr(amt)}</td>
                  <td className="td"><Pill tone={p.status === "paid" ? "ok" : p.status === "due" ? "bad" : p.status === "proof" ? "warn" : "neutral"}>{p.status === "paid" ? "Received" : p.status === "due" ? "Due" : p.status === "proof" ? "On your proof" : "Later"}</Pill></td>
                  <td className="td pr-6 text-right">{p.status === "due" && <Btn size="sm" onClick={() => { update((d) => notify(d, "brand", `${o.id}: ${p.label} of ${inr(amt)} is due to Nutrabite Foods`, `/brand/orders/${o.id}`)); toast("Reminder sent to the buyer on WhatsApp and email"); }}>Remind</Btn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
