"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity as ActivityIcon, AlertTriangle, ArrowRight, BadgeCheck, BellRing, CalendarDays, CalendarPlus, FileSearch, Inbox, Lightbulb, MessageSquareText, Pencil, Plus, ReceiptIndianRupee,
  Send, ShieldAlert, TrendingUp, UserPlus, UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Btn } from "@/components/console/kit";
import { AddMemberDialog, Box, DropZone, StagePill, StageTrack } from "@/components/hq/ui";
import { KitPanel } from "@/components/hq/kit-panel";
import { AccountsDesk, FieldDesk, OnboardingDesk, SalesDesk, TeamBox } from "@/components/hq/desks";
import { openHq, useHqMe } from "@/components/hq/shell";
import { insights, nextActions, progress, upcoming, urgency, type NextAction, type Upcoming } from "@/lib/hq/rules";
import { goLive, useHq } from "@/lib/hq/store";
import { ago, fmtDay } from "@/lib/console/format";
import { cn } from "@/lib/cn";

const CHANNEL_TONE: Record<string, string> = { Marketplace: "bg-cs-mint text-cs-green-2", WhatsApp: "bg-cs-ok-bg text-cs-ok", IndiaMART: "bg-cs-blue-bg text-cs-blue", Phone: "bg-cs-violet-bg text-cs-violet", "Walk-in": "bg-[#f1efe9] text-[#3e4440]" };

/** Each teammate lands on their own dashboard, with only their work on it. */
export default function Dashboard() {
  const me = useHqMe();
  if (me.role === "onboarding") return <OnboardingDesk />;
  if (me.role === "field") return <FieldDesk />;
  if (me.role === "sales") return <SalesDesk />;
  if (me.role === "accounts") return <AccountsDesk />;
  return <OwnerHome />;
}

