"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, Clock, Download, FileText, IndianRupee, Receipt } from "lucide-react";
import { Btn, Empty, FilterSelect, Hero, Pill, RowMenu, SearchBox, StatStrip, Tabs } from "@/components/console/kit";
import { Board, EventLog, buyerName, isOverdue, minePOs, td, th } from "@/components/console/supplier-kit";
import { useConsole } from "@/lib/console/store";
import { remindInvoice } from "@/lib/console/actions-supplier";
import { daysUntil, download, fmtDate, fmtNum, inr } from "@/lib/console/format";
import type { ConsoleState, PurchaseOrder } from "@/lib/console/types";
import { cn } from "@/lib/cn";

type TabKey = "outstanding" | "overdue" | "paid" | "all";

export default function Page() {
  return <Suspense><Payments /></Suspense>;
}

function invoiceText(s: ConsoleState, po: PurchaseOrder) {
  const inv = po.invoice!;
  const sup = s.suppliers.find((x) => x.id === po.supplierId);
  const m = s.manufacturers.find((x) => x.id === po.mfrId);
  return [
    `TAX INVOICE ${inv.no}`,
    `From: ${sup?.name}, ${sup?.city}, ${sup?.state}`,
    `To: ${m?.name}, ${m?.city}, ${m?.state}`,
    `Against PO: ${po.id} · ${po.title}`,
    "",
    ...po.lines.map((l) => `  ${l.sku}  ${l.name}  ×  ${fmtNum(l.qty)} ${l.unit}`),
    "",
    `Amount: ${inr(inv.amount)}`,
    `Due: ${fmtDate(inv.due)}`,
    inv.paidAt ? `Paid: ${fmtDate(inv.paidAt)} · ref ${inv.ref}` : "Status: unpaid",
  ].join("\n");
}

function statusOf(po: PurchaseOrder) {
  if (po.invoice?.paidAt) return { label: "Paid", tone: "green" as const };
  if (isOverdue(po)) return { label: "Overdue", tone: "red" as const };
  return { label: "Due", tone: "orange" as const };
}

