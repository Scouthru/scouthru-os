import type { ConsoleState, FactoryLead, MaterialLine, Portal, PurchaseOrder, RetailOrder } from "./types";
import { advanceShipment, confirmOrder, log, sendMessage, setEnquiryStage } from "./actions";

/**
 * Actions taken from the manufacturer, supplier and distributor portals. Each
 * one updates the shared state so the other side sees it: a factory's quote
 * lands in the brand's Quotes tab, a supplier's dispatch in the factory's
 * Materials, a brand shipment in the distributor's Inbound.
 */

const now = () => new Date().toISOString();
const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString();

function as(d: ConsoleState, p: Portal) {
  const who = d.people[p];
  return { who: who.name, img: who.img };
}

/* ------------------------------- manufacturer ------------------------------ */

/** Factory quotes a brand enquiry: shows up in the brand's Quotes and Responses. */
export function submitQuote(d: ConsoleState, enquiryId: string, mfrId: string, q: { unitPrice: number; moq: number; leadWeeks: number; note: string }) {
  const e = d.enquiries.find((x) => x.id === enquiryId);
  if (!e) return;
  const existing = e.quotes.find((x) => x.mfrId === mfrId);
  const quote = { mfrId, unitPrice: q.unitPrice, moq: q.moq, leadWeeks: q.leadWeeks, validTill: inDays(15), shortlisted: existing?.shortlisted ?? false };
  if (existing) Object.assign(existing, quote); else e.quotes.push(quote);
  const r = e.responses.find((x) => x.mfrId === mfrId);
  if (r) { r.status = "Quote Received"; r.at = now(); r.note = q.note || r.note; } else e.responses.push({ mfrId, status: "Quote Received", at: now(), note: q.note });
  e.mfrCount = Math.max(e.mfrCount, e.responses.length);
  if (e.stage === "In Discussion" || e.stage === "Draft") setEnquiryStage(d, e.id, "Quote Received");
  const m = d.manufacturers.find((x) => x.id === mfrId);
  e.activity.push({ at: now(), who: m?.name ?? mfrId, text: `Quoted ₹${q.unitPrice}/unit · MOQ ${q.moq.toLocaleString("en-US")} · ${q.leadWeeks} weeks` });
  e.updatedAt = now();
  log(d, { ...as(d, "maker"), text: `${m?.short ?? "Factory"} quoted ₹${q.unitPrice}/unit for ${e.name}`, tag: "Enquiry", href: `/console/enquiries?id=${e.id}` });
}

export function declineEnquiry(d: ConsoleState, enquiryId: string, mfrId: string, reason: string) {
  const e = d.enquiries.find((x) => x.id === enquiryId);
  const r = e?.responses.find((x) => x.mfrId === mfrId);
  if (!e || !r) return;
  r.status = "Declined";
  r.note = reason;
  r.at = now();
  e.activity.push({ at: now(), who: d.manufacturers.find((x) => x.id === mfrId)?.name ?? mfrId, text: `Declined: ${reason}` });
  log(d, { ...as(d, "maker"), text: `Declined enquiry ${e.id} (${e.name})`, tag: "Enquiry", href: `/console/maker/enquiries?id=${e.id}` });
}

export function addLead(d: ConsoleState, x: Omit<FactoryLead, "id" | "at" | "status">) {
  const n = d.leads.reduce((m, l) => Math.max(m, parseInt(l.id.slice(3), 10) || 0), 100) + 1;
  const id = `LD-${n}`;
  d.leads.unshift({ ...x, id, at: now(), status: "New" });
  log(d, { ...as(d, "maker"), text: `Logged a ${x.source} lead: ${x.product} for ${x.buyer}`, tag: "Enquiry", href: `/console/maker/enquiries?lead=${id}` });
  return id;
}

export function updateLead(d: ConsoleState, id: string, patch: Partial<FactoryLead>) {
  const l = d.leads.find((x) => x.id === id);
  if (l) Object.assign(l, patch);
}

