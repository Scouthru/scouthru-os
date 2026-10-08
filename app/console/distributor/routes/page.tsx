"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, MapPin, Pencil, Play, Plus, Route as RouteIcon, Truck, User, Users } from "lucide-react";
import { Btn, CardTitle, Hero, Pill, StatStrip, inputCls } from "@/components/console/kit";
import { RO_TONE, RouteModal } from "@/components/console/distributor-kit";
import { useConsole } from "@/lib/console/store";
import { assignRoute, deliverRetailOrder, startRoute } from "@/lib/console/actions-network";
import { inr } from "@/lib/console/format";
import type { Route } from "@/lib/console/types";
import { cn } from "@/lib/cn";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RoutesPage() {
  const { s, update, toast } = useConsole();
  const [edit, setEdit] = useState<Route | null>(null);
  const [adding, setAdding] = useState(false);
  const today = WEEKDAY[new Date().getDay()];
  const active = s.retailOrders.filter((o) => o.status === "Packed" || o.status === "Out for Delivery");
  const unassigned = s.retailOrders.filter((o) => o.status === "Packed" && !o.routeId);

  const start = (r: Route) => { let n = 0; update((d) => { n = startRoute(d, r.id); }); toast(`${r.name}: ${n} order${n === 1 ? "" : "s"} out for delivery`); };
  const deliver = (id: string) => { update((d) => deliverRetailOrder(d, id)); toast(`${id} delivered`); };
  const deliverAll = (r: Route) => {
    const ids = s.retailOrders.filter((o) => o.routeId === r.id && o.status === "Out for Delivery").map((o) => o.id);
    update((d) => ids.forEach((id) => deliverRetailOrder(d, id)));
    toast(`${ids.length} order${ids.length === 1 ? "" : "s"} delivered on ${r.name}`);
  };

  return (
    <div>
      <Hero
        eyebrow="PLAN  ·  LOAD  ·  DELIVER"
        title="Delivery Routes"
        lede={<span className="lg:whitespace-nowrap">Vans, drivers and the areas they cover. Start a route and mark each drop delivered.</span>}
        img="/console/hero-shipments.jpg"
        quote={["Right van.", "Right route.", "Every drop."]}
        height={142}
        quoteTop={32}
        quoteWidth={192}
      />
      <div className="px-[15px] pb-[20px]">
        <StatStrip
          items={[
            { icon: RouteIcon, tone: "green", value: s.routes.length, label: "Routes", delta: <span className="block truncate">{`${s.routes.filter((r) => r.day.includes(today)).length} run today (${today})`}</span>, deltaTone: "muted" },
            { icon: Truck, tone: "violet", value: s.retailOrders.filter((o) => o.status === "Out for Delivery").length, label: "Out for Delivery", delta: <span className="block truncate">{inr(s.retailOrders.filter((o) => o.status === "Out for Delivery").reduce((a, o) => a + o.value, 0)) + " on vans"}</span>, deltaTone: "muted" },
            { icon: CheckCircle2, tone: "blue", value: s.retailOrders.filter((o) => o.status === "Packed").length, label: "Packed, Waiting", delta: <span className="block truncate">{`${unassigned.length} without a route`}</span>, deltaTone: unassigned.length ? "bad" : "up" },
            { icon: MapPin, tone: "orange", value: new Set(s.routes.flatMap((r) => r.areas)).size, label: "Areas Covered", delta: <span className="block truncate">{s.distributor.area}</span>, deltaTone: "muted" },
            { icon: Users, tone: "green", value: new Set(s.routes.map((r) => r.driver)).size, label: "Drivers", delta: <span className="block truncate">{`${new Set(s.routes.map((r) => r.van)).size} vans`}</span>, deltaTone: "muted" },
          ]}
        />

        <div className="mt-[11px] grid gap-[11px] min-[1024px]:h-[751px] min-[1024px]:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
          <section className="cs-card flex min-h-0 min-w-0 flex-col px-[14px] pt-[14px]">
            <CardTitle sub="Packed orders are put on the route that covers their area." right={<Btn kind="primary" icon={Plus} className="h-[34px]" onClick={() => setAdding(true)}>Add route</Btn>}>Routes</CardTitle>
            <div className="mt-[12px] grid min-h-0 flex-1 auto-rows-min gap-[10px] overflow-y-auto pb-[12px] md:grid-cols-2">
              {s.routes.map((r) => {
                const orders = active.filter((o) => o.routeId === r.id);
                const packed = orders.filter((o) => o.status === "Packed");
                const out = orders.filter((o) => o.status === "Out for Delivery");
                return (
                  <article key={r.id} className="flex flex-col rounded-[10px] border border-cs-line p-[12px]" data-route={r.id}>
                    <div className="flex items-start gap-[8px]">
                      <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-cs-mint text-cs-green"><RouteIcon className="size-[17px]" strokeWidth={1.7} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-[6px] text-[13.5px] font-semibold">{r.name}{r.day.includes(today) && <Pill tone="green" className="py-[1px] text-[10.5px]">Today</Pill>}</p>
                        <p className="text-[11px] text-cs-ink-2">{r.day} · {r.areas.join(", ")}</p>
                      </div>
                      <button type="button" aria-label={`Edit ${r.name}`} onClick={() => setEdit(r)} className="grid size-[28px] place-items-center rounded-[6px] text-cs-ink-2 hover:bg-[#f1f0ec]"><Pencil className="size-[14px]" /></button>
                    </div>
                    <p className="mt-[8px] flex flex-wrap gap-x-[12px] gap-y-[2px] text-[11.5px] text-[#3e4440]"><span className="inline-flex items-center gap-[4px]"><Truck className="size-[13px]" />{r.van}</span><span className="inline-flex items-center gap-[4px]"><User className="size-[13px]" />{r.driver}</span></p>
                    <ul className="mt-[8px] space-y-[5px]">
                      {orders.map((o) => (
                        <li key={o.id} className="flex items-center gap-[8px] rounded-[7px] bg-[#f7f6f2] px-[9px] py-[6px] text-[11.5px]">
                          <Link href={`/console/distributor/orders?id=${o.id}`} className="min-w-0 flex-1 hover:text-cs-green"><b>{o.id}</b> · <span className="truncate">{o.retailer}</span></Link>
                          <Pill tone={RO_TONE[o.status]} className="py-[1px] text-[10.5px]">{o.status === "Out for Delivery" ? "Out" : o.status}</Pill>
                          {o.status === "Out for Delivery" && <button type="button" onClick={() => deliver(o.id)} className="text-[11px] font-medium text-cs-green hover:underline">Delivered</button>}
                        </li>
                      ))}
                      {orders.length === 0 && <li className="py-[6px] text-[11.5px] text-cs-ink-2">Nothing loaded on this route.</li>}
                    </ul>
                    <div className="mt-auto flex gap-[8px] pt-[10px]">
                      <Btn kind="primary" icon={Play} className="h-[32px] flex-1 text-[12px]" disabled={!packed.length} onClick={() => start(r)}>Start route{packed.length ? ` (${packed.length})` : ""}</Btn>
                      <Btn icon={CheckCircle2} className="h-[32px] flex-1 text-[12px]" disabled={!out.length} onClick={() => deliverAll(r)}>All delivered</Btn>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="cs-card flex min-h-0 min-w-0 flex-col px-[14px] pt-[14px]">
            <CardTitle sub="Packed orders with no route yet.">Unassigned</CardTitle>
            <ul className="mt-[10px] min-h-0 flex-1 space-y-[8px] overflow-y-auto pb-[12px]">
              {unassigned.map((o) => (
                <li key={o.id} className="rounded-[8px] border border-cs-line p-[10px]">
                  <p className="text-[12px]"><b>{o.id}</b> · {o.retailer}</p>
                  <p className="text-[11px] text-cs-ink-2">{o.area} · {inr(o.value)}</p>
                  <select className={cn(inputCls, "mt-[7px] h-[32px] text-[12px]")} value="" onChange={(e) => { const rid = e.target.value; update((d) => assignRoute(d, o.id, rid)); toast(`${o.id} put on ${s.routes.find((r) => r.id === rid)?.name}`); }} aria-label={`Route for ${o.id}`}>
                    <option value="" disabled>Put on a route…</option>
                    {s.routes.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.areas.join(", ")}</option>)}
                  </select>
                </li>
              ))}
              {unassigned.length === 0 && <li className="py-6 text-center text-[12.5px] text-cs-ink-2">Every packed order has a route.</li>}
            </ul>
          </section>
        </div>
      </div>
      <RouteModal route={edit} open={!!edit || adding} onClose={() => { setEdit(null); setAdding(false); }} />
    </div>
  );
}
