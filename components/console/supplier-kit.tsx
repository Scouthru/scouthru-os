"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, FileText, IndianRupee, PackageCheck, Send, Truck, X } from "lucide-react";
import { Btn, Field, Modal, Pill, inputCls, textareaCls, type Tone } from "./kit";
import { useConsole } from "@/lib/console/store";
import { declinePO, quotePO } from "@/lib/console/actions-network";
import { fmtDate, fmtDateTime, fmtNum, inr } from "@/lib/console/format";
import type { ConsoleState, PurchaseOrder, POStatus } from "@/lib/console/types";
import { cn } from "@/lib/cn";

/** Supplier portal helpers: "mine" is every PO addressed to this supplier. */

export const PO_TONE: Record<POStatus, Tone> = { RFQ: "orange", Quoted: "blue", Confirmed: "violet", Dispatched: "blue", Received: "green", Paid: "green", Declined: "gray" };
export const PO_LABEL: Record<POStatus, string> = { RFQ: "New", Quoted: "Quoted", Confirmed: "Confirmed", Dispatched: "Dispatched", Received: "Received", Paid: "Paid", Declined: "Declined" };
export const SOURCE_TONE: Record<PurchaseOrder["source"], Tone> = { Scouthru: "green", IndiaMART: "orange", WhatsApp: "green", Phone: "gray" };

export const minePOs = (s: ConsoleState) => s.purchaseOrders.filter((p) => p.supplierId === s.supplierId);
export const buyerOf = (s: ConsoleState, id: string) => s.manufacturers.find((m) => m.id === id);
export const buyerName = (s: ConsoleState, id: string) => buyerOf(s, id)?.name ?? id;

/** Value of a PO: the quote if there is one, otherwise list price × qty. */
export function poValue(s: ConsoleState, po: PurchaseOrder) {
  if (po.quote) return po.quote.total;
  return po.lines.reduce((a, l) => a + l.qty * (s.supplierStock.find((x) => x.sku === l.sku)?.price ?? 0), 0);
}

export const isOverdue = (po: PurchaseOrder) => !!po.invoice && !po.invoice.paidAt && new Date(po.invoice.due).getTime() < Date.now();

export function SourceBadge({ source }: { source: PurchaseOrder["source"] }) {
  return <Pill tone={SOURCE_TONE[source]} className="px-[7px] text-[10.5px]">{source}</Pill>;
}

export function StatusPill({ status }: { status: POStatus }) {
  return <Pill tone={PO_TONE[status]}>{PO_LABEL[status]}</Pill>;
}

/** List on the left, detail panel on the right; the pair keeps a fixed height on desktop so lists scroll inside. */
export function Board({ height, list, panel }: { height: number; list: React.ReactNode; panel?: React.ReactNode }) {
  return (
    <div className={cn("mt-[11px] grid gap-[11px]", !!panel && "min-[1024px]:grid-cols-[minmax(0,2.05fr)_minmax(0,1fr)]")} style={{ ["--bh" as string]: `${height}px` }}>
      <section className="cs-card flex min-h-0 min-w-0 flex-col px-[14px] pt-[13px] min-[1024px]:h-[var(--bh)]">{list}</section>
      {panel && <aside className="cs-card flex min-h-0 min-w-0 flex-col px-[14px] pb-[13px] pt-[12px] min-[1024px]:h-[var(--bh)]">{panel}</aside>}
    </div>
  );
}

export const th = "sticky top-0 z-10 whitespace-nowrap bg-[#f7f6f2] px-[8px] py-[9px] text-left text-[11px] font-medium text-[#4b524e]";
export const td = "border-b border-[#f1efea] px-[8px] py-[9px] align-middle";

