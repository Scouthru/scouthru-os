"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, PackageCheck, Plus, Trash2, Wallet } from "lucide-react";
import { Btn, Field, Modal, inputCls, textareaCls, type Tone } from "./kit";
import { useConsole } from "@/lib/console/store";
import { collectPayment, createRetailOrder, receiveInbound, requestRestock } from "@/lib/console/actions-network";
import { adjustStock, saveRoute } from "@/lib/console/actions-distributor";
import { fmtDate, fmtNum, inr } from "@/lib/console/format";
import type { ConsoleState, Grn, RetailOrder, Route, Shipment } from "@/lib/console/types";

/** Pieces shared by the distributor portal screens. */

export const RO_TONE: Record<RetailOrder["status"], Tone> = { New: "orange", Packed: "blue", "Out for Delivery": "violet", Delivered: "green", Cancelled: "gray" };

const D = 864e5;
export const ageDays = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / D));
export const daysTo = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / D);

/** Brand shipments headed to the distributor's city, with their GRN if counted in. */
export function inboundFor(s: ConsoleState) {
  return s.shipments
    .filter((x) => x.destination.includes(s.distributor.city))
    .map((x) => ({ sh: x, grn: s.grns.find((g) => g.shipmentId === x.id) }));
}

export type InboundState = "In Transit" | "At the Dock" | "Received";
export function inboundState(sh: Shipment, grn?: Grn): InboundState {
  if (grn) return "Received";
  return sh.status === "Delivered" ? "At the Dock" : "In Transit";
}
export const INBOUND_TONE: Record<InboundState, Tone> = { "In Transit": "blue", "At the Dock": "orange", Received: "green" };

export const stockValue = (s: ConsoleState) => s.distStock.reduce((a, x) => a + x.onHand * x.price, 0);
export const skuName = (s: ConsoleState, sku: string) => s.distStock.find((x) => x.sku === sku)?.product ?? sku;

export function grnText(s: ConsoleState, g: Grn) {
  const sh = s.shipments.find((x) => x.id === g.shipmentId);
  return [
    `GOODS RECEIVED NOTE`,
    `${s.distributor.name}, ${s.distributor.city}`,
    ``,
    `Shipment:   ${g.shipmentId}`,
    `From:       ${s.workspace}${sh ? ` via ${sh.carrier}` : ""}`,
    `Received:   ${fmtDate(g.at)}`,
    ``,
    `SKU        Product                          Invoiced  Received  Damaged`,
    ...g.lines.map((l) => `${l.sku.padEnd(10)} ${l.product.padEnd(32)} ${String(l.invoiced).padStart(8)}  ${String(l.received).padStart(8)}  ${String(l.damaged).padStart(7)}`),
    ``,
    g.claim ? `Claim: ${g.claim}` : `No damage claim.`,
  ].join("\n");
}

export function invoiceText(s: ConsoleState, o: RetailOrder) {
  return [
    `TAX INVOICE`,
    `${s.distributor.name}, ${s.distributor.city}`,
    ``,
    `Invoice:   ${o.id}`,
    `Bill to:   ${o.retailer}`,
    `Date:      ${fmtDate(o.at)}`,
    ``,
    `SKU        Product                          Qty      Rate       Amount`,
    ...o.lines.map((l) => {
      const st = s.distStock.find((x) => x.sku === l.sku);
      const rate = st?.price ?? 0;
      return `${l.sku.padEnd(10)} ${(st?.product ?? l.sku).padEnd(32)} ${String(l.qty).padStart(4)}  ${inr(rate).padStart(8)}  ${inr(rate * l.qty).padStart(11)}`;
    }),
    ``,
    `Total: ${inr(o.value)}`,
    `Payment: ${o.payment}${o.collected ? ` (${o.collected.mode}, ref ${o.collected.ref})` : ""}`,
  ].join("\n");
}

/* ---------------------------------- modals --------------------------------- */

