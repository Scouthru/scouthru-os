import type { ConsoleState, Enquiry, Order, PaymentPlan, PurchaseOrder, QualityBatch, Sample, SampleStatus, Shipment } from "./types";
import { SHIP_STEPS } from "./types";
import { fmtDay } from "./format";

/**
 * Shared "what happens next" and timeline rules. Every portal reads the same record
 * through these functions, so the product owner, factory, supplier and distributor
 * always agree on the status, whose turn it is and what comes next. Each side only
 * gets its own button; the others see who they are waiting on.
 */

export type Side = "brand" | "maker" | "supplier" | "distributor";

export type NextStep = {
  /** Plain-language status, e.g. "Waiting for your approval". */
  title: string;
  /** Who has to act: "You", or the other company's name. */
  owner: string;
  /** True when the viewer is the one who has to act. */
  yours: boolean;
  detail?: string;
  /** "done" when the flow is finished, "closed" when it stopped. */
  state: "open" | "done" | "closed";
  /** Due date (ISO) of the pending step, when there is one. */
  due?: string;
  /** Something holding the step up, shown as a warning. */
  blocker?: string;
  /** Key of the button this side should show; the page maps it to its own action. */
  action?: string;
  actionLabel?: string;
  /** What comes after this step. */
  then?: string;
};

export type Milestone = {
  at: string;
  title: string;
  who: string;
  /** Status before → after, when the event changed it. */
  change?: [string, string];
  /** Major events show by default; minor ones (comments, routine updates) on "Show all activity". */
  major: boolean;
  text?: string;
  tone: "done" | "warn" | "bad" | "note";
  /** Which record it came from, on combined timelines (e.g. "Sample"). */
  tag?: string;
};

/* --------------------------------- helpers -------------------------------- */

const factoryName = (s: ConsoleState, id: string) => s.manufacturers.find((m) => m.id === id)?.name ?? "the manufacturer";
const supplierName = (s: ConsoleState, id: string) => s.suppliers.find((x) => x.id === id)?.name ?? "the supplier";
const short = fmtDay;
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const byTime = (a: Milestone, b: Milestone) => a.at.localeCompare(b.at);

/** Builds a step for whichever side has to act, from the viewer's point of view. */
function stepper(side: Side, label: Record<Side, string>) {
  return (who: Side, mine: Omit<NextStep, "owner" | "yours" | "state">, theirs: Omit<NextStep, "owner" | "yours" | "state">): NextStep =>
    who === side ? { ...mine, owner: "You", yours: true, state: "open" } : { ...theirs, owner: label[who], yours: false, state: "open" };
}
function labels(s: ConsoleState, factory: string, supplier = "the supplier"): Record<Side, string> {
  return { brand: s.workspace, maker: factory, supplier, distributor: s.distributor.name };
}
const done = (title: string, detail?: string, extra: Partial<NextStep> = {}): NextStep => ({ title, detail, owner: "", yours: false, state: "done", ...extra });
const closed = (title: string, detail?: string): NextStep => ({ title, detail, owner: "", yours: false, state: "closed" });

/* --------------------------------- samples -------------------------------- */

const SAMPLE_EVENT: Record<SampleStatus, { title: string; by: "brand" | "maker"; tone: Milestone["tone"] }> = {
  Draft: { title: "Sample request drafted", by: "brand", tone: "note" },
  Submitted: { title: "Sample requested", by: "brand", tone: "done" },
  "In Review": { title: "Sample dispatched for review", by: "maker", tone: "done" },
  Testing: { title: "Lab testing started", by: "brand", tone: "done" },
  Feedback: { title: "Feedback shared", by: "brand", tone: "done" },
  "Changes Requested": { title: "Changes requested", by: "brand", tone: "warn" },
  Approved: { title: "Sample approved", by: "brand", tone: "done" },
  Rejected: { title: "Sample rejected", by: "brand", tone: "bad" },
};

/** Latest comment from the given person, quoted, so whoever acts next sees why. */
function lastComment(x: Sample, from: string) {
  const c = [...x.comments].reverse().find((k) => k.who === from) ?? x.comments[x.comments.length - 1];
  return c ? `“${c.text.length > 120 ? `${c.text.slice(0, 117)}…` : c.text}” · ${c.who}` : undefined;
}

