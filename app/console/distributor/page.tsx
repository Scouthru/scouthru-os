"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BadgeIndianRupee, PackageOpen, Play, Route as RouteIcon, ShoppingCart, Truck, Warehouse } from "lucide-react";
import { Btn, CardTitle, Hero, Pill, RowMenu, StatStrip, TONE, type Tone } from "@/components/console/kit";
import { Avatar } from "@/components/console/making";
import { RestockModal, ageDays, inboundFor, stockValue } from "@/components/console/distributor-kit";
import { useConsole } from "@/lib/console/store";
import { attention } from "@/lib/console/flow";
import { startRoute } from "@/lib/console/actions-network";
import { distributorActivity } from "@/lib/console/actions-distributor";
import { ago, fmtDate, fmtNum, inr, ist, lakh } from "@/lib/console/format";
import { cn } from "@/lib/cn";


type Pri = { key: string; icon: typeof Truck; tone: Tone; title: string; sub: string; due: string; level: "High" | "Medium" | "Low"; href: string; rank: number };
const PRI_KIND: Record<string, { icon: typeof Truck; tone: Tone; level: Pri["level"] }> = {
  Inbound: { icon: PackageOpen, tone: "orange", level: "High" }, Collection: { icon: BadgeIndianRupee, tone: "red", level: "High" },
  Stock: { icon: AlertTriangle, tone: "orange", level: "Medium" }, "Retail order": { icon: ShoppingCart, tone: "blue", level: "Medium" },
};
const LEVEL: Record<string, string> = { High: "bg-cs-red-bg text-cs-red", Medium: "bg-cs-orange-bg text-[#a9713f]", Low: "bg-[#f6f0e7] text-[#564e47]" };