/** Count a delivered (or arriving) shipment into the warehouse. */
export function ReceiveModal({ sh, onClose }: { sh: Shipment | null; onClose: () => void }) {
  const { s, update, toast } = useConsole();
  const [received, setReceived] = useState(0);
  const [damaged, setDamaged] = useState(0);
  const [note, setNote] = useState("");
  useEffect(() => { if (sh) { setReceived(sh.qty); setDamaged(0); setNote(""); } }, [sh]);
  if (!sh) return null;
  const short = sh.qty - received;
  const valid = received >= 0 && damaged >= 0 && damaged <= received && received <= sh.qty * 1.1;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Receive & count ${sh.id}`}
      sub={`${sh.name} · ${fmtNum(sh.qty)} units invoiced by ${s.workspace}`}
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" icon={PackageCheck} disabled={!valid || (damaged > 0 && !note.trim())} onClick={() => {
          update((d) => receiveInbound(d, sh.id, received, damaged, note.trim()));
          toast(damaged > 0 ? `Received ${sh.id}; damage claim sent to the brand` : `Received ${sh.id} into stock`);
          onClose();
        }}>Confirm count</Btn>
      </>}
    >
      <div className="space-y-[12px]">
        <div className="grid grid-cols-3 gap-[10px] rounded-[8px] bg-[#f7f6f2] p-[12px] text-[12px]">
          <div><p className="text-cs-ink-2">Invoiced</p><p className="text-[16px] font-semibold">{fmtNum(sh.qty)}</p></div>
          <div><p className="text-cs-ink-2">Short / excess</p><p className={short > 0 ? "text-[16px] font-semibold text-cs-red" : "text-[16px] font-semibold"}>{short > 0 ? `−${fmtNum(short)}` : short < 0 ? `+${fmtNum(-short)}` : "0"}</p></div>
          <div><p className="text-cs-ink-2">Good into stock</p><p className="text-[16px] font-semibold text-cs-green">{fmtNum(Math.max(0, received - damaged))}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-[10px]">
          <Field label="Units received"><input className={inputCls} type="number" min={0} value={received} onChange={(e) => setReceived(Math.max(0, Number(e.target.value)))} /></Field>
          <Field label="Of which damaged"><input className={inputCls} type="number" min={0} value={damaged} onChange={(e) => setDamaged(Math.max(0, Number(e.target.value)))} /></Field>
        </div>
        <Field label={damaged > 0 ? "Damage note (sent to the brand as a claim)" : "Note (optional)"} hint={damaged > 0 ? "Required when anything is damaged." : undefined}>
          <textarea className={textareaCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={damaged > 0 ? "e.g. 2 cartons crushed, photos taken at the dock" : "Seal intact, count matches"} />
        </Field>
        {damaged > received && <p className="text-[12px] text-cs-red">Damaged can&apos;t be more than received.</p>}
      </div>
    </Modal>
  );
}

/** New retailer order: lines picked from stock SKUs, value computed live. */
export function NewOrderModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const { s, update, toast } = useConsole();
  const areas = useMemo(() => Array.from(new Set(s.routes.flatMap((r) => r.areas))), [s.routes]);
  const [retailer, setRetailer] = useState("");
  const [area, setArea] = useState("");
  const [lines, setLines] = useState<{ sku: string; qty: number }[]>([]);
  useEffect(() => { if (open) { setRetailer(""); setArea(areas[0] ?? ""); setLines([{ sku: s.distStock[0]?.sku ?? "", qty: 12 }]); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const value = lines.reduce((a, l) => a + l.qty * (s.distStock.find((x) => x.sku === l.sku)?.price ?? 0), 0);
  const valid = retailer.trim() && area.trim() && lines.length > 0 && lines.every((l) => l.sku && l.qty > 0);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New retailer order"
      sub="Prices are your distributor price per pack."
      width={600}
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" disabled={!valid} onClick={() => {
          let id = "";
          const merged = Object.values(lines.reduce<Record<string, { sku: string; qty: number }>>((m, l) => { m[l.sku] = { sku: l.sku, qty: (m[l.sku]?.qty ?? 0) + l.qty }; return m; }, {}));
          update((d) => { id = createRetailOrder(d, { retailer: retailer.trim(), area: area.trim(), lines: merged }); });
          toast(`Order ${id} created · ${inr(value)}`);
          onCreated?.(id);
          onClose();
        }}>Create order · {inr(value)}</Btn>
      </>}
    >
      <div className="space-y-[12px]">
        <div className="grid grid-cols-[1.5fr_1fr] gap-[10px]">
          <Field label="Retailer"><input className={inputCls} value={retailer} onChange={(e) => setRetailer(e.target.value)} placeholder="e.g. Wellness Mart, Andheri" list="dist-retailers" /></Field>
          <Field label="Area">
            <input className={inputCls} value={area} onChange={(e) => setArea(e.target.value)} list="dist-areas" />
          </Field>
          <datalist id="dist-retailers">{Array.from(new Set(s.retailOrders.map((o) => o.retailer))).map((r) => <option key={r} value={r} />)}</datalist>
          <datalist id="dist-areas">{areas.map((a) => <option key={a} value={a} />)}</datalist>
        </div>
        <div>
          <p className="mb-[6px] text-[12px] font-medium text-[#3e4440]">Lines</p>
          <div className="space-y-[8px]">
            {lines.map((l, i) => {
              const st = s.distStock.find((x) => x.sku === l.sku);
              return (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_96px_86px_32px] items-center gap-[8px]">
                  <select className={inputCls} value={l.sku} onChange={(e) => setLines(lines.map((x, k) => (k === i ? { ...x, sku: e.target.value } : x)))} aria-label="Product">
                    {s.distStock.map((x) => <option key={x.sku} value={x.sku}>{x.product} ({x.onHand} on hand)</option>)}
                  </select>
                  <input className={inputCls} type="number" min={1} value={l.qty} onChange={(e) => setLines(lines.map((x, k) => (k === i ? { ...x, qty: Math.max(0, Number(e.target.value)) } : x)))} aria-label="Quantity" />
                  <span className="text-right text-[12.5px] font-medium">{inr((st?.price ?? 0) * l.qty)}</span>
                  <button type="button" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, k) => k !== i))} className="grid size-[32px] place-items-center rounded-[6px] text-cs-ink-2 hover:bg-[#f1f0ec] disabled:opacity-30"><Trash2 className="size-[15px]" /></button>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={() => setLines([...lines, { sku: s.distStock[0]?.sku ?? "", qty: 12 }])} className="mt-[8px] inline-flex items-center gap-[5px] text-[12.5px] font-medium text-cs-green hover:underline"><Plus className="size-[14px]" />Add line</button>
        </div>
      </div>
    </Modal>
  );
}

/** Record cash / UPI / cheque collection against a delivered order. */
export function CollectModal({ order, onClose }: { order: RetailOrder | null; onClose: () => void }) {
  const { update, toast } = useConsole();
  const [mode, setMode] = useState<"Cash" | "UPI" | "Cheque">("UPI");
  const [amount, setAmount] = useState(0);
  const [ref, setRef] = useState("");
  useEffect(() => { if (order) { setMode("UPI"); setAmount(order.value); setRef(""); } }, [order]);
  if (!order) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Collect payment · ${order.id}`}
      sub={`${order.retailer} · invoice ${inr(order.value)}`}
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" icon={Wallet} disabled={!ref.trim() || amount <= 0} onClick={() => {
          update((d) => collectPayment(d, order.id, mode, amount, ref.trim()));
          toast(`Collected ${inr(amount)} from ${order.retailer}`);
          onClose();
        }}>Record {inr(amount)}</Btn>
      </>}
    >
      <div className="space-y-[12px]">
        <div>
          <p className="mb-[6px] text-[12px] font-medium text-[#3e4440]">Mode</p>
          <div className="flex gap-[8px]">
            {(["Cash", "UPI", "Cheque"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={mode === m ? "h-[36px] rounded-full border border-cs-green bg-cs-green px-[16px] text-[12.5px] font-medium text-white" : "h-[36px] rounded-full border border-cs-line bg-white px-[16px] text-[12.5px] font-medium hover:border-[#9aa19c]"}>{m}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[10px]">
          <Field label="Amount (₹)"><input className={inputCls} type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
          <Field label={mode === "Cash" ? "Receipt number" : mode === "UPI" ? "UPI reference" : "Cheque number"}><input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} placeholder={mode === "UPI" ? "e.g. UPI 4410 9021" : mode === "Cheque" ? "e.g. 004512" : "e.g. RCPT-118"} /></Field>
        </div>
        {amount !== order.value && amount > 0 && <p className="text-[12px] text-cs-orange">{amount < order.value ? `Short by ${inr(order.value - amount)}; the balance will be written off on this order.` : `${inr(amount - order.value)} more than the invoice.`}</p>}
      </div>
    </Modal>
  );
}

