"use client";

import { Gauge, Inbox, Network, ReceiptIndianRupee, Settings, ShoppingBag, Store } from "lucide-react";
import { DeskShell } from "@/components/desk";
import { useStore } from "@/lib/store";
import { FACTORY_ID } from "@/lib/ops";

export default function FactoryLayout({ children }: { children: React.ReactNode }) {
  const { s } = useStore();
  const open = s.enquiries.filter((e) => e.status === "new").length;
  const orders = s.orders.filter((o) => o.factoryId === FACTORY_ID && o.stage !== "closed").length;
  return (
    <DeskShell
      company="Nutrabite Foods"
      role="Manufacturer · Unit HYD-0142"
      person="NF"
      cta={{ title: "Got an enquiry elsewhere?", text: "IndiaMART, WhatsApp or a call: bring it in and check it against your capacity.", label: "Import enquiry", href: "/factory?import=1" }}
      groups={[
        {
          heading: "Work",
          items: [
            { href: "/factory", label: "Enquiries", icon: Inbox, count: open },
            { href: "/factory/orders", label: "Orders", icon: ShoppingBag, count: orders },
            { href: "/factory/capacity", label: "Capacity", icon: Gauge },
            { href: "/factory/partners", label: "Partner units", icon: Network },
            { href: "/factory/payments", label: "Payments", icon: ReceiptIndianRupee },
          ],
        },
        {
          heading: "Account",
          items: [
            { href: "/marketplace", label: "Marketplace", icon: Store },
            { href: "/factory/settings", label: "Settings", icon: Settings },
          ],
        },
      ]}
    >
      {children}
    </DeskShell>
  );
}
