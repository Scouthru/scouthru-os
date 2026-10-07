"use client";

import { useRef } from "react";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Pill, StageTrack, readFile } from "@/components/ui";
import { fmt, inr, useStore } from "@/lib/store";
import { INBOUND_STEPS, inboundTrack } from "@/lib/ops";
import { cn } from "@/lib/cn";

const PACK_PRICE = 32; // ₹ per pack, demo landed price for the claim value

export default function Receive() {
  const { s, update, toast } = useStore();
  const ref = useRef<HTMLInputElement>(null);
  const g = s.grn;
  // "Received" is good stock counted in; anything invoiced but not received is
  // either damaged (held in the damage bay) or simply short.
  const accepted = g.lines.reduce((a, l) => a + l.received, 0);
  const bad = g.lines.reduce((a, l) => a + Math.max(0, l.invoiced - l.received), 0);
  const damaged = g.lines.reduce((a, l) => a + l.damaged, 0);
  const invoice = g.lines.reduce((a, l) => a + l.invoiced, 0) * PACK_PRICE;
  const claim = bad * PACK_PRICE;
  const setLine = (i: number, k: "received" | "damaged", v: string) => update((d) => { d.grn.lines[i][k] = Math.max(0, parseInt(v.replace(/\D/g, ""), 10) || 0); });
  const result = (l: (typeof g.lines)[number]) => {
    const missing = Math.max(0, l.invoiced - l.received);
    const perCarton = parseInt(l.pack.split("·")[1] ?? "48", 10) || 48;
    if (missing === 0 && l.damaged === 0) return { t: "Match", tone: "ok" as const };
    if (l.damaged >= missing && l.damaged % perCarton === 0) return { t: `${l.damaged / perCarton} carton${l.damaged / perCarton > 1 ? "s" : ""} crushed`, tone: "bad" as const };
    if (l.damaged > 0 && l.damaged < missing) return { t: `Short ${missing - l.damaged} · ${l.damaged} damaged`, tone: "bad" as const };
    return { t: l.damaged ? `Damaged ${l.damaged}` : `Short ${missing}`, tone: "bad" as const };
  };

  return (
    <>
      <DeskHeader
        back={{ href: "/distributor", label: "Distribution desk" }}
        title="Receive · Spicewell shipment"
        badge={<Pill tone={g.confirmed ? "ok" : "warn"}>{g.confirmed ? "GRN confirmed" : "GRN in progress"}</Pill>}
        sub="Arrived 10:40 · Deccan Road Carriers LR 77410 · Invoice INV-5582 · 167 cartons"
        actions={<div className="rounded-[10px] bg-pine px-4 py-2.5 text-white"><p className="monocap text-[11px] text-white/70">Claim window with brand</p><p className="num text-[18px]">7 days from GRN</p></div>}
      />
      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div className="flex flex-col gap-5">
          <Panel title="Count vs invoice" right={<Btn size="sm" onClick={() => toast("Scanner ready: point the camera at a carton barcode")}>Scan barcodes</Btn>} pad={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead><tr><th className="th pl-6">SKU</th><th className="th">Invoiced</th><th className="th">Received</th><th className="th">Damaged</th><th className="th">Batch</th><th className="th">Expiry</th><th className="th pr-6">Result</th></tr></thead>
                <tbody>
                  {g.lines.map((l, i) => {
                    const r = result(l);
                    return (
                      <tr key={l.sku}>
                        <td className="td pl-6"><b>{l.sku}</b><p className="text-[12px] text-ink-2">{l.pack}</p></td>
                        <td className="td num">{fmt(l.invoiced)}</td>
                        <td className="td"><input disabled={g.confirmed} className="input num h-9 w-20 px-2" value={l.received} onChange={(e) => setLine(i, "received", e.target.value)} aria-label={`${l.sku} received`} /></td>
                        <td className="td"><input disabled={g.confirmed} className="input num h-9 w-16 px-2" value={l.damaged} onChange={(e) => setLine(i, "damaged", e.target.value)} aria-label={`${l.sku} damaged`} /></td>
                        <td className="td num">{l.batch}</td>
                        <td className="td num">{l.expiry}</td>
                        <td className="td pr-6"><Pill tone={r.tone}>{r.t}</Pill></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Evidence">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {g.photos.map((p, i) => p.image ? <div key={i} className="relative h-24 overflow-hidden rounded-[10px] bg-soft"><img src={p.image} alt={p.label} className="size-full object-cover" /><span className="absolute bottom-1.5 left-1.5 max-w-[90%] truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] text-white">{p.label}</span></div> : <div key={i} className="hatch flex h-24 items-end rounded-lg p-2 text-[11px] text-ink-2">{p.label}</div>)}
              <button onClick={() => ref.current?.click()} className="flex h-24 items-center justify-center rounded-lg border border-dashed border-line-2 text-[13px] font-semibold text-flame">+ Add photo</button>
              <input ref={ref} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const { url } = await readFile(f); update((d) => { d.grn.photos.push({ label: f.name, image: url }); }); toast("Photo attached to the claim"); }} />
            </div>
          </Panel>
          <Panel title="Put-away" right="Older batches stay in front (FEFO)">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-[10px] bg-soft p-3"><p className="cap">Rack B2</p><p className="mt-1 text-[14px]">Masala 100g · {fmt(g.lines[0].received + g.lines[1].received)}</p></div>
              <div className="rounded-[10px] bg-soft p-3"><p className="cap">Rack B3</p><p className="mt-1 text-[14px]">Masala 50g · {fmt(g.lines[2].received + g.lines[3].received)}</p></div>
              <div className="rounded-[10px] bg-bad-bg p-3"><p className="cap text-bad">Damage bay</p><p className="mt-1 text-[14px]">{damaged} packs · held for claim</p></div>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <Panel title="GRN summary">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[10px] bg-soft p-3"><p className="cap">Accepted</p><p className="num mt-1 text-[24px]">{fmt(accepted)}</p></div>
              <div className="rounded-[10px] bg-bad-bg p-3"><p className="cap text-bad">Short + damaged</p><p className="num mt-1 text-[24px] text-bad">{fmt(bad)}</p></div>
            </div>
            <Btn variant="pine" size="lg" className="mt-3 w-full" disabled={g.confirmed} onClick={() => { update((d) => { d.grn.confirmed = true; d.inbound.find((x) => x.id === "in2")!.status = "Received"; d.inbound.find((x) => x.id === "in2")!.meta = `GRN done today · ${fmt(accepted)} accepted`; }); toast("GRN confirmed. Stock is live for retailer orders."); }}>{g.confirmed ? "GRN confirmed" : "Confirm GRN"}</Btn>
            <p className="mt-2 text-[12px] text-ink-2">Stock goes live for retailer orders as soon as you confirm.</p>
          </Panel>
          <Panel title="Claim to brand">
            <p className="-mt-2 mb-2 text-[13px] text-ink-2">Auto-filled from the count and photos</p>
            <dl className="divide-y divide-line text-[14px]">
              <div className="flex justify-between py-2"><dt>Short + damaged · {bad} packs</dt><dd className="num">{inr(claim)}</dd></div>
              <div className="flex justify-between py-2"><dt>Ask for</dt><dd>Credit note</dd></div>
            </dl>
            <Btn className="mt-3 w-full" disabled={g.claimSent || bad === 0} onClick={() => { update((d) => { d.grn.claimSent = true; d.claims.unshift({ brand: "Spicewell", what: `GRN shortage · ${bad} packs with ${d.grn.photos.length} photos`, amount: claim, status: "Submitted" }); }); toast("Claim sent to Spicewell with count and photos"); }}>{g.claimSent ? "Claim sent" : "Send claim"}</Btn>
          </Panel>
          <Panel title="Payable to brand">
            <dl className="text-[14px]">
              <div className="flex justify-between py-1.5"><dt>Invoice</dt><dd className="num">{inr(invoice)}</dd></div>
              <div className="flex justify-between py-1.5"><dt>Less claim</dt><dd className={cn("num", claim && "text-bad")}>− {inr(claim)}</dd></div>
              <div className="flex justify-between border-t border-line py-1.5 font-semibold"><dt>Due</dt><dd className="num">21 days · {inr(invoice - claim)}</dd></div>
            </dl>
          </Panel>
          <Panel title="Other inbound">
            <ul className="divide-y divide-line text-[13px]">
              {s.inbound.filter((i) => i.id !== "in2").map((i) => <li key={i.id} className="py-2.5"><b>{i.brand}</b> · {i.item}<span className="block text-[12px] text-ink-2">{i.meta}</span><span className="mt-2 block"><StageTrack steps={INBOUND_STEPS} {...inboundTrack(i)} /></span></li>)}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
