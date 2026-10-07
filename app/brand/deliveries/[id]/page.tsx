"use client";

import { use, useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Pill } from "@/components/ui";
import { fmt, inr, useStore } from "@/lib/store";
import { nextOrderId, openCase, orderValue, payAmount, settleFinal } from "@/lib/ops";
import { dayLabel } from "@/lib/seed";
import { cn } from "@/lib/cn";

const ISSUES = ["Shortage", "Damage", "Quality mismatch", "Wrong label"];

function left(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Closed";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return `${d}d ${String(h).padStart(2, "0")}h left`;
}

export default function Delivery({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { s, update, toast, ready } = useStore();
  const router = useRouter();
  const o = s.orders.find((x) => x.id === id);
  const [kind, setKind] = useState("Shortage");
  const [what, setWhat] = useState("");
  const [want, setWant] = useState("");
  const [rate, setRate] = useState({ quality: 0, time: 0, comms: 0 });
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 60000); return () => clearInterval(t); }, []);
  if (!o || !o.delivery) {
    if (!ready) return <p className="p-6 text-[14px] text-ink-2">Loading…</p>;
    notFound();
  }
  const dv = o.delivery;
  const short = dv.ordered - dv.received + dv.damaged;
  const value = orderValue(o);
  const paidSoFar = o.payments.filter((p) => p.status === "paid").reduce((a, p) => a + payAmount(o, p.pct), 0);
  const deduction = Math.round(short * o.unitPrice);
  const release = Math.max(0, value - paidSoFar - deduction);

  return (
    <>
      <DeskHeader
        back={{ href: "/brand/orders", label: "Orders" }}
        title={`${o.id} · Delivered`}
        badge={<Pill tone={dv.settled ? "ok" : "neutral"}>{dv.settled ? "Closed" : "Closing"}</Pill>}
        sub={`${o.product} · ${fmt(o.qty)} ${o.uom} · ${o.factory}, ${o.factoryCity} · Delivered ${dv.at}`}
        actions={<div className="rounded-[10px] bg-pine px-4 py-2.5 text-white"><p className="monocap text-[11px] text-white/70">Complaint window</p><p className="num text-[18px]">{dv.settled ? "Closed" : left(dv.windowEnds)}</p></div>}
      />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-5">
          <Panel title="Received vs ordered">
            <div className="grid grid-cols-3 gap-2">
              {[["Ordered", dv.ordered, ""], ["Received", dv.received, ""], ["Short / damaged", short, "bad"]].map(([k, v, t]) => (
                <div key={k as string} className={cn("rounded-lg p-3", t ? "bg-bad-bg" : "bg-soft")}><p className={cn("cap", t && "text-bad")}>{k as string}</p><p className={cn("num mt-1 text-[24px]", t && "text-bad")}>{fmt(v as number)}</p></div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {([["POD · signed", "/proofs/signed-form.jpg"], ["GRN · warehouse", "/proofs/warehouse-racks.jpg"], ["Damaged cartons", "/proofs/crushed-cartons.jpg"]] as const).map(([x, src]) => <div key={x} className="relative h-24 overflow-hidden rounded-[10px] bg-soft"><img src={src} alt={x} className="size-full object-cover" /><span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] text-white">{x}</span></div>)}
            </div>
          </Panel>

          <Panel title="Raise an issue" right="Scouthru mediates">
            {dv.issue ? (
              <div className="rounded-[10px] bg-soft p-3 text-[14px]"><p className="font-semibold">{dv.issue.kind} · {dv.issue.status}</p><p className="mt-1">{dv.issue.text}</p><p className="mt-1 text-ink-2">Wanted: {dv.issue.want}</p></div>
            ) : (
              <form className="flex flex-col gap-3" onSubmit={(e) => {
                e.preventDefault();
                if (!what.trim()) return;
                update((d) => { const x = d.orders.find((y) => y.id === o.id)!; x.delivery!.issue = { kind, text: what, want: want || "Credit note", status: "Under review by Scouthru" }; x.health = "Action"; openCase(d, { kind: "Delivery issue", title: `${o.id} · ${kind}`, detail: `${what} · wants: ${want || "Credit note"}`, from: "Ruchika Foods", orderId: o.id }); });
                toast("Issue submitted. Final payment is held until it's resolved.");
              }}>
                <div className="flex flex-wrap gap-2">{ISSUES.map((i) => <button type="button" key={i} onClick={() => setKind(i)} className={cn("h-9 rounded-full border px-3.5 text-[13px]", kind === i ? "border-pine bg-pine text-white" : "border-line-2")}>{i}</button>)}</div>
                <textarea required className="input h-20 py-2" placeholder="What happened, e.g. 2 cartons crushed in transit (24 packs). Photos attached." value={what} onChange={(e) => setWhat(e.target.value)} />
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Resolution you want<select className="input font-normal" value={want} onChange={(e) => setWant(e.target.value)}><option value="">Choose…</option><option>Deduct from final payment</option><option>Replace in next batch</option><option>Credit note</option></select></label>
                <Btn variant="pine" type="submit" className="w-fit" disabled={dv.settled}>Submit issue</Btn>
              </form>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel title="Final settlement">
            <dl className="divide-y divide-line text-[14px]">
              <div className="flex justify-between py-2"><dt className="text-ink-2">Order value</dt><dd className="num">{inr(value)}</dd></div>
              <div className="flex justify-between py-2"><dt className="text-ink-2">Paid so far ({Math.round((paidSoFar / value) * 100)}%)</dt><dd className="num">− {inr(paidSoFar)}</dd></div>
              <div className="flex justify-between py-2"><dt className="text-ink-2">Shortage deduction · {short} {o.uom}</dt><dd className="num text-bad">− {inr(deduction)}</dd></div>
              <div className="flex justify-between py-2"><dt className="text-ink-2">QC inspection fee</dt><dd><Pill tone="ok">Paid</Pill></dd></div>
              <div className="flex justify-between py-2.5 font-semibold"><dt>Release now</dt><dd className="num">{dv.settled ? "Settled" : inr(release)}</dd></div>
            </dl>
            <Btn variant="pine" size="lg" className="mt-3 w-full" disabled={dv.settled || !!dv.issue} onClick={() => { update((d) => settleFinal(d, o.id)); toast(`${inr(release)} released. Order closed.`); }}>
              {dv.settled ? "Final payment released" : "Release final 20%"}
            </Btn>
            <p className="mt-2 text-[12px] text-ink-2">{dv.issue ? "Held while the issue is open." : "Or wait: auto-releases when the window closes with no open issue."}</p>
          </Panel>

          <Panel title={`Rate ${o.factory}`}>
            {([["quality", "Quality"], ["time", "On time"], ["comms", "Communication"]] as const).map(([k, l]) => (
              <div key={k} className="flex items-center justify-between py-1.5 text-[14px]">
                <span>{l}</span>
                <span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setRate({ ...rate, [k]: n })} aria-label={`${l} ${n} stars`}><Star className={cn("size-5", n <= (rate[k] || dv.rating?.[k] || 0) ? "fill-flame text-flame" : "text-line-2")} /></button>)}</span>
              </div>
            ))}
            <Btn size="sm" className="mt-2" onClick={() => { update((d) => { d.orders.find((y) => y.id === o.id)!.delivery!.rating = rate; }); toast("Thanks. Your rating feeds the factory's trust score."); }}>Save rating</Btn>
          </Panel>

          <Panel title="Next">
            <p className="text-[13px] text-ink-2">Same factory, same specs, price re-quoted and frozen 15 days.</p>
            <div className="mt-3 flex gap-2">
              <Btn variant="flame" onClick={() => {
                let nid = "";
                update((d) => {
                  nid = nextOrderId(d);
                  const c = structuredClone(d.orders.find((y) => y.id === o.id)!);
                  d.orders.unshift({ ...c, id: nid, stage: "agreed", progress: 8, health: "On track", next: "Advance on e-sign", due: dayLabel(1), deliverBy: dayLabel(25), frozenTill: dayLabel(15), proofs: [], changes: [], chat: [], qc: undefined, shipment: undefined, delivery: undefined, payments: c.payments.map((p, i) => ({ ...p, status: i === 0 ? "due" : "later" })), phases: c.phases.map((p) => ({ ...p, status: "todo", pct: 0, pay: "later", payNote: "On verified proof" })) } as typeof c);
                  d.actions.unshift({ id: `a-${nid}`, kind: "Pay", title: `Advance 20% for ${nid}`, detail: `Reorder with ${c.factory} · ₹${payAmount(d.orders[0], 20).toLocaleString("en-IN")} · on e-sign`, cta: "Pay now", orderId: nid, tone: "blush" });
                });
                toast("Reorder placed with the same factory and specs");
                setTimeout(() => router.push(`/brand/orders/${nid}`), 250);
              }}>Reorder</Btn>
              <Btn onClick={() => {
                const blob = new Blob([JSON.stringify(o, null, 2)], { type: "application/json" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${o.id}.json`; a.click();
              }}>Download order file</Btn>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
