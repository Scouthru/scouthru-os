import type { ConsoleState, ProductStage } from "./types";
import { log } from "./actions";

/** Actions used by the Shipments, Payments, Products and Reports screens. */

const now = () => new Date().toISOString();

export function markDelayed(d: ConsoleState, id: string, reason: string, extraDays: number) {
  const s = d.shipments.find((x) => x.id === id);
  if (!s || s.status === "Delivered") return;
  s.status = "Delayed";
  s.note = reason;
  s.updatedAt = now();
  s.eta = new Date(new Date(s.eta).getTime() + extraDays * 864e5).toISOString();
  s.events.unshift({ at: now(), text: `Delayed: ${reason}. New ETA pushed by ${extraDays} day${extraDays === 1 ? "" : "s"}.`, tone: "amber" });
  log(d, { text: `${id} marked delayed – ${reason}`, tag: "Shipment", href: `/console/shipments?id=${id}` });
}

export function setProductStage(d: ConsoleState, id: string, stage: ProductStage) {
  const p = d.products.find((x) => x.id === id);
  if (!p || p.stage === stage) return;
  p.stage = stage;
  p.updatedAt = now();
  log(d, { text: `${stage === "Archived" ? "Archived" : `Moved to ${stage}:`} ${p.name} (${p.id})`, tag: "Product", href: `/console/products?id=${id}` });
}

export function setProductBrief(d: ConsoleState, id: string, brief: string) {
  const p = d.products.find((x) => x.id === id);
  if (!p) return;
  p.brief = brief;
  p.updatedAt = now();
  log(d, { text: `Edited the brief for ${p.name}`, tag: "Product", href: `/console/products?id=${id}` });
}

export function setPrimaryPackaging(d: ConsoleState, id: string, name: string) {
  const p = d.products.find((x) => x.id === id);
  if (!p) return;
  p.packaging.forEach((k) => (k.primary = k.name === name));
  p.packaging.sort((a, b) => Number(!!b.primary) - Number(!!a.primary));
  p.updatedAt = now();
  log(d, { text: `Set ${name} as primary packaging for ${p.name}`, tag: "Product", href: `/console/products?id=${id}` });
}

export function addExport(d: ConsoleState, file: string, type: string) {
  d.exports.unshift({ file, type, at: now(), by: d.user.name });
}

export function removeExport(d: ConsoleState, file: string, at: string) {
  d.exports = d.exports.filter((e) => !(e.file === file && e.at === at));
}
