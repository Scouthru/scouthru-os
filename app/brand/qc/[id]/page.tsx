"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Field, Modal, Pill } from "@/components/ui";
import { ShipmentCard } from "@/components/shipment";
import { fmt, useStore } from "@/lib/store";
import { approveDispatch, requestRework } from "@/lib/ops";

export default function QCPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { s, update, toast, ready } = useStore();
  const [rework, setRework] = useState(false);
  const o = s.orders.find((x) => x.id === id);
  if (!o || !o.qc) {
    if (!ready) return <p className="p-6 text-[14px] text-ink-2">Loading…</p>;
    notFound();
  }
  const qc = o.qc;
  const other = s.orders.find((x) => x.stage === "dispatch" && x.shipment && x.id !== o.id);

  return (
    <>
      <DeskHeader
        back={{ href: "/brand/orders", label: "Orders" }}
        title={`${o.id} · QC & dispatch`}
        badge={qc.decision ? <Pill tone={qc.decision === "approved" ? "ok" : "warn"}>{qc.decision === "approved" ? "Dispatch approved" : "Rework requested"}</Pill> : <Pill tone="warn">Your approval needed</Pill>}
        sub={`${o.product} · ${fmt(o.qty)} ${o.uom} · ${o.factory}, ${o.factoryCity}`}
      />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="QC report" right={`Inspected ${qc.date} by ${qc.by} · ${qc.sample}`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-[10px] bg-ok-bg p-3 text-ok"><p className="cap text-ok">Result</p><p className="disp mt-1 text-[24px]">{qc.result}</p></div>
            {[["Defects", `${qc.defects}%`, `limit ${qc.limit}%`], ["Fill weight", qc.fill, "spec 300 ±5"], ["Count", qc.count, "as ordered"]].map(([k, v, h]) => (
              <div key={k} className="rounded-[10px] bg-soft p-3"><p className="cap">{k}</p><p className="num mt-1 text-[21px]">{v}</p><p className="text-[12px] text-ink-2">{h}</p></div>
            ))}
          </div>
          <p className="mt-4 text-[14px] font-semibold">Batch vs golden sample</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="relative h-32 overflow-hidden rounded-[10px] bg-soft"><img src="/products/made-gongura.jpg" alt="Golden sample" className="size-full object-cover" /><span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] text-white">Golden sample · approved</span></div>
            <div className="relative h-32 overflow-hidden rounded-[10px] bg-soft"><img src="/proofs/batch-pickle.jpg" alt="Batch photo" className="size-full object-cover" /><span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] text-white">Batch photo · {qc.date}</span></div>
          </div>
          <ul className="mt-3 divide-y divide-line text-[14px]">
            {qc.checks.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-3 py-2"><span>{c.label}</span><span className="flex items-center gap-3"><span className="text-ink-2">{c.detail}</span><Pill tone={c.result === "Pass" ? "ok" : c.result === "Minor" ? "warn" : "bad"}>{c.result}</Pill></span></li>
            ))}
          </ul>
          {!qc.decision && (
            <div className="mt-5 flex gap-2">
              <Btn variant="pine" onClick={() => { update((d) => approveDispatch(d, o.id)); toast("Dispatch approved. Pickup booked; Phase 2 payment now due."); }}>Approve dispatch</Btn>
              <Btn onClick={() => setRework(true)}>Request rework</Btn>
            </div>
          )}
        </Panel>
        <div className="flex flex-col gap-5">
          {o.shipment ? <ShipmentCard o={o} /> : other ? <ShipmentCard o={other} /> : null}
        </div>
      </div>
      <Modal open={rework} onClose={() => setRework(false)} title="Request rework">
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); update((d) => requestRework(d, o.id, String(new FormData(e.currentTarget).get("what")))); toast("Rework requested. Re-inspection is booked after it."); setRework(false); }}>
          <Field label="What needs rework"><input name="what" className="input" defaultValue="Re-sleeve the 4 off-centre jars and re-check sleeve alignment" required /></Field>
          <Btn variant="flame" type="submit">Send to factory</Btn>
        </form>
      </Modal>
    </>
  );
}