/** Factory has made and sent the sample: the brand can start reviewing. */
export function dispatchSample(d: ConsoleState, sampleId: string, note: string, courier: string) {
  const s = d.samples.find((x) => x.id === sampleId);
  if (!s) return;
  s.status = "In Review";
  s.history.push({ status: "In Review", at: now() });
  s.comments.push({ at: now(), who: d.people.maker.name, text: `Sample dispatched via ${courier}. ${note}`.trim() });
  log(d, { ...as(d, "maker"), text: `Dispatched sample ${s.id} (${s.name}) via ${courier}`, tag: "Sample", href: `/console/samples?id=${s.id}` });
}

export function replyOnSample(d: ConsoleState, sampleId: string, text: string) {
  const s = d.samples.find((x) => x.id === sampleId);
  if (!s) return;
  s.comments.push({ at: now(), who: d.people.maker.name, text });
  log(d, { ...as(d, "maker"), text: `Replied on sample ${s.id}`, tag: "Sample", href: `/console/samples?id=${s.id}` });
}

export function attachToSample(d: ConsoleState, sampleId: string, file: string) {
  const s = d.samples.find((x) => x.id === sampleId);
  if (!s || s.attachments.includes(file)) return;
  s.attachments.push(file);
  log(d, { ...as(d, "maker"), text: `Uploaded ${file} on sample ${s.id}`, tag: "Sample", href: `/console/samples?id=${s.id}` });
}

/** Factory accepts the production order (same as the brand confirming start). */
export function acceptOrder(d: ConsoleState, orderId: string) {
  confirmOrder(d, orderId);
  const o = d.orders.find((x) => x.id === orderId);
  if (o) o.updates.unshift({ at: now(), text: `${d.people.maker.name} accepted the order and booked line capacity.` });
}

export function postFactoryUpdate(d: ConsoleState, orderId: string, text: string, img?: string) {
  const o = d.orders.find((x) => x.id === orderId);
  if (!o) return;
  o.updates.unshift({ at: now(), text, img });
  log(d, { ...as(d, "maker"), text: `Update on ${orderId}: ${text}`, tag: "Production", href: `/console/production?id=${orderId}` });
}

export function addEvidence(d: ConsoleState, orderId: string, img: string, label: string, batch: string) {
  const o = d.orders.find((x) => x.id === orderId);
  if (!o) return;
  o.evidence.unshift({ img, label, batch });
  log(d, { ...as(d, "maker"), text: `Shared photo proof for ${orderId}: ${label}`, tag: "Production", href: `/console/production?id=${orderId}` });
}

/** Factory sends its lab results: tests and checklist move, a COA note is left for the brand. */
export function submitLabResults(d: ConsoleState, batchId: string, results: Record<string, "Pass" | "Fail">, coa: boolean) {
  const q = d.quality.find((x) => x.id === batchId);
  if (!q) return;
  q.tests.forEach((t) => { if (results[t.name]) t.status = results[t.name]; });
  const done = q.tests.filter((t) => t.status === "Pass" || t.status === "Fail").length;
  q.checklist.forEach((c, k) => {
    if (k < 5 && done >= Math.min(q.tests.length, k + 3)) c.status = "Completed";
    if (k === 6 && coa) c.status = "Completed";
  });
  if (q.tests.some((t) => t.status === "Fail")) q.status = "Issues Found";
  q.updatedAt = now();
  q.notes.unshift({ at: now(), who: d.people.maker.name, text: `Lab results shared (${done} of ${q.tests.length} tests).${coa ? " COA uploaded." : ""}` });
  log(d, { ...as(d, "maker"), text: `Shared lab results for ${batchId}${coa ? " with COA" : ""}`, tag: "Quality", href: `/console/quality?id=${batchId}` });
}

/** Factory hands a ready shipment to the carrier. */
export function dispatchShipment(d: ConsoleState, shipmentId: string, carrier: string) {
  const s = d.shipments.find((x) => x.id === shipmentId);
  if (!s || s.status !== "Pending") return;
  s.carrier = carrier as typeof s.carrier;
  advanceShipment(d, shipmentId);
}