export default function DistributorDashboard() {
  const { s, update, toast } = useConsole();
  const router = useRouter();
  const [restock, setRestock] = useState<string | null>(null);

  const inbound = inboundFor(s);
  const pendingIn = inbound.filter((x) => !x.grn);
  const low = s.distStock.filter((x) => x.onHand < x.reorderAt);
  const open = s.retailOrders.filter((o) => o.status === "New" || o.status === "Packed" || o.status === "Out for Delivery");
  const due = s.retailOrders.filter((o) => o.status === "Delivered" && o.payment === "Due");
  const overdue = due.filter((o) => ageDays(o.deliveredAt ?? o.at) > 7);
  const today = ist().wd;

  // Same rules as the Inbound banner and every other dashboard (lib/console/flow.ts).
  const pri = useMemo<Pri[]>(() => attention(s, "distributor").map((l, i) => {
    const late = !!l.step.due && new Date(l.step.due) < new Date();
    const k = PRI_KIND[l.kind] ?? PRI_KIND.Inbound;
    return { key: `${l.kind}-${l.id}`, icon: k.icon, tone: k.tone, title: l.step.title, sub: `${l.id}${l.step.detail ? ` – ${l.step.detail}` : ""}`, due: l.step.due ? `${late ? "Overdue since" : "Due"} ${fmtDate(l.step.due)}` : "", level: late ? "High" : k.level, href: l.href, rank: i };
  }), [s]);

  const sales = useMemo(() => {
    const by = new Map<string, { qty: number; value: number }>();
    s.retailOrders.filter((o) => o.status !== "Cancelled").forEach((o) => o.lines.forEach((l) => {
      const price = s.distStock.find((x) => x.sku === l.sku)?.price ?? 0;
      const cur = by.get(l.sku) ?? { qty: 0, value: 0 };
      by.set(l.sku, { qty: cur.qty + l.qty, value: cur.value + l.qty * price });
    }));
    return s.distStock.map((x) => ({ x, ...(by.get(x.sku) ?? { qty: 0, value: 0 }) })).sort((a, b) => b.value - a.value);
  }, [s]);
  const maxSale = Math.max(1, ...sales.map((r) => r.value));
  const feed = distributorActivity(s).slice(0, 6);

  return (
    <div>
      <Hero
        eyebrow={`WELCOME BACK, ${s.people.distributor.name.split(" ")[0].toUpperCase()}`}
        title="Distributor Dashboard"
        lede={<span className="lg:whitespace-nowrap">{s.distributor.name} · {s.distributor.area}. Count it in, deliver it, collect for it. Every result on record.</span>}
        img="/console/hero-shipments.jpg"
        quote={["From the dock.", "To the shelf.", "Paid on time."]}
        height={142}
        quoteTop={32}
        quoteWidth={192}
      />
      <div className="px-[15px] pb-[20px]">
        <StatStrip
          items={[
            { icon: Truck, tone: "violet", value: pendingIn.length, label: "Inbound Shipments", delta: <span className="block truncate">{`${pendingIn.filter((x) => x.sh.status === "Delivered").length} waiting to be counted`}</span>, deltaTone: pendingIn.some((x) => x.sh.status === "Delivered") ? "bad" : "up" },
            { icon: Warehouse, tone: "green", value: lakh(stockValue(s)), label: "Stock Value", delta: <span className="block truncate">{`${fmtNum(s.distStock.reduce((a, x) => a + x.onHand, 0))} packs across ${s.distStock.length} SKUs`}</span> },
            { icon: AlertTriangle, tone: "orange", value: low.length, label: "SKUs Below Reorder", delta: <span className="block truncate">{low.length ? "request restock" : "all above reorder level"}</span>, deltaTone: low.length ? "bad" : "up" },
            { icon: ShoppingCart, tone: "blue", value: open.length, label: "Open Retailer Orders", delta: <span className="block truncate">{`${s.retailOrders.filter((o) => o.status === "New").length} new to pack`}</span> },
            { icon: BadgeIndianRupee, tone: "red", value: lakh(due.reduce((a, o) => a + o.value, 0)), label: "Collections Due", delta: <span className="block truncate">{`${overdue.length} overdue (over 7 days)`}</span>, deltaTone: overdue.length ? "bad" : "up" },
          ]}
        />

        <div className="mt-[12px] grid gap-[11px] min-[1024px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]">
          {/* priorities */}
          <section className="cs-card flex min-h-0 flex-col px-[12px] pt-[14px] min-[1024px]:h-[372px]">
            <div className="px-[3px]">
              <CardTitle right={<span className="grid size-[21px] place-items-center rounded-full bg-cs-red text-[11px] font-semibold text-white">{pri.length}</span>}>Needs Attention</CardTitle>
            </div>
            <ul className="mt-[10px] min-h-0 flex-1 space-y-[7px] overflow-y-auto pb-[10px]">
              {pri.map((p) => (
                <li key={p.key + p.title} className="relative flex items-start gap-[10px] rounded-[8px] border border-cs-line px-[8px] py-[7px] hover:border-[#d0c7bf]">
                  <span className={cn("grid size-[36px] shrink-0 place-items-center rounded-[7px]", TONE[p.tone].bg, TONE[p.tone].fg)}><p.icon className="size-[18px]" strokeWidth={1.7} /></span>
                  <Link href={p.href} className="min-w-0 flex-1">
                    <p className="pr-[64px] text-[12px] font-medium text-[#221f1c]">{p.title}</p>
                    <p className="mt-[1px] truncate pr-[24px] text-[10.5px] text-cs-ink-2">{p.sub}</p>
                    <p className="mt-[2px] text-[11px] text-cs-red">{p.due}</p>
                  </Link>
                  <span className={cn("absolute right-[36px] top-[8px] rounded-[5px] px-[8px] py-[1px] text-[10.5px] font-medium", LEVEL[p.level])}>{p.level}</span>
                  <RowMenu className="absolute right-[5px] top-[5px]" items={[{ label: "Open", icon: ArrowRight, onClick: () => router.push(p.href) }]} />
                </li>
              ))}
              {pri.length === 0 && <li className="py-6 text-center text-[13px] text-cs-ink-2">Nothing urgent right now.</li>}
            </ul>
          </section>

          {/* routes */}
          <section className="cs-card flex min-h-0 flex-col px-[14px] pt-[14px] min-[1024px]:h-[372px]">
            <CardTitle sub={`Today is ${today}.`} right={<Link href="/console/distributor/routes" className="flex items-center gap-[6px] whitespace-nowrap pt-[2px] text-[12px] font-medium text-[#36312d] hover:text-cs-green">All Routes <ArrowRight className="size-[14px]" /></Link>}>Routes</CardTitle>
            <ul className="mt-[10px] min-h-0 flex-1 space-y-[8px] overflow-y-auto pb-[12px]">
              {s.routes.map((r) => {
                const packed = s.retailOrders.filter((o) => o.routeId === r.id && o.status === "Packed");
                const out = s.retailOrders.filter((o) => o.routeId === r.id && o.status === "Out for Delivery");
                const isToday = r.day.includes(today);
                return (
                  <li key={r.id} className="rounded-[8px] border border-cs-line px-[11px] py-[9px]">
                    <div className="flex items-center gap-[8px]">
                      <RouteIcon className="size-[16px] text-cs-green-2" strokeWidth={1.7} />
                      <p className="text-[12.5px] font-semibold">{r.name}</p>
                      {isToday && <Pill tone="green" className="py-[1px] text-[10.5px]">Today</Pill>}
                      <span className="ml-auto text-[11px] text-cs-ink-2">{r.day}</span>
                    </div>
                    <p className="mt-[3px] truncate text-[11px] text-cs-ink-2">{r.areas.join(", ")} · {r.van} · {r.driver}</p>
                    <div className="mt-[7px] flex items-center gap-[8px]">
                      <span className="text-[11.5px]"><b>{packed.length}</b> packed · <b>{out.length}</b> out</span>
                      <Btn kind="primary" icon={Play} className="ml-auto h-[28px] px-[10px] text-[11.5px]" disabled={packed.length === 0} onClick={() => { let n = 0; update((d) => { n = startRoute(d, r.id); }); toast(`${r.name}: ${n} order${n === 1 ? "" : "s"} out for delivery`); }}>Start route</Btn>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* low stock */}
          <section className="cs-card flex min-h-0 flex-col px-[14px] pt-[14px] min-[1024px]:h-[372px]">
            <CardTitle right={<Link href="/console/distributor/stock" className="flex items-center gap-[6px] whitespace-nowrap pt-[2px] text-[12px] font-medium text-[#36312d] hover:text-cs-green">View Stock <ArrowRight className="size-[14px]" /></Link>}>Stock Watch</CardTitle>
            <ul className="mt-[10px] min-h-0 flex-1 divide-y divide-cs-line overflow-y-auto pb-[8px]">
              {[...s.distStock].sort((a, b) => a.onHand / Math.max(1, a.reorderAt) - b.onHand / Math.max(1, b.reorderAt)).map((x) => {
                const lowNow = x.onHand < x.reorderAt;
                return (
                  <li key={x.sku} className="flex items-center gap-[10px] py-[8px]">
                    <Image src={x.img} alt="" width={36} height={36} className="size-[36px] shrink-0 rounded-[6px] object-cover" />
                    <Link href={`/console/distributor/stock?sku=${x.sku}`} className="min-w-0 flex-1 hover:text-cs-green">
                      <p className="truncate text-[12px] font-medium">{x.product}</p>
                      <p className={cn("text-[11px]", lowNow ? "text-cs-red" : "text-cs-ink-2")}>{x.onHand} on hand · reorder at {x.reorderAt}</p>
                    </Link>
                    {lowNow ? <Btn className="h-[28px] px-[9px] text-[11.5px]" onClick={() => setRestock(x.sku)}>Request restock</Btn> : <Pill tone="green">OK</Pill>}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="mt-[11px] grid gap-[11px] min-[1024px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {/* sales by SKU */}
          <section className="cs-card px-[14px] pb-[12px] pt-[14px] min-[1024px]:h-[286px]">
            <CardTitle sub="Retailer orders placed with you, all time.">Sales by SKU</CardTitle>
            <ul className="mt-[12px] space-y-[11px]">
              {sales.map((r) => (
                <li key={r.x.sku} className="grid grid-cols-[minmax(0,190px)_minmax(0,1fr)_88px] items-center gap-[12px]">
                  <span className="truncate text-[12px]">{r.x.product}</span>
                  <span className="h-[14px] overflow-hidden rounded-[4px] bg-[#f6f0e6]"><span className="block h-full rounded-[4px] bg-cs-green-2" style={{ width: `${(r.value / maxSale) * 100}%` }} /></span>
                  <span className="text-right text-[12px]"><b>{inr(r.value)}</b><span className="block text-[10.5px] text-cs-ink-2">{r.qty} packs</span></span>
                </li>
              ))}
            </ul>
          </section>

          {/* activity */}
          <section className="cs-card flex min-h-0 flex-col px-[14px] pt-[14px] min-[1024px]:h-[286px]">
            <CardTitle>Recent Activity</CardTitle>
            <ul className="mt-[8px] min-h-0 flex-1 overflow-y-auto">
              {feed.map((a) => (
                <li key={a.id} className="flex items-start gap-[10px] border-b border-cs-line py-[8px] last:border-0">
                  <Avatar name={a.who} size={30} />
                  <Link href={a.href} className="min-w-0 flex-1 hover:text-cs-green">
                    <p className="line-clamp-2 text-[12px] leading-[1.35]">{a.text}</p>
                    <p className="text-[10.5px] text-cs-ink-2">{ago(a.at)}</p>
                  </Link>
                </li>
              ))}
              {feed.length === 0 && <li className="py-6 text-center text-[12.5px] text-cs-ink-2">Receive a shipment, pack an order or request restock and it shows here.</li>}
            </ul>
          </section>
        </div>
      </div>
      <RestockModal sku={restock} onClose={() => setRestock(null)} />
    </div>
  );
}
