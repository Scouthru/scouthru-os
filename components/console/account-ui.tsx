"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, ChevronDown, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { Btn, Modal } from "./kit";
import { NAVS, PORTAL_HOME, PORTAL_ICON, PORTAL_LABEL } from "./portals";
import { PLANS, PORTALS } from "./os-info";
import { findAccount, useAccount, type Account, type Method, type Plan } from "@/lib/console/account";
import { useConsole } from "@/lib/console/store";
import type { Portal } from "@/lib/console/types";
import { cn } from "@/lib/cn";

const OPEN = "scouthru-auth";
type Mode = { kind: "join"; portal?: Portal } | { kind: "signin" };

/** Open the join (or sign-in) dialog from anywhere on the website. */
export function openAuth(mode: Mode) {
  window.dispatchEvent(new CustomEvent<Mode>(OPEN, { detail: mode }));
}

/** Accounts are shown by type only (product owner, manufacturer, supplier, distributor), never a person's name. */
function RoleIcon({ portal, size }: { portal: Portal; size: number }) {
  const Icon = PORTAL_ICON[portal];
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-cs-mint text-cs-green-2" style={{ width: size, height: size }}>
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={1.7} />
    </span>
  );
}

/**
 * Top-right corner of the website. Visitors see Sign in (joining starts from there); account holders see
 * their account type, and the menu opens their own Scouthru OS dashboard.
 */
export function AccountArea() {
  const { account, ready } = useAccount();
  const [mode, setMode] = useState<Mode | null>(null);
  useEffect(() => {
    const on = (e: Event) => setMode((e as CustomEvent<Mode>).detail);
    window.addEventListener(OPEN, on);
    return () => window.removeEventListener(OPEN, on);
  }, []);

  return (
    <>
      {!ready ? (
        <span className="h-[42px] w-[42px] shrink-0 sm:w-[96px]" aria-hidden />
      ) : account ? (
        <AccountMenu portal={account.portal} plan={account.plan} id={account.id} />
      ) : (
        <div className="flex shrink-0 items-center gap-[6px]">
          {/* One way in: Sign in. New accounts start from "Join free" inside the sign-in dialog. */}
          <button type="button" onClick={() => setMode({ kind: "signin" })} aria-label="Sign in" className="grid size-[42px] place-items-center rounded-[9px] border border-cs-line bg-white text-cs-green sm:hidden">
            <UserRound className="size-[18px]" strokeWidth={1.7} />
          </button>
          <button type="button" onClick={() => setMode({ kind: "signin" })} className="hidden h-[42px] items-center gap-[7px] whitespace-nowrap rounded-[9px] border border-cs-green/70 bg-white px-[14px] text-[13.5px] font-medium text-cs-green hover:bg-cs-mint/60 sm:flex">
            <UserRound className="size-[16px]" strokeWidth={1.8} />Sign in
          </button>
        </div>
      )}
      {/* Rendered on the page wrapper (it carries the fonts): inside the header, its backdrop blur would trap the fixed overlay. */}
      {mode && createPortal(
        <AuthDialog key={mode.kind} initial={mode.kind} preset={mode.kind === "join" ? mode.portal : undefined} onClose={() => setMode(null)} />,
        document.querySelector(".cs") ?? document.body,
      )}
    </>
  );
}

