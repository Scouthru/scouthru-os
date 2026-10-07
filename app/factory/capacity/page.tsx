"use client";

import { useState } from "react";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Field } from "@/components/ui";
import { Donut } from "@/components/factory";
import { fmt, useStore } from "@/lib/store";
import { cn } from "@/lib/cn";

export default function Capacity() {
  const { s, update, toast } = useStore();
  const cap = s.capacity;
  const [check, setCheck] = useState("");
  const n = parseInt(check.replace(/\D/g, ""), 10) || 0;
  const free = cap.total - cap.booked;
  return (
    <>
      <DeskHeader title="Capacity" sub="Know your load before you say yes." />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Panel title="This quarter" right={cap.line}>
          <div className="flex flex-wrap items-center gap-6">
            <Donut pct={Math.round((cap.booked / cap.total) * 100)} size={150} />
            <div className="flex flex-col gap-3">
              <Field label="Monthly capacity (units)">
                <input className="input num" inputMode="numeric" value={cap.total} onChange={(e) => { const v = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0; update((d) => { d.capacity.total = v; }); }} />
              </Field>
              <p className="text-[14px]">Booked <b className="num">{fmt(cap.booked)}</b> · free <b className="num">{fmt(Math.max(0, free))}</b></p>
            </div>
          </div>
        </Panel>
        <Panel title="Load by month" right="% of line booked">
          <div className="flex h-44 items-end gap-3">
            {cap.months.map((m) => (
              <div key={m.m} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="num text-[11px] text-ink-2">{m.booked}%</span>
                <div className="flex w-full flex-1 items-end rounded-[10px] bg-soft"><div className={cn("w-full rounded-lg", m.booked > 85 ? "bg-flame" : "bg-pine")} style={{ height: `${m.booked}%` }} /></div>
                <span className="text-[12px]">{m.m}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel className="mt-5" title="Accept only what fits">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="New order size (units)"><input className="input num w-48" inputMode="numeric" value={check} onChange={(e) => setCheck(e.target.value)} placeholder="e.g. 30000" /></Field>
          {n > 0 && (n <= free ? (
            <p className="rounded-[10px] bg-ok-bg px-3 py-2.5 text-[14px] text-ok">Fits. {fmt(free - n)} units stay free this quarter.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="rounded-[10px] bg-peach px-3 py-2.5 text-[14px] text-flame">Over by {fmt(n - free)} units. Make {fmt(free)} in-house and share the rest.</p>
              <Btn href="/factory/partners" variant="pine">Find a partner unit</Btn>
            </div>
          ))}
        </div>
        {n > 0 && n <= free && <Btn className="mt-3" variant="pine" onClick={() => { update((d) => { d.capacity.booked += n; d.capacity.months[0].booked = Math.min(100, d.capacity.months[0].booked + Math.round((n / d.capacity.total) * 100)); }); toast(`${fmt(n)} units blocked on the line`); setCheck(""); }}>Block this capacity</Btn>}
      </Panel>
    </>
  );
}
