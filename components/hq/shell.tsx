"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BellRing, CalendarDays, ChevronDown, CornerDownLeft, IndianRupee, Inbox, LayoutDashboard, Lock, LogOut, MessagesSquare, MessageSquareText, Search, Send, UserCog, UserPlus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Toasts } from "@/components/console/kit";
import { TYPE_LABEL, dueReminders, progress } from "@/lib/hq/rules";
import { useHq } from "@/lib/hq/store";
import { ROLE_ICON, ROLE_JOB, ROLE_LABEL, TABS_FOR, canOpen, ownersOf, unread, useMe } from "@/lib/hq/team";
import type { Teammate } from "@/lib/hq/types";
import { AddMemberDialog, SendDialog, StagePill } from "./ui";
import { cn } from "@/lib/cn";

/** Dialogs any HQ page (or the command bar) can open. */
export type HqAction = "add" | "send";
const OPEN = "scouthru-hq-action";
export const openHq = (action: HqAction, detail?: { name?: string; memberId?: string; pack?: string }) => window.dispatchEvent(new CustomEvent(OPEN, { detail: { action, ...detail } }));

const TAB: Record<string, { label: string; icon: LucideIcon }> = {
  "/hq": { label: "Home", icon: LayoutDashboard },
  "/hq/chat": { label: "Chat", icon: MessagesSquare },
  "/hq/enquiries": { label: "Enquiries", icon: MessageSquareText },
  "/hq/members": { label: "Onboarding", icon: Users },
  "/hq/inbox": { label: "Inbox", icon: Inbox },
  "/hq/outbox": { label: "Outbox", icon: Send },
  "/hq/visits": { label: "Visits", icon: CalendarDays },
  "/hq/finance": { label: "Finance", icon: IndianRupee },
  "/hq/team": { label: "Team", icon: UserCog },
};

/** The teammate signed in on this tab. Pages under the HQ frame always have one. */
const MeCtx = createContext<Teammate | null>(null);
export function useHqMe() {
  const me = useContext(MeCtx);
  if (!me) throw new Error("useHqMe outside a signed-in HQ page");
  return me;
}

/**
 * The "ask anything" bar: type a member, a city, or what you want to do.
 * "add <company>" starts a new member with that name. Press / to jump here.
 */
