import type { ConsoleState, Enquiry } from "./types";
import { log } from "./actions";

/** Sourcing-side actions used by the Enquiries and Manufacturers screens. */

const now = () => new Date().toISOString();

/** One message to several manufacturers: one entry per recipient, one activity line. */
export function messageMany(d: ConsoleState, mfrIds: string[], subject: string, body: string, href: string, enquiryId?: string) {
  const names: string[] = [];
  mfrIds.forEach((id) => {
    const m = d.manufacturers.find((x) => x.id === id);
    if (!m) return;
    m.contacted = true;
    names.push(m.name);
    d.messages.unshift({ id: `m${Date.now()}${id}`, at: now(), to: m.name, subject, body });
  });
  const e = enquiryId ? d.enquiries.find((x) => x.id === enquiryId) : undefined;
  if (e) {
    e.activity.push({ at: now(), who: d.user.name, text: `Messaged ${names.length === 1 ? names[0] : `${names.length} manufacturers`}: ${subject}` });
    e.updatedAt = now();
  }
  log(d, { text: `Messaged ${names.length === 1 ? names[0] : `${names.length} manufacturers`}: ${subject}`, tag: e ? "Enquiry" : "Manufacturer", href });
  return names.length;
}

export function toggleShortlist(d: ConsoleState, mfrId: string) {
  const m = d.manufacturers.find((x) => x.id === mfrId);
  if (!m) return false;
  m.shortlisted = !m.shortlisted;
  log(d, { text: `${m.shortlisted ? "Shortlisted" : "Removed from shortlist:"} ${m.name}`, tag: "Manufacturer", href: `/console/manufacturers?id=${m.id}` });
  return m.shortlisted;
}

export function setShortlist(d: ConsoleState, mfrIds: string[], on: boolean) {
  mfrIds.forEach((id) => { const m = d.manufacturers.find((x) => x.id === id); if (m) m.shortlisted = on; });
  log(d, { text: `${on ? "Shortlisted" : "Removed from shortlist"} ${mfrIds.length} manufacturer${mfrIds.length > 1 ? "s" : ""}`, tag: "Manufacturer", href: "/console/manufacturers" });
}

export type EnquiryPatch = Partial<Pick<Enquiry, "name" | "moq" | "launch" | "price" | "brief" | "requirements" | "category">>;

export function editEnquiry(d: ConsoleState, id: string, patch: EnquiryPatch) {
  const e = d.enquiries.find((x) => x.id === id);
  if (!e) return;
  Object.assign(e, patch);
  e.updatedAt = now();
  e.activity.push({ at: now(), who: d.user.name, text: "Edited the enquiry brief" });
  log(d, { text: `Updated enquiry ${id} – ${e.name}`, tag: "Enquiry", href: `/console/enquiries?id=${id}` });
}

export function deleteEnquiry(d: ConsoleState, id: string) {
  const e = d.enquiries.find((x) => x.id === id);
  if (!e) return;
  d.enquiries = d.enquiries.filter((x) => x.id !== id);
  log(d, { text: `Deleted draft enquiry ${id} – ${e.name}`, tag: "Enquiry", href: "/console/enquiries" });
}

/** Duplicate as a new draft (same brief, fresh responses). */
export function duplicateEnquiry(d: ConsoleState, id: string) {
  const e = d.enquiries.find((x) => x.id === id);
  if (!e) return null;
  const max = d.enquiries.reduce((m, x) => Math.max(m, parseInt(x.id.slice(9), 10) || 0), 0);
  const nid = `ENQ-2026-${String(max + 1).padStart(3, "0")}`;
  d.enquiries.unshift({
    ...structuredClone(e), id: nid, name: `${e.name} (copy)`, stage: "Draft", mfrCount: 0, responses: [], quotes: [], createdAt: now(), updatedAt: now(),
    steps: e.steps.map((s) => ({ ...s, done: false })), activity: [{ at: now(), who: d.user.name, text: `Duplicated from ${id}` }],
  });
  log(d, { text: `Duplicated ${id} as draft ${nid}`, tag: "Enquiry", href: `/console/enquiries?id=${nid}` });
  return nid;
}

export function toggleQuoteShortlist(d: ConsoleState, enquiryId: string, mfrId: string) {
  const q = d.enquiries.find((x) => x.id === enquiryId)?.quotes.find((x) => x.mfrId === mfrId);
  if (q) q.shortlisted = !q.shortlisted;
}

export function toggleStep(d: ConsoleState, enquiryId: string, idx: number) {
  const e = d.enquiries.find((x) => x.id === enquiryId);
  const st = e?.steps[idx];
  if (!e || !st) return;
  st.done = !st.done;
  e.activity.push({ at: now(), who: d.user.name, text: `${st.done ? "Completed" : "Reopened"} step: ${st.text}` });
}
