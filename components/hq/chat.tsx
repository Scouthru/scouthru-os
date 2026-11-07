"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bot, MessagesSquare, SendHorizontal, Users } from "lucide-react";
import { useHqMe } from "./shell";
import { ROLE_ICON, ROLE_LABEL, canRead, post } from "@/lib/hq/team";
import { useHq } from "@/lib/hq/store";
import type { ChatMessage, HqState, Teammate } from "@/lib/hq/types";
import { ago } from "@/lib/console/format";
import { cn } from "@/lib/cn";

/** Name of a conversation: a channel, the other person in a DM, or the member a thread is about. */
export function title(s: HqState, me: Teammate, to: string) {
  if (to.startsWith("dm:")) return s.team.find((t) => to.split(":").slice(1).includes(t.id) && t.id !== me.id)?.name ?? "Direct message";
  if (to.startsWith("m:")) return s.members.find((m) => m.id === to.slice(2))?.name ?? "Member";
  return `#${to}`;
}

/**
 * The messages of one conversation plus the box to write in. Marks the conversation read
 * while it's open. Used by the Chat page and by the Discuss box on a member's file.
 */
export function Conversation({ to, compact }: { to: string; compact?: boolean }) {
  const { s, update } = useHq();
  const me = useHqMe();
  const [text, setText] = useState("");
  const [at, setAt] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const list = s.chat.filter((m) => m.to === to).sort((a, b) => a.at.localeCompare(b.at));
  const last = list[list.length - 1]?.at;

  // Read up to the newest message whenever it changes while open.
  useEffect(() => {
    const seen = s.reads[me.id]?.[to];
    if (last && (!seen || seen < last)) update((d) => { d.reads[me.id] = { ...(d.reads[me.id] ?? {}), [to]: new Date().toISOString() }; });
    end.current?.scrollIntoView({ block: "end" });
  }, [to, last, me.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const who = (m: ChatMessage) => s.team.find((t) => t.id === m.from);
  const names = s.team.filter((t) => t.active && t.id !== me.id);
  const suggest = at !== null ? names.filter((t) => t.name.toLowerCase().startsWith(at.toLowerCase())) : [];
  const send = () => {
    const t = text.trim();
    if (!t) return;
    const ref = to.startsWith("m:") ? { kind: "member" as const, id: to.slice(2) } : undefined;
    update((d) => { post(d, me.id, to, t, ref); d.reads[me.id] = { ...(d.reads[me.id] ?? {}), [to]: new Date().toISOString() }; });
    setText("");
    setAt(null);
  };

  return (
    <>
      <div className={cn("min-h-0 flex-1 overflow-y-auto px-[16px] py-[12px]", compact && "max-h-[340px]")}>
        {list.length === 0 && <p className="py-[30px] text-center text-[13px] text-cs-ink-2">No messages yet. Say hello.</p>}
        <ul className="grid gap-[12px]">
          {list.map((m, i) => {
            const t = who(m);
            const same = i > 0 && list[i - 1].from === m.from && new Date(m.at).getTime() - new Date(list[i - 1].at).getTime() < 5 * 6e4;
            const mine = m.from === me.id;
            const Icon = t ? ROLE_ICON[t.role] : Bot;
            return (
              <li key={m.id} className={cn("flex gap-[10px]", same && "-mt-[8px]")}>
                <span className={cn("grid size-[32px] shrink-0 place-items-center rounded-full", same && "invisible", m.from === "hq" ? "bg-[#f5efe5] text-cs-ink-2" : mine ? "bg-cs-green text-white" : "bg-cs-mint text-cs-green-2")}><Icon className="size-[15px]" strokeWidth={1.8} /></span>
                <div className="min-w-0 flex-1">
                  {!same && (
                    <p className="flex items-baseline gap-[8px] text-[12.5px]">
                      <b className="font-semibold">{m.from === "hq" ? "Scouthru HQ" : t?.name ?? "Former teammate"}</b>
                      <span className="text-[11px] text-cs-ink-2">{m.from === "hq" ? "automatic" : t ? ROLE_LABEL[t.role] : ""} · {ago(m.at)}</span>
                    </p>
                  )}
                  <p className={cn("mt-[2px] whitespace-pre-wrap text-[13.5px] leading-[1.5]", m.from === "hq" && "text-[#48413b]")}><Mentions text={m.text} me={me} /></p>
                  {m.ref && <RefChip refd={m.ref} />}
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={end} />
      </div>
      <div className="relative border-t border-cs-line p-[10px]">
        {suggest.length > 0 && (
          <ul className="absolute bottom-full left-[10px] mb-[4px] w-[240px] rounded-[10px] border border-cs-line bg-white p-[4px] shadow-lg">
            {suggest.map((t) => (
              <li key={t.id}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setText((x) => x.replace(/@([^@\s]*)$/, `@${t.name} `)); setAt(null); }} className="w-full rounded-[7px] px-[9px] py-[6px] text-left text-[13px] hover:bg-[#f9f5ee]">
                  @{t.name} <span className="text-[11px] text-cs-ink-2">{ROLE_LABEL[t.role]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-[8px]">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); const m = /@([^@\s]*)$/.exec(e.target.value); setAt(m ? m[1] : null); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder={`Message ${title(s, me, to)} · @ to mention someone`}
            className="max-h-[120px] min-h-[42px] flex-1 resize-none rounded-[10px] border border-[#e1d8ca] bg-white px-[12px] py-[10px] text-[13.5px] outline-none focus:border-cs-green"
            aria-label="Message"
          />
          <button type="submit" disabled={!text.trim()} aria-label="Send" className="grid size-[42px] shrink-0 place-items-center rounded-[10px] bg-cs-green text-white disabled:opacity-40"><SendHorizontal className="size-[18px]" /></button>
        </form>
      </div>
    </>
  );
}

function Mentions({ text, me }: { text: string; me: Teammate }) {
  const { s } = useHq();
  const names = s.team.map((t) => t.name).sort((a, b) => b.length - a.length);
  if (!names.length) return <>{text}</>;
  const re = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`, "g");
  return <>{text.split(re).map((part, i) => (part.startsWith("@") && names.includes(part.slice(1)) ? <span key={i} className={cn("rounded-[4px] px-[2px] font-medium", part === `@${me.name}` ? "bg-cs-orange-bg text-[#a9713f]" : "text-cs-green")}>{part}</span> : part))}</>;
}

function RefChip({ refd }: { refd: NonNullable<ChatMessage["ref"]> }) {
  const { s } = useHq();
  const me = useHqMe();
  if (refd.kind === "member") {
    const m = s.members.find((x) => x.id === refd.id);
    if (!m || !canRead(me, "m:x")) return null;
    return <Link href={`/hq/members/${m.id}`} className="mt-[5px] inline-flex items-center gap-[5px] rounded-full border border-cs-line px-[9px] py-[2px] text-[11.5px] text-cs-green hover:border-cs-green-2/60"><Users className="size-[12px]" />{m.name}</Link>;
  }
  const e = s.enquiries.find((x) => x.id === refd.id);
  if (!e) return null;
  return <span className="mt-[5px] inline-flex items-center gap-[5px] rounded-full border border-cs-line px-[9px] py-[2px] text-[11.5px] text-cs-ink-2"><MessagesSquare className="size-[12px]" />{e.product} · {e.buyer}</span>;
}
