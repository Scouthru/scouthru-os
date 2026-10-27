import { Factory, PackageOpen, Store, Warehouse } from "lucide-react";
import type { Doc, HqState, Member, MemberType, Stage } from "./types";

/** The onboarding rules: what each kind of member hands over, and how HQ decides what's next. */

export const TYPE_LABEL: Record<MemberType, string> = { maker: "Manufacturer", supplier: "Supplier", distributor: "Distributor", brand: "Product owner" };
export const TYPE_ICON: Record<MemberType, typeof Factory> = { maker: Factory, supplier: PackageOpen, distributor: Warehouse, brand: Store };

export const REQUIRED_DOCS: Record<MemberType, string[]> = {
  maker: ["GST certificate", "FSSAI licence", "GMP certificate", "PAN card", "Cancelled cheque", "Signed agreement"],
  supplier: ["GST certificate", "PAN card", "Product catalogue", "Cancelled cheque", "Signed agreement"],
  distributor: ["GST certificate", "FSSAI licence", "PAN card", "Cancelled cheque", "Signed agreement"],
  brand: ["GST certificate", "PAN card", "Trademark certificate", "Signed agreement"],
};
/** Documents that run out and need renewing; HQ asks for the valid-till date when approving them. */
export const EXPIRING = ["FSSAI licence", "GMP certificate"];

export const PHOTO_KINDS: Record<MemberType, string[]> = {
  maker: ["Front of the plant", "Production line", "Quality lab", "Warehouse", "Packing area"],
  supplier: ["Front of the unit", "Production floor", "Stock room", "Sample products"],
  distributor: ["Warehouse", "Cold storage", "Delivery vans", "Office"],
  brand: ["Products", "Packaging"],
};
export const MIN_PHOTOS: Record<MemberType, number> = { maker: 3, supplier: 2, distributor: 2, brand: 0 };
export const NEEDS_VISIT: Record<MemberType, boolean> = { maker: true, supplier: true, distributor: true, brand: false };

/** What the team checks on a visit. */
export const VISIT_CHECKS: Record<MemberType, string[]> = {
  maker: ["Licences on the wall match the documents", "Machines are as described", "Floor is clean and hygienic", "Quality lab on site", "Capacity looks right"],
  supplier: ["Licences match the documents", "Machines are as described", "Stock on hand", "Storage is clean and dry"],
  distributor: ["Licences match the documents", "Warehouse is clean and dry", "Cold storage works (if any)", "Vans and delivery set-up"],
  brand: [],
};

export const STAGES: Stage[] = ["New", "Documents", "Visit", "Review", "Live"];
export const stagesFor = (t: MemberType): Stage[] => (NEEDS_VISIT[t] ? STAGES : STAGES.filter((x) => x !== "Visit"));

export const PACKS = ["Welcome kit", "Onboarding checklist", "Missing documents reminder", "Renewal reminder", "Plans and pricing", "Agreement to sign", "Login details"] as const;
const WELCOME = ["Welcome kit", "Onboarding checklist"];

const DAY = 864e5;
export const REMIND_EVERY_DAYS = 3;

/** Calendar days from today to a yyyy-mm-dd date (negative when past), in the viewer's own calendar. */
export function daysFromToday(date: string, now = Date.now()) {
  const t = new Date(now);
  const today = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
  const [y, mo, d] = date.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(y, mo - 1, d) - today) / DAY);
}
export const RENEW_WITHIN_DAYS = 45;

/** Best guess of a document's kind from its file name; falls back to the first one still missing. */
export function guessDoc(fileName: string, missing: string[]) {
  const rules: [RegExp, string][] = [
    [/gst/i, "GST certificate"], [/fssai/i, "FSSAI licence"], [/gmp/i, "GMP certificate"], [/\bpan\b|pan[_ -]?card/i, "PAN card"],
    [/cheque|check|bank/i, "Cancelled cheque"], [/agree|contract|mou|sign/i, "Signed agreement"], [/trade ?mark|\btm\b/i, "Trademark certificate"],
    [/catalog/i, "Product catalogue"],
  ];
  return rules.find(([re]) => re.test(fileName))?.[1] ?? missing[0] ?? "Other";
}

