"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, Camera, CheckCircle2, ClipboardCheck, Factory, PackageCheck, PlayCircle, Send, ShieldCheck, Truck, Undo2 } from "lucide-react";
import { Btn, Empty, Field, Modal, Pill, RowMenu, StatStrip, Stepper, inputCls, textareaCls, type Tone } from "@/components/console/kit";
import { Lightbox, WideHero } from "@/components/console/making";
import { Meter, Page, Panel, Split, tdc, thc } from "@/components/console/maker";
import { useConsole } from "@/lib/console/store";
import { updateBatch } from "@/lib/console/actions";
import { acceptOrder, addEvidence, postFactoryUpdate } from "@/lib/console/actions-network";
import { addRisk, mine, setRiskResolved } from "@/lib/console/actions-maker";
import { ago, daysUntil, fmtDate, fmtDay, fmtNum } from "@/lib/console/format";
import type { Batch, Issue, Order } from "@/lib/console/types";
import { cn } from "@/lib/cn";

const BATCH_TONE: Record<Batch["status"], Tone> = { Completed: "green", "In Progress": "blue", Pending: "orange" };
const LEVEL_TONE: Record<Issue["level"], Tone> = { High: "red", Medium: "orange", Low: "gray" };
const PHOTOS = [
  { img: "/console/ev-1.jpg", label: "In-process testing" }, { img: "/console/ev-2.jpg", label: "Finished product sample" }, { img: "/console/ev-3.jpg", label: "Capsule appearance check" },
  { img: "/console/ev-4.jpg", label: "Microbial testing" }, { img: "/console/ev-5.jpg", label: "Packaging line" }, { img: "/console/upd-line.jpg", label: "Filling line" },
];

const made = (o: Order) => o.batches.reduce((a, b) => a + b.completed, 0);

export default function MakerOrdersPage() {
  return <Suspense><MakerOrders /></Suspense>;
}

