"use client";

import Link from "next/link";
import { useState } from "react";
import { Ageing, DeskHeader, Panel } from "@/components/desk";
import { Btn, Modal, Pill, StageTrack, Stat } from "@/components/ui";
import { PO_STEPS, poTrack } from "@/lib/ops";
import { POLink, RequestList } from "@/components/supplier";
import { lakh, todayLabel, useStore } from "@/lib/store";

export default function SupplierDesk() {
  const { s, toast } = useStore();
  const [offer, setOffer] = useState(false);
  const open = s.pos.filter((p) => p.stage !== "Paid");
  const today = s.pos.filter((p) => p.dispatchBy === "Today" && p.stage === "Packed");
  const newReq = s.rfqs.filter((r) => r.status === "new");
  const collect = s.pos.filter((p) => !["Paid"].includes(p.stage)).reduce((a, p) => a + p.invoice, 0) + 210000;
  const overdue = s.pos.filter((p) => p.stage === "Overdue pay").reduce((a, p) => a + p.invoice, 0);

  return (
    <>
      <DeskHeader kicker={todayLabel()} title="Supplier desk" actions={<><Btn href="/supplier/stock">Update stock</Btn><Btn variant="flame" href="/supplier/dispatch">Dispatch today ({today.length})</Btn></>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open POs" value={open.length} sub={`${today.length} to dispatch today`} />
        <Stat label="New requests" value={newReq.length} tone={newReq.length ? "bad" : undefined} sub="Reply within 24 hours to stay ranked" />
        <Stat label="To collect" value={lakh(collect)} sub={`${lakh(overdue)} overdue`} />
        <Stat label="On-time dispatch" value="92%" tone="ok" sub="Shown to buyers" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="New requests from factories" right="All sources in one list · reply within 24h to stay ranked">
          <RequestList rows={s.rfqs} />
        </Panel>
        <div className="flex flex-col gap-5">
          <Panel title="Money to collect">
            <Ageing rows={[
              { label: "Not due", value: 180000, max: 200000, tone: "bg-ok" },
              { label: "1–15 days", value: 92000, max: 200000, tone: "bg-apricot" },
              { label: "16–30 days", value: 41000, max: 200000, tone: "bg-flame" },
              { label: "30+ days", value: 18000, max: 200000, tone: "bg-bad" },
            ]} />
            <Btn className="mt-4 w-full" onClick={() => setOffer(true)}>Get paid early (invoice discounting)</Btn>
          </Panel>
          <Panel title="Low stock vs booked demand">
            <ul className="divide-y divide-line text-[14px]">
              <li className="flex items-center justify-between py-2"><span>500ml glass jar</span><Pill tone="bad">Short 4,200</Pill></li>
              <li className="flex items-center justify-between py-2"><span>Cold-pressed groundnut oil</span><Pill tone="warn">9 days cover</Pill></li>
            </ul>
            <Link href="/supplier/stock" className="mt-2 inline-block text-[13px] font-semibold underline">View stock →</Link>
          </Panel>
        </div>
      </div>

      <Panel className="mt-5" pad={false} title="Open purchase orders" right={<Link href="/supplier/pos" className="text-[13px] font-semibold hover:underline">All POs →</Link>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr><th className="th pl-6">PO</th><th className="th">Factory</th><th className="th">For brand order</th><th className="th">Stage</th><th className="th">Dispatch by</th><th className="th pr-6">Payment</th></tr></thead>
            <tbody>
              {s.pos.map((p) => (
                <tr key={p.id} className="hover:bg-soft/50">
                  <td className="td pl-6"><POLink p={p} /><p className="text-[12px] text-ink-2">{p.title}</p></td>
                  <td className="td">{p.factory} · {p.city}</td>
                  <td className="td">Brand order {p.brandOrder}</td>
                  <td className="td"><StageTrack steps={PO_STEPS} {...poTrack(p)} /></td>
                  <td className="td num font-medium">{p.dispatchBy}</td>
                  <td className="td pr-6">{p.payment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Modal open={offer} onClose={() => setOffer(false)} title="Get paid early">
        <div className="flex flex-col gap-3 text-[14px]">
          <p>Udyam Working Capital can advance <b>85%</b> of your Scouthru-verified invoices 2 days after GRN.</p>
          <div className="rounded-[10px] bg-soft p-3"><div className="flex justify-between"><span>Eligible invoices</span><b className="num">{lakh(collect - overdue)}</b></div><div className="mt-1 flex justify-between"><span>You get now (85%)</span><b className="num">{lakh((collect - overdue) * 0.85)}</b></div><div className="mt-1 flex justify-between text-ink-2"><span>Fee</span><span>1.2% per month</span></div></div>
          <Btn variant="pine" onClick={() => { toast("Request sent to the credit partner. Funds in 2 working days after approval."); setOffer(false); }}>Request early payment</Btn>
        </div>
      </Modal>
    </>
  );
}
