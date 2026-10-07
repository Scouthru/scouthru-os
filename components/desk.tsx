"use client";

import { Wordmark } from "@/components/market";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, Repeat, RotateCcw, Search, Store, X, type LucideIcon } from "lucide-react";
import type { Role } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/cn";

export type NavItem = { href: string; label: string; count?: number; icon?: LucideIcon };
export type NavGroup = { heading?: string; items: NavItem[] };

export function DeskLogo({ light = true }: { light?: boolean }) {
  return (
    <span className={cn("desk flex items-center gap-2 text-[21px] font-medium", light ? "text-white" : "text-ink")}>
      <svg viewBox="0 0 28 12" className="h-3 w-7" aria-hidden="true">
        <circle cx="4" cy="6" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <line x1="7.5" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="23.5" cy="6" r="3.4" fill="currentColor" />
      </svg>
      Scouthru
    </span>
  );
}

/**
 * Dashboard frame, laid out the way Keychain does it:
 *  - sidebar: logo, grouped nav with an icon per item, one help card pinned at the foot
 *    carrying the role's main action;
 *  - top bar: search in the middle, the signed-in account on the right, with
 *    switch view / marketplace / reset tucked into the account menu.
 */
export function DeskShell({
  groups,
  company,
  role,
  person,
  search,
  cta,
  children,
}: {
  theme?: "wine" | "pine";
  who?: Role;
  groups: NavGroup[];
  company: string;
  role: string;
  /** Initials shown in the account chip. */
  person: string;
  /** Where the top-bar search goes; omit to hide the search box. */
  search?: { placeholder: string; to: string };
  cta: { title: string; text: string; label: string; href: string };
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const { reset, ready } = useStore();
  const all = groups.flatMap((g) => g.items);
  const root = all[0]?.href ?? "/";

  const isActive = (href: string) => {
    const clean = href.split("?")[0];
    return clean === root ? path === root : path === clean || path.startsWith(`${clean}/`);
  };

  const list = (
    <nav className="flex flex-col gap-4" aria-label="Dashboard">
      {groups.map((g, gi) => (
        <div key={g.heading ?? gi}>
          {g.heading && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">{g.heading}</p>}
          <div className="flex flex-col gap-0.5">
            {g.items.map((n) => {
              const on = isActive(n.href);
              const Icon = n.icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  aria-current={on ? "page" : undefined}
                  className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium text-[#c5cec9] transition-colors hover:bg-white/5 hover:text-white", on && "bg-pine-2 font-semibold text-white")}
                >
                  {Icon && <Icon className={cn("size-[17px] shrink-0", on ? "text-apricot" : "text-white/55")} />}
                  <span className="flex-1">{n.label}</span>
                  {n.count != null && n.count > 0 && <span className="num text-[12px] text-white/70">{n.count}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const help = (
    <div className="rounded-[14px] bg-pine-2 p-4">
      <p className="text-[14px] font-semibold text-white">{cta.title}</p>
      <p className="mt-1 text-[12px] leading-snug text-[#c5cec9]">{cta.text}</p>
      <Link href={cta.href} onClick={() => setOpen(false)} className="mt-3 flex h-10 items-center justify-center gap-1.5 rounded-lg bg-flame text-[14px] font-semibold text-white hover:bg-flame-2">
        {cta.label} <ArrowUpRight className="size-4" />
      </Link>
    </div>
  );

  const brand = <Wordmark light className="text-[22px]" />;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="scrollbar-none sticky top-0 hidden h-dvh flex-col gap-5 overflow-y-auto bg-pine p-4 lg:flex">
        <Link href={root} className="block px-3 pt-1">{brand}</Link>
        <div className="flex-1">{list}</div>
        {help}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)}>
          <div className="flex h-full w-[272px] flex-col gap-6 overflow-y-auto bg-pine p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2">
              {brand}
              <button onClick={() => setOpen(false)} className="text-white" aria-label="Close menu"><X className="size-5" /></button>
            </div>
            <div className="flex-1">{list}</div>
            {help}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-8">
            <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-ink lg:hidden" aria-label="Open menu"><Menu className="size-5" /></button>
            <Link href={root} className="lg:hidden"><Wordmark className="text-[19px]" /></Link>
            <div className="flex flex-1 justify-center">
              {search && (
                <form
                  className="hidden h-11 w-full max-w-[520px] items-center gap-2 rounded-full border border-line-2 bg-ground px-4 focus-within:border-ink sm:flex"
                  onSubmit={(e) => { e.preventDefault(); router.push(`${search.to}${encodeURIComponent(q.trim())}`); }}
                >
                  <Search className="size-4 shrink-0 text-ink-2" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={search.placeholder} className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" aria-label="Search" />
                  {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search"><X className="size-4 text-ink-2" /></button>}
                </form>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 hover:bg-soft" aria-haspopup="menu" aria-expanded={menu}>
                <span className="grid size-9 place-items-center rounded-full bg-pine text-[13px] font-semibold text-white">{person}</span>
                <span className="hidden text-left leading-tight md:block">
                  <span className="block text-[14px] font-semibold">{company}</span>
                  <span className="block text-[12px] text-ink-2">{role}</span>
                </span>
                <ChevronDown className="size-4 text-ink-2" />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                  <div role="menu" className="rise absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-[14px] border border-line bg-white py-1.5 shadow-[0_18px_40px_-20px_rgba(16,32,27,.45)]">
                    <div className="border-b border-line px-4 py-2.5 md:hidden"><p className="text-[14px] font-semibold">{company}</p><p className="text-[12px] text-ink-2">{role}</p></div>
                    <Link role="menuitem" href="/demo" onClick={() => setMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] hover:bg-soft"><Repeat className="size-4 text-ink-2" />Switch view</Link>
                    <Link role="menuitem" href="/marketplace" onClick={() => setMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] hover:bg-soft"><Store className="size-4 text-ink-2" />Marketplace</Link>
                    <button role="menuitem" onClick={() => { reset(); setMenu(false); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] hover:bg-soft"><RotateCcw className="size-4 text-ink-2" />Reset demo data</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
          <div className="mx-auto max-w-[1180px]">
            {/* Saved demo state loads after first paint; drawing the seed first would flash old numbers. */}
            {ready ? children : <div className="flex flex-col gap-5" aria-busy="true"><div className="h-16 w-72 animate-pulse rounded-[10px] bg-soft" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-[14px] bg-soft" />)}</div><div className="h-72 animate-pulse rounded-[14px] bg-soft" /></div>}
          </div>
        </main>
      </div>
    </div>
  );
}

export function DeskHeader({ kicker, title, back, actions, sub, badge }: { kicker?: string; title: string; back?: { href: string; label: string }; actions?: React.ReactNode; sub?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && <Link href={back.href} className="text-[13px] text-ink-2 hover:text-ink hover:underline">← {back.label}</Link>}
        {kicker && <p className="cap mt-1">{kicker}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="disp text-[34px] leading-tight sm:text-[34px]">{title}</h1>
          {badge}
        </div>
        {sub && <p className="mt-1.5 max-w-[70ch] text-[15px] text-ink-2">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, right, children, className, pad = true }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cn("card", pad && "p-6", className)}>
      {(title || right) && (
        <div className={cn("mb-4 flex flex-wrap items-center justify-between gap-2", !pad && "px-6 pt-6")}>
          {title && <h2 className="desk text-[21px]">{title}</h2>}
          {right && <div className="text-[13px] text-ink-2">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Ageing buckets bar list, used for receivables on several desks. */
export function Ageing({ rows }: { rows: { label: string; value: number; max: number; tone: string }[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[90px_1fr_auto] items-center gap-3 text-[13px]">
          <span className="text-ink-2">{r.label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-soft"><span className={cn("block h-full rounded-full", r.tone)} style={{ width: `${Math.round((r.value / r.max) * 100)}%` }} /></span>
          <span className="num">₹{(r.value / 1e5).toFixed(1)}L</span>
        </li>
      ))}
    </ul>
  );
}

