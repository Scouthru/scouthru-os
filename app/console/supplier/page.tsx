"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  AlertTriangle, ArrowRight, BellRing, CheckCircle2, ChevronRight, ClipboardList, Download, FileText, IndianRupee, Inbox, PackageCheck, Plus, Truck, Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CardTitle, Hero, Pill, RowMenu, StatStrip, TONE, type Tone } from "@/components/console/kit";
import { buyerName, isOverdue, minePOs, poValue } from "@/components/console/supplier-kit";
import { useConsole } from "@/lib/console/store";
import { ago, csv, daysUntil, download, fmtNum, inr } from "@/lib/console/format";
import type { POStatus } from "@/lib/console/types";
import { cn } from "@/lib/cn";

const PIPE: { key: POStatus; label: string; icon: LucideIcon; href: string }[] = [
  { key: "RFQ", label: "Requests", icon: Inbox, href: "/console/supplier/requests" },
  { key: "Quoted", label: "Quoted", icon: FileText, href: "/console/supplier/requests" },
  { key: "Confirmed", label: "Confirmed", icon: CheckCircle2, href: "/console/supplier/dispatch" },
  { key: "Dispatched", label: "Dispatched", icon: Truck, href: "/console/supplier/dispatch" },
  { key: "Received", label: "Received", icon: PackageCheck, href: "/console/supplier/payments" },
  { key: "Paid", label: "Paid", icon: IndianRupee, href: "/console/supplier/payments" },
];

const LEVEL: Record<string, string> = { High: "bg-cs-red-bg text-cs-red", Medium: "bg-cs-orange-bg text-[#b8641f]", Low: "bg-[#f1f0ec] text-[#4b524e]" };

