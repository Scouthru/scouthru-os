"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeIndianRupee, Briefcase, Camera, Crown, FolderCheck } from "lucide-react";
import type { ChatMessage, HqState, Role, Teammate } from "./types";
import { TYPE_LABEL, progress } from "./rules";

/**
 * Who does what at Scouthru. Every teammate has one role; the role decides their dashboard,
 * which areas they can open and which chat channels they're in.
 */

export const ROLE_LABEL: Record<Role, string> = { owner: "Owner", onboarding: "Onboarding", field: "Field visits", sales: "Sales and operations", accounts: "Accounts" };
export const ROLE_ICON: Record<Role, typeof Crown> = { owner: Crown, onboarding: FolderCheck, field: Camera, sales: Briefcase, accounts: BadgeIndianRupee };
export const ROLE_JOB: Record<Role, string> = {
  owner: "Sees everything, approves members, watches money and the team",
  onboarding: "Collects and checks documents, chases members, hands over to field",
  field: "Visits factories, fills the visit report and takes the photos",
  sales: "Picks up enquiries, matches factories, follows up quotes",
  accounts: "Invoices, payments, the reserve fund and money leaks",
};

/** Areas of HQ and the roles that can open them. Anything not listed is open to everyone. */
const AREAS: [prefix: string, roles: Role[]][] = [
  ["/hq/finance", ["owner", "accounts"]],
  ["/hq/enquiries", ["owner", "sales"]],
  ["/hq/inbox", ["owner", "onboarding"]],
  ["/hq/outbox", ["owner", "onboarding"]],
  ["/hq/visits", ["owner", "onboarding", "field"]],
  ["/hq/members", ["owner", "onboarding", "field"]],
  ["/hq/team", ["owner"]],
];
export const canOpen = (role: Role, path: string) => AREAS.find(([p]) => path.startsWith(p))?.[1].includes(role) ?? true;
export const ownersOf = (path: string) => AREAS.find(([p]) => path.startsWith(p))?.[1] ?? [];

/** The tabs each role sees, in order. The first is their own dashboard. */
export const TABS_FOR: Record<Role, string[]> = {
  owner: ["/hq", "/hq/chat", "/hq/enquiries", "/hq/members", "/hq/inbox", "/hq/outbox", "/hq/visits", "/hq/finance", "/hq/team"],
  onboarding: ["/hq", "/hq/chat", "/hq/members", "/hq/inbox", "/hq/outbox", "/hq/visits"],
  field: ["/hq", "/hq/chat", "/hq/visits"],
  sales: ["/hq", "/hq/chat", "/hq/enquiries"],
  accounts: ["/hq", "/hq/chat", "/hq/finance"],
};

/** Team channels and who's in them. */
export const CHANNELS: { id: string; name: string; about: string; roles: Role[] }[] = [
  { id: "general", name: "general", about: "Everyone at Scouthru", roles: ["owner", "onboarding", "field", "sales", "accounts"] },
  { id: "onboarding", name: "onboarding", about: "Documents, approvals, members going live", roles: ["owner", "onboarding", "field"] },
  { id: "field", name: "field", about: "Visits and photos", roles: ["owner", "onboarding", "field"] },
  { id: "sales", name: "sales", about: "Enquiries and quotes", roles: ["owner", "sales", "accounts"] },
  { id: "finance", name: "finance", about: "Invoices and payments", roles: ["owner", "accounts", "sales"] },
];

export const dmId = (a: string, b: string) => `dm:${[a, b].sort().join(":")}`;

/** Can this teammate see this conversation? */
export function canRead(me: Teammate, to: string) {
  if (to.startsWith("dm:")) return to.split(":").includes(me.id);
  if (to.startsWith("m:")) return me.role === "owner" || me.role === "onboarding" || me.role === "field";
  return CHANNELS.find((c) => c.id === to)?.roles.includes(me.role) ?? false;
}

/** Unread messages for this teammate, per conversation (their own don't count). */
export function unread(s: HqState, me: Teammate) {
  const seen = s.reads[me.id] ?? {};
  const out: Record<string, number> = {};
  for (const m of s.chat) {
    if (m.from === me.id || !canRead(me, m.to)) continue;
    if (!seen[m.to] || m.at > seen[m.to]) out[m.to] = (out[m.to] ?? 0) + 1;
  }
  return out;
}

