"use client";

import { FileText } from "lucide-react";
import { DeskHeader, Panel } from "@/components/desk";
import { useStore } from "@/lib/store";

export default function Documents() {
  const { s, toast } = useStore();
  const mine = s.orders.filter((o) => o.brandId === "ruchika" && o.stage !== "enquiry");
  return (
    <>
      <DeskHeader title="Documents" sub="Agreements, golden sample records, licences and invoices for every order." />
      <div className="grid gap-5 md:grid-cols-2">
        {mine.slice(0, 10).map((o) => (
          <Panel key={o.id} title={`${o.id} · ${o.product}`}>
            <ul className="divide-y divide-line text-[14px]">
              {o.docs.map((d) => (
                <li key={d.name} className="flex items-center justify-between py-2">
                  <button onClick={() => toast(`${d.name} opened (demo file)`)} className="flex items-center gap-2 text-left text-ink hover:text-flame"><FileText className="size-4" />{d.name}</button>
                  <span className="text-[12px] text-ink-2">{d.meta}</span>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </>
  );
}
