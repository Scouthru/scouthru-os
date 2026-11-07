"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Bell, Check, Settings2 } from "lucide-react";
import { Hero, Menu } from "./kit";
import { portalOf } from "./portals";
import { useConsole } from "@/lib/console/store";
import { PORTAL_CATEGORIES, notices, unreadCount, type Notice } from "@/lib/console/notify";
import { ago } from "@/lib/console/format";
import type { Portal } from "@/lib/console/types";
import { cn } from "@/lib/cn";

const CENTER: Record<Portal, string> = { brand: "/console/notifications", maker: "/console/maker/notifications", supplier: "/console/supplier/notifications", distributor: "/console/distributor/notifications" };

/**
 * Repeats collapse into one row, like the dashboard: the same step on several records
 * ("Waiting for your approval" ×6), or updates of one kind on one day. Overdue items stay separate.
 */
function grouped(list: Notice[]) {
  const out: { key: string; items: Notice[] }[] = [];
  for (const n of list) {
    const day = n.at?.slice(0, 10) ?? "";
    const verb = n.title.split(/[\s:]/)[0];
    const key = n.late ? n.id : n.kind === "update" ? `${n.cat}|${day}|${verb}` : `act|${n.cat}|${n.title}`;
    const g = out.find((x) => x.key === key);
    if (g) g.items.push(n); else out.push({ key, items: [n] });
  }
  return out;
}

function Row({ group, onOpen }: { group: { key: string; items: Notice[] }; onOpen: (n: Notice[]) => void }) {
  const { s } = useConsole();
  const n = group.items[0];
  const many = group.items.length > 1;
  const unread = group.items.some((x) => !s.readNotifications.includes(x.id));
  return (
    <li>
      <button type="button" onClick={() => onOpen(group.items)} className="flex w-full items-start gap-[11px] px-[14px] py-[10px] text-left hover:bg-[#f8f3eb]">
        <span className={cn("mt-[6px] size-[8px] shrink-0 rounded-full", unread ? (n.kind === "action" ? "bg-cs-green" : "bg-cs-blue") : "bg-transparent")} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-[8px]">
            <span className="monolabel">{n.kind === "action" ? "Needs you" : "Update"} · {n.cat}</span>
            {n.late && <span className="text-[11px] font-medium text-cs-red">Overdue</span>}
            {n.at && <span className="text-[11px] text-cs-ink-2" suppressHydrationWarning>{ago(n.at)}</span>}
          </span>
          <span className={cn("mt-[2px] block text-[13px] leading-snug", unread ? "font-medium text-cs-ink" : "text-[#48413b]")}>
            {many ? (n.kind === "action" ? `${group.items.length} × ${n.title}` : `${group.items.length} updates: ${n.title.split(/[:·]/)[0].trim()}…`) : n.title}
          </span>
          <span className="mt-[1px] block truncate text-[11.5px] text-cs-ink-2">{many ? group.items.map((x) => (n.kind === "action" ? x.sub.split(" · ")[0] : x.sub)).filter((v, i, a) => a.indexOf(v) === i).join(", ") : n.sub}</span>
        </span>
        <ArrowRight className="mt-[4px] size-[14px] shrink-0 text-cs-ink-2" />
      </button>
    </li>
  );
}

/** Header bell: unread count, the latest few, and a link to the full center with settings. */
export function NotificationBell({ portal }: { portal: Portal }) {
  const { s, update } = useConsole();
  const router = useRouter();
  const list = useMemo(() => notices(s, portal), [s, portal]);
  const unread = unreadCount(s, list);
  const markRead = (ids: string[]) => update((d) => { d.readNotifications = Array.from(new Set([...d.readNotifications, ...ids])).slice(-400); });
  return (
    <Menu
      align="right"
      trigger={
        <button type="button" aria-label={`Notifications, ${unread} unread`} className="relative grid size-[34px] place-items-center rounded-full hover:bg-cs-cream">
          <Bell className="size-[21px] text-[#36312d]" strokeWidth={1.6} />
          {unread > 0 && <span className="absolute -right-[3px] -top-[2px] grid h-[17px] min-w-[17px] place-items-center rounded-full border-[1.5px] border-cs-ground bg-cs-red px-[3px] text-[10px] font-semibold text-white">{unread > 99 ? "99+" : unread}</span>}
        </button>
      }
    >
      {(close) => (
        <div className="w-[min(380px,calc(100vw-24px))]">
          <div className="flex items-center justify-between px-[14px] pb-[8px] pt-[6px]">
            <p className="serif text-[17px] font-semibold">Notifications</p>
            <button type="button" className="text-[12px] font-medium text-cs-green disabled:opacity-40" disabled={unread === 0} onClick={() => markRead(list.map((n) => n.id))}>Mark all read</button>
          </div>
          <ul className="max-h-[380px] overflow-y-auto border-t border-cs-line">
            {grouped(list).slice(0, 8).map((g) => <Row key={g.key} group={g} onOpen={(items) => { markRead(items.map((x) => x.id)); close(); router.push(items.length > 1 && items[0].kind === "action" ? items[0].href.split("?")[0] : items[0].href); }} />)}
            {list.length === 0 && <li className="px-[14px] py-[18px] text-[13px] text-cs-ink-2">You&apos;re all caught up.</li>}
          </ul>
          <Link href={CENTER[portal]} onClick={close} className="flex items-center justify-between border-t border-cs-line px-[14px] py-[10px] text-[12.5px] font-medium text-cs-green hover:bg-[#f8f3eb]">
            See all and notification settings<ArrowRight className="size-[14px]" />
          </Link>
        </div>
      )}
    </Menu>
  );
}

