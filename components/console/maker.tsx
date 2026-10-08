"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, IndianRupee } from "lucide-react";
import { cn } from "@/lib/cn";
import { useConsole } from "@/lib/console/store";
import { payPO } from "@/lib/console/actions-network";
import { inr } from "@/lib/console/format";
import type { POStatus, PurchaseOrder, SampleStatus } from "@/lib/console/types";
import { Btn, Field, Modal, inputCls, type Tone } from "./kit";

/**
 * Layout pieces for the manufacturer portal. The screens follow the brand
 * console's rhythm: 177px hero, stat strip, then a main area that fills the
 * rest of a 1086px frame (lists scroll inside their card).
 */

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="px-[15px] pb-[20px]">{children}</div>;
}

/**
 * Two-column work area: list on the left, detail panel on the right. Its height
 * is what's left of the 1086px frame under the page's hero (`hero` = hero height).
 */
export function Split({ children, side = "1fr", hero = 177, className }: { children: React.ReactNode; side?: string; hero?: number; className?: string }) {
  return (
    <div className={cn("mt-[14px] grid gap-[12px] min-[1024px]:h-[var(--mainh)] min-[1024px]:grid-cols-[minmax(0,1.75fr)_minmax(0,var(--side))]", className)} style={{ ["--side" as string]: side, ["--mainh" as string]: `${887 - hero}px` }}>
      {children}
    </div>
  );
}

/** A card that fills its grid cell and scrolls its body. */
export function Panel({ title, sub, right, children, className, bodyClass }: { title?: React.ReactNode; sub?: string; right?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("cs-card flex min-h-0 min-w-0 flex-col", className)}>
      {title && (
        <div className="flex items-start justify-between gap-3 px-[15px] pt-[14px]">
          <div className="min-w-0">
            <h2 className="serif text-[18.5px] font-semibold leading-tight tracking-[-0.02em] text-[#151816]">{title}</h2>
            {sub && <p className="mt-[2px] text-[12px] text-cs-ink-2">{sub}</p>}
          </div>
          {right}
        </div>
      )}
      <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClass)}>{children}</div>
    </section>
  );
}

export function KV({ k, v, className }: { k: string; v: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[118px_minmax(0,1fr)] gap-2 border-b border-[#f1efea] py-[6px] text-[12px] last:border-0", className)}>
      <dt className="text-cs-ink-2">{k}</dt>
      <dd className="min-w-0 text-[#1d211e]">{v}</dd>
    </div>
  );
}

export function Meter({ value, tone = "green", className }: { value: number; tone?: "green" | "orange" | "red"; className?: string }) {
  const c = tone === "red" ? "bg-cs-red" : tone === "orange" ? "bg-cs-orange" : "bg-cs-green";
  return (
    <div className={cn("h-[7px] overflow-hidden rounded-full bg-[#e9ebe6]", className)}>
      <div className={cn("h-full rounded-full", c)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function GoLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-[5px] whitespace-nowrap text-[12px] font-medium text-cs-green hover:underline">
      {children} <ArrowRight className="size-[13px]" />
    </Link>
  );
}

export const PO_TONE: Record<POStatus, Tone> = { RFQ: "orange", Quoted: "violet", Confirmed: "blue", Dispatched: "blue", Received: "green", Paid: "green", Declined: "gray" };
export const PO_STEPS: POStatus[] = ["RFQ", "Quoted", "Confirmed", "Dispatched", "Received", "Paid"];
export const MAKER_SAMPLE_TONE: Record<SampleStatus, Tone> = {
  Draft: "gray", Submitted: "orange", "In Review": "blue", Testing: "blue", Feedback: "violet", "Changes Requested": "red", Approved: "green", Rejected: "red",
};

/** Table header cell, same recipe as the brand list screens. */
export const thc = "sticky top-0 z-10 whitespace-nowrap bg-[#f7f6f2] px-[8px] py-[9px] text-left text-[11px] font-medium text-[#4b524e]";
export const tdc = "border-b border-[#f1efea] px-[8px] py-[9px] align-middle text-[12px]";

/** Pay a supplier invoice; the reference is required. Used on Materials and Payments. */
export function PayModal({ p, onClose }: { p: PurchaseOrder; onClose: () => void }) {
  const { update, toast } = useConsole();
  const [ref, setRef] = useState("");
  return (
    <Modal open onClose={onClose} title="Pay supplier invoice" sub={`${p.invoice?.no} · ${inr(p.invoice?.amount ?? 0)}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={IndianRupee} disabled={!ref.trim()} onClick={() => { update((d) => payPO(d, p.id, ref.trim())); toast(`${p.invoice?.no} paid`); onClose(); }}>Record payment</Btn></>}>
      <Field label="Payment reference (UTR / cheque no.)"><input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. UTR 4521 8890 1123" autoFocus /></Field>
    </Modal>
  );
}
