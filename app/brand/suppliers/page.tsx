"use client";

import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Pill } from "@/components/ui";
import { lakh, useStore } from "@/lib/store";
import { orderValue } from "@/lib/ops";

export default function Suppliers() {
  const { s } = useStore();
  const mine = s.orders.filter((o) => o.brandId === "ruchika" && o.factoryId !== "—");
  const byFactory = Object.values(
    mine.reduce<Record<string, { name: string; city: string; orders: number; value: number; late: number }>>((acc, o) => {
      const a = (acc[o.factory] ??= { name: o.factory, city: o.factoryCity, orders: 0, value: 0, late: 0 });
      a.orders += 1; a.value += orderValue(o); if (o.health === "Delayed 3d") a.late += 1;
      return acc;
    }, {}),
  );
  return (
    <>
      <DeskHeader title="Suppliers" sub="Factories you make with, and how each is performing." actions={<Btn variant="flame" href="/manufacturers">Find a new factory</Btn>} />
      <Panel pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead><tr><th className="th pl-6">Factory</th><th className="th">Orders</th><th className="th">Order value</th><th className="th">Licences</th><th className="th pr-6">Record</th></tr></thead>
            <tbody>
              {byFactory.map((f) => (
                <tr key={f.name}>
                  <td className="td pl-6"><b>{f.name}</b><p className="text-[12px] text-ink-2">{f.city}</p></td>
                  <td className="td num">{f.orders}</td>
                  <td className="td num">{lakh(f.value)}</td>
                  <td className="td"><Pill tone="ok">FSSAI · valid</Pill></td>
                  <td className="td pr-6">{f.late ? <Pill tone="bad">{f.late} delayed</Pill> : <Pill tone="ok">On time</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