/** Full notification center page with filters and per-category settings. */
export function NotificationCenter() {
  const { s, update } = useConsole();
  const router = useRouter();
  const portal = portalOf(usePathname());
  const all = useMemo(() => {
    // The center lists everything so switched-off categories can still be reviewed; only the bell respects the settings.
    const off = s.notifyOff?.[portal] ?? [];
    return { shown: notices(s, portal, true), off };
  }, [s, portal]);
  const [view, setView] = useState<"all" | "action" | "update" | "unread">("all");
  const list = all.shown.filter((n) => view === "all" || (view === "unread" ? !s.readNotifications.includes(n.id) : n.kind === view));
  const markRead = (ids: string[]) => update((d) => { d.readNotifications = Array.from(new Set([...d.readNotifications, ...ids])).slice(-400); });
  const toggle = (cat: string) => update((d) => {
    const cur = new Set(d.notifyOff?.[portal] ?? []);
    if (cur.has(cat)) cur.delete(cat); else cur.add(cat);
    d.notifyOff = { ...(d.notifyOff ?? {}), [portal]: Array.from(cur) };
  });
  const counts = { all: all.shown.length, action: all.shown.filter((n) => n.kind === "action").length, update: all.shown.filter((n) => n.kind === "update").length, unread: unreadCount(s, all.shown) };

  return (
    <div>
      {/* Same photo and quote as the dashboard: the photo carries that quote card baked in. */}
      <Hero eyebrow="STAY ON TOP" title="Notifications" lede="What needs you, and what others did on your records in the last two weeks." img="/console/hero-dashboard-v2.jpg" quote={["Ideas.", "Samples.", "Production.", "To global markets."]} />
      <div className="grid items-start gap-[12px] px-[15px] pb-[20px] pt-[2px] min-[1024px]:grid-cols-[minmax(0,1fr)_320px]">
        <section className="cs-card min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-[10px] px-[14px] pt-[12px]">
            <div className="flex flex-wrap gap-[6px]" role="group" aria-label="Show">
              {([["all", "All"], ["action", "Needs you"], ["update", "Updates"], ["unread", "Unread"]] as const).map(([k, label]) => (
                <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)} className={cn("rounded-full border px-[11px] py-[4px] text-[12px]", view === k ? "border-cs-green bg-cs-green text-white" : "border-[#d5c9b7] text-cs-ink-2 hover:border-[#ad9c8e]")}>
                  {label} ({counts[k]})
                </button>
              ))}
            </div>
            <button type="button" className="text-[12.5px] font-medium text-cs-green disabled:opacity-40" disabled={counts.unread === 0} onClick={() => markRead(all.shown.map((n) => n.id))}>Mark all read</button>
          </div>
          <ul className="mt-[10px] divide-y divide-cs-line border-t border-cs-line">
            {grouped(list).map((g) => <Row key={g.key} group={g} onOpen={(items) => { markRead(items.map((x) => x.id)); router.push(items.length > 1 && items[0].kind === "action" ? items[0].href.split("?")[0] : items[0].href); }} />)}
            {list.length === 0 && <li className="flex items-center gap-[8px] px-[14px] py-[18px] text-[13px] text-cs-ink-2"><Check className="size-[15px] text-cs-ok" />Nothing here.</li>}
          </ul>
        </section>

        <aside className="cs-card px-[14px] pb-[14px] pt-[13px]">
          <p className="serif flex items-center gap-[8px] text-[17px] font-semibold"><Settings2 className="size-[17px]" />Notification settings</p>
          <p className="mt-[3px] text-[12px] text-cs-ink-2">Choose what the bell tells you about. This page always lists everything, and things that need you stay on your dashboard.</p>
          <ul className="mt-[10px] divide-y divide-cs-line">
            {PORTAL_CATEGORIES[portal].map((cat) => {
              const on = !all.off.includes(cat);
              return (
                <li key={cat} className="flex items-center justify-between py-[9px] text-[13px]">
                  <span>{cat}</span>
                  <button type="button" role="switch" aria-checked={on} aria-label={`${cat} notifications`} onClick={() => toggle(cat)} className={cn("relative h-[22px] w-[40px] rounded-full transition-colors", on ? "bg-cs-green" : "bg-[#d5c9b7]")}>
                    <span className={cn("absolute top-[3px] size-[16px] rounded-full bg-white transition-all", on ? "left-[21px]" : "left-[3px]")} />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-[8px] text-[11px] text-cs-ink-2">Saved on this device for now. Email and WhatsApp alerts come with the backend.</p>
        </aside>
      </div>
    </div>
  );
}
