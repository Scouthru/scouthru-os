"use client";

import { useState } from "react";
import { MessageSquareText, Plus } from "lucide-react";
import { Btn, Field, Modal, inputCls } from "@/components/console/kit";
import { Box } from "@/components/hq/ui";
import { log, useHq } from "@/lib/hq/store";
import type { Channel, Enquiry, EnquiryStatus } from "@/lib/hq/types";
import { ago } from "@/lib/console/format";
import { cn } from "@/lib/cn";

const CHANNELS: Channel[] = ["Marketplace", "WhatsApp", "IndiaMART", "Phone", "Walk-in"];
const STATUSES: EnquiryStatus[] = ["New", "Matched", "Quoted", "Won", "Lost"];
const CHANNEL_TONE: Record<Channel, string> = { Marketplace: "bg-cs-mint text-cs-green-2", WhatsApp: "bg-cs-ok-bg text-cs-ok", IndiaMART: "bg-cs-blue-bg text-cs-blue", Phone: "bg-cs-violet-bg text-cs-violet", "Walk-in": "bg-[#f1efe9] text-[#3e4440]" };
const STATUS_TONE: Record<EnquiryStatus, string> = { New: "text-cs-green", Matched: "text-cs-blue", Quoted: "text-cs-violet", Won: "text-cs-ok", Lost: "text-cs-ink-2" };

