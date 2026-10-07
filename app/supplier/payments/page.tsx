"use client";

import { Ageing, DeskHeader, Panel } from "@/components/desk";
import { Btn, Pill, Stat } from "@/components/ui";
import { POLink } from "@/components/supplier";
import { inr, lakh, useStore } from "@/lib/store";

export default function SupplierPayments() {
  const { s, toast } = useStore();
  const open = s.pos.filter((p) => p.stage !== "Paid");
  const overdue = s.pos.filter((p) => p.stage === "Overdue pay");
  return (
    <>
      <DeskHeader title="Payments" sub="What each factory owes you, by age. Reminders go out automatically." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="To collect" value={lakh(open.reduce((a, p) => a + p.invoice, 0))} />
        <Stat label="Overdue" value={lakh(overdue.reduce((a, p) => a + p.invoice, 0))} tone="bad" />
        <Stat label="Avg days to pay" value="27" />
        <Stat label="Received this month" value={lakh(s.pos.filter((p) => p.stage === "Paid").reduce((a, p) => a + p.invoice, 0))} tone="ok" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Panel title="Ageing">
          <Ageing rows={[{ label: "Not due", value: 180000, max: 200000, tone: "bg-ok" }, { label: "1–15 days", value: 92000, max: 200000, tone: "bg-apricot" }, { label: "16–30 days", value: 41000, max: 200000, tone: "bg-flame" }, { label: "30+ days", value: 18000, max: 200000, tone: "bg-bad" }]} />
        </Panel>
        <Panel title="Invoices">
          <ul className="divide-y divide-line text-[14px]">
            {s.pos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><POLink p={p} /> · {p.factory}<span className="block text-[12px] text-ink-2">{p.payment}</span></span>
                <span className="flex items-center gap-2"><span className="num">{inr(p.invoice)}</span>{p.stage === "Overdue pay" ? <Btn size="sm" onClick={() => toast(`UPI payment link sent to ${p.factory}`)}>Send UPI link</Btn> : <Pill tone={p.stage === "Paid" ? "ok" : "neutral"}>{p.stage === "Paid" ? "Received" : "Open"}</Pill>}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
