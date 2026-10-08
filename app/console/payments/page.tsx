"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowUp, Bell, CalendarDays, Check as CheckIcon, ChevronDown, ChevronRight, Clock3, Coins, CreditCard, Download, ExternalLink,
  FileText, List, MapPin, ReceiptText, Wallet,
} from "lucide-react";
import { Btn, Check, CardTitle, Empty, Field, FilterSelect, Hero, Modal, Pill, RowMenu, SearchBox, StatStrip, Tabs, ViewAllBtn, inputCls, type Tone } from "@/components/console/kit";
import { Bar } from "@/components/console/ops";
import { useConsole } from "@/lib/console/store";
import { recordPayment, sendMessage } from "@/lib/console/actions";
import { daysUntil, download, csv, fmtDate, fmtDateTime, inr, lakh, ago } from "@/lib/console/format";
import type { ConsoleState, Milestone, PaymentPlan } from "@/lib/console/types";
import { cn } from "@/lib/cn";

type Shown = "Paid" | "Due Soon" | "Overdue" | "Scheduled";
/** Status from the dates, so it stays right as time passes; Paid is the only stored truth. */
function statusOf(m: Milestone): Shown {
  if (m.status === "Paid") return "Paid";
  const d = daysUntil(m.due);
  if (d < 0) return "Overdue";
  if (d <= 14) return "Due Soon";
  return "Scheduled";
}
const TONE: Record<Shown, Tone> = { Paid: "green", "Due Soon": "orange", Overdue: "red", Scheduled: "blue" };
const sameMonth = (iso: string) => { const a = new Date(iso), b = new Date(); return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear(); };

type TabKey = "all" | "paid" | "month" | "overdue" | "schedules";
const MONTHS: Record<string, number> = { "": 3, "Last 6 Months": 6, "Last 12 Months": 12, "All Time": 1200 };
const SORTS = ["Due Date (Earliest)", "Due Date (Latest)", "Amount (Highest)", "Order ID"] as const;

export default function PaymentsPage() {
  return (
    <Suspense>
      <Payments />
    </Suspense>
  );
}