export function sampleNext(s: ConsoleState, x: Sample, side: Side): NextStep {
  const L = labels(s, factoryName(s, x.mfrId));
  const step = stepper(side, L);
  switch (x.status) {
    case "Draft":
      return step("brand", { title: "Send this request to the factory", action: "send", actionLabel: "Send request", then: "Factory makes and dispatches the sample" }, { title: "Request not sent yet" });
    case "Submitted":
      return step("maker",
        { title: "Make and dispatch this sample", detail: `${L.brand} asked for it on ${short(x.requestedAt)}. Lead time ${x.leadTime}.`, action: "dispatch", actionLabel: "Mark dispatched", then: `${L.brand} reviews the sample` },
        { title: `Waiting for ${L.maker} to send the sample`, detail: `Requested ${short(x.requestedAt)}. Lead time ${x.leadTime}.`, then: "You review the sample" });
    case "In Review":
    case "Feedback":
      return step("brand",
        { title: "Waiting for your approval", detail: "Review the sample, then approve it or ask for changes.", action: "review", actionLabel: "Review sample", then: "Approve to place a production order" },
        { title: `With ${L.brand} for review`, detail: "You'll see their decision here.", then: "Approval, or a change request" });
    case "Testing":
      return step("brand",
        { title: "Lab tests running", detail: "Approve once results are in.", action: "review", actionLabel: "Review sample", then: "Approve to place a production order" },
        { title: `${L.brand} is lab testing the sample`, then: "Approval, or a change request" });
    case "Changes Requested":
      return step("maker",
        { title: "Revise and resend the sample", detail: lastComment(x, s.user.name), action: "revise", actionLabel: "Send revised sample", then: `${L.brand} reviews it again` },
        { title: `Waiting for ${L.maker} to send a revised sample`, detail: "You asked for changes.", then: "You review the revised sample" });
    case "Approved": {
      // An order that points back at this sample counts, even if the sample wasn't linked to it.
      const orderId = x.orderId ?? s.orders.find((o) => o.sampleId === x.id)?.id;
      if (orderId) return done("Approved · production order placed", `Order ${orderId}.`, side === "brand" ? { action: "view-order", actionLabel: `View order ${orderId}` } : {});
      return step("brand", { title: "Approved · place the production order", action: "order", actionLabel: "Create production order", then: "Production starts" }, { title: `Approved · waiting for ${L.brand}'s production order`, then: "Production starts" });
    }
    case "Rejected":
      return closed("Sample rejected · closed", lastComment(x, s.user.name));
  }
}

export function sampleTimeline(s: ConsoleState, x: Sample): Milestone[] {
  const L = labels(s, factoryName(s, x.mfrId));
  const out: Milestone[] = [];
  let prev = "";
  for (const h of x.history) {
    const e = SAMPLE_EVENT[h.status];
    out.push({ at: h.at, title: e.title, who: L[e.by], change: prev ? [prev, h.status] : undefined, major: true, tone: e.tone });
    prev = h.status;
  }
  for (const c of x.comments) out.push({ at: c.at, title: "Comment", who: c.who, text: c.text, major: false, tone: "note" });
  return out.sort(byTime);
}

/* -------------------------------- enquiries -------------------------------- */

