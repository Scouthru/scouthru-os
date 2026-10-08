import type { Activity, ConsoleState, Enquiry, EnquiryStage, Order, QualityBatch, Sample, SampleStatus, Shipment } from "./types";
import { SHIP_STEPS } from "./types";

/**
 * Cross-screen flows. Each takes the draft state (inside `update`) and keeps
 * every linked record in step, so one action shows up on every screen:
 *   enquiry → sample → production order (+ payment plan, product) → batch done
 *   → quality batch → approved → shipment → delivered.
 */

const now = () => new Date().toISOString();
const D = 864e5;
const inDays = (n: number) => new Date(Date.now() + n * D).toISOString();

function nextId(existing: string[], prefix: string, width: number) {
  const max = existing.reduce((m, id) => {
    const n = parseInt(id.slice(prefix.length), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

export function log(d: ConsoleState, a: Omit<Activity, "id" | "at" | "who" | "img"> & { who?: string; img?: string }) {
  d.activity.unshift({ id: `a${Date.now()}${Math.random().toString(36).slice(2, 6)}`, at: now(), who: a.who ?? d.user.name, img: a.who ? a.img : "/console/av-priya-sm.jpg", text: a.text, tag: a.tag, href: a.href });
  d.activity = d.activity.slice(0, 60);
}

const mfrName = (d: ConsoleState, id: string) => d.manufacturers.find((m) => m.id === id)?.name ?? id;

export function setEnquiryStage(d: ConsoleState, id: string, stage: EnquiryStage) {
  const e = d.enquiries.find((x) => x.id === id);
  if (!e || e.stage === stage) return;
  e.stage = stage;
  e.updatedAt = now();
  e.activity.push({ at: now(), who: d.user.name, text: `Stage set to ${stage}` });
}

export type NewEnquiry = { name: string; category: string; moq: number; launch: string; price: string; brief: string; requirements: string[]; img: string; productId?: string };

export function createEnquiry(d: ConsoleState, x: NewEnquiry, asDraft = false) {
  const id = nextId(d.enquiries.map((e) => e.id), "ENQ-2026-", 3);
  const matched = d.manufacturers.filter((m) => m.categories.some((c) => x.name.includes(c.replace(/s$/, ""))) || m.capabilities.length > 0).slice(0, 6);
  const e: Enquiry = {
    id, name: x.name, img: x.img, category: x.category, tags: [x.category], mfrCount: asDraft ? 0 : matched.length, moq: x.moq,
    stage: asDraft ? "Draft" : "In Discussion", updatedAt: now(), createdAt: now(), launch: x.launch, price: x.price, brief: x.brief, requirements: x.requirements,
    responses: asDraft ? [] : matched.map((m) => ({ mfrId: m.id, status: "Awaiting Reply" as const, at: now(), note: "Enquiry received; reviewing your brief." })),
    quotes: [],
    steps: [
      { text: "Review manufacturer responses", due: inDays(2), done: false },
      { text: "Compare quotes and shortlists", due: inDays(4), done: false },
      { text: "Request samples from selected manufacturers", due: inDays(6), done: false },
      { text: "Finalize manufacturer and move to contract", due: inDays(10), done: false },
    ],
    activity: [{ at: now(), who: d.user.name, text: asDraft ? "Saved as draft" : `Created enquiry and sent to ${matched.length} matched manufacturers` }],
    productId: x.productId,
  };
  d.enquiries.unshift(e);
  log(d, { text: `Created enquiry ${id} for ${x.name}`, tag: "Enquiry", href: `/console/enquiries?id=${id}` });
  return id;
}

export function requestSample(d: ConsoleState, enquiryId: string | undefined, mfrId: string, qty: number, name?: string, img?: string) {
  const e = enquiryId ? d.enquiries.find((x) => x.id === enquiryId) : undefined;
  const id = nextId(d.samples.map((s) => s.id), "SMP-2026-", 4);
  const base = d.samples[0];
  const prevRevs = d.samples.filter((s) => s.name === (e?.name ?? name) && s.mfrId === mfrId).length;
  const s: Sample = {
    ...structuredClone(base),
    id, name: e?.name ?? name ?? "Sample", img: e?.img ?? img ?? base.img, mfrId, rev: prevRevs + 1, qty, unit: "units", requestedAt: now(), leadTime: "2–3 weeks",
    status: "Submitted", tags: e?.tags ?? [], desc: e?.brief ?? "", comments: [], enquiryId, orderId: undefined,
    evaluation: base.evaluation.map((v) => ({ ...v, status: "Not Started" as const, note: "Scheduled after sample arrives" })),
    history: [{ status: "Submitted", at: now() }],
  };
  d.samples.unshift(s);
  if (e) {
    if (["Draft", "In Discussion", "Quote Received"].includes(e.stage)) setEnquiryStage(d, e.id, "Samples Requested");
    e.steps.forEach((st, k) => { if (k <= 2) st.done = true; });
    e.activity.push({ at: now(), who: d.user.name, text: `Requested ${qty.toLocaleString("en-US")} sample units from ${mfrName(d, mfrId)}` });
  }
  log(d, { text: `Requested sample ${id} from ${mfrName(d, mfrId)}`, tag: "Sample", href: `/console/samples?id=${id}` });
  return id;
}

export function setSampleStatus(d: ConsoleState, id: string, status: SampleStatus, comment?: string) {
  const s = d.samples.find((x) => x.id === id);
  if (!s) return;
  s.status = status;
  s.history.push({ status, at: now() });
  if (status === "Approved") s.evaluation.forEach((v) => { if (v.status !== "Fail") { v.status = "Pass"; if (/progress|Scheduled|expected/i.test(v.note)) v.note = "Within specification"; } });
  if (comment) s.comments.push({ at: now(), who: d.user.name, text: comment });
  const verb = status === "Approved" ? "Approved" : status === "Rejected" ? "Rejected" : status === "Changes Requested" ? "Requested changes on" : `Moved to ${status}:`;
  log(d, { text: `${verb} sample ${id} for ${s.name}`, tag: "Sample", href: `/console/samples?id=${id}` });
}

/** Approved sample → production order with batches, a payment plan, and the product moved to In Production. */
export function createOrderFromSample(d: ConsoleState, sampleId: string, qty: number, unitPrice: number, destination: string) {
  const s = d.samples.find((x) => x.id === sampleId);
  if (!s) return null;
  const id = nextId(d.orders.map((o) => o.id), "ORD-2026-", 4);
  const per = 10000;
  const n = Math.max(1, Math.ceil(qty / per));
  const batchBase = nextId(d.orders.flatMap((o) => o.batches.map((b) => b.id)).concat(d.quality.map((q) => q.id)), "BATCH-", 3);
  const firstNum = parseInt(batchBase.slice(6), 10);
  const o: Order = {
    id, name: s.name, img: s.img, tags: s.tags.length ? s.tags : ["Private Label"], desc: s.desc, mfrId: s.mfrId, qty, unitFormat: s.specs[0]?.[1] ?? "Units",
    createdAt: now(), briefAt: d.enquiries.find((e) => e.id === s.enquiryId)?.createdAt ?? s.requestedAt, sampleAt: now(), productionAt: inDays(3), targetDelivery: inDays(14 + n * 7),
    incoterms: "FOB Factory", destination, confirmed: false,
    batches: Array.from({ length: n }, (_, k) => ({ id: `BATCH-${String(firstNum + k).padStart(3, "0")}`, planned: k === n - 1 ? qty - per * (n - 1) : per, completed: 0, status: "Pending" as const, start: inDays(3 + k * 7), end: inDays(9 + k * 7) })),
    updates: [{ at: now(), text: "Production order created from approved sample. Waiting for confirmation." }], evidence: [], issues: [], defectRate: 0, sampleId,
  };
  d.orders.unshift(o);
  s.orderId = id;
  const total = qty * unitPrice;
  const pct: [string, number, number][] = [["30% Advance", 0.3, 0], ["Production Start", 0.3, 3], ["Dispatch", 0.2, 10 + n * 7], ["Final Settlement", 0.2, 20 + n * 7]];
  const inv = d.payments.flatMap((p) => p.milestones.map((m) => m.invoice));
  let invN = parseInt(nextId(inv, "INV-2026-", 4).slice(9), 10);
  d.payments.unshift({
    orderId: id, name: s.name, img: s.img, mfrId: s.mfrId, stage: "Awaiting Start",
    milestones: pct.map(([name, p, due]) => ({ invoice: `INV-2026-${String(invN++).padStart(4, "0")}`, name, due: inDays(due), amount: Math.round(total * p), status: due === 0 ? "Due Soon" as const : "Scheduled" as const })),
    notes: [], documents: [`Proforma_Invoice_${id}.pdf`, `Purchase_Order_${id}.pdf`, "Payment_Terms.pdf"],
  });
  const e = d.enquiries.find((x) => x.id === s.enquiryId);
  if (e) { setEnquiryStage(d, e.id, "In Production"); e.steps.forEach((st) => (st.done = true)); }
  const p = d.products.find((x) => x.name === s.name);
  if (p) { p.stage = "In Production"; p.mfrId = s.mfrId; p.updatedAt = now(); }
  log(d, { text: `Created production order ${id} for ${s.name}`, tag: "Production", href: `/console/production?id=${id}` });
  return id;
}

export function confirmOrder(d: ConsoleState, id: string) {
  const o = d.orders.find((x) => x.id === id);
  if (!o || o.confirmed) return;
  o.confirmed = true;
  o.productionAt = now();
  if (o.batches[0]?.status === "Pending") o.batches[0].status = "In Progress";
  o.updates.unshift({ at: now(), text: "Production start confirmed by brand." });
  const plan = d.payments.find((p) => p.orderId === id);
  if (plan) plan.stage = "In Production";
  log(d, { text: `Confirmed production start for ${id}`, tag: "Production", href: `/console/production?id=${id}` });
}

/** Record units made on a batch. A finished batch goes to Quality for testing. */
export function updateBatch(d: ConsoleState, orderId: string, batchId: string, completed: number) {
  const o = d.orders.find((x) => x.id === orderId);
  const b = o?.batches.find((x) => x.id === batchId);
  if (!o || !b) return;
  b.completed = Math.max(0, Math.min(b.planned, completed));
  const was = b.status;
  b.status = b.completed >= b.planned ? "Completed" : b.completed > 0 ? "In Progress" : "Pending";
  o.confirmed = true;
  if (b.status === "Completed" && was !== "Completed") {
    b.end = now();
    o.updates.unshift({ at: now(), text: `${batchId} completed (${b.planned.toLocaleString("en-US")} units).` });
    const next = o.batches.find((x) => x.status === "Pending");
    if (next) { next.status = "In Progress"; next.start = now(); o.updates.unshift({ at: now(), text: `${next.id} production started.` }); }
    if (!d.quality.some((q) => q.id === batchId)) {
      const q: QualityBatch = {
        id: batchId, sampleRef: o.sampleId ?? "—", name: o.name, img: o.img, mfrId: o.mfrId, orderId, category: o.tags[0] ?? "Supplements", size: b.planned,
        mfgDate: now(), market: "India + Global", release: inDays(10), status: "In Testing", updatedAt: now(),
        checklist: ["Sample received & logged", "Physical appearance check", "Active content (Assay)", "Microbial testing", "Heavy metal testing", "Stability check", "COA reviewed"].map((label, k) => ({ label, status: k === 0 ? "Completed" as const : k === 1 ? "In Progress" as const : "Pending" as const })),
        tests: ["Identity Test (HPTLC)", "Assay (Active content)", "Heavy Metals (Pb, As, Cd, Hg)", "Microbial Limits", "Pesticide Residue", "Disintegration Test", "Uniformity of Weight"].map((name) => ({ name, status: "Pending" as const })),
        notes: [],
      };
      d.quality.unshift(q);
      log(d, { text: `${batchId} of ${o.name} sent for quality testing`, tag: "Quality", href: `/console/quality?id=${batchId}` });
    }
  } else if (was !== b.status || b.status === "In Progress") {
    o.updates.unshift({ at: now(), text: `${batchId}: ${b.completed.toLocaleString("en-US")} of ${b.planned.toLocaleString("en-US")} units completed.` });
  }
  const done = o.batches.reduce((a, x) => a + x.completed, 0);
  log(d, { text: `Updated production progress to ${Math.round((done / o.qty) * 100)}% for ${orderId}`, tag: "Production", href: `/console/production?id=${orderId}` });
}

/** Approve a tested batch: it passes and a shipment is created, ready for dispatch. */
export function approveBatch(d: ConsoleState, batchId: string) {
  const q = d.quality.find((x) => x.id === batchId);
  if (!q) return null;
  q.status = "Passed";
  q.updatedAt = now();
  q.checklist.forEach((c) => (c.status = "Completed"));
  q.tests.forEach((t) => { if (t.status !== "Fail") t.status = "Pass"; });
  q.notes.unshift({ at: now(), who: d.user.name, text: "Batch approved for release." });
  log(d, { text: `Approved ${batchId} – ${q.name} for release`, tag: "Quality", href: `/console/quality?id=${batchId}` });
  if (q.shipmentId) return q.shipmentId;
  const o = d.orders.find((x) => x.id === q.orderId);
  const id = nextId(d.shipments.map((s) => s.id), "SH-2026-", 4);
  const sh: Shipment = {
    id, name: q.name, img: q.img, category: q.category, qty: q.size, carrier: "BlueDart Freight", destination: o?.destination ?? "Mumbai, India", eta: inDays(7),
    status: "Pending", step: 0, updatedAt: now(), note: "Ready for dispatch", orderId: q.orderId, value: q.size * 125, incoterms: o?.incoterms ?? "FOB Factory",
    packages: `${Math.ceil(q.size / 850)} cartons`, stepDates: [now(), null, null, null, null],
    events: [{ at: now(), text: "Shipment packed and ready for dispatch.", tone: "green" }],
    documents: ["Commercial_Invoice.pdf", "Packing_List.pdf", "COA.pdf"], carrierContact: { name: "Amit Verma", role: "Logistics Manager", img: "/console/av-amit.jpg" },
  };
  d.shipments.unshift(sh);
  q.shipmentId = id;
  log(d, { text: `Shipment ${id} created for ${q.name}`, tag: "Shipment", href: `/console/shipments?id=${id}` });
  return id;
}

export function retestBatch(d: ConsoleState, batchId: string, reason: string) {
  const q = d.quality.find((x) => x.id === batchId);
  if (!q) return;
  q.status = "In Testing";
  q.updatedAt = now();
  q.tests.forEach((t) => { if (t.status !== "Pass") t.status = "Pending"; });
  q.checklist.forEach((c) => { if (c.status !== "Completed") c.status = "Pending"; });
  q.notes.unshift({ at: now(), who: d.user.name, text: `Re-test requested: ${reason}` });
  log(d, { text: `Requested re-test for ${batchId} – ${q.name}`, tag: "Quality", href: `/console/quality?id=${batchId}` });
}

export function raiseIssue(d: ConsoleState, batchId: string, title: string, level: "High" | "Medium" | "Low", detail: string) {
  const q = d.quality.find((x) => x.id === batchId);
  d.issues.unshift({ id: `QI-${Date.now()}`, title, detail, level, at: now(), resolved: false, ref: `${batchId}${q ? ` – ${q.name}` : ""}` });
  if (q) { q.status = "Issues Found"; q.updatedAt = now(); q.notes.unshift({ at: now(), who: d.user.name, text: `Issue raised: ${title}` }); }
  log(d, { text: `Raised ${level.toLowerCase()} issue on ${batchId}: ${title}`, tag: "Quality", href: `/console/quality?id=${batchId}` });
}

/** Move a shipment to its next step; the last step marks it delivered. */
export function advanceShipment(d: ConsoleState, id: string) {
  const s = d.shipments.find((x) => x.id === id);
  if (!s || s.status === "Delivered") return;
  s.step = Math.min(SHIP_STEPS.length - 1, s.step + 1);
  s.stepDates[s.step] = now();
  if (!s.stepDates[0]) s.stepDates[0] = now();
  s.status = s.step === SHIP_STEPS.length - 1 ? "Delivered" : "In Transit";
  s.note = SHIP_STEPS[s.step];
  s.updatedAt = now();
  if (s.status === "Delivered") s.eta = now();
  const label = SHIP_STEPS[s.step];
  s.events.unshift({ at: now(), text: label === "Delivered" ? `Delivered at ${s.destination.split(",")[0]}.` : `${label}${label === "Dispatched" ? ` via ${s.carrier}` : ""}.`, tone: "green" });
  log(d, { text: `${id} ${label.toLowerCase()} – ${s.name}`, tag: "Shipment", href: `/console/shipments?id=${id}` });
  if (s.status === "Delivered" && s.orderId) {
    const plan = d.payments.find((p) => p.orderId === s.orderId);
    const disp = plan?.milestones.find((m) => m.name === "Dispatch" && m.status === "Scheduled");
    if (disp) { disp.status = "Due Soon"; disp.due = inDays(7); }
  }
}

export function recordPayment(d: ConsoleState, orderId: string, invoice: string, ref: string, paidOn: string) {
  const plan = d.payments.find((p) => p.orderId === orderId);
  const m = plan?.milestones.find((x) => x.invoice === invoice);
  if (!plan || !m || m.status === "Paid") return;
  m.status = "Paid";
  m.paidAt = paidOn;
  m.ref = ref;
  plan.notes.unshift({ at: now(), who: d.user.name, text: `${m.name} payment of ₹${m.amount.toLocaleString("en-IN")} recorded (ref ${ref}).` });
  log(d, { text: `Recorded payment ${invoice} – ₹${m.amount.toLocaleString("en-IN")} for ${orderId}`, tag: "Payment", href: `/console/payments?id=${orderId}` });
}

export function sendMessage(d: ConsoleState, to: string, subject: string, body: string, href: string, tag: Activity["tag"] = "Manufacturer", by?: { who: string; img?: string }) {
  d.messages.unshift({ id: `m${Date.now()}`, at: now(), to, subject, body });
  log(d, { ...by, text: `${by ? `${by.who} messaged` : "Messaged"} ${to}: ${subject}`, tag, href });
}

/** Products → "Create Reorder": a new enquiry pre-filled from the product brief. */
export function reorder(d: ConsoleState, productId: string, moq: number) {
  const p = d.products.find((x) => x.id === productId);
  if (!p) return null;
  return createEnquiry(d, { name: p.name, category: p.category, moq, launch: "Next quarter", price: "As last order", brief: `Reorder of ${p.name}. ${p.brief}`, requirements: p.certs.slice(0, 4), img: p.img, productId });
}

export const sampleOrderDefaults = (s: Sample, e?: Enquiry) => ({ qty: e?.moq ?? 50000, unitPrice: e?.quotes.find((q) => q.mfrId === s.mfrId)?.unitPrice ?? 9 });
