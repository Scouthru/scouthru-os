"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, IndianRupee, PackageCheck, PackageOpen, Plus, Send, Trash2, Truck, Wallet } from "lucide-react";
import { Btn, Empty, Field, Hero, Modal, Pill, RowMenu, StatStrip, Stepper, Tabs, inputCls } from "@/components/console/kit";
import { KV, PO_STEPS, PO_TONE, Page, Panel, PayModal, Split, tdc, thc } from "@/components/console/maker";
import { useConsole } from "@/lib/console/store";
import { confirmPO, receivePO, requestMaterials } from "@/lib/console/actions-network";
import { mine, openOrders } from "@/lib/console/actions-maker";
import { ago, fmtDate, fmtDateTime, fmtNum, inr } from "@/lib/console/format";
import type { MaterialLine, POStatus, PurchaseOrder } from "@/lib/console/types";
import { cn } from "@/lib/cn";

type Tab = "all" | "rfq" | "quoted" | "onorder" | "received";
/** Short step names so six steps fit the panel width. */
const STEP_LABEL: Record<POStatus, string> = { RFQ: "Asked", Quoted: "Quoted", Confirmed: "Agreed", Dispatched: "Shipped", Received: "Received", Paid: "Paid", Declined: "Declined" };
const IN_TAB: Record<Tab, POStatus[]> = { all: ["RFQ", "Quoted", "Confirmed", "Dispatched", "Received", "Paid", "Declined"], rfq: ["RFQ"], quoted: ["Quoted"], onorder: ["Confirmed", "Dispatched"], received: ["Received", "Paid"] };

export default function MakerMaterialsPage() {
  return <Suspense><MakerMaterials /></Suspense>;
}

