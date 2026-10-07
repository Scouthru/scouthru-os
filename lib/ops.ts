import type { Case, Inbound, Order, OrderStage, PO, RetailerOrder, Role, State } from "./types";
import { sha256 } from "./sha256";
import { dayLabel } from "./seed";

/** Mutations on a cloned draft. Each keeps the brand and factory views consistent. */

export const STAGES: OrderStage[] = ["enquiry", "agreed", "sample", "production", "qc", "dispatch", "delivered", "closed"];
export const STAGE_LABEL: Record<OrderStage, string> = {
  enquiry: "Enquiry", agreed: "Agreed", sample: "Sample", production: "Production", qc: "QC", dispatch: "Dispatch", delivered: "Delivered", closed: "Closed",
};
export const ORDER_STEPS = ["Agreed", "Sample", "Raw material", "Making", "Packing", "Quality check", "Delivered"];

export function stepIndex(o: Order): number {
  switch (o.stage) {
    case "enquiry": return -1;
    case "agreed": return 0;
    case "sample": return 1;
    case "production": return o.phases[0].status === "done" ? 3 : 2;
    case "qc": return 5;
    case "dispatch": return 6;
    default: return 7;
  }
}

export const orderValue = (o: Order) => o.qty * o.unitPrice;
export const payAmount = (o: Order, pct: number) => Math.round((orderValue(o) * pct) / 100);

const find = (d: State, id: string) => d.orders.find((o) => o.id === id);
const dropActions = (d: State, orderId: string, kind?: string) => {
  d.actions = d.actions.filter((a) => !(a.orderId === orderId && (!kind || a.kind === kind)));
};

export function addProof(o: Order, title: string, kind: string, detail: string, image?: string) {
  const at = new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const prev = o.proofs[0]?.hash ?? "0".repeat(64);
  o.proofs.unshift({ id: sha256(title + at + Math.random()).slice(0, 8), kind, title, detail, at, hash: sha256(`${prev}|${title}|${detail}|${at}`), verified: true, image });
}

/** Pay the next due milestone on an order. */
export function payNext(d: State, orderId: string): string | null {
  const o = find(d, orderId);
  if (!o) return null;
  const i = o.payments.findIndex((p) => p.status === "due");
  if (i < 0) return null;
  o.payments[i].status = "paid";
  const amt = payAmount(o, o.payments[i].pct);
  addProof(o, `${o.payments[i].label} paid`, "Payment · escrow", `₹${amt.toLocaleString("en-IN")} released to ${o.factory}`);
  // Phase pay notes follow the payment ledger.
  const ph = o.phases.find((p) => p.pay === "proof" || p.pay === "due");
  if (ph && i > 0 && i < 3) { ph.pay = "paid"; ph.payNote = `Paid ${dayLabel(0)}`; }
  if (o.stage === "agreed") { o.stage = "sample"; o.progress = Math.max(o.progress, 15); o.next = "Sample on the way"; }
  if (i === 3) { o.stage = "closed"; o.health = "Completed"; o.next = "Closed"; o.progress = 100; }
  else if (o.next.toLowerCase().includes("30%") || o.next.toLowerCase().includes("advance")) o.next = "Next milestone on proof";
  dropActions(d, orderId, "Pay");
  if (o.factoryId === FACTORY_ID) notify(d, "factory", `${o.payments[i].label} received for ${o.id} · ₹${amt.toLocaleString("en-IN")}`, `/factory/orders/${o.id}`);
  return `₹${amt.toLocaleString("en-IN")} paid to ${o.factory}`;
}

export function approveSample(d: State, orderId: string) {
  const o = find(d, orderId);
  if (!o) return;
  o.stage = "production";
  o.progress = Math.max(o.progress, 30);
  o.health = "On track";
  o.next = "30% on Phase 1 proof";
  o.phases[0].status = "active";
  o.phases[0].pct = 40;
  if (o.payments[1].status === "later") o.payments[1].status = "proof";
  addProof(o, "Golden sample approved", "Photo · golden sample", "Retained as the QC reference for this order");
  dropActions(d, orderId, "Sample");
}

export function decideChange(d: State, orderId: string, changeId: string, approve: boolean) {
  const o = find(d, orderId);
  const c = o?.changes.find((x) => x.id === changeId);
  if (!o || !c) return;
  c.status = approve ? "Approved" : "Rejected";
  if (approve && c.priceDelta) o.unitPrice = Math.round((o.unitPrice + c.priceDelta) * 100) / 100;
  o.health = o.health === "Delayed 3d" ? "Delayed 3d" : "On track";
  o.next = "30% on Phase 2 proof";
  addProof(o, `Change ${approve ? "approved" : "rejected"}`, "Change request", c.text);
  dropActions(d, orderId, "Change");
}

