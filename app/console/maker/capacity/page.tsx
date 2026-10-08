"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, Factory, Gauge, Pencil, Scale, TriangleAlert, Users } from "lucide-react";
import { Btn, Field, Hero, Modal, Pill, StatStrip, inputCls } from "@/components/console/kit";
import { Meter, Page, Panel, Split } from "@/components/console/maker";
import { useConsole } from "@/lib/console/store";
import { PER_PACK, capacityFit, capacityLoad, lineUnits, setLineCapacity, type LineKey } from "@/lib/console/actions-maker";
import { fmtDay, fmtNum } from "@/lib/console/format";
import { cn } from "@/lib/cn";

const FORMATS: { label: string; line: LineKey }[] = [
  { label: "Capsules", line: "Capsule line" }, { label: "Softgels", line: "Capsule line" }, { label: "Tablets", line: "Tablet line" },
  { label: "Gummies", line: "Gummy line" }, { label: "Powders / sachets", line: "Powder & sachet line" },
];

export default function MakerCapacityPage() {
  const { s } = useConsole();
  const lines = useMemo(() => capacityLoad(s), [s]);
  const [edit, setEdit] = useState<string | null>(null);
  const [fmt, setFmt] = useState(0);
  const [qty, setQty] = useState("20000");
  const packs = Number(qty) || 0;
  const fit = capacityFit(s, FORMATS[fmt].line, packs);
  const total = lines.reduce((a, l) => a + l.perMonth, 0);
  const booked = lines.reduce((a, l) => a + Math.min(l.booked, l.perMonth), 0);
  const over = lines.filter((l) => l.pct > 100);
  const months = [0, 1, 2].map((m) => { const d = new Date(); d.setMonth(d.getMonth() + m, 1); return d; });

  return (
    <div>
      <Hero eyebrow="PLAN · BOOK · GROW" title="Capacity" lede={<>See how much of each line is booked by open orders and what&apos;s free,<br />so you only quote what you can deliver on time.</>} img="/console/hero-reports.jpg" height={148} quoteTop={36} quoteWidth={214} quote={["Insight-led", "operations.", "Better decisions."]} />
      <Page>
        <StatStrip items={[
          { icon: Factory, tone: "green", value: lines.length, label: "Production Lines", delta: "Running this month", deltaTone: "muted" },
          { icon: Gauge, tone: "blue", value: `${total ? Math.round((booked / total) * 100) : 0}%`, label: "Overall Load", delta: "Booked by open orders", deltaTone: "muted" },
          { icon: Scale, tone: "green", value: lines.filter((l) => l.pct < 70).length, label: "Lines With Room", delta: "Below 70% booked" },
          { icon: TriangleAlert, tone: "red", value: over.length, label: "Overbooked Lines", delta: over.length ? "Needs a partner unit" : "None", deltaTone: over.length ? "bad" : "muted" },
          { icon: Users, tone: "violet", value: lines.reduce((a, l) => a + l.orders.length, 0), label: "Orders on Lines", delta: "Open production orders", deltaTone: "muted" },
        ]} />
        <Split side="0.9fr" hero={148}>
          <Panel title="Lines this month" sub={`Load = remaining units spread over the months to delivery. Capsule, tablet and gummy lines count ${PER_PACK} pieces per pack.`} bodyClass="px-[15px] pb-[14px] pt-[10px]">
            <ul className="space-y-[12px]">
              {lines.map((l) => (
                <li key={l.line} className="rounded-[9px] border border-cs-line p-[12px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-semibold">{l.line}</p>
                      <p className="text-[11.5px] text-cs-ink-2">{l.formats.join(", ")} · {fmtNum(l.perMonth)} {l.unit}/month</p>
                    </div>
                    <div className="flex items-center gap-[8px]">
                      <Pill tone={l.pct > 100 ? "red" : l.pct >= 70 ? "orange" : "green"}>{l.pct}% booked</Pill>
                      <button type="button" aria-label={`Edit ${l.line} capacity`} onClick={() => setEdit(l.line)} className="grid size-[28px] place-items-center rounded-[6px] border border-cs-line hover:border-[#cfcac0]"><Pencil className="size-[13px]" /></button>
                    </div>
                  </div>
                  <Meter value={l.pct} tone={l.pct > 100 ? "red" : l.pct >= 70 ? "orange" : "green"} className="mt-[9px]" />
                  <p className="mt-[5px] text-[11.5px] text-cs-ink-2">{fmtNum(l.booked)} booked · <b className="text-cs-ink">{fmtNum(l.free)} free</b></p>
                  <div className="mt-[9px] grid grid-cols-3 gap-[6px]">
                    {months.map((m, i) => {
                      const load = l.orders.reduce((a, x) => { const end = new Date(x.order.targetDelivery); const start = new Date(m.getFullYear(), m.getMonth(), 1); return a + (end >= start ? x.perMonth : 0); }, 0);
                      const pct = l.perMonth ? Math.round((load / l.perMonth) * 100) : 0;
                      return (
                        <div key={i} className="rounded-[6px] bg-[#f7f6f2] px-[8px] py-[6px]">
                          <p className="text-[10.5px] text-cs-ink-2">{m.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</p>
                          <div className="mt-[4px] flex h-[34px] items-end"><div className={cn("w-full rounded-[3px]", pct > 100 ? "bg-cs-red" : pct >= 70 ? "bg-cs-orange" : "bg-cs-green")} style={{ height: `${Math.max(4, Math.min(100, pct))}%` }} /></div>
                          <p className="mt-[3px] text-[11px] font-medium">{pct}%</p>
                        </div>
                      );
                    })}
                  </div>
                  {l.orders.length > 0 && (
                    <ul className="mt-[8px] space-y-[3px] text-[11.5px]">
                      {l.orders.map((x) => <li key={x.order.id} className="flex justify-between gap-2"><Link href={`/console/maker/orders?id=${x.order.id}`} className="truncate text-cs-green hover:underline">{x.order.id} · {x.order.name}</Link><span className="shrink-0 text-cs-ink-2">{fmtNum(x.remaining)} packs left · due {fmtDay(x.order.targetDelivery)}</span></li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Can we take this?" sub="Check a new enquiry against this month's free capacity." bodyClass="px-[15px] pb-[14px] pt-[12px]">
            <div className="space-y-[12px]">
              <Field label="Format"><select className={inputCls} value={fmt} onChange={(e) => setFmt(Number(e.target.value))}>{FORMATS.map((f, i) => <option key={f.label} value={i}>{f.label}</option>)}</select></Field>
              <Field label="Quantity (packs)"><input className={inputCls} type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
            </div>
            {packs > 0 && (
              <div className={cn("mt-[14px] rounded-[9px] border p-[13px]", fit.fits ? "border-[#cfe5d4] bg-cs-mint/50" : "border-[#f3d6b9] bg-cs-orange-bg/60")}>
                <p className="flex items-center gap-[8px] text-[14px] font-semibold">{fit.fits ? <CheckCircle2 className="size-[18px] text-cs-green-2" /> : <TriangleAlert className="size-[18px] text-cs-orange" />}{fit.fits ? "Yes, it fits this month" : "Not this month on our own lines"}</p>
                <ul className="mt-[6px] space-y-[2px] text-[12.5px] text-[#3e4440]">
                  <li>Runs on: {fit.line}</li>
                  <li>Needs: {fmtNum(lineUnits(fit.line, packs))} {s.capacity.find((c) => c.line === fit.line)?.unit}</li>
                  <li>Free now: {fmtNum(fit.free)}</li>
                  {!fit.fits && <li>Short by {fmtNum(fit.shortfall)}. Quote a later slot, split the order, or use a Scouthru partner unit.</li>}
                </ul>
              </div>
            )}
            <h4 className="serif mt-[16px] text-[16px] font-semibold">How load is counted</h4>
            <p className="mt-[4px] text-[12px] leading-[1.5] text-cs-ink-2">Every open order adds its remaining units to its line, spread over the months left until its delivery date. Finished batches stop counting. Edit a line&apos;s monthly capacity with the pencil when you add a shift or a machine.</p>
          </Panel>
        </Split>
      </Page>
      {edit && <EditModal line={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function EditModal({ line, onClose }: { line: string; onClose: () => void }) {
  const { s, update, toast } = useConsole();
  const c = s.capacity.find((x) => x.line === line)!;
  const [v, setV] = useState(String(c.perMonth));
  const n = Number(v);
  return (
    <Modal open onClose={onClose} title={`Edit ${line}`} sub="Monthly capacity at current shifts"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!(n > 0) || n === c.perMonth} onClick={() => { update((d) => setLineCapacity(d, line, n)); toast(`${line} set to ${fmtNum(n)} ${c.unit}/month`); onClose(); }}>Save</Btn></>}>
      <Field label={`Capacity (${c.unit} per month)`}><input className={inputCls} type="number" min={1} value={v} onChange={(e) => setV(e.target.value)} autoFocus /></Field>
    </Modal>
  );
}
