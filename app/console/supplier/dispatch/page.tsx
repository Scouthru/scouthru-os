"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Download, FileText, PackageCheck, Truck } from "lucide-react";
import { Btn, Empty, Field, Hero, RowMenu, SearchBox, StatStrip, Tabs, inputCls } from "@/components/console/kit";
import { Board, EventLog, LinesTable, StatusPill, buyerName, minePOs, poText, poValue, td, th } from "@/components/console/supplier-kit";
import { useConsole } from "@/lib/console/store";
import { dispatchPO } from "@/lib/console/actions-network";
import { ago, daysUntil, download, fmtDate, fmtDateTime, fmtNum, inr } from "@/lib/console/format";
import type { POStatus, PurchaseOrder } from "@/lib/console/types";
import { cn } from "@/lib/cn";

type TabKey = "ready" | "transit" | "delivered";
const TAB_STATUS: Record<TabKey, POStatus[]> = { ready: ["Confirmed"], transit: ["Dispatched"], delivered: ["Received", "Paid"] };

export default function Page() {
  return <Suspense><Dispatch /></Suspense>;
}

/** Stock short for any line of this PO (on hand, ignoring this PO's own reservation). */
function shortLines(s: ReturnType<typeof useConsole>["s"], po: PurchaseOrder) {
  return po.lines.filter((l) => (s.supplierStock.find((x) => x.sku === l.sku)?.onHand ?? 0) < l.qty);
}