function MakerMaterials() {
  const { s, update, toast } = useConsole();
  const params = useSearchParams();
  const pos = useMemo(() => mine(s).pos.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [s]);
  const [tab, setTab] = useState<Tab>("all");
  const [sel, setSel] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [payFor, setPayFor] = useState<PurchaseOrder | null>(null);
  const [recvFor, setRecvFor] = useState<PurchaseOrder | null>(null);
  useEffect(() => {
    const id = params.get("id");
    if (id) { setSel(id); setTab("all"); }
    if (params.get("new")) setNewOpen(true);
  }, [params]);
  const count = (t: Tab) => pos.filter((p) => IN_TAB[t].includes(p.status)).length;
  const list = pos.filter((p) => IN_TAB[tab].includes(p.status));
  const cur = pos.find((p) => p.id === sel) ?? list[0] ?? null;
  const supplier = (id: string) => s.suppliers.find((x) => x.id === id)?.name ?? id;
  const onOrderValue = pos.filter((p) => p.status === "Confirmed" || p.status === "Dispatched").reduce((a, p) => a + (p.quote?.total ?? 0), 0);
  const unpaid = pos.filter((p) => p.invoice && !p.invoice.paidAt);

  return (
    <div>
      <Hero eyebrow="SOURCE · CONFIRM · RECEIVE" title="Materials" lede={<>Ask suppliers for packaging and ingredients, accept their quotes, and track<br />deliveries against each production order.</>} img="/console/hero-products.jpg" height={152} quoteTop={36} quoteWidth={212} quote={["From concept", "to shelf-ready", "product."]} />
      <Page>
        <StatStrip items={[
          { icon: ClipboardList, tone: "orange", value: count("rfq"), label: "Waiting for Quotes", delta: "Sent to suppliers", deltaTone: "muted" },
          { icon: Send, tone: "violet", value: count("quoted"), label: "Quotes to Accept", delta: count("quoted") ? "Review and confirm" : "None waiting", deltaTone: count("quoted") ? "bad" : "muted" },
          { icon: Truck, tone: "blue", value: count("onorder"), label: "On Order", delta: inr(onOrderValue), deltaTone: "muted" },
          { icon: PackageCheck, tone: "green", value: pos.filter((p) => p.status === "Received" || p.status === "Paid").length, label: "Received", delta: "Into the factory" },
          { icon: Wallet, tone: "red", value: unpaid.length, label: "Invoices to Pay", delta: inr(unpaid.reduce((a, p) => a + (p.invoice?.amount ?? 0), 0)), deltaTone: unpaid.length ? "bad" : "muted" },
        ]} />
        <Split side="1fr" hero={152}>
          <Panel>
            <div className="px-[15px] pt-[12px]">
              <Tabs<Tab> value={tab} onChange={(t) => { setTab(t); setSel(null); }} tabs={[
                { key: "all", label: `All (${pos.length})` }, { key: "rfq", label: `Waiting for Quote (${count("rfq")})` }, { key: "quoted", label: `Quoted (${count("quoted")})` },
                { key: "onorder", label: `On Order (${count("onorder")})` }, { key: "received", label: `Received (${count("received")})` },
              ]} />
              <div className="mt-[12px] flex"><Btn kind="primary" icon={Plus} className="ml-auto h-[34px] text-[12.5px]" onClick={() => setNewOpen(true)}>Request materials</Btn></div>
            </div>
            <div className="mt-[8px] overflow-x-auto px-[7px]">
              <table className="w-full min-w-[600px] border-separate border-spacing-0">
                <thead><tr><th className={thc}>Purchase order</th><th className={thc}>Supplier</th><th className={thc}>Need by</th><th className={thc}>Value</th><th className={thc}>Status</th><th className={thc}><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {list.map((p) => {
                    const on = cur?.id === p.id;
                    return (
                      <tr key={p.id} onClick={() => setSel(p.id)} className={cn("cursor-pointer", on ? "bg-cs-mint/50" : "hover:bg-[#faf9f5]")}>
                        <td className={cn(tdc, on && "border-l-2 border-l-cs-green")}><p className="font-medium">{p.id}</p><p className="max-w-[220px] truncate text-[11px] text-cs-ink-2">{p.title}</p></td>
                        <td className={tdc}>{supplier(p.supplierId)}</td>
                        <td className={tdc}>{fmtDate(p.needBy)}</td>
                        <td className={tdc}>{p.quote ? inr(p.quote.total) : <span className="text-cs-ink-2">—</span>}</td>
                        <td className={tdc}><Pill tone={PO_TONE[p.status]}>{p.status === "RFQ" ? "Waiting for quote" : p.status}</Pill></td>
                        <td className={cn(tdc, "w-[34px]")}>
                          <RowMenu items={[
                            { label: "Open", onClick: () => setSel(p.id) },
                            { label: "Accept quote", icon: CheckCircle2, onClick: () => accept(p.id), disabled: p.status !== "Quoted" },
                            { label: "Mark received", icon: PackageCheck, onClick: () => setRecvFor(p), disabled: p.status !== "Dispatched" },
                            { label: "Pay invoice", icon: IndianRupee, onClick: () => setPayFor(p), disabled: !p.invoice || !!p.invoice.paidAt },
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {list.length === 0 && <Empty>No purchase orders here.</Empty>}
            </div>
          </Panel>
          {cur ? <PODetail p={cur} supplierName={supplier(cur.supplierId)} onAccept={() => accept(cur.id)} onReceive={() => setRecvFor(cur)} onPay={() => setPayFor(cur)} /> : <Panel><Empty>Request materials to start a purchase order.</Empty></Panel>}
        </Split>
      </Page>
      {newOpen && <RequestModal onClose={() => setNewOpen(false)} onDone={(id) => { setNewOpen(false); setTab("all"); setSel(id); }} />}
      {payFor && <PayModal p={payFor} onClose={() => setPayFor(null)} />}
      {recvFor && <ReceiveModal p={recvFor} onClose={() => setRecvFor(null)} />}
    </div>
  );

  function accept(id: string) {
    update((d) => confirmPO(d, id));
    toast(`${id} confirmed. The supplier will dispatch.`);
  }
}

function PODetail({ p, supplierName, onAccept, onReceive, onPay }: { p: PurchaseOrder; supplierName: string; onAccept: () => void; onReceive: () => void; onPay: () => void }) {
  const step = p.status === "Declined" ? 0 : PO_STEPS.indexOf(p.status);
  return (
    <Panel bodyClass="px-[15px] pb-[14px] pt-[14px]">
      <div className="flex items-start gap-[12px]">
        <span className="grid size-[52px] shrink-0 place-items-center rounded-[10px] bg-cs-mint text-cs-green"><PackageOpen className="size-[24px]" strokeWidth={1.6} /></span>
        <div className="min-w-0"><h3 className="serif text-[19px] font-semibold leading-tight">{p.title}</h3><p className="mt-[2px] text-[12px] text-cs-ink-2">{p.id} · {supplierName}{p.orderId ? ` · for ${p.orderId}` : ""}</p><Pill tone={PO_TONE[p.status]} className="mt-[6px]">{p.status === "RFQ" ? "Waiting for quote" : p.status}</Pill></div>
      </div>
      <div className="mt-[14px]"><Stepper size={34} current={step} allDone={p.status === "Paid"} steps={PO_STEPS.map((x) => ({ label: STEP_LABEL[x], icon: x === "Paid" ? IndianRupee : x === "Dispatched" ? Truck : x === "Received" ? PackageCheck : ClipboardList }))} /></div>
      <h4 className="serif mt-[14px] text-[16px] font-semibold">Items</h4>
      <ul className="mt-[4px] divide-y divide-[#f1efea] text-[12px]">
        {p.lines.map((l) => <li key={l.sku} className="flex justify-between gap-2 py-[5px]"><span className="min-w-0 truncate">{l.name} <span className="text-cs-ink-2">· {l.sku}</span></span><b className="shrink-0">{fmtNum(l.qty)} {l.unit}</b></li>)}
      </ul>
      <dl className="mt-[10px]">
        <KV k="Need by" v={fmtDate(p.needBy)} />
        <KV k="Quote" v={p.quote ? `${inr(p.quote.total)} · ${p.quote.leadDays} days${p.quote.note ? ` · ${p.quote.note}` : ""}` : "Waiting for the supplier"} />
        {p.vehicle && <KV k="Vehicle" v={p.vehicle} />}
        {p.invoice && <KV k="Invoice" v={`${p.invoice.no} · ${inr(p.invoice.amount)} · ${p.invoice.paidAt ? `paid ${fmtDate(p.invoice.paidAt)}` : `due ${fmtDate(p.invoice.due)}`}`} />}
      </dl>
      <div className="mt-[12px] flex flex-wrap gap-[8px]">
        {p.status === "Quoted" && <Btn kind="primary" icon={CheckCircle2} className="flex-1" onClick={onAccept}>Accept quote · {inr(p.quote!.total)}</Btn>}
        {p.status === "Dispatched" && <Btn kind="primary" icon={PackageCheck} className="flex-1" onClick={onReceive}>Mark received</Btn>}
        {p.invoice && !p.invoice.paidAt && <Btn icon={IndianRupee} className="flex-1" onClick={onPay}>Pay {inr(p.invoice.amount)}</Btn>}
      </div>
      <h4 className="serif mt-[14px] text-[16px] font-semibold">History</h4>
      <ul className="mt-[6px] space-y-[6px] text-[12px]">
        {p.events.slice().reverse().map((e, i) => <li key={i} className="flex gap-[9px]"><span className="mt-[5px] size-[7px] shrink-0 rounded-full bg-cs-green-2" /><span className="min-w-0 flex-1">{e.text}<span className="block text-[11px] text-cs-ink-2">{fmtDateTime(e.at)}</span></span></li>)}
      </ul>
      <p className="mt-[10px] text-[11px] text-cs-ink-2">Updated {ago(p.updatedAt)}</p>
    </Panel>
  );
}

function RequestModal({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const { s, update: up, toast: tt } = useConsole();
  const [supplierId, setSupplierId] = useState(s.supplierId);
  const stock = supplierId === s.supplierId ? s.supplierStock : [];
  const [lines, setLines] = useState<MaterialLine[]>([]);
  const [sku, setSku] = useState("");
  const [custom, setCustom] = useState("");
  const [qty, setQty] = useState("");
  const [title, setTitle] = useState("");
  const [needBy, setNeedBy] = useState(new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10));
  const [orderId, setOrderId] = useState(openOrders(s)[0]?.id ?? "");
  const addLine = () => {
    const n = Number(qty);
    if (!(n > 0)) return;
    const st = stock.find((x) => x.sku === sku);
    const name = st?.name ?? custom.trim();
    if (!name) return;
    setLines([...lines, { sku: st?.sku ?? `CUS-${lines.length + 1}`, name, qty: n, unit: st?.unit ?? "units" }]);
    setSku(""); setCustom(""); setQty("");
  };
  const ok = lines.length > 0 && title.trim() && needBy;
  return (
    <Modal open onClose={onClose} title="Request materials" sub="The supplier gets an RFQ and replies with a quote." width={600}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={Send} disabled={!ok} onClick={() => {
        let id = "";
        up((d) => { id = requestMaterials(d, { supplierId, mfrId: d.makerId, title: title.trim(), lines, needBy: new Date(needBy).toISOString(), orderId: orderId || undefined }); });
        tt(`RFQ ${id} sent`);
        onDone(id);
      }}>Send request</Btn></>}>
      <div className="space-y-[12px]">
        <div className="grid grid-cols-2 gap-[10px]">
          <Field label="Supplier"><select className={inputCls} value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setLines([]); }}>{s.suppliers.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.kind}</option>)}</select></Field>
          <Field label="For production order"><select className={inputCls} value={orderId} onChange={(e) => setOrderId(e.target.value)}><option value="">General stock</option>{openOrders(s).map((o) => <option key={o.id} value={o.id}>{o.id} · {o.name}</option>)}</select></Field>
        </div>
        <Field label="Title"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bottles and caps for batch 5" /></Field>
        <div className="rounded-[9px] border border-cs-line p-[10px]">
          <p className="text-[12px] font-medium">Items</p>
          <ul className="mt-[4px] space-y-[3px] text-[12px]">
            {lines.map((l, i) => <li key={i} className="flex items-center justify-between gap-2"><span className="truncate">{l.name}</span><span className="flex shrink-0 items-center gap-[8px]"><b>{fmtNum(l.qty)} {l.unit}</b><button type="button" aria-label="Remove item" onClick={() => setLines(lines.filter((_, k) => k !== i))}><Trash2 className="size-[13px] text-cs-red" /></button></span></li>)}
            {lines.length === 0 && <li className="text-cs-ink-2">No items yet.</li>}
          </ul>
          <div className="mt-[8px] grid grid-cols-[minmax(0,1fr)_110px_auto] gap-[8px]">
            {stock.length ? (
              <select className={cn(inputCls, "h-[34px] text-[12px]")} value={sku} onChange={(e) => setSku(e.target.value)} aria-label="Item"><option value="">Choose an item…</option>{stock.map((x) => <option key={x.sku} value={x.sku}>{x.name} · ₹{x.price}/{x.unit === "pcs" ? "pc" : x.unit}</option>)}</select>
            ) : (
              <input className={cn(inputCls, "h-[34px] text-[12px]")} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Item, e.g. Ashwagandha extract 5%" aria-label="Item" />
            )}
            <input className={cn(inputCls, "h-[34px] text-[12px]")} type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" aria-label="Quantity" />
            <Btn icon={Plus} className="h-[34px] text-[12px]" onClick={addLine} disabled={!(Number(qty) > 0) || !(sku || custom.trim())}>Add</Btn>
          </div>
        </div>
        <Field label="Need by"><input className={inputCls} type="date" value={needBy} onChange={(e) => setNeedBy(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function ReceiveModal({ p, onClose }: { p: PurchaseOrder; onClose: () => void }) {
  const { update: up, toast: tt } = useConsole();
  const [note, setNote] = useState("");
  return (
    <Modal open onClose={onClose} title="Mark materials received" sub={`${p.id} · ${p.title}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={PackageCheck} onClick={() => { up((d) => receivePO(d, p.id, note.trim())); tt(`${p.id} received`); onClose(); }}>Received</Btn></>}>
      <Field label="Note (optional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. All cartons intact, counted 50,000" /></Field>
    </Modal>
  );
}
