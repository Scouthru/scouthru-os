"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft, BadgeCheck, CalendarDays, Camera, Check, CheckCircle2, FileText, Mail, MessageCircle, NotebookPen, Phone, Send, Star, Trash2, UserRound, X,
} from "lucide-react";
import { Btn, Field, inputCls, textareaCls } from "@/components/console/kit";
import { Box, DropZone, FilePreview, StagePill, StageTrack, TypeBadge } from "@/components/hq/ui";
import { openHq } from "@/components/hq/shell";
import { EXPIRING, NEEDS_VISIT, PACKS, PHOTO_KINDS, VISIT_CHECKS, guessDoc, guessPhoto, progress } from "@/lib/hq/rules";
import { goLive, log, useHq } from "@/lib/hq/store";
import { fmtSize } from "@/lib/hq/files";
import type { Doc, Member } from "@/lib/hq/types";
import { ago, fmtDate } from "@/lib/console/format";
import { cn } from "@/lib/cn";

const REJECT_REASONS = ["Scan is unreadable", "Expired", "Wrong document", "Name doesn't match the company"];
const STATE_BADGE = {
  approved: ["Approved", "bg-cs-ok-bg text-cs-ok"],
  check: ["To check", "bg-cs-orange-bg text-[#b8641f]"],
  rejected: ["Rejected", "bg-cs-red-bg text-cs-red"],
  missing: ["Missing", "bg-[#f1efe9] text-cs-ink-2"],
} as const;