function Dispatch() {
  const { s, update, toast } = useConsole();
  const params = useSearchParams();
  const all = minePOs(s).filter((p) => ["Confirmed", "Dispatched", "Received", "Paid"].includes(p.status));
  const [tab, setTab] = useState<TabKey>("ready");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(params.get("id"));
  const [vehicle, setVehicle] = useState("");

  useEffect(() => {
    const id = params.get("id");
    if (!id) return;
    setSel(id);
    const po = s.purchaseOrders.find((p) => p.id === id);
    if (po) setTab(po.status === "Confirmed" ? "ready" : po.status === "Dispatched" ? "transit" : "delivered");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all
      .filter((p) => TAB_STATUS[tab].includes(p.status))
      .filter((p) => !t || `${p.id} ${p.title} ${buyerName(s, p.mfrId)} ${p.vehicle ?? ""}`.toLowerCase().includes(t))
      .sort((a, b) => (tab === "ready" ? a.needBy.localeCompare(b.needBy) : b.updatedAt.localeCompare(a.updatedAt)));
  }, [all, tab, q, s]);

  const po = s.purchaseOrders.find((p) => p.id === sel && all.some((x) => x.id === p.id)) ?? list[0] ?? null;
  const n = (k: TabKey) => all.filter((p) => TAB_STATUS[k].includes(p.status)).length;
  const ready = all.filter((p) => p.status === "Confirmed");
  const dueSoon = ready.filter((p) => daysUntil(p.needBy) <= 3).length;
  const blocked = ready.filter((p) => shortLines(s, p).length > 0).length;
  const delivered = all.filter((p) => p.status === "Received" || p.status === "Paid");
  const onTime = delivered.filter((p) => { const r = [...p.events].reverse().find((e) => e.text.startsWith("Received")); return !r || r.at <= p.needBy; }).length;

  const doDispatch = () => {
    if (!po || !vehicle.trim()) return;
    update((d) => dispatchPO(d, po.id, vehicle.trim().toUpperCase()));
    toast(`${po.id} dispatched on ${vehicle.trim().toUpperCase()} · invoice raised`);
    setVehicle("");
    setTab("transit");
  };

  return (
    <div>
      <Hero eyebrow="PACK · LOAD · DELIVER" title="Dispatch" lede="Orders ready to load, what's on the road, and what factories have received." img="/console/hero-shipments.jpg" height={142} quoteTop={32} quoteWidth={192} quote={["Every dispatch.", "Visible.", "On time."]} />
      <div className="px-[15px] pb-[15px]">
        <StatStrip items={[
          { icon: PackageCheck, tone: "violet", value: ready.length, label: "Ready to Dispatch", delta: `${dueSoon} due in 3 days`, deltaTone: dueSoon ? "bad" : "muted" },
          { icon: AlertTriangle, tone: "red", value: blocked, label: "Short on Stock", delta: blocked ? "restock before loading" : "all lines covered", deltaTone: blocked ? "bad" : "muted" },
          { icon: Truck, tone: "blue", value: n("transit"), label: "On the Road", delta: "awaiting factory receipt", deltaTone: "muted" },
          { icon: CheckCircle2, tone: "green", value: delivered.length, label: "Delivered", delta: `${onTime} of ${delivered.length} on time` },
          { icon: CalendarClock, tone: "orange", value: inr(ready.reduce((a, p) => a + poValue(s, p), 0)), label: "Value to Ship", delta: "invoiced on dispatch", deltaTone: "muted" },
        ]} />

        <Board
          height={753}
          list={
            <>
              <Tabs tabs={[{ key: "ready", label: `Ready to dispatch (${n("ready")})` }, { key: "transit", label: `On the road (${n("transit")})` }, { key: "delivered", label: `Delivered (${n("delivered")})` }]} value={tab} onChange={(k) => { setTab(k); setSel(null); }} />
              <div className="mt-[12px] flex flex-wrap items-center gap-[7px]">
                <SearchBox value={q} onChange={setQ} placeholder="Search by PO, item, factory or vehicle..." className="w-full min-[1024px]:w-[300px]" />
              </div>
              <div className="mt-[12px] min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[620px] border-separate border-spacing-0 text-[12px]">
                  <thead><tr><th className={cn(th, "rounded-l-[6px]")}>Purchase order</th><th className={th}>Deliver to</th><th className={th}>Units</th><th className={th}>{tab === "ready" ? "Need by" : "Vehicle"}</th><th className={th}>Status</th><th className={cn(th, "rounded-r-[6px]")}><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {list.map((p) => {
                      const on = po?.id === p.id;
                      const short = p.status === "Confirmed" && shortLines(s, p).length > 0;
                      const m = s.manufacturers.find((x) => x.id === p.mfrId);
                      return (
                        <tr key={p.id} onClick={() => setSel(p.id)} className={cn("cursor-pointer", on ? "bg-cs-mint/50" : "hover:bg-[#faf9f6]")}>
                          <td className={cn(td, on && "border-l-2 border-l-cs-green")}><span className="block font-semibold text-[#1d211e]">{p.title}</span><span className="text-[10.5px] text-cs-ink-2">{p.id}</span></td>
                          <td className={td}>{m?.name}<span className="block text-[10.5px] text-cs-ink-2">{m?.city}, {m?.state}</span></td>
                          <td className={cn(td, "whitespace-nowrap")}>{fmtNum(p.lines.reduce((a, l) => a + l.qty, 0))}</td>
                          <td className={cn(td, "whitespace-nowrap")}>{tab === "ready" ? <>{fmtDate(p.needBy)}<span className={cn("block text-[10.5px]", daysUntil(p.needBy) <= 3 ? "text-cs-red" : "text-cs-ink-2")}>in {daysUntil(p.needBy)} days</span></> : <>{p.vehicle}<span className="block text-[10.5px] text-cs-ink-2">{ago(p.updatedAt)}</span></>}</td>
                          <td className={td}>{short ? <span className="text-[11.5px] font-medium text-cs-red">Short on stock</span> : <StatusPill status={p.status} />}</td>
                          <td className={cn(td, "w-[34px]")}>
                            <RowMenu items={[
                              { label: "Open", icon: FileText, onClick: () => setSel(p.id) },
                              { label: "Download delivery note", icon: Download, onClick: () => download(`${p.id}-delivery-note.txt`, poText(s, p), "text/plain") },
                            ]} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {list.length === 0 && <Empty>{tab === "ready" ? "Nothing waiting to ship." : "Nothing here yet."}</Empty>}
              </div>
            </>
          }
          panel={po ? (
            <>
              <div className="-mx-[4px] min-h-0 flex-1 overflow-y-auto px-[4px]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-cs-ink-2">{po.id}{po.orderId ? ` · for ${po.orderId}` : ""}</p>
                    <h2 className="serif mt-[4px] text-[19px] font-semibold leading-tight">{po.title}</h2>
                    <p className="mt-[2px] text-[12px] text-cs-ink-2">{buyerName(s, po.mfrId)}</p>
                  </div>
                  <StatusPill status={po.status} />
                </div>
                <p className="mt-[14px] text-[12.5px] font-semibold">Load list</p>
                <div className="mt-[4px]"><LinesTable po={po} /></div>
                {po.status === "Confirmed" && shortLines(s, po).length > 0 && (
                  <p className="mt-[8px] rounded-[7px] bg-cs-red-bg px-[10px] py-[7px] text-[11.5px] text-cs-red">Not enough stock for {shortLines(s, po).map((l) => l.sku).join(", ")}. <Link href="/console/supplier/stock" className="font-semibold underline">Receive stock</Link> before dispatching.</p>
                )}
                {po.status === "Confirmed" ? (
                  <div className="mt-[14px] space-y-[8px]">
                    <Field label="Vehicle number" hint="Shared with the factory so they can expect the truck."><input className={inputCls} value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="e.g. GJ-01-KT-4410" /></Field>
                    <p className="text-[11.5px] text-cs-ink-2">Dispatching deducts stock and raises invoice for {inr(poValue(s, po))}, due in 30 days.</p>
                  </div>
                ) : (
                  <dl className="mt-[14px] grid grid-cols-2 gap-[8px] text-[11.5px]">
                    <div className="rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-cs-ink-2">Vehicle</dt><dd className="font-semibold">{po.vehicle}</dd></div>
                    <div className="rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-cs-ink-2">Factory receipt</dt><dd className="font-semibold">{po.status === "Dispatched" ? "Awaiting" : fmtDateTime([...po.events].reverse().find((e) => e.text.startsWith("Received"))?.at ?? po.updatedAt)}</dd></div>
                    {po.invoice && <div className="col-span-2 rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-cs-ink-2">Invoice</dt><dd className="font-semibold">{po.invoice.no} · {inr(po.invoice.amount)}</dd></div>}
                  </dl>
                )}
                <p className="mt-[14px] text-[12.5px] font-semibold">History</p>
                <div className="mt-[6px]"><EventLog po={po} /></div>
              </div>
              <div className="mt-[10px] grid grid-cols-2 gap-[8px] border-t border-cs-line pt-[10px]">
                {po.status === "Confirmed"
                  ? <Btn kind="primary" icon={Truck} className="h-[38px] text-[12.5px]" disabled={!vehicle.trim() || shortLines(s, po).length > 0} onClick={doDispatch}>Dispatch</Btn>
                  : <Link href={`/console/supplier/payments?id=${po.id}`} className="inline-flex h-[38px] items-center justify-center rounded-[7px] bg-cs-green text-[12.5px] font-medium text-white">View invoice</Link>}
                <Btn icon={Download} className="h-[38px] text-[12.5px]" onClick={() => download(`${po.id}-delivery-note.txt`, poText(s, po), "text/plain")}>Delivery note</Btn>
              </div>
            </>
          ) : <Empty>Select an order to dispatch.</Empty>}
        />
      </div>
    </div>
  );
}