export function approveDispatch(d: State, orderId: string) {
  const o = find(d, orderId);
  if (!o || !o.qc) return;
  o.qc.decision = "approved";
  o.stage = "dispatch";
  o.progress = 92;
  o.health = "In transit";
  o.next = "Delivery ETA";
  o.due = dayLabel(2);
  o.phases[1].status = "done"; o.phases[1].pct = 100;
  o.phases[2].status = "active"; o.phases[2].pct = 60;
  if (o.payments[2].status !== "paid") o.payments[2].status = "due";
  o.shipment = {
    carrier: "Deccan Road Carriers", lr: `LR ${88300 + Math.floor(Math.random() * 99)}`, eta: `${dayLabel(2)}, 11 AM`,
    steps: [
      { at: `${dayLabel(0)} · now`, text: `Dispatch approved · pickup booked at ${o.factory}`, done: true },
      { at: "Expected", text: "Picked up", done: false },
      { at: "Expected", text: "In transit", done: false },
      { at: "Expected", text: "Unloaded + GRN", done: false },
    ],
    docs: [{ name: "Tax invoice", status: "Received" }, { name: "E-way bill", status: "Generating" }, { name: "Packing list", status: "Received" }, { name: "Certificate of analysis", status: "Pending" }],
    slot: `${dayLabel(2)} · 10–12 AM`, receiver: "Hyderabad DC",
  };
  addProof(o, "Dispatch approved", "QC · AQL 2.5", `${o.qc.defects}% defects vs ${o.qc.limit}% limit`);
  const v = d.qcVisits.find((x) => x.orderId === orderId);
  if (v) v.status = "Done";
  dropActions(d, orderId, "QC");
}

export function requestRework(d: State, orderId: string, note: string) {
  const o = find(d, orderId);
  if (!o || !o.qc) return;
  o.qc.decision = "rework";
  o.health = "Action";
  o.next = "Rework, then re-inspection";
  o.changes.unshift({ id: `rw${Date.now()}`, text: `Rework requested: ${note}`, note: "Re-inspection after rework · no price impact", status: "Awaiting factory", by: "brand" });
  addProof(o, "Rework requested", "QC decision", note);
  dropActions(d, orderId, "QC");
}

export function receiveShipment(d: State, orderId: string) {
  const o = find(d, orderId);
  if (!o) return;
  o.stage = "delivered";
  o.progress = 100;
  o.health = "Closing";
  o.next = "Complaint window · 7d left";
  o.due = dayLabel(7);
  o.phases.forEach((p) => { p.status = "done"; p.pct = 100; });
  o.shipment?.steps.forEach((s) => (s.done = true));
  // Delivery makes any unpaid milestone due now; the final one waits for the complaint window.
  o.payments.forEach((p, i) => { if (i < 3 && p.status !== "paid") p.status = "due"; });
  o.payments[3].status = "proof";
  const owed = o.payments.find((p) => p.status === "due");
  if (owed && !d.actions.some((a) => a.orderId === o.id && a.kind === "Pay")) {
    d.actions.unshift({ id: `a-pay-${o.id}`, kind: "Pay", title: `${owed.label} for ${o.id}`, detail: `Goods received · ₹${payAmount(o, owed.pct).toLocaleString("en-IN")} due now`, cta: "Pay now", orderId: o.id, tone: "blush" });
  }
  o.delivery = { at: `${dayLabel(0)}, now`, ordered: o.qty, received: o.qty, damaged: 0, windowEnds: new Date(Date.now() + 7 * 86400000).toISOString(), settled: false };
  addProof(o, "Delivered and GRN done", "POD · signed", `${o.qty.toLocaleString("en-IN")} ${o.uom} received`);
  // The distributor receiving this order sees it arrive in their inbound list.
  const inb = d.inbound.find((x) => x.meta.includes(orderId));
  if (inb) {
    inb.status = "Received";
    inb.meta = `${orderId} · received today · ${o.qty.toLocaleString("en-IN")} ${o.uom} into stock`;
    notify(d, "distributor", `${o.product} × ${o.qty.toLocaleString("en-IN")} from Ruchika Foods received`, "/distributor/inbound");
  }
}