/** One member's file: details, documents, visit and photos, messages, notes. */
export default function MemberFile() {
  const { id } = useParams<{ id: string }>();
  const { s, update, toast, addDocs, addPhotos, removeDoc, removePhoto } = useHq();
  const m = s.members.find((x) => x.id === id);
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<{ fileKey?: string; name: string; thumb?: string; title: string } | null>(null);

  if (!m) {
    return (
      <div className="grid place-items-center py-[80px] text-center">
        <p className="serif text-[24px] font-semibold">Member not found</p>
        <Link href="/hq/members" className="mt-[10px] text-[13.5px] font-medium text-cs-green hover:underline">Back to members</Link>
      </div>
    );
  }

  const p = progress(s, m);
  const photos = s.photos.filter((x) => x.memberId === m.id);
  const sends = s.sends.filter((x) => x.memberId === m.id);
  const edit = (fn: (x: Member) => void) => update((d) => fn(d.members.find((y) => y.id === m.id)!));
  const send = (pack: string) => openHq("send", { memberId: m.id, pack });

  const primary =
    p.stage === "New" ? (p.detailsOk ? <Btn kind="primary" icon={Send} onClick={() => send("Welcome kit")}>Send welcome kit</Btn> : <a href="#details" className="inline-flex h-[38px] items-center rounded-[7px] bg-cs-green px-[14px] text-[13px] font-medium text-white">Fill in details</a>)
    : p.stage === "Documents" ? (p.toCheck.length ? <a href="#documents" className="inline-flex h-[38px] items-center rounded-[7px] bg-cs-green px-[14px] text-[13px] font-medium text-white">Check {p.toCheck.length} document{p.toCheck.length === 1 ? "" : "s"}</a> : <Btn kind="primary" icon={MessageCircle} onClick={() => send("Missing documents reminder")}>Chase missing documents</Btn>)
    : p.stage === "Visit" ? <a href="#visit" className="inline-flex h-[38px] items-center rounded-[7px] bg-cs-green px-[14px] text-[13px] font-medium text-white">{m.visit?.date ? "Write the visit report" : "Book the visit"}</a>
    : p.stage === "Review" ? <Btn kind="primary" icon={BadgeCheck} onClick={() => { update((d) => goLive(d, m.id)); toast(`${m.name} is live · login details sent`); }}>Approve and go live</Btn>
    : null;

  const SECTIONS: [string, string, boolean][] = [
    ["details", "Details", p.detailsOk],
    ["documents", `Documents · ${p.checklist.filter((c) => c.state === "approved").length}/${p.checklist.length}`, p.checklist.every((c) => c.state === "approved")],
    ...(NEEDS_VISIT[m.type] ? [["visit", "Visit and photos", !!m.visit?.done && p.photos >= p.needPhotos] as [string, string, boolean]] : []),
    ["messages", `Messages · ${sends.length}`, p.welcomed],
    ["notes", "Notes", false],
  ];

  return (
    <div className="grid gap-[16px]">
      <Link href="/hq/members" className="inline-flex w-fit items-center gap-[6px] text-[13px] text-cs-ink-2 hover:text-cs-green"><ArrowLeft className="size-[15px]" />Members</Link>

      <section className="rounded-[14px] border border-cs-line bg-white p-[18px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="serif text-[30px] font-semibold leading-tight tracking-[-0.02em]">{m.name}</h1>
            <p className="mt-[5px] flex flex-wrap items-center gap-[8px] text-[13px] text-cs-ink-2">
              <TypeBadge type={m.type} /><StagePill stage={p.stage} />{m.city}{m.state && `, ${m.state}`} · joined {ago(m.createdAt)}
              {m.liveAt && <span>· live since {fmtDate(m.liveAt)}</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-[8px]">
            {m.phone && <a href={`tel:+91${m.phone}`} className="inline-flex h-[38px] items-center gap-[6px] rounded-[7px] border border-cs-line px-[12px] text-[13px] font-medium hover:border-[#cfcac0]"><Phone className="size-[15px]" />Call</a>}
            <Btn icon={Send} onClick={() => send(PACKS[0])}>Message</Btn>
            {primary}
          </div>
        </div>
        <div className="mt-[16px]"><StageTrack s={s} m={m} /></div>
        <p className="mt-[10px] text-[13px]"><b className="font-semibold">Next:</b> {p.nextText}</p>
      </section>

      <div className="grid gap-[16px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="hidden lg:block" aria-label="Sections">
          <ol className="sticky top-[130px] grid gap-[2px]">
            {SECTIONS.map(([key, label, done], i) => (
              <li key={key}>
                <a href={`#${key}`} className="flex items-center gap-[9px] rounded-[8px] px-[10px] py-[8px] text-[13px] hover:bg-white">
                  <span className={cn("grid size-[20px] shrink-0 place-items-center rounded-full text-[11px] font-semibold", done ? "bg-cs-green text-white" : "bg-white text-cs-ink-2 ring-1 ring-cs-line")}>{done ? <Check className="size-[12px]" /> : i + 1}</span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="grid gap-[16px]">
          {/* 1 Details */}
          <div id="details" className="scroll-mt-[130px]">
            <Box title="1 · Details" icon={UserRound} sub="Saves as you type">
              <div className="grid gap-[10px] sm:grid-cols-3">
                <Field label="Company name"><input className={inputCls} value={m.name} onChange={(e) => edit((x) => { x.name = e.target.value; })} /></Field>
                <Field label="Contact (role)"><input className={inputCls} value={m.contactRole} onChange={(e) => edit((x) => { x.contactRole = e.target.value; })} /></Field>
                <Field label="Mobile (WhatsApp)"><input className={inputCls} value={m.phone} inputMode="numeric" onChange={(e) => edit((x) => { x.phone = e.target.value.replace(/\D/g, "").slice(0, 10); })} /></Field>
                <Field label="Email"><input className={inputCls} type="email" value={m.email} onChange={(e) => edit((x) => { x.email = e.target.value; })} /></Field>
                <Field label="City"><input className={inputCls} value={m.city} onChange={(e) => edit((x) => { x.city = e.target.value; })} /></Field>
                <Field label="State"><input className={inputCls} value={m.state} onChange={(e) => edit((x) => { x.state = e.target.value; })} /></Field>
              </div>
            </Box>
          </div>

          {/* 2 Documents */}
          <div id="documents" className="scroll-mt-[130px]">
            <Box title="2 · Documents" icon={FileText} sub={p.missingDocs.length ? `${p.missingDocs.length} missing${p.toCheck.length ? ` · ${p.toCheck.length} to check` : ""}` : p.toCheck.length ? `${p.toCheck.length} to check` : "All approved"}
              right={
                <label className="flex cursor-pointer items-center gap-[8px] text-[12.5px] text-[#3e4440]">
                  <input type="checkbox" checked={m.autoRemind} onChange={(e) => edit((x) => { x.autoRemind = e.target.checked; })} className="size-[15px] accent-[#a8461f]" />
                  Chase missing documents every 3 days
                </label>
              }>
              <ul className="divide-y divide-cs-line">
                {p.checklist.map((c) => <DocRow key={c.kind} m={m} c={c} onOpen={(d) => setPreview({ fileKey: d.fileKey, name: d.name, title: `${d.kind} · ${m.name}` })} onRemove={removeDoc} />)}
              </ul>
              <div className="mt-[12px]">
                <DropZone compact onFiles={(files) => addDocs(m.id, files.map((file) => ({ file, kind: guessDoc(file.name, p.missingDocs) })))} label="Drop documents for this member" hint="Each file is matched by its name · you can change it after" />
              </div>
              {p.missingDocs.length > 0 && <Btn icon={MessageCircle} className="mt-[10px]" onClick={() => send("Missing documents reminder")}>Ask for the {p.missingDocs.length} missing</Btn>}
            </Box>
          </div>

          {/* 3 Visit and photos */}
          {NEEDS_VISIT[m.type] && (
            <div id="visit" className="scroll-mt-[130px]">
              <Box title="3 · Visit and photos" icon={CalendarDays} sub={m.visit?.done ? `Done · scored ${m.visit.score ?? "–"}/5` : m.visit?.date ? `Booked for ${fmtDate(m.visit.date)}` : "Not booked yet"}>
                <div className="grid gap-[16px] xl:grid-cols-2">
                  <div className="grid content-start gap-[10px]">
                    <Field label="Visit date"><input type="date" className={inputCls} value={m.visit?.date ?? ""} onChange={(e) => edit((x) => { x.visit = { date: e.target.value, done: x.visit?.done ?? false, checks: x.visit?.checks ?? {}, notes: x.visit?.notes ?? "", score: x.visit?.score }; })} /></Field>
                    <div>
                      <span className="mb-[5px] block text-[12px] font-medium text-[#3e4440]">What we checked</span>
                      <ul className="grid gap-[2px]">
                        {VISIT_CHECKS[m.type].map((c) => (
                          <li key={c}>
                            <label className={cn("flex items-center gap-[9px] rounded-[7px] px-[6px] py-[6px] text-[13px]", m.visit?.date ? "cursor-pointer hover:bg-[#f7f5f0]" : "opacity-50")}>
                              <input type="checkbox" disabled={!m.visit?.date} checked={!!m.visit?.checks[c]} onChange={(e) => edit((x) => { x.visit!.checks[c] = e.target.checked; })} className="size-[15px] accent-[#a8461f]" />{c}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="mb-[5px] block text-[12px] font-medium text-[#3e4440]">Overall score</span>
                      <div className="flex gap-[4px]">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" disabled={!m.visit?.date} onClick={() => edit((x) => { x.visit!.score = n; })} aria-label={`${n} out of 5`} className="disabled:opacity-40">
                            <Star className={cn("size-[24px]", (m.visit?.score ?? 0) >= n ? "fill-cs-amber text-cs-amber" : "text-[#d8d2c4]")} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <Field label="Notes"><textarea className={cn(textareaCls, "h-[70px]")} disabled={!m.visit?.date} value={m.visit?.notes ?? ""} onChange={(e) => edit((x) => { x.visit!.notes = e.target.value; })} placeholder="Machines, hygiene, capacity, people…" /></Field>
                    <Btn kind={m.visit?.done ? "outline" : "primary"} icon={CheckCircle2} disabled={!m.visit?.date || (!m.visit.done && !m.visit.score)}
                      onClick={() => { const done = !m.visit?.done; edit((x) => { x.visit!.done = done; }); if (done) update((d) => log(d, `Visit done at ${m.name} · ${m.visit?.score}/5`, m.id)); toast(done ? "Visit report saved" : "Visit reopened", "info"); }}>
                      {m.visit?.done ? "Visit done · reopen" : m.visit?.score ? "Save the visit report" : "Give a score to finish"}
                    </Btn>
                  </div>
                  <div id="photos" className="scroll-mt-[130px]">
                    <p className="mb-[6px] flex items-center gap-[7px] text-[13px] font-semibold"><Camera className="size-[15px] text-cs-green-2" />Photos · {p.photos} of {p.needPhotos} needed</p>
                    <DropZone compact accept="image/*" onFiles={(files) => { const have = photos.map((x) => x.kind); addPhotos(m.id, files.map((file) => { const kind = guessPhoto(file.name, PHOTO_KINDS[m.type], have); have.push(kind); return { file, kind }; })); }} label="Drop visit photos" hint={PHOTO_KINDS[m.type].join(" · ")} />
                    {photos.length > 0 && (
                      <div className="mt-[10px] grid grid-cols-2 gap-[8px] sm:grid-cols-3">
                        {photos.map((x) => (
                          <figure key={x.id} className="overflow-hidden rounded-[9px] border border-cs-line bg-[#f3f0e9]">
                            <button type="button" onClick={() => setPreview({ fileKey: x.fileKey, name: x.name, thumb: x.thumb, title: `${x.kind} · ${m.name}` })} className="block aspect-[4/3] w-full" title="Open">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={x.thumb} alt={x.kind} className="size-full object-cover" />
                            </button>
                            <figcaption className="flex items-center gap-[4px] bg-white px-[7px] py-[5px]">
                              <select value={x.kind} onChange={(e) => update((d) => { d.photos.find((y) => y.id === x.id)!.kind = e.target.value; })} className="min-w-0 flex-1 truncate bg-transparent text-[11.5px] outline-none" aria-label="Photo of">
                                {PHOTO_KINDS[m.type].map((k) => <option key={k}>{k}</option>)}
                              </select>
                              <button type="button" onClick={() => { removePhoto(x.id); toast("Photo removed", "info"); }} aria-label="Remove photo" className="text-cs-ink-2 hover:text-cs-red"><Trash2 className="size-[13px]" /></button>
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Box>
            </div>
          )}

          {/* 4 Messages */}
          <div id="messages" className="scroll-mt-[130px]">
            <Box title={`${NEEDS_VISIT[m.type] ? 4 : 3} · Messages`} icon={Send} sub="WhatsApp and email · automatic ones marked">
              {sends.length === 0 ? <p className="text-[13px] text-cs-ink-2">Nothing sent yet.</p> : (
                <ul className="grid gap-[6px]">
                  {sends.map((x) => (
                    <li key={x.id} className="flex items-center gap-[9px] text-[13px]">
                      {x.channel === "WhatsApp" ? <MessageCircle className="size-[15px] shrink-0 text-cs-ok" /> : <Mail className="size-[15px] shrink-0 text-cs-blue" />}
                      <span className="flex-1">{x.pack}{x.auto && <span className="ml-[6px] rounded-full bg-[#f1efe9] px-[6px] text-[10.5px] text-cs-ink-2">automatic</span>}</span>
                      <span className="text-[11.5px] text-cs-ink-2">{ago(x.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-[10px] flex flex-wrap gap-[6px]">
                {PACKS.map((pk) => (
                  <button key={pk} type="button" onClick={() => send(pk)} className="rounded-full border border-cs-line px-[10px] py-[4px] text-[12px] hover:border-cs-green-2/60 hover:text-cs-green">{pk}</button>
                ))}
              </div>
            </Box>
          </div>

          {/* 5 Notes */}
          <div id="notes" className="scroll-mt-[130px]">
            <Box title={`${NEEDS_VISIT[m.type] ? 5 : 4} · Notes`} icon={NotebookPen}>
              <form onSubmit={(e) => { e.preventDefault(); const t = note.trim(); if (!t) return; edit((x) => { x.notes.unshift({ at: new Date().toISOString(), text: t }); }); setNote(""); }}>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note and press Enter" className={inputCls} aria-label="New note" />
              </form>
              <ul className="mt-[10px] grid gap-[8px]">
                {m.notes.map((n, i) => (
                  <li key={i} className="rounded-[8px] bg-[#faf8f4] px-[10px] py-[8px] text-[13px]">{n.text}<span className="mt-[2px] block text-[11px] text-cs-ink-2">{ago(n.at)}</span></li>
                ))}
              </ul>
            </Box>
          </div>
        </div>
      </div>

      {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

type CheckItem = ReturnType<typeof progress>["checklist"][number];

/** One required document: its state, the copy on file, and approve / reject. */
function DocRow({ m, c, onOpen, onRemove }: { m: Member; c: CheckItem; onOpen: (d: Doc) => void; onRemove: (id: string) => void }) {
  const { update, toast } = useHq();
  const [validTill, setValidTill] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [label, tone] = STATE_BADGE[c.state];
  const d = c.best;
  const needsDate = EXPIRING.includes(c.kind);

  const approve = () => {
    update((st) => {
      const x = st.docs.find((y) => y.id === d!.id)!;
      x.status = "Approved";
      if (needsDate) x.validTill = validTill;
      log(st, `${x.kind} approved for ${m.name}`, m.id);
    });
    toast(`${c.kind} approved`);
  };
  const reject = (reason: string) => {
    update((st) => {
      const x = st.docs.find((y) => y.id === d!.id)!;
      x.status = "Rejected";
      x.reason = reason;
      log(st, `${x.kind} from ${m.name} rejected: ${reason.toLowerCase()}`, m.id);
    });
    setRejecting(false);
    toast(`${c.kind} rejected`, "info");
  };

  return (
    <li className="py-[11px]">
      <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[6px]">
        <span className={cn("grid size-[22px] shrink-0 place-items-center rounded-full", c.state === "approved" ? "bg-cs-ok-bg text-cs-ok" : "bg-[#f3f0e9] text-cs-ink-2")}>
          {c.state === "approved" ? <Check className="size-[13px]" /> : <span className="size-[6px] rounded-full bg-current" />}
        </span>
        <span className="min-w-[150px] flex-1 text-[13.5px] font-medium">{c.kind}</span>
        <span className={cn("rounded-full px-[8px] py-[2px] text-[11px] font-medium", tone)}>{label}</span>
        {c.state === "approved" && d?.validTill && <span className="text-[11.5px] text-cs-ink-2">valid till {fmtDate(d.validTill)}</span>}
        {c.state === "rejected" && d?.reason && <span className="text-[11.5px] text-cs-red">{d.reason}</span>}
      </div>
      {d && (
        <div className="ml-[32px] mt-[7px] flex flex-wrap items-center gap-x-[10px] gap-y-[6px] rounded-[8px] bg-[#faf8f4] px-[10px] py-[7px] text-[12.5px]">
          <button type="button" onClick={() => onOpen(d)} className="min-w-0 flex-1 truncate text-left hover:text-cs-green hover:underline" title="Open">{d.name}</button>
          <span className="text-[11.5px] text-cs-ink-2">{fmtSize(d.size)} · {ago(d.at)}</span>
          {c.state === "check" && !rejecting && (
            <>
              {needsDate && <input type="date" value={validTill} onChange={(e) => setValidTill(e.target.value)} className="h-[30px] rounded-[6px] border border-cs-line bg-white px-[6px] text-[12px]" aria-label="Valid till" title="Valid till" />}
              <button type="button" disabled={needsDate && !validTill} onClick={approve} className="inline-flex items-center gap-[3px] font-medium text-cs-ok hover:underline disabled:opacity-40 disabled:no-underline" title={needsDate && !validTill ? "Enter the valid-till date first" : undefined}><Check className="size-[13px]" />Approve</button>
              <button type="button" onClick={() => setRejecting(true)} className="inline-flex items-center gap-[3px] text-cs-red hover:underline"><X className="size-[13px]" />Reject</button>
            </>
          )}
          {rejecting && (
            <span className="flex flex-wrap items-center gap-[6px]">
              <span className="text-[11.5px] text-cs-ink-2">Why?</span>
              {REJECT_REASONS.map((r) => <button key={r} type="button" onClick={() => reject(r)} className="rounded-full border border-cs-red/40 px-[8px] py-[2px] text-[11.5px] text-cs-red hover:bg-cs-red-bg">{r}</button>)}
              <button type="button" onClick={() => setRejecting(false)} className="text-[11.5px] text-cs-ink-2 hover:underline">Cancel</button>
            </span>
          )}
          <button type="button" onClick={() => onRemove(d.id)} aria-label={`Remove ${d.name}`} className="text-cs-ink-2 hover:text-cs-red"><Trash2 className="size-[14px]" /></button>
        </div>
      )}
      {needsDate && c.state === "check" && !validTill && !rejecting && <p className="ml-[32px] mt-[4px] text-[11px] text-cs-ink-2">Enter the valid-till date to approve. HQ reminds them before it runs out.</p>}
    </li>
  );
}

