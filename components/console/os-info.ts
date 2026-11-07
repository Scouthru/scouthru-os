import { Factory, PackageOpen, Store, Warehouse } from "lucide-react";
import type { Portal } from "@/lib/console/types";
import type { Plan } from "@/lib/console/account";

/** The four account types and what each gets in Scouthru OS. Shown when joining and on /about. */
export const PORTALS: [name: string, blurb: string, href: string, cta: string, icon: typeof Store, portal: Portal][] = [
  ["Product owners", "Get results, not runarounds: compare quotes, approve samples, track every batch and pay only when each milestone is proven.", "/console", "Open product owner console", Store, "brand"],
  ["Manufacturers", "Deliver results and get paid on proof: quote enquiries from any source, plan capacity and run batches.", "/console/maker", "Open factory portal", Factory, "maker"],
  ["Suppliers", "Answer price requests for packaging and ingredients, ship orders and keep stock and prices current.", "/console/supplier", "Open supplier portal", PackageOpen, "supplier"],
  ["Distributors", "Count inbound stock, run retailer orders and routes, and collect payments.", "/console/distributor", "Open distributor portal", Warehouse, "distributor"],
];

export const PLANS: [name: Plan, price: string, blurb: string, highlight: boolean][] = [
  ["Free", "₹0", "Post requirements, search the marketplace and compare quotes on a limited number of enquiries each month.", false],
  ["Pro", "", "Run every result yourself with the full Scouthru OS: unlimited enquiries, large-lot leads, orders and payments released on proof.", true],
  ["Done for you", "Included in order price", "Results as a Service: Scouthru delivers the finished, checked product end to end. One price per order, paid by milestone on proof.", false],
];