function CommandBar() {
  const { s, sendAllDue, toast } = useHq();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !/input|textarea|select/i.test((e.target as HTMLElement).tagName)) { e.preventDefault(); input.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const add = /^add\s+(.+)/i.exec(q.trim());
    const due = dueReminders(s).length;
    const actions: { key: string; icon: LucideIcon; label: string; words: string; go: () => void }[] = [
      { key: "add", icon: UserPlus, label: "Add a member", words: "add new member onboard factory supplier distributor product owner", go: () => openHq("add") },
      { key: "inbox", icon: Inbox, label: `Open the Inbox${s.inbox.length ? ` (${s.inbox.length} to file)` : ""}`, words: "inbox drop upload documents photos files unsorted", go: () => router.push("/hq/inbox") },
      { key: "send", icon: Send, label: "Send a message", words: "send whatsapp email welcome kit checklist pricing agreement login message", go: () => openHq("send") },
      ...(due ? [{ key: "due", icon: BellRing, label: `Send ${due} due reminder${due === 1 ? "" : "s"}`, words: "reminders chase follow up renewal due", go: () => { const n = sendAllDue(); toast(`${n} reminder${n === 1 ? "" : "s"} sent`); } }] : []),
      { key: "visits", icon: CalendarDays, label: "Visits", words: "visit visits factory inspection book schedule", go: () => router.push("/hq/visits") },
    ];
    const out: { key: string; icon?: LucideIcon; label: string; sub?: React.ReactNode; go: () => void }[] = [];
    if (add) out.push({ key: "add-name", icon: UserPlus, label: `Add “${add[1]}” as a new member`, go: () => openHq("add", { name: add[1] }) });
    s.members
      .filter((m) => !t || `${m.name} ${m.city} ${m.state} ${TYPE_LABEL[m.type]}`.toLowerCase().includes(t))
      .slice(0, t ? 6 : 4)
      .forEach((m) => { const p = progress(s, m); out.push({ key: m.id, label: m.name, sub: <><StagePill stage={p.stage} /><span className="text-cs-ink-2">{m.city} · {p.nextText}</span></>, go: () => router.push(`/hq/members/${m.id}`) }); });
    actions.filter((a) => !t || `${a.label} ${a.words}`.toLowerCase().includes(t) || t.split(/\s+/).some((w) => w.length > 2 && a.words.includes(w))).forEach((a) => out.push(a));
    return out;
  }, [q, s, router, sendAllDue, toast]);

  const pick = (i: number) => { const r = results[i]; if (!r) return; setOpen(false); setQ(""); input.current?.blur(); r.go(); };

  return (
    <div className="relative w-full max-w-[560px]">
      <div className={cn("flex h-[44px] items-center gap-[10px] rounded-[11px] border bg-white px-[13px]", open ? "border-cs-green-2/60" : "border-cs-line")}>
        <Search className="size-[17px] shrink-0 text-cs-green-2" strokeWidth={1.8} />
        <input
          ref={input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setCursor(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(results.length - 1, c + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
            if (e.key === "Enter") { e.preventDefault(); pick(cursor); }
            if (e.key === "Escape") { setOpen(false); input.current?.blur(); }
          }}
          placeholder="Find a member, or type what you want to do…"
          className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#7a7f7b]"
          aria-label="Search members or actions"
        />
        <kbd className="hidden rounded-[5px] border border-cs-line px-[6px] text-[11px] text-cs-ink-2 sm:block">/</kbd>
      </div>
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-40 mt-[6px] max-h-[60vh] overflow-y-auto rounded-[12px] border border-cs-line bg-white p-[6px] shadow-[0_18px_48px_rgba(20,30,25,0.16)]" role="listbox">
          {results.map((r, i) => (
            <li key={r.key} role="option" aria-selected={i === cursor}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(i)} onMouseEnter={() => setCursor(i)} className={cn("flex w-full items-center gap-[10px] rounded-[8px] px-[10px] py-[8px] text-left", i === cursor && "bg-[#f7f5f0]")}>
                {r.icon ? <r.icon className="size-[16px] shrink-0 text-cs-green-2" strokeWidth={1.8} /> : <span className="size-[16px] shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{r.label}</span>
                  {r.sub && <span className="mt-[2px] flex items-center gap-[6px] truncate text-[11.5px]">{r.sub}</span>}
                </span>
                {i === cursor && <CornerDownLeft className="size-[14px] text-cs-ink-2" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HqShell({ children }: { children: React.ReactNode }) {
  const { s, ready, toasts, toInbox } = useHq();
  const router = useRouter();
  const path = usePathname();
  const { me, signIn, signOut } = useMe(s.team);
  const [action, setAction] = useState<{ action: HqAction; name?: string; memberId?: string; pack?: string } | null>(null);
  // On a member's file, anything dropped or pasted is filed straight to that member.
  const memberId = /^\/hq\/members\/([^/]+)/.exec(path)?.[1];
  const member = s.members.find((m) => m.id === memberId);
  const [dragging, setDragging] = useState(false);
  const context = useRef(memberId);
  context.current = memberId;

  useEffect(() => {
    const on = (e: Event) => setAction((e as CustomEvent).detail);
    window.addEventListener(OPEN, on);
    return () => window.removeEventListener(OPEN, on);
  }, []);

  // Everything coming in goes to the Inbox: drag files anywhere, or paste a screenshot.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => { if (hasFiles(e)) { depth++; setDragging(true); } };
    const leave = (e: DragEvent) => { if (hasFiles(e)) { depth = Math.max(0, depth - 1); if (!depth) setDragging(false); } };
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      depth = 0;
      setDragging(false);
      if (e.defaultPrevented || !hasFiles(e)) return; // a drop zone on the page already took it
      e.preventDefault();
      toInbox([...e.dataTransfer!.files], context.current, !!context.current);
    };
    const paste = (e: ClipboardEvent) => {
      if (/input|textarea|select/i.test((e.target as HTMLElement).tagName)) return;
      const files = [...(e.clipboardData?.files ?? [])];
      if (!files.length) return;
      e.preventDefault();
      // Screenshots arrive as "image.png"; give them a name worth keeping.
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      toInbox(files.map((f, i) => (/^image\.\w+$/.test(f.name) ? new File([f], `pasted-${stamp}${i ? `-${i}` : ""}.${f.name.split(".").pop()}`, { type: f.type }) : f)), context.current, !!context.current);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    window.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
      window.removeEventListener("paste", paste);
    };
  }, [toInbox]);

  const counts: Record<string, number> = {
    "/hq/inbox": s.inbox.length,
    "/hq/outbox": dueReminders(s).length,
    "/hq/enquiries": s.enquiries.filter((e) => e.status === "New").length,
    "/hq/chat": me ? Object.values(unread(s, me)).reduce((a, n) => a + n, 0) : 0,
  };
  const active = (href: string) => (href === "/hq" ? path === "/hq" : path.startsWith(href));

  if (ready && !me) return <SignInScreen team={s.team} onPick={signIn} toasts={toasts} />;
  const tabs = me ? TABS_FOR[me.role] : [];
  const homeLabel = !me || me.role === "owner" ? "Home" : me.role === "field" ? "My visits" : "My work";
  const allowed = !me || canOpen(me.role, path);

  return (
    <div className="min-h-dvh bg-[#f6f3ec]">
      <header className="sticky top-0 z-30 border-b border-cs-line bg-[#f6f3ec]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-[10px] px-4 pt-[12px] sm:px-6">
          <Link href="/hq" className="flex items-baseline gap-[7px]">
            <span className="serif text-[26px] font-semibold leading-none tracking-[-0.02em] text-cs-green">Scouthru</span>
            <span className="rounded-[5px] bg-cs-deep px-[6px] py-[2px] text-[10.5px] font-semibold tracking-[0.14em] text-white">HQ</span>
          </Link>
          <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">{me && (me.role === "owner" || me.role === "onboarding") && <CommandBar />}</div>
          <div className="ml-auto flex items-center gap-[10px]">
            {me && (me.role === "owner" || me.role === "onboarding") && (
              <button type="button" onClick={() => setAction({ action: "add" })} className="inline-flex h-[40px] items-center gap-[7px] rounded-[9px] bg-cs-green px-[14px] text-[13px] font-medium text-white hover:bg-[#8f3a18]">
                <UserPlus className="size-[16px]" /><span className="hidden sm:inline">Add member</span>
              </button>
            )}
            {me && <MeMenu me={me} onSwitch={signOut} />}
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1400px] gap-[2px] overflow-x-auto px-3 pt-[10px] sm:px-5" aria-label="HQ">
          {tabs.map((href) => {
            const t = TAB[href];
            return (
              <Link key={href} href={href} className={cn("flex items-center gap-[7px] whitespace-nowrap border-b-2 px-[12px] pb-[10px] pt-[4px] text-[13.5px] font-medium", active(href) ? "border-cs-green text-cs-green" : "border-transparent text-[#3e4440] hover:text-cs-ink")}>
                <t.icon className="size-[16px]" strokeWidth={1.8} />{href === "/hq" ? homeLabel : t.label}
                {!!counts[href] && <span className="rounded-full bg-cs-green px-[6px] text-[10.5px] font-semibold leading-[17px] text-white">{counts[href]}</span>}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-[20px] sm:px-6">
        {!ready || !me ? <div className="h-[60vh]" aria-busy="true" /> : allowed ? <MeCtx.Provider value={me}>{children}</MeCtx.Provider> : <NotYours path={path} />}
      </main>
      {action?.action === "add" && <AddMemberDialog name={action.name} onClose={() => setAction(null)} onAdded={(id) => { setAction(null); router.push(`/hq/members/${id}`); }} />}
      {action?.action === "send" && <SendDialog pack={action.pack} memberId={action.memberId ?? memberId} onClose={() => setAction(null)} />}
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[45] grid place-items-end justify-center border-[3px] border-dashed border-cs-green/70 bg-cs-mint/20 pb-[28px]">
          <p className="rounded-full bg-cs-deep px-[18px] py-[10px] text-[13.5px] font-medium text-white shadow-lg">
            {member ? `Drop to file for ${member.name}` : "Drop into the Inbox"}
          </p>
        </div>
      )}
      <Toasts toasts={toasts} />
    </div>
  );
}

/** Signed-in teammate, with a way to switch to another seat (demo) or sign out. */
function MeMenu({ me, onSwitch }: { me: Teammate; onSwitch: () => void }) {
  const [open, setOpen] = useState(false);
  const Icon = ROLE_ICON[me.role];
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 150)} aria-expanded={open} className="flex h-[40px] items-center gap-[8px] rounded-[9px] border border-cs-line bg-white pl-[6px] pr-[10px] text-left hover:border-[#cfcac0]">
        <span className="grid size-[28px] place-items-center rounded-full bg-cs-mint text-cs-green-2"><Icon className="size-[15px]" strokeWidth={1.8} /></span>
        <span className="hidden leading-tight sm:block">
          <span className="block max-w-[140px] truncate text-[12.5px] font-semibold">{me.name}</span>
          <span className="block text-[11px] text-cs-ink-2">{ROLE_LABEL[me.role]}</span>
        </span>
        <ChevronDown className="size-[14px] text-cs-ink-2" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-[6px] w-[240px] rounded-[11px] border border-cs-line bg-white p-[6px] shadow-[0_18px_48px_rgba(20,30,25,0.16)]">
          <p className="px-[10px] pb-[6px] pt-[4px] text-[11.5px] text-cs-ink-2">{ROLE_JOB[me.role]}</p>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onSwitch} className="flex w-full items-center gap-[9px] rounded-[8px] px-[10px] py-[8px] text-left text-[13px] hover:bg-[#f7f5f0]"><LogOut className="size-[15px] text-cs-ink-2" />Sign out / switch person</button>
        </div>
      )}
    </div>
  );
}

