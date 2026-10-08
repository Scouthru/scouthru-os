import type { ConsoleState, Route } from "./types";
import { log } from "./actions";

/**
 * Distributor-portal actions that only touch the distributor's own records
 * (the cross-portal ones live in actions-network.ts). Activity is logged as the
 * distributor's user, not the brand user.
 */

const now = () => new Date().toISOString();
const asDist = (d: ConsoleState) => ({ who: d.people.distributor.name, img: d.people.distributor.img });

/** A message from the distributor to the brand: lands in the brand's messages and activity feed. */
export function messageBrand(d: ConsoleState, subject: string, body: string, href = "/console/shipments") {
  d.messages.unshift({ id: `m${Date.now()}`, at: now(), to: d.workspace, subject: `${d.distributor.name}: ${subject}`, body });
  log(d, { ...asDist(d), text: `${d.distributor.name} messaged ${d.workspace}: ${subject}`, tag: "Shipment", href });
}

/** Damage, return or count correction. Positive adds stock, negative removes it. */
export function adjustStock(d: ConsoleState, sku: string, delta: number, reason: string) {
  const st = d.distStock.find((x) => x.sku === sku);
  if (!st || delta === 0) return;
  st.onHand = Math.max(0, st.onHand + delta);
  log(d, { ...asDist(d), text: `Stock adjusted ${delta > 0 ? "+" : ""}${delta} ${st.product} (${reason})`, tag: "Shipment", href: `/console/distributor/stock?sku=${sku}` });
}

export function setReorderLevel(d: ConsoleState, sku: string, level: number) {
  const st = d.distStock.find((x) => x.sku === sku);
  if (st) st.reorderAt = Math.max(0, Math.round(level));
}

/** Add a new route or save changes to an existing one. Returns its id. */
export function saveRoute(d: ConsoleState, r: Omit<Route, "id"> & { id?: string }) {
  if (r.id) {
    const ex = d.routes.find((x) => x.id === r.id);
    if (ex) Object.assign(ex, r);
    return r.id;
  }
  const n = d.routes.reduce((m, x) => Math.max(m, parseInt(x.id.slice(1), 10) || 0), 0) + 1;
  const id = `R${n}`;
  d.routes.push({ ...r, id });
  return id;
}

/** Ids of activity entries the distributor's side produced, for its own feed. */
export function distributorActivity(d: ConsoleState) {
  const me = d.people.distributor.name;
  return d.activity.filter((a) => a.who === me || a.text.includes(d.distributor.name));
}
