"use client";

import { Boxes, Home, Inbox, PackageOpen, ReceiptIndianRupee, Route, ShoppingBag, Tags } from "lucide-react";
import { DeskShell } from "@/components/desk";
import { useStore } from "@/lib/store";

export default function DistributorLayout({ children }: { children: React.ReactNode }) {
  const { s } = useStore();
  return (
    <DeskShell
      company="Hyderabad East Agencies"
      role="Distributor · Hyderabad East"
      person="HE"
      cta={{ title: "Shipment at the dock?", text: "Count it against the invoice; claims fill themselves from the count.", label: "Receive stock", href: "/distributor/inbound" }}
      groups={[
        { items: [{ href: "/distributor", label: "Home", icon: Home }] },
        {
          heading: "Orders",
          items: [
            { href: "/distributor/channels", label: "All channels", icon: Inbox, count: s.retailerOrders.length },
            { href: "/distributor/orders", label: "Retailer orders", icon: ShoppingBag, count: s.retailerOrders.filter((o) => !["Delivered", "Paid"].includes(o.status)).length },
            { href: "/distributor/routes", label: "Routes", icon: Route },
          ],
        },
        {
          heading: "Stock",
          items: [
            { href: "/distributor/inbound", label: "Inbound", icon: PackageOpen, count: s.inbound.filter((i) => i.status === "Receive" || i.status === "In transit").length },
            { href: "/distributor/stock", label: "Stock", icon: Boxes },
          ],
        },
        {
          heading: "Money",
          items: [
            { href: "/distributor/collections", label: "Collections", icon: ReceiptIndianRupee },
            { href: "/distributor/schemes", label: "Brands & schemes", icon: Tags },
          ],
        },
      ]}
    >
      {children}
    </DeskShell>
  );
}
