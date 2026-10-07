"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { DeskHeader, Panel } from "@/components/desk";
import { Bar, Btn, Field, Modal, Pill, Steps } from "@/components/ui";
import { HEALTH_TONE } from "@/components/brand";
import { UploadProof } from "@/components/factory";
import { OrderGlance, OrderRelated } from "@/components/order";
import { PO_TONE } from "@/components/supplier";
import { fmt, inr, useStore } from "@/lib/store";
import { BRAND_NAME, ORDER_STEPS, factoryPriceChange, notify, payAmount, stepIndex } from "@/lib/ops";
import { shortHash } from "@/lib/sha256";
import { cn } from "@/lib/cn";

export default function FactoryOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { s, update, toast, ready } = useStore();
  const [modal, setModal] = useState<null | "price">(null);
  const [msg, setMsg] = useState("");
  const o = s.orders.find((x) => x.id === id);
  if (!o) {
    if (!ready) return <p className="p-6 text-[14px] text-ink-2">Loading…</p>;
    notFound();
  }
  const due = o.payments.find((p) => p.status === "due");
  const buyer = BRAND_NAME[o.brandId] ?? o.brandId;
  const pos = s.pos.filter((p) => p.brandOrder === o.id);
  const pendingChange = o.changes.some((c) => c.by === "factory" && c.status === "Awaiting you");

  return (
    <>
      <DeskHeader
        back={{ href: "/factory/orders", label: "Orders" }}
        title={o.id}
        badge={<Pill tone={HEALTH_TONE[o.health]}>{o.health}</Pill>}
        sub={`${o.product} · ${fmt(o.qty)} ${o.uom} · for ${buyer} · Delivery ${o.deliverBy}`}
        actions={<><Btn onClick={() => setModal("price")} disabled={pendingChange || o.stage === "closed"}>Request price change</Btn><UploadProof o={o} /></>}
      />
      <Steps steps={ORDER_STEPS} at={stepIndex(o)} tone="pine" />
      <OrderGlance o={o} />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-5">
          <Panel title="Production phases">
            {o.phases.map((p) => (
              <div key={p.name} className="border-b border-line py-3 last:border-0">
                <div className="flex justify-between gap-3"><p className="text-[14px] font-semibold">{p.name}</p><Pill tone={p.status === "done" ? "ok" : p.status === "active" ? "info" : "neutral"}>{p.status === "done" ? "Done" : p.status === "active" ? `${p.pct}%` : "Not started"}</Pill></div>
                <p className="text-[13px] text-ink-2">{p.detail}</p>
                <Bar value={p.pct} className="mt-2" />
              </div>
            ))}
          </Panel>

          <Panel title="Proof you've shared" right={<span className="inline-flex items-center gap-1"><Lock className="size-3" />Tamper-proof log</span>}>
            <ul className="divide-y divide-line">
              {o.proofs.map((p) => (
                <li key={p.id} className="flex gap-3 py-3">
                  {p.image ? <img src={p.image} alt="" className="h-16 w-24 rounded-[10px] object-cover" /> : <div className="hatch h-16 w-24 shrink-0 rounded-[10px]" />}
                  <div className="min-w-0"><p className="text-[14px] font-semibold">{p.title}</p><p className="text-[13px] text-ink-2">{p.detail}</p><p className="num mt-1 text-[12px] text-ink-3" title={p.hash}>{p.at} · {shortHash(p.hash)}</p></div>
                </li>
              ))}
              {o.proofs.length === 0 && <li className="py-3 text-[13px] text-ink-2">Upload a photo at each phase; the matching payment unlocks for the buyer.</li>}
            </ul>
          </Panel>

          <Panel title="Materials from suppliers">
            <ul className="divide-y divide-line">
              {pos.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span><b className="text-[14px]">{p.id}</b> · {p.title}<span className="block text-[12px] text-ink-2">Sri Venkateswara Traders · dispatch {p.dispatchBy}</span></span>
                  <Pill tone={PO_TONE[p.stage]}>{p.stage}</Pill>
                </li>
              ))}
              {pos.length === 0 && <li className="py-2.5 text-[13px] text-ink-2">No supplier orders linked to this order yet.</li>}
            </ul>
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel title="Payments" right="Auto reminders on">
            <ul className="divide-y divide-line">
              {o.payments.map((p) => (
                <li key={p.label} className="flex items-center justify-between py-2.5">
                  <div><p className="text-[14px] font-medium">{p.label}</p><p className="num text-[12px] text-ink-2">{inr(payAmount(o, p.pct))}</p></div>
                  <Pill tone={p.status === "paid" ? "ok" : p.status === "due" ? "warn" : "neutral"}>{p.status === "paid" ? "Received" : p.status === "due" ? "Due from buyer" : p.status === "proof" ? "On your proof" : "Later"}</Pill>
                </li>
              ))}
            </ul>
            {due && <Btn size="sm" className="mt-3" onClick={() => { if (o.brandId === "ruchika") update((d) => notify(d, "brand", `Payment reminder from ${o.factory}: ${due.label} on ${o.id}`, `/brand/orders/${o.id}`)); toast(`Reminder sent to ${buyer} on WhatsApp`); }}>Send payment reminder</Btn>}
          </Panel>

          <OrderRelated o={o} role="factory" />

          <Panel title="Change requests">
            <ul className="divide-y divide-line">
              {o.changes.map((c) => (
                <li key={c.id} className="py-2.5">
                  <p className="text-[14px] font-medium">{c.text}</p><p className="text-[12px] text-ink-2">{c.note}</p>
                  {c.status === "Awaiting factory" ? (
                    <div className="mt-2 flex gap-2">
                      <Btn size="sm" variant="pine" onClick={() => { update((d) => { d.orders.find((x) => x.id === o.id)!.changes.find((x) => x.id === c.id)!.status = "Approved"; if (o.brandId === "ruchika") notify(d, "brand", `${o.factory} approved: ${c.text.replace("Your request: ", "")}`, `/brand/orders/${o.id}`); }); toast("Change approved. The buyer is notified."); }}>Approve</Btn>
                      <Btn size="sm" onClick={() => { update((d) => { d.orders.find((x) => x.id === o.id)!.changes.find((x) => x.id === c.id)!.status = "Rejected"; }); toast("Change rejected"); }}>Reject</Btn>
                    </div>
                  ) : <Pill className="mt-1.5" tone={c.status === "Approved" ? "ok" : c.status === "Rejected" ? "neutral" : "warn"}>{c.status === "Awaiting you" ? "Awaiting buyer" : c.status}</Pill>}
                </li>
              ))}
              {o.changes.length === 0 && <li className="py-2 text-[13px] text-ink-2">No changes requested.</li>}
            </ul>
          </Panel>

          <Panel title="WhatsApp, synced" right={<Pill tone="ok">Live</Pill>}>
            <div className="flex flex-col gap-2">
              {o.chat.map((c, i) => (
                <div key={i} className={cn("max-w-[85%] rounded-[10px] px-3 py-2 text-[13px]", c.from === "brand" ? "self-start bg-soft" : "self-end bg-peach")}>
                  <p>{c.text}</p><p className="mt-0.5 text-[11px] text-ink-2">{c.from === "brand" ? c.at.replace("You", buyer) : c.at.replace("Factory", "You")}</p>
                </div>
              ))}
              {o.chat.length === 0 && <p className="text-[13px] text-ink-2">Messages with the buyer appear here.</p>}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!msg.trim()) return; update((d) => { d.orders.find((x) => x.id === o.id)!.chat.push({ from: "factory", text: msg, at: `Factory · ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` }); if (o.brandId === "ruchika") notify(d, "brand", `New message from ${o.factory} on ${o.id}`, `/brand/orders/${o.id}#chat`); }); setMsg(""); }}>
              <input className="input h-10" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={`Message ${buyer}`} />
              <Btn variant="pine" type="submit" disabled={!msg.trim()}>Send</Btn>
            </form>
          </Panel>
        </div>
      </div>

      <Modal open={modal === "price"} onClose={() => setModal(null)} title={`Request a price change · ${o.id}`}>
        <form className="flex flex-col gap-3" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const np = parseFloat(String(f.get("price")));
          const why = String(f.get("why")).trim();
          if (!np || why.length < 8) return;
          update((d) => factoryPriceChange(d, o.id, np, why));
          toast("Sent to the buyer for approval. The quoted price holds until they approve.");
          setModal(null);
        }}>
          <p className="text-[13px] text-ink-2">Current price ₹{o.unitPrice}/unit, frozen till {o.frozenTill}. A change needs a reason and the buyer&apos;s approval, and only affects payments not yet made.</p>
          <Field label="New price per unit (₹)"><input name="price" className="input num" inputMode="decimal" required /></Field>
          <Field label="Reason" hint="e.g. which input cost moved and by how much"><textarea name="why" className="input h-20 py-2" required minLength={8} placeholder="Whey price up 9% since quote; supplier invoice attached" /></Field>
          <Btn variant="pine" type="submit">Send for approval</Btn>
        </form>
      </Modal>

    </>
  );
}
