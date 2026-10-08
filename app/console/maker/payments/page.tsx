"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, Download, IndianRupee, Wallet } from "lucide-react";
import { Btn, Empty, FilterSelect, Hero, Pill, RowMenu, StatStrip, Tabs, type Tone } from "@/components/console/kit";
import { PayModal, Page, Panel, Split, tdc, thc } from "@/components/console/maker";
import { useConsole } from "@/lib/console/store";
import { sendMessage } from "@/lib/console/actions";
import { milestoneStatus, mine, type Shown } from "@/lib/console/actions-maker";
import { csv, daysUntil, download, fmtDate, inr, lakh } from "@/lib/console/format";
import type { Milestone, PaymentPlan, PurchaseOrder } from "@/lib/console/types";
import { cn } from "@/lib/cn";

const TONE: Record<Shown, Tone> = { Paid: "green", "Due Soon": "orange", Overdue: "red", Scheduled: "blue" };
type Tab = "receive" | "pay";

export default function MakerPaymentsPage() {
  const { s, update, toast } = useConsole();
  const { plans, pos } = useMemo(() => mine(s), [s]);
  const [tab, setTab] = useState<Tab>("receive");
  const [status, setStatus] = useState("");
  const [payFor, setPayFor] = useState<PurchaseOrder | null>(null);

  const rows = plans.flatMap((p) => p.milestones.map((m) => ({ p, m, st: milestoneStatus(m) })));
  const shown = rows.filter((r) => !status || r.st === status);
  const sum = (xs: { m: Milestone }[]) => xs.reduce((a, r) => a + r.m.amount, 0);
  const received = rows.filter((r) => r.st === "Paid");
  const overdue = rows.filter((r) => r.st === "Overdue");
  const dueSoon = rows.filter((r) => r.st === "Due Soon");
  const invoices = pos.filter((p) => p.invoice);
  const payable = invoices.filter((p) => !p.invoice!.paidAt);

  const remind = (p: PaymentPlan, m: Milestone) => {
    update((d) => sendMessage(d, d.workspace, `Payment reminder · ${m.invoice}`, `${m.name} for ${p.orderId} (${p.name}): ${inr(m.amount)} ${milestoneStatus(m) === "Overdue" ? `was due ${fmtDate(m.due)}` : `is due ${fmtDate(m.due)}`}.`, `/console/payments?id=${p.orderId}`, "Payment"));
    toast(`Reminder sent to ${s.workspace}`);
  };
  const statement = () => {
    download(`NutraLab-statement-${new Date().toISOString().slice(0, 10)}.csv`, csv([["Order", "Product", "Invoice", "Milestone", "Due", "Amount", "Status", "Paid on", "Reference"], ...rows.map(({ p, m, st }) => [p.orderId, p.name, m.invoice, m.name, fmtDate(m.due), m.amount, st, m.paidAt ? fmtDate(m.paidAt) : "", m.ref ?? ""])]));
    toast("Statement downloaded");
  };

  return (
    <div>
      <Hero eyebrow="INVOICE · COLLECT · PAY" title="Payments" lede={<>Milestone payments from brands and invoices from your suppliers,<br />in one ledger.</>} img="/console/hero-payments.jpg" height={146} quoteTop={16} quoteWidth={192} quote={["Clarity in", "payments.", "Confidence in", "execution."]} />
      <Page>
        <StatStrip items={[
          { icon: CheckCircle2, tone: "green", value: lakh(sum(received)), label: "Received", delta: `${received.length} milestones paid` },
          { icon: Wallet, tone: "orange", value: lakh(sum(dueSoon)), label: "Due in 14 Days", delta: `${dueSoon.length} milestones`, deltaTone: "muted" },
          { icon: AlertTriangle, tone: "red", value: lakh(sum(overdue)), label: "Overdue From Brands", delta: `${overdue.length} invoices`, deltaTone: overdue.length ? "bad" : "muted" },
          { icon: IndianRupee, tone: "violet", value: lakh(payable.reduce((a, p) => a + p.invoice!.amount, 0)), label: "Payable to Suppliers", delta: `${payable.length} invoices`, deltaTone: payable.length ? "bad" : "muted" },
          { icon: CheckCircle2, tone: "blue", value: lakh(invoices.filter((p) => p.invoice!.paidAt).reduce((a, p) => a + p.invoice!.amount, 0)), label: "Paid to Suppliers", delta: "All time", deltaTone: "muted" },
        ]} />
        <Split side="0.8fr" hero={146}>
          <Panel>
            <div className="px-[15px] pt-[12px]">
              <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ key: "receive", label: `From Brands (${rows.length})` }, { key: "pay", label: `To Suppliers (${invoices.length})` }]} />
              {tab === "receive" && (
                <div className="mt-[12px] flex flex-wrap items-center gap-[8px]">
                  <FilterSelect label="All statuses" value={status} onChange={setStatus} options={["Paid", "Due Soon", "Overdue", "Scheduled"]} className="w-[140px]" />
                  <Btn icon={Download} className="ml-auto h-[34px] text-[12.5px]" onClick={statement}>Download statement</Btn>
                </div>
              )}
            </div>
            <div className="mt-[10px] overflow-x-auto px-[7px]">
              {tab === "receive" ? (
                <table className="w-full min-w-[620px] border-separate border-spacing-0">
                  <thead><tr><th className={thc}>Order</th><th className={thc}>Invoice · Milestone</th><th className={thc}>Due</th><th className={thc}>Amount</th><th className={thc}>Status</th><th className={thc}><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {shown.map(({ p, m, st }) => (
                      <tr key={m.invoice} className="hover:bg-[#faf9f5]">
                        <td className={tdc}><p className="font-medium">{p.orderId}</p><p className="max-w-[170px] truncate text-[11px] text-cs-ink-2">{p.name}</p></td>
                        <td className={tdc}>{m.invoice}<span className="block text-[11px] text-cs-ink-2">{m.name}</span></td>
                        <td className={tdc}>{fmtDate(m.due)}{st !== "Paid" && <span className={cn("block text-[11px]", st === "Overdue" ? "text-cs-red" : "text-cs-ink-2")}>{daysUntil(m.due) < 0 ? `${-daysUntil(m.due)} days late` : `in ${daysUntil(m.due)} days`}</span>}</td>
                        <td className={cn(tdc, "font-medium")}>{inr(m.amount)}</td>
                        <td className={tdc}><Pill tone={TONE[st]}>{st}</Pill>{m.paidAt && <span className="block text-[10.5px] text-cs-ink-2">{fmtDate(m.paidAt)}</span>}</td>
                        <td className={cn(tdc, "w-[34px]")}><RowMenu items={[{ label: "Send reminder", icon: BellRing, onClick: () => remind(p, m), disabled: st === "Paid" }]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-[560px] border-separate border-spacing-0">
                  <thead><tr><th className={thc}>Invoice</th><th className={thc}>Supplier · PO</th><th className={thc}>Due</th><th className={thc}>Amount</th><th className={thc}>Status</th><th className={thc}><span className="sr-only">Pay</span></th></tr></thead>
                  <tbody>
                    {invoices.map((p) => {
                      const inv = p.invoice!;
                      const late = !inv.paidAt && daysUntil(inv.due) < 0;
                      return (
                        <tr key={p.id} className="hover:bg-[#faf9f5]">
                          <td className={cn(tdc, "font-medium")}>{inv.no}</td>
                          <td className={tdc}>{s.suppliers.find((x) => x.id === p.supplierId)?.name}<span className="block text-[11px] text-cs-ink-2">{p.id} · {p.title}</span></td>
                          <td className={tdc}>{fmtDate(inv.due)}</td>
                          <td className={cn(tdc, "font-medium")}>{inr(inv.amount)}</td>
                          <td className={tdc}><Pill tone={inv.paidAt ? "green" : late ? "red" : "orange"}>{inv.paidAt ? "Paid" : late ? "Overdue" : "Due"}</Pill></td>
                          <td className={tdc}>{!inv.paidAt && <Btn kind="primary" className="h-[30px] px-[11px] text-[12px]" onClick={() => setPayFor(p)}>Pay</Btn>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {(tab === "receive" ? shown : invoices).length === 0 && <Empty>Nothing here.</Empty>}
            </div>
          </Panel>

          <Panel title="By order" sub="How much each brand order has paid" bodyClass="px-[15px] pb-[14px] pt-[10px]">
            <ul className="space-y-[12px]">
              {plans.map((p) => {
                const total = p.milestones.reduce((a, m) => a + m.amount, 0);
                const paid = p.milestones.filter((m) => m.status === "Paid").reduce((a, m) => a + m.amount, 0);
                const next = p.milestones.find((m) => m.status !== "Paid");
                return (
                  <li key={p.orderId} className="rounded-[9px] border border-cs-line p-[11px]">
                    <div className="flex items-center justify-between gap-2"><p className="text-[13px] font-semibold">{p.orderId}</p><span className="text-[12px] font-medium">{Math.round((paid / total) * 100)}% paid</span></div>
                    <p className="truncate text-[11.5px] text-cs-ink-2">{p.name}</p>
                    <div className="mt-[7px] h-[7px] overflow-hidden rounded-full bg-[#e9ebe6]"><div className="h-full rounded-full bg-cs-green" style={{ width: `${(paid / total) * 100}%` }} /></div>
                    <p className="mt-[5px] text-[11.5px] text-cs-ink-2">{inr(paid)} of {inr(total)}</p>
                    {next && (
                      <div className="mt-[6px] flex items-center justify-between gap-2 text-[11.5px]">
                        <span>Next: {next.name} · {inr(next.amount)} · {fmtDate(next.due)}</span>
                        <button type="button" onClick={() => remind(p, next)} className="inline-flex items-center gap-[4px] font-medium text-cs-green hover:underline"><BellRing className="size-[12px]" />Remind</button>
                      </div>
                    )}
                  </li>
                );
              })}
              {plans.length === 0 && <Empty>No brand orders yet.</Empty>}
            </ul>
          </Panel>
        </Split>
      </Page>
      {payFor && <PayModal p={payFor} onClose={() => setPayFor(null)} />}
    </div>
  );
}
