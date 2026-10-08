"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BadgeIndianRupee, Ban, CheckCircle2, ClipboardList, Download, PackageCheck, Plus, ShoppingCart, Truck, X } from "lucide-react";
import { Btn, CardTitle, Empty, FilterSelect, Hero, Pill, RowMenu, SearchBox, StatStrip, Tabs, inputCls } from "@/components/console/kit";
import { th } from "@/components/console/ops";
import { CollectModal, NewOrderModal, RO_TONE, invoiceText, skuName } from "@/components/console/distributor-kit";
import { useConsole } from "@/lib/console/store";
import { assignRoute, cancelRetailOrder, deliverRetailOrder, packRetailOrder } from "@/lib/console/actions-network";
import { ago, download, fmtDate, inr, lakh } from "@/lib/console/format";
import type { RetailOrder } from "@/lib/console/types";
import { cn } from "@/lib/cn";

type TabKey = "all" | RetailOrder["status"];
const STATUSES: RetailOrder["status"][] = ["New", "Packed", "Out for Delivery", "Delivered", "Cancelled"];

export default function OrdersPage() {
  return (
    <Suspense>
      <Orders />
    </Suspense>
  );
}

function Orders() {
  const { s, update, toast } = useConsole();
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [sel, setSel] = useState<string | null>(params.get("id") ?? s.retailOrders[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [collect, setCollect] = useState<RetailOrder | null>(null);

  useEffect(() => { const id = params.get("id"); if (id) setSel(id); }, [params]);

  const list = useMemo(() => s.retailOrders.filter((o) => (tab === "all" || o.status === tab) && (!area || o.area === area) && (!q.trim() || [o.id, o.retailer, o.area].some((v) => v.toLowerCase().includes(q.trim().toLowerCase())))), [s.retailOrders, tab, area, q]);
  const count = (k: TabKey) => s.retailOrders.filter((o) => k === "all" || o.status === k).length;
  const cur = s.retailOrders.find((o) => o.id === sel) ?? null;
  const pick = (id: string) => { setSel(id); router.replace(`/console/distributor/orders?id=${id}`, { scroll: false }); };
  const shortOf = (o: RetailOrder) => o.lines.find((l) => (s.distStock.find((x) => x.sku === l.sku)?.onHand ?? 0) < l.qty);

  const pack = (o: RetailOrder) => {
    const short = shortOf(o);
    if (short) { toast(`Short on ${skuName(s, short.sku)}: ${s.distStock.find((x) => x.sku === short.sku)?.onHand ?? 0} on hand, ${short.qty} needed`, "bad"); return; }
    let ok = false;
    update((d) => { ok = packRetailOrder(d, o.id); });
    toast(ok ? `${o.id} packed` : `Couldn't pack ${o.id}`, ok ? "ok" : "bad");
  };
  const deliver = (o: RetailOrder) => { update((d) => deliverRetailOrder(d, o.id)); toast(`${o.id} delivered to ${o.retailer}`); };
  const cancel = (o: RetailOrder) => { update((d) => cancelRetailOrder(d, o.id)); toast(`${o.id} cancelled${o.status !== "New" ? "; stock returned" : ""}`); };
  const invoice = (o: RetailOrder) => { download(`Invoice-${o.id}.txt`, invoiceText(s, o), "text/plain"); toast("Invoice downloaded"); };
  const routeName = (id?: string) => s.routes.find((r) => r.id === id)?.name ?? "—";
  const areas = Array.from(new Set(s.retailOrders.map((o) => o.area))).sort();
  const openValue = s.retailOrders.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled").reduce((a, o) => a + o.value, 0);

  return (
    <div>
      <Hero
        eyebrow="ORDER  ·  PACK  ·  DELIVER"
        title="Retailer Orders"
        lede={<span className="lg:whitespace-nowrap">Orders from chemists and stores across {s.distributor.area}. Pack, route and deliver.</span>}
        img="/console/hero-reports.jpg"
        quote={["Packed right.", "Delivered on", "the route."]}
        height={148}
        quoteTop={36}
        quoteWidth={214}
      />
      <div className="px-[15px] pb-[20px]">
        <StatStrip
          items={[
            { icon: ClipboardList, tone: "orange", value: count("New"), label: "New Orders", delta: <span className="block truncate">{count("New") ? "pack from stock" : "all packed"}</span>, deltaTone: count("New") ? "bad" : "up" },
            { icon: PackageCheck, tone: "blue", value: count("Packed"), label: "Packed", delta: <span className="block truncate">{`${s.retailOrders.filter((o) => o.status === "Packed" && !o.routeId).length} without a route`}</span>, deltaTone: "muted" },
            { icon: Truck, tone: "violet", value: count("Out for Delivery"), label: "Out for Delivery", delta: <span className="block truncate">{`${new Set(s.retailOrders.filter((o) => o.status === "Out for Delivery").map((o) => o.routeId)).size} routes running`}</span>, deltaTone: "muted" },
            { icon: CheckCircle2, tone: "green", value: count("Delivered"), label: "Delivered", delta: <span className="block truncate">{`${s.retailOrders.filter((o) => o.status === "Delivered" && o.payment === "Due").length} awaiting payment`}</span> },
            { icon: BadgeIndianRupee, tone: "green", value: lakh(openValue), label: "Open Order Value", delta: <span className="block truncate">{`${count("all")} orders on record`}</span>, deltaTone: "muted" },
          ]}
        />

        <div className={cn("mt-[11px] grid gap-[11px] min-[1024px]:h-[745px]", cur && "min-[1024px]:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]")}>
          <section className="cs-card flex min-h-0 min-w-0 flex-col px-[14px] pt-[13px]">
            <div className="flex items-start gap-[10px]">
              <Tabs className="min-w-0 flex-1" value={tab} onChange={setTab} tabs={[{ key: "all", label: `All (${count("all")})` }, ...STATUSES.map((st) => ({ key: st as TabKey, label: `${st} (${count(st)})` }))]} />
              <Btn kind="primary" icon={Plus} className="h-[34px] shrink-0" onClick={() => setCreating(true)}>New order</Btn>
            </div>
            <div className="mt-[14px] flex flex-wrap items-center gap-[8px]">
              <SearchBox value={q} onChange={setQ} placeholder="Search by order, retailer or area..." className="min-w-[200px] flex-1" />
              <FilterSelect label="All areas" value={area} onChange={setArea} options={areas} className="w-[130px]" />
            </div>
            <div className="mt-[14px] min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-y-[1px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#f7f6f2]">
                    <th className={cn(th, "rounded-l-[6px] pl-[10px]")}>Order &amp; Retailer</th>
                    <th className={th}>Items</th>
                    <th className={th}>Value</th>
                    <th className={th}>Route</th>
                    <th className={th}>Status</th>
                    <th className={th}>Payment</th>
                    <th className={th}>Placed</th>
                    <th className={cn(th, "rounded-r-[6px]")}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((o) => {
                    const on = o.id === sel;
                    return (
                      <tr key={o.id} onClick={() => pick(o.id)} className={cn("cursor-pointer", on ? "[&>td]:border-y-[1.5px] [&>td]:border-cs-green-2/70 [&>td:first-child]:rounded-l-[8px] [&>td:first-child]:border-l-[1.5px] [&>td:last-child]:rounded-r-[8px] [&>td:last-child]:border-r-[1.5px] [&>td]:bg-[#fbfdfb]" : "[&>td]:border-b [&>td]:border-cs-line hover:[&>td]:bg-[#faf9f6]")}>
                        <td className="py-[10px] pl-[10px] pr-[8px]"><p className="text-[11.5px] font-semibold">{o.id}</p><p className="max-w-[190px] truncate text-[11px] text-[#3e4440]">{o.retailer}</p></td>
                        <td className="px-[8px] text-[11px] text-[#3e4440]">{o.lines.reduce((a, l) => a + l.qty, 0)} packs<span className="block text-cs-ink-2">{o.lines.length} SKU{o.lines.length === 1 ? "" : "s"}</span></td>
                        <td className="whitespace-nowrap px-[8px] text-[11.5px] font-medium">{inr(o.value)}</td>
                        <td className="px-[8px] text-[11px]">{routeName(o.routeId)}</td>
                        <td className="px-[8px]"><Pill tone={RO_TONE[o.status]}>{o.status}</Pill></td>
                        <td className="px-[8px]"><Pill tone={o.payment === "Collected" ? "green" : o.status === "Delivered" ? "red" : "gray"}>{o.payment}</Pill></td>
                        <td className="whitespace-nowrap px-[8px] text-[11px]">{fmtDate(o.at)}<span className="block text-cs-ink-2">{ago(o.at)}</span></td>
                        <td className="pr-[8px]">
                          <RowMenu items={[
                            { label: "Open", onClick: () => pick(o.id) },
                            { label: "Pack", icon: PackageCheck, disabled: o.status !== "New", onClick: () => pack(o) },
                            { label: "Mark delivered", icon: CheckCircle2, disabled: o.status !== "Out for Delivery", onClick: () => deliver(o) },
                            { label: "Collect payment", icon: BadgeIndianRupee, disabled: o.status !== "Delivered" || o.payment === "Collected", onClick: () => setCollect(o) },
                            { label: "Download invoice", icon: Download, onClick: () => invoice(o) },
                            "sep",
                            { label: "Cancel order", icon: Ban, danger: true, disabled: o.status === "Delivered" || o.status === "Cancelled", onClick: () => cancel(o) },
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {list.length === 0 && <Empty>No orders here.</Empty>}
            </div>
            <div className="h-[10px] shrink-0" />
          </section>

          {cur && (
            <section className="cs-card flex min-h-0 min-w-0 flex-col px-[16px] pb-[14px] pt-[14px]">
              <div className="flex items-start gap-[10px]">
                <span className="grid size-[46px] shrink-0 place-items-center rounded-[8px] bg-cs-mint text-cs-green"><ShoppingCart className="size-[22px]" strokeWidth={1.6} /></span>
                <div className="min-w-0 flex-1">
                  <p className="serif text-[19px] font-semibold leading-tight">{cur.id}</p>
                  <p className="truncate text-[12.5px] text-[#3e4440]">{cur.retailer} · {cur.area}</p>
                  <div className="mt-[5px] flex gap-[5px]"><Pill tone={RO_TONE[cur.status]}>{cur.status}</Pill><Pill tone={cur.payment === "Collected" ? "green" : "gray"}>{cur.payment}</Pill></div>
                </div>
                <button type="button" aria-label="Close" onClick={() => { setSel(null); router.replace("/console/distributor/orders", { scroll: false }); }} className="grid size-[28px] place-items-center rounded-[6px] hover:bg-[#f1f0ec]"><X className="size-[16px]" /></button>
              </div>

              <div className="mt-[14px] min-h-0 flex-1 overflow-y-auto">
                <CardTitle><span className="text-[17px]">Items</span></CardTitle>
                <table className="mt-[6px] w-full text-[12px]">
                  <tbody>
                    {cur.lines.map((l) => {
                      const st = s.distStock.find((x) => x.sku === l.sku);
                      const short = cur.status === "New" && (st?.onHand ?? 0) < l.qty;
                      return (
                        <tr key={l.sku} className="border-b border-cs-line">
                          <td className="py-[7px]"><b className="text-[11.5px]">{st?.product ?? l.sku}</b><span className={cn("block text-[10.5px]", short ? "text-cs-red" : "text-cs-ink-2")}>{l.sku} · {short ? `short: ${st?.onHand ?? 0} on hand` : `${inr(st?.price ?? 0)} each`}</span></td>
                          <td className="text-right">{l.qty}</td>
                          <td className="text-right font-medium">{inr((st?.price ?? 0) * l.qty)}</td>
                        </tr>
                      );
                    })}
                    <tr><td className="pt-[8px] font-semibold">Total</td><td /><td className="pt-[8px] text-right font-semibold">{inr(cur.value)}</td></tr>
                  </tbody>
                </table>

                <div className="mt-[14px]">
                  <span className="mb-[4px] block text-[11.5px] font-medium text-[#3e4440]">Route</span>
                  <select className={inputCls} value={cur.routeId ?? ""} disabled={cur.status === "Delivered" || cur.status === "Cancelled"} onChange={(e) => { const rid = e.target.value; update((d) => assignRoute(d, cur.id, rid)); toast(`${cur.id} assigned to ${routeName(rid)}`); }}>
                    <option value="" disabled>Choose a route</option>
                    {s.routes.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.day} · {r.areas.join(", ")}</option>)}
                  </select>
                </div>

                <dl className="mt-[12px] grid grid-cols-2 gap-[8px] text-[12px]">
                  {[["Placed", fmtDate(cur.at)], ["Delivered", cur.deliveredAt ? fmtDate(cur.deliveredAt) : "—"], ["Collected", cur.collected ? `${inr(cur.collected.amount)} · ${cur.collected.mode}` : "—"], ["Reference", cur.collected?.ref ?? "—"]].map(([k, v]) => (
                    <div key={k} className="rounded-[7px] border border-cs-line px-[9px] py-[6px]"><dt className="text-[10.5px] text-cs-ink-2">{k}</dt><dd className="font-medium">{v}</dd></div>
                  ))}
                </dl>
              </div>

              <div className="mt-[12px] grid grid-cols-2 gap-[8px] border-t border-cs-line pt-[12px]">
                {cur.status === "New" && <Btn kind="primary" icon={PackageCheck} onClick={() => pack(cur)}>Pack order</Btn>}
                {cur.status === "Packed" && <Btn kind="primary" icon={Truck} onClick={() => router.push("/console/distributor/routes")}>Go to routes</Btn>}
                {cur.status === "Out for Delivery" && <Btn kind="primary" icon={CheckCircle2} onClick={() => deliver(cur)}>Mark delivered</Btn>}
                {cur.status === "Delivered" && cur.payment === "Due" && <Btn kind="primary" icon={BadgeIndianRupee} onClick={() => setCollect(cur)}>Collect payment</Btn>}
                {(cur.status === "Cancelled" || (cur.status === "Delivered" && cur.payment === "Collected")) && <Btn kind="primary" icon={Plus} onClick={() => setCreating(true)}>New order</Btn>}
                <Btn icon={Download} onClick={() => invoice(cur)}>Invoice</Btn>
                {cur.status !== "Delivered" && cur.status !== "Cancelled" && <Btn kind="danger" icon={Ban} className="col-span-2" onClick={() => cancel(cur)}>Cancel order</Btn>}
              </div>
            </section>
          )}
        </div>
      </div>
      <NewOrderModal open={creating} onClose={() => setCreating(false)} onCreated={(id) => { setTab("all"); pick(id); }} />
      <CollectModal order={collect} onClose={() => setCollect(null)} />
    </div>
  );
}
