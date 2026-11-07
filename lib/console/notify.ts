import type { ConsoleState, Portal } from "./types";
import { attention, toDistributor, type LinkedStep } from "./flow";
import { mine } from "./actions-maker";

/**
 * Notification center. Two kinds, both built from the same records as the banners:
 * - "action": something waiting on you (the dashboard's Needs your attention list);
 * - "update": something another company did on one of your records in the last two weeks.
 * Each has a category the person can switch off in their notification settings.
 */

export const CATEGORIES = ["Enquiries", "Samples", "Production", "Quality", "Shipments", "Payments", "Materials", "Stock", "Retail orders"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Categories that matter to each portal, in the order the settings show them. */
export const PORTAL_CATEGORIES: Record<Portal, Category[]> = {
  brand: ["Enquiries", "Samples", "Production", "Quality", "Shipments", "Payments"],
  maker: ["Enquiries", "Samples", "Production", "Quality", "Shipments", "Materials", "Payments"],
  supplier: ["Materials", "Payments", "Stock"],
  distributor: ["Shipments", "Retail orders", "Payments", "Stock"],
};

export type Notice = { id: string; kind: "action" | "update"; cat: Category; at?: string; title: string; sub: string; href: string; late?: boolean };

const CAT_OF_KIND: Record<string, Category> = {
  Enquiry: "Enquiries", Sample: "Samples", Production: "Production", Quality: "Quality", Shipment: "Shipments", Dispatch: "Shipments", Inbound: "Shipments",
  Payment: "Payments", Collection: "Payments", Materials: "Materials", Request: "Materials", Order: "Materials", Stock: "Stock", "Retail order": "Retail orders",
};
const CAT_OF_TAG: Record<string, Category> = { Enquiry: "Enquiries", Sample: "Samples", Production: "Production", Quality: "Quality", Shipment: "Shipments", Payment: "Payments", Product: "Production", Manufacturer: "Enquiries" };

const FORTNIGHT = 14 * 864e5;
const recent = (at: string) => Date.now() - new Date(at).getTime() <= FORTNIGHT;

function fromStep(l: LinkedStep): Notice {
  const late = !!l.step.due && new Date(l.step.due) < new Date();
  // The step title is part of the id, so a record that moves to a new step notifies again.
  return { id: `act:${l.kind}:${l.id}:${l.step.title}`, kind: "action", cat: CAT_OF_KIND[l.kind] ?? "Production", title: l.step.title, sub: `${l.id}${l.step.detail ? ` · ${l.step.detail}` : ""}`, href: l.href, late };
}

/** Brand console links, rewritten to the factory portal's page for the same record. */
const MAKER_PATH: [RegExp, string][] = [
  [/^\/console\/samples/, "/console/maker/samples"], [/^\/console\/production/, "/console/maker/orders"], [/^\/console\/quality/, "/console/maker/quality"],
  [/^\/console\/shipments/, "/console/maker/dispatch"], [/^\/console\/enquiries/, "/console/maker/enquiries"], [/^\/console\/payments/, "/console/maker/payments"],
];

function updates(s: ConsoleState, portal: Portal): Notice[] {
  if (portal === "brand") {
    // What factories, suppliers and distributors did on the brand's records.
    return s.activity.filter((a) => a.who !== s.user.name && recent(a.at)).map((a) => ({ id: `upd:${a.id}`, kind: "update", cat: CAT_OF_TAG[a.tag] ?? "Production", at: a.at, title: a.text, sub: a.who, href: a.href }));
  }
  if (portal === "maker") {
    // The brand's actions on this factory's records only.
    const m = mine(s);
    const ids = new Set([...m.enquiries, ...m.samples, ...m.orders, ...m.quality, ...m.shipments].map((x) => x.id).concat(m.plans.map((p) => p.orderId)));
    return s.activity.filter((a) => a.who === s.user.name && recent(a.at)).flatMap((a) => {
      const id = new URL(a.href, "http://x").searchParams.get("id");
      const path = MAKER_PATH.find(([re]) => re.test(a.href));
      if (!id || !ids.has(id) || !path) return [];
      return [{ id: `upd:${a.id}`, kind: "update" as const, cat: CAT_OF_TAG[a.tag] ?? "Production", at: a.at, title: a.text, sub: s.workspace, href: `${path[1]}?id=${id}` }];
    });
  }
  if (portal === "supplier") {
    // Factory moves on this supplier's purchase orders (confirmations, receipts, payments).
    return s.purchaseOrders.filter((p) => p.supplierId === s.supplierId).flatMap((p) => p.events.filter((e) => recent(e.at) && /confirm|receiv|paid/i.test(e.text) && !/reminder/i.test(e.text)).map((e, i) => ({
      id: `upd:${p.id}:${i}:${e.at}`, kind: "update" as const, cat: (/paid/i.test(e.text) ? "Payments" : "Materials") as Category, at: e.at, title: `${p.id}: ${e.text}`, sub: s.manufacturers.find((m) => m.id === p.mfrId)?.name ?? "", href: `/console/supplier/pos?id=${p.id}`,
    })));
  }
  // Distributor: movement on shipments headed to it.
  return s.shipments.filter((x) => toDistributor(s, x)).flatMap((x) => x.events.filter((e) => recent(e.at)).map((e, i) => ({
    id: `upd:${x.id}:${i}:${e.at}`, kind: "update" as const, cat: "Shipments" as Category, at: e.at, title: `${x.id}: ${e.text}`, sub: x.carrier, href: `/console/distributor/inbound?id=${x.id}`,
  })));
}

/** Everything for one portal (actions first, then updates newest first), minus switched-off categories unless `all`. */
export function notices(s: ConsoleState, portal: Portal, all = false): Notice[] {
  const off = new Set(all ? [] : s.notifyOff?.[portal] ?? []);
  const acts = attention(s, portal).map(fromStep);
  const ups = updates(s, portal).sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  return [...acts, ...ups].filter((n) => !off.has(n.cat));
}

export const unreadCount = (s: ConsoleState, list: Notice[]) => list.filter((n) => !s.readNotifications.includes(n.id)).length;
