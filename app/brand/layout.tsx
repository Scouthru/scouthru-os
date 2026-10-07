"use client";

import { ClipboardCheck, FileText, Factory, Home, PackageCheck, Plus, ReceiptIndianRupee, ShoppingBag, Truck } from "lucide-react";
import { DeskShell } from "@/components/desk";
import { useStore } from "@/lib/store";

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  const { s } = useStore();
  const mine = s.orders.filter((o) => o.brandId === "ruchika");
  const active = mine.filter((o) => o.stage !== "closed");
  return (
    <DeskShell
      company="Ruchika Foods Pvt Ltd"
      role="Brand owner · Ops"
      person="RF"
      search={{ placeholder: "Search orders, factories, SKUs", to: "/brand/orders?q=" }}
      cta={{ title: "Need something made?", text: "Describe it once. Verified factories quote, frozen for 15 days.", label: "New order", href: "/brand/new" }}
      groups={[
        { items: [{ href: "/brand", label: "Home", icon: Home }] },
        {
          heading: "Orders",
          items: [
            { href: "/brand/orders", label: "Orders", icon: ShoppingBag, count: active.length },
            { href: "/brand/new", label: "New order", icon: Plus },
            { href: "/brand/qc", label: "QC", icon: ClipboardCheck, count: mine.filter((o) => o.stage === "qc" && !o.qc?.decision).length },
            { href: "/brand/shipments", label: "Shipments", icon: Truck, count: mine.filter((o) => o.stage === "dispatch").length },
            { href: "/brand/deliveries", label: "Deliveries", icon: PackageCheck, count: mine.filter((o) => o.stage === "delivered").length },
          ],
        },
        {
          heading: "Money & records",
          items: [
            { href: "/brand/payments", label: "Payments", icon: ReceiptIndianRupee, count: mine.flatMap((o) => o.payments).filter((p) => p.status === "due").length },
            { href: "/brand/suppliers", label: "Suppliers", icon: Factory },
            { href: "/brand/documents", label: "Documents", icon: FileText },
          ],
        },
      ]}
    >
      {children}
    </DeskShell>
  );
}