/** Best guess of what a photo shows from its file name; falls back to the first kind not photographed yet. */
export function guessPhoto(fileName: string, kinds: string[], have: string[]) {
  const words: [RegExp, string[]][] = [
    [/front|gate|outside|building|exterior/i, ["Front of the plant", "Front of the unit"]],
    [/line|machine|production|floor/i, ["Production line", "Production floor"]],
    [/lab|test|qc|quality/i, ["Quality lab"]],
    [/warehouse|godown|store|stock/i, ["Warehouse", "Stock room"]],
    [/pack/i, ["Packing area", "Packaging"]],
    [/cold|freez|chill/i, ["Cold storage"]],
    [/van|truck|vehicle|fleet/i, ["Delivery vans"]],
    [/office/i, ["Office"]],
    [/sample|product/i, ["Sample products", "Products"]],
  ];
  for (const [re, options] of words) {
    const hit = options.find((o) => kinds.includes(o));
    if (hit && re.test(fileName)) return hit;
  }
  return kinds.find((k) => !have.includes(k)) ?? kinds[0];
}

/** Per required document: the best copy on file and where it stands. */
export function docChecklist(s: HqState, m: Member) {
  const docs = s.docs.filter((d) => d.memberId === m.id);
  return REQUIRED_DOCS[m.type].map((kind) => {
    const copies = docs.filter((d) => d.kind === kind);
    const best = copies.find((d) => d.status === "Approved") ?? copies.find((d) => d.status === "Received") ?? copies[0];
    const state: "approved" | "check" | "rejected" | "missing" = !best ? "missing" : best.status === "Approved" ? "approved" : best.status === "Received" ? "check" : "rejected";
    return { kind, best, copies, state };
  });
}

/** Where a member stands and what moves them on. */
export function progress(s: HqState, m: Member) {
  const checklist = docChecklist(s, m);
  const missingDocs = checklist.filter((c) => c.state === "missing" || c.state === "rejected").map((c) => c.kind);
  const toCheck = checklist.filter((c) => c.state === "check");
  const photos = s.photos.filter((p) => p.memberId === m.id).length;
  const needPhotos = MIN_PHOTOS[m.type];
  const welcomed = s.sends.some((x) => x.memberId === m.id && WELCOME.includes(x.pack));
  const detailsOk = !!(m.name && m.city && (m.phone || m.email));
  const docsOk = checklist.every((c) => c.state === "approved");
  const visitOk = !NEEDS_VISIT[m.type] || (!!m.visit?.done && photos >= needPhotos);

  const stage: Stage = m.liveAt ? "Live" : !detailsOk || !welcomed ? "New" : !docsOk ? "Documents" : !visitOk ? "Visit" : "Review";
  const next: Record<Stage, string> = {
    New: !detailsOk ? "Fill in contact details" : "Send the welcome kit",
    Documents: toCheck.length ? `Check ${toCheck.length} document${toCheck.length === 1 ? "" : "s"}` : `Waiting for ${missingDocs.length} document${missingDocs.length === 1 ? "" : "s"}`,
    Visit: !m.visit?.date ? "Book a visit" : !m.visit.done ? `Visit on ${m.visit.date.split("-").reverse().slice(0, 2).join("/")}` : `Need ${needPhotos - photos} more photo${needPhotos - photos === 1 ? "" : "s"}`,
    Review: "Approve and go live",
    Live: "Live on Scouthru",
  };
  const order = stagesFor(m.type);
  return { stage, index: order.indexOf(stage), order, nextText: next[stage], checklist, missingDocs, toCheck, photos, needPhotos, welcomed, detailsOk };
}

/** When anything last happened for a member. */
export function lastTouched(s: HqState, m: Member) {
  const times = [
    m.createdAt,
    ...m.notes.map((n) => n.at),
    ...s.docs.filter((d) => d.memberId === m.id).map((d) => d.at),
    ...s.photos.filter((p) => p.memberId === m.id).map((p) => p.at),
    ...s.sends.filter((x) => x.memberId === m.id).map((x) => x.at),
    ...s.activity.filter((a) => a.memberId === m.id).map((a) => a.at),
  ];
  return times.reduce((a, b) => (a > b ? a : b));
}

/** Whole days with nothing happening, for members still onboarding. */
export function quietDays(s: HqState, m: Member, now = Date.now()) {
  if (m.liveAt) return 0;
  return Math.floor((now - new Date(lastTouched(s, m)).getTime()) / DAY);
}