function MakerOrders() {
  const { s } = useConsole();
  const params = useSearchParams();
  const orders = useMemo(() => mine(s).orders.slice().sort((a, b) => Number(a.batches.every((x) => x.status === "Completed")) - Number(b.batches.every((x) => x.status === "Completed")) || b.createdAt.localeCompare(a.createdAt)), [s]);
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => { const id = params.get("id"); if (id) setSel(id); }, [params]);
  const o = orders.find((x) => x.id === sel) ?? orders[0];

  const open = orders.filter((x) => x.batches.some((b) => b.status !== "Completed"));
  const planned = open.reduce((a, x) => a + x.qty, 0);
  const done = open.reduce((a, x) => a + made(x), 0);
  const risks = open.flatMap((x) => x.issues.filter((i) => !i.resolved));
  const onTime = open.filter((x) => { const last = x.batches[x.batches.length - 1]; return !last || new Date(last.end) <= new Date(x.targetDelivery); }).length;

  return (
    <div>
      <WideHero eyebrow="PLAN · MAKE · PROVE" title="Production" lede={<>Accept orders, run batches, and share photo proof at every stage.<br />Brands see each update the moment you post it.</>} img="/console/hero-production.jpg" photo={54} height={163} titleSize={42} ledeGap={8} quote={["Quality", "production.", "On time.", "Every time."]} quoteTop={25} quoteWidth={155} />
      <Page>
        <StatStrip items={[
          { icon: Boxes, tone: "green", value: open.filter((x) => x.confirmed).length, label: "Orders in Production", delta: `${open.filter((x) => !x.confirmed).length} waiting for you to accept`, deltaTone: open.some((x) => !x.confirmed) ? "bad" : "muted" },
          { icon: Factory, tone: "blue", value: fmtNum(done), label: "Units Made", delta: `of ${fmtNum(planned)} planned`, deltaTone: "muted" },
          { icon: PackageCheck, tone: "orange", value: open.flatMap((x) => x.batches).filter((b) => b.status === "In Progress").length, label: "Batches Running", delta: `${open.flatMap((x) => x.batches).filter((b) => b.status === "Pending").length} queued`, deltaTone: "muted" },
          { icon: AlertTriangle, tone: "red", value: risks.length, label: "Open Risks", delta: `${risks.filter((r) => r.level === "High").length} high`, deltaTone: risks.length ? "bad" : "muted" },
          { icon: CheckCircle2, tone: "green", value: open.length ? `${Math.round((onTime / open.length) * 100)}%` : "—", label: "On Schedule", delta: "Last batch before delivery date" },
        ]} />
        {o ? (
          <Split side="0.72fr" hero={163}>
            <OrderDetail o={o} />
            <Panel title="Your Orders" sub={`${orders.length} orders · ${open.length} open`} bodyClass="px-[10px] pb-[10px] pt-[8px]">
              <ul className="space-y-[7px]">
                {orders.map((x) => {
                  const pct = Math.round((made(x) / x.qty) * 100);
                  const closed = x.batches.every((b) => b.status === "Completed");
                  return (
                    <li key={x.id}>
                      <button type="button" onClick={() => setSel(x.id)} className={cn("flex w-full items-center gap-[10px] rounded-[8px] border px-[9px] py-[8px] text-left", x.id === o.id ? "border-cs-green bg-cs-mint/40" : "border-cs-line hover:border-[#cfcac0]")}>
                        <Image src={x.img} alt="" width={40} height={40} className="size-[40px] rounded-[6px] object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium">{x.name}</span>
                          <span className="block text-[11px] text-cs-ink-2">{x.id} · {fmtNum(x.qty)} units</span>
                          <Meter value={pct} className="mt-[5px] h-[5px]" />
                        </span>
                        <Pill tone={!x.confirmed ? "orange" : closed ? "green" : "blue"}>{!x.confirmed ? "New" : closed ? "Done" : `${pct}%`}</Pill>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </Split>
        ) : <div className="cs-card mt-[14px]"><Empty>No production orders yet. Orders appear here when a brand approves your sample.</Empty></div>}
      </Page>
    </div>
  );
}

function OrderDetail({ o }: { o: Order }) {
  const { s, update, toast } = useConsole();
  const [batchFor, setBatchFor] = useState<Batch | null>(null);
  const [proof, setProof] = useState(false);
  const [risk, setRisk] = useState(false);
  const [text, setText] = useState("");
  const [lb, setLb] = useState<number | null>(null);
  const q = s.quality.filter((x) => x.orderId === o.id);
  const ships = s.shipments.filter((x) => x.orderId === o.id);
  const allDone = o.batches.every((b) => b.status === "Completed");
  const step = !o.confirmed ? 0 : !allDone ? 1 : q.some((x) => x.status !== "Passed") || q.length === 0 ? 2 : ships.some((x) => x.status === "Delivered") ? 5 : ships.length ? 3 : 2;
  const d = daysUntil(o.targetDelivery);

  return (
    <Panel bodyClass="px-[15px] pb-[14px] pt-[14px]">
      <div className="flex flex-wrap items-start gap-[12px]">
        <Image src={o.img} alt="" width={80} height={80} className="size-[68px] rounded-[8px] object-cover" />
        <div className="min-w-0 flex-1">
          <h3 className="serif text-[21px] font-semibold leading-tight">{o.name}</h3>
          <p className="mt-[2px] text-[12px] text-cs-ink-2">{o.id} · for {s.workspace} · {fmtNum(o.qty)} units · {o.unitFormat}</p>
          <p className="mt-[3px] text-[12px]">Deliver by <b>{fmtDate(o.targetDelivery)}</b> <span className={cn(d < 0 ? "text-cs-red" : "text-cs-green-2")}>({d < 0 ? `${-d} days late` : `in ${d} days`})</span> · {o.destination}</p>
        </div>
        {!o.confirmed ? (
          <Btn kind="primary" icon={PlayCircle} onClick={() => { update((dd) => acceptOrder(dd, o.id)); toast(`Accepted ${o.id}. The brand has been told.`); }}>Accept order</Btn>
        ) : (
          <div className="flex gap-[8px]">
            <Btn icon={Camera} className="h-[36px] text-[12.5px]" onClick={() => setProof(true)}>Add photo proof</Btn>
            <Btn icon={AlertTriangle} className="h-[36px] text-[12.5px]" onClick={() => setRisk(true)}>Flag a risk</Btn>
          </div>
        )}
      </div>

      <div className="mt-[16px]">
        <Stepper size={42} current={step} allDone={step === 5} steps={[
          { label: "Accepted", icon: ClipboardCheck, sub: o.confirmed ? fmtDay(o.productionAt) : "Waiting" },
          { label: "Batches", icon: Boxes, sub: `${o.batches.filter((b) => b.status === "Completed").length}/${o.batches.length} done` },
          { label: "Quality", icon: ShieldCheck, sub: q.length ? `${q.filter((x) => x.status === "Passed").length}/${q.length} passed` : "After a batch" },
          { label: "Dispatch", icon: Truck, sub: ships.length ? `${ships.length} shipment${ships.length > 1 ? "s" : ""}` : "After QC" },
          { label: "Delivered", icon: PackageCheck, sub: fmtDay(o.targetDelivery) },
        ]} />
      </div>

      <h4 className="serif mt-[16px] text-[16px] font-semibold">Batches</h4>
      <div className="mt-[6px] overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-0">
          <thead><tr><th className={thc}>Batch</th><th className={thc}>Planned</th><th className={thc}>Made</th><th className={thc}>Progress</th><th className={thc}>Window</th><th className={thc}>Status</th><th className={thc}><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {o.batches.map((b) => (
              <tr key={b.id}>
                <td className={cn(tdc, "font-medium")}>{b.id}</td>
                <td className={tdc}>{fmtNum(b.planned)}</td>
                <td className={tdc}>{fmtNum(b.completed)}</td>
                <td className={cn(tdc, "w-[110px]")}><Meter value={(b.completed / b.planned) * 100} /></td>
                <td className={tdc}>{fmtDay(b.start)} – {fmtDay(b.end)}</td>
                <td className={tdc}><Pill tone={BATCH_TONE[b.status]}>{b.status}</Pill></td>
                <td className={cn(tdc, "w-[34px]")}>
                  <RowMenu items={[
                    { label: "Update progress", icon: Factory, onClick: () => setBatchFor(b), disabled: b.status === "Completed" || !o.confirmed },
                    { label: "Mark complete", icon: CheckCircle2, onClick: () => { update((dd) => updateBatch(dd, o.id, b.id, b.planned)); toast(`${b.id} complete. Sent to the brand's quality check.`); }, disabled: b.status === "Completed" || !o.confirmed },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="serif mt-[16px] text-[16px] font-semibold">Post an update to the brand</h4>
      <form className="mt-[6px] flex gap-[8px]" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; update((dd) => postFactoryUpdate(dd, o.id, text.trim())); setText(""); toast("Update posted"); }}>
        <input className={cn(inputCls, "h-[36px] text-[12.5px]")} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Batch 004 blending done, encapsulation starts tomorrow" aria-label="Update" />
        <Btn type="submit" kind="primary" icon={Send} className="h-[36px] text-[12.5px]" disabled={!text.trim()}>Post</Btn>
      </form>
      <ul className="mt-[8px] space-y-[6px]">
        {o.updates.slice(0, 4).map((u, i) => (
          <li key={i} className="flex items-start gap-[9px] text-[12px]">
            <span className="mt-[5px] size-[7px] shrink-0 rounded-full bg-cs-green-2" />
            <span className="min-w-0 flex-1 text-[#3e4440]">{u.text}</span>
            <span className="shrink-0 text-[11px] text-cs-ink-2">{ago(u.at)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-[16px] grid gap-[12px] min-[700px]:grid-cols-2">
        <div>
          <h4 className="serif text-[16px] font-semibold">Photo proof ({o.evidence.length})</h4>
          <div className="mt-[6px] grid grid-cols-3 gap-[6px]">
            {o.evidence.slice(0, 6).map((e, i) => (
              <button type="button" key={i} onClick={() => setLb(i)} className="overflow-hidden rounded-[6px]" aria-label={e.label}>
                <Image src={e.img} alt={e.label} width={160} height={110} className="h-[58px] w-full object-cover" />
              </button>
            ))}
            {o.evidence.length === 0 && <p className="col-span-3 text-[12px] text-cs-ink-2">No photos yet. Brands trust orders with proof at every stage.</p>}
          </div>
        </div>
        <div>
          <h4 className="serif text-[16px] font-semibold">Risks ({o.issues.filter((i) => !i.resolved).length} open)</h4>
          <ul className="mt-[6px] space-y-[6px]">
            {o.issues.map((r) => (
              <li key={r.id} className={cn("rounded-[7px] border border-cs-line px-[9px] py-[7px] text-[12px]", r.resolved && "opacity-60")}>
                <div className="flex items-center justify-between gap-2"><b className="truncate">{r.title}</b><Pill tone={r.resolved ? "green" : LEVEL_TONE[r.level]}>{r.resolved ? "Mitigated" : r.level}</Pill></div>
                <p className="mt-[2px] text-[11.5px] text-cs-ink-2">{r.detail}</p>
                <button type="button" className="mt-[3px] inline-flex items-center gap-[4px] text-[11.5px] font-medium text-cs-green" onClick={() => update((dd) => setRiskResolved(dd, o.id, r.id, !r.resolved))}>{r.resolved ? <><Undo2 className="size-[12px]" />Reopen</> : <><CheckCircle2 className="size-[12px]" />Mark mitigated</>}</button>
              </li>
            ))}
            {o.issues.length === 0 && <li className="text-[12px] text-cs-ink-2">No risks flagged.</li>}
          </ul>
        </div>
      </div>

      {batchFor && <BatchModal o={o} b={batchFor} onClose={() => setBatchFor(null)} />}
      {proof && <ProofModal o={o} onClose={() => setProof(false)} />}
      {risk && <RiskModal o={o} onClose={() => setRisk(false)} />}
      <Lightbox images={o.evidence.map((e) => ({ src: e.img, label: `${e.label} · ${e.batch}` }))} index={lb} onClose={() => setLb(null)} onIndex={setLb} />
    </Panel>
  );
}

function BatchModal({ o, b, onClose }: { o: Order; b: Batch; onClose: () => void }) {
  const { update, toast } = useConsole();
  const [n, setN] = useState(String(b.completed));
  const v = Math.max(0, Math.min(b.planned, Number(n) || 0));
  const save = (units: number) => { update((d) => updateBatch(d, o.id, b.id, units)); toast(units >= b.planned ? `${b.id} complete. Sent to quality check.` : `${b.id}: ${fmtNum(units)} units recorded`); onClose(); };
  return (
    <Modal open onClose={onClose} title={`Update ${b.id}`} sub={`${o.name} · planned ${fmtNum(b.planned)} units`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn onClick={() => save(b.planned)} icon={CheckCircle2}>Mark complete</Btn><Btn kind="primary" onClick={() => save(v)} disabled={v === b.completed}>Save progress</Btn></>}>
      <Field label="Units completed" hint={`${Math.round((v / b.planned) * 100)}% of the batch`}><input className={inputCls} type="number" min={0} max={b.planned} value={n} onChange={(e) => setN(e.target.value)} autoFocus /></Field>
    </Modal>
  );
}

function ProofModal({ o, onClose }: { o: Order; onClose: () => void }) {
  const { update, toast } = useConsole();
  const [pick, setPick] = useState(0);
  const [label, setLabel] = useState(PHOTOS[0].label);
  const [batch, setBatch] = useState(o.batches.find((b) => b.status === "In Progress")?.id ?? o.batches[0]?.id ?? "");
  return (
    <Modal open onClose={onClose} title="Add photo proof" sub="Pick from today's line photos" width={560}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={Camera} disabled={!label.trim()} onClick={() => { update((d) => addEvidence(d, o.id, PHOTOS[pick].img, label.trim(), batch.replace("BATCH-", "Batch "))); toast("Photo shared with the brand"); onClose(); }}>Share photo</Btn></>}>
      <div className="grid grid-cols-3 gap-[8px]">
        {PHOTOS.map((p, i) => (
          <button type="button" key={p.img} onClick={() => { setPick(i); setLabel(p.label); }} className={cn("overflow-hidden rounded-[7px] border-2", pick === i ? "border-cs-green" : "border-transparent")} aria-label={p.label}>
            <Image src={p.img} alt="" width={180} height={120} className="h-[78px] w-full object-cover" />
          </button>
        ))}
      </div>
      <div className="mt-[12px] grid grid-cols-2 gap-[10px]">
        <Field label="Caption"><input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
        <Field label="Batch"><select className={inputCls} value={batch} onChange={(e) => setBatch(e.target.value)}>{o.batches.map((b) => <option key={b.id}>{b.id}</option>)}</select></Field>
      </div>
    </Modal>
  );
}

function RiskModal({ o, onClose }: { o: Order; onClose: () => void }) {
  const { update, toast } = useConsole();
  const [f, setF] = useState<{ title: string; detail: string; level: Issue["level"]; ref: string }>({ title: "", detail: "", level: "Medium", ref: o.batches.find((b) => b.status === "In Progress")?.id ?? o.id });
  return (
    <Modal open onClose={onClose} title="Flag a risk" sub="The brand sees it on their production screen."
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="danger" icon={AlertTriangle} disabled={!f.title.trim()} onClick={() => { update((d) => addRisk(d, o.id, { ...f, title: f.title.trim(), detail: f.detail.trim() })); toast("Risk flagged"); onClose(); }}>Flag risk</Btn></>}>
      <div className="space-y-[12px]">
        <Field label="What could go wrong?"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Capsule shell delivery slipping by 2 days" autoFocus /></Field>
        <div className="grid grid-cols-2 gap-[10px]">
          <Field label="Level"><select className={inputCls} value={f.level} onChange={(e) => setF({ ...f, level: e.target.value as Issue["level"] })}><option>High</option><option>Medium</option><option>Low</option></select></Field>
          <Field label="Affects"><select className={inputCls} value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })}>{[o.id, ...o.batches.map((b) => b.id)].map((x) => <option key={x}>{x}</option>)}</select></Field>
        </div>
        <Field label="Details and plan"><textarea className={cn(textareaCls, "h-[70px]")} value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