/** Owner: welcome, enquiries and events on the left, updates by urgency and insights in the middle, onboarding and the team on the right. */
function OwnerHome() {
  const { s, update, toast, toInbox, sendAllDue } = useHq();
  const me = useHqMe();
  const [naming, setNaming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [kitFor, setKitFor] = useState<string>("");
  const [event, setEvent] = useState({ date: "", title: "" });
  const todo = useMemo(() => nextActions(s), [s]);
  const ins = useMemo(() => insights(s), [s]);
  const ahead = useMemo(() => upcoming(s).slice(0, 7), [s]);
  const onboarding = s.members.filter((m) => !m.liveAt).sort((a, b) => progress(s, a).index - progress(s, b).index);
  // The upload boxes show the member picked here; by default the newest one still onboarding.
  const kitMember = s.members.find((m) => m.id === kitFor) ?? [...s.members].filter((m) => !m.liveAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const openKit = (id: string) => { setKitFor(id); setTimeout(() => document.getElementById("kit")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };
  const enquiries = [...s.enquiries].sort((a, b) => b.at.localeCompare(a.at)).filter((e) => e.status !== "Lost" && e.status !== "Won").slice(0, 6);
  const name = (id?: string) => s.members.find((m) => m.id === id)?.name;

  const groups = (["Urgent", "Today", "This week"] as const).map((g) => ({ g, items: todo.filter((a) => urgency(a.rank) === g) })).filter((x) => x.items.length);
  const sendDue = () => { const n = sendAllDue(); toast(`${n} reminder${n === 1 ? "" : "s"} sent on WhatsApp`); };

  return (
    <div className="grid gap-[16px]">
      {/* Welcome + New onboarding */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.16em] text-cs-green-2">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</p>
          {naming ? (
            <form onSubmit={(e) => { e.preventDefault(); setNaming(false); }} className="mt-[4px] flex items-center gap-[8px]">
              <span className="serif text-[32px] font-semibold">Welcome,</span>
              <input autoFocus value={me.name} onChange={(e) => update((d) => { d.team.find((t) => t.id === me.id)!.name = e.target.value; })} onBlur={() => setNaming(false)} className="serif w-[260px] rounded-[8px] border border-cs-line bg-white px-[10px] text-[30px] font-semibold outline-none focus:border-cs-green" aria-label="Your name" />
            </form>
          ) : (
            <h1 className="serif mt-[4px] flex items-center gap-[10px] text-[32px] font-semibold leading-tight tracking-[-0.02em]">
              Welcome, {me.name || "there"}
              <button type="button" onClick={() => setNaming(true)} aria-label="Change name" className="text-cs-ink-2 hover:text-cs-green"><Pencil className="size-[16px]" /></button>
            </h1>
          )}
          <p className="text-[13.5px] text-cs-ink-2">{todo.length ? `${todo.length} update${todo.length === 1 ? "" : "s"} pending, most urgent first.` : "Nothing pending. You're all caught up."}</p>
        </div>
      </div>

      <div className="grid gap-[16px] lg:grid-cols-12">
        {/* Left: enquiries + upcoming */}
        <div className="order-2 grid content-start gap-[16px] lg:order-none lg:col-span-3">
          <Box title="Enquiries" icon={MessageSquareText} href="/hq/enquiries" sub={`${s.enquiries.filter((e) => e.status === "New").length} new · marketplace and regular`}>
            <ul className="grid gap-[2px]">
              {enquiries.map((e) => (
                <li key={e.id}>
                  <Link href="/hq/enquiries" className="block rounded-[8px] px-[6px] py-[7px] hover:bg-[#f7f5f0]">
                    <span className="flex items-center gap-[6px]">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{e.product}</span>
                      {e.status === "New" && <span className="size-[7px] shrink-0 rounded-full bg-cs-green" aria-label="New" />}
                    </span>
                    <span className="mt-[2px] flex items-center gap-[6px] text-[11.5px] text-cs-ink-2">
                      <span className={cn("rounded-full px-[6px] py-[0px] text-[10.5px] font-medium", CHANNEL_TONE[e.channel])}>{e.channel}</span>
                      <span className="truncate">{e.factoryId ? `→ ${name(e.factoryId)}` : e.category}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/hq/enquiries" className="mt-[8px] inline-flex items-center gap-[4px] text-[12.5px] font-medium text-cs-green hover:underline">All enquiries <ArrowRight className="size-[13px]" /></Link>
          </Box>

          <Box title="Upcoming" icon={CalendarDays} sub="Visits, renewals, payments, events">
            <ul className="grid gap-[6px]">
              {ahead.map((x, i) => <UpcomingRow key={i} x={x} />)}
              {ahead.length === 0 && <li className="text-[12.5px] text-cs-ink-2">Nothing coming up.</li>}
            </ul>
            <form className="mt-[10px] grid gap-[6px]" onSubmit={(e) => { e.preventDefault(); if (!event.date || !event.title.trim()) return; update((d) => { d.events.push({ id: `e${Date.now()}`, date: event.date, title: event.title.trim() }); }); setEvent({ date: "", title: "" }); toast("Event added"); }}>
              <div className="flex gap-[6px]">
                <input type="date" value={event.date} onChange={(e) => setEvent((x) => ({ ...x, date: e.target.value }))} className="h-[32px] w-[132px] rounded-[7px] border border-cs-line bg-white px-[6px] text-[12px]" aria-label="Event date" />
                <input value={event.title} onChange={(e) => setEvent((x) => ({ ...x, title: e.target.value }))} placeholder="Add an event" className="h-[32px] min-w-0 flex-1 rounded-[7px] border border-cs-line bg-white px-[8px] text-[12px] outline-none focus:border-cs-green" aria-label="Event" />
                <button type="submit" aria-label="Add event" className="grid size-[32px] shrink-0 place-items-center rounded-[7px] border border-cs-line bg-white hover:border-cs-green-2/60"><CalendarPlus className="size-[15px] text-cs-green-2" /></button>
              </div>
            </form>
          </Box>
        </div>

        {/* Middle: updates pending by urgency + insights */}
        <div className="order-3 grid content-start gap-[16px] lg:order-none lg:col-span-4">
          <Box title="Updates pending" icon={BellRing} sub="According to urgency">
            {groups.length === 0 ? <p className="py-[12px] text-center text-[13px] text-cs-ink-2">All caught up.</p> : groups.map(({ g, items }) => (
              <div key={g} className="mb-[10px] last:mb-0">
                <p className={cn("mb-[6px] flex items-center gap-[6px] text-[11px] font-semibold tracking-[0.12em]", g === "Urgent" ? "text-cs-red" : g === "Today" ? "text-[#b8641f]" : "text-cs-ink-2")}>
                  {g === "Urgent" && <AlertTriangle className="size-[12px]" />}{g.toUpperCase()}
                </p>
                <ul className="grid gap-[6px]">
                  {items.map((a) => <Update key={a.key} a={a} onSendDue={sendDue} onGoLive={(id) => { update((d) => goLive(d, id)); toast(`${name(id)} is live · login details sent`); }} />)}
                </ul>
              </div>
            ))}
          </Box>

          <Box title="What's going on" icon={Lightbulb} sub="Trends and problems building up in operations">
            <ul className="grid gap-[8px]">
              {ins.map((x, i) => (
                <li key={i} className="flex items-start gap-[9px] text-[13px] leading-[1.45]">
                  {x.tone === "risk" ? <ShieldAlert className="mt-[1px] size-[16px] shrink-0 text-cs-red" /> : x.tone === "watch" ? <AlertTriangle className="mt-[1px] size-[16px] shrink-0 text-cs-orange" /> : <TrendingUp className="mt-[1px] size-[16px] shrink-0 text-cs-ok" />}
                  <span>{x.text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-[10px] text-[11px] text-cs-ink-2">Worked out from HQ&apos;s data. AI-written summaries arrive with the backend.</p>
          </Box>
        </div>

        {/* Right: new onboarding → the upload boxes, one per required document and photo */}
        <div className="order-1 grid content-start gap-[16px] lg:order-none lg:col-span-5">
          <KitPanel member={kitMember} choices={s.members.filter((m) => !m.liveAt)} onPick={setKitFor} onNew={() => setAdding(true)} />

          <TeamBox />

          <Box title="Onboarding" icon={UserPlus} href="/hq/members" sub={`${onboarding.length} in progress · pick one to fill its boxes`}
            right={<Btn icon={Plus} onClick={() => setAdding(true)}>New</Btn>}>
            <ul className="grid gap-[8px]">
              {onboarding.map((m) => {
                const p = progress(s, m);
                const got = p.checklist.filter((c) => c.state !== "missing" && c.state !== "rejected").length;
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => openKit(m.id)} className={cn("block w-full rounded-[10px] border p-[10px] text-left hover:border-cs-green-2/60", m.id === kitMember?.id ? "border-cs-green/50 bg-cs-mint/30" : "border-cs-line")}>
                      <span className="flex items-center gap-[8px]">
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{m.name}</span>
                        <StagePill stage={p.stage} />
                      </span>
                      <span className="mt-[2px] block text-[11.5px] text-cs-ink-2">{got}/{p.checklist.length} documents · {p.nextText}</span>
                      <span className="mt-[8px] block"><StageTrack s={s} m={m} compact /></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Box>

          <Box title="Inbox" icon={Inbox} href="/hq/inbox" sub={s.inbox.length ? `${s.inbox.length} to file` : "Everything is filed"}>
            <DropZone compact onFiles={(files) => toInbox(files)} label="Drop anything here" hint="HQ works out whose it is" />
            {s.inbox.length > 0 && <Link href="/hq/inbox" className="mt-[8px] inline-flex items-center gap-[4px] text-[12.5px] font-medium text-cs-green hover:underline">File {s.inbox.length} item{s.inbox.length === 1 ? "" : "s"} <ArrowRight className="size-[13px]" /></Link>}
          </Box>

          <Box title="Activity" icon={ActivityIcon} sub="Latest across HQ">
            <ul className="grid gap-[6px]">
              {s.activity.slice(0, 4).map((a) => (
                <li key={a.id} className="text-[12.5px]">
                  {a.memberId ? <Link href={`/hq/members/${a.memberId}`} className="hover:text-cs-green">{a.text}</Link> : a.text}
                  <span className="block text-[11px] text-cs-ink-2">{ago(a.at)}</span>
                </li>
              ))}
            </ul>
          </Box>
        </div>
      </div>

      {adding && <AddMemberDialog onClose={() => setAdding(false)} onAdded={(id) => { setAdding(false); openKit(id); }} />}
    </div>
  );
}

const KIND_ICON: Record<Upcoming["kind"], LucideIcon> = { visit: CalendarDays, renewal: ShieldAlert, payment: ReceiptIndianRupee, event: CalendarPlus };

function UpcomingRow({ x }: { x: Upcoming }) {
  const Icon = KIND_ICON[x.kind];
  const body = (
    <>
      <span className="grid w-[38px] shrink-0 place-content-center rounded-[7px] bg-cs-cream py-[4px] text-center leading-none">
        <span className="serif text-[15px] font-semibold">{fmtDay(x.date).split(" ")[0]}</span>
        <span className="text-[10px] text-cs-ink-2">{fmtDay(x.date).split(" ")[1]}</span>
      </span>
      <Icon className="size-[14px] shrink-0 text-cs-green-2" />
      <span className="min-w-0 flex-1 text-[12.5px] leading-snug">{x.title}</span>
    </>
  );
  return <li>{x.href ? <Link href={x.href} className="flex items-center gap-[8px] rounded-[7px] p-[3px] hover:bg-[#f7f5f0]">{body}</Link> : <span className="flex items-center gap-[8px] p-[3px]">{body}</span>}</li>;
}

const ACTION_ICON: Record<NextAction["kind"], LucideIcon> = {
  inbox: Inbox, welcome: Send, details: UserRound, check: FileSearch, reminders: BellRing, visit: CalendarDays, book: CalendarDays, golive: BadgeCheck,
};

function Update({ a, onSendDue, onGoLive }: { a: NextAction; onSendDue: () => void; onGoLive: (memberId: string) => void }) {
  const Icon = ACTION_ICON[a.kind];
  const href =
    a.kind === "inbox" ? "/hq/inbox"
    : a.kind === "reminders" ? "/hq/outbox"
    : `/hq/members/${a.memberId}${a.kind === "book" || a.kind === "visit" ? "#visit" : a.kind === "check" ? "#documents" : ""}`;
  const link = (label: string) => <Link href={href} className="inline-flex h-[34px] items-center gap-[5px] rounded-[7px] border border-cs-line bg-white px-[11px] text-[12.5px] font-medium hover:border-[#cfcac0]">{label}<ArrowRight className="size-[13px]" /></Link>;
  const button =
    a.kind === "golive" ? <Btn kind="primary" icon={BadgeCheck} onClick={() => onGoLive(a.memberId!)}>Go live</Btn>
    : a.kind === "reminders" ? <Btn kind="primary" icon={Send} onClick={onSendDue}>Send all</Btn>
    : a.kind === "welcome" ? <Btn icon={Send} onClick={() => openHq("send", { memberId: a.memberId, pack: "Welcome kit" })}>Send</Btn>
    : link(a.kind === "inbox" ? "File" : a.kind === "check" ? "Check" : a.kind === "book" ? "Book" : "Open");
  return (
    <li className={cn("flex items-center gap-[10px] rounded-[10px] border p-[9px]", urgency(a.rank) === "Urgent" ? "border-cs-red/30 bg-cs-red-bg/40" : "border-cs-line bg-white")}>
      <span className="grid size-[32px] shrink-0 place-items-center rounded-full bg-white text-cs-green-2 ring-1 ring-cs-line"><Icon className="size-[15px]" strokeWidth={1.8} /></span>
      <Link href={href} className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold hover:text-cs-green">{a.title}</span>
        <span className="block truncate text-[11.5px] text-cs-ink-2">{a.sub}</span>
      </Link>
      <span className="shrink-0">{button}</span>
    </li>
  );
}
