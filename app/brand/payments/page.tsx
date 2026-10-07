"use client";

import Link from "next/link";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Pill, Stat } from "@/components/ui";
import { inr, lakh, useStore } from "@/lib/store";
import { payAmount, payNext } from "@/lib/ops";

export default function Payments() {
  const { s, update, toast } = useStore();
  const rows = s.orders.filter((o) => o.brandId === "ruchika" && o.unitPrice > 0).flatMap((o) => o.payments.map((p) => ({ o, p, amt: payAmount(o, p.pct) })));
  const sum = (st: string) => rows.filter((r) => r.p.status === st).reduce((a, r) => a + r.amt, 0);
  const order = { due: 0, proof: 1, later: 2, paid: 3 } as const;
  return (
    <>
      <DeskHeader title="Payments" sub="Held in escrow and released milestone by milestone, only on verified proof." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Due now" value={lakh(sum("due"))} tone={sum("due") ? "bad" : undefined} />
        <Stat label="Due on proof" value={lakh(sum("proof"))} />
        <Stat label="Committed, later" value={lakh(sum("later"))} />
        <Stat label="Paid" value={lakh(sum("paid"))} tone="ok" />
      </div>
      <Panel className="mt-5" pad={false} title="Milestones">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead><tr><th className="th pl-6">Order</th><th className="th">Milestone</th><th className="th">Amount</th><th className="th">Status</th><th className="th pr-6" /></tr></thead>
            <tbody>
              {[...rows].sort((a, b) => order[a.p.status] - order[b.p.status]).map(({ o, p, amt }) => (
                <tr key={o.id + p.label}>
                  <td className="td pl-6"><Link href={`/brand/orders/${o.id}`} className="font-semibold text-ink hover:text-flame">{o.id}</Link><p className="text-[12px] text-ink-2">{o.product} · {o.factory}</p></td>
                  <td className="td">{p.label}</td>
                  <td className="td num">{inr(amt)}</td>
                  <td className="td"><Pill tone={p.status === "paid" ? "ok" : p.status === "due" ? "bad" : p.status === "proof" ? "warn" : "neutral"}>{p.status === "paid" ? "Paid" : p.status === "due" ? "Due now" : p.status === "proof" ? "Due on proof" : "Later"}</Pill></td>
                  <td className="td pr-6 text-right">{p.status === "due" && <Btn size="sm" variant="pine" onClick={() => { let m: string | null = null; update((d) => { m = payNext(d, o.id); }); setTimeout(() => toast(m ?? "Paid"), 0); }}>Pay now</Btn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