/** Enquiries from the marketplace and from regular channels, matched to a factory. */
export default function Enquiries() {
  const { s, update, toast } = useHq();
  const [source, setSource] = useState<"all" | "marketplace" | "regular">("all");
  const [status, setStatus] = useState<"open" | EnquiryStatus>("open");
  const [adding, setAdding] = useState(false);
  const factories = s.members.filter((m) => m.type === "maker" || m.type === "supplier");
  const list = [...s.enquiries]
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter((e) => source === "all" || (source === "marketplace" ? e.channel === "Marketplace" : e.channel !== "Marketplace"))
    .filter((e) => (status === "open" ? e.status !== "Won" && e.status !== "Lost" : e.status === status));
  const set = (id: string, patch: Partial<Enquiry>, note?: string) => update((d) => { Object.assign(d.enquiries.find((x) => x.id === id)!, patch); if (note) log(d, note); });

  return (
    <div className="grid gap-[16px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="serif text-[30px] font-semibold leading-tight tracking-[-0.02em]">Enquiries</h1>
          <p className="mt-[2px] text-[13.5px] text-cs-ink-2">From the marketplace and from regular channels: WhatsApp, IndiaMART, calls and walk-ins.</p>
        </div>
        <Btn kind="primary" icon={Plus} onClick={() => setAdding(true)}>Add enquiry</Btn>
      </div>

      <div className="flex flex-wrap gap-[6px]">
        {(["all", "marketplace", "regular"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setSource(k)} className={cn("rounded-full px-[12px] py-[5px] text-[12.5px]", source === k ? "bg-cs-deep text-white" : "bg-white ring-1 ring-cs-line")}>{k === "all" ? "All sources" : k === "marketplace" ? "Marketplace" : "Regular"}</button>
        ))}
        <span className="mx-[4px] w-px bg-cs-line" />
        {(["open", ...STATUSES] as const).map((k) => (
          <button key={k} type="button" onClick={() => setStatus(k)} className={cn("rounded-full px-[12px] py-[5px] text-[12.5px]", status === k ? "bg-cs-deep text-white" : "bg-white ring-1 ring-cs-line")}>{k === "open" ? "Open" : k}</button>
        ))}
      </div>

      <Box title={`${list.length} enquir${list.length === 1 ? "y" : "ies"}`} icon={MessageSquareText}>
        {list.length === 0 ? <p className="py-[16px] text-center text-[13px] text-cs-ink-2">Nothing here.</p> : (
          <ul className="divide-y divide-cs-line">
            {list.map((e) => (
              <li key={e.id} className="grid items-center gap-[10px] py-[11px] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_150px_150px_110px]">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold">{e.product}</p>
                  <p className="mt-[2px] flex flex-wrap items-center gap-[6px] text-[11.5px] text-cs-ink-2">
                    <span className={cn("rounded-full px-[7px] text-[10.5px] font-medium", CHANNEL_TONE[e.channel])}>{e.channel}</span>
                    {e.buyer} · {e.qty.toLocaleString("en-IN")} units · {e.category} · {ago(e.at)}
                  </p>
                </div>
                <select value={e.factoryId ?? ""} onChange={(ev) => { const f = factories.find((x) => x.id === ev.target.value); set(e.id, { factoryId: ev.target.value || undefined, status: ev.target.value && e.status === "New" ? "Matched" : e.status }, f ? `${e.product} matched to ${f.name}` : undefined); }} className={inputCls} aria-label="Matched factory">
                  <option value="">Not matched yet</option>
                  {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <select value={e.assigneeId ?? ""} onChange={(ev) => set(e.id, { assigneeId: ev.target.value || undefined })} className={inputCls} aria-label="Handled by">
                  <option value="">Nobody yet</option>
                  {s.team.filter((t) => t.active && (t.role === "sales" || t.role === "owner")).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={e.status} onChange={(ev) => { set(e.id, { status: ev.target.value as EnquiryStatus }, `${e.product} for ${e.buyer}: ${ev.target.value.toLowerCase()}`); toast(`Marked ${ev.target.value.toLowerCase()}`, "info"); }} className={cn(inputCls, "font-medium", STATUS_TONE[e.status])} aria-label="Status">
                  {STATUSES.map((x) => <option key={x}>{x}</option>)}
                </select>
                <p className="text-right text-[13px] font-semibold">{e.value ? `₹${e.value.toLocaleString("en-IN")}` : <span className="font-normal text-cs-ink-2">no quote yet</span>}</p>
              </li>
            ))}
          </ul>
        )}
      </Box>

      {adding && <AddEnquiry onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddEnquiry({ onClose }: { onClose: () => void }) {
  const { update, toast } = useHq();
  const [f, setF] = useState({ product: "", category: "Supplements", buyer: "", qty: "", channel: "WhatsApp" as Channel });
  const ok = f.product.trim() && f.buyer.trim() && Number(f.qty) > 0;
  return (
    <Modal open onClose={onClose} title="Add an enquiry" sub="For enquiries that come in outside the marketplace."
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!ok} onClick={() => {
        update((d) => { d.enquiries.unshift({ id: `q${Date.now()}`, product: f.product.trim(), category: f.category, buyer: f.buyer.trim(), qty: Number(f.qty), channel: f.channel, status: "New", at: new Date().toISOString() }); log(d, `New ${f.channel} enquiry: ${f.product.trim()} from ${f.buyer.trim()}`); });
        toast("Enquiry added");
        onClose();
      }}>Add enquiry</Btn></>}>
      <div className="grid gap-[12px] sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="What do they want made?"><input className={inputCls} value={f.product} onChange={(e) => setF((x) => ({ ...x, product: e.target.value }))} autoFocus /></Field></div>
        <Field label="Buyer"><input className={inputCls} value={f.buyer} onChange={(e) => setF((x) => ({ ...x, buyer: e.target.value }))} /></Field>
        <Field label="Quantity"><input className={inputCls} value={f.qty} inputMode="numeric" onChange={(e) => setF((x) => ({ ...x, qty: e.target.value.replace(/\D/g, "") }))} /></Field>
        <Field label="Category">
          <select className={inputCls} value={f.category} onChange={(e) => setF((x) => ({ ...x, category: e.target.value }))}>
            {["Supplements", "Food & beverages", "Skincare", "Personal care", "Packaging"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Came in by">
          <select className={inputCls} value={f.channel} onChange={(e) => setF((x) => ({ ...x, channel: e.target.value as Channel }))}>
            {CHANNELS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  );
}
