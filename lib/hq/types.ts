/**
 * Scouthru HQ: the team's back office. Everything coming in lands in the Inbox, members
 * move through onboarding (New → Documents → Visit → Review → Live), everything going
 * out (messages, reminders, renewals) runs from the Outbox, and Finance tracks money for
 * both marketplace and regular business. Dates are ISO strings; money is in rupees.
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
  /** Teammate handling this member's onboarding. */
  ownerId?: string;
  /** Teammate doing the visit. */
  fieldId?: string;
};

export type DocStatus = "Received" | "Approved" | "Rejected";
/** A filed document. The file itself sits in the browser's file store under `fileKey`. */
export type Doc = { id: string; memberId: string; kind: string; name: string; size: number; at: string; status: DocStatus; fileKey?: string; validTill?: string; reason?: string };
/** A filed photo. `thumb` is a small preview (data URL or a path). */
export type Photo = { id: string; memberId: string; kind: string; name: string; at: string; thumb: string; fileKey?: string };
/** A file dropped into the Inbox and not filed yet. */
export type InboxItem = { id: string; name: string; size: number; type: string; at: string; fileKey: string; thumb?: string; memberId?: string; kind?: string };
export type Send = { id: string; memberId: string; pack: string; channel: "WhatsApp" | "Email"; at: string; auto?: boolean };
export type Task = { id: string; text: string; memberId?: string; done: boolean; at: string; assigneeId?: string };
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
  /** Shown as "Welcome, <owner>" on the home page. */
  owner: string;
  enquiries: Enquiry[];
  events: HqEvent[];
  txns: Txn[];
  invoices: Invoice[];
  goals: FundGoal[];
  team: Teammate[];
  chat: ChatMessage[];
  /** Per teammate, per conversation: when they last read it. */
  reads: Record<string, Record<string, string>>;
};

/** What a teammate does at Scouthru. Each role gets its own dashboard and sees only its own work. */
export type Role = "owner" | "onboarding" | "field" | "sales" | "accounts";
export type Teammate = { id: string; name: string; role: Role; phone?: string; active: boolean };

/**
 * One chat message. `to` is the conversation: a team channel ("general", "onboarding"…),
 * a direct message ("dm:<id>:<id>", ids sorted), or a member's thread ("m:<memberId>").
 * `from` is a teammate id, or "hq" for automatic hand-off messages.
 */
export type ChatMessage = { id: string; at: string; from: string; to: string; text: string; ref?: { kind: "member" | "enquiry"; id: string } };

/** Where business comes from: the Scouthru marketplace, or regular channels outside it. */
export type Channel = "Marketplace" | "WhatsApp" | "IndiaMART" | "Phone" | "Walk-in";
export type EnquiryStatus = "New" | "Matched" | "Quoted" | "Won" | "Lost";
/** A buyer asking for something to be made; matched to a factory by Scouthru. */
export type Enquiry = { id: string; product: string; category: string; buyer: string; qty: number; channel: Channel; status: EnquiryStatus; factoryId?: string; at: string; value?: number; assigneeId?: string };

/** Something on the calendar the team added by hand (meetings, trade fairs, calls). */
export type HqEvent = { id: string; date: string; title: string; memberId?: string };

/** Money in or out. `channel` separates marketplace income from regular business. */
export type Txn = { id: string; date: string; kind: "in" | "out"; category: string; party: string; amount: number; channel?: "Marketplace" | "Regular"; note?: string };
/** An invoice still to be paid: to us (receivable) or by us (payable). */
export type Invoice = { id: string; no: string; party: string; direction: "receive" | "pay"; amount: number; due: string; paidAt?: string; channel?: "Marketplace" | "Regular"; enquiryId?: string };
/** What the reserve fund (10% of every profit) is being saved for. `saved` is what's been put aside so far. */
export type FundGoal = { id: string; name: string; target: number; saved: number };
