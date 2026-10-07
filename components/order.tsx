"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, ClipboardCheck, IndianRupee, PackageCheck, Truck, XCircle } from "lucide-react";
import { Panel } from "@/components/desk";
import { Pill, StageTrack } from "@/components/ui";
import { HEALTH_TONE } from "@/components/brand";
import { fmt, inr, useStore } from "@/lib/store";
import { ORDER_STEPS, PO_STEPS, orderTrack, orderValue, payAmount, poTrack } from "@/lib/ops";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/cn";

/** One-line summary of an order: where it is, what's next, when it lands, and the money. */
export function OrderGlance({ o }: { o: Order }) {
  const total = orderValue(o);
  const paid = o.payments.filter((p) => p.status === "paid").reduce((a, p) => a + payAmount(o, p.pct), 0);
  const due = o.payments.find((p) => p.status === "due");
  const tiles: { icon: typeof Truck; label: string; body: React.ReactNode }[] = [
    { icon: ClipboardCheck, label: "Stage", body: <StageTrack steps={ORDER_STEPS} {...orderTrack(o)} /> },
    { icon: CalendarClock, label: "Next step", body: <><p className="text-[14px] font-semibold">{o.next}</p><p className="text-[12px] text-ink-2">Due {o.due}</p></> },
    { icon: Truck, label: "Delivery", body: <><p className="text-[14px] font-semibold">{o.deliverBy}</p><p className="text-[12px] text-ink-2"><Pill tone={HEALTH_TONE[o.health]}>{o.health}</Pill></p></> },
    {
      icon: IndianRupee,
      label: "Money",
      body: (
        <>
          <p className="text-[14px]"><span className="num font-semibold">{inr(paid)}</span> <span className="text-ink-2">of {inr(total)} paid</span></p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-soft"><span className="block h-full bg-pine" style={{ width: `${total ? (paid / total) * 100 : 0}%` }} /></div>
          <p className="mt-1 text-[12px] text-ink-2">{due ? `Due now: ${inr(payAmount(o, due.pct))}` : "Nothing due now"}</p>
        </>
      ),
    },
  ];
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="card p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-ink-2"><t.icon className="size-3.5" aria-hidden />{t.label}</p>
          {t.body}
        </div>
      ))}
    </div>
  );
}

/** Quality check, shipment, delivery and supplier materials for one order, wherever it has reached. */
export function OrderRelated({ o, role }: { o: Order; role: "brand" | "factory" }) {
  const { s } = useStore();
  const pos = s.pos.filter((p) => p.brandOrder === o.id);
  const more = (href: string, label: string) => role === "brand" ? <Link href={href} className="text-[13px] font-semibold hover:underline">{label} →</Link> : undefined;

  return (
    <>
      {o.qc && (
        <Panel title="Quality check" right={more(`/brand/qc/${o.id}`, "Full report")}>
          <div className="flex items-center gap-3">
            {o.qc.result === "PASS" ? <CheckCircle2 className="size-8 shrink-0 text-ok" aria-hidden /> : <XCircle className="size-8 shrink-0 text-bad" aria-hidden />}
            <div>
              <p className="text-[15px] font-semibold">{o.qc.result === "PASS" ? "Passed" : "Failed"} · {o.qc.defects}% defects <span className="font-normal text-ink-2">(limit {o.qc.limit}%)</span></p>
              <p className="text-[12px] text-ink-2">Checked by {o.qc.by} · {o.qc.date} · sample {o.qc.sample}</p>
            </div>
          </div>
          <p className="mt-3 text-[13px]">
            {o.qc.decision === "approved" ? <Pill tone="ok">Dispatch approved</Pill> : o.qc.decision === "rework" ? <Pill tone="bad">Rework asked</Pill> : <Pill tone="warn">Waiting for brand decision</Pill>}
          </p>
        </Panel>
      )}

      {o.shipment && (
        <Panel title="Shipment" right={more("/brand/shipments", "Track")}>
          <p className="text-[14px]"><b>{o.shipment.carrier}</b> · LR {o.shipment.lr}</p>
          <p className="text-[12px] text-ink-2">ETA {o.shipment.eta} · slot {o.shipment.slot} · receiver {o.shipment.receiver}</p>
          <ol className="mt-3 flex flex-col gap-2.5 border-l-2 border-line pl-4">
            {o.shipment.steps.map((st, i) => (
              <li key={i} className="relative text-[13px]">
                <span className={cn("absolute -left-[22px] top-1 size-2.5 rounded-full ring-2 ring-white", st.done ? "bg-pine" : "bg-soft")} />
                <p className={st.done ? "text-ink" : "text-ink-3"}>{st.text}</p>
                <p className="text-[11px] text-ink-3">{st.at}</p>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {o.delivery && (
        <Panel title="Delivery" right={more(`/brand/deliveries/${o.id}`, "Details")}>
          <div className="flex items-center gap-3">
            <PackageCheck className={cn("size-8 shrink-0", o.delivery.damaged || o.delivery.received < o.delivery.ordered ? "text-warn" : "text-ok")} aria-hidden />
            <div>
              <p className="text-[15px] font-semibold">{fmt(o.delivery.received)} of {fmt(o.delivery.ordered)} received</p>
              <p className="text-[12px] text-ink-2">{o.delivery.at}{o.delivery.damaged ? ` · ${fmt(o.delivery.damaged)} damaged` : ""} · complaint window till {new Date(o.delivery.windowEnds).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
            </div>
          </div>
          {o.delivery.issue && <p className="mt-3 rounded-[10px] bg-soft p-3 text-[13px]"><b>{o.delivery.issue.kind}:</b> {o.delivery.issue.text} <span className="text-ink-2">· {o.delivery.issue.status}</span></p>}
          <p className="mt-3"><Pill tone={o.delivery.settled ? "ok" : "warn"}>{o.delivery.settled ? "Settled" : "Final payment open"}</Pill></p>
        </Panel>
      )}

      {role === "brand" && pos.length > 0 && (
        <Panel title="Materials from suppliers" right="Bought by the factory for this order">
          <ul className="divide-y divide-line">
            {pos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0"><b className="block truncate text-[14px]">{p.title}</b><span className="text-[12px] text-ink-2">{p.id} · dispatch by {p.dispatchBy}</span></span>
                <span className="w-[150px] shrink-0"><StageTrack steps={PO_STEPS} {...poTrack(p)} /></span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