/** Approved documents that run out within the renewal window (or already have). */
export function renewals(s: HqState, now = Date.now()) {
  return s.docs
    .filter((d): d is Doc & { validTill: string } => d.status === "Approved" && !!d.validTill)
    .map((d) => ({ doc: d, days: daysFromToday(d.validTill, now) }))
    .filter((x) => x.days <= RENEW_WITHIN_DAYS)
    .sort((a, b) => a.days - b.days);
}

export type Reminder = { key: string; memberId: string; pack: "Missing documents reminder" | "Renewal reminder"; why: string };

/** Reminders the Outbox should send now: missing documents every few days, and renewals. */
export function dueReminders(s: HqState, now = Date.now()): Reminder[] {
  const out: Reminder[] = [];
  const lastSent = (memberId: string, pack?: string) => s.sends.filter((x) => x.memberId === memberId && (!pack || x.pack === pack)).map((x) => x.at).sort().pop();
  for (const m of s.members) {
    const p = progress(s, m);
    if (m.autoRemind && p.stage === "Documents" && p.missingDocs.length) {
      const since = lastSent(m.id, "Missing documents reminder") ?? lastSent(m.id) ?? m.createdAt;
      if (now - new Date(since).getTime() >= REMIND_EVERY_DAYS * DAY) out.push({ key: `md-${m.id}`, memberId: m.id, pack: "Missing documents reminder", why: `${p.missingDocs.length} missing: ${p.missingDocs.join(", ")}` });
    }
  }
  for (const r of renewals(s, now)) {
    const last = lastSent(r.doc.memberId, "Renewal reminder");
    if (!last || now - new Date(last).getTime() >= 7 * DAY) {
      out.push({ key: `rn-${r.doc.id}`, memberId: r.doc.memberId, pack: "Renewal reminder", why: `${r.doc.kind} ${r.days < 0 ? `expired ${-r.days} days ago` : `runs out in ${r.days} days`}` });
    }
  }
  return out;
}

export type NextAction = { key: string; kind: "inbox" | "welcome" | "check" | "reminders" | "visit" | "book" | "golive" | "details"; title: string; sub: string; memberId?: string; rank: number };

/** The jobs that matter most right now, most urgent first. */
export function nextActions(s: HqState, now = Date.now()): NextAction[] {
  const out: NextAction[] = [];
  if (s.inbox.length) out.push({ key: "inbox", kind: "inbox", title: `File ${s.inbox.length} item${s.inbox.length === 1 ? "" : "s"} in the Inbox`, sub: "Dropped but not given to a member yet", rank: 0 });
  const due = dueReminders(s, now);
  if (due.length) out.push({ key: "rem", kind: "reminders", title: `Send ${due.length} reminder${due.length === 1 ? "" : "s"}`, sub: [...new Set(due.map((r) => s.members.find((m) => m.id === r.memberId)?.name))].join(", "), rank: 3 });
  for (const m of s.members) {
    const p = progress(s, m);
    if (p.stage === "Live") continue;
    if (p.stage === "Review") out.push({ key: `g-${m.id}`, kind: "golive", memberId: m.id, title: "Approve and go live", sub: m.name, rank: 1 });
    if (p.stage === "New") out.push({ key: `n-${m.id}`, kind: p.detailsOk ? "welcome" : "details", memberId: m.id, title: p.nextText, sub: m.name, rank: 2 });
    if (p.toCheck.length) out.push({ key: `c-${m.id}`, kind: "check", memberId: m.id, title: `Check ${p.toCheck.length === 1 ? p.toCheck[0].kind : `${p.toCheck.length} documents`}`, sub: m.name, rank: 2 });
    if (p.stage === "Visit" && !m.visit?.date) out.push({ key: `b-${m.id}`, kind: "book", memberId: m.id, title: "Book a visit", sub: `${m.name} · ${m.city}`, rank: 4 });
    if (m.visit?.date && !m.visit.done) {
      const days = daysFromToday(m.visit.date, now);
      if (days <= 3) out.push({ key: `v-${m.id}`, kind: "visit", memberId: m.id, title: days < 0 ? `Visit overdue by ${-days} day${days === -1 ? "" : "s"}` : days === 0 ? "Visit today" : `Visit in ${days} day${days === 1 ? "" : "s"}`, sub: `${m.name} · ${m.city}`, rank: days < 0 ? 1 : 4 });
    }
  }
  return out.sort((a, b) => a.rank - b.rank);
}

