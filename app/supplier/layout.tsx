"use client";

import { Boxes, FileInput, Home, Inbox, ReceiptIndianRupee, ShoppingBag, Truck, Users } from "lucide-react";
import { DeskShell } from "@/components/desk";
import { useStore } from "@/lib/store";

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  const { s } = useStore();
  return (
    <DeskShell
      company="Sri Venkateswara Traders"
      role="Supplier · Packaging & raw material"
      person="SV"
      cta={{ title: "Stock running low?", text: "Keep stock and prices current so factories see you as available.", label: "Update stock", href: "/supplier/stock" }}
      groups={[
        { items: [{ href: "/supplier", label: "Home", icon: Home }] },
        {
          heading: "Leads",
          items: [
            { href: "/supplier/channels", label: "All channels", icon: Inbox, count: s.leads.filter((l) => !l.dismissed).length },
            { href: "/supplier/requests", label: "Requests", icon: FileInput, count: s.rfqs.filter((r) => r.status === "new").length },
          ],
        },
        {
          heading: "Fulfilment",
          items: [
            { href: "/supplier/pos", label: "Purchase orders", icon: ShoppingBag, count: s.pos.filter((p) => p.stage !== "Paid").length },
            { href: "/supplier/dispatch", label: "Dispatch", icon: Truck, count: s.pos.filter((p) => p.stage === "Packed" || p.stage === "PO confirmed").length },
            { href: "/supplier/stock", label: "Stock & prices", icon: Boxes },
          ],
        },
        {
          heading: "Money",
          items: [
            { href: "/supplier/payments", label: "Payments", icon: ReceiptIndianRupee },
            { href: "/supplier/buyers", label: "Buyers", icon: Users },
          ],
        },
      ]}
    >
      {children}
    </DeskShell>
  );
}