export default function SupplierDashboard() {
  const { s } = useConsole();
  const router = useRouter();
  const mine = minePOs(s);
  const by = (st: POStatus) => mine.filter((p) => p.status === st);
  const unpaid = mine.filter((p) => p.invoice && !p.invoice.paidAt);
  const overdue = unpaid.filter(isOverdue);
  const lows = s.supplierStock.filter((x) => x.onHand - x.reserved < x.moq);
  const first = s.people.supplier.name.split(" ")[0].toUpperCase();

  const priority = useMemo(() => {
    const out: { key: string; icon: LucideIcon; tone: Tone; title: string; sub: string; due: string; level: "High" | "Medium" | "Low"; href: string; rank: number }[] = [];
    mine.filter((p) => p.status === "RFQ").forEach((p) => { const d = daysUntil(p.needBy); out.push({ key: p.id, icon: Inbox, tone: "orange", title: "Quote request", sub: `${p.id} – ${p.title}`, due: `Needed in ${d} days`, level: d <= 7 ? "High" : "Medium", href: `/console/supplier/requests?id=${p.id}`, rank: d <= 7 ? 0 : 3 }); });
    mine.filter((p) => p.status === "Confirmed").forEach((p) => { const d = daysUntil(p.needBy); out.push({ key: p.id, icon: Truck, tone: "violet", title: "Dispatch order", sub: `${p.id} – ${buyerName(s, p.mfrId)}`, due: d < 0 ? `${-d} days late` : `Due in ${d} days`, level: d <= 3 ? "High" : "Medium", href: `/console/supplier/dispatch?id=${p.id}`, rank: d <= 3 ? 1 : 4 }); });
    overdue.forEach((p) => out.push({ key: `inv-${p.id}`, icon: IndianRupee, tone: "red", title: "Payment overdue", sub: `${p.invoice!.no} – ${inr(p.invoice!.amount)}`, due: `${-daysUntil(p.invoice!.due)} days late`, level: "High", href: `/console/supplier/payments?id=${p.id}`, rank: 2 }));
    lows.forEach((x) => out.push({ key: x.sku, icon: AlertTriangle, tone: "gray", title: "Low stock", sub: `${x.sku} – ${x.name}`, due: `${fmtNum(x.onHand - x.reserved)} available · MOQ ${fmtNum(x.moq)}`, level: "Low", href: `/console/supplier/stock?sku=${x.sku}`, rank: 5 }));
    return out.sort((a, b) => a.rank - b.rank);
  }, [mine, overdue, lows, s]);

  const buyers = useMemo(() => {
    const ids = Array.from(new Set(mine.map((p) => p.mfrId)));
    return ids.map((id) => {
      const won = mine.filter((p) => p.mfrId === id && !["RFQ", "Quoted", "Declined"].includes(p.status));
      return { id, name: buyerName(s, id), img: s.manufacturers.find((m) => m.id === id)?.img, orders: won.length, value: won.reduce((a, p) => a + poValue(s, p), 0), open: mine.filter((p) => p.mfrId === id && (p.status === "RFQ" || p.status === "Quoted")).length };
    }).sort((a, b) => b.value - a.value);
  }, [mine, s]);

  // Activity: every step on this supplier's POs, newest first.
  const activity = mine.flatMap((p) => p.events.map((e, i) => ({
    id: `${p.id}-${i}`, at: e.at, text: `${p.id} · ${e.text}`, who: buyerName(s, p.mfrId),
    tag: /Paid/.test(e.text) ? "Payment" : /Dispatch|Received/.test(e.text) ? "Shipment" : "Request",
    href: `/console/supplier/${p.status === "RFQ" || p.status === "Quoted" || p.status === "Declined" ? "requests" : "pos"}?id=${p.id}`,
  }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);

  const ACTIONS: { label: string; icon: LucideIcon; color: string; href?: string; run?: () => void }[] = [
    { label: "Quote a Request", icon: FileText, color: "", href: "/console/supplier/requests" },
    { label: "Add Request", icon: Plus, color: "text-cs-orange", href: "/console/supplier/requests?add=1" },
    { label: "Dispatch an Order", icon: Truck, color: "text-[#2f3431]", href: "/console/supplier/dispatch" },
    { label: "Update Stock", icon: Warehouse, color: "text-cs-green-2", href: "/console/supplier/stock" },
    { label: "Chase Payments", icon: BellRing, color: "text-cs-red", href: "/console/supplier/payments" },
    { label: "Export Price List", icon: Download, color: "text-[#2f3431]", run: () => download("packright-price-list.csv", csv([["SKU", "Item", "Price (₹)", "MOQ", "Lead days", "Available"], ...s.supplierStock.map((x) => [x.sku, x.name, x.price, x.moq, x.leadDays, x.onHand - x.reserved])])) },
  ];

  return (
    <div>
      <Hero eyebrow={`WELCOME BACK, ${first}`} title="PackRight Dashboard" lede={<>Requests, orders, dispatch and payments from every factory you supply.<br />Quote fast, ship on time and keep stock current.</>} img="/console/hero-enquiries.jpg" height={160} quoteTop={44} quoteWidth={184} quote={["Packaging that", "keeps production", "moving."]} />
      <div className="px-[15px] pb-[15px]">
        <StatStrip items={[
          { icon: Inbox, tone: "orange", value: by("RFQ").length, label: "New Requests", delta: `${by("RFQ").filter((p) => daysUntil(p.needBy) <= 7).length} needed this week`, deltaTone: "muted" },
          { icon: FileText, tone: "blue", value: by("Quoted").length, label: "Quotes Awaiting Reply", delta: inr(by("Quoted").reduce((a, p) => a + poValue(s, p), 0)), deltaTone: "muted" },
          { icon: Truck, tone: "violet", value: by("Confirmed").length, label: "POs to Dispatch", delta: `${by("Confirmed").filter((p) => daysUntil(p.needBy) <= 3).length} due in 3 days`, deltaTone: by("Confirmed").some((p) => daysUntil(p.needBy) <= 3) ? "bad" : "muted" },
          { icon: IndianRupee, tone: "green", value: inr(unpaid.reduce((a, p) => a + p.invoice!.amount, 0)), label: "Receivables", delta: `${inr(overdue.reduce((a, p) => a + p.invoice!.amount, 0))} overdue`, deltaTone: overdue.length ? "bad" : "muted" },
          { icon: AlertTriangle, tone: "red", value: lows.length, label: "Low-stock SKUs", delta: lows.length ? lows.map((x) => x.sku).slice(0, 2).join(", ") : "all above MOQ", deltaTone: lows.length ? "bad" : "muted" },
        ]} />

        <div className="mt-[11px] grid gap-[11px] min-[1024px]:grid-cols-[minmax(0,1.97fr)_minmax(0,1fr)]">
          <section className="cs-card px-[15px] pb-[16px] pt-[14px]">
            <CardTitle sub="Every request from quote to payment.">Order Pipeline</CardTitle>
            <div className="relative mt-[20px] grid grid-cols-6">
              <div className="absolute left-[8.3%] right-[8.3%] top-[24px] flex">{PIPE.slice(0, -1).map((p, i) => <span key={p.key} className={cn("h-[2px] flex-1", i < 2 ? "bg-cs-green" : "bg-[#dedcd6]")} />)}</div>
              {PIPE.map((p) => {
                const n = by(p.key).length;
                return (
                  <Link key={p.key} href={p.href} className="group relative flex flex-col items-center">
                    <span className={cn("grid size-[48px] place-items-center rounded-full transition group-hover:ring-2 group-hover:ring-cs-green/30", n ? "bg-cs-mint text-cs-green" : "bg-[#f1f0ec] text-[#4b524e]")}><p.icon className="size-[22px]" strokeWidth={1.6} /></span>
                    <p className="mt-[8px] text-[13px] text-[#2a2f2c]">{p.label}</p>
                    <p className="serif mt-[4px] text-[20px] font-semibold leading-none">{n}</p>
                    <span className="mt-[7px] whitespace-nowrap rounded-[5px] bg-[#f5f3ee] px-[8px] py-[2px] text-[11px] text-cs-ink-2">{inr(by(p.key).reduce((a, x) => a + poValue(s, x), 0))}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="cs-card px-[14px] pb-[12px] pt-[14px]">
            <CardTitle sub="Get going with the usual jobs.">Quick Actions</CardTitle>
            <div className="mt-[14px] grid grid-cols-2 gap-[9px]">
              {ACTIONS.map((a, i) => {
                const cls = cn("flex h-[52px] items-center gap-[10px] rounded-[7px] px-[12px] text-left text-[12.5px] font-medium leading-tight", i === 0 ? "bg-cs-green text-white hover:bg-[#163b29]" : "border border-cs-line bg-white text-[#1f2421] hover:border-[#cfcac0]");
                const inner = <><a.icon className={cn("size-[20px] shrink-0", a.color)} strokeWidth={1.6} />{a.label}<ChevronRight className="ml-auto size-[15px]" /></>;
                return a.href ? <Link key={a.label} href={a.href} className={cls}>{inner}</Link> : <button key={a.label} type="button" onClick={a.run} className={cls}>{inner}</button>;
              })}
            </div>
          </section>
        </div>

        <div className="mt-[11px] grid gap-[10px] min-[1024px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <section className="cs-card px-[11px] pb-[10px] pt-[14px]">
            <div className="px-[4px]"><CardTitle right={<Link href="/console/supplier/requests" className="flex items-center gap-[6px] whitespace-nowrap pt-[2px] text-[12px] font-medium hover:text-cs-green">View All <ArrowRight className="size-[14px]" /></Link>}><span className="flex items-center gap-[10px]">Needs Attention <span className="grid size-[21px] place-items-center rounded-full bg-cs-red font-sans text-[11px] font-semibold text-white">{priority.length}</span></span></CardTitle></div>
            <ul className="mt-[8px] max-h-[430px] space-y-[7px] overflow-y-auto">
              {priority.slice(0, 6).map((p) => (
                <li key={p.key} className="relative flex min-w-0 items-start gap-[10px] rounded-[8px] border border-cs-line px-[8px] py-[7px] hover:border-[#cfcac0]">
                  <span className={cn("grid size-[36px] shrink-0 place-items-center rounded-[7px]", TONE[p.tone].bg, TONE[p.tone].fg)}><p.icon className="size-[18px]" strokeWidth={1.7} /></span>
                  <Link href={p.href} className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-[#1d211e]">{p.title}</p>
                    <p className="truncate pr-[24px] text-[10.5px] text-cs-ink-2">{p.sub}</p>
                    <p className="mt-[1px] text-[11px] text-cs-red">{p.due}</p>
                  </Link>
                  <span className={cn("absolute right-[38px] top-[8px] rounded-[5px] px-[8px] py-[2px] text-[10.5px] font-medium", LEVEL[p.level])}>{p.level}</span>
                  <RowMenu className="absolute right-[6px] top-[6px]" items={[{ label: "Open", icon: ArrowRight, onClick: () => router.push(p.href) }]} />
                </li>
              ))}
              {priority.length === 0 && <li className="py-6 text-center text-[12.5px] text-cs-ink-2">Nothing urgent right now.</li>}
            </ul>
          </section>

          <div className="space-y-[10px]">
            <section className="cs-card px-[14px] pb-[10px] pt-[14px]">
              <CardTitle right={<Link href="/console/supplier/buyers" className="flex items-center gap-[6px] whitespace-nowrap pt-[2px] text-[12px] font-medium hover:text-cs-green">View All <ArrowRight className="size-[14px]" /></Link>}>Top Buyers</CardTitle>
              <ul className="mt-[6px]">
                {buyers.slice(0, 3).map((b) => (
                  <li key={b.id} className="border-b border-cs-line last:border-0">
                    <Link href={`/console/supplier/buyers?id=${b.id}`} className="flex items-center gap-[10px] py-[8px] hover:text-cs-green">
                      {b.img && <img src={b.img} alt="" className="size-[34px] shrink-0 rounded-[6px] object-cover" />}
                      <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium">{b.name}</span><span className="text-[11px] text-cs-ink-2">{b.orders} orders · {b.open} open</span></span>
                      <span className="text-[12.5px] font-semibold">{inr(b.value)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            <section className="cs-card px-[14px] pb-[12px] pt-[14px]">
              <CardTitle right={<Link href="/console/supplier/stock" className="flex items-center gap-[6px] whitespace-nowrap pt-[2px] text-[12px] font-medium hover:text-cs-green">View All <ArrowRight className="size-[14px]" /></Link>}>Stock Health</CardTitle>
              <ul className="mt-[8px] space-y-[8px]">
                {[...s.supplierStock].sort((a, b) => (a.onHand - a.reserved) / a.moq - (b.onHand - b.reserved) / b.moq).slice(0, 4).map((x) => {
                  const av = x.onHand - x.reserved;
                  const pct = Math.min(100, (av / (x.moq * 4)) * 100);
                  return (
                    <li key={x.sku}>
                      <Link href={`/console/supplier/stock?sku=${x.sku}`} className="block">
                        <span className="flex justify-between text-[11.5px]"><span className="truncate pr-2">{x.name}</span><span className={av < x.moq ? "font-semibold text-cs-red" : "text-cs-ink-2"}>{fmtNum(av)}</span></span>
                        <span className="mt-[4px] block h-[6px] overflow-hidden rounded-full bg-[#ece9e2]"><span className={cn("block h-full rounded-full", av < x.moq ? "bg-cs-red" : "bg-cs-green")} style={{ width: `${Math.max(3, pct)}%` }} /></span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <section className="cs-card px-[14px] pb-[10px] pt-[14px]">
            <CardTitle>Recent Activity</CardTitle>
            <ul className="mt-[6px]">
              {activity.map((a) => (
                <li key={a.id} className="border-b border-cs-line last:border-0">
                  <Link href={a.href} className="flex gap-[10px] py-[8px] hover:text-cs-green">
                    {(() => { const I = a.tag === "Shipment" ? Truck : a.tag === "Payment" ? IndianRupee : ClipboardList; const t = TONE[a.tag === "Payment" ? "orange" : a.tag === "Shipment" ? "violet" : "green"]; return <span className={cn("grid size-[32px] shrink-0 place-items-center rounded-full", t.bg, t.fg)}><I className="size-[16px]" strokeWidth={1.7} /></span>; })()}
                    <span className="min-w-0"><span className="block text-[12px] leading-snug">{a.text}</span><span className="text-[10.5px] text-cs-ink-2">{a.who} · {ago(a.at)}</span></span>
                  </Link>
                </li>
              ))}
              {activity.length === 0 && <li className="py-5 text-[12.5px] text-cs-ink-2">Quotes, dispatches and payments you handle show up here.</li>}
            </ul>
            <div className="mt-[6px] flex flex-wrap gap-[6px]">
              {by("Confirmed").length > 0 && <Pill tone="violet">{by("Confirmed").length} to dispatch</Pill>}
              {overdue.length > 0 && <Pill tone="red">{overdue.length} overdue</Pill>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
