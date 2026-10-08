"use client";

import Link from "next/link";
import { use, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, Check, FlaskConical, MessageSquare, ShieldCheck } from "lucide-react";
import { Btn, Field, Modal, Pill, inputCls, textareaCls } from "@/components/console/kit";
import { MarketFooter, MarketHeader } from "@/components/console/market";
import { useStore } from "@/lib/store";
import { useConsole } from "@/lib/console/store";
import { assuredOrder, catalogImg, marketEnquiry, marketSample, unitMfrId } from "@/lib/console/actions-market";
import { fmtNum, inr } from "@/lib/console/format";
import { cn } from "@/lib/cn";

const VIEWS = [
  { zoom: 1, origin: "center" },
  { zoom: 1.35, origin: "center" },
  { zoom: 1.6, origin: "30% 40%" },
  { zoom: 1.6, origin: "70% 60%" },
];

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { s } = useStore();
  const { s: cs, update, toast } = useConsole();
  const router = useRouter();
  const p = s.products.find((x) => x.id === id);
  const [pick, setPick] = useState<Record<string, string>>(() => Object.fromEntries((p?.options ?? []).map((o) => [o.label, o.values[Math.min(1, o.values.length - 1)] ?? o.values[0]])));
  const [thumb, setThumb] = useState(0);
  const [modal, setModal] = useState<null | "order" | "sample" | "enquiry">(null);
  const [qty, setQty] = useState(p ? String(p.moq * 5) : "");
  const [dest, setDest] = useState("Hyderabad, India");
  const [msg, setMsg] = useState("");
  if (!p) notFound();
  const unit = s.units.find((u) => u.code === p.unit);
  const n = parseInt(qty.replace(/\D/g, ""), 10) || 0;
  const tier = [...p.tiers].reverse().find((t) => n >= t.min) ?? p.tiers[0];
  const options = Object.entries(pick).map(([k, v]) => `${k}: ${v}`).join(", ");
  const mfrId = unit ? unitMfrId(unit.code) : "";
  const revealed = cs.manufacturers.some((m) => m.id === mfrId);
  const sample = cs.samples.find((x) => x.name === p.name && x.mfrId === mfrId);
  const order = cs.orders.find((o) => o.name === p.name && o.mfrId === mfrId);

  function placeOrder() {
    if (!unit || n < p!.moq) return;
    let orderId = "";
    update((d) => { orderId = assuredOrder(d, p!, unit, n, tier.price, options, dest); });
    toast(`Order ${orderId} placed with Scouthru Assured`);
    setModal(null);
    router.push(`/console/production?id=${orderId}`);
  }

  return (
    <div className="min-h-dvh">
      <MarketHeader compact />
      <main className="mx-auto max-w-[1240px] px-4 py-[22px] sm:px-6">
        <nav className="flex flex-wrap items-center gap-[8px] text-[12.5px] text-cs-ink-2" aria-label="Breadcrumb">
          <Link href="/marketplace" className="hover:text-cs-green">Marketplace</Link><span>›</span>
          <Link href={`/marketplace?c=${p.category}#ready`} className="hover:text-cs-green">{p.categoryLabel}</Link><span>›</span>
          <span className="text-[#151816]">{p.name}</span>
        </nav>

        <div className="mt-[18px] grid gap-[28px] lg:grid-cols-2">
          <div>
            <div className="aspect-[4/3] overflow-hidden rounded-[12px] border border-cs-line bg-cs-cream">
              <img src={catalogImg(p)} alt={p.name} className="size-full object-cover transition-transform duration-300" style={{ transform: `scale(${VIEWS[thumb].zoom})`, transformOrigin: VIEWS[thumb].origin }} />
            </div>
            <div className="mt-[10px] grid grid-cols-4 gap-[10px]">
              {VIEWS.map((v, i) => (
                <button type="button" key={i} onClick={() => setThumb(i)} aria-label={`View ${i + 1}`} className={cn("h-[66px] overflow-hidden rounded-[8px] border bg-cs-cream", thumb === i ? "border-cs-green ring-1 ring-cs-green" : "border-cs-line")}>
                  <img src={catalogImg(p)} alt="" className="size-full object-cover" style={{ transform: `scale(${v.zoom})`, transformOrigin: v.origin }} />
                </button>
              ))}
            </div>
            <p className="mt-[8px] text-[11.5px] text-cs-ink-2">Representative photo. Your pack follows your own artwork.</p>
          </div>

          <div>
            <div className="flex flex-wrap gap-[6px]">
              <Pill tone="green"><BadgeCheck className="size-[12px]" />Verified unit</Pill>
              <Pill tone="gray">White-label ready</Pill>
              <Pill tone="gray">Formula customisable</Pill>
            </div>
            <h1 className="serif mt-[12px] text-[40px] font-semibold leading-[1.05] tracking-[-0.02em]">{p.name}</h1>
            <p className="mt-[8px] text-[15px] leading-[1.45] text-[#3e4440]">{p.desc}</p>

            <div className="mt-[18px] overflow-hidden rounded-[10px] border border-cs-line bg-white">
              <table className="w-full text-[13.5px]">
                <thead className="bg-[#f7f5f0] text-left text-[11.5px] font-semibold uppercase tracking-[0.05em] text-cs-ink-2">
                  <tr><th className="px-[14px] py-[9px]">Quantity</th><th className="px-[14px] py-[9px]">Price / unit</th><th className="px-[14px] py-[9px]">Lead time</th></tr>
                </thead>
                <tbody>
                  {p.tiers.map((t) => (
                    <tr key={t.range} className={cn("border-t border-cs-line", t === tier && "bg-cs-mint/70")}>
                      <td className="px-[14px] py-[10px]">{t.range}</td>
                      <td className="px-[14px] py-[10px] font-semibold">₹{t.price}</td>
                      <td className="px-[14px] py-[10px]">{t.lead}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {p.options.map((o) => (
              <div key={o.label} className="mt-[14px]">
                <p className="text-[12.5px] font-semibold">{o.label}</p>
                <div className="mt-[7px] flex flex-wrap gap-[7px]">
                  {o.values.map((v) => (
                    <button type="button" key={v} onClick={() => setPick({ ...pick, [o.label]: v })} className={cn("h-[34px] rounded-full border px-[14px] text-[12.5px] font-medium", pick[o.label] === v ? "border-cs-green bg-cs-green text-white" : "border-cs-line bg-white hover:border-[#9aa19c]")}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-[18px] grid gap-[8px]">
              {order ? (
                <Link href={`/console/production?id=${order.id}`} className="inline-flex h-[46px] items-center justify-center gap-[8px] rounded-[7px] bg-cs-green text-[14px] font-medium text-white">Track order {order.id} in Scouthru OS <ArrowRight className="size-[16px]" /></Link>
              ) : (
                <Btn kind="primary" icon={ShieldCheck} className="h-[46px] text-[14px]" onClick={() => setModal("order")}>Order with Scouthru Assured</Btn>
              )}
              <div className="grid grid-cols-2 gap-[8px]">
                {sample ? (
                  <Link href={`/console/samples?id=${sample.id}`} className="inline-flex h-[44px] items-center justify-center gap-[8px] rounded-[7px] border border-[#cfd2cd] bg-white text-[13px] font-medium">Sample {sample.id} · {sample.status}</Link>
                ) : (
                  <Btn icon={FlaskConical} className="h-[44px]" onClick={() => setModal("sample")}>Request sample</Btn>
                )}
                <Btn icon={MessageSquare} className="h-[44px]" onClick={() => { setMsg(`Interested in ${p.name} (${options}). Please confirm price and lead time.`); setModal("enquiry"); }}>Send enquiry</Btn>
              </div>
            </div>
            <p className="mt-[8px] text-[11.5px] text-cs-ink-2">Quote frozen for 15 days once accepted. Payment held in escrow by milestone.</p>
          </div>
        </div>

        <div className="mt-[34px] grid gap-[14px] lg:grid-cols-3">
          <div className="cs-card p-[20px]">
            <h2 className="serif text-[21px] font-semibold">Specifications</h2>
            <dl className="mt-[8px] divide-y divide-cs-line text-[13.5px]">
              {p.specs.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-[9px]"><dt className="text-cs-ink-2">{k}</dt><dd className="text-right">{v}</dd></div>
              ))}
            </dl>
          </div>
          <div className="cs-card p-[20px]">
            <h2 className="serif text-[21px] font-semibold">What&apos;s included</h2>
            <ul className="mt-[8px] divide-y divide-cs-line text-[13.5px]">
              {p.included.map((i) => <li key={i} className="flex gap-[8px] py-[9px]"><Check className="mt-[2px] size-[16px] shrink-0 text-cs-green-2" />{i}</li>)}
            </ul>
          </div>
          <div className="rounded-[12px] bg-cs-deep p-[20px] text-white">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-white/70">MADE BY</p>
            <p className="serif mt-[8px] text-[26px] font-semibold">{revealed ? unit?.name : `Unit ${p.unit}`}</p>
            <p className="mt-[4px] text-[13.5px] text-white/80">{unit?.city} · {unit?.licences.join(", ")} · visited by Scouthru</p>
            <p className="mt-[8px] text-[12.5px] text-white/70">{revealed ? "Name shared because you connected with this unit." : "Name shared once you request a sample or place an order."}</p>
            <div className="mt-[14px] h-[6px] rounded-full bg-white/15"><div className="h-full rounded-full bg-[#f2c4ad]" style={{ width: `${unit?.booked ?? 0}%` }} /></div>
            <p className="mt-[6px] text-[11.5px] text-white/75">{unit?.booked}% booked this quarter</p>
            {revealed && <Link href={`/console/manufacturers?id=${mfrId}`} className="mt-[12px] inline-flex items-center gap-[6px] text-[12.5px] font-medium text-white hover:underline">Open in Scouthru OS <ArrowRight className="size-[14px]" /></Link>}
          </div>
        </div>
      </main>
      <MarketFooter />

      <Modal open={modal === "order"} onClose={() => setModal(null)} title="Order with Scouthru Assured" sub={`${p.name} · ${Object.values(pick).join(" · ")}`}>
        <div className="space-y-[12px] text-[13.5px]">
          <Field label="Quantity (units)" hint={`Minimum ${fmtNum(p.moq)}`}><input className={inputCls} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Deliver to"><input className={inputCls} value={dest} onChange={(e) => setDest(e.target.value)} /></Field>
          <div className="rounded-[9px] bg-[#f5f3ee] p-[12px]">
            <div className="flex justify-between"><span>Price per unit</span><b>₹{tier.price}</b></div>
            <div className="mt-[4px] flex justify-between"><span>Order value</span><b>{inr(n * tier.price)}</b></div>
            <div className="mt-[4px] flex justify-between text-cs-ink-2"><span>Advance (30%)</span><span>{inr(n * tier.price * 0.3)}</span></div>
            <div className="mt-[4px] flex justify-between text-cs-ink-2"><span>Lead time</span><span>{tier.lead}</span></div>
          </div>
          <ul className="space-y-[2px] text-[12.5px] text-cs-ink-2">
            <li>· Price frozen for 15 days · paid in 4 milestones, each released on verified proof</li>
            <li>· QC against the approved golden sample · 7-day complaint window after delivery</li>
          </ul>
          {n < p.moq && <p className="text-[12.5px] text-cs-red">Minimum order is {fmtNum(p.moq)} units.</p>}
          <Btn kind="primary" className="w-full" onClick={placeOrder} disabled={n < p.moq || !dest.trim()}>Place order · {inr(n * tier.price)}</Btn>
        </div>
      </Modal>

      <Modal open={modal === "sample"} onClose={() => setModal(null)} title="Request a sample">
        <div className="space-y-[12px] text-[13.5px]">
          <p>3 samples of <b>{p.name}</b> ({Object.values(pick).join(", ")}) dispatched from {unit?.city} in 4–6 working days.</p>
          <p className="text-cs-ink-2">Sample fee ₹1,500, adjusted against your first order. The factory name is shared once you confirm, and the sample shows on your Samples screen.</p>
          <Btn kind="primary" icon={FlaskConical} className="w-full" onClick={() => {
            if (!unit) return;
            let smp = "";
            update((d) => { smp = marketSample(d, p, unit, options).sampleId; });
            toast(`Sample ${smp} requested. Factory revealed: ${unit.name}`);
            setModal(null);
          }}>Confirm sample request</Btn>
        </div>
      </Modal>

      <Modal open={modal === "enquiry"} onClose={() => setModal(null)} title="Send enquiry" sub="Your number stays masked until you choose to share it.">
        <form className="space-y-[12px]" onSubmit={(e) => {
          e.preventDefault();
          let enq = "";
          update((d) => { enq = marketEnquiry(d, { name: p.name, categoryId: p.category, img: catalogImg(p), qty: n || p.moq, message: msg, unit }); });
          toast(`Enquiry ${enq} sent. The factory replies within 24 hours.`);
          setModal(null);
        }}>
          <Field label="Quantity (units)"><input className={inputCls} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Message"><textarea className={cn(textareaCls, "h-[96px]")} value={msg} onChange={(e) => setMsg(e.target.value)} required /></Field>
          <Btn kind="primary" type="submit" className="w-full">Send enquiry</Btn>
        </form>
      </Modal>
    </div>
  );
}
