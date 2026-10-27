"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, BadgeIndianRupee, BellRing, CalendarDays, Camera, Check, CheckCircle2, ClipboardCheck, FileSearch, Hand, Inbox, ListTodo, MapPin,
  MessagesSquare, Phone, Plus, Send, ShieldAlert, Users,
} from "lucide-react";
import { Btn, Field, Modal, inputCls } from "@/components/console/kit";
import { AddMemberDialog, Box, DropZone, StagePill, StageTrack, TypeBadge } from "./ui";
import { KitPanel } from "./kit-panel";
import { PhotoBoxes } from "./onboarding-kit";
import { useHqMe } from "./shell";
import { daysFromToday, dueReminders, progress, quietDays, renewals } from "@/lib/hq/rules";
import { fmt, leaks, pending, reserve, short } from "@/lib/hq/finance";
import { ROLE_ICON, ROLE_LABEL, dmId, mentions, post, unread } from "@/lib/hq/team";
import { log, useHq } from "@/lib/hq/store";
import type { Enquiry, EnquiryStatus, HqState, Teammate } from "@/lib/hq/types";
import { ago, fmtDate, fmtDay } from "@/lib/console/format";
import { cn } from "@/lib/cn";

/**
 * One dashboard per role. Each shows only that person's work: what's assigned to them and
 * what their role is responsible for. The owner's dashboard is the home page itself.
 */

function Greeting({ sub }: { sub: string }) {
  const me = useHqMe();
  const hour = new Date().getHours();
  const Icon = ROLE_ICON[me.role];
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-cs-green-2">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</p>
        <h1 className="serif mt-[4px] text-[30px] font-semibold leading-tight tracking-[-0.02em]">{hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}, {me.name}</h1>
        <p className="mt-[2px] flex items-center gap-[6px] text-[13.5px] text-cs-ink-2"><Icon className="size-[15px] text-cs-green-2" />{ROLE_LABEL[me.role]} · {sub}</p>
      </div>
      <ChatPeek />
    </div>
  );
}

/** Unread chat and @mentions for me, one click to Chat. */
function ChatPeek() {
  const { s } = useHq();
  const me = useHqMe();
  const n = Object.values(unread(s, me)).reduce((a, x) => a + x, 0);
  const at = mentions(s, me).length;
  return (
    <Link href="/hq/chat" className={cn("inline-flex h-[40px] items-center gap-[8px] rounded-[10px] border px-[13px] text-[13px] font-medium", n ? "border-cs-green/50 bg-cs-mint/50 text-cs-green" : "border-cs-line bg-white")}>
      <MessagesSquare className="size-[16px]" />
      {n ? `${n} unread${at ? ` · ${at} mention${at === 1 ? "" : "s"} you` : ""}` : "Chat"}
    </Link>
  );
}

