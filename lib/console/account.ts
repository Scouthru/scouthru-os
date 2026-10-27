"use client";

import { useCallback, useEffect, useState } from "react";
import type { Portal } from "./types";

/**
 * Who is signed in on the website. Scouthru OS is what an account holder gets: signing in
 * opens their own portal. Kept in this browser until real logins arrive with the backend:
 * the session, plus a list of accounts created here (email or phone -> type and plan).
 * No password is ever stored.
 */

export type Plan = "Free" | "Pro" | "Done for you";
export type Method = "google" | "email" | "phone";
/** `id` is the email address or phone number the account signs in with. */
export type Account = { portal: Portal; plan: Plan; id?: string; method?: Method };

const KEY = "scouthru-account-v1";
const REGISTRY = "scouthru-accounts-v1";
const EVENT = "scouthru-account";
const PORTALS: Portal[] = ["brand", "maker", "supplier", "distributor"];
const PLANS: Plan[] = ["Free", "Pro", "Done for you"];

const valid = (a: unknown): a is Account =>
  !!a && typeof a === "object" && PORTALS.includes((a as Account).portal) && PLANS.includes((a as Account).plan);

function load<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* blocked storage: the account lasts for this page only */
  }
}

function read(): Account | null {
  const a = load<unknown>(KEY, null);
  return valid(a) ? a : null;
}

/** Email addresses are matched case-insensitively; phone numbers by digits. */
export const normaliseId = (id: string) => (id.includes("@") ? id.trim().toLowerCase() : id.replace(/\D/g, "").slice(-10));

/** The account created in this browser for an email or phone, if any. */
export function findAccount(id: string): Account | null {
  const a = load<Record<string, unknown>>(REGISTRY, {})[normaliseId(id)];
  return valid(a) ? a : null;
}

/** `ready` turns true after the browser has been read, so the server and first render agree. */
export function useAccount() {
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setAccount(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const signIn = useCallback((a: Account) => {
    save(KEY, a);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  /** Create the account for an email or phone and sign it in. */
  const register = useCallback((a: Account & { id: string }) => {
    const all = load<Record<string, Account>>(REGISTRY, {});
    all[normaliseId(a.id)] = a;
    save(REGISTRY, all);
    save(KEY, a);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  const signOut = useCallback(() => {
    save(KEY, null);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { account, ready, signIn, register, signOut };
}
