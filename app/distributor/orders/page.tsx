"use client";

import Link from "next/link";
import { useState } from "react";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Pill, StageTrack } from "@/components/ui";
import { RETAIL_CTA, RETAIL_STEPS, retailAct, retailTrack } from "@/lib/ops";
import { OverdueRetailers, RoutesRow, SchemeClaims } from "@/components/distributor";
import { inr, useStore } from "@/lib/store";
import { cn } from "@/lib/cn";

export default function RetailerOrders() {
  const { s, update, toast } = useStore();
  const [tab, setTab] = useState<"all" | "short" | "hold">("all");
  const rows = s.retailerOrders.filter((o) => tab === "all" || (tab === "short" ? o.status === "Short 2 SKUs" : o.status === "Credit hold"));
  function act(id: string) {
    let msg = "";
    update((d) => { msg = retailAct(d, id); });
    setTimeout(() => toast(msg), 0);
  }

  return (
    <>
      <DeskHeader back={{ href: "/distributor", label: "Distribution desk" }} title="Retailer orders & collections" actions={<><Btn onClick={() => toast("Secondary sales report shared with 6 brands")}>Share sales report with brands</Btn><Btn variant="flame" onClick={() => { update((d) => { d.routes.forEach((r) => { if (r.status === "Loading") { r.status = "Out"; r.note = ""; } }); }); toast("Vans loaded and dispatched"); }}>Load vans</Btn></>} />
      <RoutesRow />
      <Panel className="mt-5" pad={false} title="Orders" right={
        <div className="flex gap-1.5">
          {([["all", `All ${s.retailerOrders.length}`], ["short", "Short stock"], ["hold", "Credit hold"]] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cn("rounded-full px-3 py-1 text-[12px]", tab === k ? "bg-info-bg font-semibold text-info" : "bg-soft")}>{l}</button>)}
        </div>
      }>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead><tr><th className="th pl-6">Retailer</th><th className="th">Source</th><th className="th">Items</th><th className="th">Value</th><th className="th">Scheme</th><th className="th">Credit</th><th className="th">Stage</th><th className="th pr-6" /></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="td pl-6"><Link href={`/distributor/orders/${o.id}`} className="font-semibold text-ink hover:text-flame">{o.retailer}</Link><p className="text-[12px] text-ink-2">{o.area}</p></td>
                  <td className="td">{o.source}</td>
                  <td className="td">{o.lines} SKUs</td>
                  <td className="td num">{inr(o.value)}</td>
                  <td className="td">{o.scheme}</td>
                  <td className="td"><Pill tone={o.credit === "Over limit" ? "bad" : o.credit === "OK" ? "ok" : "neutral"}>{o.credit}</Pill></td>
                  <td className="td"><StageTrack steps={RETAIL_STEPS} {...retailTrack(o)} /></td>
                  <td className="td pr-6">{RETAIL_CTA[o.status] === "Open" ? <Btn size="sm" href={`/distributor/orders/${o.id}`}>Open</Btn> : <Btn size="sm" onClick={() => act(o.id)}>{RETAIL_CTA[o.status]}</Btn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <OverdueRetailers />
        <SchemeClaims />
      </div>
    </>
  );
}
