"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { Hash, Users } from "lucide-react";
import { useHqMe } from "@/components/hq/shell";
import { Conversation, title } from "@/components/hq/chat";
import { CHANNELS, ROLE_ICON, ROLE_LABEL, canRead, dmId, unread } from "@/lib/hq/team";
import { useHq } from "@/lib/hq/store";
import { cn } from "@/lib/cn";

/** Chat: team channels, direct messages and a thread per member. */
export default function ChatPage() {
  return <Suspense fallback={null}><Chat /></Suspense>;
}


function Chat() {
  const { s } = useHq();
  const me = useHqMe();
  const router = useRouter();
  const params = useSearchParams();
  const asked = params.get("c");
  const to = asked && canRead(me, asked) ? asked : "general";
  const counts = unread(s, me);

  const channels = CHANNELS.filter((c) => c.roles.includes(me.role));
  const people = s.team.filter((t) => t.active && t.id !== me.id);
  // Member threads that have messages, newest first (people who can't read member threads don't see these).
  const threads = useMemo(() => {
    const ids = [...new Set(s.chat.filter((m) => m.to.startsWith("m:")).sort((a, b) => b.at.localeCompare(a.at)).map((m) => m.to))];
    return canRead(me, "m:x") ? ids : [];
  }, [s.chat, me]);
  const go = (c: string) => router.replace(`/hq/chat?c=${encodeURIComponent(c)}`, { scroll: false });

  return (
    <div className="grid h-[calc(100dvh-170px)] min-h-[480px] overflow-hidden rounded-[14px] border border-cs-line bg-white md:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="hidden overflow-y-auto border-r border-cs-line bg-[#fbf8f3] p-[10px] md:block">
        <Side label="Channels">
          {channels.map((c) => <Item key={c.id} active={to === c.id} onClick={() => go(c.id)} icon={<Hash className="size-[15px]" />} label={c.name} n={counts[c.id]} />)}
        </Side>
        <Side label="Direct messages">
          {people.map((t) => {
            const Icon = ROLE_ICON[t.role];
            const id = dmId(me.id, t.id);
            return <Item key={t.id} active={to === id} onClick={() => go(id)} icon={<Icon className="size-[15px]" />} label={t.name} sub={ROLE_LABEL[t.role]} n={counts[id]} />;
          })}
        </Side>
        {threads.length > 0 && (
          <Side label="Member threads">
            {threads.map((id) => <Item key={id} active={to === id} onClick={() => go(id)} icon={<Users className="size-[15px]" />} label={title(s, me, id)} n={counts[id]} />)}
          </Side>
        )}
      </aside>

      <section className="flex min-h-0 flex-col">
        <header className="flex items-center gap-[10px] border-b border-cs-line px-[16px] py-[11px]">
          {/* On phones the conversation list is a dropdown. */}
          <select value={to} onChange={(e) => go(e.target.value)} className="h-[34px] min-w-0 flex-1 rounded-[8px] border border-cs-line bg-white px-[8px] text-[13px] md:hidden" aria-label="Conversation">
            {channels.map((c) => <option key={c.id} value={c.id}>#{c.name}{counts[c.id] ? ` (${counts[c.id]})` : ""}</option>)}
            {people.map((t) => <option key={t.id} value={dmId(me.id, t.id)}>{t.name}{counts[dmId(me.id, t.id)] ? ` (${counts[dmId(me.id, t.id)]})` : ""}</option>)}
            {threads.map((id) => <option key={id} value={id}>{title(s, me, id)}</option>)}
          </select>
          <div className="hidden min-w-0 flex-1 md:block">
            <p className="serif truncate text-[18px] font-semibold">{title(s, me, to)}</p>
            <p className="truncate text-[12px] text-cs-ink-2">
              {to.startsWith("dm:") ? "Direct message" : to.startsWith("m:") ? <>Everything about this member · <Link href={`/hq/members/${to.slice(2)}`} className="text-cs-green hover:underline">open their file</Link></> : CHANNELS.find((c) => c.id === to)?.about}
            </p>
          </div>
        </header>
        <Conversation to={to} />
      </section>
    </div>
  );
}

function Side({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-[12px]">
      <p className="px-[8px] pb-[4px] text-[10.5px] font-semibold tracking-[0.14em] text-cs-ink-2">{label.toUpperCase()}</p>
      <ul className="grid gap-[1px]">{children}</ul>
    </div>
  );
}

function Item({ active, onClick, icon, label, sub, n }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; sub?: string; n?: number }) {
  return (
    <li>
      <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-[8px] rounded-[8px] px-[8px] py-[6px] text-left text-[13px]", active ? "bg-white font-semibold text-cs-green shadow-sm" : "text-[#36312d] hover:bg-white/70")}>
        <span className="shrink-0 text-cs-green-2">{icon}</span>
        <span className="min-w-0 flex-1"><span className={cn("block truncate", n && "font-semibold")}>{label}</span>{sub && <span className="block truncate text-[11px] font-normal text-cs-ink-2">{sub}</span>}</span>
        {!!n && <span className="rounded-full bg-cs-green px-[6px] text-[10.5px] font-semibold leading-[17px] text-white">{n}</span>}
      </button>
    </li>
  );
}
