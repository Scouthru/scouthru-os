"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Download, FileText, IndianRupee, MessageSquare, PackageCheck, Truck } from "lucide-react";
import { Btn, Empty, FilterSelect, Hero, RowMenu, SearchBox, StatStrip, Tabs } from "@/components/console/kit";
import { MessageModal } from "@/components/console/making";
import { Board, EventLog, LinesTable, PoStepper, SourceBadge, StatusPill, buyerName, minePOs, poText, poValue, td, th } from "@/components/console/supplier-kit";
import { useConsole } from "@/lib/console/store";
import { ago, download, fmtDate, fmtNum, inr } from "@/lib/console/format";
import type { PurchaseOrder } from "@/lib/console/types";
import { cn } from "@/lib/cn";

type TabKey = "Confirmed" | "Dispatched" | "Received" | "Paid";
const TABS: TabKey[] = ["Confirmed", "Dispatched", "Received", "Paid"];

export default function Page() {
  return <Suspense><POs /></Suspense>;
}

function POs() {
  const { s } = useConsole();
  const params = useSearchParams();
  const all = minePOs(s).filter((p) => (TABS as string[]).includes(p.status));
  const [tab, setTab] = useState<TabKey>("Confirmed");
  const [q, setQ] = useState("");
  const [buyer, setBuyer] = useState("");
  const [sel, setSel] = useState<string | null>(params.get("id"));
  const [msgFor, setMsgFor] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    const id = params.get("id");
    if (!id) return;
    setSel(id);
    const po = s.purchaseOrders.find((p) => p.id === id);
    if (po && (TABS as string[]).includes(po.status)) setTab(po.status as TabKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all
      .filter((p) => p.status === tab)
      .filter((p) => !t || `${p.id} ${p.title} ${buyerName(s, p.mfrId)} ${p.orderId ?? ""}`.toLowerCase().includes(t))
      .filter((p) => !buyer || buyerName(s, p.mfrId) === buyer)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [all, tab, q, buyer, s]);

  const po = s.purchaseOrders.find((p) => p.id === sel && (TABS as string[]).includes(p.status)) ?? list[0] ?? null;
  const n = (k: TabKey) => all.filter((p) => p.status === k).length;
  const book = all.reduce((a, p) => a + poValue(s, p), 0);

  return (
    <div>
      <Hero eyebrow="ORDERS · LINES · HISTORY" title="Purchase Orders" lede="Confirmed orders from factories, and everything after: dispatch, delivery, payment." img="/console/hero-reports.jpg" height={148} quoteTop={36} quoteWidth={214} quote={["Every order.", "Every line.", "On record."]} />
      <div className="px-[15px] pb-[15px]">
        <StatStrip items={[
          { icon: ClipboardList, tone: "violet", value: n("Confirmed"), label: "To Dispatch", delta: n("Confirmed") ? "waiting on you" : "all shipped", deltaTone: n("Confirmed") ? "bad" : "muted" },
          { icon: Truck, tone: "blue", value: n("Dispatched"), label: "In Transit", delta: "to factories", deltaTone: "muted" },
          { icon: PackageCheck, tone: "green", value: n("Received"), label: "Delivered, Unpaid", delta: inr(all.filter((p) => p.status === "Received").reduce((a, p) => a + (p.invoice?.amount ?? 0), 0)) },
          { icon: CheckCircle2, tone: "green", value: n("Paid"), label: "Closed & Paid", delta: inr(all.filter((p) => p.status === "Paid").reduce((a, p) => a + (p.invoice?.amount ?? 0), 0)) },
          { icon: IndianRupee, tone: "orange", value: inr(book), label: "Order Book", delta: `${all.length} purchase orders`, deltaTone: "muted" },
        ]} />

        <Board
          height={747}
          list={
            <>
              <Tabs tabs={TABS.map((k) => ({ key: k, label: `${k} (${n(k)})` }))} value={tab} onChange={(k) => { setTab(k); setSel(null); }} />
              <div className="mt-[12px] flex flex-wrap items-center gap-[7px]">
                <SearchBox value={q} onChange={setQ} placeholder="Search by PO, item, factory or order..." className="w-full min-[1024px]:w-[280px]" />
                <FilterSelect label="Buyer" value={buyer} onChange={setBuyer} options={Array.from(new Set(all.map((p) => buyerName(s, p.mfrId))))} className="w-[160px]" />
                <Btn icon={Download} className="ml-auto h-[34px] text-[12px]" onClick={() => download(`purchase-orders-${tab.toLowerCase()}.csv`, ["PO,Title,Buyer,Status,Need by,Value", ...list.map((p) => `${p.id},"${p.title}","${buyerName(s, p.mfrId)}",${p.status},${fmtDate(p.needBy)},${poValue(s, p)}`)].join("\n"))}>Export</Btn>
              </div>
              <div className="mt-[12px] min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[620px] border-separate border-spacing-0 text-[12px]">
                  <thead><tr><th className={cn(th, "rounded-l-[6px]")}>Purchase order</th><th className={th}>Buyer</th><th className={th}>For order</th><th className={th}>Value</th><th className={th}>Need by</th><th className={th}>Updated</th><th className={cn(th, "rounded-r-[6px]")}><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {list.map((p) => {
                      const on = po?.id === p.id;
                      return (
                        <tr key={p.id} onClick={() => setSel(p.id)} className={cn("cursor-pointer", on ? "bg-cs-mint/50" : "hover:bg-[#faf9f6]")}>
                          <td className={cn(td, on && "border-l-2 border-l-cs-green")}><span className="block font-semibold text-[#1d211e]">{p.title}</span><span className="text-[10.5px] text-cs-ink-2">{p.id} · {p.lines.length} line{p.lines.length > 1 ? "s" : ""}</span></td>
                          <td className={td}>{buyerName(s, p.mfrId)}</td>
                          <td className={cn(td, "whitespace-nowrap")}>{p.orderId ?? "—"}</td>
                          <td className={cn(td, "whitespace-nowrap font-medium")}>{inr(poValue(s, p))}</td>
                          <td className={cn(td, "whitespace-nowrap")}>{fmtDate(p.needBy)}</td>
                          <td className={cn(td, "whitespace-nowrap text-cs-ink-2")}>{ago(p.updatedAt)}</td>
                          <td className={cn(td, "w-[34px]")}>
                            <RowMenu items={[
                              { label: "Open", icon: FileText, onClick: () => setSel(p.id) },
                              { label: "Download PO", icon: Download, onClick: () => download(`${p.id}.txt`, poText(s, p), "text/plain") },
                              { label: "Message buyer", icon: MessageSquare, onClick: () => setMsgFor(p) },
                            ]} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {list.length === 0 && <Empty>No {tab.toLowerCase()} purchase orders.</Empty>}
              </div>
            </>
          }
          panel={po ? (
            <>
              <div className="-mx-[4px] min-h-0 flex-1 overflow-y-auto px-[4px]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-cs-ink-2">{po.id} · <SourceBadge source={po.source} /></p>
                    <h2 className="serif mt-[4px] text-[19px] font-semibold leading-tight">{po.title}</h2>
                    <p className="mt-[2px] text-[12px] text-cs-ink-2">{buyerName(s, po.mfrId)}</p>
                  </div>
                  <StatusPill status={po.status} />
                </div>
                <div className="mt-[14px]"><PoStepper po={po} /></div>
                <dl className="mt-[14px] grid grid-cols-2 gap-[8px] text-[11.5px]">
                  <div className="rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-cs-ink-2">Order value</dt><dd className="font-semibold">{inr(poValue(s, po))}</dd></div>
                  <div className="rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-cs-ink-2">Lead time</dt><dd className="font-semibold">{po.quote ? `${po.quote.leadDays} days` : "—"}</dd></div>
                  <div className="rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-cs-ink-2">Need by</dt><dd className="font-semibold">{fmtDate(po.needBy)}</dd></div>
                  <div className="rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-cs-ink-2">Vehicle</dt><dd className="font-semibold">{po.vehicle ?? "Not dispatched"}</dd></div>
                  {po.invoice && <div className="col-span-2 rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-cs-ink-2">Invoice</dt><dd className="font-semibold">{po.invoice.no} · {inr(po.invoice.amount)} · {po.invoice.paidAt ? `paid ${fmtDate(po.invoice.paidAt)}` : `due ${fmtDate(po.invoice.due)}`}</dd></div>}
                </dl>
                <p className="mt-[14px] text-[12.5px] font-semibold">Items</p>
                <div className="mt-[4px]"><LinesTable po={po} /></div>
                <p className="mt-[6px] text-[11px] text-cs-ink-2">{fmtNum(po.lines.reduce((a, l) => a + l.qty, 0))} units in total</p>
                <p className="mt-[14px] text-[12.5px] font-semibold">History</p>
                <div className="mt-[6px]"><EventLog po={po} /></div>
              </div>
              <div className="mt-[10px] grid grid-cols-2 gap-[8px] border-t border-cs-line pt-[10px]">
                {po.status === "Confirmed"
                  ? <Link href={`/console/supplier/dispatch?id=${po.id}`} className="inline-flex h-[38px] items-center justify-center gap-[7px] rounded-[7px] bg-cs-green text-[12.5px] font-medium text-white"><Truck className="size-[15px]" />Dispatch</Link>
                  : po.invoice ? <Link href={`/console/supplier/payments?id=${po.id}`} className="inline-flex h-[38px] items-center justify-center gap-[7px] rounded-[7px] bg-cs-green text-[12.5px] font-medium text-white"><IndianRupee className="size-[15px]" />Invoice</Link> : <span />}
                <Btn icon={Download} className="h-[38px] text-[12.5px]" onClick={() => download(`${po.id}.txt`, poText(s, po), "text/plain")}>Download PO</Btn>
                <Btn icon={MessageSquare} className="col-span-2 h-[38px] text-[12.5px]" onClick={() => setMsgFor(po)}>Message buyer</Btn>
              </div>
            </>
          ) : <Empty>Select a purchase order to see its details.</Empty>}
        />
      </div>
      {msgFor && <MessageModal open onClose={() => setMsgFor(null)} to={buyerName(s, msgFor.mfrId)} subject={`About ${msgFor.id}: ${msgFor.title}`} href={`/console/maker/materials?id=${msgFor.id}`} />}
    </div>
  );
}
