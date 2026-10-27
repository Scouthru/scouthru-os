/**
 * Scouthru HQ: the team's back office. Everything coming in lands in the Inbox, members
 * move through onboarding (New → Documents → Visit → Review → Live), and everything going
 * out (messages, reminders, renewals) runs from the Outbox. Dates are ISO strings.
 */

export type MemberType = "maker" | "supplier" | "distributor" | "brand";
export type Stage = "New" | "Documents" | "Visit" | "Review" | "Live";

export type VisitReport = {
  /** yyyy-mm-dd */
  date: string;
  done: boolean;
  /** Visit checklist item -> passed. */
  checks: Record<string, boolean>;
  /** 1 to 5, given when the visit is done. */
  score?: number;
  notes: string;
};

export type Member = {
  id: string;
  name: string;
  type: MemberType;
  city: string;
  state: string;
  contactRole: string;
  phone: string;
  email: string;
  createdAt: string;
  visit?: VisitReport;
  /** Chase missing documents automatically every few days. */
  autoRemind: boolean;
  liveAt?: string;
  notes: { at: string; text: string }[];
};

export type DocStatus = "Received" | "Approved" | "Rejected";
/** A filed document. The file itself sits in the browser's file store under `fileKey`. */
export type Doc = { id: string; memberId: string; kind: string; name: string; size: number; at: string; status: DocStatus; fileKey?: string; validTill?: string; reason?: string };
/** A filed photo. `thumb` is a small preview (data URL or a path). */
export type Photo = { id: string; memberId: string; kind: string; name: string; at: string; thumb: string; fileKey?: string };
/** A file dropped into the Inbox and not filed yet. */
export type InboxItem = { id: string; name: string; size: number; type: string; at: string; fileKey: string; thumb?: string; memberId?: string; kind?: string };
export type Send = { id: string; memberId: string; pack: string; channel: "WhatsApp" | "Email"; at: string; auto?: boolean };
export type Task = { id: string; text: string; memberId?: string; done: boolean; at: string };
export type Activity = { id: string; at: string; text: string; memberId?: string };

export type HqState = {
  v: number;
  members: Member[];
  docs: Doc[];
  photos: Photo[];
  inbox: InboxItem[];
  sends: Send[];
  tasks: Task[];
  activity: Activity[];
};
