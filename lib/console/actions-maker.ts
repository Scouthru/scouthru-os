import type { ConsoleState, Issue, Milestone } from "./types";
import { log } from "./actions";
import { daysUntil } from "./format";

/**
 * Manufacturer-portal helpers: what belongs to the signed-in factory, how much
 * line capacity its open orders take, and the few writes only the factory makes
 * (risks on its orders, replies on quality batches, line capacity).
 */

const now = () => new Date().toISOString();

/** Units of the line's measure in one pack (capsules, tablets, gummies are counted per piece). */
export const PER_PACK = 30;

export type LineKey = "Capsule line" | "Tablet line" | "Gummy line" | "Powder & sachet line";

/** Which production line a product runs on, from its name / format / tags. */
export function lineFor(text: string): LineKey {
  if (/gumm/i.test(text)) return "Gummy line";
  if (/tablet|effervescent/i.test(text)) return "Tablet line";
  if (/powder|sachet|pouch|bar|cream|serum|oil|jar/i.test(text)) return "Powder & sachet line";
  return "Capsule line";
}

const counted = (line: string) => line !== "Powder & sachet line";
/** A pack quantity converted into the line's own unit (pieces for capsule/tablet/gummy lines). */
export const lineUnits = (line: string, packs: number) => (counted(line) ? packs * PER_PACK : packs);

export function mine(s: ConsoleState) {
  const id = s.makerId;
  const orders = s.orders.filter((o) => o.mfrId === id);
  const orderIds = new Set(orders.map((o) => o.id));
  const orderNames = new Set(orders.map((o) => o.name));
  const enquiries = s.enquiries.filter((e) => e.responses.some((r) => r.mfrId === id));
  const samples = s.samples.filter((x) => x.mfrId === id);
  const quality = s.quality.filter((q) => (q.orderId && orderIds.has(q.orderId)) || q.mfrId === id);
  const shipments = s.shipments.filter((x) => (x.orderId ? orderIds.has(x.orderId) : orderNames.has(x.name)));
  const pos = s.purchaseOrders.filter((p) => p.mfrId === id);
  const plans = s.payments.filter((p) => orderIds.has(p.orderId) || p.mfrId === id);
  return { orders, enquiries, samples, quality, shipments, pos, plans };
}

export const openOrders = (s: ConsoleState) => mine(s).orders.filter((o) => o.batches.some((b) => b.status !== "Completed"));

/** Per line: monthly capacity, the load from open orders spread over the months until their delivery, and what's free. */
export function capacityLoad(s: ConsoleState) {
  const open = openOrders(s);
  return s.capacity.map((c) => {
    const orders = open.filter((o) => lineFor(`${o.name} ${o.unitFormat} ${o.tags.join(" ")}`) === c.line).map((o) => {
      const remaining = o.batches.reduce((a, b) => a + (b.planned - b.completed), 0);
      const months = Math.max(1, daysUntil(o.targetDelivery) / 30);
      return { order: o, remaining, perMonth: lineUnits(c.line, remaining) / months };
    });
    const booked = Math.round(orders.reduce((a, x) => a + x.perMonth, 0));
    return { ...c, booked, free: Math.max(0, c.perMonth - booked), pct: c.perMonth ? Math.round((booked / c.perMonth) * 100) : 0, orders };
  });
}

/** Can the factory take `packs` more of something that runs on `line` this month? */
export function capacityFit(s: ConsoleState, line: string, packs: number) {
  const l = capacityLoad(s).find((x) => x.line === line);
  if (!l) return { fits: false, need: 0, free: 0, shortfall: 0, line };
  const need = lineUnits(line, packs);
  return { fits: need <= l.free, need, free: l.free, shortfall: Math.max(0, need - l.free), line };
}

export type Shown = "Paid" | "Due Soon" | "Overdue" | "Scheduled";
export function milestoneStatus(m: Milestone): Shown {
  if (m.status === "Paid") return "Paid";
  const d = daysUntil(m.due);
  if (d < 0) return "Overdue";
  if (d <= 14) return "Due Soon";
  return "Scheduled";
}

/* ----------------------------- factory-only writes ----------------------------- */

export function addRisk(d: ConsoleState, orderId: string, x: { title: string; detail: string; level: Issue["level"]; ref: string }) {
  const o = d.orders.find((y) => y.id === orderId);
  if (!o) return;
  o.issues.unshift({ id: `RISK-${Date.now()}`, title: x.title, detail: x.detail, level: x.level, at: now(), resolved: false, ref: x.ref || orderId });
  log(d, { who: d.people.maker.name, img: d.people.maker.img, text: `Flagged a ${x.level.toLowerCase()} risk on ${orderId}: ${x.title}`, tag: "Production", href: `/console/production?id=${orderId}` });
}

export function setRiskResolved(d: ConsoleState, orderId: string, riskId: string, resolved: boolean) {
  const r = d.orders.find((y) => y.id === orderId)?.issues.find((i) => i.id === riskId);
  if (r) r.resolved = resolved;
}

export function replyOnBatch(d: ConsoleState, batchId: string, text: string) {
  const q = d.quality.find((x) => x.id === batchId);
  if (!q) return;
  q.notes.unshift({ at: now(), who: d.people.maker.name, text });
  q.updatedAt = now();
  log(d, { who: d.people.maker.name, img: d.people.maker.img, text: `Replied on quality batch ${batchId}`, tag: "Quality", href: `/console/quality?id=${batchId}` });
}

export function setLineCapacity(d: ConsoleState, line: string, perMonth: number) {
  const c = d.capacity.find((x) => x.line === line);
  if (c && perMonth > 0) c.perMonth = Math.round(perMonth);
}
