import { Factory, PackageOpen, Store, Warehouse } from "lucide-react";
import type { Portal } from "@/lib/console/types";
import type { Plan } from "@/lib/console/account";

/** The four account types and what each gets in Scouthru OS. Shown when joining and on /about. */
export const PORTALS: [name: string, blurb: string, href: string, cta: string, icon: typeof Store, portal: Portal][] = [
  ["Product owners", "Post enquiries, compare quotes, approve samples, track every batch and pay by milestone.", "/console", "Open product owner console", Store, "brand"],
  ["Manufacturers", "Quote enquiries from any source, plan capacity, run batches and get paid on proof.", "/console/maker", "Open factory portal", Factory, "maker"],
  ["Suppliers", "Answer price requests for packaging and ingredients, ship orders and keep stock and prices current.", "/console/supplier", "Open supplier portal", PackageOpen, "supplier"],
  ["Distributors", "Count inbound stock, run retailer orders and routes, and collect payments.", "/console/distributor", "Open distributor portal", Warehouse, "distributor"],
];

export const PLANS: [name: Plan, price: string, blurb: string, highlight: boolean][] = [
  ["Free", "₹0", "Post requirements, search the marketplace, and work on a limited number of enquiries each month.", false],
  ["Pro", "₹4,999 / month", "Unlimited enquiries, large-lot leads, and the full Scouthru OS: enquiries, capacity, orders and payments.", true],
  ["Done for you", "Included in order price", "Scouthru runs your order end to end. No separate fee, one price per order.", false],
];
