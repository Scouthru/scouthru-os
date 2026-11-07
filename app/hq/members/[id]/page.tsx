"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft, BadgeCheck, CalendarDays, Camera, Check, CheckCircle2, FileText, Mail, MessageCircle, NotebookPen, Phone, Send, Star, UserRound,
} from "lucide-react";
import { Btn, Field, inputCls, textareaCls } from "@/components/console/kit";
import { Box, StagePill, StageTrack, TypeBadge } from "@/components/hq/ui";
import { DocBoxes, PhotoBoxes } from "@/components/hq/onboarding-kit";
import { openHq, useHqMe } from "@/components/hq/shell";
import { Conversation } from "@/components/hq/chat";
import { ROLE_LABEL } from "@/lib/hq/team";
import { NEEDS_VISIT, PACKS, VISIT_CHECKS, progress } from "@/lib/hq/rules";
import { goLive, log, useHq } from "@/lib/hq/store";
import type { Member, Role } from "@/lib/hq/types";
import { ago, fmtDate } from "@/lib/console/format";
import { cn } from "@/lib/cn";

/** One member's file: details, documents, visit and photos, messages, notes. */
export default function MemberFile() {
  const { id } = useParams<{ id: string }>();
  const { s, update, toast } = useHq();
  const me = useHqMe();
  const m = s.members.find((x) => x.id === id);
  const [note, setNote] = useState("");

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

  const ALL_SECTIONS: [string, string, boolean][] = [
    ["details", "Details", p.detailsOk],
    ["documents", `Documents · ${p.checklist.filter((c) => c.state === "approved").length}/${p.checklist.length}`, p.checklist.every((c) => c.state === "approved")],
    ...(NEEDS_VISIT[m.type] ? [["visit", "Visit and photos", !!m.visit?.done && p.photos >= p.needPhotos] as [string, string, boolean]] : []),
    ["messages", `Messages · ${sends.length}`, p.welcomed],
    ["discuss", "Team discussion", false],
    ["notes", "Notes", false],
  ];
  // Field visits see only what their job needs on a member's file.
  const SECTIONS = me.role === "field" ? ALL_SECTIONS.filter(([k]) => k !== "documents" && k !== "messages") : ALL_SECTIONS;

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
            {m.phone && <a href={`tel:+91${m.phone}`} className="inline-flex h-[38px] items-center gap-[6px] rounded-[7px] border border-cs-line px-[12px] text-[13px] font-medium hover:border-[#d0c7bf]"><Phone className="size-[15px]" />Call</a>}
            <Btn icon={Send} onClick={() => send(PACKS[0])}>Message</Btn>
            {primary}
          </div>
        </div>
        <div className="mt-[16px]"><StageTrack s={s} m={m} /></div>
        <p className="mt-[10px] text-[13px]"><b className="font-semibold">Next:</b> {p.nextText}</p>
        <div className="mt-[12px] flex flex-wrap gap-x-[18px] gap-y-[8px] border-t border-cs-line pt-[12px] text-[12.5px]">
          {(([["ownerId", "onboarding", "Onboarding by"], ["fieldId", "field", "Visit by"]] as [keyof Pick<Member, "ownerId" | "fieldId">, Role, string][]).filter(([k]) => k === "ownerId" || NEEDS_VISIT[m.type])).map(([key, role, label]) => (
            <label key={key} className="flex items-center gap-[8px] text-cs-ink-2">
              {label}
              <select value={m[key] ?? ""} disabled={me.role !== "owner" && me.role !== "onboarding"} onChange={(e) => edit((x) => { x[key] = e.target.value || undefined; })} className="h-[32px] rounded-[7px] border border-cs-line bg-white px-[8px] text-[12.5px] font-medium text-cs-ink" aria-label={label}>
                <option value="">Nobody yet</option>
                {s.team.filter((t) => t.active && (t.role === role || t.role === "owner")).map((t) => <option key={t.id} value={t.id}>{t.name} · {ROLE_LABEL[t.role]}</option>)}
              </select>
            </label>
          ))}
        </div>
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

          {me.role !== "field" && (<>
          {/* 2 Documents */}
          <div id="documents" className="scroll-mt-[130px]">
            <Box title="2 · Documents" icon={FileText} sub={p.missingDocs.length ? `${p.missingDocs.length} missing${p.toCheck.length ? ` · ${p.toCheck.length} to check` : ""}` : p.toCheck.length ? `${p.toCheck.length} to check` : "All approved"}
              right={
                <label className="flex cursor-pointer items-center gap-[8px] text-[12.5px] text-[#48413b]">
                  <input type="checkbox" checked={m.autoRemind} onChange={(e) => edit((x) => { x.autoRemind = e.target.checked; })} className="size-[15px] accent-[#9c3a1e]" />
                  Chase missing documents every 3 days
                </label>
              }>
              <DocBoxes m={m} />
              <p className="mt-[10px] text-[11.5px] text-cs-ink-2">Drop a file on a box to save it as that document. Several files at once? Drop them anywhere on this page and HQ sorts them by name.</p>
              {p.missingDocs.length > 0 && <Btn icon={MessageCircle} className="mt-[10px]" onClick={() => send("Missing documents reminder")}>Ask for the {p.missingDocs.length} missing</Btn>}
            </Box>
          </div>
          </>)}

          {/* 3 Visit and photos */}
          {NEEDS_VISIT[m.type] && (
            <div id="visit" className="scroll-mt-[130px]">
              <Box title="3 · Visit and photos" icon={CalendarDays} sub={m.visit?.done ? `Done · scored ${m.visit.score ?? "–"}/5` : m.visit?.date ? `Booked for ${fmtDate(m.visit.date)}` : "Not booked yet"}>
                <div className="grid gap-[16px] xl:grid-cols-2">
                  <div className="grid content-start gap-[10px]">
                    <Field label="Visit date"><input type="date" className={inputCls} value={m.visit?.date ?? ""} onChange={(e) => edit((x) => { x.visit = { date: e.target.value, done: x.visit?.done ?? false, checks: x.visit?.checks ?? {}, notes: x.visit?.notes ?? "", score: x.visit?.score }; })} /></Field>
                    <div>
                      <span className="mb-[5px] block text-[12px] font-medium text-[#48413b]">What we checked</span>
                      <ul className="grid gap-[2px]">
                        {VISIT_CHECKS[m.type].map((c) => (
                          <li key={c}>
                            <label className={cn("flex items-center gap-[9px] rounded-[7px] px-[6px] py-[6px] text-[13px]", m.visit?.date ? "cursor-pointer hover:bg-[#f9f5ee]" : "opacity-50")}>
                              <input type="checkbox" disabled={!m.visit?.date} checked={!!m.visit?.checks[c]} onChange={(e) => edit((x) => { x.visit!.checks[c] = e.target.checked; })} className="size-[15px] accent-[#9c3a1e]" />{c}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="mb-[5px] block text-[12px] font-medium text-[#48413b]">Overall score</span>
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
                    <p className="mb-[8px] flex items-center gap-[7px] text-[13px] font-semibold"><Camera className="size-[15px] text-cs-green-2" />Photos · {p.photos} of {p.needPhotos} needed</p>
                    <PhotoBoxes m={m} />
                  </div>
                </div>
              </Box>
            </div>
          )}

          {me.role !== "field" && (<>
          {/* 4 Messages */}
          <div id="messages" className="scroll-mt-[130px]">
            <Box title={`${NEEDS_VISIT[m.type] ? 4 : 3} · Messages`} icon={Send} sub="WhatsApp and email · automatic ones marked">
              {sends.length === 0 ? <p className="text-[13px] text-cs-ink-2">Nothing sent yet.</p> : (
                <ul className="grid gap-[6px]">
                  {sends.map((x) => (
                    <li key={x.id} className="flex items-center gap-[9px] text-[13px]">
                      {x.channel === "WhatsApp" ? <MessageCircle className="size-[15px] shrink-0 text-cs-ok" /> : <Mail className="size-[15px] shrink-0 text-cs-blue" />}
                      <span className="flex-1">{x.pack}{x.auto && <span className="ml-[6px] rounded-full bg-[#f5efe5] px-[6px] text-[10.5px] text-cs-ink-2">automatic</span>}</span>
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
          </>)}

          {/* Team discussion: everything said about this member, in one thread */}
          <div id="discuss" className="scroll-mt-[130px]">
            <section className="flex flex-col overflow-hidden rounded-[14px] border border-cs-line bg-white">
              <div className="border-b border-cs-line px-[18px] py-[12px]">
                <h2 className="serif text-[19px] font-semibold leading-tight">Team discussion</h2>
                <p className="text-[12px] text-cs-ink-2">Talk about {m.name} here so it stays with their file. @mention someone to bring them in.</p>
              </div>
              <Conversation to={`m:${m.id}`} compact />
            </section>
          </div>

          {/* 5 Notes */}
          <div id="notes" className="scroll-mt-[130px]">
            <Box title={`${NEEDS_VISIT[m.type] ? 5 : 4} · Notes`} icon={NotebookPen}>
              <form onSubmit={(e) => { e.preventDefault(); const t = note.trim(); if (!t) return; edit((x) => { x.notes.unshift({ at: new Date().toISOString(), text: t }); }); setNote(""); }}>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note and press Enter" className={inputCls} aria-label="New note" />
              </form>
              <ul className="mt-[10px] grid gap-[8px]">
                {m.notes.map((n, i) => (
                  <li key={i} className="rounded-[8px] bg-[#fbf8f3] px-[10px] py-[8px] text-[13px]">{n.text}<span className="mt-[2px] block text-[11px] text-cs-ink-2">{ago(n.at)}</span></li>
                ))}
              </ul>
            </Box>
          </div>
        </div>
      </div>

    </div>
  );
}
