"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Download, Mail, MessageCircle, UploadCloud } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Btn, Field, Modal, inputCls, textareaCls } from "@/components/console/kit";
import { PACKS, PHOTO_KINDS, REQUIRED_DOCS, TYPE_ICON, TYPE_LABEL, progress, renewals } from "@/lib/hq/rules";
import { addMember, useHq } from "@/lib/hq/store";
import { getFile } from "@/lib/hq/files";
import type { HqState, Member, MemberType, Stage } from "@/lib/hq/types";
import { cn } from "@/lib/cn";

/** One box: a titled card. `href` turns the title into a link to that area's page. */
export function Box({ title, icon: Icon, sub, right, href, children, className }: { title: string; icon: LucideIcon; sub?: React.ReactNode; right?: React.ReactNode; href?: string; children: React.ReactNode; className?: string }) {
  const head = (
    <>
      <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-cs-mint text-cs-green-2"><Icon className="size-[17px]" strokeWidth={1.8} /></span>
      <span className="min-w-0">
        <span className="serif block truncate text-[19px] font-semibold leading-tight">{title}</span>
        {sub && <span className="block truncate text-[12px] text-cs-ink-2">{sub}</span>}
      </span>
    </>
  );
  return (
    <section className={cn("flex min-w-0 flex-col rounded-[14px] border border-cs-line bg-white p-[18px] shadow-[0_1px_2px_rgba(20,30,25,0.04)]", className)}>
      <div className="mb-[12px] flex flex-wrap items-start justify-between gap-3">
        {href ? <Link href={href} className="flex min-w-0 shrink-0 items-center gap-[10px] hover:text-cs-green">{head}</Link> : <h2 className="flex min-w-0 shrink-0 items-center gap-[10px]">{head}</h2>}
        {right}
      </div>
      {children}
    </section>
  );
}

/** Drag files here or click to pick. */
export function DropZone({ onFiles, accept, label, hint, compact, big }: { onFiles: (files: File[]) => void; accept?: string; label: string; hint?: string; compact?: boolean; big?: boolean }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = [...e.dataTransfer.files]; if (f.length) onFiles(f); }}
      className={cn(
        "grid cursor-pointer place-items-center rounded-[12px] border-2 border-dashed text-center transition-colors",
        compact ? "px-3 py-[14px]" : big ? "px-6 py-[46px]" : "px-4 py-[26px]",
        over ? "border-cs-green bg-cs-mint/60" : "border-[#e2dccf] bg-[#fcfaf6] hover:border-cs-green-2/60 hover:bg-cs-mint/30",
      )}
    >
      <UploadCloud className={cn("text-cs-green-2", compact ? "size-[20px]" : big ? "size-[38px]" : "size-[28px]")} strokeWidth={1.5} />
      <p className={cn("mt-[6px] font-medium", compact ? "text-[12.5px]" : big ? "text-[17px]" : "text-[14px]")}>{label}</p>
      {hint && <p className="mt-[3px] text-[12px] text-cs-ink-2">{hint}</p>}
      <input ref={input} type="file" multiple accept={accept} className="hidden" onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; if (f.length) onFiles(f); }} />
    </div>
  );
}

export function TypeBadge({ type, className }: { type: MemberType; className?: string }) {
  const Icon = TYPE_ICON[type];
  return (
    <span className={cn("inline-flex items-center gap-[5px] whitespace-nowrap rounded-full bg-cs-mint px-[8px] py-[2px] text-[11px] font-medium text-cs-green-2", className)}>
      <Icon className="size-[12px]" strokeWidth={1.8} />{TYPE_LABEL[type]}
    </span>
  );
}

const STAGE_TONE: Record<Stage, string> = {
  New: "bg-cs-blue-bg text-cs-blue",
  Documents: "bg-cs-orange-bg text-[#b8641f]",
  Visit: "bg-cs-violet-bg text-cs-violet",
  Review: "bg-cs-mint text-cs-green",
  Live: "bg-cs-ok-bg text-cs-ok",
};
export function StagePill({ stage, className }: { stage: Stage; className?: string }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-[8px] py-[2px] text-[11px] font-semibold", STAGE_TONE[stage], className)}>{stage}</span>;
}

