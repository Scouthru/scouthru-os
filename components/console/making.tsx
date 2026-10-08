"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Leaf, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { useConsole } from "@/lib/console/store";
import { sendMessage } from "@/lib/console/actions";
import type { Activity } from "@/lib/console/types";
import { Btn, Field, Modal, inputCls, textareaCls, type Tone } from "./kit";

/**
 * Pieces shared by the making screens (Samples, Production, Quality).
 * WideHero is Hero with a configurable photo width: these mockups' photos start
 * further left or right than the default 52%, and the Samples photo carries its
 * quote as part of the image (no card), so `quote` is optional.
 */
export function WideHero({ eyebrow, title, lede, img, photo, height, quote, quoteTop = 30, quoteWidth = 160, ledeWidth = 620, ledeGap = 13, titleSize = 45, ledeSize = 16 }: {
  eyebrow: React.ReactNode; title: string; lede: React.ReactNode; img: string; photo: number; height: number; quote?: string[]; quoteTop?: number; quoteWidth?: number; ledeWidth?: number; ledeGap?: number; titleSize?: number; ledeSize?: number;
}) {
  return (
    <section className="relative overflow-hidden bg-[#f7f2ea]" style={{ height }}>
      <Image src={img} alt="" width={1500} height={400} priority className="absolute right-0 top-0 h-full object-cover object-right" style={{ width: `${photo}%` }} />
      <div className="absolute inset-y-0 w-[140px] bg-gradient-to-r from-[#f7f2ea] to-transparent" style={{ left: `${100 - photo}%` }} />
      <div className="relative pl-[29px] pt-[24px]">
        <div className="text-[11px] font-semibold tracking-[0.2em] text-[#2b302d]">{eyebrow}</div>
        <h1 className="serif mt-[10px] font-semibold leading-none tracking-[-0.02em] text-[#151816]" style={{ fontSize: titleSize }}>{title}</h1>
        <p className="leading-[1.3] tracking-[-0.005em] text-[#3e4440]" style={{ maxWidth: ledeWidth, marginTop: ledeGap, fontSize: ledeSize }}>{lede}</p>
      </div>
      {quote && (
        <div className="absolute right-[11px] rounded-[6px] bg-[#f5efe5] px-[19px] py-[16px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]" style={{ top: quoteTop, width: quoteWidth }}>
          <p className="serif text-[19.5px] leading-[1.15] tracking-[-0.02em] text-[#1d211e]">
            {quote.map((l) => <span key={l} className="block whitespace-nowrap">{l}</span>)}
          </p>
          <Leaf className="absolute bottom-[12px] right-[10px] size-[26px] -rotate-12 text-cs-green-2" strokeWidth={1} />
        </div>
      )}
    </section>
  );
}

/** Card titles on these screens set at the mockups' size (shared CardTitle is 20px). */
export function CT({ children }: { children: React.ReactNode }) {
  return <span className="text-[17.5px] tracking-[-0.02em]">{children}</span>;
}

const PEOPLE: Record<string, string> = {
  "Priya Sharma": "/console/av-priya-sm.jpg",
  "Rohit Mehta": "/console/av-rohit.jpg",
  "Anjali Desai": "/console/av-anjali.jpg",
  "Amit Verma": "/console/av-amit.jpg",
};

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const img = PEOPLE[name];
  if (img) return <Image src={img} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return <span className="grid shrink-0 place-items-center rounded-full bg-cs-mint text-[11px] font-semibold text-cs-green" style={{ width: size, height: size }}>{initials}</span>;
}

/** Full-size image viewer with previous/next. */
export function Lightbox({ images, index, onClose, onIndex }: { images: { src: string; label?: string }[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  useEffect(() => {
    if (index === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onIndex((index + 1) % images.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + images.length) % images.length);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [index, images.length, onIndex]);
  if (index === null || !images[index]) return null;
  const im = images[index];
  return (
    <Modal open onClose={onClose} title={im.label ?? "Preview"} sub={`${index + 1} of ${images.length}`} width={760}>
      <div className="relative">
        <Image src={im.src} alt={im.label ?? ""} width={1200} height={800} className="max-h-[60dvh] w-full rounded-[8px] bg-[#f7f2ea] object-contain" />
        {images.length > 1 && (
          <>
            <button type="button" aria-label="Previous image" onClick={() => onIndex((index - 1 + images.length) % images.length)} className="absolute left-[10px] top-1/2 grid size-[36px] -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow"><ChevronLeft className="size-[18px]" /></button>
            <button type="button" aria-label="Next image" onClick={() => onIndex((index + 1) % images.length)} className="absolute right-[10px] top-1/2 grid size-[36px] -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow"><ChevronRight className="size-[18px]" /></button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-[12px] flex gap-[8px]">
          {images.map((x, i) => (
            <button key={x.src + i} type="button" onClick={() => onIndex(i)} className={cn("overflow-hidden rounded-[6px] border-2", i === index ? "border-cs-green" : "border-transparent")}>
              <Image src={x.src} alt="" width={120} height={90} className="h-[54px] w-[72px] object-cover" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

/** Compose a message to a manufacturer/carrier; logged to the activity feed. */
export function MessageModal({ open, onClose, to, subject: initial, href, tag = "Manufacturer" }: { open: boolean; onClose: () => void; to: string; subject: string; href: string; tag?: Activity["tag"] }) {
  const { update, toast } = useConsole();
  const [subject, setSubject] = useState(initial);
  const [body, setBody] = useState("");
  useEffect(() => { if (open) { setSubject(initial); setBody(""); } }, [open, initial]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Message ${to}`}
      sub="Sent from your Scouthru workspace; replies land in the activity feed."
      footer={<>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" icon={Send} disabled={!subject.trim() || !body.trim()} onClick={() => { update((d) => sendMessage(d, to, subject.trim(), body.trim(), href, tag)); toast(`Message sent to ${to}`); onClose(); }}>Send</Btn>
      </>}
    >
      <div className="space-y-[12px]">
        <Field label="Subject"><input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Message"><textarea className={textareaCls} rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" autoFocus /></Field>
      </div>
    </Modal>
  );
}

/** Small "loading" placeholder while the saved workspace is read from the browser. */
export function Loading() {
  return <div className="px-[15px] py-[40px] text-center text-[13px] text-cs-ink-2">Loading workspace…</div>;
}

export const SAMPLE_TONE: Record<string, Tone> = {
  Draft: "gray", Submitted: "gray", "In Review": "green", Testing: "blue", Feedback: "orange", "Changes Requested": "orange", Approved: "green", Rejected: "red",
};
export const BATCH_TONE: Record<string, Tone> = { Completed: "green", "In Progress": "blue", Pending: "orange" };
export const QB_TONE: Record<string, Tone> = { "In Testing": "blue", Passed: "green", "Issues Found": "red", "Re-test": "orange" };