function Payments() {
  const { s, update, toast } = useConsole();
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");
  const [mfr, setMfr] = useState("");
  const [status, setStatus] = useState("");
  const [due, setDue] = useState("");
  const [win, setWin] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Due Date (Earliest)");
  const [compact, setCompact] = useState(false);
  const [sel, setSel] = useState<string>(params.get("id") ?? s.payments[0]?.orderId ?? "");
  const [open, setOpen] = useState<string[]>(() => s.payments.slice(0, 3).map((p) => p.orderId));
  const [checked, setChecked] = useState<string[]>([]);
  const [record, setRecord] = useState<{ orderId: string; invoices: string[] } | null>(null);
  const [allMs, setAllMs] = useState(false);
  const [allDocs, setAllDocs] = useState(false);

  useEffect(() => {
    const id = params.get("id");
    if (id) { setSel(id); setOpen((o) => (o.includes(id) ? o : [id, ...o])); }
  }, [params]);

  const mfrName = (id: string) => s.manufacturers.find((m) => m.id === id)?.name ?? id;
  const all = s.payments.flatMap((p) => p.milestones.map((m) => ({ p, m, st: statusOf(m) })));

  const matchTab = (m: Milestone) => {
    const st = statusOf(m);
    if (tab === "paid") return st === "Paid";
    if (tab === "month") return st !== "Paid" && st !== "Overdue" && sameMonth(m.due);
    if (tab === "overdue") return st === "Overdue";
    return true;
  };
  const months = MONTHS[win];
  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    const rows = s.payments
      .filter((p) => (!t || [p.orderId, p.name, mfrName(p.mfrId), ...p.milestones.map((m) => m.invoice)].some((v) => v.toLowerCase().includes(t))) && (!mfr || mfrName(p.mfrId) === mfr))
      .map((p) => ({
        p,
        ms: p.milestones.filter((m) => {
          const st = statusOf(m);
          const d = daysUntil(m.due);
          return matchTab(m) && (!status || st === status) &&
            (!due || (due === "Past due" ? d < 0 && st !== "Paid" : due === "Next 7 days" ? d >= 0 && d <= 7 : d >= 0 && d <= 30)) &&
            Math.abs(d) <= months * 31;
        }),
      }))
      .filter((g) => (tab === "schedules" ? g.p.milestones.some((m) => m.status !== "Paid") : g.ms.length > 0));
    const key = (g: (typeof rows)[number]) => current(g.p);
    const settled = (g: (typeof rows)[number]) => Number(g.p.milestones.every((m) => m.status === "Paid"));
    rows.sort((a, b) =>
      settled(a) - settled(b) ||
      (sort === "Order ID" ? a.p.orderId.localeCompare(b.p.orderId)
        : sort === "Amount (Highest)" ? total(b.p) - total(a.p)
          : sort === "Due Date (Latest)" ? +new Date(key(b).due) - +new Date(key(a).due)
            : +new Date(key(a).due) - +new Date(key(b).due)),
    );
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, q, mfr, status, due, months, tab, sort]);

  // stats
  const totalValue = all.reduce((a, x) => a + x.m.amount, 0);
  const paid = all.filter((x) => x.st === "Paid");
  const monthDue = all.filter((x) => x.st !== "Paid" && x.st !== "Overdue" && sameMonth(x.m.due));
  const overdue = all.filter((x) => x.st === "Overdue");
  const active = s.payments.filter((p) => p.milestones.some((m) => m.status !== "Paid"));
  const newThisMonth = s.payments.filter((p) => Math.abs(daysUntil(p.milestones[0].due)) <= 30).length;
  const count = (k: TabKey) => k === "schedules" ? active.length : k === "paid" ? paid.length : k === "month" ? monthDue.length : k === "overdue" ? overdue.length : all.length;

  const plan = s.payments.find((p) => p.orderId === sel) ?? null;
  const toggleCheck = (inv: string) => setChecked((c) => (c.includes(inv) ? c.filter((x) => x !== inv) : [...c, inv]));
  const checkedUnpaid = all.filter((x) => checked.includes(x.m.invoice) && x.st !== "Paid");

  const remind = (p: PaymentPlan, ms: Milestone[]) => {
    const open = ms.filter((m) => m.status !== "Paid");
    if (!open.length) { toast("Nothing unpaid to remind about", "info"); return; }
    const contact = s.manufacturers.find((m) => m.id === p.mfrId)?.contacts[0];
    update((d) => {
      sendMessage(d, `${contact?.name ?? "Accounts"} (${mfrName(p.mfrId)})`, `Payment schedule – ${p.orderId}`, open.map((m) => `${m.invoice} · ${m.name} · ${inr(m.amount)} due ${fmtDate(m.due)}`).join("\n"), `/console/payments?id=${p.orderId}`, "Payment");
      const x = d.payments.find((y) => y.orderId === p.orderId);
      x?.notes.unshift({ at: new Date().toISOString(), who: d.user.name, text: `Reminder sent for ${open.map((m) => m.invoice).join(", ")}.` });
    });
    toast(`Reminder sent to ${mfrName(p.mfrId)}`);
  };

  return (
    <div>
      <Hero
        eyebrow="FINANCE  ·  PAYMENTS  ·  OVERVIEW"
        title="Payments & Milestones"
        lede={<span className="lg:whitespace-nowrap">Monitor invoices, milestone payments, and financial progress across manufacturing orders.</span>}
        img="/console/hero-payments.jpg"
        quote={["Clarity in", "payments.", "Confidence in", "execution."]}
        height={146}
        quoteTop={16}
        quoteWidth={192}
      />
      <div className="px-[15px] pb-[20px]">
        <StatStrip
          items={[
            { icon: FileText, tone: "green", value: lakh(totalValue), label: "Total Order Value", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />across {s.payments.length} orders</> },
            { icon: Coins, tone: "green", value: lakh(paid.reduce((a, x) => a + x.m.amount, 0)), label: "Paid", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />{Math.round((paid.reduce((a, x) => a + x.m.amount, 0) / Math.max(1, totalValue)) * 100)}% of order value</> },
            { icon: CalendarDays, tone: "orange", value: lakh(monthDue.reduce((a, x) => a + x.m.amount, 0)), label: "Due This Month", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />{new Set(monthDue.map((x) => x.p.orderId)).size} orders</> },
            { icon: AlertCircle, tone: "red", value: lakh(overdue.reduce((a, x) => a + x.m.amount, 0)), label: "Overdue", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />{overdue.length} invoice{overdue.length === 1 ? "" : "s"}</>, deltaTone: overdue.length ? "bad" : "up" },
            { icon: ReceiptText, tone: "green", value: active.length, label: "Active Payment Schedules", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />{newThisMonth} new this month</> },
          ]}
        />

        <div className="mt-[11px] grid gap-[13px] min-[1024px]:h-[745px] min-[1024px]:grid-cols-[minmax(0,1.72fr)_minmax(0,1fr)]">
          <section className="cs-card flex min-h-0 min-w-0 flex-col px-[14px] pt-[13px]">
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { key: "all", label: `All Payments (${count("all")})` },
                { key: "paid", label: `Paid (${count("paid")})` },
                { key: "month", label: `Due This Month (${count("month")})` },
                { key: "overdue", label: `Overdue (${count("overdue")})` },
                { key: "schedules", label: `Schedules (${count("schedules")})` },
              ]}
            />
            <div className="mt-[14px] flex flex-wrap items-center gap-[7px] lg:flex-nowrap [&_select]:pl-[9px] [&_select]:pr-[22px] [&_select]:text-[11px] [&_svg]:right-[7px]">
              <SearchBox value={q} onChange={setQ} placeholder="Search by order ID, product, manufacturer..." className="w-full lg:w-[294px]" />
              <FilterSelect label="Manufacturer" value={mfr} onChange={setMfr} options={Array.from(new Set(s.payments.map((p) => mfrName(p.mfrId))))} className="w-[100px]" />
              <FilterSelect label="Status" value={status} onChange={setStatus} options={["Paid", "Due Soon", "Overdue", "Scheduled"]} className="w-[72px]" />
              <FilterSelect label="Due Date" value={due} onChange={setDue} options={["Next 7 days", "Next 30 days", "Past due"]} className="w-[88px]" />
              <FilterSelect label="Last 3 Months" value={win} onChange={setWin} options={["Last 6 Months", "Last 12 Months", "All Time"]} className="w-[110px]" />
              <button type="button" aria-label="Compact rows" aria-pressed={compact} onClick={() => setCompact((c) => !c)} className={cn("ml-auto grid size-[34px] shrink-0 place-items-center rounded-[6px] border border-cs-line", compact ? "bg-cs-mint text-cs-green" : "bg-white")}>
                <List className="size-[17px]" strokeWidth={1.7} />
              </button>
            </div>
            <div className="mt-[10px] flex items-center justify-end gap-[8px] text-[11px] text-cs-ink-2">
              Sort by
              <FilterSelect label="Due Date (Earliest)" value={sort === "Due Date (Earliest)" ? "" : sort} onChange={(v) => setSort((v || "Due Date (Earliest)") as (typeof SORTS)[number])} options={SORTS.slice(1) as unknown as string[]} className="w-[128px] [&_select]:!border-cs-line [&_select]:!pr-[20px] [&_select]:!font-normal [&_select]:!text-[10px] [&_select]:!text-cs-ink" />
            </div>

            {checked.length > 0 && (
              <div className="mt-[8px] flex items-center gap-[12px] rounded-[7px] bg-cs-mint px-[12px] py-[7px] text-[12px]">
                <span className="font-medium text-cs-green">{checked.length} invoice{checked.length === 1 ? "" : "s"} selected</span>
                <button type="button" disabled={!checkedUnpaid.length} className="font-medium text-cs-green hover:underline disabled:opacity-40" onClick={() => setRecord({ orderId: "", invoices: checkedUnpaid.map((x) => x.m.invoice) })}>Record payment ({checkedUnpaid.length})</button>
                <button type="button" disabled={!checkedUnpaid.length} className="font-medium text-cs-green hover:underline disabled:opacity-40" onClick={() => { const by = new Map<string, Milestone[]>(); checkedUnpaid.forEach((x) => by.set(x.p.orderId, [...(by.get(x.p.orderId) ?? []), x.m])); by.forEach((ms, id) => remind(s.payments.find((p) => p.orderId === id)!, ms)); }}>Send reminder</button>
                <button type="button" className="ml-auto text-cs-ink-2 hover:text-cs-ink" onClick={() => setChecked([])}>Clear</button>
              </div>
            )}

            <div className="mt-[6px] min-h-0 flex-1 overflow-auto pb-[10px]">
              <table className="w-full min-w-[700px] border-separate border-spacing-0 text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#f7f6f2] text-left text-[10.5px] font-medium text-[#4b524e]">
                    <th className="rounded-l-[6px] py-[8px] pl-[22px] font-medium">Order &amp; Product</th>
                    <th className="px-[6px] font-medium">Manufacturer</th>
                    <th className="px-[6px] font-medium">Invoice ID</th>
                    <th className="px-[6px] font-medium">Milestone</th>
                    <th className="px-[6px] font-medium">Due Date</th>
                    <th className="px-[6px] font-medium">Amount</th>
                    <th className="px-[6px] font-medium">Status</th>
                    <th className="rounded-r-[6px] font-medium"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                {groups.map(({ p, ms }, gi) => {
                  const cur = current(p);
                  const isOpen = open.includes(p.orderId);
                  const on = p.orderId === sel;
                  const rows = tab === "schedules" ? p.milestones : ms;
                  return (
                    <Fragment key={p.orderId}>
                    <tbody aria-hidden><tr><td colSpan={8} className={gi === 0 ? "h-[6px]" : "h-[9px]"} /></tr></tbody>
                    <tbody className={cn("outline -outline-offset-[1px]", on ? "outline-[1.5px] outline-cs-green-2/70" : "outline-1 outline-cs-line")} style={{ borderRadius: 8 }}>
                      <tr className={cn("cursor-pointer", on ? "bg-[#fbfdfb]" : "hover:bg-[#faf9f6]")} onClick={() => { setSel(p.orderId); router.replace(`/console/payments?id=${p.orderId}`, { scroll: false }); }}>
                        <td className={cn("py-[8px] pl-[4px]", compact && "py-[5px]")}>
                          <div className="flex items-center gap-[7px]">
                            <button type="button" aria-label={isOpen ? "Collapse" : "Expand"} aria-expanded={isOpen} onClick={(e) => { e.stopPropagation(); setOpen((o) => (o.includes(p.orderId) ? o.filter((x) => x !== p.orderId) : [...o, p.orderId])); }} className="grid size-[18px] place-items-center rounded hover:bg-[#ecebe6]">
                              {isOpen ? <ChevronDown className="size-[15px]" /> : <ChevronRight className="size-[15px]" />}
                            </button>
                            {!compact && <Image src={p.img} alt="" width={40} height={40} className="size-[40px] shrink-0 rounded-[6px] object-cover" />}
                            <div className="min-w-0">
                              <p className="whitespace-nowrap text-[11.5px] font-semibold text-[#1d211e]">{p.orderId}</p>
                              <p className="line-clamp-2 w-[104px] text-[10.5px] leading-[1.3] text-[#3e4440]">{p.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="w-[86px] px-[6px] text-[11px] leading-tight text-[#3e4440]">{mfrName(p.mfrId)}</td>
                        <td className="whitespace-nowrap px-[6px] text-[#3e4440]">{cur.invoice}</td>
                        <td className="px-[6px] leading-tight text-[#3e4440]">{cur.name}</td>
                        <td className="whitespace-nowrap px-[6px] text-[#3e4440]">{fmtDate(cur.due)}</td>
                        <td className="whitespace-nowrap px-[6px] text-[#1d211e]">{inr(cur.amount)}</td>
                        <td className="px-[6px]"><Pill tone={TONE[statusOf(cur)]} className="!w-[68px] justify-center !text-[10.5px]">{statusOf(cur)}</Pill></td>
                        <td className="pr-[6px]">
                          <RowMenu items={[
                            { label: "Open", icon: ExternalLink, onClick: () => setSel(p.orderId) },
                            { label: "Record payment", icon: CreditCard, disabled: !p.milestones.some((m) => m.status !== "Paid"), onClick: () => setRecord({ orderId: p.orderId, invoices: [] }) },
                            { label: "Send reminder", icon: Bell, onClick: () => remind(p, p.milestones) },
                            { label: "Download statement", icon: Download, onClick: () => { download(`${p.orderId}-statement.csv`, csv([["Invoice", "Milestone", "Due", "Amount", "Status", "Paid on", "Reference"], ...p.milestones.map((m) => [m.invoice, m.name, fmtDate(m.due), m.amount, statusOf(m), m.paidAt ? fmtDate(m.paidAt) : "", m.ref ?? ""])])); toast("Statement downloaded"); } },
                          ]} />
                        </td>
                      </tr>
                      {isOpen && rows.map((m) => (
                        <tr key={m.invoice} className={cn("group/ms", on ? "bg-[#fbfdfb]" : "")}>
                          <td className="py-[6px] pl-[40px]"><Check checked={checked.includes(m.invoice)} onChange={() => toggleCheck(m.invoice)} label={`Select ${m.invoice}`} /></td>
                          <td />
                          <td className="whitespace-nowrap px-[6px] text-[10.5px] text-[#3e4440]">{m.invoice}</td>
                          <td className="px-[6px] text-[10.5px] text-[#3e4440]">{m.name}</td>
                          <td className="whitespace-nowrap px-[6px] text-[10.5px] text-[#3e4440]">{fmtDate(m.due)}</td>
                          <td className="whitespace-nowrap px-[6px] text-[10.5px] text-[#1d211e]">{inr(m.amount)}</td>
                          <td className="px-[6px]"><Pill tone={TONE[statusOf(m)]} className="!w-[68px] justify-center !py-[2px] !text-[10px]">{statusOf(m)}</Pill></td>
                          <td className="pr-[6px] opacity-0 focus-within:opacity-100 group-hover/ms:opacity-100">
                            <RowMenu items={[
                              { label: "Record payment", icon: CreditCard, disabled: m.status === "Paid", onClick: () => setRecord({ orderId: p.orderId, invoices: [m.invoice] }) },
                              { label: "Download invoice", icon: Download, onClick: () => invoiceFile(s, p, m, toast) },
                              { label: "Send reminder", icon: Bell, disabled: m.status === "Paid", onClick: () => remind(p, [m]) },
                            ]} />
                          </td>
                        </tr>
                      ))}
                      {isOpen && <tr aria-hidden><td colSpan={8} className="h-[4px]" /></tr>}
                    </tbody>
                    </Fragment>
                  );
                })}
              </table>
              {groups.length === 0 && <Empty>No payments match these filters.</Empty>}
            </div>
          </section>

          {plan && (
            <PaymentPanel
              p={plan}
              onRecord={() => setRecord({ orderId: plan.orderId, invoices: [] })}
              onRemind={() => remind(plan, plan.milestones)}
              onAllMs={() => setAllMs(true)}
              onAllDocs={() => setAllDocs(true)}
            />
          )}
        </div>
      </div>

      {record && <RecordModal key={record.orderId + record.invoices.join()} init={record} onClose={() => setRecord(null)} onDone={() => setChecked([])} />}
      {plan && (
        <Modal open={allMs} onClose={() => setAllMs(false)} title={`${plan.orderId} · all milestones`} sub={`${plan.name} · ${mfrName(plan.mfrId)}`} width={640}>
          <table className="w-full text-[12.5px]">
            <thead><tr className="text-left text-[11px] text-cs-ink-2"><th className="pb-[6px]">Invoice</th><th>Milestone</th><th>Due</th><th>Amount</th><th>Status</th><th>Paid on / ref</th></tr></thead>
            <tbody>
              {plan.milestones.map((m) => (
                <tr key={m.invoice} className="border-t border-cs-line"><td className="py-[7px]">{m.invoice}</td><td>{m.name}</td><td>{fmtDate(m.due)}</td><td>{inr(m.amount)}</td><td><Pill tone={TONE[statusOf(m)]}>{statusOf(m)}</Pill></td><td className="text-cs-ink-2">{m.paidAt ? `${fmtDate(m.paidAt)}${m.ref ? ` · ${m.ref}` : ""}` : "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
      {plan && (
        <Modal open={allDocs} onClose={() => setAllDocs(false)} title="Linked documents" sub={plan.orderId}>
          <ul className="divide-y divide-cs-line">
            {[...plan.documents, ...plan.milestones.map((m) => `${m.invoice}.pdf`)].map((doc) => (
              <li key={doc} className="flex items-center gap-[10px] py-[8px] text-[13px]">
                <FileText className="size-[16px] text-cs-red" strokeWidth={1.6} /><span className="flex-1">{doc}</span>
                <button type="button" aria-label={`Download ${doc}`} onClick={() => docFile(plan, doc, toast)} className="grid size-[26px] place-items-center rounded-[6px] hover:bg-[#f1f0ec]"><Download className="size-[15px]" /></button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  );
}

function total(p: PaymentPlan) { return p.milestones.reduce((a, m) => a + m.amount, 0); }
/** The milestone a schedule is "at": the earliest unpaid one, or the last if everything is paid. */
function current(p: PaymentPlan) { return p.milestones.find((m) => m.status !== "Paid") ?? p.milestones[p.milestones.length - 1]; }

function invoiceFile(s: ConsoleState, p: PaymentPlan, m: Milestone, toast: (t: string) => void) {
  const mfr = s.manufacturers.find((x) => x.id === p.mfrId);
  const lines = [
    `TAX INVOICE  ${m.invoice}`,
    "",
    `From: ${mfr?.name ?? p.mfrId}, ${mfr?.city ?? ""}, ${mfr?.state ?? ""}, India`,
    `To:   ${s.workspace}`,
    "",
    `Order:      ${p.orderId} · ${p.name}`,
    `Milestone:  ${m.name}`,
    `Due date:   ${fmtDate(m.due)}`,
    `Amount:     ${inr(m.amount)}`,
    `Status:     ${statusOf(m)}${m.paidAt ? ` (paid ${fmtDate(m.paidAt)}${m.ref ? `, ref ${m.ref}` : ""})` : ""}`,
    "",
    `Generated ${fmtDateTime(new Date().toISOString())} from Scouthru OS`,
  ];
  download(`${m.invoice}.txt`, lines.join("\n"), "text/plain");
  toast(`${m.invoice} downloaded`);
}

function docFile(p: PaymentPlan, doc: string, toast: (t: string) => void) {
  download(doc.replace(/\.pdf$/, ".txt"), `${doc}\nOrder ${p.orderId} · ${p.name}\n\n${p.milestones.map((m) => `${m.invoice}  ${m.name}  ${inr(m.amount)}  due ${fmtDate(m.due)}  ${statusOf(m)}`).join("\n")}\n`, "text/plain");
  toast(`${doc} downloaded`);
}

function PaymentPanel({ p, onRecord, onRemind, onAllMs, onAllDocs }: { p: PaymentPlan; onRecord: () => void; onRemind: () => void; onAllMs: () => void; onAllDocs: () => void }) {
  const { s, toast } = useConsole();
  const mfr = s.manufacturers.find((m) => m.id === p.mfrId);
  const order = s.orders.find((o) => o.id === p.orderId);
  const paidN = p.milestones.filter((m) => m.status === "Paid").length;
  const t = total(p);
  const paidAmt = p.milestones.filter((m) => m.status === "Paid").reduce((a, m) => a + m.amount, 0);
  const next = p.milestones.find((m) => m.status !== "Paid");
  const stageTone: Tone = p.stage === "In Production" ? "green" : p.stage === "Delivered" ? "blue" : "orange";

  return (
    <aside className="cs-card flex min-h-0 min-w-0 flex-col px-[15px] pb-[12px] pt-[14px]">
      <div className="-mx-[4px] min-h-0 flex-1 overflow-y-auto px-[4px]">
      <div className="flex items-start gap-[13px]">
        <Image src={p.img} alt="" width={96} height={80} className="h-[80px] w-[96px] shrink-0 rounded-[8px] object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="serif flex items-center gap-[6px] text-[19px] font-semibold leading-tight">{p.orderId}{order && <Link href={`/console/production?id=${order.id}`} aria-label="Open the production order" className="text-cs-ink-2 hover:text-cs-green"><ExternalLink className="size-[13px]" /></Link>}</p>
            <Pill tone={stageTone} className="!text-[10.5px]">{p.stage}</Pill>
          </div>
          <p className="mt-[3px] text-[13px] text-[#3e4440]">{p.name}</p>
          <p className="mt-[4px] text-[12.5px] font-medium">{mfr?.name}</p>
          <p className="flex items-center gap-[4px] text-[11.5px] text-cs-ink-2"><MapPin className="size-[12px]" />{mfr?.state}, India</p>
        </div>
      </div>

      <div className="mt-[14px] border-t border-cs-line pt-[12px]">
        <CardTitle right={<ViewAllBtn onClick={onAllMs} />}><span className="text-[17px]">Payment Milestones</span></CardTitle>
        <ul className="mt-[6px]">
          {p.milestones.map((m) => {
            const st = statusOf(m);
            return (
              <li key={m.invoice} className="flex items-center gap-[10px] py-[6px]">
                {st === "Paid" ? <span className="grid size-[20px] place-items-center rounded-full bg-cs-green text-white"><CheckIcon className="size-[12px]" strokeWidth={3} /></span>
                  : st === "Due Soon" || st === "Overdue" ? <span className={cn("grid size-[20px] place-items-center rounded-full text-white", st === "Overdue" ? "bg-cs-red" : "bg-[#f0a530]")}><Clock3 className="size-[12px]" strokeWidth={2.4} /></span>
                    : <span className="grid size-[20px] place-items-center rounded-full border border-[#c9ccc6] text-[#9aa19c]"><Clock3 className="size-[12px]" /></span>}
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-[12px] text-[#1d211e]">{m.name}</p>
                  <p className="text-[10.5px] text-cs-ink-2">{st === "Paid" ? `Paid on ${fmtDate(m.paidAt ?? m.due)}` : `Due on ${fmtDate(m.due)}`}</p>
                </div>
                <span className="w-[76px] text-right text-[12px]">{inr(m.amount)}</span>
                <Pill tone={TONE[st]} className="!w-[74px] justify-center !text-[10.5px]">{st === "Scheduled" ? "Pending" : st}</Pill>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-[10px] border-t border-cs-line pt-[10px]">
        <div className="flex items-baseline justify-between">
          <p className="serif text-[17px] font-semibold">Payment Progress</p>
          <p className="text-[11.5px] text-cs-ink-2">{paidN} of {p.milestones.length} milestones paid</p>
        </div>
        <div className="mt-[6px] flex items-center gap-[12px]">
          <Bar value={(paidN / p.milestones.length) * 100} className="flex-1" />
          <span className="text-[13px] font-semibold">{Math.round((paidN / p.milestones.length) * 100)}%</span>
        </div>
      </div>

      <div className="mt-[12px] grid grid-cols-2 gap-[14px] border-t border-cs-line pt-[10px]">
        <div>
          <p className="serif text-[14.5px] font-semibold">Invoice Summary</p>
          <dl className="mt-[6px] space-y-[6px] text-[11px]">
            {[["Total Order Value", inr(t)], ["Paid Amount", inr(paidAmt)], ["Pending Amount", inr(t - paidAmt)], ["Next Payment Due", next ? fmtDate(next.due) : "All paid"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2"><dt className="text-cs-ink-2">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        </div>
        <div className="border-l border-cs-line pl-[12px]">
          <div className="flex items-center justify-between gap-2"><p className="serif whitespace-nowrap text-[14.5px] font-semibold">Linked Documents</p><button type="button" onClick={onAllDocs} className="whitespace-nowrap text-[11px] font-medium text-[#2f3431] hover:text-cs-green">View All →</button></div>
          <ul className="mt-[4px] space-y-[3px]">
            {p.documents.slice(0, 3).map((doc) => (
              <li key={doc}>
                <button type="button" onClick={() => docFile(p, doc, toast)} className="flex w-full items-start gap-[7px] rounded-[5px] py-[2px] text-left hover:bg-[#f5f3ee]">
                  <FileText className="mt-[2px] size-[15px] shrink-0 text-cs-red" strokeWidth={1.6} />
                  <span className="min-w-0 leading-tight"><span className="block text-[11px] font-medium">{doc.replace(/_/g, " ").replace(/ ORD-.*|\.pdf/, "")}</span><span className="block truncate text-[10px] text-cs-ink-2">{doc}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-[10px] border-t border-cs-line pt-[10px]">
        <p className="serif text-[14.5px] font-semibold">Recent Transaction Notes</p>
        {p.notes.slice(0, 2).map((n) => (
          <div key={n.at + n.text} className="mt-[6px] flex items-start gap-[9px]">
            <Image src={n.who === s.user.name ? "/console/av-priya-sm.jpg" : "/console/av-rohit.jpg"} alt="" width={30} height={30} className="size-[30px] rounded-full" />
            <div className="min-w-0 text-[11px] leading-tight">
              <p><b className="font-semibold">{n.who}</b> <span className="text-cs-ink-2">{fmtDateTime(n.at)} · {ago(n.at)}</span></p>
              <p className="mt-[2px] text-[#3e4440]">{n.text}</p>
            </div>
          </div>
        ))}
        {p.notes.length === 0 && <p className="mt-[4px] text-[11.5px] text-cs-ink-2">No notes yet.</p>}
      </div>

      </div>
      <div className="grid shrink-0 grid-cols-[1.1fr_1fr_1.1fr] gap-[8px] pt-[10px]">
        <Btn kind="primary" icon={Wallet} className="!px-[8px] !text-[12px]" disabled={!next} onClick={onRecord}>Record Payment</Btn>
        <Btn icon={Bell} className="!px-[8px] !text-[12px]" disabled={!next} onClick={onRemind}>Send Reminder</Btn>
        <Btn icon={Download} className="!px-[8px] !text-[12px]" onClick={() => invoiceFile(s, p, next ?? p.milestones[p.milestones.length - 1], toast)}>Download Invoice</Btn>
      </div>
    </aside>
  );
}

function RecordModal({ init, onClose, onDone }: { init: { orderId: string; invoices: string[] }; onClose: () => void; onDone: () => void }) {
  const { s, update, toast } = useConsole();
  const plan = s.payments.find((p) => p.orderId === init.orderId);
  const bulk = !init.orderId;
  const options = bulk ? [] : plan?.milestones.filter((m) => m.status !== "Paid") ?? [];
  const [inv, setInv] = useState(init.invoices[0] ?? options[0]?.invoice ?? "");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [ref, setRef] = useState("");
  const ms = bulk ? s.payments.flatMap((p) => p.milestones.filter((m) => init.invoices.includes(m.invoice)).map((m) => ({ p, m }))) : options.filter((m) => m.invoice === inv).map((m) => ({ p: plan!, m }));
  const sum = ms.reduce((a, x) => a + x.m.amount, 0);

  const save = () => {
    update((d) => ms.forEach(({ p, m }) => recordPayment(d, p.orderId, m.invoice, ref.trim(), new Date(paidOn).toISOString())));
    toast(`Recorded ${ms.length} payment${ms.length === 1 ? "" : "s"} · ${inr(sum)}`);
    onDone();
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Record payment"
      sub={bulk ? `${ms.length} selected invoices` : `${plan?.orderId} · ${plan?.name}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={CheckIcon} disabled={!ms.length || !ref.trim() || !paidOn} onClick={save}>Record {inr(sum)}</Btn></>}
    >
      <div className="space-y-[12px]">
        {bulk ? (
          <ul className="divide-y divide-cs-line rounded-[8px] border border-cs-line text-[12.5px]">
            {ms.map(({ p, m }) => <li key={m.invoice} className="flex justify-between px-[11px] py-[7px]"><span>{m.invoice} · {m.name} <span className="text-cs-ink-2">({p.orderId})</span></span><b className="font-medium">{inr(m.amount)}</b></li>)}
          </ul>
        ) : (
          <Field label="Milestone">
            <select className={inputCls} value={inv} onChange={(e) => setInv(e.target.value)}>
              {options.map((m) => <option key={m.invoice} value={m.invoice}>{m.name} · {m.invoice} · due {fmtDate(m.due)}</option>)}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-[12px]">
          <Field label="Amount"><input className={cn(inputCls, "bg-[#f7f6f2]")} readOnly value={inr(sum)} /></Field>
          <Field label="Paid on"><input type="date" className={inputCls} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
        </div>
        <Field label="Payment reference" hint="UTR, cheque or transaction number"><input className={inputCls} placeholder="e.g. UTR 4521 8890 1123" value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
