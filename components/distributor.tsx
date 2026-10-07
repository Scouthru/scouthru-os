"use client";

import { Panel, Ageing } from "@/components/desk";
import { Bar, Btn, Pill } from "@/components/ui";
import type { RetailerOrder } from "@/lib/types";
import { inr, lakh, useStore } from "@/lib/store";

export const RO_TONE: Record<RetailerOrder["status"], "info" | "warn" | "neutral" | "bad" | "ok"> = {
  Picked: "info", "Short 2 SKUs": "warn", New: "neutral", "Credit hold": "bad", Delivered: "ok", Picking: "info", Paid: "ok",
};

export function RoutesRow() {
  const { s, update, toast } = useStore();
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {s.routes.map((r) => (
        <Panel key={r.name} title={r.name} right={<Pill tone={r.status === "Out" ? "info" : r.status === "Loading" ? "warn" : "ok"}>{r.status}</Pill>}>
          <p className="-mt-2 text-[13px] text-ink-2">{r.area} · {r.driver}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
            {[["Stops", String(r.stops)], ["Value", lakh(r.value)], ["Collect", lakh(r.collect)]].map(([k, v]) => <div key={k}><p className="cap">{k}</p><p className="num mt-0.5 text-[18px]">{v}</p></div>)}
          </div>
          <Bar value={(r.delivered / r.stops) * 100} className="mt-3" />
          <p className="mt-1.5 text-[12px] text-ink-2">{r.status === "Loading" ? r.note : `${r.delivered} of ${r.stops} delivered · ${lakh(r.collected)} collected`}</p>
          {r.status !== "Done" && (
            <Btn size="sm" className="mt-3" onClick={() => {
              update((d) => {
                const x = d.routes.find((y) => y.name === r.name)!;
                if (x.status === "Loading") { x.status = "Out"; x.note = ""; }
                else { x.delivered = Math.min(x.stops, x.delivered + 1); x.collected = Math.min(x.collect, x.collected + Math.round(x.collect / x.stops)); if (x.delivered === x.stops) { x.status = "Done"; x.collected = x.collect; } }
              });
              toast(r.status === "Loading" ? `${r.name} left the warehouse` : "Stop delivered, payment logged");
            }}>{r.status === "Loading" ? "Mark van out" : "Log next stop"}</Btn>
          )}
        </Panel>
      ))}
    </div>
  );
}

export function CollectionsCard({ title = "Collections" }: { title?: string }) {
  const { s, update, toast } = useStore();
  const total = s.routes.reduce((a, r) => a + r.collect - r.collected, 0);
  const unsent = s.overdueRetailers.filter((r) => !r.sent).length;
  return (
    <Panel title={title}>
      <p className="num text-[28px]">{lakh(total)}</p>
      <p className="text-[13px] text-ink-2">to collect on today&apos;s routes</p>
      <div className="mt-4"><Ageing rows={[{ label: "Not due", value: 240000, max: 260000, tone: "bg-ok" }, { label: "1–15 days", value: 112000, max: 260000, tone: "bg-apricot" }, { label: "16–30 days", value: 54000, max: 260000, tone: "bg-flame" }, { label: "30+ days", value: 38400, max: 260000, tone: "bg-bad" }]} /></div>
      <Btn className="mt-4 w-full" disabled={!unsent} onClick={() => { update((d) => d.overdueRetailers.forEach((r) => (r.sent = true))); toast(`Payment reminders sent to ${unsent} retailer${unsent === 1 ? "" : "s"} on WhatsApp`); }}>{unsent ? "Send payment reminders" : "Reminders sent"}</Btn>
    </Panel>
  );
}

export function OverdueRetailers() {
  const { s, update, toast } = useStore();
  return (
    <Panel title="Overdue retailers" pad={false}>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[440px]">
        <thead><tr><th className="th pl-6">Retailer</th><th className="th">Overdue</th><th className="th">Days</th><th className="th pr-6" /></tr></thead>
        <tbody>
          {s.overdueRetailers.map((r) => (
            <tr key={r.name}>
              <td className="td pl-6 font-semibold">{r.name}</td>
              <td className="td num">{inr(r.amount)}</td>
              <td className="td"><Pill tone={r.days > 30 ? "bad" : "warn"}>{r.days} days</Pill></td>
              <td className="td pr-6 text-right">{r.sent ? <Pill tone="ok">Link sent</Pill> : <Btn size="sm" onClick={() => { update((d) => { d.overdueRetailers.find((x) => x.name === r.name)!.sent = true; }); toast(`UPI link for ${inr(r.amount)} sent to ${r.name}`); }}>Send UPI link</Btn>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Panel>
  );
}

export function SchemeClaims() {
  const { s } = useStore();
  return (
    <Panel title="Scheme claims to brands" right="Built from what you passed on to retailers">
      <ul className="divide-y divide-line">
        {s.claims.map((c) => (
          <li key={c.brand + c.what} className="flex items-center justify-between gap-3 py-2.5">
            <span><b className="block text-[14px]">{c.brand}</b><span className="text-[12px] text-ink-2">{c.what}</span></span>
            <span className="flex items-center gap-2"><span className="num text-[14px]">{inr(c.amount)}</span><Pill tone={c.status === "Approved" ? "ok" : c.status === "Submitted" ? "info" : "warn"}>{c.status}</Pill></span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