/** How urgent an update is, for the home page. */
export const urgency = (rank: number) => (rank <= 1 ? "Urgent" : rank <= 3 ? "Today" : "This week");

export type Insight = { tone: "good" | "watch" | "risk"; text: string };

/** What's going on in operations, and problems building up, worked out from HQ's own data. */
export function insights(s: HqState, now = Date.now()): Insight[] {
  const out: Insight[] = [];
  const week = (from: number, to: number) => s.enquiries.filter((e) => { const d = (now - new Date(e.at).getTime()) / DAY; return d >= from && d < to; });
  const thisWeek = week(0, 7);
  const lastWeek = week(7, 14);
  if (thisWeek.length) {
    const cats = Object.entries(thisWeek.reduce<Record<string, number>>((a, e) => ({ ...a, [e.category]: (a[e.category] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
    const change = lastWeek.length ? Math.round((thisWeek.length / lastWeek.length - 1) * 100) : null;
    out.push({ tone: change !== null && change < 0 ? "watch" : "good", text: `${thisWeek.length} enquiries this week${change !== null ? ` (${change >= 0 ? "up" : "down"} ${Math.abs(change)}% on last week)` : ""}, mostly ${cats[0][0]}.` });
  }
  const regular = s.enquiries.filter((e) => e.channel !== "Marketplace").length;
  if (s.enquiries.length) out.push({ tone: "good", text: `${Math.round((regular / s.enquiries.length) * 100)}% of enquiries come from outside the marketplace (WhatsApp, IndiaMART, calls).` });
  const decided = s.enquiries.filter((e) => e.status === "Won" || e.status === "Lost");
  if (decided.length) out.push({ tone: "good", text: `${decided.filter((e) => e.status === "Won").length} of ${decided.length} decided enquiries were won.` });

  const stuck = s.members.filter((m) => quietDays(s, m, now) >= 5);
  if (stuck.length) out.push({ tone: "risk", text: `${stuck.map((m) => m.name).join(", ")} ${stuck.length === 1 ? "has" : "have"} been quiet for 5+ days. Onboarding is stalling.` });
  const toCheck = s.members.reduce((a, m) => a + progress(s, m).toCheck.length, 0);
  if (toCheck) out.push({ tone: "watch", text: `${toCheck} document${toCheck === 1 ? " is" : "s are"} waiting to be checked. Members can't move on until they are.` });
  const toBook = s.members.filter((m) => progress(s, m).stage === "Visit" && !m.visit?.date).length;
  if (toBook) out.push({ tone: "watch", text: `${toBook} member${toBook === 1 ? " is" : "s are"} ready for a visit that isn't booked yet.` });
  const soon = renewals(s, now).filter((r) => r.days <= 30);
  if (soon.length) out.push({ tone: "risk", text: `${soon.map((r) => `${r.doc.kind}`).join(", ")} run${soon.length === 1 ? "s" : ""} out within 30 days. A lapsed licence pauses the listing.` });
  const order = { risk: 0, watch: 1, good: 2 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}

export type Upcoming = { date: string; title: string; kind: "visit" | "renewal" | "payment" | "event"; href?: string };

/** Dated things ahead: visits, renewals, invoices falling due, and events added by hand. */
export function upcoming(s: HqState, now = Date.now()): Upcoming[] {
  const out: Upcoming[] = [];
  s.members.forEach((m) => { if (m.visit?.date && !m.visit.done) out.push({ date: m.visit.date, title: `Visit ${m.name}`, kind: "visit", href: `/hq/members/${m.id}#visit` }); });
  renewals(s, now).forEach((r) => out.push({ date: r.doc.validTill, title: `${r.doc.kind} runs out · ${s.members.find((m) => m.id === r.doc.memberId)?.name}`, kind: "renewal", href: `/hq/members/${r.doc.memberId}#documents` }));
  s.invoices.filter((v) => !v.paidAt).forEach((v) => out.push({ date: v.due, title: `${v.direction === "receive" ? "Payment due from" : "Pay"} ${v.party} · ₹${v.amount.toLocaleString("en-IN")}`, kind: "payment", href: "/hq/finance" }));
  s.events.forEach((e) => out.push({ date: e.date, title: e.title, kind: "event", href: e.memberId ? `/hq/members/${e.memberId}` : undefined }));
  return out.filter((x) => daysFromToday(x.date, now) >= -14).sort((a, b) => a.date.localeCompare(b.date));
}
