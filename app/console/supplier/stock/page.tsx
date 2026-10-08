"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, Download, IndianRupee, PackagePlus, Pencil, Save, Timer, Warehouse } from "lucide-react";
import { Btn, Empty, Field, FilterSelect, Hero, Modal, Pill, RowMenu, SearchBox, StatStrip, inputCls, textareaCls } from "@/components/console/kit";
import { Board, StatusPill, buyerName, minePOs, td, th } from "@/components/console/supplier-kit";
import { useConsole } from "@/lib/console/store";
import { editStockItem, receiveStock } from "@/lib/console/actions-supplier";
import { csv, download, fmtNum, inr } from "@/lib/console/format";
import type { StockItem } from "@/lib/console/types";
import { cn } from "@/lib/cn";

export default function Page() {
  return <Suspense><Stock /></Suspense>;
}

const avail = (x: StockItem) => x.onHand - x.reserved;
const low = (x: StockItem) => avail(x) < x.moq;

function Stock() {
  const { s, update, toast } = useConsole();
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [health, setHealth] = useState("");
  const [sel, setSel] = useState<string | null>(params.get("sku"));
  const [receiving, setReceiving] = useState<StockItem | null>(null);

  useEffect(() => { const sku = params.get("sku"); if (sku) setSel(sku); }, [params]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return s.supplierStock
      .filter((x) => !t || `${x.sku} ${x.name} ${x.spec}`.toLowerCase().includes(t))
      .filter((x) => !health || (health === "Low stock" ? low(x) : health === "Out of stock" ? x.onHand === 0 : !low(x)));
  }, [s.supplierStock, q, health]);
  const item = s.supplierStock.find((x) => x.sku === sel) ?? list[0] ?? null;
  const value = s.supplierStock.reduce((a, x) => a + x.onHand * x.price, 0);
  const lows = s.supplierStock.filter(low);
  const reserved = s.supplierStock.reduce((a, x) => a + x.reserved * x.price, 0);

  return (
    <div>
      <Hero eyebrow="STOCK · PRICES · LEAD TIMES" title="Stock & Prices" lede="Keep stock and prices current so factories see you as available." img="/console/hero-dashboard.jpg" quote={["Stock.", "Prices.", "Lead times.", "Always current."]} />
      <div className="px-[15px] pb-[15px]">
        <StatStrip items={[
          { icon: Boxes, tone: "green", value: s.supplierStock.length, label: "SKUs Listed", delta: `${fmtNum(s.supplierStock.reduce((a, x) => a + x.onHand, 0))} units on hand`, deltaTone: "muted" },
          { icon: IndianRupee, tone: "blue", value: inr(value), label: "Stock Value", delta: "at list prices", deltaTone: "muted" },
          { icon: Warehouse, tone: "violet", value: inr(reserved), label: "Reserved for POs", delta: `${s.supplierStock.filter((x) => x.reserved > 0).length} SKUs held`, deltaTone: "muted" },
          { icon: AlertTriangle, tone: "red", value: lows.length, label: "Low Stock", delta: lows.length ? lows.map((x) => x.sku).slice(0, 2).join(", ") : "all above MOQ", deltaTone: lows.length ? "bad" : "muted" },
          { icon: Timer, tone: "orange", value: `${Math.round(s.supplierStock.reduce((a, x) => a + x.leadDays, 0) / Math.max(1, s.supplierStock.length))} days`, label: "Avg Lead Time", delta: "quoted to factories", deltaTone: "muted" },
        ]} />

        <Board
          height={718}
          list={
            <>
              <div className="flex flex-wrap items-center gap-[7px]">
                <SearchBox value={q} onChange={setQ} placeholder="Search by SKU, item or spec..." className="w-full min-[1024px]:w-[280px]" />
                <FilterSelect label="Stock health" value={health} onChange={setHealth} options={["Healthy", "Low stock", "Out of stock"]} className="w-[140px]" />
                <Btn icon={Download} className="ml-auto h-[34px] text-[12px]" onClick={() => download("packright-price-list.csv", csv([["SKU", "Item", "Spec", "On hand", "Reserved", "Available", "Price (₹)", "MOQ", "Lead days"], ...s.supplierStock.map((x) => [x.sku, x.name, x.spec, x.onHand, x.reserved, avail(x), x.price, x.moq, x.leadDays])]))}>Export CSV</Btn>
              </div>
              <div className="mt-[12px] min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[660px] border-separate border-spacing-0 text-[12px]">
                  <thead><tr><th className={cn(th, "rounded-l-[6px]")}>Item</th><th className={th}>On hand</th><th className={th}>Reserved</th><th className={th}>Available</th><th className={th}>Price</th><th className={th}>MOQ</th><th className={th}>Lead</th><th className={cn(th, "rounded-r-[6px]")}><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {list.map((x) => {
                      const on = item?.sku === x.sku;
                      return (
                        <tr key={x.sku} onClick={() => setSel(x.sku)} className={cn("cursor-pointer", on ? "bg-cs-mint/50" : "hover:bg-[#faf9f6]")}>
                          <td className={cn(td, on && "border-l-2 border-l-cs-green")}><span className="block font-semibold text-[#1d211e]">{x.name}</span><span className="text-[10.5px] text-cs-ink-2">{x.sku} · {x.spec}</span></td>
                          <td className={cn(td, "whitespace-nowrap")}>{fmtNum(x.onHand)}</td>
                          <td className={cn(td, "whitespace-nowrap text-cs-ink-2")}>{fmtNum(x.reserved)}</td>
                          <td className={cn(td, "whitespace-nowrap font-medium", low(x) ? "text-cs-red" : "text-cs-green-2")}>{fmtNum(avail(x))}{low(x) && <span className="block text-[10px] font-normal">below MOQ</span>}</td>
                          <td className={cn(td, "whitespace-nowrap font-medium")}>₹{x.price}</td>
                          <td className={cn(td, "whitespace-nowrap")}>{fmtNum(x.moq)}</td>
                          <td className={cn(td, "whitespace-nowrap")}>{x.leadDays} days</td>
                          <td className={cn(td, "w-[34px]")}>
                            <RowMenu items={[
                              { label: "Edit price & terms", icon: Pencil, onClick: () => setSel(x.sku) },
                              { label: "Receive stock", icon: PackagePlus, onClick: () => setReceiving(x) },
                            ]} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {list.length === 0 && <Empty>No items match.</Empty>}
              </div>
            </>
          }
          panel={item ? <Editor key={`${item.sku}-${item.onHand}-${item.price}-${item.moq}-${item.leadDays}`} item={item} onReceive={() => setReceiving(item)} /> : <Empty>Select an item.</Empty>}
        />
      </div>
      {receiving && <ReceiveModal item={receiving} onClose={() => setReceiving(null)} onDone={(n) => { update((d) => receiveStock(d, receiving.sku, n)); toast(`Received ${fmtNum(n)} ${receiving.unit} of ${receiving.sku}`); setReceiving(null); }} />}
    </div>
  );
}

function Editor({ item, onReceive }: { item: StockItem; onReceive: () => void }) {
  const { s, update, toast } = useConsole();
  // Text state so a field can be cleared and retyped; parsed when saving.
  const [priceT, setPrice] = useState(String(item.price));
  const [moqT, setMoq] = useState(String(item.moq));
  const [leadT, setLead] = useState(String(item.leadDays));
  const [onHandT, setOnHand] = useState(String(item.onHand));
  const [price, moq, lead, onHand] = [priceT, moqT, leadT, onHandT].map((v) => (v.trim() === "" ? NaN : Number(v)));
  const [note, setNote] = useState("");
  const dirty = price !== item.price || moq !== item.moq || lead !== item.leadDays || onHand !== item.onHand;
  const valid = price > 0 && moq > 0 && lead > 0 && onHand >= 0;
  const uses = minePOs(s).filter((p) => ["RFQ", "Quoted", "Confirmed"].includes(p.status) && p.lines.some((l) => l.sku === item.sku));
  return (
    <>
      <div className="-mx-[4px] min-h-0 flex-1 overflow-y-auto px-[4px]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-cs-ink-2">{item.sku}</p>
            <h2 className="serif mt-[4px] text-[19px] font-semibold leading-tight">{item.name}</h2>
            <p className="mt-[2px] text-[12px] text-cs-ink-2">{item.spec}</p>
          </div>
          {low(item) ? <Pill tone="red">Low stock</Pill> : <Pill tone="green">Healthy</Pill>}
        </div>
        <dl className="mt-[14px] grid grid-cols-3 gap-[8px] text-[11.5px]">
          {[["On hand", fmtNum(item.onHand)], ["Reserved", fmtNum(item.reserved)], ["Available", fmtNum(avail(item))]].map(([k, v]) => (
            <div key={k} className="rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-cs-ink-2">{k}</dt><dd className="font-semibold">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-[14px] text-[12.5px] font-semibold">Price &amp; terms</p>
        <div className="mt-[6px] grid grid-cols-2 gap-[8px]">
          <Field label="Price per unit (₹)"><input aria-label="Price per unit" className={inputCls} type="number" min={0} step={0.05} value={priceT} onChange={(e) => setPrice(e.target.value)} /></Field>
          <Field label="MOQ"><input aria-label="MOQ" className={inputCls} type="number" min={1} value={moqT} onChange={(e) => setMoq(e.target.value)} /></Field>
          <Field label="Lead time (days)"><input aria-label="Lead time" className={inputCls} type="number" min={1} value={leadT} onChange={(e) => setLead(e.target.value)} /></Field>
          <Field label="On hand (stock count)"><input aria-label="On hand" className={inputCls} type="number" min={0} value={onHandT} onChange={(e) => setOnHand(e.target.value)} /></Field>
        </div>
        {priceT !== String(item.price) && <div className="mt-[8px]"><Field label="Why the price changed (shown in activity)"><textarea className={cn(textareaCls, "h-[56px]")} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Resin prices up 6% this month" /></Field></div>}
        <p className="mt-[14px] text-[12.5px] font-semibold">Open requests and orders using it</p>
        <ul className="mt-[6px] space-y-[6px]">
          {uses.map((p) => (
            <li key={p.id}><Link href={`/console/supplier/${p.status === "Confirmed" ? "dispatch" : "requests"}?id=${p.id}`} className="flex items-center justify-between gap-2 rounded-[7px] border border-cs-line px-[10px] py-[7px] text-[11.5px] hover:border-[#cfcac0]"><span className="min-w-0"><span className="block truncate font-medium">{p.title}</span><span className="text-cs-ink-2">{p.id} · {buyerName(s, p.mfrId)} · {fmtNum(p.lines.find((l) => l.sku === item.sku)!.qty)}</span></span><StatusPill status={p.status} /></Link></li>
          ))}
          {uses.length === 0 && <li className="text-[11.5px] text-cs-ink-2">Not on any open request.</li>}
        </ul>
      </div>
      <div className="mt-[10px] grid grid-cols-2 gap-[8px] border-t border-cs-line pt-[10px]">
        <Btn kind="primary" icon={Save} className="h-[38px] text-[12.5px]" disabled={!dirty || !valid} onClick={() => { update((d) => editStockItem(d, item.sku, { price, moq, leadDays: lead, onHand }, note.trim())); toast(`${item.sku} updated`); setNote(""); }}>Save changes</Btn>
        <Btn icon={PackagePlus} className="h-[38px] text-[12.5px]" onClick={onReceive}>Receive stock</Btn>
      </div>
    </>
  );
}

function ReceiveModal({ item, onClose, onDone }: { item: StockItem; onClose: () => void; onDone: (n: number) => void }) {
  const [t, setT] = useState(String(item.moq));
  const n = Number(t) || 0;
  return (
    <Modal open onClose={onClose} title={`Receive stock · ${item.sku}`} sub={item.name}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={PackagePlus} disabled={n <= 0} onClick={() => onDone(n)}>Add {fmtNum(n)} {item.unit}</Btn></>}>
      <Field label={`Quantity received (${item.unit})`} hint={`On hand now ${fmtNum(item.onHand)} → ${fmtNum(item.onHand + Math.max(0, n))}`}><input aria-label="Quantity received" className={inputCls} type="number" min={1} value={t} onChange={(e) => setT(e.target.value)} /></Field>
    </Modal>
  );
}
