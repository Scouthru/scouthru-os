"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Doc, HqState, InboxItem, Member, Photo, Send } from "./types";
import { HQ_VERSION, hqSeed } from "./seed";
import { deleteFile, putFile, thumbnail } from "./files";
import { PHOTO_KINDS, TYPE_LABEL, dueReminders, guessDoc, guessPhoto, progress } from "./rules";
import { handoffs } from "./team";

/** HQ's own state, kept in this browser until the backend arrives. Separate from the console demo. */

const KEY = "scouthru-hq-v1";
type Toast = { id: number; text: string; tone: "ok" | "info" | "bad" };
type Item = { file: File; kind: string };
type Ctx = {
  s: HqState;
  ready: boolean;
  update: (fn: (d: HqState) => void) => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
  toasts: Toast[];
  /** Drop anything into the Inbox; `memberId` pre-fills who it's for. With `fileNow`, it's filed straight to them. */
  toInbox: (files: File[], memberId?: string, fileNow?: boolean) => Promise<void>;
  /** Give an Inbox item to a member as a document or photo. */
  fileItem: (id: string, memberId: string, kind: string) => void;
  discard: (id: string) => void;
  addDocs: (memberId: string, items: Item[]) => Promise<void>;
  addPhotos: (memberId: string, items: Item[]) => Promise<void>;
  removeDoc: (id: string) => void;
  removePhoto: (id: string) => void;
  send: (memberId: string, pack: string, channel: Send["channel"], auto?: boolean) => void;
  sendAllDue: () => number;
};

const C = createContext<Ctx | null>(null);
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const isImage = (type: string) => type.startsWith("image/");

export function log(d: HqState, text: string, memberId?: string) {
  d.activity.unshift({ id: uid("a"), at: new Date().toISOString(), text, memberId });
}

export function addMember(d: HqState, x: Omit<Member, "id" | "createdAt" | "notes" | "autoRemind">) {
  const id = uid("m-");
  d.members.unshift({ ...x, id, createdAt: new Date().toISOString(), notes: [], autoRemind: true });
  log(d, `${x.name} added as ${TYPE_LABEL[x.type].toLowerCase()}`, id);
  return id;
}

/** Whose file this probably is: a member whose name appears in the file name. */
function guessMember(s: HqState, fileName: string) {
  const f = fileName.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return s.members.find((m) => m.name.toLowerCase().split(/\s+/).some((w) => w.length > 3 && !/(foods|labs|health|fresh|solutions|labels|distributors|pvt|ltd)/.test(w) && f.includes(w)))?.id;
}

/** What an Inbox file probably is, for a given member. */
export function guessKind(s: HqState, item: { name: string; type: string }, memberId?: string) {
  const m = s.members.find((x) => x.id === memberId);
  if (!m) return undefined;
  if (isImage(item.type) && PHOTO_KINDS[m.type].length) {
    return guessPhoto(item.name, PHOTO_KINDS[m.type], s.photos.filter((p) => p.memberId === m.id).map((p) => p.kind));
  }
  return guessDoc(item.name, progress(s, m).missingDocs);
}