/* ------------------------------ materials (PO) ----------------------------- */

function nextPo(d: ConsoleState) {
  const n = d.purchaseOrders.reduce((m, p) => Math.max(m, parseInt(p.id.slice(8), 10) || 0), 100) + 1;
  return `PO-2026-${n}`;
}

/** Factory asks a supplier to quote materials. */
export function requestMaterials(d: ConsoleState, x: { supplierId: string; mfrId: string; title: string; lines: MaterialLine[]; needBy: string; orderId?: string }) {
  const id = nextPo(d);
  const po: PurchaseOrder = { id, ...x, status: "RFQ", source: "Scouthru", createdAt: now(), updatedAt: now(), events: [{ at: now(), text: `RFQ sent by ${d.manufacturers.find((m) => m.id === x.mfrId)?.name}` }] };
  d.purchaseOrders.unshift(po);
  log(d, { ...as(d, "maker"), text: `Requested a quote from ${d.suppliers.find((s) => s.id === x.supplierId)?.name}: ${x.title}`, tag: "Manufacturer", href: `/console/maker/materials?id=${id}` });
  return id;
}

export function quotePO(d: ConsoleState, poId: string, total: number, leadDays: number, note: string) {
  const po = d.purchaseOrders.find((x) => x.id === poId);
  if (!po) return;
  po.status = "Quoted";
  po.quote = { total, leadDays, note, at: now() };
  po.updatedAt = now();
  po.events.push({ at: now(), text: `Quoted ₹${total.toLocaleString("en-IN")} · ${leadDays} days` });
  log(d, { ...as(d, "supplier"), text: `PackRight quoted ₹${total.toLocaleString("en-IN")} on ${po.id}`, tag: "Manufacturer", href: `/console/supplier/requests?id=${po.id}` });
}

export function declinePO(d: ConsoleState, poId: string, reason: string) {
  const po = d.purchaseOrders.find((x) => x.id === poId);
  if (!po) return;
  po.status = "Declined";
  po.updatedAt = now();
  po.events.push({ at: now(), text: `Declined: ${reason}` });
}

/** Factory accepts the supplier's quote: it becomes a confirmed PO, stock is reserved. */
export function confirmPO(d: ConsoleState, poId: string) {
  const po = d.purchaseOrders.find((x) => x.id === poId);
  if (!po || po.status !== "Quoted") return;
  po.status = "Confirmed";
  po.updatedAt = now();
  po.events.push({ at: now(), text: "Order confirmed by the factory" });
  if (po.supplierId === d.supplierId) po.lines.forEach((l) => { const st = d.supplierStock.find((x) => x.sku === l.sku); if (st) st.reserved += l.qty; });
  log(d, { ...as(d, "maker"), text: `Confirmed purchase order ${po.id}`, tag: "Manufacturer", href: `/console/maker/materials?id=${po.id}` });
}

/** Supplier ships a confirmed PO: stock leaves the warehouse, an invoice is raised. */
export function dispatchPO(d: ConsoleState, poId: string, vehicle: string) {
  const po = d.purchaseOrders.find((x) => x.id === poId);
  if (!po || po.status !== "Confirmed") return;
  po.status = "Dispatched";
  po.vehicle = vehicle;
  po.updatedAt = now();
  po.events.push({ at: now(), text: `Dispatched on ${vehicle}` });
  if (po.supplierId === d.supplierId) po.lines.forEach((l) => { const st = d.supplierStock.find((x) => x.sku === l.sku); if (st) { st.onHand = Math.max(0, st.onHand - l.qty); st.reserved = Math.max(0, st.reserved - l.qty); } });
  const n = 2300 + d.purchaseOrders.filter((x) => x.invoice).length;
  po.invoice = { no: `PR-INV-${n}`, amount: po.quote?.total ?? 0, due: inDays(30) };
  log(d, { ...as(d, "supplier"), text: `Dispatched ${po.id} on ${vehicle}`, tag: "Shipment", href: `/console/supplier/dispatch?id=${po.id}` });
}

