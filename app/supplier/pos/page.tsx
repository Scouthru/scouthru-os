"use client";

import { DeskHeader, Panel } from "@/components/desk";
import { StageTrack } from "@/components/ui";
import { PO_STEPS, poTrack } from "@/lib/ops";
import { POLink } from "@/components/supplier";
import { inr, useStore } from "@/lib/store";

export default function POs() {
  const { s } = useStore();
  return (
    <>
      <DeskHeader title="Purchase orders" sub="Every PO linked to the brand order it feeds, from confirmation to payment." />
      <Panel pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr><th className="th pl-6">PO</th><th className="th">Factory</th><th className="th">Brand order</th><th className="th">Value</th><th className="th">Stage</th><th className="th">Dispatch by</th><th className="th pr-6">Payment</th></tr></thead>
            <tbody>
              {s.pos.map((p) => (
                <tr key={p.id}>
                  <td className="td pl-6"><POLink p={p} /><p className="text-[12px] text-ink-2">{p.title}</p></td>
                  <td className="td">{p.factory} · {p.city}</td>
                  <td className="td">{p.brandOrder}</td>
                  <td className="td num">{inr(p.invoice)}</td>
                  <td className="td"><StageTrack steps={PO_STEPS} {...poTrack(p)} /></td>
                  <td className="td num">{p.dispatchBy}</td>
                  <td className="td pr-6">{p.payment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
