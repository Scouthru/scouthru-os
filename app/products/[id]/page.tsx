"use client";

import Link from "next/link";
import { use, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Btn, Field, Modal, Pill, TINT } from "@/components/ui";
import { MarketFooter, MarketHeader } from "@/components/market";
import { fmt, inr, useStore } from "@/lib/store";
import { dayLabel } from "@/lib/seed";
import { notify } from "@/lib/ops";
import { cn } from "@/lib/cn";

const VIEWS = [
  { zoom: 1, origin: "center" },
  { zoom: 1.35, origin: "center" },
  { zoom: 1.6, origin: "30% 40%" },
  { zoom: 1.6, origin: "70% 60%" },
];

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { s, update, toast } = useStore();
  const router = useRouter();
  const p = s.products.find((x) => x.id === id);
  const [pick, setPick] = useState<Record<string, string>>(() => Object.fromEntries((p?.options ?? []).map((o) => [o.label, o.values[Math.min(1, o.values.length - 1)] ?? o.values[0]])));
  const [thumb, setThumb] = useState(0);
  const [modal, setModal] = useState<null | "order" | "sample" | "enquiry">(null);
  const [qty, setQty] = useState(p ? String(p.moq * 5) : "");
  if (!p) notFound();
  const unit = s.units.find((u) => u.code === p.unit);
  const n = parseInt(qty.replace(/\D/g, ""), 10) || 0;
  const tier = [...p.tiers].reverse().find((t) => n >= t.min) ?? p.tiers[0];
  const sampled = s.samples.some((x) => x.productId === p.id);

  function placeOrder() {
    if (n < p!.moq) return;
    let newId = "";
    update((d) => {
      newId = `SO-${1050 + d.orders.length}`;
      const base = d.orders.find((o) => o.id === "SO-1043")!;
      d.orders.unshift({
        ...structuredClone(base),
        id: newId, product: `${p!.name}${pick["Flavour"] ? ` · ${pick["Flavour"]}` : ""}`, qty: n, uom: "units", factoryId: p!.unit, factory: unit?.name ?? `Unit ${p!.unit}`, factoryCity: unit?.city ?? "",
        stage: "agreed", progress: 8, health: "On track", next: "Pay 20% advance on e-sign", due: dayLabel(1), unitPrice: tier.price, frozenTill: dayLabel(15), deliverBy: dayLabel(28), proofs: [], changes: [], split: { inhouse: n, partner: 0 }, chat: [],
      });
      d.actions.unshift({ id: `a-${newId}`, kind: "Pay", title: `Advance 20% for ${newId}`, detail: `Scouthru Assured · ${inr(n * tier.price * 0.2)} · on e-sign`, cta: "Pay now", orderId: newId, tone: "blush" });
    });
    toast(`Order placed with Scouthru Assured. Price frozen till ${dayLabel(15)}.`);
    setModal(null);
    setTimeout(() => router.push(`/brand/orders/${newId}`), 300);
  }

  return (
    <div className="min-h-dvh">
      <MarketHeader compact />
      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <nav className="text-[13px] text-ink-2" aria-label="Breadcrumb">
          <Link href="/marketplace" className="underline">Marketplace</Link> / <Link href={`/marketplace?c=${p.category}#ready`} className="underline">{p.categoryLabel}</Link> / <span>{p.name}</span>
        </nav>

        <div className="mt-5 grid gap-8 lg:grid-cols-2">
          <div>
            <div className={cn("aspect-[4/3] overflow-hidden rounded-[14px]", TINT[p.tint])}>
              <img src={`/products/${p.id}.jpg`} alt={p.name} className="size-full object-cover transition-transform duration-300" style={{ transform: `scale(${VIEWS[thumb].zoom})`, transformOrigin: VIEWS[thumb].origin }} />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {VIEWS.map((v, i) => (
                <button key={i} onClick={() => setThumb(i)} aria-label={`View ${i + 1}`} className={cn("h-16 overflow-hidden rounded-lg", TINT[p.tint], thumb === i && "ring-2 ring-ink")}>
                  <img src={`/products/${p.id}.jpg`} alt="" className="size-full object-cover" style={{ transform: `scale(${v.zoom})`, transformOrigin: v.origin }} />
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-ink-3">Representative photo. Your pack follows your own artwork.</p>
          </div>

          <div>
            <div className="flex flex-wrap gap-1.5">
              <Pill tone="ok">Verified unit</Pill>
              <Pill>White-label ready</Pill>
              <Pill>Formula customisable</Pill>
            </div>
            <h1 className="disp mt-3 text-[34px] leading-tight">{p.name}</h1>
            <p className="mt-2 text-[15px] text-ink-2">{p.desc}</p>

            <div className="mt-5 overflow-hidden rounded-[10px] border border-line bg-white">
              <table className="w-full">
                <thead className="bg-soft/60">
                  <tr><th className="th">Quantity</th><th className="th">Price / unit</th><th className="th">Lead time</th></tr>
                </thead>
                <tbody>
                  {p.tiers.map((t) => (
                    <tr key={t.range} className={cn(t === tier && "bg-peach/40")}>
                      <td className="td">{t.range}</td>
                      <td className="td font-semibold">₹{t.price}</td>
                      <td className="td">{t.lead}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {p.options.map((o) => (
              <div key={o.label} className="mt-4">
                <p className="text-[13px] font-semibold">{o.label}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {o.values.map((v) => (
                    <button key={v} onClick={() => setPick({ ...pick, [o.label]: v })} className={cn("h-9 rounded-full border px-4 text-[13px] font-medium", pick[o.label] === v ? "border-pine bg-pine text-white" : "border-line-2 bg-white hover:border-ink")}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-5 grid gap-2">
              <Btn variant="flame" size="lg" onClick={() => setModal("order")}>Order with Scouthru Assured</Btn>
              <div className="grid grid-cols-2 gap-2">
                <Btn size="lg" onClick={() => setModal("sample")} disabled={sampled}>{sampled ? "Sample requested" : "Request sample"}</Btn>
                <Btn size="lg" onClick={() => setModal("enquiry")}>Send enquiry</Btn>
              </div>
            </div>
            <p className="mt-2 text-[12px] text-ink-2">Quote frozen for 15 days once accepted. Payment held in escrow by milestone.</p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <div className="card p-6">
            <h2 className="disp text-[18px]">Specifications</h2>
            <dl className="mt-3 divide-y divide-line text-[14px]">
              {p.specs.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-2.5"><dt className="text-ink-2">{k}</dt><dd className="text-right">{v}</dd></div>
              ))}
            </dl>
          </div>
          <div className="card p-6">
            <h2 className="disp text-[18px]">What&apos;s included</h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-[14px]">
              {p.included.map((i) => (
                <li key={i} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" />{i}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[14px] bg-pine p-5 text-white">
            <p className="monocap text-apricot">Made by</p>
            <p className="disp mt-2 text-[24px]">{sampled ? unit?.name : `Unit ${p.unit}`}</p>
            <p className="mt-1 text-[14px] text-white/80">{unit?.city} · {unit?.licences.join(", ")} · visited by Scouthru</p>
            <p className="mt-2 text-[13px] text-white/70">{sampled ? "Name shared because you requested a sample." : "Name shared once you request a sample or place an order."}</p>
            <div className="mt-4 h-1.5 rounded-full bg-white/15"><div className="h-full rounded-full bg-apricot" style={{ width: `${unit?.booked ?? 0}%` }} /></div>
            <p className="mt-1.5 text-[12px] text-white/75">{unit?.booked}% booked this quarter</p>
          </div>
        </div>
      </main>
      <MarketFooter />

      <Modal open={modal === "order"} onClose={() => setModal(null)} title="Order with Scouthru Assured">
        <div className="flex flex-col gap-3.5 text-[14px]">
          <p className="text-ink-2">{p.name} · {Object.values(pick).join(" · ")}</p>
          <Field label="Quantity (units)" hint={`Minimum ${fmt(p.moq)}`}>
            <input className="input" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <div className="rounded-[10px] bg-soft p-3">
            <div className="flex justify-between"><span>Price per unit</span><b>₹{tier.price}</b></div>
            <div className="mt-1 flex justify-between"><span>Order value</span><b className="num">{inr(n * tier.price)}</b></div>
            <div className="mt-1 flex justify-between text-ink-2"><span>Advance on e-sign (20%)</span><span className="num">{inr(n * tier.price * 0.2)}</span></div>
            <div className="mt-1 flex justify-between text-ink-2"><span>Lead time</span><span>{tier.lead}</span></div>
          </div>
          <ul className="text-[13px] text-ink-2">
            <li>· Price frozen for 15 days · paid in 4 milestones, each released on verified proof</li>
            <li>· QC against your approved sample · 7-day complaint window after delivery</li>
          </ul>
          {n < p.moq && <p className="text-[13px] text-bad">Minimum order is {fmt(p.moq)} units.</p>}
          <Btn variant="flame" size="lg" onClick={placeOrder} disabled={n < p.moq}>Place order · {inr(n * tier.price)}</Btn>
        </div>
      </Modal>

      <Modal open={modal === "sample"} onClose={() => setModal(null)} title="Request a sample">
        <div className="flex flex-col gap-3 text-[14px]">
          <p>3 samples of <b>{p.name}</b> ({Object.values(pick).join(", ")}) dispatched from {unit?.city} in 4–6 working days.</p>
          <p className="text-ink-2">Sample fee ₹1,500, adjusted against your first order. The factory name is shared once you confirm.</p>
          <Btn variant="pine" size="lg" onClick={() => { update((d) => { d.samples.push({ productId: p.id, at: new Date().toISOString() }); if (!d.connected.includes(p.unit)) d.connected.push(p.unit); notify(d, "factory", `Sample requested: ${p.name}`, "/factory"); }); toast(`Sample requested. Factory revealed: ${unit?.name}`); setModal(null); }}>Confirm sample request</Btn>
        </div>
      </Modal>

      <Modal open={modal === "enquiry"} onClose={() => setModal(null)} title="Send enquiry">
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); update((d) => { d.enquiries.unshift({ id: `e-${Date.now()}`, product: p.name, source: "Scouthru", moq: n || p.moq, neededBy: dayLabel(30), region: "Hyderabad", fit: "Fits", buyer: "Ruchika Foods", receivedHoursAgo: 0, status: "new", notes: (e.currentTarget.elements.namedItem("msg") as HTMLTextAreaElement).value }); }); toast("Enquiry sent. The factory replies within 24 hours."); setModal(null); }}>
          <Field label="Quantity"><input className="input" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Message"><textarea name="msg" className="input h-24 py-2" defaultValue={`Interested in ${p.name}, ${Object.values(pick).join(", ")}. Please confirm lead time.`} /></Field>
          <Btn variant="pine" size="lg" type="submit">Send enquiry</Btn>
          <p className="text-[12px] text-ink-3">Your number stays masked until you choose to share it.</p>
        </form>
      </Modal>
    </div>
  );
}

