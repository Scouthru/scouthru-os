"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Building2, CalendarClock, Megaphone, MessageSquare, Percent, Send, Tag } from "lucide-react";
import { Btn, CardTitle, Field, Hero, Modal, Pill, StatStrip, inputCls, textareaCls } from "@/components/console/kit";
import { stockValue } from "@/components/console/distributor-kit";
import { useConsole } from "@/lib/console/store";
import { toggleScheme } from "@/lib/console/actions-network";
import { messageBrand } from "@/lib/console/actions-distributor";
import { fmtDate, inr, lakh } from "@/lib/console/format";
import { cn } from "@/lib/cn";

export default function SchemesPage() {
  const { s, update, toast } = useConsole();
  const [sel, setSel] = useState<string | null>(s.schemes[0]?.id ?? null);
  const [msg, setMsg] = useState<{ subject: string; body: string } | null>(null);

  const brands = useMemo(() => Array.from(new Set(s.distStock.map((x) => x.brand))), [s.distStock]);
  const sold = useMemo(() => {
    const m = new Map<string, number>();
    s.retailOrders.filter((o) => o.status !== "Cancelled" && o.status !== "New").forEach((o) => o.lines.forEach((l) => m.set(l.sku, (m.get(l.sku) ?? 0) + l.qty)));
    return m;
  }, [s.retailOrders]);
  const expired = (iso: string) => new Date(iso).getTime() < Date.now();
  const cur = s.schemes.find((x) => x.id === sel) ?? null;
  const live = s.schemes.filter((x) => x.active && !expired(x.validTill));

  return (
    <div>
      <Hero
        eyebrow="BRANDS  ·  SCHEMES"
        title="Brands & Schemes"
        lede={<>The brands you carry, how each product sells through, and the trade schemes<br />you can offer retailers this month.</>}
        img="/console/hero-dashboard.jpg"
        quote={["Better schemes.", "Faster sales.", "Stronger brands.", "Happy retailers."]}
        height={177}
        quoteTop={35}
        quoteWidth={190}
      />
      <div className="px-[15px] pb-[20px]">
        <StatStrip
          items={[
            { icon: Building2, tone: "green", value: brands.length, label: "Brands Carried", delta: <span className="block truncate">{brands.join(", ")}</span>, deltaTone: "muted" },
            { icon: Tag, tone: "blue", value: s.distStock.length, label: "Products", delta: <span className="block truncate">{`${lakh(stockValue(s))} in stock`}</span>, deltaTone: "muted" },
            { icon: Megaphone, tone: "orange", value: live.length, label: "Live Schemes", delta: <span className="block truncate">{`${s.schemes.length - live.length} paused or expired`}</span>, deltaTone: "muted" },
            { icon: Percent, tone: "violet", value: `${Math.round((Array.from(sold.values()).reduce((a, b) => a + b, 0) / Math.max(1, Array.from(sold.values()).reduce((a, b) => a + b, 0) + s.distStock.reduce((a, x) => a + x.onHand, 0))) * 100)}%`, label: "Overall Sell-through", delta: <span className="block truncate">{"packed or delivered vs on hand"}</span>, deltaTone: "muted" },
            { icon: CalendarClock, tone: "red", value: s.schemes.filter((x) => !expired(x.validTill) && (new Date(x.validTill).getTime() - Date.now()) / 864e5 < 14).length, label: "Ending in 14 Days", delta: <span className="block truncate">{"tell retailers now"}</span>, deltaTone: "muted" },
          ]}
        />

        <div className="mt-[11px] grid gap-[11px] min-[1024px]:h-[716px] min-[1024px]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section className="cs-card flex min-h-0 min-w-0 flex-col px-[14px] pt-[14px]">
            {brands.map((b) => (
              <div key={b} className="flex min-h-0 flex-1 flex-col">
                <CardTitle sub={`${s.distStock.filter((x) => x.brand === b).length} products · ${inr(s.distStock.filter((x) => x.brand === b).reduce((a, x) => a + x.onHand * x.price, 0))} in stock`} right={<Btn icon={MessageSquare} className="h-[34px]" onClick={() => setMsg({ subject: "", body: "" })}>Message the brand</Btn>}>{b}</CardTitle>
                <ul className="mt-[12px] min-h-0 flex-1 divide-y divide-cs-line overflow-y-auto pb-[10px]">
                  {s.distStock.filter((x) => x.brand === b).map((x) => {
                    const n = sold.get(x.sku) ?? 0;
                    const st = Math.round((n / Math.max(1, n + x.onHand)) * 100);
                    return (
                      <li key={x.sku} className="grid grid-cols-[42px_minmax(0,1fr)_minmax(0,150px)_70px] items-center gap-[12px] py-[10px]">
                        <Image src={x.img} alt="" width={42} height={42} className="size-[42px] rounded-[6px] object-cover" />
                        <div className="min-w-0"><p className="truncate text-[12.5px] font-medium">{x.product}</p><p className="text-[11px] text-cs-ink-2">{x.sku} · MRP {inr(x.mrp)} · {n} sold · {x.onHand} on hand</p></div>
                        <span className="h-[10px] overflow-hidden rounded-full bg-[#eef0ec]"><span className="block h-full rounded-full bg-cs-green-2" style={{ width: `${st}%` }} /></span>
                        <span className="text-right text-[12px] font-semibold">{st}%<span className="block text-[10px] font-normal text-cs-ink-2">sell-through</span></span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>

          <section className="cs-card flex min-h-0 min-w-0 flex-col px-[14px] pt-[14px]">
            <CardTitle sub="Turn a scheme off to stop offering it to retailers.">Trade Schemes</CardTitle>
            <ul className="mt-[10px] min-h-0 flex-1 space-y-[8px] overflow-y-auto pb-[10px]">
              {s.schemes.map((x) => {
                const exp = expired(x.validTill);
                const on = x.active && !exp;
                return (
                  <li key={x.id} onClick={() => setSel(x.id)} className={cn("cursor-pointer rounded-[9px] border p-[11px]", sel === x.id ? "border-cs-green-2/70 bg-[#fbfdfb]" : "border-cs-line hover:border-[#cfcac0]")}>
                    <div className="flex items-start gap-[10px]">
                      <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-full", on ? "bg-cs-mint text-cs-green" : "bg-[#f1f0ec] text-[#55605a]")}><Megaphone className="size-[16px]" strokeWidth={1.7} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-semibold">{x.title}</p>
                        <p className="text-[11px] text-cs-ink-2">{x.brand} · {exp ? "ended" : "valid till"} {fmtDate(x.validTill)}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={x.active}
                        aria-label={`${x.active ? "Pause" : "Activate"} ${x.title}`}
                        disabled={exp}
                        onClick={(e) => { e.stopPropagation(); update((d) => toggleScheme(d, x.id)); toast(`${x.title}: ${x.active ? "paused" : "active"}`); }}
                        className={cn("relative h-[22px] w-[40px] shrink-0 rounded-full transition disabled:opacity-40", x.active ? "bg-cs-green" : "bg-[#d6d8d3]")}
                      >
                        <span className={cn("absolute top-[3px] size-[16px] rounded-full bg-white transition-all", x.active ? "left-[21px]" : "left-[3px]")} />
                      </button>
                    </div>
                    {sel === x.id && <p className="mt-[8px] rounded-[7px] bg-[#f7f6f2] px-[10px] py-[7px] text-[12px] text-[#3e4440]">{x.detail}</p>}
                    <div className="mt-[6px]"><Pill tone={exp ? "gray" : x.active ? "green" : "orange"}>{exp ? "Expired" : x.active ? "Active" : "Paused"}</Pill></div>
                  </li>
                );
              })}
            </ul>
            {cur && (
              <div className="border-t border-cs-line py-[12px]">
                <Btn className="w-full" icon={MessageSquare} onClick={() => setMsg({ subject: `About scheme: ${cur.title}`, body: "" })}>Ask the brand about this scheme</Btn>
              </div>
            )}
          </section>
        </div>
      </div>

      <Modal
        open={!!msg}
        onClose={() => setMsg(null)}
        title={`Message ${s.workspace}`}
        sub="Lands in the brand's messages and activity feed."
        footer={<>
          <Btn onClick={() => setMsg(null)}>Cancel</Btn>
          <Btn kind="primary" icon={Send} disabled={!msg?.subject.trim() || !msg?.body.trim()} onClick={() => { if (!msg) return; update((d) => messageBrand(d, msg.subject.trim(), msg.body.trim(), "/console")); toast(`Message sent to ${s.workspace}`); setMsg(null); }}>Send</Btn>
        </>}
      >
        {msg && (
          <div className="space-y-[12px]">
            <Field label="Subject"><input className={inputCls} value={msg.subject} onChange={(e) => setMsg({ ...msg, subject: e.target.value })} placeholder="e.g. Need a scheme for Vitamin D3" /></Field>
            <Field label="Message"><textarea className={textareaCls} rows={5} value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