export function HqProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<HqState>(() => hqSeed());
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const n = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as HqState) : null;
      setS(parsed?.v === HQ_VERSION ? parsed : hqSeed());
    } catch {
      setS(hqSeed());
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage full: keeps working for this session */
    }
  }, [s, ready]);

  // Another tab (another teammate) changed something: take their version, so chat and work stay live.
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        const next = JSON.parse(e.newValue) as HqState;
        if (next.v === HQ_VERSION) { live.current = next; setS(next); }
      } catch { /* ignore a half-written value */ }
    };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const live = useRef(s);
  live.current = s;
  // Every change also runs the hand-offs between teammates (new member → onboarding, documents done → field, …).
  const update = useCallback((fn: (d: HqState) => void) => {
    const prev = live.current;
    const d = structuredClone(prev);
    fn(d);
    handoffs(prev, d);
    live.current = d;
    setS(d);
  }, []);

  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = ++n.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const store = async (file: File) => {
    const id = uid("f");
    try { await putFile(id, file); } catch { /* storage blocked: keep the record without the file */ }
    let thumb: string | undefined;
    if (isImage(file.type)) { try { thumb = await thumbnail(file); } catch { /* not readable as an image */ } }
    return { fileKey: id, thumb };
  };

  const fileItem = useCallback((id: string, memberId: string, kind: string) => {
    update((d) => {
      const it = d.inbox.find((x) => x.id === id);
      const m = d.members.find((x) => x.id === memberId);
      if (!it || !m) return;
      d.inbox = d.inbox.filter((x) => x.id !== id);
      const asPhoto = isImage(it.type) && PHOTO_KINDS[m.type].includes(kind);
      if (asPhoto) d.photos.unshift({ id: uid("p"), memberId, kind, name: it.name, at: new Date().toISOString(), thumb: it.thumb ?? "", fileKey: it.fileKey || undefined });
      else d.docs.unshift({ id: uid("d"), memberId, kind, name: it.name, size: it.size, at: new Date().toISOString(), status: "Received", fileKey: it.fileKey || undefined });
      log(d, `${kind} filed for ${m.name}`, memberId);
    });
    toast(`Filed for ${live.current.members.find((x) => x.id === memberId)?.name}`);
  }, [update, toast]);

  const toInbox = useCallback(async (files: File[], memberId?: string, fileNow = false) => {
    const items: InboxItem[] = [];
    for (const file of files) {
      const { fileKey, thumb } = await store(file);
      const who = memberId ?? guessMember(live.current, file.name);
      items.push({ id: uid("i"), name: file.name, size: file.size, type: file.type, at: new Date().toISOString(), fileKey, thumb, memberId: who, kind: guessKind(live.current, file, who) });
    }
    update((d) => { d.inbox.unshift(...items); });
    if (fileNow && memberId) items.forEach((it) => fileItem(it.id, memberId, it.kind ?? "Other"));
    else toast(`${items.length} item${items.length === 1 ? "" : "s"} in the Inbox`);
  }, [update, toast, fileItem]);

  const discard = useCallback((id: string) => {
    const it = live.current.inbox.find((x) => x.id === id);
    update((d) => { d.inbox = d.inbox.filter((x) => x.id !== id); });
    if (it?.fileKey) deleteFile(it.fileKey).catch(() => {});
  }, [update]);

  const addDocs = useCallback(async (memberId: string, items: Item[]) => {
    const made: Doc[] = [];
    for (const { file, kind } of items) {
      const { fileKey } = await store(file);
      made.push({ id: uid("d"), memberId, kind, name: file.name, size: file.size, at: new Date().toISOString(), status: "Received", fileKey });
    }
    update((d) => {
      d.docs.unshift(...made);
      const m = d.members.find((x) => x.id === memberId);
      made.forEach((x) => log(d, `${x.kind} received from ${m?.name}`, memberId));
    });
    toast(`${made.length} document${made.length === 1 ? "" : "s"} saved`);
  }, [update, toast]);

  const addPhotos = useCallback(async (memberId: string, items: Item[]) => {
    const made: Photo[] = [];
    for (const { file, kind } of items) {
      const { fileKey, thumb } = await store(file);
      if (!thumb) continue;
      made.push({ id: uid("p"), memberId, kind, name: file.name, at: new Date().toISOString(), thumb, fileKey });
    }
    if (!made.length) return toast("Those files aren't photos", "bad");
    update((d) => {
      d.photos.unshift(...made);
      log(d, `${made.length} photo${made.length === 1 ? "" : "s"} added for ${d.members.find((x) => x.id === memberId)?.name}`, memberId);
    });
    toast(`${made.length} photo${made.length === 1 ? "" : "s"} saved`);
  }, [update, toast]);

  const removeDoc = useCallback((id: string) => {
    const key = live.current.docs.find((x) => x.id === id)?.fileKey;
    update((d) => { d.docs = d.docs.filter((x) => x.id !== id); });
    if (key) deleteFile(key).catch(() => {});
  }, [update]);

  const removePhoto = useCallback((id: string) => {
    const key = live.current.photos.find((x) => x.id === id)?.fileKey;
    update((d) => { d.photos = d.photos.filter((x) => x.id !== id); });
    if (key) deleteFile(key).catch(() => {});
  }, [update]);

  const send = useCallback((memberId: string, pack: string, channel: Send["channel"], auto = false) => {
    update((d) => {
      d.sends.unshift({ id: uid("s"), memberId, pack, channel, at: new Date().toISOString(), auto });
      log(d, `${pack} sent to ${d.members.find((x) => x.id === memberId)?.name} on ${channel}${auto ? " (automatic)" : ""}`, memberId);
    });
  }, [update]);

  const sendAllDue = useCallback(() => {
    const due = dueReminders(live.current);
    due.forEach((r) => send(r.memberId, r.pack, "WhatsApp", true));
    return due.length;
  }, [send]);

  return (
    <C.Provider value={{ s, ready, update, toast, toasts, toInbox, fileItem, discard, addDocs, addPhotos, removeDoc, removePhoto, send, sendAllDue }}>
      {children}
    </C.Provider>
  );
}

export function useHq() {
  const c = useContext(C);
  if (!c) throw new Error("useHq outside HqProvider");
  return c;
}

/** Approve a member: they go live, and their login details go out automatically. */
export function goLive(d: HqState, memberId: string) {
  const m = d.members.find((x) => x.id === memberId);
  if (!m || m.liveAt) return;
  const now = new Date().toISOString();
  m.liveAt = now;
  d.sends.unshift({ id: uid("s"), memberId, pack: "Login details", channel: "Email", at: now, auto: true });
  log(d, `${m.name} approved and live on Scouthru · login details sent`, memberId);
}
