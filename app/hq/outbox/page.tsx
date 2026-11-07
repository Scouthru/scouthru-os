"use client";

import Link from "next/link";
import { useState } from "react";
import { BellRing, CalendarClock, FileText, Mail, MessageCircle, Send } from "lucide-react";
import { Btn } from "@/components/console/kit";
import { Box } from "@/components/hq/ui";
import { openHq } from "@/components/hq/shell";
import { PACKS, REMIND_EVERY_DAYS, RENEW_WITHIN_DAYS, dueReminders, renewals } from "@/lib/hq/rules";
import { useHq } from "@/lib/hq/store";
import { ago, fmtDate } from "@/lib/console/format";
import { cn } from "@/lib/cn";

/** Outbox: everything going out. Reminders HQ has worked out, renewals, templates, and the log. */
export default function Outbox() {
  const { s, send, sendAllDue, toast } = useHq();
  const [show, setShow] = useState<"all" | "auto">("all");
  const due = dueReminders(s);
  const renew = renewals(s);
  const name = (id: string) => s.members.find((m) => m.id === id)?.name ?? "";
  const log = s.sends.filter((x) => show === "all" || x.auto);

  return (
    <div className="grid gap-[16px]">
      <div>
        <h1 className="serif text-[30px] font-semibold leading-tight tracking-[-0.02em]">Outbox</h1>
        <p className="mt-[2px] text-[13.5px] text-cs-ink-2">Everything going out to members. HQ works out the reminders; you send them in one go.</p>
      </div>

      <div className="grid gap-[16px] lg:grid-cols-2">
        <Box title="Reminders due" icon={BellRing} sub={`Missing documents every ${REMIND_EVERY_DAYS} days · renewals ${RENEW_WITHIN_DAYS} days ahead`}
          right={due.length > 0 ? <Btn kind="primary" icon={Send} onClick={() => { const n = sendAllDue(); toast(`${n} reminder${n === 1 ? "" : "s"} sent on WhatsApp`); }}>Send all {due.length}</Btn> : undefined}>
          {due.length === 0 ? <p className="py-[14px] text-center text-[13px] text-cs-ink-2">Nothing due. HQ queues reminders here when they fall due.</p> : (
            <ul className="divide-y divide-cs-line">
              {due.map((r) => (
                <li key={r.key} className="flex items-center gap-[10px] py-[10px]">
                  <MessageCircle className="size-[16px] shrink-0 text-cs-ok" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/hq/members/${r.memberId}`} className="block truncate text-[13.5px] font-semibold hover:text-cs-green">{name(r.memberId)}</Link>
                    <p className="truncate text-[12px] text-cs-ink-2">{r.pack} · {r.why}</p>
                  </div>
                  <Btn onClick={() => { send(r.memberId, r.pack, "WhatsApp", true); toast(`Sent to ${name(r.memberId)}`); }}>Send</Btn>
                </li>
              ))}
            </ul>
          )}
        </Box>

        <Box title="Renewals" icon={CalendarClock} sub="Licences running out, from approved documents">
          {renew.length === 0 ? <p className="py-[14px] text-center text-[13px] text-cs-ink-2">No licences run out in the next {RENEW_WITHIN_DAYS} days.</p> : (
            <ul className="divide-y divide-cs-line">
              {renew.map((r) => (
                <li key={r.doc.id} className="flex items-center gap-[10px] py-[10px]">
                  <FileText className="size-[16px] shrink-0 text-cs-ink-2" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/hq/members/${r.doc.memberId}#documents`} className="block truncate text-[13.5px] font-semibold hover:text-cs-green">{name(r.doc.memberId)}</Link>
                    <p className="truncate text-[12px] text-cs-ink-2">{r.doc.kind} · valid till {fmtDate(r.doc.validTill)}</p>
                  </div>
                  <span className={cn("rounded-full px-[8px] py-[2px] text-[11.5px] font-medium", r.days < 15 ? "bg-cs-red-bg text-cs-red" : "bg-cs-orange-bg text-[#a9713f]")}>{r.days < 0 ? "Expired" : `${r.days} days left`}</span>
                </li>
              ))}
            </ul>
          )}
        </Box>
      </div>

      <div className="grid gap-[16px] lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Box title="Templates" icon={Send} sub="Pick one, choose who, send">
          <ul className="grid gap-[6px]">
            {PACKS.map((p) => (
              <li key={p}>
                <button type="button" onClick={() => openHq("send", { pack: p })} className="flex w-full items-center justify-between gap-3 rounded-[9px] border border-cs-line px-[11px] py-[9px] text-left text-[13px] font-medium hover:border-cs-green-2/60 hover:bg-cs-mint/30">
                  {p}<span className="text-[11.5px] font-normal text-cs-ink-2">{s.sends.filter((x) => x.pack === p).length} sent</span>
                </button>
              </li>
            ))}
          </ul>
        </Box>

        <Box title="Sent" icon={Mail} sub={`${s.sends.length} messages`}
          right={<div className="flex gap-[4px]">{(["all", "auto"] as const).map((k) => <button key={k} type="button" onClick={() => setShow(k)} className={cn("rounded-full px-[10px] py-[4px] text-[12px]", show === k ? "bg-cs-deep text-white" : "bg-[#f6f0e6]")}>{k === "all" ? "All" : "Automatic"}</button>)}</div>}>
          <ul className="divide-y divide-cs-line">
            {log.slice(0, 25).map((x) => (
              <li key={x.id} className="flex items-center gap-[10px] py-[8px] text-[13px]">
                {x.channel === "WhatsApp" ? <MessageCircle className="size-[15px] shrink-0 text-cs-ok" /> : <Mail className="size-[15px] shrink-0 text-cs-blue" />}
                <span className="min-w-0 flex-1 truncate"><b className="font-medium">{x.pack}</b> to <Link href={`/hq/members/${x.memberId}`} className="hover:text-cs-green">{name(x.memberId)}</Link></span>
                {x.auto && <span className="rounded-full bg-[#f5efe5] px-[6px] text-[10.5px] text-cs-ink-2">automatic</span>}
                <span className="shrink-0 text-[11.5px] text-cs-ink-2">{ago(x.at)}</span>
              </li>
            ))}
          </ul>
        </Box>
      </div>
    </div>
  );
}