export function settleFinal(d: State, orderId: string) {
  const o = find(d, orderId);
  if (!o?.delivery) return;
  o.delivery.settled = true;
  // Settling releases everything still held for this order, final milestone included.
  o.payments.forEach((p) => {
    if (p.status !== "paid") { p.status = "paid"; addProof(o, `${p.label} paid`, "Payment · escrow", `₹${payAmount(o, p.pct).toLocaleString("en-IN")} released to ${o.factory}`); }
  });
  dropActions(d, orderId, "Pay");
  o.stage = "closed";
  o.health = "Completed";
  o.next = "Closed";
  addProof(o, "Final payment released", "Settlement", "Order closed");
}

export function newOrderFromWizard(d: State, f: { product: string; qty: number; factory: { id: string; name: string; city: string; price: number; lead: number; split?: number } }) {
  const id = nextOrderId(d);
  const base = structuredClone(d.orders.find((o) => o.id === "SO-1043")!);
  const partner = f.factory.split ? Math.round(f.qty * (1 - f.factory.split)) : 0;
  d.orders.unshift({
    ...base, id, product: f.product, qty: f.qty, uom: "units", factoryId: f.factory.id, factory: f.factory.name, factoryCity: f.factory.city,
    stage: "agreed", progress: 8, health: "On track", next: "Advance on e-sign", due: dayLabel(1), unitPrice: f.factory.price, frozenTill: dayLabel(15), deliverBy: dayLabel(f.factory.lead + 2),
    proofs: [], changes: [], chat: [], split: { inhouse: f.qty - partner, partner, partnerName: partner ? "Partner unit · vetted" : undefined },
  });
  d.orders[0].payments[0].status = "due";
  d.actions.unshift({ id: `a-${id}`, kind: "Pay", title: `Advance 20% for ${id}`, detail: `Agreement sent for e-sign · ₹${Math.round(f.qty * f.factory.price * 0.2).toLocaleString("en-IN")}`, cta: "Pay now", orderId: id, tone: "blush" });
  return id;
}

/** The factory the demo factory view is signed in as. */
export const FACTORY_ID = "HYD-0142";

export const BRAND_NAME: Record<string, string> = { ruchika: "Ruchika Foods", snackly: "Snackly", fitfuel: "FitFuel", glowkind: "Glowkind" };

// ---------------------------------------------------------------------------
// cross-role links: notifications, quotes, cases
// ---------------------------------------------------------------------------


