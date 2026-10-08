"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CalendarClock, ClipboardList, FileText, IndianRupee, Inbox, Plus, Send, Trash2, X, XCircle } from "lucide-react";
import { Btn, Empty, Field, FilterSelect, Hero, Modal, RowMenu, SearchBox, StatStrip, Tabs, inputCls } from "@/components/console/kit";
import { Board, DeclineModal, EventLog, LinesTable, PoStepper, QuoteModal, SourceBadge, StatusPill, buyerName, minePOs, poValue, td, th } from "@/components/console/supplier-kit";
import { useConsole } from "@/lib/console/store";
import { addSupplierRequest } from "@/lib/console/actions-network";
import { ago, daysUntil, fmtDate, fmtNum, inr } from "@/lib/console/format";
import type { MaterialLine, PurchaseOrder } from "@/lib/console/types";
import { cn } from "@/lib/cn";

type TabKey = "new" | "quoted" | "declined";
const TAB_STATUS: Record<TabKey, PurchaseOrder["status"]> = { new: "RFQ", quoted: "Quoted", declined: "Declined" };
const NEED = { "This week": 7, "Next 2 weeks": 14, "Later": 100000 } as const;

export default function Page() {
  return <Suspense><Requests /></Suspense>;
}

function Requests() {
  const { s } = useConsole();
  const params = useSearchParams();
  const all = minePOs(s).filter((p) => p.status === "RFQ" || p.status === "Quoted" || p.status === "Declined");
  const [tab, setTab] = useState<TabKey>("new");
  const [q, setQ] = useState("");
  const [buyer, setBuyer] = useState("");
  const [source, setSource] = useState("");
  const [need, setNeed] = useState("");
  const [sel, setSel] = useState<string | null>(params.get("id"));
  const [quoteFor, setQuoteFor] = useState<PurchaseOrder | null>(null);
  const [declineFor, setDeclineFor] = useState<PurchaseOrder | null>(null);
  const [adding, setAdding] = useState(params.get("add") === "1");

  useEffect(() => {
    const id = params.get("id");
    if (!id) return;
    setSel(id);
    const po = s.purchaseOrders.find((p) => p.id === id);
    if (po) setTab(po.status === "Quoted" ? "quoted" : po.status === "Declined" ? "declined" : "new");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all
      .filter((p) => p.status === TAB_STATUS[tab])
      .filter((p) => !t || `${p.id} ${p.title} ${buyerName(s, p.mfrId)} ${p.lines.map((l) => l.name).join(" ")}`.toLowerCase().includes(t))
      .filter((p) => !buyer || buyerName(s, p.mfrId) === buyer)
      .filter((p) => !source || p.source === source)
      .filter((p) => {
        if (!need) return true;
        const d = daysUntil(p.needBy);
        return need === "This week" ? d <= 7 : need === "Next 2 weeks" ? d > 7 && d <= 14 : d > NEED["Next 2 weeks"];
      })
      .sort((a, b) => a.needBy.localeCompare(b.needBy));
  }, [all, tab, q, buyer, source, need, s]);

  const po = s.purchaseOrders.find((p) => p.id === sel) ?? list[0] ?? null;
  const count = (k: TabKey) => all.filter((p) => p.status === TAB_STATUS[k]).length;
  const rfq = all.filter((p) => p.status === "RFQ");
  const quoted = all.filter((p) => p.status === "Quoted");
  const thisWeek = rfq.filter((p) => daysUntil(p.needBy) <= 7).length;
  const decided = minePOs(s).filter((p) => p.quote && p.status !== "Quoted");
  const won = decided.filter((p) => p.status !== "Declined").length;

  return (
    <div>
      <Hero eyebrow="QUOTE · CONFIRM · SUPPLY" title="Requests" lede="Quote requests from every channel. Check stock, price it and send the quote." img="/console/hero-products.jpg" height={152} quoteTop={36} quoteWidth={226} quote={["Quote fast.", "Win the order.", "Ship on time."]} />
      <div className="px-[15px] pb-[15px]">
        <StatStrip items={[
          { icon: Inbox, tone: "orange", value: rfq.length, label: "New Requests", delta: `${thisWeek} needed this week`, deltaTone: thisWeek ? "bad" : "muted" },
          { icon: FileText, tone: "blue", value: quoted.length, label: "Quotes Awaiting Reply", delta: `${inr(quoted.reduce((a, p) => a + poValue(s, p), 0))} quoted` },
          { icon: IndianRupee, tone: "green", value: inr(rfq.reduce((a, p) => a + poValue(s, p), 0)), label: "Open Request Value", delta: "at list prices", deltaTone: "muted" },
          { icon: ClipboardList, tone: "violet", value: `${decided.length ? Math.round((won / decided.length) * 100) : 0}%`, label: "Quote Win Rate", delta: `${won} of ${decided.length} decided` },
          { icon: XCircle, tone: "gray", value: count("declined"), label: "Declined", delta: "this period", deltaTone: "muted" },
        ]} />

        <Board
          height={743}
          list={
            <>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <Tabs tabs={[{ key: "new", label: `New (${count("new")})` }, { key: "quoted", label: `Quoted (${count("quoted")})` }, { key: "declined", label: `Declined (${count("declined")})` }]} value={tab} onChange={(k) => { setTab(k); setSel(null); }} className="min-w-0 flex-1" />
                <Btn kind="primary" icon={Plus} className="mb-[6px] h-[34px] text-[12.5px]" onClick={() => setAdding(true)}>Add request</Btn>
              </div>
              <div className="mt-[12px] flex flex-wrap items-center gap-[7px]">
                <SearchBox value={q} onChange={setQ} placeholder="Search by request, item or factory..." className="w-full min-[1024px]:w-[260px]" />
                <FilterSelect label="Buyer" value={buyer} onChange={setBuyer} options={Array.from(new Set(all.map((p) => buyerName(s, p.mfrId))))} className="w-[150px]" />
                <FilterSelect label="Source" value={source} onChange={setSource} options={["Scouthru", "IndiaMART", "WhatsApp", "Phone"]} className="w-[110px]" />
                <FilterSelect label="Need by" value={need} onChange={setNeed} options={Object.keys(NEED)} className="w-[120px]" />
              </div>
              <div className="mt-[12px] min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[640px] border-separate border-spacing-0 text-[12px]">
                  <thead><tr><th className={cn(th, "rounded-l-[6px]")}>Request</th><th className={th}>Buyer</th><th className={th}>Source</th><th className={th}>Items</th><th className={th}>Value</th><th className={th}>Need by</th><th className={th}>Status</th><th className={cn(th, "rounded-r-[6px]")}><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {list.map((p) => {
                      const on = po?.id === p.id;
                      const d = daysUntil(p.needBy);
                      return (
                        <tr key={p.id} onClick={() => setSel(p.id)} className={cn("cursor-pointer", on ? "bg-cs-mint/50" : "hover:bg-[#faf9f6]")}>
                          <td className={cn(td, on && "border-l-2 border-l-cs-green")}><span className="block font-semibold text-[#1d211e]">{p.title}</span><span className="text-[10.5px] text-cs-ink-2">{p.id} · {ago(p.createdAt)}</span></td>
                          <td className={td}>{buyerName(s, p.mfrId)}</td>
                          <td className={td}><SourceBadge source={p.source} /></td>
                          <td className={td}>{p.lines.length} line{p.lines.length > 1 ? "s" : ""}<span className="block text-[10.5px] text-cs-ink-2">{fmtNum(p.lines.reduce((a, l) => a + l.qty, 0))} units</span></td>
                          <td className={cn(td, "whitespace-nowrap font-medium")}>{inr(poValue(s, p))}</td>
                          <td className={cn(td, "whitespace-nowrap")}>{fmtDate(p.needBy)}<span className={cn("block text-[10.5px]", d < 0 ? "text-cs-red" : d <= 7 ? "text-cs-orange" : "text-cs-ink-2")}>{d < 0 ? `${-d} days late` : `in ${d} days`}</span></td>
                          <td className={td}><StatusPill status={p.status} /></td>
                          <td className={cn(td, "w-[34px]")}>
                            <RowMenu items={[
                              { label: "Open", icon: FileText, onClick: () => setSel(p.id) },
                              { label: p.status === "Quoted" ? "Revise quote" : "Send quote", icon: Send, onClick: () => setQuoteFor(p), disabled: p.status === "Declined" },
                              { label: "Decline", icon: X, onClick: () => setDeclineFor(p), disabled: p.status === "Declined", danger: true },
                            ]} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {list.length === 0 && <Empty>No requests here. {tab === "new" ? "New quote requests from factories show up here." : ""}</Empty>}
              </div>
            </>
          }
          panel={po ? <Panel po={po} onQuote={() => setQuoteFor(po)} onDecline={() => setDeclineFor(po)} /> : <Empty>Select a request to see its details.</Empty>}
        />
      </div>
      <QuoteModal po={quoteFor} onClose={() => setQuoteFor(null)} />
      <DeclineModal po={declineFor} onClose={() => setDeclineFor(null)} />
      {adding && <AddRequest onClose={(id) => { setAdding(false); if (id) { setTab("new"); setSel(id); } }} />}
    </div>
  );
}

function Panel({ po, onQuote, onDecline }: { po: PurchaseOrder; onQuote: () => void; onDecline: () => void }) {
  const { s } = useConsole();
  const open = po.status === "RFQ" || po.status === "Quoted";
  const later = !open && po.status !== "Declined";
  return (
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
          <div className="rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-cs-ink-2">Need by</dt><dd className="font-semibold">{fmtDate(po.needBy)}</dd></div>
          <div className="rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-cs-ink-2">Received</dt><dd className="font-semibold">{ago(po.createdAt)}</dd></div>
          <div className="col-span-2 rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-cs-ink-2">For production order</dt><dd className="font-semibold">{po.orderId ?? "Not linked"}</dd></div>
        </dl>
        <p className="mt-[14px] text-[12.5px] font-semibold">Items and availability</p>
        <div className="mt-[4px]"><LinesTable po={po} /></div>
        {po.quote && (
          <div className="mt-[12px] rounded-[8px] bg-cs-mint/60 px-[11px] py-[9px] text-[12px]">
            <p className="font-semibold text-cs-green">Your quote: {inr(po.quote.total)} · {po.quote.leadDays} days</p>
            {po.quote.note && <p className="mt-[2px] text-cs-ink-2">{po.quote.note}</p>}
            <p className="mt-[2px] text-[10.5px] text-cs-ink-2">Sent {ago(po.quote.at)} · {po.status === "Quoted" ? "waiting for the factory to confirm" : po.status}</p>
          </div>
        )}
        <p className="mt-[14px] text-[12.5px] font-semibold">History</p>
        <div className="mt-[6px]"><EventLog po={po} /></div>
      </div>
      <div className="mt-[10px] grid grid-cols-2 gap-[8px] border-t border-cs-line pt-[10px]">
        {open && <Btn kind="primary" icon={Send} className="h-[38px] text-[12.5px]" onClick={onQuote}>{po.status === "Quoted" ? "Revise quote" : "Send quote"}</Btn>}
        {open && <Btn kind="danger" icon={X} className="h-[38px] text-[12.5px]" onClick={onDecline}>Decline</Btn>}
        {later && <Link href={`/console/supplier/pos?id=${po.id}`} className="col-span-2 inline-flex h-[38px] items-center justify-center rounded-[7px] bg-cs-green text-[12.5px] font-medium text-white">Open purchase order</Link>}
        {po.status === "Declined" && <p className="col-span-2 text-center text-[12px] text-cs-ink-2">Declined requests stay here for your records.</p>}
      </div>
    </>
  );
}

function AddRequest({ onClose }: { onClose: (id?: string) => void }) {
  const { s, update, toast } = useConsole();
  const [mfr, setMfr] = useState(s.manufacturers[0]?.id ?? "");
  const [source, setSource] = useState<PurchaseOrder["source"]>("WhatsApp");
  const [title, setTitle] = useState("");
  const [needBy, setNeedBy] = useState(new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10));
  const [lines, setLines] = useState<MaterialLine[]>([{ sku: s.supplierStock[0].sku, name: s.supplierStock[0].name, qty: s.supplierStock[0].moq, unit: s.supplierStock[0].unit }]);
  const setLine = (i: number, patch: Partial<MaterialLine>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const valid = !!mfr && title.trim() && lines.every((l) => l.qty > 0) && !!needBy;
  return (
    <Modal open onClose={() => onClose()} title="Add request from another channel" sub="A factory asked on WhatsApp, IndiaMART or the phone? Log it here so it's quoted like any other request." width={600}
      footer={<><Btn onClick={() => onClose()}>Cancel</Btn><Btn kind="primary" icon={Plus} disabled={!valid} onClick={() => { let id = ""; update((d) => { id = addSupplierRequest(d, { mfrId: mfr, title: title.trim(), lines, needBy: new Date(needBy).toISOString(), source }); }); toast(`Request ${id} added`); onClose(id); }}>Add request</Btn></>}>
      <div className="space-y-[12px]">
        <div className="grid grid-cols-2 gap-[10px]">
          <Field label="Factory"><select className={inputCls} value={mfr} onChange={(e) => setMfr(e.target.value)}>{s.manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
          <Field label="Came in via"><select className={inputCls} value={source} onChange={(e) => setSource(e.target.value as PurchaseOrder["source"])}>{["WhatsApp", "IndiaMART", "Phone"].map((x) => <option key={x}>{x}</option>)}</select></Field>
        </div>
        <Field label="What do they need?"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bottles and caps for a gummy run" /></Field>
        <div>
          <p className="mb-[5px] text-[12px] font-medium text-[#3e4440]">Items</p>
          <div className="space-y-[6px]">
            {lines.map((l, i) => (
              <div key={i} className="flex gap-[6px]">
                <select aria-label="Item" className={cn(inputCls, "flex-1")} value={l.sku} onChange={(e) => { const st = s.supplierStock.find((x) => x.sku === e.target.value)!; setLine(i, { sku: st.sku, name: st.name, unit: st.unit, qty: st.moq }); }}>
                  {s.supplierStock.map((x) => <option key={x.sku} value={x.sku}>{x.sku} · {x.name}</option>)}
                </select>
                <input aria-label="Quantity" type="number" min={1} className={cn(inputCls, "w-[110px]")} value={l.qty || ""} onChange={(e) => setLine(i, { qty: Number(e.target.value) || 0 })} />
                <button type="button" aria-label="Remove item" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, k) => k !== i))} className="grid w-[38px] place-items-center rounded-[7px] border border-[#d6d8d3] disabled:opacity-40"><Trash2 className="size-[15px]" /></button>
              </div>
            ))}
          </div>
          <button type="button" className="mt-[7px] inline-flex items-center gap-[5px] text-[12px] font-medium text-cs-green" onClick={() => { const st = s.supplierStock[0]; setLines([...lines, { sku: st.sku, name: st.name, qty: st.moq, unit: st.unit }]); }}><Plus className="size-[13px]" />Add item</button>
        </div>
        <Field label="Need by"><span className="relative block"><CalendarClock className="pointer-events-none absolute right-[10px] top-[11px] size-[15px] text-cs-ink-2" /><input className={inputCls} type="date" value={needBy} onChange={(e) => setNeedBy(e.target.value)} /></span></Field>
      </div>
    </Modal>
  );
}