/** Ask the brand for more stock of a SKU. */
export function RestockModal({ sku, onClose }: { sku: string | null; onClose: () => void }) {
  const { s, update, toast } = useConsole();
  const st = s.distStock.find((x) => x.sku === sku);
  const [qty, setQty] = useState(0);
  useEffect(() => { if (st) setQty(Math.max(st.reorderAt * 3 - st.onHand, 100)); }, [sku]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!st) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title="Request restock"
      sub={`${st.product} · ${st.onHand} on hand, reorder at ${st.reorderAt}`}
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" disabled={qty <= 0} onClick={() => { update((d) => requestRestock(d, st.sku, qty)); toast(`Restock request sent to ${s.workspace}`); onClose(); }}>Send to {s.workspace}</Btn>
      </>}
    >
      <Field label="Units needed" hint="Goes to the brand's messages and activity feed."><input className={inputCls} type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></Field>
    </Modal>
  );
}

/** Damage / return / count correction on a SKU. */
export function AdjustModal({ sku, onClose }: { sku: string | null; onClose: () => void }) {
  const { s, update, toast } = useConsole();
  const st = s.distStock.find((x) => x.sku === sku);
  const [dir, setDir] = useState<"remove" | "add">("remove");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("Damaged in warehouse");
  useEffect(() => { setDir("remove"); setQty(1); setReason("Damaged in warehouse"); }, [sku]);
  if (!st) return null;
  const reasons = dir === "remove" ? ["Damaged in warehouse", "Expired", "Count correction"] : ["Retailer return (saleable)", "Count correction"];
  return (
    <Modal
      open
      onClose={onClose}
      title="Adjust stock"
      sub={`${st.product} · ${st.onHand} on hand`}
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" disabled={qty <= 0 || (dir === "remove" && qty > st.onHand)} onClick={() => { const delta = dir === "remove" ? -qty : qty; update((d) => adjustStock(d, st.sku, delta, reason)); toast(`${st.sku} ${delta > 0 ? "+" : ""}${delta}`); onClose(); }}>Save adjustment</Btn>
      </>}
    >
      <div className="space-y-[12px]">
        <div className="flex gap-[8px]">
          <Btn kind={dir === "remove" ? "primary" : "outline"} icon={Minus} onClick={() => { setDir("remove"); setReason("Damaged in warehouse"); }}>Remove</Btn>
          <Btn kind={dir === "add" ? "primary" : "outline"} icon={Plus} onClick={() => { setDir("add"); setReason("Retailer return (saleable)"); }}>Add back</Btn>
        </div>
        <div className="grid grid-cols-2 gap-[10px]">
          <Field label="Units"><input className={inputCls} type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></Field>
          <Field label="Reason"><select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>{reasons.map((r) => <option key={r}>{r}</option>)}</select></Field>
        </div>
        {dir === "remove" && qty > st.onHand && <p className="text-[12px] text-cs-red">Only {st.onHand} on hand.</p>}
      </div>
    </Modal>
  );
}