export function notify(d: State, to: Role, text: string, href: string) {
  d.notices.unshift({ id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`, to, text, href, at: "Just now", read: false });
}

/** Factory answers an enquiry. If it came from a brand requirement, the quote lands in that brand's compare list. */
export function sendFactoryQuote(d: State, enquiryId: string, price: number, lead: number) {
  const e = d.enquiries.find((x) => x.id === enquiryId);
  if (!e) return;
  e.status = "quoted";
  e.quote = { price, lead };
  const orderId = e.orderId;
  if (!orderId) return;
  const o = d.orders.find((x) => x.id === orderId);
  if (!o) return;
  d.quotes = d.quotes.filter((q) => !(q.orderId === orderId && q.unit === FACTORY_ID));
  d.quotes.push({ id: `q-${orderId}-${FACTORY_ID}`, orderId, unit: FACTORY_ID, factory: "Nutrabite Foods", city: "Hyderabad", price, lead, moq: 5000, rating: 4.8, note: "Quoted from Scouthru OS.", fit: e.fit === "Needs partner unit" ? 70 : 100, status: "sent", at: dayLabel(0) });
  const n = d.quotes.filter((q) => q.orderId === orderId && q.status === "sent").length;
  o.factory = `${n} factor${n === 1 ? "y" : "ies"} quoting`;
  o.next = "Compare quotes";
  o.health = "Action";
  d.actions = d.actions.filter((a) => !(a.orderId === orderId && a.kind === "Quote"));
  d.actions.unshift({ id: `a-q-${orderId}`, kind: "Quote", title: `${n} quote${n === 1 ? "" : "s"} in · ${o.product}`, detail: "Frozen 15 days · compare and pick one", cta: "Compare", orderId, tone: "stone" });
  notify(d, "brand", `Nutrabite Foods quoted ₹${price}/unit for ${o.product}`, "/brand");
}

/** Brand picks a quote: the order moves to agreed with that factory; the others are declined. */
export function acceptQuote(d: State, quoteId: string) {
  const q = d.quotes.find((x) => x.id === quoteId);
  if (!q) return;
  const o = d.orders.find((x) => x.id === q.orderId);
  if (!o) return;
  d.quotes.forEach((x) => { if (x.orderId === q.orderId) x.status = x.id === q.id ? "accepted" : "declined"; });
  Object.assign(o, { factory: q.factory, factoryId: q.unit, factoryCity: q.city, unitPrice: q.price, stage: "agreed", progress: 10, next: "Advance on e-sign", due: dayLabel(1), health: "On track", frozenTill: dayLabel(15), deliverBy: dayLabel(q.lead + 3) });
  o.split = q.fit < 100 ? { inhouse: Math.round(o.qty * q.fit / 100), partner: o.qty - Math.round(o.qty * q.fit / 100), partnerName: "Partner unit · vetted" } : { inhouse: o.qty, partner: 0 };
  o.payments[0].status = "due";
  addProof(o, "Quote accepted, agreement sent", "Agreement", `${q.factory} at ₹${q.price}/unit, frozen till ${dayLabel(15)}`);
  d.actions = d.actions.filter((a) => !(a.orderId === o.id && a.kind === "Quote"));
  d.actions.unshift({ id: `a-adv-${o.id}`, kind: "Pay", title: `Advance 20% for ${o.id}`, detail: `${q.factory} · ₹${payAmount(o, 20).toLocaleString("en-IN")} · on e-sign`, cta: "Pay now", orderId: o.id, tone: "blush" });
  const e = d.enquiries.find((x) => x.orderId === o.id);
  if (e) e.status = q.unit === FACTORY_ID ? "won" : "declined";
  if (q.unit === FACTORY_ID) notify(d, "factory", `You won ${o.id}: ${o.product}, ${o.qty.toLocaleString("en-IN")} units`, `/factory/orders/${o.id}`);
}

/** Factory proposes a new rate with a reason; it waits for the brand's approval. */
export function factoryPriceChange(d: State, orderId: string, newPrice: number, reason: string) {
  const o = d.orders.find((x) => x.id === orderId);
  if (!o) return;
  const delta = Math.round((newPrice - o.unitPrice) * 100) / 100;
  o.changes.unshift({ id: `pc${Date.now()}`, text: `Price change: ₹${o.unitPrice} → ₹${newPrice} per unit (${delta >= 0 ? "+" : ""}₹${delta})`, note: `Reason: ${reason}`, status: "Awaiting you", by: "factory", priceDelta: delta });
  d.actions = d.actions.filter((a) => !(a.orderId === orderId && a.kind === "Change"));
  d.actions.unshift({ id: `a-pc-${orderId}`, kind: "Change", title: `Price change request · ${orderId} (${delta >= 0 ? "+" : ""}₹${delta}/unit)`, detail: `Reason: ${reason}`, cta: "Review", orderId, tone: "rose" });
  if (o.brandId === "ruchika") notify(d, "brand", `${o.factory} asked for a price change on ${orderId}`, `/brand/orders/${orderId}`);
}

export function openCase(d: State, c: Omit<Case, "id" | "status" | "at">) {
  d.cases.unshift({ ...c, id: `cs${Date.now()}`, status: "Open", at: dayLabel(0) });
  notify(d, "admin", `New ${c.kind.toLowerCase()}: ${c.title}`, "/admin/cases");
}

export function resolveCase(d: State, id: string, resolution: string) {
  const c = d.cases.find((x) => x.id === id);
  if (!c) return;
  c.status = "Resolved";
  c.resolution = resolution;
  if (c.orderId) {
    const o = d.orders.find((x) => x.id === c.orderId);
    if (o) {
      addProof(o, `Scouthru resolved: ${c.kind}`, "Case", resolution);
      if (o.delivery?.issue) o.delivery.issue.status = `Resolved by Scouthru · ${resolution}`;
      if (o.health === "Action") o.health = o.stage === "delivered" ? "Closing" : "On track";
    }
    notify(d, "brand", `Scouthru resolved ${c.title}`, `/brand/orders/${c.orderId}`);
  }
}

// ---------------------------------------------------------------------------
// stage trackers shown beside every order, on every dashboard
// ---------------------------------------------------------------------------


export function orderTrack(o: Order): { at: number; label?: string; alert?: "bad" | "warn" } {
  const alert = o.health === "Delayed 3d" ? "bad" : o.health === "Action" ? "warn" : undefined;
  switch (o.stage) {
    case "enquiry": return { at: -1, label: o.next === "Compare quotes" || o.next === "Pick a quote" ? "Quotes in" : "Getting quotes", alert };
    case "dispatch": return { at: 6, label: "In transit", alert };
    case "delivered": return { at: 7, label: "Delivered · closing", alert };
    case "closed": return { at: 7, label: "Completed" };
    default: return { at: stepIndex(o), alert };
  }
}

export const PO_STEPS = ["Price asked", "Price sent", "Order confirmed", "Packed", "Sent out", "Received", "Paid"];
const PO_CODES = ["RFQ", "Quoted", "PO confirmed", "Packed", "Dispatched", "GRN", "Paid"];
export function poTrack(p: PO): { at: number; label?: string; alert?: "bad" | "warn" } {
  if (p.stage === "Overdue pay") return { at: 6, label: "Payment late", alert: "bad" };
  if (p.stage === "Paid") return { at: 7, label: "Paid" };
  return { at: PO_CODES.indexOf(p.stage) };
}

export const RETAIL_STEPS = ["New", "Packing", "Ready", "Delivered", "Paid"];
export function retailTrack(r: RetailerOrder): { at: number; label?: string; alert?: "bad" | "warn" } {
  switch (r.status) {
    case "New": return { at: 0 };
    case "Credit hold": return { at: 0, label: "Old dues unpaid", alert: "bad" };
    case "Picking": return { at: 1 };
    case "Short 2 SKUs": return { at: 1, label: "2 items short", alert: "warn" };
    case "Picked": return { at: 2 };
    case "Delivered": return { at: 3 };
    default: return { at: 5, label: "Paid" };
  }
}

export const INBOUND_STEPS = ["Sent", "On the way", "Arrived", "Counted", "In stock"];
export function inboundTrack(i: Inbound): { at: number; label?: string; alert?: "bad" | "warn" } {
  switch (i.status) {
    case "In transit": return { at: 1, label: "On the way" };
    case "Receive": return { at: 2, label: "Arrived · count it", alert: "warn" };
    case "Claim": return { at: 4, label: "Damage claim open", alert: "bad" };
    default: return { at: 5, label: "In stock" };
  }
}

export const RETAIL_CTA: Record<RetailerOrder["status"], string> = { Delivered: "Invoice", "Short 2 SKUs": "Substitute", "Credit hold": "Approve", Picking: "Open", Paid: "Receipt", New: "Confirm", Picked: "Open" };
export function retailAct(d: State, id: string): string {
  const x = d.retailerOrders.find((y) => y.id === id);
  if (!x) return "Order not found";
  const was = x.status;
  if (was === "Short 2 SKUs") { x.status = "Picking"; x.stock = "All in"; }
  else if (was === "Credit hold") { x.status = "Picking"; x.credit = "OK"; }
  else if (was === "New") x.status = "Picking";
  return was === "Short 2 SKUs" ? "Substitutes offered for 2 SKUs; retailer accepted" : was === "Credit hold" ? "Credit approved for today's order" : was === "Delivered" ? "GST invoice sent on WhatsApp" : was === "Paid" ? "Receipt sent" : was === "New" ? "Order confirmed. Packing started" : "Order opened";
}

/** Next free order number, so ids from the wizard and the marketplace never collide. */
export function nextOrderId(d: State): string {
  const n = d.orders.map((o) => parseInt(o.id.replace(/\D/g, ""), 10)).filter((x) => x >= 1000 && x < 2000);
  return `SO-${Math.max(1047, ...n) + 1}`;
}

/** A requirement posted from the marketplace: an enquiry order for the brand, an enquiry in the factory inbox. */
export function postRequirement(d: State, r: { product: string; qty: number; city: string; when: string; notes?: string; unit?: string }): string {
  const id = nextOrderId(d);
  d.requirements.unshift({ id, product: r.product, qty: r.qty, at: new Date().toISOString(), from: r.city });
  d.orders.unshift({
    ...structuredClone(d.orders.find((o) => o.id === "SO-1047") ?? d.orders[0]),
    id, product: r.product, qty: r.qty, uom: r.unit ?? "units", factory: "Matching", factoryId: "—", stage: "enquiry", progress: 2, health: "On track", next: "Matching factories", due: r.when, deliverBy: r.when, unitPrice: 0, proofs: [], changes: [], chat: [],
  });
  d.enquiries.unshift({ id: `e-${id}`, product: r.product, source: "Scouthru", moq: r.qty, neededBy: r.when, region: r.city, fit: "Fits", buyer: "Ruchika Foods", receivedHoursAgo: 0, status: "new", notes: r.notes || "Posted on the marketplace just now.", orderId: id });
  notify(d, "factory", `New enquiry from Scouthru: ${r.product}, ${r.qty.toLocaleString("en-IN")} units`, "/factory");
  return id;
}