export function receivePO(d: ConsoleState, poId: string, note: string) {
  const po = d.purchaseOrders.find((x) => x.id === poId);
  if (!po || po.status !== "Dispatched") return;
  po.status = "Received";
  po.updatedAt = now();
  po.events.push({ at: now(), text: `Received at the factory${note ? `: ${note}` : ""}` });
  log(d, { ...as(d, "maker"), text: `Received materials for ${po.id}`, tag: "Manufacturer", href: `/console/maker/materials?id=${po.id}` });
}

export function payPO(d: ConsoleState, poId: string, ref: string) {
  const po = d.purchaseOrders.find((x) => x.id === poId);
  if (!po?.invoice || po.invoice.paidAt) return;
  po.status = "Paid";
  po.invoice.paidAt = now();
  po.invoice.ref = ref;
  po.updatedAt = now();
  po.events.push({ at: now(), text: `Paid ₹${po.invoice.amount.toLocaleString("en-IN")} (ref ${ref})` });
  log(d, { ...as(d, "maker"), text: `Paid ${po.invoice.no} to PackRight · ₹${po.invoice.amount.toLocaleString("en-IN")}`, tag: "Payment", href: `/console/maker/payments` });
}

export function updateStock(d: ConsoleState, sku: string, patch: { onHand?: number; price?: number; leadDays?: number; moq?: number }) {
  const st = d.supplierStock.find((x) => x.sku === sku);
  if (st) Object.assign(st, patch);
}

export function addSupplierRequest(d: ConsoleState, x: { mfrId: string; title: string; lines: MaterialLine[]; needBy: string; source: PurchaseOrder["source"] }) {
  const id = nextPo(d);
  d.purchaseOrders.unshift({ id, supplierId: d.supplierId, mfrId: x.mfrId, title: x.title, lines: x.lines, needBy: x.needBy, status: "RFQ", source: x.source, createdAt: now(), updatedAt: now(), events: [{ at: now(), text: `Enquiry via ${x.source}` }] });
  return id;
}

/* ------------------------------- distributor ------------------------------- */

const SKU_FOR: Record<string, string> = {
  "Daily Multivitamin Capsules": "DMV-60", "Fish Oil Softgels": "FOS-60", "Vitamin C Gummies": "VCG-30", "Vitamin D3 Gummies": "VD3-60", "Collagen Sachets": "CLS-15",
};
export const skuForProduct = (name: string) => SKU_FOR[name] ?? name.replace(/[^A-Z]/g, "").slice(0, 3).padEnd(3, "X") + "-01";

/** Count a delivered brand shipment into the warehouse. Damages raise a claim to the brand. */
export function receiveInbound(d: ConsoleState, shipmentId: string, received: number, damaged: number, note: string) {
  const sh = d.shipments.find((x) => x.id === shipmentId);
  if (!sh || d.grns.some((g) => g.shipmentId === shipmentId)) return;
  if (sh.status !== "Delivered") { sh.step = 3; advanceShipment(d, shipmentId); }
  const sku = skuForProduct(sh.name);
  d.grns.unshift({ shipmentId, at: now(), lines: [{ sku, product: sh.name, invoiced: sh.qty, received, damaged }], claim: damaged > 0 ? note || `${damaged} units damaged in transit.` : undefined });
  const good = Math.max(0, received - damaged);
  const st = d.distStock.find((x) => x.sku === sku);
  if (st) { st.onHand += good; st.batch = shipmentId.replace("SH-2026-", "B-"); }
  else d.distStock.push({ sku, product: sh.name, brand: d.workspace, img: sh.img, onHand: good, reorderAt: Math.round(good * 0.25), batch: shipmentId.replace("SH-2026-", "B-"), expiry: inDays(540), mrp: 499, price: 350 });
  log(d, { ...as(d, "distributor"), text: `${d.distributor.name} received ${shipmentId}: ${received.toLocaleString("en-US")} of ${sh.qty.toLocaleString("en-US")} units${damaged ? `, ${damaged} damaged` : ""}`, tag: "Shipment", href: `/console/shipments?id=${shipmentId}` });
  if (damaged > 0) sendMessage(d, d.workspace, `Damage claim on ${shipmentId}`, `${damaged} units damaged. ${note}`, `/console/shipments?id=${shipmentId}`, "Shipment", as(d, "distributor"));
}