/** Staff sign-in. Demo: pick a seat. Real logins (email or Google, staff only) arrive with the backend. */
function SignInScreen({ team, onPick, toasts }: { team: Teammate[]; onPick: (id: string) => void; toasts: { id: number; text: string; tone: "ok" | "info" | "bad" }[] }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#f6f3ec] px-4 py-[40px]">
      <div className="w-full max-w-[560px]">
        <p className="flex items-baseline gap-[7px]">
          <span className="serif text-[30px] font-semibold leading-none tracking-[-0.02em] text-cs-green">Scouthru</span>
          <span className="rounded-[5px] bg-cs-deep px-[6px] py-[2px] text-[11px] font-semibold tracking-[0.14em] text-white">HQ</span>
        </p>
        <h1 className="serif mt-[18px] text-[28px] font-semibold leading-tight">Team sign in</h1>
        <p className="mt-[4px] text-[13.5px] text-cs-ink-2">Each person sees only their own work. Pick who you are.</p>
        <ul className="mt-[18px] grid gap-[8px]">
          {team.filter((t) => t.active).map((t) => {
            const Icon = ROLE_ICON[t.role];
            return (
              <li key={t.id}>
                <button type="button" onClick={() => onPick(t.id)} className="group flex w-full items-center gap-[12px] rounded-[12px] border border-cs-line bg-white p-[12px] text-left hover:border-cs-green-2/60">
                  <span className="grid size-[42px] shrink-0 place-items-center rounded-full bg-cs-mint text-cs-green-2"><Icon className="size-[19px]" strokeWidth={1.7} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">{t.name}</span>
                    <span className="block text-[12px] text-cs-ink-2">{ROLE_LABEL[t.role]} · {ROLE_JOB[t.role]}</span>
                  </span>
                  <ArrowRight className="size-[16px] text-cs-ink-2 group-hover:text-cs-green" />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-[14px] text-[11.5px] text-cs-ink-2">Demo: real staff logins arrive with the backend. Open a second tab and sign in as someone else to chat between them.</p>
      </div>
      <Toasts toasts={toasts} />
    </div>
  );
}

/** An area that belongs to other roles. */
function NotYours({ path }: { path: string }) {
  return (
    <div className="grid place-items-center py-[80px] text-center">
      <span className="grid size-[52px] place-items-center rounded-full bg-[#f1efe9] text-cs-ink-2"><Lock className="size-[22px]" /></span>
      <p className="serif mt-[12px] text-[22px] font-semibold">This area isn&apos;t part of your work</p>
      <p className="mt-[4px] text-[13.5px] text-cs-ink-2">It belongs to {ownersOf(path).map((r) => ROLE_LABEL[r]).join(", ")}.</p>
      <Link href="/hq" className="mt-[14px] inline-flex items-center gap-[5px] text-[13.5px] font-medium text-cs-green hover:underline">Back to your dashboard <ArrowRight className="size-[14px]" /></Link>
    </div>
  );
}
