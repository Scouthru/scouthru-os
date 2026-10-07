"use client";

import { DeskHeader, Panel } from "@/components/desk";
import { Pill } from "@/components/ui";
import { lakh, useStore } from "@/lib/store";

export default function Buyers() {
  const { s } = useStore();
  const by = Object.values(s.pos.reduce<Record<string, { name: string; city: string; pos: number; value: number; overdue: boolean }>>((a, p) => {
    const x = (a[p.factory] ??= { name: p.factory, city: p.city, pos: 0, value: 0, overdue: false });
    x.pos += 1; x.value += p.invoice; if (p.stage === "Overdue pay") x.overdue = true;
    return a;
  }, {}));
  return (
    <>
      <DeskHeader title="Buyers" sub="Factories you supply, how often they order and how they pay." />
      <Panel pad={false}>
        <table className="w-full">
          <thead><tr><th className="th pl-6">Factory</th><th className="th">POs</th><th className="th">Value</th><th className="th pr-6">Payment record</th></tr></thead>
          <tbody>
            {by.map((b) => (
              <tr key={b.name}><td className="td pl-6"><b>{b.name}</b><p className="text-[12px] text-ink-2">{b.city}</p></td><td className="td num">{b.pos}</td><td className="td num">{lakh(b.value)}</td><td className="td pr-6">{b.overdue ? <Pill tone="bad">1 overdue</Pill> : <Pill tone="ok">Good payer</Pill>}</td></tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