function AccountMenu({ portal, plan, id }: { portal: Portal; plan: Plan; id?: string }) {
  const { toast } = useConsole();
  const { signOut } = useAccount();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const close = () => setOpen(false);
  const links = NAVS[portal].slice(1, 5);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Account: ${PORTAL_LABEL[portal]}`}
        className={cn("flex h-[42px] items-center gap-[8px] rounded-[9px] border bg-white pl-[5px] pr-[10px] text-[13px] font-medium hover:border-[#d0c7bf]", open ? "border-cs-green-2/60" : "border-cs-line")}
      >
        <RoleIcon portal={portal} size={30} />
        <span className="hidden max-w-[130px] truncate sm:inline">{PORTAL_LABEL[portal]}</span>
        <ChevronDown className={cn("size-[14px] text-cs-ink-2 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-[8px] w-[min(92vw,320px)] overflow-hidden rounded-[12px] border border-cs-line bg-white shadow-[0_18px_48px_rgba(60,40,25,0.16)]">
          <div className="flex items-center gap-[11px] border-b border-cs-line bg-cs-cream px-[16px] py-[14px]">
            <RoleIcon portal={portal} size={42} />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{PORTAL_LABEL[portal]} account</p>
              {id && <p className="truncate text-[12px] text-cs-ink-2">{id.includes("@") ? id : `+91 ${id.slice(0, 5)} ${id.slice(5)}`}</p>}
              <p className="mt-[5px] flex flex-wrap gap-[5px] text-[11px] font-medium">
                <span className={cn("rounded-full px-[8px] py-[2px]", plan === "Free" ? "bg-white text-[#48413b]" : "bg-cs-deep text-white")}>{plan} plan</span>
              </p>
            </div>
          </div>
          <div className="p-[6px]">
            <Link href={PORTAL_HOME[portal]} onClick={close} className="flex items-center gap-[10px] rounded-[8px] bg-cs-green px-[11px] py-[10px] text-[13.5px] font-medium text-white hover:bg-[#7c2c14]">
              <LayoutDashboard className="size-[16px]" strokeWidth={1.8} />My dashboard<ArrowRight className="ml-auto size-[15px]" />
            </Link>
            <ul className="mt-[4px]">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={close} className="flex items-center gap-[10px] rounded-[8px] px-[11px] py-[8px] text-[13px] hover:bg-[#f9f5ee]">
                    <l.icon className="size-[16px] text-cs-ink-2" strokeWidth={1.7} />{l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-cs-line p-[6px]">
            <button
              type="button"
              onClick={() => { signOut(); close(); toast("Signed out", "info"); router.push("/marketplace"); }}
              className="flex w-full items-center gap-[10px] rounded-[8px] px-[11px] py-[8px] text-left text-[13px] hover:bg-[#f9f5ee]"
            >
              <LogOut className="size-[16px] text-cs-ink-2" strokeWidth={1.7} />Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Google's "G", in its own colours, for the Continue with Google button. */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px] shrink-0" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[6-9]\d{9}$/;

type Step =
  | { at: "method" }
  | { at: "google" }
  | { at: "code"; phone: string }
  | { at: "profile"; id: string; method: Method };

/**
 * Sign in or create an account. Step one is how: Google, email and password, or phone with a
 * one-time code. An account that already exists goes straight to its dashboard; a new one then
 * picks who they are and a plan. Demo: no backend yet, so nothing is checked or sent.
 */
function AuthDialog({ initial, preset, onClose }: { initial: "signin" | "join"; preset?: Portal; onClose: () => void }) {
  const { toast } = useConsole();
  const { signIn, register } = useAccount();
  const router = useRouter();
  const [joining, setJoining] = useState(initial === "join");
  const [step, setStep] = useState<Step>({ at: "method" });
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gmail, setGmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [portal, setPortal] = useState<Portal | undefined>(preset);
  const [plan, setPlan] = useState<Plan>("Free");

  const back = () => { setStep({ at: "method" }); setError(""); };

  /** Identity confirmed: existing accounts go in, new ones pick who they are. */
  const identified = (id: string, method: Method) => {
    setError("");
    const found = findAccount(id);
    if (!found) return setStep({ at: "profile", id, method });
    const a: Account = { ...found, id, method };
    signIn(a);
    onClose();
    toast(`Signed in as ${PORTAL_LABEL[a.portal].toLowerCase()}`);
    router.push(PORTAL_HOME[a.portal]);
  };

  const submitEmail = () => {
    if (!EMAIL.test(email.trim())) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    if (joining && password.length < 8) return setError("Use at least 8 characters for your password.");
    identified(email.trim(), "email");
  };
  const sendCode = () => {
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (!PHONE.test(digits)) return setError("Enter a 10-digit mobile number.");
    setError("");
    setCode("");
    setStep({ at: "code", phone: digits });
  };
  const create = () => {
    if (step.at !== "profile" || !portal) return;
    register({ portal, plan, id: step.id, method: step.method });
    onClose();
    toast(`Welcome to Scouthru. Your ${PORTAL_LABEL[portal].toLowerCase()} dashboard is ready.`);
    router.push(PORTAL_HOME[portal]);
  };

  const field = "h-[44px] w-full rounded-[8px] border border-[#e1d8ca] bg-white px-[12px] text-[14px] outline-none focus:border-cs-green focus:ring-1 focus:ring-cs-green";
  const primary = "h-[44px] w-full rounded-[8px] bg-cs-green text-[14px] font-medium text-white hover:bg-[#7c2c14]";
  const err = error && <p role="alert" className="text-[12.5px] text-cs-red">{error}</p>;

  if (step.at === "profile") {
    return (
      <Modal
        open
        onClose={onClose}
        width={620}
        title="Set up your account"
        sub={`Signed in with ${step.id.includes("@") ? step.id : `+91 ${step.id}`}. Tell us who you are to open your dashboard.`}
        footer={<><Btn onClick={back}>Back</Btn><Btn kind="primary" disabled={!portal} onClick={create}>Create account</Btn></>}
      >
        <p className="text-[12.5px] font-semibold text-[#36312d]">Who are you?</p>
        <div className="mt-[8px] grid gap-[8px] sm:grid-cols-2" role="radiogroup" aria-label="Account type">
          {PORTALS.map(([, blurb, , , , p]) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={portal === p}
              onClick={() => setPortal(p)}
              className={cn("flex items-start gap-[10px] rounded-[10px] border p-[12px] text-left transition-colors", portal === p ? "border-cs-green bg-cs-mint/50" : "border-cs-line bg-white hover:border-[#d0c7bf]")}
            >
              <RoleIcon portal={p} size={34} />
              <span className="min-w-0">
                <span className="flex items-center gap-[6px] text-[13.5px] font-semibold">{PORTAL_LABEL[p]}{portal === p && <Check className="size-[14px] text-cs-green" />}</span>
                <span className="mt-[2px] block text-[11.5px] leading-[1.45] text-cs-ink-2">{blurb}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-[16px] text-[12.5px] font-semibold text-[#36312d]">Choose a plan</p>
        <div className="mt-[8px] grid gap-[8px] sm:grid-cols-3" role="radiogroup" aria-label="Plan">
          {PLANS.map(([name, price, blurb]) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={plan === name}
              onClick={() => setPlan(name)}
              className={cn("flex flex-col gap-[3px] rounded-[10px] border p-[12px] text-left transition-colors", plan === name ? "border-cs-green bg-cs-mint/50" : "border-cs-line bg-white hover:border-[#d0c7bf]")}
            >
              <span className="flex items-center justify-between text-[13.5px] font-semibold">{name}{plan === name && <Check className="size-[14px] text-cs-green" />}</span>
              {price && <span className="text-[12.5px] font-medium text-cs-green">{price}</span>}
              <span className="text-[11px] leading-[1.45] text-cs-ink-2">{blurb}</span>
            </button>
          ))}
        </div>
        <p className="mt-[12px] text-[11.5px] text-cs-ink-2">Demo: your dashboard opens with example data. Nothing is charged.</p>
      </Modal>
    );
  }

  if (step.at === "google") {
    return (
      <Modal open onClose={onClose} width={440} title="Continue with Google" sub="Which Google account should Scouthru use?">
        <form className="grid gap-[10px]" onSubmit={(e) => { e.preventDefault(); if (!EMAIL.test(gmail.trim())) return setError("Enter your Google account email."); identified(gmail.trim(), "google"); }}>
          <input className={field} type="email" autoComplete="email" placeholder="you@gmail.com" value={gmail} onChange={(e) => setGmail(e.target.value)} aria-label="Google account email" autoFocus />
          {err}
          <button className={primary}>Continue</button>
          <button type="button" onClick={back} className="text-[13px] text-cs-ink-2 hover:text-cs-green">Back to other ways</button>
        </form>
        <p className="mt-[12px] text-center text-[11px] text-cs-ink-2">Demo: the real Google sign-in window opens here once the backend is connected.</p>
      </Modal>
    );
  }

  if (step.at === "code") {
    return (
      <Modal open onClose={onClose} width={440} title="Enter the code" sub={`We sent a 6-digit code by SMS to +91 ${step.phone.slice(0, 5)} ${step.phone.slice(5)}.`}>
        <form className="grid gap-[10px]" onSubmit={(e) => { e.preventDefault(); if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code."); identified(step.phone, "phone"); }}>
          <input className={cn(field, "text-center text-[20px] tracking-[0.5em]")} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} aria-label="6-digit code" autoFocus />
          {err}
          <button className={primary}>Verify and continue</button>
          <div className="flex justify-between text-[13px] text-cs-ink-2">
            <button type="button" onClick={back} className="hover:text-cs-green">Change number</button>
            <button type="button" onClick={() => toast("New code sent", "info")} className="hover:text-cs-green">Resend code</button>
          </div>
        </form>
        <p className="mt-[12px] text-center text-[11px] text-cs-ink-2">Demo: any 6 digits work. Real SMS codes arrive with the backend.</p>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      width={440}
      title={joining ? "Create your Scouthru account" : "Sign in to Scouthru"}
      sub={joining ? "Free to join. Your account comes with your own Scouthru OS dashboard." : "Welcome back. Continue to your dashboard."}
    >
      <button type="button" onClick={() => { setStep({ at: "google" }); setError(""); }} className="flex h-[44px] w-full items-center justify-center gap-[10px] rounded-[8px] border border-[#e1d8ca] bg-white text-[14px] font-medium hover:bg-[#f9f5ee]">
        <GoogleG />Continue with Google
      </button>
      <div className="my-[16px] flex items-center gap-[10px] text-[11.5px] text-cs-ink-2"><span className="h-px flex-1 bg-cs-line" />or<span className="h-px flex-1 bg-cs-line" /></div>
      <div className="mb-[12px] grid grid-cols-2 rounded-[8px] bg-[#f5efe5] p-[3px] text-[13px] font-medium" role="tablist" aria-label="Sign in with">
        {(["email", "phone"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setError(""); }} className={cn("h-[34px] rounded-[6px]", tab === t ? "bg-white shadow-sm" : "text-cs-ink-2")}>
            {t === "email" ? "Email" : "Mobile number"}
          </button>
        ))}
      </div>
      {tab === "email" ? (
        <form className="grid gap-[10px]" onSubmit={(e) => { e.preventDefault(); submitEmail(); }}>
          <input className={field} type="email" autoComplete="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
          <input className={field} type="password" autoComplete={joining ? "new-password" : "current-password"} placeholder={joining ? "Create a password (8+ characters)" : "Password"} value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
          {!joining && <button type="button" onClick={() => toast("Password reset link sent (demo)", "info")} className="justify-self-end text-[12.5px] text-cs-green hover:underline">Forgot password?</button>}
          {err}
          <button className={primary}>{joining ? "Create account" : "Sign in"}</button>
        </form>
      ) : (
        <form className="grid gap-[10px]" onSubmit={(e) => { e.preventDefault(); sendCode(); }}>
          <div className="flex gap-[8px]">
            <span className="grid h-[44px] shrink-0 place-items-center rounded-[8px] border border-[#e1d8ca] bg-[#f9f5ee] px-[12px] text-[14px] text-[#48413b]">+91</span>
            <input className={field} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Mobile number" />
          </div>
          {err}
          <button className={primary}>Send code</button>
        </form>
      )}
      <p className="mt-[16px] text-center text-[13px] text-cs-ink-2">
        {joining ? "Already have an account? " : "New to Scouthru? "}
        <button type="button" onClick={() => { setJoining(!joining); setError(""); }} className="font-medium text-cs-green hover:underline">{joining ? "Sign in" : "Join free"}</button>
      </p>
      <p className="mt-[10px] text-center text-[11px] text-cs-ink-2">Demo: nothing is checked or sent yet. Real sign-in arrives with the backend.</p>
    </Modal>
  );
}
