"use client";

import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Pill, Stat } from "@/components/ui";
import { useStore } from "@/lib/store";
import { dayLabel } from "@/lib/seed";

const SKUS = [
  { sku: "Mango pickle 500g", brand: "Ruchika Foods", onHand: 280, perDay: 140, batch: "MP-0911", expiry: "Mar 2027" },
  { sku: "Chilli powder 1kg", brand: "Ruchika Foods", onHand: 610, perDay: 45, batch: "CP-0902", expiry: "Aug 2027" },
  { sku: "Garam masala 100g", brand: "Spicewell", onHand: 2400, perDay: 120, batch: "GM-0918", expiry: "Sep 2027" },
  { sku: "Masala 50g", brand: "Spicewell", onHand: 320, perDay: 6, batch: "MS-0410", expiry: dayLabel(45), soon: true },
  { sku: "Turmeric 1kg", brand: "Indur Spices", onHand: 180, perDay: 0, batch: "TU-0801", expiry: "Feb 2027" },
  { sku: "Gongura pickle 300g", brand: "Amma Pickles", onHand: 948, perDay: 60, batch: "GP-1001", expiry: "Apr 2027" },
];

export default function DistStock() {
  const { toast } = useStore();
  return (
    <>
      <DeskHeader title="Stock" sub="One stock pool across every channel. Oldest batches go out first (FEFO)." actions={<Btn variant="flame" href="/distributor/inbound">Receive stock</Btn>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Stock value" value="₹38.6L" sub="6 brands · 84 SKUs" />
        <Stat label="Stockout risk" value={SKUS.filter((k) => k.perDay > 0 && k.onHand / k.perDay < 3).length} tone="bad" sub="under 3 days cover" />
        <Stat label="Near expiry" value={SKUS.filter((k) => "soon" in k).reduce((a, k) => a + k.onHand, 0)} sub="packs within 60 days" />
        <Stat label="Slow movers" value="₹42K" sub="no sale in 21 days" />
      </div>
      <Panel className="mt-5" pad={false} title="SKUs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr><th className="th pl-6">SKU</th><th className="th">Brand</th><th className="th">On hand</th><th className="th">Selling / day</th><th className="th">Cover</th><th className="th">Batch · expiry</th><th className="th pr-6" /></tr></thead>
            <tbody>
              {SKUS.map((x) => {
                const cover = x.perDay ? Math.floor(x.onHand / x.perDay) : null;
                return (
                  <tr key={x.sku}>
                    <td className="td pl-6 font-semibold">{x.sku}</td><td className="td">{x.brand}</td>
                    <td className="td num">{x.onHand.toLocaleString("en-IN")}</td><td className="td num">{x.perDay}</td>
                    <td className="td">{cover == null ? <Pill>No sale 21d</Pill> : <Pill tone={cover <= 3 ? "bad" : cover <= 10 ? "warn" : "ok"}>{cover} days</Pill>}</td>
                    <td className="td num">{x.batch} · {x.expiry}</td>
                    <td className="td pr-6 text-right">{cover != null && cover <= 3 && <Btn size="sm" variant="pine" onClick={() => toast(`Reorder for ${x.sku} sent to ${x.brand}`)}>Order from brand</Btn>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
