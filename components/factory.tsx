"use client";

import { useRef, useState } from "react";
import { Btn, Field, Modal, Pill, readFile } from "@/components/ui";
import type { Enquiry, Order } from "@/lib/types";
import { useStore, fmt } from "@/lib/store";
import { addProof, sendFactoryQuote } from "@/lib/ops";
import { sha256File } from "@/lib/sha256";
import { cn } from "@/lib/cn";

export function Donut({ pct, size = 128, label = "booked" }: { pct: number; size?: number; label?: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${pct}% ${label}`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-soft)" strokeWidth="13" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={pct > 100 ? "var(--color-flame)" : "var(--color-pine)"} strokeWidth="13" strokeDasharray={`${(Math.min(pct, 100) / 100) * c} ${c}`} transform="rotate(-90 60 60)" />
      <text x="60" y="60" textAnchor="middle" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24 }} fill="var(--color-ink)">{pct}%</text>
      <text x="60" y="78" textAnchor="middle" fontSize="10" fill="var(--color-ink-2)">{label}</text>
    </svg>
  );
}

export const FIT_TONE: Record<Enquiry["fit"], string> = { Fits: "text-ok", "Not your line": "text-ink-2", "Needs partner unit": "text-flame" };

/** Upload a milestone photo: hashed in the browser, appended to the shared order's proof feed. */
export function UploadProof({ o, children = "Upload milestone photos" }: { o: Order; children?: React.ReactNode }) {
  const { update, toast } = useStore();
  const ref = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("Production update");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Btn onClick={() => setOpen(true)}>{children}</Btn>
      <Modal open={open} onClose={() => setOpen(false)} title={`Add proof · ${o.id}`}>
        <form className="flex flex-col gap-3" onSubmit={async (e) => {
          e.preventDefault();
          if (!file && !detail.trim()) { toast("Add a photo or write what was done first."); return; }
          if (file && file.size > 3_000_000) { toast("Photo must be under 3 MB."); return; }
          setBusy(true);
          let image: string | undefined;
          let hash = "";
          if (file) { const { url, buf } = await readFile(file); image = file.type.startsWith("image/") ? url : undefined; hash = await sha256File(buf); }
          update((d) => {
            const x = d.orders.find((y) => y.id === o.id)!;
            addProof(x, title, file ? `Photo · ${file.name}` : "Note", `${detail}${hash ? ` · file sha256 ${hash.slice(0, 10)}…` : ""}`, image);
            const ph = x.phases.find((p) => p.status === "active");
            if (ph) { ph.pct = Math.min(100, ph.pct + 25); if (ph.pct === 100) { ph.status = "done"; } }
            x.progress = Math.min(99, x.progress + 8);
            const proofPay = x.payments.find((p) => p.status === "proof");
            if (proofPay) proofPay.status = "due";
          });
          setBusy(false); setOpen(false); setFile(null); setDetail("");
          toast("Proof uploaded and fingerprinted. The brand sees it now; the linked payment is due.");
        }}>
          <Field label="Milestone"><select className="input" value={title} onChange={(e) => setTitle(e.target.value)}>{["Production update", "Raw material received", "Batch completed", "Packing done", "Ready for QC"].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <div>
            <button type="button" onClick={() => ref.current?.click()} className="hatch flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-line-2 text-[13px] font-semibold">
              {file ? file.name : "+ Choose photo or PDF"}
            </button>
            <input ref={ref} type="file" accept="image/*,application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <Field label="What it shows"><input className="input" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="e.g. 2,500 bars wrapped, batch B2" /></Field>
          <Btn variant="pine" type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload proof"}</Btn>
          <p className="text-[12px] text-ink-3">Each proof is fingerprinted and chained to the previous one, so it can&apos;t be edited later.</p>
        </form>
      </Modal>
    </>
  );
}

export function EnquiryModal({ e, onClose }: { e: Enquiry | null; onClose: () => void }) {
  const { update, toast } = useStore();
  const [price, setPrice] = useState("");
  const [lead, setLead] = useState("21");
  if (!e) return null;
  return (
    <Modal open onClose={onClose} title={e.product}>
      <div className="flex flex-col gap-3 text-[14px]">
        <div className="grid grid-cols-2 gap-2 text-[13px]">
          {[["Buyer", e.buyer], ["Source", e.source], ["Quantity", fmt(e.moq)], ["Needed by", e.neededBy], ["Region", e.region], ["Can you make it", e.fit]].map(([k, v]) => (
            <div key={k} className="rounded-[10px] bg-soft px-3 py-2"><p className="text-[12px] text-ink-2">{k}</p><p className={cn("font-medium", k === "Can you make it" && FIT_TONE[e.fit])}>{v}</p></div>
          ))}
        </div>
        {e.notes && <p className="text-ink-2">“{e.notes}”</p>}
        {e.status === "won" ? (
          <p className="rounded-[10px] bg-ok-bg p-3 text-ok">Won. The buyer accepted your quote; the order is in your Orders.</p>
        ) : e.status === "quoted" ? (
          <p className="rounded-[10px] bg-ok-bg p-3 text-ok">Quoted ₹{e.quote?.price}/unit · {e.quote?.lead} days. Price frozen 15 days for the buyer.</p>
        ) : e.status === "declined" ? (
          <p className="rounded-[10px] bg-soft p-3">Declined. The buyer was told politely and shown other units.</p>
        ) : e.fit === "Not your line" ? (
          <div className="flex gap-2"><Btn onClick={() => { update((d) => { d.enquiries.find((x) => x.id === e.id)!.status = "declined"; }); toast("Declined. Scouthru routes it to a unit that makes it."); onClose(); }}>Decline · not our line</Btn></div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={(ev) => {
            ev.preventDefault();
            const p = parseFloat(price);
            if (!p) return;
            update((d) => sendFactoryQuote(d, e.id, p, parseInt(lead, 10) || 21));
            toast(e.orderId ? `Quote sent. It is now in ${e.buyer}'s compare list, frozen 15 days.` : `Quote sent to ${e.buyer} on ${e.source}. Frozen for 15 days.`);
            onClose();
          }}>
            {e.fit === "Needs partner unit" && <p className="rounded-[10px] bg-peach p-3 text-[13px]">This is above your free capacity. Quoting will offer the overflow to a vetted partner unit automatically.</p>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price per unit (₹)"><input className="input num" inputMode="decimal" value={price} onChange={(x) => setPrice(x.target.value)} required /></Field>
              <Field label="Lead time (days)"><input className="input num" inputMode="numeric" value={lead} onChange={(x) => setLead(x.target.value)} /></Field>
            </div>
            <div className="flex gap-2">
              <Btn variant="flame" type="submit">Send quote</Btn>
              <Btn onClick={() => { update((d) => { d.enquiries.find((x) => x.id === e.id)!.status = "declined"; }); toast("Enquiry declined"); onClose(); }}>Decline</Btn>
            </div>
            <p className="text-[12px] text-ink-3">The reply goes back on {e.source}. Your number stays masked.</p>
          </form>
        )}
      </div>
    </Modal>
  );
}

export { Pill };
