import type { ConsoleState, StockItem } from "./types";
import { log, sendMessage } from "./actions";
import { updateStock } from "./actions-network";

/** Supplier-only actions: price list edits, goods received, payment reminders. */

function supplierWho(d: ConsoleState) {
  const p = d.people.supplier;
  return { who: p.name, img: p.img };
}

/** Edit a SKU; a price change is logged with the note so buyers can see why. */
export function editStockItem(d: ConsoleState, sku: string, patch: Partial<Pick<StockItem, "price" | "moq" | "leadDays" | "onHand">>, note: string) {
  const st = d.supplierStock.find((x) => x.sku === sku);
  if (!st) return;
  const oldPrice = st.price;
  updateStock(d, sku, patch);
  if (patch.price !== undefined && patch.price !== oldPrice) {
    log(d, { ...supplierWho(d), text: `PackRight changed ${st.name} price ₹${oldPrice} → ₹${patch.price}${note ? ` (${note})` : ""}`, tag: "Manufacturer", href: `/console/supplier/stock?sku=${sku}` });
  }
}

/** Goods received into the supplier's warehouse. */
export function receiveStock(d: ConsoleState, sku: string, qty: number) {
  const st = d.supplierStock.find((x) => x.sku === sku);
  if (!st || qty <= 0) return;
  updateStock(d, sku, { onHand: st.onHand + qty });
}

/** Remind the factory about an unpaid invoice. */
export function remindInvoice(d: ConsoleState, poId: string) {
  const po = d.purchaseOrders.find((x) => x.id === poId);
  if (!po?.invoice || po.invoice.paidAt) return;
  const buyer = d.manufacturers.find((m) => m.id === po.mfrId)?.name ?? po.mfrId;
  const due = new Date(po.invoice.due).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  sendMessage(d, buyer, `Payment reminder: ${po.invoice.no}`, `Invoice ${po.invoice.no} for ₹${po.invoice.amount.toLocaleString("en-IN")} (${po.id}, ${po.title}) was due on ${due}. Please share the payment reference once paid.`, `/console/maker/materials?id=${po.id}`, "Payment");
  po.events.push({ at: new Date().toISOString(), text: `Payment reminder sent for ${po.invoice.no}` });
}