/** Material lines with availability against this supplier's stock. */
export function LinesTable({ po, prices }: { po: PurchaseOrder; prices?: Record<string, number> }) {
  const { s } = useConsole();
  return (
    <table className="w-full text-[11.5px]">
      <thead><tr className="text-left text-[10.5px] text-cs-ink-2"><th className="pb-[5px] font-medium">Item</th><th className="pb-[5px] text-right font-medium">Qty</th><th className="pb-[5px] text-right font-medium">Available</th>{prices && <th className="pb-[5px] text-right font-medium">Amount</th>}</tr></thead>
      <tbody>
        {po.lines.map((l) => {
          const st = s.supplierStock.find((x) => x.sku === l.sku);
          const avail = st ? st.onHand - st.reserved : 0;
          const ok = avail >= l.qty;
          return (
            <tr key={l.sku} className="border-t border-[#f1efea]">
              <td className="py-[6px] pr-2"><span className="block font-medium text-[#1d211e]">{l.name}</span><span className="text-[10.5px] text-cs-ink-2">{l.sku}</span></td>
              <td className="py-[6px] text-right">{fmtNum(l.qty)} {l.unit}</td>
              <td className={cn("py-[6px] text-right", po.status === "RFQ" || po.status === "Quoted" ? (ok ? "text-cs-green-2" : "text-cs-red") : "text-cs-ink-2")}>{st ? fmtNum(avail) : "—"}</td>
              {prices && <td className="py-[6px] text-right">{inr((prices[l.sku] ?? 0) * l.qty)}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const STEPS = [
  { label: "Request", icon: ClipboardList, key: "RFQ" },
  { label: "Quoted", icon: FileText, key: "Quoted" },
  { label: "Confirmed", icon: CheckCircle2, key: "Confirmed" },
  { label: "Dispatched", icon: Truck, key: "Dispatched" },
  { label: "Received", icon: PackageCheck, key: "Received" },
  { label: "Paid", icon: IndianRupee, key: "Paid" },
] as const;

export function PoStepper({ po }: { po: PurchaseOrder }) {
  if (po.status === "Declined") return <p className="rounded-[7px] bg-[#f1f0ec] px-[10px] py-[8px] text-[12px] text-cs-ink-2">This request was declined.</p>;
  const cur = STEPS.findIndex((x) => x.key === po.status);
  const all = po.status === "Paid";
  return (
    <div className="relative grid grid-cols-6">
      <div className="absolute left-[8.3%] right-[8.3%] top-[15px] flex">{STEPS.slice(0, -1).map((x, i) => <span key={x.key} className={cn("h-[2px] flex-1", all || i < cur ? "bg-cs-green" : "bg-[#dedcd6]")} />)}</div>
      {STEPS.map((x, i) => {
        const done = all || i < cur;
        const on = !all && i === cur;
        return (
          <div key={x.key} className="relative flex flex-col items-center text-center">
            <span className={cn("grid size-[32px] place-items-center rounded-full", on ? "bg-cs-green text-white" : done ? "bg-cs-mint text-cs-green" : "border border-[#e2e0da] bg-[#f6f5f1] text-[#4b524e]")}><x.icon className="size-[15px]" strokeWidth={1.7} /></span>
            <span className={cn("mt-[5px] text-[10px] leading-tight", on ? "font-semibold text-cs-green" : "text-[#3e4440]")}>{x.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function EventLog({ po }: { po: PurchaseOrder }) {
  return (
    <ul className="space-y-[7px]">
      {[...po.events].reverse().map((e, i) => (
        <li key={i} className="flex gap-[9px] text-[11.5px]">
          <span className={cn("mt-[4px] size-[7px] shrink-0 rounded-full", i === 0 ? "bg-cs-green-2" : "bg-[#cfd2cd]")} />
          <span><span className="text-[#1d211e]">{e.text}</span><span className="block text-[10.5px] text-cs-ink-2">{fmtDateTime(e.at)}</span></span>
        </li>
      ))}
    </ul>
  );
}

export function poText(s: ConsoleState, po: PurchaseOrder) {
  const sup = s.suppliers.find((x) => x.id === po.supplierId);
  return [
    `PURCHASE ORDER ${po.id}`,
    `Supplier: ${sup?.name}, ${sup?.city}`,
    `Buyer: ${buyerName(s, po.mfrId)}`,
    `Title: ${po.title}`,
    `Status: ${po.status}`,
    `Need by: ${fmtDate(po.needBy)}`,
    po.orderId ? `For production order: ${po.orderId}` : "",
    "",
    "Lines:",
    ...po.lines.map((l) => `  ${l.sku}  ${l.name}  ×  ${fmtNum(l.qty)} ${l.unit}`),
    "",
    po.quote ? `Quoted total: ${inr(po.quote.total)} · lead ${po.quote.leadDays} days${po.quote.note ? ` · ${po.quote.note}` : ""}` : "Not quoted yet",
    po.vehicle ? `Vehicle: ${po.vehicle}` : "",
    po.invoice ? `Invoice ${po.invoice.no}: ${inr(po.invoice.amount)} due ${fmtDate(po.invoice.due)}${po.invoice.paidAt ? ` · paid ${fmtDate(po.invoice.paidAt)} (${po.invoice.ref})` : ""}` : "",
    "",
    "History:",
    ...po.events.map((e) => `  ${fmtDateTime(e.at)}  ${e.text}`),
  ].filter((l) => l !== "").join("\n");
}

/** Send quote: per-line prices from the price list, total sums itself. */
export function QuoteModal({ po, onClose }: { po: PurchaseOrder | null; onClose: () => void }) {
  return po ? <QuoteForm key={po.id} po={po} onClose={onClose} /> : null;
}

function QuoteForm({ po, onClose }: { po: PurchaseOrder; onClose: () => void }) {
  const { s, update, toast } = useConsole();
  // Text state so prices can be cleared and retyped; parsed for the total.
  const [priceT, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(po.lines.map((l) => [l.sku, String(s.supplierStock.find((x) => x.sku === l.sku)?.price ?? 0)])));
  const [leadT, setLead] = useState(() => String(Math.max(...po.lines.map((l) => s.supplierStock.find((x) => x.sku === l.sku)?.leadDays ?? 5))));
  const prices = useMemo(() => Object.fromEntries(Object.entries(priceT).map(([k, v]) => [k, Number(v) || 0])), [priceT]);
  const lead = Number(leadT) || 0;
  const [note, setNote] = useState(po.quote?.note ?? "");
  const total = useMemo(() => po.lines.reduce((a, l) => a + l.qty * (prices[l.sku] ?? 0), 0), [po, prices]);
  return (
    <Modal open onClose={onClose} title={`Quote ${po.id}`} sub={`${po.title} · ${buyerName(s, po.mfrId)}`} width={560}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={Send} disabled={total <= 0 || lead <= 0} onClick={() => { update((d) => quotePO(d, po.id, Math.round(total), lead, note.trim())); toast(`Quote sent on ${po.id} · ${inr(total)}`); onClose(); }}>Send quote · {inr(total)}</Btn></>}>
      <div className="space-y-[12px]">
        <table className="w-full text-[12px]">
          <thead><tr className="text-left text-[11px] text-cs-ink-2"><th className="pb-[6px] font-medium">Item</th><th className="pb-[6px] text-right font-medium">Qty</th><th className="pb-[6px] text-right font-medium">Price / unit (₹)</th><th className="pb-[6px] text-right font-medium">Amount</th></tr></thead>
          <tbody>
            {po.lines.map((l) => (
              <tr key={l.sku} className="border-t border-cs-line">
                <td className="py-[7px] pr-2">{l.name}<span className="block text-[10.5px] text-cs-ink-2">{l.sku}</span></td>
                <td className="py-[7px] text-right">{fmtNum(l.qty)}</td>
                <td className="py-[7px] text-right"><input aria-label={`Price for ${l.sku}`} type="number" min={0} step={0.05} value={priceT[l.sku] ?? ""} onChange={(e) => setPrices({ ...priceT, [l.sku]: e.target.value })} className="h-[32px] w-[92px] rounded-[6px] border border-[#d6d8d3] px-[8px] text-right outline-none focus:border-cs-green" /></td>
                <td className="py-[7px] text-right font-medium">{inr((prices[l.sku] ?? 0) * l.qty)}</td>
              </tr>
            ))}
            <tr className="border-t border-cs-line"><td colSpan={3} className="pt-[8px] text-right font-semibold">Total</td><td className="pt-[8px] text-right font-semibold">{inr(total)}</td></tr>
          </tbody>
        </table>
        <div className="grid grid-cols-2 gap-[10px]">
          <Field label="Lead time (days)"><input className={inputCls} type="number" min={1} value={leadT} onChange={(e) => setLead(e.target.value)} /></Field>
          <Field label="Need by"><input className={inputCls} value={fmtDate(po.needBy)} readOnly /></Field>
        </div>
        <Field label="Note to the factory (optional)"><textarea className={cn(textareaCls, "h-[64px]")} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Artwork, delivery terms, validity" /></Field>
      </div>
    </Modal>
  );
}

export function DeclineModal({ po, onClose }: { po: PurchaseOrder | null; onClose: () => void }) {
  const { update, toast } = useConsole();
  const [reason, setReason] = useState("Out of stock for the need-by date");
  if (!po) return null;
  return (
    <Modal open onClose={onClose} title={`Decline ${po.id}?`} sub={po.title}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="danger" icon={X} disabled={!reason.trim()} onClick={() => { update((d) => declinePO(d, po.id, reason.trim())); toast(`Declined ${po.id}`, "info"); onClose(); }}>Decline request</Btn></>}>
      <Field label="Reason (the factory sees this)"><textarea className={cn(textareaCls, "h-[80px]")} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    </Modal>
  );
}
