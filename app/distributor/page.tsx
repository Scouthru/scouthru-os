"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Pill, StageTrack, Stat } from "@/components/ui";
import { INBOUND_STEPS, RETAIL_STEPS, inboundTrack, retailTrack } from "@/lib/ops";
import { CollectionsCard } from "@/components/distributor";
import { inr, lakh, todayLabel, useStore } from "@/lib/store";
import { dayLabel } from "@/lib/seed";

const ALERT_TONE = { Stockout: "bg-bad-bg text-bad", Expiry: "bg-warn-bg text-warn", Slow: "bg-soft text-ink-2", Scheme: "bg-info-bg text-info" } as const;

export default function DistributorDesk() {
  const { s, update, toast } = useStore();
  const router = useRouter();
  const orderValue = s.retailerOrders.reduce((a, o) => a + o.value, 0);
  const alerts = s.alerts.filter((a) => !a.done);

  return (
    <>
      <DeskHeader kicker={todayLabel()} title="Distribution desk" actions={<><Btn href="/distributor/inbound">Receive stock</Btn><Btn variant="flame" href="/distributor/routes">Plan today&apos;s routes</Btn></>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Stock value" value="₹38.6L" sub="6 brands · 84 SKUs" />
        <Stat label="Orders today" value={s.retailerOrders.length} sub={`${lakh(orderValue)} · ${s.routes.length} routes`} />
        <Stat label="To collect" value={<span className="text-bad">{lakh(444400)}</span>} sub={`${lakh(s.overdueRetailers.filter((r) => r.days > 30).reduce((a, r) => a + r.amount, 0))} over 30 days`} />
        <Stat label="Fill rate" value="94%" tone="ok" sub="Orders served in full" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Today's retailer orders" right={<Link href="/distributor/orders" className="text-[13px] font-semibold hover:underline">All orders →</Link>} pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px]">
              <thead><tr><th className="th pl-6">Retailer</th><th className="th">Lines</th><th className="th">Value</th><th className="th">Route</th><th className="th pr-6">Stage</th></tr></thead>
              <tbody>
                {s.retailerOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="td pl-6"><Link href={`/distributor/orders/${o.id}`} className="font-semibold text-ink hover:text-flame">{o.retailer}</Link><p className="text-[12px] text-ink-2">{o.area}</p></td>
                    <td className="td num">{o.lines}</td>
                    <td className="td num">{inr(o.value)}</td>
                    <td className="td whitespace-nowrap">{o.route}</td>
                    <td className="td pr-6"><StageTrack steps={RETAIL_STEPS} {...retailTrack(o)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <CollectionsCard />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Inbound from brands" right={<Link href="/distributor/inbound" className="text-[13px] font-semibold hover:underline">All inbound →</Link>}>
          <ul className="divide-y divide-line">
            {s.inbound.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 flex-1"><b className="block text-[14px]">{i.brand} · {i.item}</b><span className="text-[12px] text-ink-2">{i.meta}</span><span className="mt-2 block max-w-[260px]"><StageTrack steps={INBOUND_STEPS} {...inboundTrack(i)} /></span></span>
                {i.status === "Receive" && <Btn size="sm" variant="pine" onClick={() => router.push("/distributor/inbound")}>Receive</Btn>}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Stock alerts" right={<Pill tone="bad">{alerts.length}</Pill>}>
          <ul className="divide-y divide-line">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <span className={`w-[78px] shrink-0 rounded-full py-0.5 text-center text-[12px] font-medium ${ALERT_TONE[a.kind]}`}>{a.kind}</span>
                <span className="min-w-0 flex-1"><b className="block text-[14px]">{a.title}</b><span className="text-[12px] text-ink-2">{a.detail}</span></span>
                <Btn size="sm" onClick={() => {
                  update((d) => {
                    d.alerts.find((x) => x.id === a.id)!.done = true;
                    if (a.kind === "Scheme") d.retailerOrders.forEach((o) => { if (o.status !== "Delivered" && o.status !== "Paid") o.scheme = "Buy 10 get 1"; });
                  });
                  toast(a.kind === "Stockout" ? `Order for 2,000 jars sent to the brand · ETA ${dayLabel(3)}` : a.kind === "Scheme" ? "Scheme applied to today's open orders" : a.kind === "Expiry" ? "Planned: push via scheme this week, return the rest" : "Flagged for review with the brand");
                }}>{a.cta}</Btn>
              </li>
            ))}
            {alerts.length === 0 && <li className="py-2.5 text-[13px] text-ink-2">No stock alerts.</li>}
          </ul>
        </Panel>
      </div>
    </>
  );
}