/** Messages that @mention this teammate and they haven't read yet. */
export const mentions = (s: HqState, me: Teammate) => {
  const seen = s.reads[me.id] ?? {};
  return s.chat.filter((m) => m.from !== me.id && canRead(me, m.to) && m.text.includes(`@${me.name}`) && (!seen[m.to] || m.at > seen[m.to]));
};

const ME = "scouthru-hq-me";
const EVENT = "scouthru-hq-me";

/**
 * Who is signed in to HQ in this browser tab. Kept per tab (sessionStorage), so two tabs can
 * be two teammates chatting to each other. Real staff logins arrive with the backend.
 */
export function useMe(team: Teammate[]) {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const read = () => {
      try { setId(sessionStorage.getItem(ME) ?? localStorage.getItem(ME)); } catch { setId(null); }
    };
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, []);
  const signIn = useCallback((teammateId: string) => {
    try { sessionStorage.setItem(ME, teammateId); localStorage.setItem(ME, teammateId); } catch { /* blocked storage */ }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  const signOut = useCallback(() => {
    try { sessionStorage.removeItem(ME); localStorage.removeItem(ME); } catch { /* blocked storage */ }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  const me = team.find((t) => t.id === id && t.active) ?? null;
  return { me, signIn, signOut };
}

const uid = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export function post(d: HqState, from: string, to: string, text: string, ref?: ChatMessage["ref"]) {
  d.chat.push({ id: uid(), at: new Date().toISOString(), from, to, text, ref });
}

const first = (d: HqState, role: Role) => d.team.find((t) => t.role === role && t.active);
const tag = (t?: Teammate) => (t ? `@${t.name}` : "");

/**
 * Hand-offs between teammates, worked out after every change by comparing before and after:
 * a new member gets an onboarding owner, approved documents send the member to field, a done
 * visit asks the owner to approve, going live is announced, and a won enquiry goes to accounts.
 */
export function handoffs(prev: HqState, d: HqState) {
  for (const m of d.members) {
    const before = prev.members.find((x) => x.id === m.id);
    const ref = { kind: "member" as const, id: m.id };
    if (!before) {
      const o = (m.ownerId && d.team.find((t) => t.id === m.ownerId)) || first(d, "onboarding");
      if (o && !m.ownerId) m.ownerId = o.id;
      post(d, "hq", "onboarding", `New ${TYPE_LABEL[m.type].toLowerCase()}: ${m.name}, ${m.city}. Onboarding is with ${tag(o)}.`, ref);
      continue;
    }
    const was = progress(prev, before).stage;
    const now = progress(d, m).stage;
    if (was === now) continue;
    if (now === "Visit") {
      const f = (m.fieldId && d.team.find((t) => t.id === m.fieldId)) || first(d, "field");
      if (f && !m.fieldId) m.fieldId = f.id;
      post(d, "hq", "field", `${m.name} has all documents approved. Ready for a visit in ${m.city}. ${tag(f)}`, ref);
    }
    if (now === "Review") post(d, "hq", "onboarding", `${m.name} is ready for approval: documents${m.visit?.done ? `, visit (${m.visit.score}/5)` : ""} all done. ${tag(first(d, "owner"))}`, ref);
    if (now === "Live") post(d, "hq", "general", `${m.name} is now live on Scouthru.`, ref);
  }
  for (const e of d.enquiries) {
    const before = prev.enquiries.find((x) => x.id === e.id);
    const ref = { kind: "enquiry" as const, id: e.id };
    if (!before) { post(d, "hq", "sales", `New ${e.channel} enquiry: ${e.product}, ${e.qty.toLocaleString("en-IN")} units for ${e.buyer}. Who's picking it up?`, ref); continue; }
    if (before.status !== "Won" && e.status === "Won") post(d, "hq", "finance", `${e.product} for ${e.buyer} is won${e.value ? ` (₹${e.value.toLocaleString("en-IN")})` : ""}. Please raise the invoice. ${tag(first(d, "accounts"))}`, ref);
    if (before.assigneeId !== e.assigneeId && e.assigneeId) {
      const a = d.team.find((t) => t.id === e.assigneeId);
      post(d, "hq", "sales", `${e.product} for ${e.buyer} is now with ${tag(a)}.`, ref);
    }
  }
}