/** For the factory side, `mfrId` is the viewing factory: its own quote decides its step. */
export function enquiryNext(s: ConsoleState, e: Enquiry, side: Side, mfrId?: string): NextStep {
  const L = labels(s, mfrId ? factoryName(s, mfrId) : "factories");
  const step = stepper(side, L);
  const quotes = e.quotes.length;
  const myResponse = mfrId ? e.responses.find((r) => r.mfrId === mfrId) : undefined;
  const myQuote = mfrId ? e.quotes.find((q) => q.mfrId === mfrId) : undefined;
  if (side === "maker") {
    if (e.stage === "Closed") return closed("Enquiry closed");
    if (myResponse?.status === "Declined") return closed("You declined this enquiry", myResponse.note);
    // Won = the brand asked this factory for a sample. Another factory's win is never named here.
    const won = s.samples.some((x) => x.enquiryId === e.id && x.mfrId === mfrId);
    if (won) return done("You won this enquiry", `${L.brand} asked you for a sample.`, { action: "samples", actionLabel: "Open samples" });
    if (e.stage === "Samples Requested" || e.stage === "In Production") return closed(`${L.brand} went with another factory`);
    if (!myQuote) return step("maker", { title: "Send your quote", detail: `${e.name} · MOQ ${e.moq.toLocaleString("en-IN")} · target ${e.price}.`, action: "quote", actionLabel: "Send quote", then: `${L.brand} compares quotes` }, { title: "" });
    return step("brand", { title: "" }, { title: `Waiting for ${L.brand} to compare quotes`, detail: `You quoted ${rupees(myQuote.unitPrice)} / unit, ${myQuote.leadWeeks} weeks.`, then: "Sample request, or a decline" });
  }
  switch (e.stage) {
    case "Draft":
      return step("brand", { title: "Send this enquiry to factories", action: "send", actionLabel: "Send enquiry", then: "Factories reply with quotes" }, { title: "Not sent yet" });
    case "In Discussion":
      return quotes
        ? step("brand", { title: `${quotes} quote${quotes === 1 ? "" : "s"} waiting for you`, detail: "Compare price, MOQ and lead time.", action: "compare", actionLabel: "Compare quotes", then: "Request a sample from the best fit" }, { title: "" })
        : step("maker", { title: "" }, { title: "Waiting for factories to quote", detail: `${e.responses.length} contacted · ${e.responses.filter((r) => r.status === "Awaiting Reply").length} yet to reply.`, then: "You compare quotes" });
    case "Quote Received":
      return step("brand", { title: `${quotes} quote${quotes === 1 ? "" : "s"} waiting for you`, detail: "Compare price, MOQ and lead time, then request a sample.", action: "compare", actionLabel: "Compare quotes", then: "Request a sample from the best fit" }, { title: "" });
    case "Samples Requested":
      return done("Sample requested", "Track it on the Samples page.", { action: "samples", actionLabel: "Open samples" });
    case "In Production":
      return done("In production", "Track it on the Production page.", { action: "production", actionLabel: "Open production" });
    case "Closed":
      return closed("Enquiry closed");
  }
}

export function enquiryTimeline(s: ConsoleState, e: Enquiry): Milestone[] {
  const out: Milestone[] = [{ at: e.createdAt, title: "Enquiry created", who: s.workspace, major: true, tone: "done" }];
  for (const r of e.responses) {
    const f = factoryName(s, r.mfrId);
    if (r.status === "Quote Received") out.push({ at: r.at, title: "Quote received", who: f, text: r.note || undefined, major: true, tone: "done" });
    else if (r.status === "Declined") out.push({ at: r.at, title: "Declined", who: f, text: r.note || undefined, major: true, tone: "bad" });
    else if (r.status === "Shared Proposal") out.push({ at: r.at, title: "Proposal shared", who: f, text: r.note || undefined, major: true, tone: "done" });
  }
  for (const a of e.activity) out.push({ at: a.at, title: "Update", who: a.who, text: a.text, major: false, tone: "note" });
  return out.sort(byTime);
}

/* ---------------------------- production orders ---------------------------- */

export function orderNext(s: ConsoleState, o: Order, side: Side): NextStep {
  const L = labels(s, factoryName(s, o.mfrId));
  const step = stepper(side, L);
  const made = o.batches.reduce((a, b) => a + b.completed, 0);
  const openIssue = o.issues.find((i) => !i.resolved && i.level === "High");
  if (!o.confirmed) {
    return step("maker",
      { title: "Accept this order and book capacity", detail: `${o.qty.toLocaleString("en-IN")} units for ${L.brand}.`, action: "accept", actionLabel: "Accept order", then: "Production starts" },
      { title: `Waiting for ${L.maker} to accept the order`, detail: `${o.qty.toLocaleString("en-IN")} units.`, then: "Production starts" });
  }
  if (made < o.qty) {
    const cur = o.batches.find((b) => b.status === "In Progress") ?? o.batches.find((b) => b.status === "Pending");
    return step("maker",
      { title: `Make ${cur?.id ?? "the next batch"} and post progress`, detail: `${made.toLocaleString("en-IN")} of ${o.qty.toLocaleString("en-IN")} units made.`, due: o.targetDelivery, blocker: openIssue?.title, action: "progress", actionLabel: "Update batch", then: "Finished batches go to quality testing" },
      { title: `${L.maker} is producing`, detail: `${made.toLocaleString("en-IN")} of ${o.qty.toLocaleString("en-IN")} units made (${Math.round((made / o.qty) * 100)}%).`, due: o.targetDelivery, blocker: openIssue?.title, then: "Batches go to quality testing" });
  }
  return done("All batches made", "Quality testing and dispatch follow.", side === "brand" ? { action: "quality", actionLabel: "Open quality" } : {});
}

