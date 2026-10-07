"use client";

import Link from "next/link";
import { useState } from "react";
import { Pill, StageTrack } from "@/components/ui";
import type { Order } from "@/lib/types";
import { ORDER_STEPS, STAGE_LABEL, orderTrack } from "@/lib/ops";
import { fmt } from "@/lib/store";
import { cn } from "@/lib/cn";

export const HEALTH_TONE: Record<Order["health"], "ok" | "bad" | "warn" | "info" | "neutral"> = {
  "On track": "ok",
  "Delayed 3d": "bad",
  Action: "warn",
  "In transit": "info",
  Closing: "neutral",
  Completed: "ok",
  "Awaiting factory": "warn",
};

/** Where the order page for a given order lives: QC and delivery have their own screens. */
export function orderHref(o: Order) {
  return `/brand/orders/${o.id}`;
}

export function stageText(o: Order) {
  if (o.stage === "production") return `Production · Ph ${o.phases[0].status === "done" ? 2 : 1}`;
  return STAGE_LABEL[o.stage];
}

export function OrdersTable({ orders, filters = true }: { orders: Order[]; filters?: boolean }) {
  const [f, setF] = useState<"all" | "production" | "pay">("all");
  const list = orders.filter((o) => (f === "all" ? true : f === "production" ? o.stage === "production" : o.payments.some((p) => p.status === "due")));
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
        <h2 className="desk text-[21px]">Active orders</h2>
        {filters && (
          <div className="flex gap-1.5">
            {([["all", `All ${orders.length}`], ["production", `Production ${orders.filter((o) => o.stage === "production").length}`], ["pay", `Awaiting payment ${orders.filter((o) => o.payments.some((p) => p.status === "due")).length}`]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setF(k)} className={cn("rounded-full px-3 py-1 text-[12px]", f === k ? "bg-info-bg font-semibold text-info" : "bg-soft text-ink-2")}>{l}</button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead><tr><th className="th pl-6">Order</th><th className="th">Factory</th><th className="th">Stage</th><th className="th">Next milestone</th><th className="th">Due</th><th className="th pr-6">Status</th></tr></thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id} className="hover:bg-soft/50">
                <td className="td pl-6"><Link href={orderHref(o)} className="font-semibold text-ink hover:text-flame">{o.id}</Link><p className="whitespace-nowrap text-[12px] text-ink-2">{o.product} · {fmt(o.qty)} {o.uom}</p></td>
                <td className="td"><span className="block whitespace-nowrap">{o.factory}</span>{o.factoryCity && <span className="text-[12px] text-ink-2">{o.factoryCity}</span>}</td>
                <td className="td"><StageTrack steps={ORDER_STEPS} {...orderTrack(o)} /></td>
                <td className="td">{o.next}</td>
                <td className="td num">{o.due}</td>
                <td className="td pr-6"><Pill tone={HEALTH_TONE[o.health]}>{o.health}</Pill></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="td pl-6 text-ink-2">Nothing here.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