/** The member's onboarding stages as a track, done ones ticked. `compact` drops the labels. */
export function StageTrack({ s, m, compact }: { s: HqState; m: Member; compact?: boolean }) {
  const p = progress(s, m);
  return (
    <ol className="flex gap-[4px]">
      {p.order.map((st, i) => {
        const done = i < p.index || p.stage === "Live";
        const now = i === p.index && p.stage !== "Live";
        return (
          <li key={st} className="flex-1">
            <span className={cn("block h-[6px] rounded-full", done ? "bg-cs-green" : now ? "bg-cs-orange/70" : "bg-[#ece8df]")} />
            {!compact && (
              <span className={cn("mt-[6px] flex items-center gap-[3px] text-[11.5px]", done ? "text-cs-green-2" : now ? "font-semibold text-cs-ink" : "text-cs-ink-2")}>
                {done && <Check className="size-[11px]" />}{st}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function MemberPick({ value, onChange, placeholder }: { value: string; onChange: (id: string) => void; placeholder?: string }) {
  const { s } = useHq();
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Member">
      {placeholder && <option value="">{placeholder}</option>}
      {s.members.map((m) => <option key={m.id} value={m.id}>{m.name} · {TYPE_LABEL[m.type]}</option>)}
    </select>
  );
}

export function MemberLink({ m, className }: { m: Member; className?: string }) {
  return <Link href={`/hq/members/${m.id}`} className={cn("truncate font-semibold hover:text-cs-green", className)}>{m.name}</Link>;
}

/** The message for each pack, filled in for this member. */
export function packText(pack: string, m: Member, s: HqState) {
  const { missingDocs } = progress(s, m);
  // Why the last copy was turned down, in words the member understands.
  const why: Record<string, string> = {
    "Scan is unreadable": "the last copy wasn't readable, please send a clearer one",
    Expired: "the last copy had expired, please send the current one",
    "Wrong document": "we received a different document",
    "Name doesn't match the company": "the name on it doesn't match your company",
  };
  const rejected = new Map(s.docs.filter((d) => d.memberId === m.id && d.status === "Rejected" && missingDocs.includes(d.kind)).map((d) => [d.kind, why[d.reason ?? ""] ?? "the last copy couldn't be accepted"]));
  const expiring = renewals(s).filter((r) => r.doc.memberId === m.id);
  const body: Record<string, string> = {
    "Welcome kit": "Welcome to Scouthru. Here is how the platform works, what to expect in the first week, and who to call.",
    "Onboarding checklist": `To go live we need: ${REQUIRED_DOCS[m.type].join(", ")}${PHOTO_KINDS[m.type].length && m.type !== "brand" ? `. Our team will also visit and take photos of your ${PHOTO_KINDS[m.type].slice(0, 3).join(", ").toLowerCase()}` : ""}.`,
    "Missing documents reminder": missingDocs.length
      ? `A quick reminder: we still need ${missingDocs.map((k) => (rejected.has(k) ? `${k} (${rejected.get(k)})` : k)).join(", ")}. A photo or PDF on this chat is fine.`
      : "Thank you, we have all your documents.",
    "Renewal reminder": expiring.length
      ? `Your ${expiring.map((r) => `${r.doc.kind} ${r.days < 0 ? "has expired" : `runs out in ${r.days} days`}`).join(" and ")}. Please send the renewed copy so your listing stays active.`
      : "All your licences are up to date.",
    "Plans and pricing": "Free: ₹0. Pro: ₹4,999 a month. Done for you: included in the order price.",
    "Agreement to sign": "Please review and sign the attached Scouthru partner agreement.",
    "Login details": `Your Scouthru account is ready. Sign in with ${m.email || m.phone} at scouthru.com.`,
  };
  return `Hello from Scouthru, ${m.name}.\n\n${body[pack]}`;
}

/** Send a pack to a member on WhatsApp or email. */
export function SendDialog({ pack: initialPack, memberId: initialMember, onClose }: { pack?: string; memberId?: string; onClose: () => void }) {
  const { s, send, toast } = useHq();
  const [memberId, setMemberId] = useState(initialMember ?? "");
  const [pack, setPack] = useState<string>(initialPack ?? PACKS[0]);
  const [channel, setChannel] = useState<"WhatsApp" | "Email">("WhatsApp");
  const m = s.members.find((x) => x.id === memberId);
  const [text, setText] = useState(() => (m ? packText(pack, m, s) : ""));
  const refresh = (p: string, id: string) => { const x = s.members.find((y) => y.id === id); setText(x ? packText(p, x, s) : ""); };

  return (
    <Modal
      open
      onClose={onClose}
      width={560}
      title="Send"
      sub="Demo: messages are logged here. Real WhatsApp and email sending arrives with the backend."
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={channel === "WhatsApp" ? MessageCircle : Mail} disabled={!m} onClick={() => { send(memberId, pack, channel); toast(`${pack} sent to ${m!.name}`); onClose(); }}>Send on {channel}</Btn></>}
    >
      <div className="grid gap-[12px]">
        <Field label="To"><MemberPick value={memberId} placeholder="Choose a member" onChange={(id) => { setMemberId(id); refresh(pack, id); }} /></Field>
        <Field label="What">
          <select className={inputCls} value={pack} onChange={(e) => { setPack(e.target.value); refresh(e.target.value, memberId); }}>
            {PACKS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-[8px]">
          {(["WhatsApp", "Email"] as const).map((c) => (
            <button key={c} type="button" onClick={() => setChannel(c)} className={cn("flex h-[40px] items-center justify-center gap-[7px] rounded-[8px] border text-[13px] font-medium", channel === c ? "border-cs-green bg-cs-mint/50 text-cs-green" : "border-cs-line")}>
              {c === "WhatsApp" ? <MessageCircle className="size-[15px]" /> : <Mail className="size-[15px]" />}{c}
              <span className="truncate text-[11.5px] font-normal text-cs-ink-2">{c === "WhatsApp" ? m?.phone && `+91 ${m.phone}` : m?.email}</span>
            </button>
          ))}
        </div>
        <Field label="Message"><textarea className={cn(textareaCls, "h-[130px]")} value={text} onChange={(e) => setText(e.target.value)} placeholder="Choose a member to fill this in" /></Field>
      </div>
    </Modal>
  );
}

/** Add a new member to onboard. */
export function AddMemberDialog({ name: initialName = "", onClose, onAdded }: { name?: string; onClose: () => void; onAdded: (id: string) => void }) {
  const { update, toast } = useHq();
  const [f, setF] = useState({ name: initialName, type: "maker" as MemberType, city: "", state: "", contactRole: "", phone: "", email: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const ok = f.name.trim() && f.city.trim() && (/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, "").slice(-10)) || /\S+@\S+\.\S+/.test(f.email));

  const save = () => {
    let id = "";
    update((d) => { id = addMember(d, { ...f, name: f.name.trim(), city: f.city.trim(), phone: f.phone.replace(/\D/g, "").slice(-10) }); });
    toast(`${f.name.trim()} added`);
    onAdded(id);
  };

  return (
    <Modal open onClose={onClose} width={560} title="Add a member" sub="Starts their onboarding at New. Fill in the rest later."
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!ok} onClick={save}>Add member</Btn></>}>
      <div className="grid gap-[12px] sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Company name"><input className={inputCls} value={f.name} onChange={set("name")} autoFocus /></Field></div>
        <Field label="Type">
          <select className={inputCls} value={f.type} onChange={set("type")}>
            {(Object.keys(TYPE_LABEL) as MemberType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </Field>
        <Field label="Contact (role)"><input className={inputCls} value={f.contactRole} onChange={set("contactRole")} placeholder="Owner, plant head…" /></Field>
        <Field label="City"><input className={inputCls} value={f.city} onChange={set("city")} /></Field>
        <Field label="State"><input className={inputCls} value={f.state} onChange={set("state")} /></Field>
        <Field label="Mobile (WhatsApp)"><input className={inputCls} value={f.phone} onChange={set("phone")} inputMode="numeric" placeholder="10 digits" /></Field>
        <Field label="Email"><input className={inputCls} value={f.email} onChange={set("email")} type="email" /></Field>
      </div>
      <p className="mt-[10px] text-[11.5px] text-cs-ink-2">Needs a company name, a city, and a mobile number or email.</p>
    </Modal>
  );
}

/** Look at a stored document or photo inside HQ: images and PDFs show here, other files download. */
export function FilePreview({ file, onClose }: { file: { fileKey?: string; name: string; thumb?: string; title: string }; onClose: () => void }) {
  const [state, setState] = useState<{ url?: string; type?: string; missing?: boolean }>({});
  useEffect(() => {
    let url = "";
    if (!file.fileKey) { setState({ missing: true }); return; }
    getFile(file.fileKey).then((b) => {
      if (!b) return setState({ missing: true });
      url = URL.createObjectURL(b);
      setState({ url, type: b.type });
    }).catch(() => setState({ missing: true }));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [file.fileKey]);

  const image = state.type?.startsWith("image/") || (state.missing && file.thumb);
  return (
    <Modal open onClose={onClose} width={860} title={file.title} sub={file.name}
      footer={state.url ? <a href={state.url} download={file.name} className="inline-flex h-[38px] items-center gap-[7px] rounded-[7px] border border-cs-line px-[14px] text-[13px] font-medium hover:border-[#cfcac0]"><Download className="size-[15px]" />Download</a> : undefined}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={state.url ?? file.thumb} alt={file.title} className="mx-auto max-h-[65vh] rounded-[8px] object-contain" />
      ) : state.url && state.type === "application/pdf" ? (
        <iframe src={state.url} title={file.name} className="h-[65vh] w-full rounded-[8px] border border-cs-line" />
      ) : state.url ? (
        <p className="py-[30px] text-center text-[13px] text-cs-ink-2">This file type can&apos;t be shown here. Download it to open.</p>
      ) : state.missing ? (
        <p className="py-[30px] text-center text-[13px] text-cs-ink-2">This is example data. There&apos;s no file behind it.</p>
      ) : (
        <p className="py-[30px] text-center text-[13px] text-cs-ink-2">Opening…</p>
      )}
    </Modal>
  );
}

/**
 * One box in a member's onboarding kit: a single required document or photo. Drop a file on it
 * (or click when empty) and it's saved as exactly that item, so nothing has to be guessed.
 */
export function UploadTile({ label, tone, accept, onFiles, empty, compact, icon: Icon = UploadCloud, children }: {
  label: string;
  tone: "missing" | "check" | "approved" | "rejected";
  accept?: string;
  onFiles: (files: File[]) => void;
  /** Click-to-upload when nothing is there yet. */
  empty?: boolean;
  compact?: boolean;
  /** Shown in the empty box: a document or a camera. */
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const ring = { missing: "border-dashed border-[#ddd5c6] bg-[#fcfaf6]", check: "border-cs-orange/50 bg-cs-orange-bg/40", approved: "border-cs-ok/40 bg-cs-ok-bg/40", rejected: "border-cs-red/40 bg-cs-red-bg/40" }[tone];
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = [...e.dataTransfer.files]; if (f.length) onFiles(f); }}
      className={cn("relative flex flex-col rounded-[12px] border-2 transition-colors", compact ? "min-h-[118px] p-[9px]" : "min-h-[148px] p-[11px]", ring, over && "border-solid border-cs-green bg-cs-mint/70")}
    >
      <p className="pr-[24px] text-[12.5px] font-semibold leading-tight">{label}</p>
      {empty ? (
        <button type="button" onClick={() => input.current?.click()} className="mt-[6px] grid flex-1 place-items-center rounded-[8px] text-cs-ink-2 hover:bg-white/60 hover:text-cs-green">
          <span className="grid place-items-center">
            <span className="relative">
              <Icon className={compact ? "size-[22px]" : "size-[26px]"} strokeWidth={1.5} />
              <UploadCloud className="absolute -bottom-[5px] -right-[8px] size-[14px] rounded-full bg-[#fcfaf6] text-cs-green-2" strokeWidth={2} />
            </span>
            <span className="mt-[6px] text-[11.5px]">{compact ? "Drop or click" : "Drop or click to upload"}</span>
          </span>
        </button>
      ) : (
        <div className="mt-[6px] flex flex-1 flex-col">{children}</div>
      )}
      {!empty && (
        <button type="button" onClick={() => input.current?.click()} aria-label={`Upload a new ${label}`} title="Upload a new copy" className="absolute right-[8px] top-[8px] grid size-[24px] place-items-center rounded-[6px] text-cs-ink-2 hover:bg-white hover:text-cs-green">
          <UploadCloud className="size-[15px]" />
        </button>
      )}
      <input ref={input} type="file" multiple={accept?.startsWith("image")} accept={accept} className="hidden" onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; if (f.length) onFiles(f); }} />
    </div>
  );
}