function Payments() {
  const { s, update, toast } = useConsole();
  const params = useSearchParams();
  const all = minePOs(s).filter((p) => p.invoice);
  const [tab, setTab] = useState<TabKey>(() => {
    const open = all.filter((p) => !p.invoice!.paidAt);
    return open.some((p) => !isOverdue(p)) ? "outstanding" : open.some(isOverdue) ? "overdue" : "all";
  });
  const [q, setQ] = useState("");
  const [buyer, setBuyer] = useState("");
  const [sel, setSel] = useState<string | null>(params.get("id"));

  useEffect(() => {
    const id = params.get("id");
    if (!id) return;
    setSel(id);
    const po = s.purchaseOrders.find((p) => p.id === id);
    if (po?.invoice) setTab(po.invoice.paidAt ? "paid" : isOverdue(po) ? "overdue" : "outstanding");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const inTab = (p: PurchaseOrder, k: TabKey) => k === "all" || (k === "paid" ? !!p.invoice?.paidAt : k === "overdue" ? isOverdue(p) : !p.invoice?.paidAt && !isOverdue(p));
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all
      .filter((p) => inTab(p, tab))
      .filter((p) => !t || `${p.invoice!.no} ${p.id} ${p.title} ${buyerName(s, p.mfrId)}`.toLowerCase().includes(t))
      .filter((p) => !buyer || buyerName(s, p.mfrId) === buyer)
      .sort((a, b) => a.invoice!.due.localeCompare(b.invoice!.due));
  }, [all, tab, q, buyer, s]);

  const po = s.purchaseOrders.find((p) => p.id === sel && p.invoice) ?? list[0] ?? null;
  const unpaid = all.filter((p) => !p.invoice!.paidAt);
  const overdue = unpaid.filter(isOverdue);
  const paid = all.filter((p) => p.invoice!.paidAt);
  const dso = paid.length ? Math.round(paid.reduce((a, p) => a + (new Date(p.invoice!.paidAt!).getTime() - (new Date(p.invoice!.due).getTime() - 30 * 864e5)) / 864e5, 0) / paid.length) : 0;
  const n = (k: TabKey) => all.filter((p) => inTab(p, k)).length;
  const remind = (p: PurchaseOrder) => { update((d) => remindInvoice(d, p.id)); toast(`Reminder sent to ${buyerName(s, p.mfrId)} for ${p.invoice!.no}`); };

  return (
    <div>
      <Hero eyebrow="INVOICES · RECEIVABLES · REMINDERS" title="Payments" lede="Invoices raised on dispatch, what factories owe, and what's been paid." img="/console/hero-payments.jpg" height={146} quoteTop={16} quoteWidth={192} quote={["Clarity in", "payments.", "Confidence in", "every invoice."]} />
      <div className="px-[15px] pb-[15px]">
        <StatStrip items={[
          { icon: IndianRupee, tone: "green", value: inr(unpaid.reduce((a, p) => a + p.invoice!.amount, 0)), label: "Receivables", delta: `${unpaid.length} open invoices`, deltaTone: "muted" },
          { icon: AlertTriangle, tone: "red", value: inr(overdue.reduce((a, p) => a + p.invoice!.amount, 0)), label: "Overdue", delta: `${overdue.length} invoice${overdue.length === 1 ? "" : "s"}`, deltaTone: overdue.length ? "bad" : "muted" },
          { icon: CheckCircle2, tone: "green", value: inr(paid.reduce((a, p) => a + p.invoice!.amount, 0)), label: "Collected", delta: `${paid.length} paid` },
          { icon: Clock, tone: "orange", value: `${dso} days`, label: "Avg Days to Pay", delta: "from invoice date", deltaTone: "muted" },
          { icon: Receipt, tone: "blue", value: all.length, label: "Invoices Raised", delta: "on dispatch", deltaTone: "muted" },
        ]} />

        <Board
          height={749}
          list={
            <>
              <Tabs tabs={[{ key: "outstanding", label: `Outstanding (${n("outstanding")})` }, { key: "overdue", label: `Overdue (${n("overdue")})` }, { key: "paid", label: `Paid (${n("paid")})` }, { key: "all", label: `All (${n("all")})` }]} value={tab} onChange={(k) => { setTab(k); setSel(null); }} />
              <div className="mt-[12px] flex flex-wrap items-center gap-[7px]">
                <SearchBox value={q} onChange={setQ} placeholder="Search by invoice, PO or factory..." className="w-full min-[1024px]:w-[280px]" />
                <FilterSelect label="Buyer" value={buyer} onChange={setBuyer} options={Array.from(new Set(all.map((p) => buyerName(s, p.mfrId))))} className="w-[160px]" />
              </div>
              <div className="mt-[12px] min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[620px] border-separate border-spacing-0 text-[12px]">
                  <thead><tr><th className={cn(th, "rounded-l-[6px]")}>Invoice</th><th className={th}>Buyer</th><th className={th}>Amount</th><th className={th}>Due</th><th className={th}>Status</th><th className={cn(th, "rounded-r-[6px]")}><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {list.map((p) => {
                      const on = po?.id === p.id;
                      const st = statusOf(p);
                      const d = daysUntil(p.invoice!.due);
                      return (
                        <tr key={p.id} onClick={() => setSel(p.id)} className={cn("cursor-pointer", on ? "bg-cs-mint/50" : "hover:bg-[#faf9f6]")}>
                          <td className={cn(td, on && "border-l-2 border-l-cs-green")}><span className="block font-semibold text-[#1d211e]">{p.invoice!.no}</span><span className="text-[10.5px] text-cs-ink-2">{p.id} · {p.title}</span></td>
                          <td className={td}>{buyerName(s, p.mfrId)}</td>
                          <td className={cn(td, "whitespace-nowrap font-medium")}>{inr(p.invoice!.amount)}</td>
                          <td className={cn(td, "whitespace-nowrap")}>{fmtDate(p.invoice!.due)}{!p.invoice!.paidAt && <span className={cn("block text-[10.5px]", d < 0 ? "text-cs-red" : "text-cs-ink-2")}>{d < 0 ? `${-d} days late` : `in ${d} days`}</span>}</td>
                          <td className={td}><Pill tone={st.tone}>{st.label}</Pill></td>
                          <td className={cn(td, "w-[34px]")}>
                            <RowMenu items={[
                              { label: "Open", icon: FileText, onClick: () => setSel(p.id) },
                              { label: "Send reminder", icon: BellRing, onClick: () => remind(p), disabled: !!p.invoice!.paidAt },
                              { label: "Download invoice", icon: Download, onClick: () => download(`${p.invoice!.no}.txt`, invoiceText(s, p), "text/plain") },
                            ]} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {list.length === 0 && <Empty>No invoices here.</Empty>}
              </div>
            </>
          }
          panel={po?.invoice ? (
            <>
              <div className="-mx-[4px] min-h-0 flex-1 overflow-y-auto px-[4px]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-cs-ink-2">{po.id}</p>
                    <h2 className="serif mt-[4px] text-[19px] font-semibold leading-tight">{po.invoice.no}</h2>
                    <p className="mt-[2px] text-[12px] text-cs-ink-2">{buyerName(s, po.mfrId)} · {po.title}</p>
                  </div>
                  <Pill tone={statusOf(po).tone}>{statusOf(po).label}</Pill>
                </div>
                <p className="serif mt-[14px] text-[30px] font-semibold leading-none">{inr(po.invoice.amount)}</p>
                <dl className="mt-[14px] grid grid-cols-2 gap-[8px] text-[11.5px]">
                  <div className="rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-cs-ink-2">Due</dt><dd className="font-semibold">{fmtDate(po.invoice.due)}</dd></div>
                  <div className="rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-cs-ink-2">Paid on</dt><dd className="font-semibold">{po.invoice.paidAt ? fmtDate(po.invoice.paidAt) : "Not yet"}</dd></div>
                  <div className="col-span-2 rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-cs-ink-2">Payment reference</dt><dd className="font-semibold">{po.invoice.ref ?? "Shared by the factory when they pay"}</dd></div>
                </dl>
                <p className="mt-[14px] text-[12.5px] font-semibold">History</p>
                <div className="mt-[6px]"><EventLog po={po} /></div>
              </div>
              <div className="mt-[10px] grid grid-cols-2 gap-[8px] border-t border-cs-line pt-[10px]">
                <Btn kind="primary" icon={BellRing} className="h-[38px] text-[12.5px]" disabled={!!po.invoice.paidAt} onClick={() => remind(po)}>Send reminder</Btn>
                <Btn icon={Download} className="h-[38px] text-[12.5px]" onClick={() => download(`${po.invoice!.no}.txt`, invoiceText(s, po), "text/plain")}>Download invoice</Btn>
              </div>
            </>
          ) : <Empty>Select an invoice.</Empty>}
        />
      </div>
    </div>
  );
}