export function createRetailOrder(d: ConsoleState, x: { retailer: string; area: string; lines: { sku: string; qty: number }[] }) {
  const n = d.retailOrders.reduce((m, o) => Math.max(m, parseInt(o.id.slice(3), 10) || 0), 5500) + 1;
  const value = x.lines.reduce((a, l) => a + l.qty * (d.distStock.find((s) => s.sku === l.sku)?.price ?? 0), 0);
  const id = `RO-${n}`;
  d.retailOrders.unshift({ id, ...x, value, status: "New", payment: "Due", at: now() });
  return id;
}

/** Pack an order: stock is taken out of the warehouse. */
export function packRetailOrder(d: ConsoleState, id: string) {
  const o = d.retailOrders.find((x) => x.id === id);
  if (!o || o.status !== "New") return false;
  const short = o.lines.find((l) => (d.distStock.find((s) => s.sku === l.sku)?.onHand ?? 0) < l.qty);
  if (short) return false;
  o.lines.forEach((l) => { const s = d.distStock.find((x) => x.sku === l.sku)!; s.onHand -= l.qty; });
  o.status = "Packed";
  const r = d.routes.find((x) => x.areas.includes(o.area));
  if (r && !o.routeId) o.routeId = r.id;
  return true;
}

export function assignRoute(d: ConsoleState, id: string, routeId: string) {
  const o = d.retailOrders.find((x) => x.id === id);
  if (o) o.routeId = routeId;
}

/** Start a route: every packed order on it goes out for delivery. */
export function startRoute(d: ConsoleState, routeId: string) {
  let n = 0;
  d.retailOrders.forEach((o) => { if (o.routeId === routeId && o.status === "Packed") { o.status = "Out for Delivery"; n++; } });
  return n;
}

export function deliverRetailOrder(d: ConsoleState, id: string) {
  const o = d.retailOrders.find((x) => x.id === id);
  if (!o || o.status !== "Out for Delivery") return;
  o.status = "Delivered";
  o.deliveredAt = now();
}

export function cancelRetailOrder(d: ConsoleState, id: string) {
  const o = d.retailOrders.find((x) => x.id === id);
  if (!o || o.status === "Delivered") return;
  if (o.status !== "New") o.lines.forEach((l) => { const s = d.distStock.find((x) => x.sku === l.sku); if (s) s.onHand += l.qty; });
  o.status = "Cancelled";
}

export function collectPayment(d: ConsoleState, id: string, mode: NonNullable<RetailOrder["collected"]>["mode"], amount: number, ref: string) {
  const o = d.retailOrders.find((x) => x.id === id);
  if (!o || o.payment === "Collected") return;
  o.payment = "Collected";
  o.collected = { at: now(), mode, amount, ref };
}

/** Ask the brand to restock: lands in the brand's activity feed and messages. */
export function requestRestock(d: ConsoleState, sku: string, qty: number) {
  const st = d.distStock.find((x) => x.sku === sku);
  if (!st) return;
  sendMessage(d, d.workspace, `Restock request: ${st.product}`, `${d.distributor.name} needs ${qty.toLocaleString("en-US")} units of ${st.product} (on hand ${st.onHand}).`, "/console/shipments", "Shipment", as(d, "distributor"));
  log(d, { ...as(d, "distributor"), text: `${d.distributor.name} asked for ${qty.toLocaleString("en-US")} more ${st.product}`, tag: "Shipment", href: "/console/shipments" });
}

export function toggleScheme(d: ConsoleState, id: string) {
  const sc = d.schemes.find((x) => x.id === id);
  if (sc) sc.active = !sc.active;
}
