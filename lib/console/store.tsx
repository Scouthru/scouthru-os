"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ConsoleState } from "./types";
import { CONSOLE_VERSION, consoleSeed } from "./seed";

/**
 * The console's single source of truth, kept in the browser so the demo survives
 * a refresh. Separate from the marketplace store (lib/store.tsx): different
 * product, different data. "Reset demo data" in the workspace menu restores it.
 */

const KEY = "scouthru-console-v1";

type Toast = { id: number; text: string; tone: "ok" | "info" | "bad" };
type Ctx = {
  s: ConsoleState;
  ready: boolean;
  update: (fn: (d: ConsoleState) => void) => void;
  reset: () => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
  toasts: Toast[];
};

const C = createContext<Ctx | null>(null);

export function ConsoleProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<ConsoleState>(() => consoleSeed());
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const n = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ConsoleState;
        if (parsed.v === CONSOLE_VERSION) setS(parsed);
      }
    } catch {
      /* blocked storage: run on the seed */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage full or blocked: state still works for this session */
    }
  }, [s, ready]);

  // Applied synchronously against the latest state, so an action's return value
  // (a new order or sample id) is ready the moment update() returns.
  const live = useRef(s);
  live.current = s;
  const update = useCallback((fn: (d: ConsoleState) => void) => {
    const d = structuredClone(live.current);
    fn(d);
    live.current = d;
    setS(d);
  }, []);

  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = ++n.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const reset = useCallback(() => {
    setS(consoleSeed());
    toast("Demo data reset");
  }, [toast]);

  return <C.Provider value={{ s, ready, update, reset, toast, toasts }}>{children}</C.Provider>;
}

export function useConsole() {
  const c = useContext(C);
  if (!c) throw new Error("useConsole outside ConsoleProvider");
  return c;
}
