"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { State } from "./types";
import { seed } from "./seed";

/**
 * One shared demo network, held in the browser. Every view (marketplace,
 * brand, factory, supplier, distributor) reads and writes the same state, so a
 * payment made on the brand side shows as received on the factory side.
 * Saved to localStorage so a demo survives a refresh; "Reset demo" restores it.
 */

const KEY = "scouthru-demo-v5";

type Toast = { id: number; text: string };
type Ctx = {
  s: State;
  ready: boolean;
  update: (fn: (draft: State) => void) => void;
  reset: () => void;
  toast: (text: string) => void;
  toasts: Toast[];
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(seed);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const n = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        if (parsed.v === seed().v) setS(parsed);
      }
    } catch {
      /* private window or blocked storage: run on the seed */
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

  const update = useCallback((fn: (d: State) => void) => {
    setS((prev) => {
      const d = structuredClone(prev);
      fn(d);
      return d;
    });
  }, []);

  const toast = useCallback((text: string) => {
    const id = ++n.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const reset = useCallback(() => {
    setS(seed());
    toast("Demo reset to the starting data");
  }, [toast]);

  return <StoreCtx.Provider value={{ s, ready, update, reset, toast, toasts }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
}

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export function lakh(n: number) {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (Math.abs(n) >= 1e3) return `₹${Math.round(n / 1e3)}K`;
  return inr(n);
}
export const fmt = (n: number) => n.toLocaleString("en-IN");
export const todayLabel = () =>
  new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