export function orderTimeline(s: ConsoleState, o: Order): Milestone[] {
  const f = factoryName(s, o.mfrId);
  const out: Milestone[] = [{ at: o.createdAt, title: "Production order placed", who: s.workspace, major: true, tone: "done" }];
  for (const u of o.updates) {
    const major = /accepted|confirmed|completed \(|production started/i.test(u.text);
    out.push({ at: u.at, title: major ? u.text.replace(/\.$/, "") : "Factory update", who: /brand/i.test(u.text) ? s.workspace : f, text: major ? undefined : u.text, major, tone: major ? "done" : "note" });
  }
  for (const i of o.issues) out.push({ at: i.at, title: `${i.level} risk: ${i.title}`, who: f, text: i.detail, major: i.level === "High", tone: i.resolved ? "note" : i.level === "High" ? "bad" : "warn" });
  return out.sort(byTime);
}

/* --------------------------------- quality --------------------------------- */

export function qualityNext(s: ConsoleState, q: QualityBatch, side: Side): NextStep {
  const L = labels(s, factoryName(s, q.mfrId));
  const step = stepper(side, L);
  const tested = q.tests.filter((t) => t.status === "Pass" || t.status === "Fail").length;
  const failed = q.tests.filter((t) => t.status === "Fail").map((t) => t.name);
  switch (q.status) {
    case "In Testing":
    case "Re-test":
      return tested < q.tests.length
        ? step("maker",
          { title: "Share lab results", detail: `${tested} of ${q.tests.length} tests reported.`, due: q.release, action: "results", actionLabel: "Share results", then: `${L.brand} approves the batch for dispatch` },
          { title: `Waiting for ${L.maker}'s lab results`, detail: `${tested} of ${q.tests.length} tests reported.`, due: q.release, then: "You approve the batch for dispatch" })
        : step("brand",
          { title: "Results are in · approve this batch", detail: "Every test is reported.", action: "approve", actionLabel: "Approve batch", then: "A shipment is created for dispatch" },
          { title: `Waiting for ${L.brand} to approve the batch`, then: "Dispatch" });
    case "Issues Found":
      return step("brand",
        { title: "Decide on the failed tests", detail: failed.length ? `Failed: ${failed.join(", ")}.` : "An issue was raised on this batch.", blocker: failed[0], action: "decide", actionLabel: "Review results", then: "Ask for a re-test, or approve with a note" },
        { title: `${L.brand} is reviewing the failed tests`, detail: failed.length ? `Failed: ${failed.join(", ")}.` : undefined, then: "A re-test request, or approval" });
    case "Passed":
      return done("Passed · released for dispatch", q.shipmentId ? `Shipment ${q.shipmentId}.` : undefined, q.shipmentId ? { action: "shipment", actionLabel: `View ${q.shipmentId}` } : {});
  }
}

export function qualityTimeline(s: ConsoleState, q: QualityBatch): Milestone[] {
  const f = factoryName(s, q.mfrId);
  const out: Milestone[] = [{ at: q.mfgDate, title: "Batch sent for testing", who: f, major: true, tone: "done" }];
  for (const n of q.notes) {
    const tone: Milestone["tone"] = /approved/i.test(n.text) ? "done" : /issue|re-test|fail/i.test(n.text) ? "warn" : "done";
    out.push({ at: n.at, title: n.text.replace(/\.$/, ""), who: n.who, major: true, tone });
  }
  return out.sort(byTime);
}

/* -------------------------------- shipments -------------------------------- */

export const toDistributor = (sh: Shipment) => /mumbai/i.test(sh.destination);

export function shipmentNext(s: ConsoleState, sh: Shipment, side: Side): NextStep {
  // The factory: from the order, else the quality batch that released it, else the product.
  const mfrId = s.orders.find((x) => x.id === sh.orderId)?.mfrId ?? s.quality.find((q) => q.shipmentId === sh.id)?.mfrId ?? s.orders.find((x) => x.name === sh.name)?.mfrId ?? s.products.find((x) => x.name === sh.name)?.mfrId;
  const L = labels(s, mfrId ? factoryName(s, mfrId) : "the factory");
  const step = stepper(side, L);
  const received = s.grns.some((g) => g.shipmentId === sh.id);
  if (sh.status === "Pending") {
    return step("maker",
      { title: "Hand this shipment to the carrier", detail: `${sh.qty.toLocaleString("en-IN")} units · ${sh.packages}.`, action: "dispatch", actionLabel: "Dispatch", then: `On its way to ${sh.destination.split(",")[0]}` },
      { title: `Waiting for ${L.maker} to dispatch`, detail: "Packed and ready.", then: `On its way to ${sh.destination.split(",")[0]}` });
  }
  if (sh.status !== "Delivered") {
    const stage = SHIP_STEPS[sh.step];
    return { title: sh.status === "Delayed" ? "Delayed in transit" : `${stage} · on its way`, owner: sh.carrier, yours: false, state: "open", detail: `With ${sh.carrier} to ${sh.destination}.`, due: sh.eta, blocker: sh.status === "Delayed" ? sh.note : undefined, action: side === "brand" ? "advance" : undefined, actionLabel: side === "brand" ? "Mark next stage" : undefined, then: toDistributor(sh) ? `${L.distributor} counts it in` : "Delivered" };
  }
  if (toDistributor(sh) && !received) {
    return step("distributor",
      { title: "Count this delivery into stock", detail: `${sh.qty.toLocaleString("en-IN")} units invoiced.`, action: "receive", actionLabel: "Count it in", then: "Stock is ready to sell" },
      { title: `Waiting for ${L.distributor} to count it in`, detail: "Delivered.", then: "Stock is ready to sell" });
  }
  return done(received ? "Delivered and counted in" : "Delivered", `${sh.destination}.`);
}

export function shipmentTimeline(s: ConsoleState, sh: Shipment): Milestone[] {
  const out: Milestone[] = sh.events.map((e) => ({ at: e.at, title: e.text.replace(/\.$/, ""), who: sh.carrier, major: /packed|dispatched|delivered|delay/i.test(e.text), tone: e.tone === "amber" ? "warn" as const : "done" as const }));
  const g = s.grns.find((x) => x.shipmentId === sh.id);
  if (g) {
    const l = g.lines[0];
    out.push({ at: g.at, title: "Counted into stock", who: s.distributor.name, text: l ? `${l.received.toLocaleString("en-IN")} of ${l.invoiced.toLocaleString("en-IN")} received${l.damaged ? `, ${l.damaged} damaged` : ""}.${g.claim ? ` Claim: ${g.claim}` : ""}` : undefined, major: true, tone: l?.damaged ? "warn" : "done" });
  }
  return out.sort(byTime);
}

/* --------------------------------- payments -------------------------------- */

export function paymentNext(s: ConsoleState, p: PaymentPlan, side: Side): NextStep {
  const L = labels(s, factoryName(s, p.mfrId));
  const step = stepper(side, L);
  const nextDue = p.milestones.find((m) => m.status === "Overdue") ?? p.milestones.find((m) => m.status === "Due Soon") ?? p.milestones.find((m) => m.status === "Pending");
  const upcoming = p.milestones.find((m) => m.status === "Scheduled");
  if (nextDue) {
    const late = nextDue.status === "Overdue";
    return step("brand",
      { title: `${late ? "Overdue" : "Pay"}: ${nextDue.name} · ${rupees(nextDue.amount)}`, detail: `Invoice ${nextDue.invoice}.`, due: nextDue.due, blocker: late ? "Past due date" : undefined, action: "pay", actionLabel: "Record payment", then: upcoming ? `${upcoming.name} payment later` : "All paid" },
      { title: `Waiting for ${L.brand} to pay ${nextDue.name}`, detail: `${rupees(nextDue.amount)} · invoice ${nextDue.invoice}.`, due: nextDue.due, blocker: late ? "Past due date" : undefined, then: upcoming ? `${upcoming.name} payment later` : "All paid" });
  }
  if (upcoming) return { title: `Next payment: ${upcoming.name}`, owner: L.brand, yours: false, state: "open", detail: `${rupees(upcoming.amount)}, due when the milestone is reached.`, due: upcoming.due };
  return done("Fully paid", `${rupees(p.milestones.reduce((a, m) => a + m.amount, 0))} across ${p.milestones.length} payments.`);
}

export function paymentTimeline(s: ConsoleState, p: PaymentPlan): Milestone[] {
  const out: Milestone[] = [];
  for (const m of p.milestones) if (m.status === "Paid" && m.paidAt) out.push({ at: m.paidAt, title: `${m.name} paid · ${rupees(m.amount)}`, who: s.workspace, text: m.ref ? `Ref ${m.ref}` : undefined, major: true, tone: "done" });
  for (const n of p.notes) out.push({ at: n.at, title: "Note", who: n.who, text: n.text, major: false, tone: "note" });
  return out.sort(byTime);
}

/* ------------------------- material purchase orders ------------------------ */

export function poNext(s: ConsoleState, po: PurchaseOrder, side: Side): NextStep {
  const L = labels(s, factoryName(s, po.mfrId), supplierName(s, po.supplierId));
  const step = stepper(side, L);
  switch (po.status) {
    case "RFQ":
      return step("supplier",
        { title: "Send your price", detail: `${po.title} · needed by ${short(po.needBy)}.`, due: po.needBy, action: "quote", actionLabel: "Send quote", then: `${L.maker} confirms the order` },
        { title: `Waiting for ${L.supplier} to quote`, detail: `Needed by ${short(po.needBy)}.`, due: po.needBy, then: "You confirm the order" });
    case "Quoted":
      return step("maker",
        { title: `Confirm ${L.supplier}'s quote`, detail: po.quote ? `${rupees(po.quote.total)} · ${po.quote.leadDays} days.` : undefined, action: "confirm", actionLabel: "Confirm order", then: `${L.supplier} dispatches` },
        { title: `Waiting for ${L.maker} to confirm`, detail: po.quote ? `You quoted ${rupees(po.quote.total)}.` : undefined, then: "You dispatch" });
    case "Confirmed":
      return step("supplier",
        { title: "Dispatch this order", detail: `Needed by ${short(po.needBy)}.`, due: po.needBy, action: "dispatch", actionLabel: "Dispatch", then: `${L.maker} receives it` },
        { title: `Waiting for ${L.supplier} to dispatch`, due: po.needBy, then: "You receive the goods" });
    case "Dispatched":
      return step("maker",
        { title: "Receive the goods", detail: po.vehicle ? `On vehicle ${po.vehicle}.` : undefined, action: "receive", actionLabel: "Mark received", then: "Pay the invoice" },
        { title: `On its way to ${L.maker}`, detail: po.vehicle ? `Vehicle ${po.vehicle}.` : undefined, then: "Payment" });
    case "Received":
      return step("maker",
        { title: `Pay ${L.supplier}`, detail: po.invoice ? `${rupees(po.invoice.amount)} · invoice ${po.invoice.no}.` : undefined, due: po.invoice?.due, action: "pay", actionLabel: "Pay invoice", then: "Done" },
        { title: `Waiting for ${L.maker}'s payment`, detail: po.invoice ? `${rupees(po.invoice.amount)} · invoice ${po.invoice.no}.` : undefined, due: po.invoice?.due, then: "Done" });
    case "Paid":
      return done("Paid · complete", po.invoice?.ref ? `Ref ${po.invoice.ref}.` : undefined);
    case "Declined":
      return closed("Declined");
  }
}

export function poTimeline(s: ConsoleState, po: PurchaseOrder): Milestone[] {
  const L = labels(s, factoryName(s, po.mfrId), supplierName(s, po.supplierId));
  return po.events
    .map((e) => ({ at: e.at, title: e.text.replace(/\.$/, ""), who: /quot|dispatch|declin/i.test(e.text) ? L.supplier : L.maker, major: true, tone: /declin/i.test(e.text) ? "bad" as const : "done" as const }))
    .sort(byTime);
}

/* ------------------------------ product workspace ------------------------------ */

export type ProductRecords = {
  enquiries: Enquiry[]; samples: Sample[]; orders: Order[]; quality: QualityBatch[]; shipments: Shipment[]; payments: PaymentPlan[]; pos: PurchaseOrder[];
};

/** Every record that belongs to a product: linked by productId, else by product name, then through the order. */
export function productRecords(s: ConsoleState, p: { id: string; name: string }): ProductRecords {
  const own = (x: { productId?: string; name: string }) => x.productId === p.id || (!x.productId && x.name === p.name);
  const orders = s.orders.filter(own);
  const orderIds = new Set(orders.map((o) => o.id));
  return {
    enquiries: s.enquiries.filter(own),
    samples: s.samples.filter(own),
    orders,
    quality: s.quality.filter((q) => (q.orderId && orderIds.has(q.orderId)) || (!q.orderId && q.name === p.name)),
    shipments: s.shipments.filter((x) => (x.orderId && orderIds.has(x.orderId)) || (!x.orderId && x.name === p.name)),
    payments: s.payments.filter((x) => orderIds.has(x.orderId)),
    pos: s.purchaseOrders.filter((x) => x.orderId && orderIds.has(x.orderId)),
  };
}

export type LinkedStep = { kind: string; id: string; href: string; step: NextStep };

/** Each linked record's next step for the product owner, latest stage first. */
export function productSteps(s: ConsoleState, r: ProductRecords): LinkedStep[] {
  // Once there is a production order, earlier open steps (comparing quotes, sample decisions) are history.
  const moved = (l: LinkedStep): LinkedStep =>
    r.orders.length && (l.kind === "Enquiry" || l.kind === "Sample") && l.step.state === "open" ? { ...l, step: done("Moved on to production", l.step.title) } : l;
  return [
    ...r.payments.map((x) => ({ kind: "Payment", id: x.orderId, href: `/console/payments?id=${x.orderId}`, step: paymentNext(s, x, "brand") })),
    ...r.shipments.map((x) => ({ kind: "Shipment", id: x.id, href: `/console/shipments?id=${x.id}`, step: shipmentNext(s, x, "brand") })),
    ...r.quality.map((x) => ({ kind: "Quality", id: x.id, href: `/console/quality?id=${x.id}`, step: qualityNext(s, x, "brand") })),
    ...r.orders.map((x) => ({ kind: "Production", id: x.id, href: `/console/production?id=${x.id}`, step: orderNext(s, x, "brand") })),
    ...r.samples.map((x) => ({ kind: "Sample", id: x.id, href: `/console/samples?id=${x.id}`, step: sampleNext(s, x, "brand") })),
    ...r.enquiries.map((x) => ({ kind: "Enquiry", id: x.id, href: `/console/enquiries?id=${x.id}`, step: enquiryNext(s, x, "brand") })),
  ].map(moved);
}

/**
 * Material orders as the product owner may see them: requested, ordered, dispatched,
 * received. The supplier's quote and invoice amounts are the factory's commercial
 * terms and are never shown to the brand.
 */
function poBrandTimeline(s: ConsoleState, po: PurchaseOrder): Milestone[] {
  const sup = supplierName(s, po.supplierId);
  const out: Milestone[] = [];
  for (const e of po.events) {
    const t = e.text.toLowerCase();
    const title = t.startsWith("rfq") ? `Materials requested: ${po.title}` : t.includes("confirm") ? "Materials ordered" : t.startsWith("dispatch") ? "Materials dispatched" : t.startsWith("received") ? "Materials received at the factory" : null;
    if (title) out.push({ at: e.at, title, who: t.startsWith("dispatch") ? sup : factoryName(s, po.mfrId), major: true, tone: "done" });
  }
  return out;
}

/** The one step to show at the top: the most urgent thing on you, else what you're waiting on. */
export function productNext(steps: LinkedStep[]): LinkedStep | undefined {
  const late = (l: LinkedStep) => !!l.step.due && new Date(l.step.due) < new Date();
  const open = steps.filter((l) => l.step.state === "open");
  const mine = open.filter((l) => l.step.yours);
  return mine.find(late) ?? mine[0] ?? open[0] ?? steps[0];
}

/** One timeline across every linked record, each event tagged with where it came from. */
export function productTimeline(s: ConsoleState, r: ProductRecords): Milestone[] {
  const tag = (t: string, list: Milestone[]) => list.map((m) => ({ ...m, tag: t }));
  return [
    ...r.enquiries.flatMap((x) => tag("Enquiry", enquiryTimeline(s, x))),
    ...r.samples.flatMap((x) => tag("Sample", sampleTimeline(s, x))),
    ...r.orders.flatMap((x) => tag("Production", orderTimeline(s, x))),
    ...r.pos.flatMap((x) => tag("Materials", poBrandTimeline(s, x))),
    ...r.quality.flatMap((x) => tag("Quality", qualityTimeline(s, x))),
    ...r.shipments.flatMap((x) => tag("Shipment", shipmentTimeline(s, x))),
    ...r.payments.flatMap((x) => tag("Payment", paymentTimeline(s, x))),
  ].sort(byTime);
}
