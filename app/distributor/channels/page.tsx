"use client";

import { useState } from "react";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Modal, Pill, Tag } from "@/components/ui";
import { inr, useStore } from "@/lib/store";
import { cn } from "@/lib/cn";

const CHANNELS = [["WhatsApp", "Connected", 11, 41000], ["Salesman app", "Connected", 9, 66000], ["Udaan", "Connected", 4, 24000], ["ONDC", "Connected", 3, 9800], ["Calls", "Scouthru number", 2, 7200]] as const;
const PORTALS = [["Ruchika Foods", "On Scouthru · orders, schemes, claims synced", "Native", "info"], ["Spicewell DMS", "Primary orders + invoices imported daily", "Connected", "ok"], ["Amma Pickles portal", "Upload claims and sales report weekly", "Email export", "warn"], ["Desi Dairy", "Orders by WhatsApp to area manager", "From WhatsApp", "ok"]] as const;

export default function DistChannels() {
  const { s, update, toast } = useStore();
  const [tab, setTab] = useState<"all" | "confirm" | "dup">("all");
  const [jumbo, setJumbo] = useState(false);
  const [connect, setConnect] = useState(false);
  const rows = s.retailerOrders.filter((o) => tab === "all" || (tab === "confirm" ? ["New", "Credit hold", "Short 2 SKUs"].includes(o.status) : o.inbox.includes("+")));
  const onHand = 18420;
  const reserved = s.retailerOrders.filter((o) => !["Delivered", "Paid"].includes(o.status)).reduce((a, o) => a + o.lines * 24, 0);

  function act(id: string, status: string) {
    update((d) => {
      const o = d.retailerOrders.find((x) => x.id === id)!;
      if (status === "New") o.status = "Picking";
      else if (status === "Credit hold") { o.status = "Picking"; o.credit = "OK"; }
      else if (status === "Short 2 SKUs") { o.status = "Picking"; o.stock = "All in"; }
    });
    toast(status === "Credit hold" ? "Approved over limit. Added to Route B." : status === "Short 2 SKUs" ? "Duplicate merged, substitutes offered for 2 SKUs" : "Confirmed. Reply sent back on the channel it came from.");
  }

  return (
    <>
      <DeskHeader kicker="One source for every platform" title="All channels" sub="Retailer orders from WhatsApp, salesmen, B2B apps, ONDC and calls, plus brand portals, in one list on one stock pool." actions={<Btn onClick={() => setConnect(true)}>+ Connect a platform</Btn>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Selling channels · today" right="Orders · value">
          <ul className="divide-y divide-line text-[14px]">
            {CHANNELS.map(([n, st, c, v]) => <li key={n} className="flex items-center justify-between py-2"><span className="flex items-center gap-2 font-semibold">{n}<Pill tone="ok">{st}</Pill></span><span className="num">{c} · {inr(v)}</span></li>)}
            <li className="flex items-center justify-between py-2"><span className="flex items-center gap-2 font-semibold">Jumbotail<Pill tone={jumbo ? "ok" : "neutral"}>{jumbo ? "Connected" : "Not connected"}</Pill></span>{jumbo ? <span className="num">0 · ₹0</span> : <Btn size="sm" onClick={() => { setJumbo(true); toast("Jumbotail connected"); }}>Connect</Btn>}</li>
          </ul>
        </Panel>
        <Panel title="Brand portals & DMS" right="Stop logging in to each one">
          <ul className="divide-y divide-line">
            {PORTALS.map(([n, d, st, t]) => <li key={n} className="flex items-center justify-between gap-3 py-2"><span><b className="block text-[14px]">{n}</b><span className="text-[12px] text-ink-2">{d}</span></span><Pill tone={t}>{st}</Pill></li>)}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-5" pad={false} title="Unified order inbox" right={
        <div className="flex gap-1.5">
          {([["all", `All ${s.retailerOrders.length}`], ["confirm", "Needs confirm"], ["dup", "Duplicates merged"]] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cn("rounded-full px-3 py-1 text-[12px]", tab === k ? "bg-info-bg font-semibold text-info" : "bg-soft")}>{l}</button>)}
        </div>
      }>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead><tr><th className="th pl-6">Source</th><th className="th">Retailer</th><th className="th">Order</th><th className="th">Value</th><th className="th">Stock</th><th className="th">Credit</th><th className="th">Status</th><th className="th pr-6" /></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="td pl-6"><div className="flex flex-wrap gap-1">{o.inbox.split(" + ").map((x, i) => <Tag key={x} className={i ? "bg-info-bg text-info" : ""}>{i ? `+ ${x}` : x}</Tag>)}</div></td>
                  <td className="td"><b>{o.retailer}</b><p className="text-[12px] text-ink-2">{o.area}</p></td>
                  <td className="td">{o.lines} SKUs</td>
                  <td className="td num">{inr(o.value)}</td>
                  <td className="td"><Pill tone={o.stock === "All in" ? "ok" : "warn"}>{o.stock}</Pill></td>
                  <td className="td"><Pill tone={o.credit === "Over limit" ? "bad" : o.credit === "OK" ? "ok" : "neutral"}>{o.credit}</Pill></td>
                  <td className="td">{o.inbox.includes("voice") && o.status === "New" ? "Auto-transcribed" : o.inbox.includes("+") && o.status !== "Picking" ? "Merged duplicate" : o.credit === "Prepaid" && o.status === "New" ? "Paid online" : o.status === "Credit hold" ? "Held" : o.status}</td>
                  <td className="td pr-6">{["New", "Credit hold", "Short 2 SKUs"].includes(o.status) ? <Btn size="sm" variant={o.status === "New" ? "pine" : "outline"} onClick={() => act(o.id, o.status)}>{o.status === "New" ? (o.credit === "Prepaid" ? "Accept" : "Confirm") : o.status === "Credit hold" ? "Approve" : "Review"}</Btn> : <Btn size="sm" onClick={() => toast(o.status === "Delivered" ? "Receipt sent on WhatsApp" : `${o.retailer}: ${o.route}`)}>{o.status === "Delivered" ? "Receipt" : "Open"}</Btn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="One stock pool">
          <p className="-mt-1 text-[13px] text-ink-2">Stock you take on any channel is reserved everywhere, so you never sell the same carton twice.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[["On hand", onHand], ["Reserved", reserved], ["Sellable", onHand - reserved]].map(([k, v]) => <div key={k} className="rounded-[10px] bg-soft p-3"><p className="cap">{k}</p><p className="num mt-1 text-[24px]">{(v as number).toLocaleString("en-IN")}</p></div>)}
          </div>
        </Panel>
        <Panel title="Every order, whatever the source">
          <ol className="list-decimal space-y-1.5 pl-5 text-[14px]">
            <li>Pulled in from each app, WhatsApp text or voice, and the salesman app</li>
            <li>Same retailer ordering twice on two channels gets flagged and merged</li>
            <li>Checked against sellable stock and the retailer&apos;s credit limit</li>
            <li>Confirmation goes back on the channel it came from</li>
            <li>Added to a van route; payment tracked to collection</li>
          </ol>
        </Panel>
      </div>
      <Modal open={connect} onClose={() => setConnect(false)} title="Connect a platform">
        <ul className="divide-y divide-line text-[14px]">
          {["Jumbotail", "Brand DMS (API)", "Email order forward"].map((p) => <li key={p} className="flex items-center justify-between py-2.5"><span>{p}</span><Btn size="sm" variant="pine" onClick={() => { if (p === "Jumbotail") setJumbo(true); toast(`${p} connected`); setConnect(false); }}>Connect</Btn></li>)}
        </ul>
      </Modal>
    </>
  );
}
