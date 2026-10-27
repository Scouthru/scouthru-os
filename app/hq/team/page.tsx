"use client";

import Link from "next/link";
import { useState } from "react";
import { MessagesSquare, Plus, UserCog } from "lucide-react";
import { Btn, inputCls } from "@/components/console/kit";
import { Box } from "@/components/hq/ui";
import { useHqMe } from "@/components/hq/shell";
import { ROLE_ICON, ROLE_JOB, ROLE_LABEL, TABS_FOR, dmId, post } from "@/lib/hq/team";
import { log, useHq } from "@/lib/hq/store";
import type { Role } from "@/lib/hq/types";
import { cn } from "@/lib/cn";

const ROLES: Role[] = ["owner", "onboarding", "field", "sales", "accounts"];
const AREA: Record<string, string> = { "/hq": "Dashboard", "/hq/chat": "Chat", "/hq/enquiries": "Enquiries", "/hq/members": "Onboarding", "/hq/inbox": "Inbox", "/hq/outbox": "Outbox", "/hq/visits": "Visits", "/hq/finance": "Finance", "/hq/team": "Team" };

/** Team: who's on it, what each role does and can open, and handing work over. */
export default function Team() {
  const { s, update, toast } = useHq();
  const me = useHqMe();
  const [add, setAdd] = useState({ name: "", role: "onboarding" as Role });
  const [handFrom, setHandFrom] = useState("");
  const [handTo, setHandTo] = useState("");

  const edit = (id: string, patch: Partial<(typeof s.team)[number]>) => update((d) => { Object.assign(d.team.find((t) => t.id === id)!, patch); });
  const from = s.team.find((t) => t.id === handFrom);
  const sameRole = s.team.filter((t) => t.active && from && t.role === from.role && t.id !== from.id);

  const handOver = () => {
    const a = s.team.find((t) => t.id === handFrom);
    const b = s.team.find((t) => t.id === handTo);
    if (!a || !b) return;
    let n = 0;
    update((d) => {
      d.members.forEach((m) => { if (m.ownerId === a.id) { m.ownerId = b.id; n++; } if (m.fieldId === a.id) { m.fieldId = b.id; n++; } });
      d.enquiries.forEach((e) => { if (e.assigneeId === a.id && e.status !== "Won" && e.status !== "Lost") { e.assigneeId = b.id; n++; } });
      d.tasks.forEach((t) => { if (t.assigneeId === a.id && !t.done) { t.assigneeId = b.id; n++; } });
      post(d, "hq", "general", `${a.name}'s work has been handed over to @${b.name}.`);
      log(d, `Work handed over from ${a.name} to ${b.name}`);
    });
    toast(`${n} item${n === 1 ? "" : "s"} handed over to ${b.name}`);
    setHandFrom(""); setHandTo("");
  };

  return (
    <div className="grid gap-[16px]">
      <div>
        <h1 className="serif text-[30px] font-semibold leading-tight tracking-[-0.02em]">Team</h1>
        <p className="mt-[2px] text-[13.5px] text-cs-ink-2">Each person has one role. The role decides their dashboard, what they can open and which chat channels they&apos;re in.</p>
      </div>

      <Box title="People" icon={UserCog} sub="Rename each seat to the real person">
        <ul className="divide-y divide-cs-line">
          {s.team.map((t) => {
            const Icon = ROLE_ICON[t.role];
            return (
              <li key={t.id} className={cn("grid items-center gap-[10px] py-[10px] md:grid-cols-[minmax(0,1.2fr)_200px_minmax(0,1fr)_auto]", !t.active && "opacity-50")}>
                <span className="flex min-w-0 items-center gap-[10px]">
                  <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-cs-mint text-cs-green-2"><Icon className="size-[16px]" strokeWidth={1.8} /></span>
                  <input value={t.name} onChange={(e) => edit(t.id, { name: e.target.value })} className={cn(inputCls, "font-semibold")} aria-label="Name" />
                </span>
                <select value={t.role} disabled={t.id === me.id} onChange={(e) => edit(t.id, { role: e.target.value as Role })} className={inputCls} aria-label="Role" title={t.id === me.id ? "You can't change your own role" : undefined}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
                <span className="text-[12px] text-cs-ink-2">{TABS_FOR[t.role].map((p) => AREA[p]).join(" · ")}</span>
                <span className="flex items-center gap-[8px]">
                  {t.id !== me.id && <Link href={`/hq/chat?c=${encodeURIComponent(dmId(me.id, t.id))}`} aria-label={`Message ${t.name}`} className="grid size-[34px] place-items-center rounded-[8px] border border-cs-line text-cs-green-2 hover:border-cs-green-2/60"><MessagesSquare className="size-[15px]" /></Link>}
                  {t.id !== me.id && <Btn onClick={() => edit(t.id, { active: !t.active })}>{t.active ? "Deactivate" : "Reactivate"}</Btn>}
                </span>
              </li>
            );
          })}
        </ul>
        <form className="mt-[12px] flex flex-wrap gap-[8px]" onSubmit={(e) => {
          e.preventDefault();
          if (!add.name.trim()) return;
          update((d) => { d.team.push({ id: `t${Date.now()}`, name: add.name.trim(), role: add.role, active: true }); post(d, "hq", "general", `Welcome @${add.name.trim()} (${ROLE_LABEL[add.role]}) to the team.`); });
          toast(`${add.name.trim()} added`);
          setAdd({ name: "", role: "onboarding" });
        }}>
          <input value={add.name} onChange={(e) => setAdd((x) => ({ ...x, name: e.target.value }))} placeholder="Name" className={cn(inputCls, "w-auto min-w-[200px] flex-1")} aria-label="New teammate's name" />
          <select value={add.role} onChange={(e) => setAdd((x) => ({ ...x, role: e.target.value as Role }))} className={cn(inputCls, "w-[200px]")} aria-label="Role">
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <Btn kind="primary" icon={Plus} type="submit">Add teammate</Btn>
        </form>
      </Box>

      <div className="grid gap-[16px] lg:grid-cols-2">
        <Box title="Hand over work" icon={UserCog} sub="Someone on leave or leaving? Move their open work to a colleague">
          <div className="grid gap-[8px] sm:grid-cols-[1fr_1fr_auto]">
            <select value={handFrom} onChange={(e) => { setHandFrom(e.target.value); setHandTo(""); }} className={inputCls} aria-label="From">
              <option value="">From…</option>
              {s.team.filter((t) => t.id !== me.id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={handTo} onChange={(e) => setHandTo(e.target.value)} disabled={!from} className={inputCls} aria-label="To">
              <option value="">{from && !sameRole.length ? `No other ${ROLE_LABEL[from.role].toLowerCase()} person` : "To…"}</option>
              {sameRole.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <Btn kind="primary" disabled={!handFrom || !handTo} onClick={handOver}>Hand over</Btn>
          </div>
          <p className="mt-[8px] text-[11.5px] text-cs-ink-2">Moves their members, visits, open enquiries and open tasks, and posts it in #general.</p>
        </Box>

        <Box title="What each role does" icon={UserCog}>
          <ul className="grid gap-[8px]">
            {ROLES.map((r) => {
              const Icon = ROLE_ICON[r];
              return <li key={r} className="flex items-start gap-[9px] text-[12.5px]"><Icon className="mt-[1px] size-[15px] shrink-0 text-cs-green-2" /><span><b className="font-semibold">{ROLE_LABEL[r]}</b> · {ROLE_JOB[r]}</span></li>;
            })}
          </ul>
        </Box>
      </div>
    </div>
  );
}
