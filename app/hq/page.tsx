"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity as ActivityIcon, ArrowRight, BadgeCheck, BellRing, CalendarDays, FileSearch, Inbox, ListTodo, Plus, Send, Sparkles, UserRound, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Btn } from "@/components/console/kit";
import { Box, DropZone, StagePill, TypeBadge } from "@/components/hq/ui";
import { openHq } from "@/components/hq/shell";
import { STAGES, dueReminders, nextActions, progress, renewals, type NextAction } from "@/lib/hq/rules";
import { goLive, useHq } from "@/lib/hq/store";
import { ago, fmtDay } from "@/lib/console/format";
import { fmtSize } from "@/lib/hq/files";
import { cn } from "@/lib/cn";

/** Today: what needs doing, then one box per area of HQ. */
export default function Today() {
  const { s, update, toast, toInbox, sendAllDue } = useHq();
  const [task, setTask] = useState("");
  const todo = useMemo(() => nextActions(s), [s]);
  const due = dueReminders(s);
  const renew = renewals(s);
  const visits = s.members.filter((m) => m.visit && !m.visit.done).sort((a, b) => a.visit!.date.localeCompare(b.visit!.date));
  const byStage = STAGES.map((st) => ({ st, n: s.members.filter((m) => progress(s, m).stage === st).length }));
  const name = (id?: string) => s.members.find((m) => m.id === id)?.name;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const sendDue = () => { const n = sendAllDue(); toast(`${n} reminder${n === 1 ? "" : "s"} sent on WhatsApp`); };

  return (
    <div className="grid gap-[16px]">
      <div>
        <p className="text-[12px] font-semibold tracking-[0.16em] text-cs-green-2">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</p>
        <h1 className="serif mt-[4px] text-[32px] font-semibold leading-tight tracking-[-0.02em]">{greeting}. {todo.length ? `${todo.length} thing${todo.length === 1 ? "" : "s"} need you today.` : "You're all caught up."}</h1>
      </div>

      <Box title="Do next" icon={Sparkles} sub="Worked out from everyone's status · most urgent first">
        {todo.length === 0 ? <p className="py-[10px] text-center text-[13px] text-cs-ink-2">Nothing waiting. New files, documents to check, visits and approvals show up here.</p> : (
          <ul className="grid gap-[8px] md:grid-cols-2 xl:grid-cols-3">
            {todo.map((a) => <DoNext key={a.key} a={a} onSendDue={sendDue} onGoLive={(id) => { update((d) => goLive(d, id)); toast(`${name(id)} is live · login details sent`); }} />)}
          </ul>
        )}
      </Box>

      <div className="grid gap-[16px] lg:grid-cols-3">
        {/* Inbox */}
        <Box title="Inbox" icon={Inbox} href="/hq/inbox" sub={s.inbox.length ? `${s.inbox.length} to file` : "Everything is filed"} right={<Link href="/hq/inbox" className="text-[12.5px] font-medium text-cs-green hover:underline">Open</Link>}>
          <DropZone onFiles={(files) => toInbox(files)} label="Drop anything here" hint="Documents, photos, WhatsApp screenshots" />
          <ul className="mt-[10px] grid gap-[6px]">
            {s.inbox.slice(0, 3).map((it) => (
              <li key={it.id}>
                <Link href="/hq/inbox" className="flex items-center gap-[9px] text-[12.5px] hover:text-cs-green">
                  {it.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.thumb} alt="" className="size-[26px] shrink-0 rounded-[5px] object-cover" />
                  ) : <FileSearch className="size-[16px] shrink-0 text-cs-ink-2" />}
                  <span className="min-w-0 flex-1 truncate">{it.name}</span>
                  <span className="shrink-0 text-[11px] text-cs-ink-2">{fmtSize(it.size)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Box>

        {/* Onboarding pipeline */}
        <Box title="Onboarding" icon={Users} href="/hq/members" sub={`${s.members.filter((m) => !m.liveAt).length} in progress · ${s.members.filter((m) => m.liveAt).length} live`} right={<Link href="/hq/members" className="text-[12.5px] font-medium text-cs-green hover:underline">Open</Link>}>
          <ul className="grid gap-[6px]">
            {byStage.map(({ st, n }) => (
              <li key={st}>
                <Link href={`/hq/members#${st.toLowerCase()}`} className="flex items-center gap-[10px] rounded-[9px] border border-cs-line px-[11px] py-[8px] hover:border-cs-green-2/60">
                  <StagePill stage={st} />
                  <span className="flex-1 text-[12.5px] text-cs-ink-2">{STAGE_HINT[st]}</span>
                  <span className="serif text-[20px] font-semibold leading-none">{n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Box>

        {/* Outbox */}
        <Box title="Outbox" icon={Send} href="/hq/outbox" sub="Messages, reminders and renewals" right={<Link href="/hq/outbox" className="text-[12.5px] font-medium text-cs-green hover:underline">Open</Link>}>
          <div className={cn("rounded-[10px] p-[12px]", due.length ? "bg-cs-mint/50" : "bg-[#f7f5f0]")}>
            <p className="flex items-center gap-[8px] text-[13.5px] font-semibold"><BellRing className="size-[16px] text-cs-green-2" />{due.length ? `${due.length} reminder${due.length === 1 ? "" : "s"} due` : "No reminders due"}</p>
            <p className="mt-[2px] text-[12px] text-cs-ink-2">Missing documents are chased every 3 days, renewals 45 days ahead.</p>
            {due.length > 0 && <Btn kind="primary" icon={Send} className="mt-[9px]" onClick={sendDue}>Send all due</Btn>}
          </div>
          {renew.length > 0 && (
            <ul className="mt-[10px] grid gap-[6px]">
              {renew.slice(0, 3).map((r) => (
                <li key={r.doc.id} className="flex items-center gap-[8px] text-[12.5px]">
                  <span className={cn("rounded-full px-[7px] py-[1px] text-[11px] font-medium", r.days < 15 ? "bg-cs-red-bg text-cs-red" : "bg-cs-orange-bg text-[#b8641f]")}>{r.days < 0 ? "Expired" : `${r.days} days`}</span>
                  <span className="min-w-0 flex-1 truncate">{r.doc.kind} · {name(r.doc.memberId)}</span>
                </li>
              ))}
            </ul>
          )}
        </Box>

        {/* Visits */}
        <Box title="Visits" icon={CalendarDays} href="/hq/visits" sub={`${visits.length} booked`} right={<Link href="/hq/visits" className="text-[12.5px] font-medium text-cs-green hover:underline">Open</Link>}>
          {visits.length === 0 ? <p className="text-[13px] text-cs-ink-2">No visits booked.</p> : (
            <ul className="grid gap-[8px]">
              {visits.slice(0, 3).map((m) => (
                <li key={m.id}>
                  <Link href={`/hq/members/${m.id}#visit`} className="flex items-center gap-[11px] rounded-[10px] border border-cs-line p-[9px] hover:border-cs-green-2/60">
                    <span className="grid size-[42px] shrink-0 place-content-center rounded-[8px] bg-cs-cream text-center leading-none">
                      <span className="serif text-[16px] font-semibold">{fmtDay(m.visit!.date).split(" ")[0]}</span>
                      <span className="text-[10.5px] text-cs-ink-2">{fmtDay(m.visit!.date).split(" ")[1]}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{m.name}</span>
                      <span className="block truncate text-[12px] text-cs-ink-2">{m.city}, {m.state}</span>
                    </span>
                    <TypeBadge type={m.type} className="hidden sm:inline-flex" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Box>

        {/* To do */}
        <Box title="To do" icon={ListTodo} sub={`${s.tasks.filter((t) => !t.done).length} open`}>
          <form className="mb-[8px] flex gap-[8px]" onSubmit={(e) => { e.preventDefault(); const t = task.trim(); if (!t) return; update((d) => { d.tasks.unshift({ id: `t${Date.now()}`, text: t, done: false, at: new Date().toISOString() }); }); setTask(""); }}>
            <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Add a task" className="h-[36px] min-w-0 flex-1 rounded-[8px] border border-[#d6d8d3] px-[11px] text-[13px] outline-none focus:border-cs-green" aria-label="New task" />
            <Btn icon={Plus} type="submit">Add</Btn>
          </form>
          <ul className="grid">
            {[...s.tasks.filter((t) => !t.done), ...s.tasks.filter((t) => t.done).slice(0, 1)].map((t) => (
              <li key={t.id}>
                <label className="flex cursor-pointer items-start gap-[9px] rounded-[7px] px-[5px] py-[6px] hover:bg-[#f7f5f0]">
                  <input type="checkbox" checked={t.done} onChange={(e) => update((d) => { d.tasks.find((x) => x.id === t.id)!.done = e.target.checked; })} className="mt-[2px] size-[15px] accent-[#a8461f]" />
                  <span className={cn("min-w-0 flex-1 text-[12.5px]", t.done && "text-cs-ink-2 line-through")}>{t.text}</span>
                </label>
              </li>
            ))}
          </ul>
        </Box>

        {/* Activity */}
        <Box title="Activity" icon={ActivityIcon} sub="Latest across HQ">
          <ul className="grid gap-[7px]">
            {s.activity.slice(0, 6).map((a) => (
              <li key={a.id} className="text-[12.5px]">
                {a.memberId ? <Link href={`/hq/members/${a.memberId}`} className="hover:text-cs-green">{a.text}</Link> : a.text}
                <span className="block text-[11px] text-cs-ink-2">{ago(a.at)}</span>
              </li>
            ))}
          </ul>
        </Box>
      </div>
    </div>
  );
}

const STAGE_HINT: Record<string, string> = {
  New: "Welcome kit to send",
  Documents: "Collecting and checking",
  Visit: "Visit and photos",
  Review: "Ready for your approval",
  Live: "On Scouthru",
};

const ACTION_ICON: Record<NextAction["kind"], LucideIcon> = {
  inbox: Inbox, welcome: Send, details: UserRound, check: FileSearch, reminders: BellRing, visit: CalendarDays, book: CalendarDays, golive: BadgeCheck,
};

function DoNext({ a, onSendDue, onGoLive }: { a: NextAction; onSendDue: () => void; onGoLive: (memberId: string) => void }) {
  const Icon = ACTION_ICON[a.kind];
  const href =
    a.kind === "inbox" ? "/hq/inbox"
    : a.kind === "reminders" ? "/hq/outbox"
    : `/hq/members/${a.memberId}${a.kind === "book" || a.kind === "visit" ? "#visit" : a.kind === "check" ? "#documents" : ""}`;
  const link = (label: string) => <Link href={href} className="inline-flex h-[36px] items-center gap-[5px] rounded-[7px] border border-cs-line bg-white px-[12px] text-[13px] font-medium hover:border-[#cfcac0]">{label}<ArrowRight className="size-[13px]" /></Link>;
  const button =
    a.kind === "golive" ? <Btn kind="primary" icon={BadgeCheck} onClick={() => onGoLive(a.memberId!)}>Go live</Btn>
    : a.kind === "reminders" ? <Btn kind="primary" icon={Send} onClick={onSendDue}>Send all</Btn>
    : a.kind === "welcome" ? <Btn icon={Send} onClick={() => openHq("send", { memberId: a.memberId, pack: "Welcome kit" })}>Send</Btn>
    : link(a.kind === "inbox" ? "File" : a.kind === "check" ? "Check" : a.kind === "book" ? "Book" : "Open");
  return (
    <li className={cn("flex items-center gap-[11px] rounded-[11px] border p-[11px]", a.rank <= 1 ? "border-cs-green/40 bg-cs-mint/40" : "border-cs-line bg-white")}>
      <span className="grid size-[36px] shrink-0 place-items-center rounded-full bg-white text-cs-green-2 ring-1 ring-cs-line"><Icon className="size-[17px]" strokeWidth={1.8} /></span>
      <Link href={href} className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold hover:text-cs-green">{a.title}</span>
        <span className="block truncate text-[12px] text-cs-ink-2">{a.sub}</span>
      </Link>
      <span className="shrink-0">{button}</span>
    </li>
  );
}
