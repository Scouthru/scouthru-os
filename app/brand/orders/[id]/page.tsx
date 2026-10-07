"use client";

import Link from "next/link";
import { use, useState } from "react";
import { notFound } from "next/navigation";
import { Lock, MessageCircle, Phone } from "lucide-react";
import { DeskHeader, Panel } from "@/components/desk";
import { Bar, Btn, Field, Modal, Pill, Steps } from "@/components/ui";
import { HEALTH_TONE } from "@/components/brand";
import { OrderGlance, OrderRelated } from "@/components/order";
import { fmt, inr, useStore } from "@/lib/store";
import { FACTORY_ID, ORDER_STEPS, decideChange, notify, openCase, payAmount, payNext, stepIndex } from "@/lib/ops";
import { shortHash } from "@/lib/sha256";
import type { Pay } from "@/lib/types";
import { cn } from "@/lib/cn";

const PAY_PILL: Record<Pay, { t: string; tone: "ok" | "warn" | "neutral" | "info" }> = {
  paid: { t: "Paid", tone: "ok" },
  due: { t: "Due on proof", tone: "warn" },
  proof: { t: "Due on proof", tone: "warn" },
  later: { t: "Later", tone: "neutral" },
};

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { s, update, toast, ready } = useStore();
  const o = s.orders.find((x) => x.id === id);
  const [msg, setMsg] = useState("");
  const [modal, setModal] = useState<null | "credit" | "dispute" | "call" | "change">(null);
  if (!o) {
    if (!ready) return <p className="p-6 text-[14px] text-ink-2">Loading…</p>;
    notFound();
  }

  const due = o.payments.find((p) => p.status === "due");
  const total = o.split.inhouse + o.split.partner || 1;

  return (
    <>
      <DeskHeader
        back={{ href: "/brand/orders", label: "Orders" }}
        title={o.id}
        badge={<Pill tone={HEALTH_TONE[o.health]}>{o.health}</Pill>}
        sub={`${o.product} · ${fmt(o.qty)} ${o.uom} · ${o.factory}${o.factoryCity ? `, ${o.factoryCity}` : ""} · Delivery ${o.deliverBy}`}
        actions={
          <>
            <Btn onClick={() => setModal("call")}><Phone className="size-4" />Call factory</Btn>
            <Btn href="#chat"><MessageCircle className="size-4" />Open WhatsApp thread</Btn>
          </>
        }
      />
      {o.stage !== "enquiry" ? <Steps steps={ORDER_STEPS} at={stepIndex(o)} tone="pine" /> : <div className="card p-4 text-[14px]">Enquiry stage: factories are quoting. <Link href="/brand" className="font-semibold underline">Compare on the control tower</Link>.</div>}
      <OrderGlance o={o} />

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.65fr_1fr]">
        <div className="flex flex-col gap-5">
          <Panel title="Production phases">
            <ul className="divide-y divide-line">
              {o.phases.map((p) => (
                <li key={p.name} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-[15px] font-semibold">{p.name}
                        <Pill tone={p.status === "done" ? "ok" : p.status === "active" ? "info" : "neutral"}>{p.status === "done" ? "Done" : p.status === "active" ? `${p.pct}%` : "Not started"}</Pill>
                      </p>
                      <p className="text-[13px] text-ink-2">{p.detail}</p>
                    </div>
                    <div className="text-right">
                      <p className="num text-[14px]">{p.payPct}% · {inr(payAmount(o, p.payPct))}</p>
                      <p className="text-[12px] text-ink-2">{p.payNote}</p>
                    </div>
                  </div>
                  <Bar value={p.pct} tone="pine" className="mt-2.5" />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Proof feed" right={<span className="inline-flex items-center gap-1 rounded-full bg-soft px-2.5 py-1 text-[12px]"><Lock className="size-3" />Tamper-proof log</span>}>
            <ul className="divide-y divide-line">
              {o.proofs.map((p) => (
                <li key={p.id} className="flex gap-4 py-3">
                  {p.image ? <img src={p.image} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" /> : <div className="hatch flex h-20 w-28 shrink-0 items-end rounded-lg p-1.5 text-[11px] text-ink-2">{p.kind}</div>}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2"><p className="text-[14px] font-semibold">{p.title}</p><span className="shrink-0 text-[12px] text-ink-2">{p.at}</span></div>
                    <p className="text-[13px] text-ink-2">{p.detail}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5"><Pill tone="ok">Verified by Scouthru</Pill><span className="num rounded-full bg-soft px-2 py-0.5 text-[11px]" title={p.hash}>{shortHash(p.hash)}</span></div>
                  </div>
                </li>
              ))}
              {o.proofs.length === 0 && <li className="py-3 text-[13px] text-ink-2">No proof uploaded yet. The factory adds photos at each phase.</li>}
            </ul>
          </Panel>

          <Panel title="Change requests" right={<button onClick={() => setModal("change")} className="font-semibold text-ink underline">+ Request a change</button>}>
            <ul className="divide-y divide-line">
              {o.changes.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div><p className="text-[14px] font-medium">{c.text}</p><p className="text-[12px] text-ink-2">{c.note}</p></div>
                  {c.status === "Awaiting you" ? (
                    <div className="flex gap-2">
                      <Btn size="sm" onClick={() => { update((d) => decideChange(d, o.id, c.id, false)); toast("Change rejected. Factory notified."); }}>Reject</Btn>
                      <Btn size="sm" variant="pine" onClick={() => { update((d) => decideChange(d, o.id, c.id, true)); toast("Change approved. Unpaid milestones re-priced."); }}>Approve</Btn>
                    </div>
                  ) : <Pill tone={c.status === "Approved" ? "ok" : c.status === "Rejected" ? "neutral" : "warn"}>{c.status}</Pill>}
                </li>
              ))}
              {o.changes.length === 0 && <li className="py-2.5 text-[13px] text-ink-2">No change requests. Any price change needs a reason and your approval.</li>}
            </ul>
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel title="Payments" right="Released only on verified proof">
            <ul className="divide-y divide-line">
              {o.payments.map((p) => (
                <li key={p.label} className="flex items-center justify-between py-2.5">
                  <div><p className="text-[14px] font-medium">{p.label}</p><p className="num text-[12px] text-ink-2">{inr(payAmount(o, p.pct))}</p></div>
                  <Pill tone={PAY_PILL[p.status].tone}>{PAY_PILL[p.status].t}</Pill>
                </li>
              ))}
            </ul>
            <Btn variant="pine" size="lg" className="mt-3 w-full" disabled={!due} onClick={() => { let m: string | null = null; update((d) => { m = payNext(d, o.id); }); setTimeout(() => toast(m ?? "Paid"), 0); }}>
              {due ? `Pay ${due.pct}% now · ${inr(payAmount(o, due.pct))}` : "Nothing due right now"}
            </Btn>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Btn size="sm" onClick={() => setModal("credit")}>Convert to credit</Btn>
              <Btn size="sm" onClick={() => setModal("dispute")}>Raise dispute</Btn>
            </div>
          </Panel>

          <OrderRelated o={o} role="brand" />

          <Panel title="Who's making it">
            <div className="flex h-2 overflow-hidden rounded-full bg-soft"><span className="bg-pine" style={{ width: `${(o.split.inhouse / total) * 100}%` }} /><span className="bg-apricot" style={{ width: `${(o.split.partner / total) * 100}%` }} /></div>
            <div className="mt-3 flex justify-between text-[13px]"><span>{o.factory} in-house</span><span className="num">{fmt(o.split.inhouse)}</span></div>
            {o.split.partner > 0 && <div className="mt-1 flex justify-between text-[13px]"><span>{o.split.partnerName}</span><span className="num">{fmt(o.split.partner)}</span></div>}
          </Panel>

          <Panel title="WhatsApp, synced" right={<Pill tone="ok">Live</Pill>} className="scroll-mt-4">
            <div id="chat" className="flex flex-col gap-2">
              {o.chat.map((c, i) => (
                <div key={i} className={cn("max-w-[85%] rounded-lg px-3 py-2 text-[13px]", c.from === "factory" ? "self-start bg-soft" : "self-end bg-peach")}>
                  <p>{c.text}</p><p className="mt-0.5 text-[11px] text-ink-2">{c.at}</p>
                </div>
              ))}
              {o.chat.length === 0 && <p className="text-[13px] text-ink-2">Messages from your WhatsApp thread with the factory appear here.</p>}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!msg.trim()) return; update((d) => { d.orders.find((x) => x.id === o.id)!.chat.push({ from: "brand", text: msg, at: `You · ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` }); if (o.factoryId === FACTORY_ID) notify(d, "factory", `New message from Ruchika Foods on ${o.id}`, `/factory/orders/${o.id}`); }); setMsg(""); }}>
              <input className="input h-10" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message the factory" />
              <Btn variant="pine" type="submit" disabled={!msg.trim()}>Send</Btn>
            </form>
          </Panel>

          <Panel title="Documents">
            <ul className="divide-y divide-line">
              {o.docs.map((d) => (
                <li key={d.name} className="flex justify-between py-2.5 text-[14px]">
                  <button className="text-left font-medium text-ink hover:text-flame" onClick={() => toast(`${d.name} opened (demo file)`)}>{d.name}</button>
                  <span className="text-[12px] text-ink-2">{d.meta}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Modal open={modal === "call"} onClose={() => setModal(null)} title={`Call ${o.factory}`}>
        <p className="text-[14px]">Scouthru connects you through a masked number, so neither side&apos;s personal number is shared.</p>
        <p className="num mt-3 rounded-[10px] bg-soft p-3 text-[18px]">+91 40 4520 •••• · ext {o.id.slice(3)}</p>
        <Btn variant="pine" className="mt-3 w-full" onClick={() => { toast("Calling via masked number…"); setModal(null); }}>Call now</Btn>
      </Modal>
      <Modal open={modal === "credit"} onClose={() => setModal(null)} title="Convert a missed milestone to credit">
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); update((d) => { const x = d.orders.find((y) => y.id === o.id)!; x.changes.unshift({ id: `cr${Date.now()}`, text: `Credit of ₹${fd.get("amt")} against next payment`, note: String(fd.get("why")), status: "Awaiting factory", by: "brand" }); openCase(d, { kind: "Credit request", title: `${o.id} · credit ₹${fd.get("amt")}`, detail: String(fd.get("why")), from: "Ruchika Foods", orderId: o.id }); }); toast("Credit request sent. Scouthru records it on the log."); setModal(null); }}>
          <Field label="Credit amount (₹)"><input name="amt" className="input" inputMode="numeric" required /></Field>
          <Field label="What was missed"><input name="why" className="input" required placeholder="e.g. Phase 2 delayed 3 days" /></Field>
          <Btn variant="pine" type="submit">Send credit request</Btn>
        </form>
      </Modal>
      <Modal open={modal === "dispute"} onClose={() => setModal(null)} title="Raise a dispute">
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); update((d) => { const x = d.orders.find((y) => y.id === o.id)!; x.health = "Action"; const why = String(new FormData(e.currentTarget).get("why")); x.changes.unshift({ id: `dp${Date.now()}`, text: "Dispute raised · Scouthru mediating", note: why, status: "Awaiting factory", by: "brand" }); openCase(d, { kind: "Dispute", title: `${o.id} · ${o.product}`, detail: why, from: "Ruchika Foods", orderId: o.id }); }); toast("Dispute raised. A Scouthru case manager will call within 4 hours."); setModal(null); }}>
          <Field label="What happened"><textarea name="why" className="input h-24 py-2" required /></Field>
          <Btn variant="flame" type="submit">Raise dispute</Btn>
        </form>
      </Modal>
      <Modal open={modal === "change"} onClose={() => setModal(null)} title="Request a change">
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); const t = String(new FormData(e.currentTarget).get("what")); update((d) => { d.orders.find((y) => y.id === o.id)!.changes.unshift({ id: `c${Date.now()}`, text: `Your request: ${t}`, note: "Raised today · factory approval needed", status: "Awaiting factory", by: "brand" }); }); toast("Change request sent to the factory"); setModal(null); }}>
          <Field label="What should change"><input name="what" className="input" required placeholder="e.g. label artwork v4 → v5" /></Field>
          <Btn variant="pine" type="submit">Send request</Btn>
        </form>
      </Modal>
    </>
  );
}
