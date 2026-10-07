"use client";

import { use, useRef, useState } from "react";
import { notFound } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Modal, Pill, Steps, readFile } from "@/components/ui";
import { PO_TONE } from "@/components/supplier";
import { fmt, inr, useStore } from "@/lib/store";
import { dayLabel } from "@/lib/seed";
import type { PO } from "@/lib/types";
import { cn } from "@/lib/cn";

const STEPS = ["RFQ", "Quoted", "PO confirmed", "Packed", "Dispatched", "GRN", "Paid"];

export default function PODetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { s, update, toast, ready } = useStore();
  const ref = useRef<HTMLInputElement>(null);
  const [offer, setOffer] = useState(false);
  const p = s.pos.find((x) => x.id === id);
  if (!p) {
    if (!ready) return <p className="p-6 text-[14px] text-ink-2">Loading…</p>;
    notFound();
  }
  const at = p.stage === "Overdue pay" ? 5 : STEPS.indexOf(p.stage);
  const set = (fn: (x: PO) => void) => update((d) => fn(d.pos.find((y) => y.id === id)!));

  return (
    <>
      <DeskHeader
        back={{ href: "/supplier", label: "Supplier desk" }}
        title={p.id}
        badge={<Pill tone={PO_TONE[p.stage]}>{p.stage}{p.stage === "Packed" && p.dispatchBy === "Today" ? " · dispatch today" : ""}</Pill>}
        sub={`${p.title} · ${p.factory}, ${p.city} · linked to brand order ${p.brandOrder}`}
        actions={<><Btn onClick={() => toast("Calling factory via masked number…")}><Phone className="size-4" />Call factory (masked)</Btn><Btn onClick={() => toast("WhatsApp thread opened (demo)")}><MessageCircle className="size-4" />WhatsApp thread</Btn></>}
      />
      <Steps steps={STEPS} at={at} tone="pine" />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-5">
          <Panel title="Line items" pad={false}>
            <div className="overflow-x-auto px-2 pb-2">
              <table className="w-full min-w-[520px]">
                <thead><tr><th className="th">Item</th><th className="th">Qty</th><th className="th">Rate</th><th className="th">Packed</th><th className="th">Batch / lot</th></tr></thead>
                <tbody>
                  {p.lines.map((l) => (
                    <tr key={l.item}><td className="td">{l.item}</td><td className="td num">{fmt(l.qty)}</td><td className="td num">{l.rate}</td><td className="td"><Pill tone={l.packed >= l.qty ? "ok" : "warn"}>{fmt(l.packed)}</Pill></td><td className="td num">{l.batch}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Dispatch proof" right="Shared with factory and brand automatically">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {p.photos.map((ph, i) => ph.image ? <div key={i} className="relative h-24 overflow-hidden rounded-[10px] bg-soft"><img src={ph.image} alt={ph.label} className="size-full object-cover" /><span className="absolute bottom-1.5 left-1.5 max-w-[90%] truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] text-white">{ph.label}</span></div> : <div key={i} className="hatch flex h-24 items-end rounded-lg p-2 text-[11px] text-ink-2">{ph.label}</div>)}
              <button onClick={() => ref.current?.click()} className="flex h-24 items-center justify-center rounded-lg border border-dashed border-line-2 text-[13px] font-semibold text-flame">+ Add photo</button>
              <input ref={ref} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const { url } = await readFile(f); set((x) => { x.photos.push({ label: f.name, image: url }); }); toast("Photo added to dispatch proof"); }} />
            </div>
            <ul className="mt-3 divide-y divide-line text-[14px]">
              {p.docs.map((d) => (
                <li key={d.name} className="flex items-center justify-between py-2">
                  <span>{d.name}</span>
                  {d.status === "Generate" ? <button onClick={() => { set((x) => { x.docs.find((y) => y.name === d.name)!.status = "Generated"; }); toast(`${d.name} generated`); }}><Pill tone="warn">Generate</Pill></button> : <Pill tone="ok">{d.status}</Pill>}
                </li>
              ))}
            </ul>
          </Panel>

          {["PO confirmed", "Packed"].includes(p.stage) && (
            <Panel title="Transport">
              <div className="grid gap-2 sm:grid-cols-2">
                {([["own", "Own vehicle", "AP 07 TB 4412"], ["partner", "Scouthru partner", "Quote ₹2,400 · pickup 4 PM"]] as const).map(([k, t, d]) => (
                  <label key={k} className={cn("flex cursor-pointer gap-3 rounded-lg border p-3", p.transport === k ? "border-pine bg-soft" : "border-line")}>
                    <input type="radio" checked={p.transport === k} onChange={() => set((x) => { x.transport = k; })} className="mt-1 accent-[var(--color-pine)]" />
                    <span><b className="block text-[14px]">{t}</b><span className="text-[13px] text-ink-2">{d}</span></span>
                  </label>
                ))}
              </div>
              <Btn variant="pine" className="mt-3" onClick={() => {
                if (p.stage === "PO confirmed") { set((x) => { x.stage = "Packed"; x.lines.forEach((l) => (l.packed = l.qty)); x.activity.push({ at: "Today", text: "Packed" }); }); toast("Marked packed"); return; }
                set((x) => { x.stage = "Dispatched"; x.payment = "GRN pending"; x.docs.forEach((dd) => (dd.status = dd.status === "Generate" ? "Generated" : dd.status)); x.activity.push({ at: "Today", text: `Dispatched by ${x.transport === "own" ? "own vehicle" : "Scouthru partner"} · e-way bill generated` }); });
                toast("Dispatched. Factory and brand notified with proof.");
              }}>{p.stage === "PO confirmed" ? "Mark packed" : "Mark dispatched"}</Btn>
            </Panel>
          )}
          {p.stage === "Dispatched" && <Btn variant="outline" className="w-fit" onClick={() => { set((x) => { x.stage = "GRN"; x.payment = `30 days · due ${dayLabel(30)}`; x.activity.push({ at: "Today", text: "GRN confirmed by factory" }); }); toast("GRN recorded. Payment clock started."); }}>Record GRN from factory</Btn>}
          {(p.stage === "GRN" || p.stage === "Overdue pay") && <Btn variant="outline" className="w-fit" onClick={() => { set((x) => { x.stage = "Paid"; x.payment = "Received"; x.activity.push({ at: "Today", text: "Payment received" }); }); toast("Payment marked received"); }}>Mark payment received</Btn>}
        </div>

        <div className="flex flex-col gap-5">
          <Panel title="Payment" right="Terms: 30 days from GRN">
            <dl className="divide-y divide-line text-[14px]">
              <div className="flex justify-between py-2"><dt className="text-ink-2">Invoice value</dt><dd className="num">{inr(p.invoice)}</dd></div>
              <div className="flex justify-between py-2"><dt className="text-ink-2">Due date</dt><dd className="num">~ {dayLabel(31)}</dd></div>
              <div className="flex justify-between py-2"><dt className="text-ink-2">Status</dt><dd><Pill tone={p.stage === "Overdue pay" ? "bad" : p.stage === "Paid" ? "ok" : "neutral"}>{p.stage === "Paid" ? "Received" : p.stage === "Overdue pay" ? "Overdue" : ["GRN"].includes(p.stage) ? "Running" : "Starts after GRN"}</Pill></dd></div>
            </dl>
            <div className="mt-3 rounded-[10px] bg-soft p-3">
              <p className="text-[14px] font-semibold">Need cash sooner?</p>
              <p className="text-[13px] text-ink-2">Get 85% of this invoice 2 days after GRN through a credit partner.</p>
              <Btn size="sm" className="mt-2" onClick={() => setOffer(true)}>See offer</Btn>
            </div>
          </Panel>
          <Panel title="Buyer">
            <p className="text-[15px] font-semibold">{p.factory} · {p.city}</p>
            <p className="text-[13px] text-ink-2">14 POs with you · pays in avg 27 days</p>
            <div className="mt-2 flex gap-1.5"><Pill tone="ok">Verified</Pill><Pill tone="ok">Good payer</Pill></div>
          </Panel>
          <Panel title="Activity">
            <ul className="flex flex-col gap-2 text-[13px]">
              {p.activity.map((a, i) => <li key={i} className="grid grid-cols-[60px_1fr] gap-2"><span className="num text-ink-2">{a.at}</span><span>{a.text}</span></li>)}
            </ul>
          </Panel>
        </div>
      </div>
      <Modal open={offer} onClose={() => setOffer(false)} title="Invoice discounting offer">
        <div className="flex flex-col gap-3 text-[14px]">
          <div className="rounded-[10px] bg-soft p-3"><div className="flex justify-between"><span>Invoice</span><b className="num">{inr(p.invoice)}</b></div><div className="mt-1 flex justify-between"><span>You receive (85%)</span><b className="num">{inr(p.invoice * 0.85)}</b></div><div className="mt-1 flex justify-between text-ink-2"><span>Fee</span><span>1.2% per month · Udyam Working Capital</span></div></div>
          <Btn variant="pine" onClick={() => { toast("Offer accepted. Funds 2 days after GRN."); setOffer(false); }}>Accept offer</Btn>
        </div>
      </Modal>
    </>
  );
}
