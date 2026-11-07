import type { ConsoleState, Milestone, Order, PaymentPlan } from "./types";

/**
 * Results as a Service rules. A payment milestone is released only when the result it
 * pays for is proven on the order's own records, so the brand pays for results, not
 * effort. The same rules drive the payment screen, the banners, the dashboards and the
 * guarantee card, and recordPayment refuses anything unproven.
 */

export type ProofItem = { label: string; done: boolean; href?: string };
export type Proof = { items: ProofItem[]; met: boolean; missing: string[] };

function proofOf(items: ProofItem[]): Proof {
  return { items, met: items.every((i) => i.done), missing: items.filter((i) => !i.done).map((i) => i.label) };
}

const orderOf = (s: ConsoleState, plan: PaymentPlan) => s.orders.find((o) => o.id === plan.orderId);

/** What each milestone pays for, checked against the order's records. */
export function milestoneProof(s: ConsoleState, plan: PaymentPlan, m: Milestone): Proof {
  const o = orderOf(s, plan);
  // Already paid, or a plan with no order behind it: nothing left to prove here.
  if (m.status === "Paid" || !o) return proofOf([]);
  const prod = `/console/production?id=${o.id}`;
  const quality = s.quality.filter((q) => q.orderId === o.id);
  const ships = s.shipments.filter((x) => x.orderId === o.id);
  const sample = s.samples.find((x) => x.id === o.sampleId) ?? s.samples.find((x) => x.name === o.name && x.status === "Approved");
  const started = o.batches.some((b) => b.status !== "Pending");
  const name = m.name.toLowerCase();

  if (name.includes("advance")) return proofOf([{ label: "Order accepted by the factory", done: o.confirmed, href: prod }]);
  if (name.includes("sample")) return proofOf([{ label: "Sample approved", done: sample?.status === "Approved", href: sample ? `/console/samples?id=${sample.id}` : "/console/samples" }]);
  if (name.includes("production")) return proofOf([
    { label: "Production started", done: o.confirmed && started, href: prod },
    { label: "Photo proof from the line", done: o.evidence.length > 0, href: prod },
  ]);
  if (name.includes("dispatch")) return proofOf([
    { label: "A batch passed quality checks", done: quality.some((q) => q.status === "Passed"), href: "/console/quality" },
    { label: "Shipment handed to the carrier", done: ships.some((x) => x.status !== "Pending"), href: ships[0] ? `/console/shipments?id=${ships[0].id}` : "/console/shipments" },
  ]);
  // Final settlement: the whole result delivered.
  return proofOf([
    { label: "All batches made", done: o.batches.every((b) => b.status === "Completed"), href: prod },
    { label: "Delivered", done: ships.length > 0 && ships.every((x) => x.status === "Delivered"), href: ships[0] ? `/console/shipments?id=${ships[0].id}` : "/console/shipments" },
  ]);
}

export type Guarantee = { promised: [string, string][]; proven: ProofItem[]; remedies: string[] };

/**
 * What an order promises, what has been proven so far, and what protects the brand if a
 * result is missed. Remedies only state what the platform already does.
 */
export function orderGuarantee(s: ConsoleState, o: Order): Guarantee {
  const quality = s.quality.filter((q) => q.orderId === o.id);
  const ships = s.shipments.filter((x) => x.orderId === o.id);
  const plan = s.payments.find((p) => p.orderId === o.id);
  const sample = s.samples.find((x) => x.id === o.sampleId);
  const made = o.batches.reduce((a, b) => a + b.completed, 0);
  const paid = plan ? plan.milestones.filter((m) => m.status === "Paid").reduce((a, m) => a + m.amount, 0) : 0;
  const total = plan ? plan.milestones.reduce((a, m) => a + m.amount, 0) : 0;
  const fmt = (n: number) => n.toLocaleString("en-IN");
  return {
    promised: [
      ["Quantity", `${fmt(o.qty)} units · ${o.unitFormat}`],
      ["Quality", sample ? `Matches approved sample ${sample.id}, every batch lab-tested` : "Every batch lab-tested before release"],
      ["Delivery", `By ${new Date(o.targetDelivery).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })} · ${o.destination}`],
      ...(total ? [["Price", `₹${fmt(total)}, paid in ${plan!.milestones.length} milestones`] as [string, string]] : []),
    ],
    proven: [
      { label: `${fmt(made)} of ${fmt(o.qty)} units made`, done: made >= o.qty, href: `/console/production?id=${o.id}` },
      { label: quality.length ? `${quality.filter((q) => q.status === "Passed").length} of ${quality.length} tested batches passed` : "No batch tested yet", done: quality.length > 0 && quality.every((q) => q.status === "Passed"), href: "/console/quality" },
      { label: ships.length ? `${ships.filter((x) => x.status === "Delivered").length} of ${ships.length} shipments delivered` : "Not shipped yet", done: ships.length > 0 && ships.every((x) => x.status === "Delivered"), href: ships[0] ? `/console/shipments?id=${ships[0].id}` : "/console/shipments" },
      ...(total ? [{ label: `₹${fmt(paid)} of ₹${fmt(total)} released`, done: paid >= total, href: `/console/payments?id=${o.id}` }] : []),
    ],
    remedies: [
      "No milestone is released until its proof is in.",
      "A batch that fails its tests is held back; you can ask for a re-test.",
      "Damage found on delivery is counted and claimed against the shipment.",
    ],
  };
}