/** My tasks: things assigned to me, and adding one for myself. */
export function MyTasks({ className }: { className?: string }) {
  const { s, update } = useHq();
  const me = useHqMe();
  const [text, setText] = useState("");
  const mine = s.tasks.filter((t) => t.assigneeId === me.id || (!t.assigneeId && me.role === "owner"));
  return (
    <Box title="My tasks" icon={ListTodo} sub={`${mine.filter((t) => !t.done).length} open`} className={className}>
      <form className="mb-[8px] flex gap-[8px]" onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (!t) return; update((d) => { d.tasks.unshift({ id: `t${Date.now()}`, text: t, done: false, at: new Date().toISOString(), assigneeId: me.id }); }); setText(""); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task for yourself" className="h-[36px] min-w-0 flex-1 rounded-[8px] border border-[#d6d8d3] px-[11px] text-[13px] outline-none focus:border-cs-green" aria-label="New task" />
        <Btn icon={Plus} type="submit">Add</Btn>
      </form>
      <ul className="grid">
        {[...mine.filter((t) => !t.done), ...mine.filter((t) => t.done).slice(0, 2)].map((t) => (
          <li key={t.id}>
            <label className="flex cursor-pointer items-start gap-[9px] rounded-[7px] px-[5px] py-[6px] hover:bg-[#f7f5f0]">
              <input type="checkbox" checked={t.done} onChange={(e) => update((d) => { d.tasks.find((x) => x.id === t.id)!.done = e.target.checked; })} className="mt-[2px] size-[15px] accent-[#a8461f]" />
              <span className={cn("min-w-0 flex-1 text-[13px]", t.done && "text-cs-ink-2 line-through")}>{t.text}</span>
              {t.memberId && <Link href={`/hq/members/${t.memberId}`} className="shrink-0 text-[11.5px] text-cs-green hover:underline">Open</Link>}
            </label>
          </li>
        ))}
        {mine.length === 0 && <li className="py-[8px] text-center text-[12.5px] text-cs-ink-2">Nothing assigned to you.</li>}
      </ul>
    </Box>
  );
}

/** What each teammate has on their plate right now. */
function workload(s: HqState, t: Teammate) {
  const tasks = s.tasks.filter((x) => x.assigneeId === t.id && !x.done).length;
  const items: string[] = [];
  if (t.role === "onboarding") {
    const ms = s.members.filter((m) => m.ownerId === t.id && !m.liveAt);
    const check = ms.reduce((a, m) => a + progress(s, m).toCheck.length, 0);
    const quiet = ms.filter((m) => quietDays(s, m) >= 5).length;
    items.push(`${ms.length} members`, `${check} docs to check`);
    if (quiet) items.push(`${quiet} stalled`);
  }
  if (t.role === "field") {
    const v = s.members.filter((m) => m.fieldId === t.id && m.visit?.date && !m.visit.done);
    const late = v.filter((m) => daysFromToday(m.visit!.date) < 0).length;
    items.push(`${v.length} visits booked`);
    if (late) items.push(`${late} overdue`);
  }
  if (t.role === "sales") {
    items.push(`${s.enquiries.filter((e) => e.assigneeId === t.id && e.status !== "Won" && e.status !== "Lost").length} open enquiries`);
    const free = s.enquiries.filter((e) => !e.assigneeId && e.status === "New").length;
    if (free) items.push(`${free} unclaimed`);
  }
  if (t.role === "accounts") {
    const late = pending(s).receive.filter((v) => v.days < 0).length;
    items.push(`${pending(s).receive.length} invoices open`);
    if (late) items.push(`${late} overdue`);
  }
  if (tasks) items.push(`${tasks} tasks`);
  return items;
}

/** Owner only: the team at a glance, with a message button for each person. */
export function TeamBox() {
  const { s } = useHq();
  const me = useHqMe();
  return (
    <Box title="Team" icon={Users} href="/hq/team" sub="Who's working on what" right={<Link href="/hq/team" className="text-[12.5px] font-medium text-cs-green hover:underline">Manage</Link>}>
      <ul className="grid gap-[6px]">
        {s.team.filter((t) => t.active && t.id !== me.id).map((t) => {
          const Icon = ROLE_ICON[t.role];
          return (
            <li key={t.id} className="flex items-center gap-[10px] rounded-[10px] border border-cs-line p-[9px]">
              <span className="grid size-[32px] shrink-0 place-items-center rounded-full bg-cs-mint text-cs-green-2"><Icon className="size-[15px]" strokeWidth={1.8} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{t.name}</span>
                <span className="block truncate text-[11.5px] text-cs-ink-2">{workload(s, t).join(" · ")}</span>
              </span>
              <Link href={`/hq/chat?c=${encodeURIComponent(dmId(me.id, t.id))}`} aria-label={`Message ${t.name}`} className="grid size-[32px] shrink-0 place-items-center rounded-[8px] border border-cs-line text-cs-green-2 hover:border-cs-green-2/60"><MessagesSquare className="size-[15px]" /></Link>
            </li>
          );
        })}
      </ul>
    </Box>
  );
}

/* ───────────────────────── Onboarding ───────────────────────── */

export function OnboardingDesk() {
  const { s, toast, toInbox, send } = useHq();
  const me = useHqMe();
  const [kitFor, setKitFor] = useState("");
  const [adding, setAdding] = useState(false);
  const mine = s.members.filter((m) => m.ownerId === me.id && !m.liveAt).sort((a, b) => progress(s, a).index - progress(s, b).index);
  const kitMember = mine.find((m) => m.id === kitFor) ?? mine[0];
  const toCheck = mine.flatMap((m) => progress(s, m).toCheck.map((c) => ({ m, kind: c.kind })));
  const due = dueReminders(s).filter((r) => mine.some((m) => m.id === r.memberId));
  const review = mine.filter((m) => progress(s, m).stage === "Review");
  const pick = (id: string) => { setKitFor(id); setTimeout(() => document.getElementById("kit")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };

  return (
    <div className="grid gap-[16px]">
      <Greeting sub={`${mine.length} members onboarding with you · ${toCheck.length} documents to check`} />
      <div className="grid gap-[16px] lg:grid-cols-12">
        <div className="grid content-start gap-[16px] lg:col-span-7">
          <KitPanel member={kitMember} choices={mine} onPick={setKitFor} onNew={() => setAdding(true)} />
        </div>
        <div className="grid content-start gap-[16px] lg:col-span-5">
          <Box title="My members" icon={Users} sub="Furthest from live first">
            <ul className="grid gap-[8px]">
              {mine.map((m) => {
                const p = progress(s, m);
                const quiet = quietDays(s, m);
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => pick(m.id)} className={cn("block w-full rounded-[10px] border p-[10px] text-left hover:border-cs-green-2/60", m.id === kitMember?.id ? "border-cs-green/50 bg-cs-mint/30" : "border-cs-line")}>
                      <span className="flex items-center gap-[8px]"><span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{m.name}</span><StagePill stage={p.stage} /></span>
                      <span className="mt-[2px] block text-[11.5px] text-cs-ink-2">{p.nextText}{quiet >= 3 ? ` · quiet ${quiet} days` : ""}</span>
                      <span className="mt-[8px] block"><StageTrack s={s} m={m} compact /></span>
                    </button>
                  </li>
                );
              })}
              {mine.length === 0 && <li className="py-[10px] text-center text-[12.5px] text-cs-ink-2">No members assigned to you.</li>}
            </ul>
          </Box>

          <Box title="To check" icon={FileSearch} sub="Documents waiting for your approval">
            {toCheck.length === 0 ? <p className="text-[12.5px] text-cs-ink-2">Nothing to check.</p> : (
              <ul className="grid gap-[6px]">
                {toCheck.map(({ m, kind }) => (
                  <li key={m.id + kind}>
                    <button type="button" onClick={() => pick(m.id)} className="flex w-full items-center gap-[8px] rounded-[8px] px-[6px] py-[6px] text-left text-[13px] hover:bg-[#f7f5f0]">
                      <FileSearch className="size-[15px] shrink-0 text-cs-orange" /><span className="min-w-0 flex-1 truncate"><b className="font-semibold">{kind}</b> · {m.name}</span><ArrowRight className="size-[13px] text-cs-ink-2" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Box>

          <Box title="Chase" icon={BellRing} sub="Reminders due for your members"
            right={due.length > 0 ? <Btn kind="primary" icon={Send} onClick={() => { due.forEach((r) => send(r.memberId, r.pack, "WhatsApp", true)); toast(`${due.length} reminder${due.length === 1 ? "" : "s"} sent`); }}>Send {due.length}</Btn> : undefined}>
            {due.length === 0 ? <p className="text-[12.5px] text-cs-ink-2">Nobody to chase right now.</p> : (
              <ul className="grid gap-[6px]">{due.map((r) => <li key={r.key} className="text-[12.5px]"><b className="font-semibold">{s.members.find((m) => m.id === r.memberId)?.name}</b> · {r.why}</li>)}</ul>
            )}
          </Box>

          {review.length > 0 && (
            <Box title="With the owner" icon={ClipboardCheck} sub="Done from your side, waiting for approval">
              <ul className="grid gap-[4px]">{review.map((m) => <li key={m.id} className="text-[12.5px]">{m.name}</li>)}</ul>
            </Box>
          )}

          <Box title="Inbox" icon={Inbox} href="/hq/inbox" sub={s.inbox.length ? `${s.inbox.length} to file` : "Everything is filed"}>
            <DropZone compact onFiles={(files) => toInbox(files)} label="Drop anything here" hint="HQ works out whose it is" />
          </Box>

          <MyTasks />
        </div>
      </div>
      {adding && <AddMemberDialog onClose={() => setAdding(false)} onAdded={(id) => { setAdding(false); pick(id); }} />}
    </div>
  );
}

/* ───────────────────────── Field visits (phone first) ───────────────────────── */

export function FieldDesk() {
  const { s, update, toast } = useHq();
  const me = useHqMe();
  const mine = s.members.filter((m) => m.fieldId === me.id && !m.liveAt);
  const booked = mine.filter((m) => m.visit?.date && !m.visit.done).sort((a, b) => a.visit!.date.localeCompare(b.visit!.date));
  const today = booked.filter((m) => daysFromToday(m.visit!.date) <= 0);
  const later = booked.filter((m) => daysFromToday(m.visit!.date) > 0);
  const toBook = mine.filter((m) => progress(s, m).stage === "Visit" && !m.visit?.date);
  const photosLeft = mine.filter((m) => m.visit?.done && progress(s, m).photos < progress(s, m).needPhotos);
  const [open, setOpen] = useState<string | null>(today[0]?.id ?? null);

  const book = (id: string, date: string) => {
    update((d) => { const x = d.members.find((y) => y.id === id)!; x.visit = { date, done: false, checks: {}, notes: "" }; log(d, `Visit to ${x.name} booked for ${fmtDate(date)}`, id); });
    toast(`Booked for ${fmtDate(date)}`);
  };

  const Card = ({ id }: { id: string }) => {
    const m = s.members.find((x) => x.id === id)!;
    const days = daysFromToday(m.visit!.date);
    const p = progress(s, m);
    const expanded = open === m.id;
    return (
      <li className={cn("rounded-[12px] border bg-white", days < 0 ? "border-cs-red/40" : "border-cs-line")}>
        <button type="button" onClick={() => setOpen(expanded ? null : m.id)} className="flex w-full items-center gap-[12px] p-[12px] text-left">
          <span className={cn("grid size-[48px] shrink-0 place-content-center rounded-[9px] text-center leading-none", days < 0 ? "bg-cs-red-bg text-cs-red" : days === 0 ? "bg-cs-green text-white" : "bg-cs-cream")}>
            <span className="serif text-[18px] font-semibold">{fmtDay(m.visit!.date).split(" ")[0]}</span>
            <span className="text-[10.5px]">{fmtDay(m.visit!.date).split(" ")[1]}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{m.name}</span>
            <span className="flex flex-wrap items-center gap-[6px] text-[12px] text-cs-ink-2"><TypeBadge type={m.type} />{m.city}, {m.state}</span>
            <span className={cn("mt-[2px] block text-[12px] font-medium", days < 0 ? "text-cs-red" : "text-cs-green")}>{days < 0 ? `${-days} days late` : days === 0 ? "Today" : `In ${days} days`} · {p.photos}/{p.needPhotos} photos</span>
          </span>
        </button>
        {expanded && (
          <div className="border-t border-cs-line p-[12px]">
            <div className="grid grid-cols-3 gap-[8px]">
              <a href={`tel:+91${m.phone}`} className="flex h-[44px] items-center justify-center gap-[6px] rounded-[9px] border border-cs-line text-[13px] font-medium"><Phone className="size-[16px]" />Call</a>
              <a href={`https://www.google.com/maps/search/${encodeURIComponent(`${m.name} ${m.city} ${m.state}`)}`} target="_blank" rel="noopener noreferrer" className="flex h-[44px] items-center justify-center gap-[6px] rounded-[9px] border border-cs-line text-[13px] font-medium"><MapPin className="size-[16px]" />Directions</a>
              <Link href={`/hq/members/${m.id}#visit`} className="flex h-[44px] items-center justify-center gap-[6px] rounded-[9px] bg-cs-green text-[13px] font-medium text-white"><ClipboardCheck className="size-[16px]" />Report</Link>
            </div>
            <p className="mb-[8px] mt-[12px] flex items-center gap-[6px] text-[12.5px] font-semibold"><Camera className="size-[15px] text-cs-green-2" />Take the photos</p>
            <PhotoBoxes m={m} compact />
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="mx-auto grid max-w-[760px] gap-[16px]">
      <Greeting sub={`${today.length} visit${today.length === 1 ? "" : "s"} today or overdue · ${later.length} coming up`} />
      <Box title="Today" icon={CalendarDays} sub="Overdue first">
        {today.length === 0 ? <p className="text-[13px] text-cs-ink-2">No visits today.</p> : <ul className="grid gap-[10px]">{today.map((m) => <Card key={m.id} id={m.id} />)}</ul>}
      </Box>
      {later.length > 0 && (
        <Box title="Coming up" icon={CalendarDays}>
          <ul className="grid gap-[10px]">{later.map((m) => <Card key={m.id} id={m.id} />)}</ul>
        </Box>
      )}
      {toBook.length > 0 && (
        <Box title="To book" icon={CalendarDays} sub="Documents are in; pick a date">
          <ul className="grid gap-[8px]">
            {toBook.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-[10px] rounded-[10px] border border-dashed border-[#e2dccf] p-[10px]">
                <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">{m.name}</span><span className="text-[12px] text-cs-ink-2">{m.city}, {m.state}</span></span>
                <input type="date" min={new Date().toISOString().slice(0, 10)} onChange={(e) => e.target.value && book(m.id, e.target.value)} className="h-[40px] rounded-[8px] border border-cs-line bg-white px-[8px] text-[13px]" aria-label={`Visit date for ${m.name}`} />
              </li>
            ))}
          </ul>
        </Box>
      )}
      {photosLeft.length > 0 && (
        <Box title="Photos still missing" icon={Camera} sub="Visit done, photos not all in">
          <ul className="grid gap-[12px]">{photosLeft.map((m) => <li key={m.id}><p className="mb-[6px] text-[13px] font-semibold">{m.name}</p><PhotoBoxes m={m} compact /></li>)}</ul>
        </Box>
      )}
      <MyTasks />
    </div>
  );
}

/* ───────────────────────── Sales and operations ───────────────────────── */

const STATUS: EnquiryStatus[] = ["New", "Matched", "Quoted", "Won", "Lost"];

export function SalesDesk() {
  const { s, update, toast } = useHq();
  const me = useHqMe();
  const free = s.enquiries.filter((e) => !e.assigneeId && e.status === "New");
  const mine = s.enquiries.filter((e) => e.assigneeId === me.id && e.status !== "Won" && e.status !== "Lost").sort((a, b) => b.at.localeCompare(a.at));
  const followUp = mine.filter((e) => e.status === "Quoted" && Date.now() - new Date(e.at).getTime() > 2 * 864e5);
  const wonValue = s.enquiries.filter((e) => e.assigneeId === me.id && e.status === "Won").reduce((a, e) => a + (e.value ?? 0), 0);
  const factories = s.members.filter((m) => m.type === "maker" || m.type === "supplier");
  const set = (id: string, patch: Partial<Enquiry>, note?: string) => update((d) => { Object.assign(d.enquiries.find((x) => x.id === id)!, patch); if (note) log(d, note); });

  return (
    <div className="grid gap-[16px]">
      <Greeting sub={`${mine.length} open enquiries · ${free.length} waiting to be picked up · ${short(wonValue)} won`} />
      <div className="grid gap-[16px] lg:grid-cols-12">
        <div className="grid content-start gap-[16px] lg:col-span-8">
          <Box title="Pick up" icon={Hand} sub="New enquiries nobody has taken yet">
            {free.length === 0 ? <p className="text-[13px] text-cs-ink-2">Nothing waiting.</p> : (
              <ul className="divide-y divide-cs-line">
                {free.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-[10px] py-[10px]">
                    <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold">{e.product}</span><span className="text-[12px] text-cs-ink-2">{e.channel} · {e.buyer} · {e.qty.toLocaleString("en-IN")} units · {ago(e.at)}</span></span>
                    <Btn kind="primary" icon={Hand} onClick={() => { set(e.id, { assigneeId: me.id }); toast("It's yours"); }}>Pick up</Btn>
                  </li>
                ))}
              </ul>
            )}
          </Box>
          <Box title="My enquiries" icon={BadgeIndianRupee} sub="Match a factory, quote, close">
            {mine.length === 0 ? <p className="text-[13px] text-cs-ink-2">No open enquiries. Pick one up above.</p> : (
              <ul className="divide-y divide-cs-line">
                {mine.map((e) => (
                  <li key={e.id} className="grid items-center gap-[8px] py-[10px] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_130px]">
                    <span className="min-w-0"><span className="block truncate text-[13.5px] font-semibold">{e.product}</span><span className="text-[12px] text-cs-ink-2">{e.buyer} · {e.qty.toLocaleString("en-IN")} units{e.value ? ` · ₹${fmt(e.value)}` : ""}</span></span>
                    <select value={e.factoryId ?? ""} onChange={(ev) => { const f = factories.find((x) => x.id === ev.target.value); set(e.id, { factoryId: ev.target.value || undefined, status: ev.target.value && e.status === "New" ? "Matched" : e.status }, f ? `${e.product} matched to ${f.name}` : undefined); }} className={inputCls} aria-label="Matched factory">
                      <option value="">Match a factory</option>
                      {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <select value={e.status} onChange={(ev) => { set(e.id, { status: ev.target.value as EnquiryStatus }, `${e.product} for ${e.buyer}: ${ev.target.value.toLowerCase()}`); toast(`Marked ${ev.target.value.toLowerCase()}`, "info"); }} className={inputCls} aria-label="Status">
                      {STATUS.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </Box>
        </div>
        <div className="grid content-start gap-[16px] lg:col-span-4">
          <Box title="Follow up" icon={BellRing} sub="Quoted more than 2 days ago">
            {followUp.length === 0 ? <p className="text-[12.5px] text-cs-ink-2">No follow-ups due.</p> : <ul className="grid gap-[6px]">{followUp.map((e) => <li key={e.id} className="text-[12.5px]"><b className="font-semibold">{e.buyer}</b> · {e.product}</li>)}</ul>}
          </Box>
          <MyTasks />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Accounts ───────────────────────── */

export function AccountsDesk() {
  const { s, update, toast } = useHq();
  const me = useHqMe();
  const pend = useMemo(() => pending(s), [s]);
  const lk = useMemo(() => leaks(s).slice(0, 4), [s]);
  const res = reserve(s);
  const late = pend.receive.filter((v) => v.days < 0);
  const week = [...pend.receive, ...pend.pay].filter((v) => v.days >= 0 && v.days <= 7);
  const toInvoice = s.enquiries.filter((e) => e.status === "Won" && !s.invoices.some((v) => v.enquiryId === e.id));
  const [raising, setRaising] = useState<Enquiry | null>(null);

  const markPaid = (id: string) => {
    update((d) => {
      const x = d.invoices.find((y) => y.id === id)!;
      const t = new Date();
      x.paidAt = t.toISOString();
      d.txns.push({ id: `x${Date.now()}`, date: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`, kind: x.direction === "receive" ? "in" : "out", category: x.direction === "receive" ? "Invoice payments" : x.party, party: x.party, amount: x.amount, channel: x.channel });
      log(d, `${x.no} paid · ₹${fmt(x.amount)}`);
    });
    toast("Marked paid");
  };
  const remind = (id: string) => {
    const v = s.invoices.find((x) => x.id === id)!;
    update((d) => { post(d, me.id, "finance", `Sent a payment reminder to ${v.party} for ${v.no} (₹${fmt(v.amount)}).`); log(d, `Payment reminder sent to ${v.party} for ${v.no}`); });
    toast(`Reminder sent to ${v.party}`);
  };

  return (
    <div className="grid gap-[16px]">
      <Greeting sub={`${short(pend.owedToUs)} owed to us · ${late.length} overdue · ${toInvoice.length} to invoice`} />
      <div className="grid gap-[16px] lg:grid-cols-12">
        <div className="grid content-start gap-[16px] lg:col-span-8">
          {toInvoice.length > 0 && (
            <Box title="Raise invoices" icon={BadgeIndianRupee} sub="Enquiries won, not invoiced yet">
              <ul className="divide-y divide-cs-line">
                {toInvoice.map((e) => (
                  <li key={e.id} className="flex items-center gap-[10px] py-[9px]">
                    <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold">{e.buyer}</span><span className="text-[12px] text-cs-ink-2">{e.product}{e.value ? ` · order ₹${fmt(e.value)}` : ""}</span></span>
                    <Btn kind="primary" onClick={() => setRaising(e)}>Raise invoice</Btn>
                  </li>
                ))}
              </ul>
            </Box>
          )}
          <Box title="Overdue" icon={AlertTriangle} sub="Money owed to us that's late">
            {late.length === 0 ? <p className="text-[13px] text-cs-ink-2">Nothing overdue.</p> : (
              <ul className="divide-y divide-cs-line">
                {late.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-[10px] py-[9px]">
                    <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-semibold">{v.party}</span><span className="text-[12px] text-cs-red">{v.no} · ₹{fmt(v.amount)} · {-v.days} days late</span></span>
                    <Btn icon={Send} onClick={() => remind(v.id)}>Remind</Btn>
                    <button type="button" onClick={() => markPaid(v.id)} aria-label={`Mark ${v.no} paid`} className="grid size-[34px] place-items-center rounded-[7px] border border-cs-line text-cs-ok hover:bg-cs-ok-bg"><Check className="size-[15px]" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Box>
          <Box title="Due this week" icon={CalendarDays} sub="To receive and to pay">
            {week.length === 0 ? <p className="text-[13px] text-cs-ink-2">Nothing due this week.</p> : (
              <ul className="divide-y divide-cs-line">
                {week.map((v) => (
                  <li key={v.id} className="flex items-center gap-[10px] py-[9px]">
                    <span className={cn("rounded-full px-[7px] py-[1px] text-[11px] font-medium", v.direction === "receive" ? "bg-cs-ok-bg text-cs-ok" : "bg-cs-orange-bg text-[#b8641f]")}>{v.direction === "receive" ? "In" : "Out"}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px]"><b className="font-semibold">{v.party}</b> · {v.no}</span>
                    <span className="text-[13px] font-semibold">₹{fmt(v.amount)}</span>
                    <span className="w-[70px] text-right text-[11.5px] text-cs-ink-2">{v.days === 0 ? "today" : `in ${v.days} days`}</span>
                    <button type="button" onClick={() => markPaid(v.id)} aria-label={`Mark ${v.no} paid`} className="grid size-[30px] place-items-center rounded-[7px] border border-cs-line text-cs-ok hover:bg-cs-ok-bg"><Check className="size-[14px]" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Box>
        </div>
        <div className="grid content-start gap-[16px] lg:col-span-4">
          <Box title="Money leaks" icon={ShieldAlert} href="/hq/finance" sub="From this month's numbers">
            <ul className="grid gap-[8px]">{lk.map((x, i) => <li key={i} className="text-[12.5px]"><b className="font-semibold">{x.title}</b><span className="block text-[11.5px] text-cs-ink-2">{x.detail}</span></li>)}</ul>
            <Link href="/hq/finance" className="mt-[8px] inline-flex items-center gap-[4px] text-[12.5px] font-medium text-cs-green hover:underline">Open Finance <ArrowRight className="size-[13px]" /></Link>
          </Box>
          <Box title="Reserve fund" icon={CheckCircle2} sub="10% of every profit">
            <p className="serif text-[26px] font-semibold">₹{fmt(res.total)}</p>
            <p className="text-[12px] text-cs-ink-2">₹{fmt(res.allocated)} put towards goals · ₹{fmt(res.free)} free</p>
            {renewals(s).length > 0 && <p className="mt-[8px] text-[11.5px] text-cs-ink-2">Licence renewals coming up are with Onboarding.</p>}
          </Box>
          <MyTasks />
        </div>
      </div>
      {raising && <RaiseInvoice e={raising} onClose={() => setRaising(null)} />}
    </div>
  );
}

/** Raise Scouthru's invoice for a won enquiry. The fee defaults to 5% of the order value. */
function RaiseInvoice({ e, onClose }: { e: Enquiry; onClose: () => void }) {
  const { update, toast } = useHq();
  const [amount, setAmount] = useState(String(Math.round((e.value ?? 0) * 0.05) || ""));
  const [due, setDue] = useState(() => { const d = new Date(Date.now() + 15 * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
  return (
    <Modal open onClose={onClose} title="Raise invoice" sub={`${e.product} for ${e.buyer}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!(Number(amount) > 0) || !due} onClick={() => {
        update((d) => {
          const no = `SH-INV-${2200 + d.invoices.length}`;
          d.invoices.push({ id: `v${Date.now()}`, no, party: e.buyer, direction: "receive", amount: Number(amount), due, channel: e.channel === "Marketplace" ? "Marketplace" : "Regular", enquiryId: e.id });
          log(d, `Invoice ${no} raised to ${e.buyer} · ₹${fmt(Number(amount))}`);
        });
        toast("Invoice raised");
        onClose();
      }}>Raise invoice</Btn></>}>
      <div className="grid gap-[12px] sm:grid-cols-2">
        <Field label="Amount (₹)" hint={e.value ? `5% of the ₹${fmt(e.value)} order` : undefined}><input className={inputCls} value={amount} inputMode="numeric" onChange={(ev) => setAmount(ev.target.value.replace(/\D/g, ""))} /></Field>
        <Field label="Due"><input type="date" className={inputCls} value={due} onChange={(ev) => setDue(ev.target.value)} /></Field>
      </div>
    </Modal>
  );
}