/** Add or edit a delivery route. */
export function RouteModal({ route, open, onClose }: { route: Route | null; open: boolean; onClose: () => void }) {
  const { update, toast } = useConsole();
  const [f, setF] = useState({ name: "", day: "", areas: "", van: "", driver: "" });
  useEffect(() => {
    if (open) setF(route ? { name: route.name, day: route.day, areas: route.areas.join(", "), van: route.van, driver: route.driver } : { name: "", day: "Mon · Thu", areas: "", van: "", driver: "" });
  }, [open, route]);
  const valid = f.name.trim() && f.areas.trim() && f.van.trim() && f.driver.trim();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={route ? `Edit ${route.name}` : "Add a route"}
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" disabled={!valid} onClick={() => {
          update((d) => { saveRoute(d, { id: route?.id, name: f.name.trim(), day: f.day.trim(), areas: f.areas.split(",").map((a) => a.trim()).filter(Boolean), van: f.van.trim(), driver: f.driver.trim() }); });
          toast(route ? "Route saved" : "Route added");
          onClose();
        }}>{route ? "Save route" : "Add route"}</Btn>
      </>}
    >
      <div className="space-y-[12px]">
        <div className="grid grid-cols-2 gap-[10px]">
          <Field label="Route name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Central line" /></Field>
          <Field label="Days"><input className={inputCls} value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} placeholder="Mon · Thu" /></Field>
        </div>
        <Field label="Areas" hint="Comma-separated. New orders in these areas are put on this route when packed."><input className={inputCls} value={f.areas} onChange={(e) => setF({ ...f, areas: e.target.value })} placeholder="Bandra, Andheri, Dadar" /></Field>
        <div className="grid grid-cols-2 gap-[10px]">
          <Field label="Van"><input className={inputCls} value={f.van} onChange={(e) => setF({ ...f, van: e.target.value })} placeholder="MH-02-AB-1234" /></Field>
          <Field label="Driver"><input className={inputCls} value={f.driver} onChange={(e) => setF({ ...f, driver: e.target.value })} /></Field>
        </div>
      </div>
    </Modal>
  );
}
