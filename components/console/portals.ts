import type { LucideIcon } from "lucide-react";
import {
  BadgeIndianRupee, Boxes, Building2, ClipboardList, Factory, FileBarChart2, FlaskConical, Gauge, Home, Inbox, Megaphone, PackageCheck, PackageOpen,
  Route, ShieldCheck, ShoppingCart, Store, Truck, Users, Wallet, Warehouse,
} from "lucide-react";
import type { ConsoleState, Portal } from "@/lib/console/types";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Which portal a path belongs to. Everything not under a portal prefix is the brand console. */
export function portalOf(path: string): Portal {
  if (path.startsWith("/console/maker")) return "maker";
  if (path.startsWith("/console/supplier")) return "supplier";
  if (path.startsWith("/console/distributor")) return "distributor";
  return "brand";
}

export const PORTAL_HOME: Record<Portal, string> = { brand: "/console", maker: "/console/maker", supplier: "/console/supplier", distributor: "/console/distributor" };
export const PORTAL_LABEL: Record<Portal, string> = { brand: "Brand", maker: "Manufacturer", supplier: "Supplier", distributor: "Distributor" };
export const PORTAL_ICON: Record<Portal, LucideIcon> = { brand: Store, maker: Factory, supplier: PackageOpen, distributor: Warehouse };

export const NAVS: Record<Portal, NavItem[]> = {
  brand: [
    { href: "/console", label: "Dashboard", icon: Home },
    { href: "/console/enquiries", label: "Enquiries", icon: ClipboardList },
    { href: "/console/manufacturers", label: "Manufacturers", icon: Building2 },
    { href: "/console/samples", label: "Samples", icon: FlaskConical },
    { href: "/console/production", label: "Production", icon: Boxes },
    { href: "/console/quality", label: "Quality", icon: ShieldCheck },
    { href: "/console/shipments", label: "Shipments", icon: Truck },
    { href: "/console/payments", label: "Payments", icon: Wallet },
    { href: "/console/products", label: "Products", icon: PackageCheck },
    { href: "/console/reports", label: "Reports", icon: FileBarChart2 },
  ],
  maker: [
    { href: "/console/maker", label: "Dashboard", icon: Home },
    { href: "/console/maker/enquiries", label: "Enquiries", icon: Inbox },
    { href: "/console/maker/samples", label: "Samples", icon: FlaskConical },
    { href: "/console/maker/orders", label: "Production", icon: Boxes },
    { href: "/console/maker/quality", label: "Quality", icon: ShieldCheck },
    { href: "/console/maker/dispatch", label: "Dispatch", icon: Truck },
    { href: "/console/maker/capacity", label: "Capacity", icon: Gauge },
    { href: "/console/maker/materials", label: "Materials", icon: PackageOpen },
    { href: "/console/maker/payments", label: "Payments", icon: Wallet },
  ],
  supplier: [
    { href: "/console/supplier", label: "Dashboard", icon: Home },
    { href: "/console/supplier/requests", label: "Requests", icon: Inbox },
    { href: "/console/supplier/pos", label: "Purchase Orders", icon: ClipboardList },
    { href: "/console/supplier/dispatch", label: "Dispatch", icon: Truck },
    { href: "/console/supplier/stock", label: "Stock & Prices", icon: Warehouse },
    { href: "/console/supplier/payments", label: "Payments", icon: Wallet },
    { href: "/console/supplier/buyers", label: "Buyers", icon: Users },
  ],
  distributor: [
    { href: "/console/distributor", label: "Dashboard", icon: Home },
    { href: "/console/distributor/inbound", label: "Inbound", icon: PackageOpen },
    { href: "/console/distributor/stock", label: "Stock", icon: Warehouse },
    { href: "/console/distributor/orders", label: "Retailer Orders", icon: ShoppingCart },
    { href: "/console/distributor/routes", label: "Routes", icon: Route },
    { href: "/console/distributor/collections", label: "Collections", icon: BadgeIndianRupee },
    { href: "/console/distributor/schemes", label: "Schemes", icon: Megaphone },
  ],
};

/** Bottom-left promo card per portal section. Brand sections keep their mockup copy (see shell.tsx). */
export const PORTAL_PROMO: Record<Exclude<Portal, "brand">, { title: string; text: string; img: string; href: string }> = {
  maker: { title: "Better manufacturing partners. Stronger brands.", text: "Every enquiry, batch and payment in one place.", img: "/console/promo-production.jpg", href: "/console/maker/enquiries" },
  supplier: { title: "Stock running low?", text: "Keep stock and prices current so factories see you as available.", img: "/console/promo-products.jpg", href: "/console/supplier/stock" },
  distributor: { title: "Shipment at the dock?", text: "Count it against the invoice; claims fill themselves from the count.", img: "/console/promo-shipments.jpg", href: "/console/distributor/inbound" },
};

/** Name shown on the workspace button for each portal. */
export function orgName(s: ConsoleState, p: Portal) {
  if (p === "maker") return s.manufacturers.find((m) => m.id === s.makerId)?.name ?? "Manufacturer";
  if (p === "supplier") return s.suppliers.find((x) => x.id === s.supplierId)?.name ?? "Supplier";
  if (p === "distributor") return s.distributor.name;
  return s.workspace;
}
