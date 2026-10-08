"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check as CheckIcon, ChevronDown, Leaf, MoreHorizontal, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type Tone = "green" | "orange" | "blue" | "violet" | "red" | "gray";

export const TONE: Record<Tone, { bg: string; fg: string }> = {
  green: { bg: "bg-cs-mint", fg: "text-cs-green-2" },
  orange: { bg: "bg-cs-orange-bg", fg: "text-cs-orange" },
  blue: { bg: "bg-cs-blue-bg", fg: "text-cs-blue" },
  violet: { bg: "bg-cs-violet-bg", fg: "text-cs-violet" },
  red: { bg: "bg-cs-red-bg", fg: "text-cs-red" },
  gray: { bg: "bg-[#f1f0ec]", fg: "text-[#55605a]" },
};

/**
 * Page header: eyebrow, serif title, lede, product photo on the right with a quote
 * card. The photo is cropped from the mockup, so its own baked-in quote card sits
 * under the HTML one at the same spot (object-right keeps them aligned).
 */
export function Hero({ eyebrow, title, lede, img, quote, height = 177, quoteTop = 35, quoteWidth = 190 }: { eyebrow: React.ReactNode; title: string; lede: React.ReactNode; img: string; quote: string[]; height?: number; quoteTop?: number; quoteWidth?: number }) {
  return (
    <section className="relative overflow-hidden bg-[#f7f2ea]" style={{ height }}>
      <Image src={img} alt="" width={1296} height={350} priority className="absolute right-0 top-0 h-full w-[52%] object-cover object-right" />
      <div className="absolute inset-y-0 left-[48%] w-[140px] bg-gradient-to-r from-[#f7f2ea] to-transparent" />
      <div className="relative pl-[29px] pt-[24px]">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2b302d]">{eyebrow}</p>
        <h1 className="serif mt-[10px] text-[45px] font-semibold leading-none tracking-[-0.02em] text-[#151816]">{title}</h1>
        <p className="mt-[13px] max-w-[620px] text-[16px] leading-[1.35] tracking-[-0.005em] text-[#3e4440]">{lede}</p>
      </div>
      <div className="absolute right-[11px] rounded-[6px] bg-[#f5efe5] px-[19px] py-[16px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]" style={{ top: quoteTop, width: quoteWidth }}>
        <p className="serif whitespace-nowrap text-[19.5px] leading-[1.15] tracking-[-0.02em] text-[#1d211e]">
          {quote.map((l) => <span key={l} className="block">{l}</span>)}
        </p>
        <Leaf className="absolute bottom-[14px] right-[12px] size-[26px] -rotate-12 text-cs-green-2" strokeWidth={1} />
      </div>
    </section>
  );
}

/** Breadcrumb used instead of the eyebrow on detail screens. */
export function Crumbs({ items }: { items: string[] }) {
  return (
    <span className="flex items-center gap-[10px] font-medium normal-case tracking-normal text-[12.5px]">
      {items.map((c, i) => (
        <span key={c} className="flex items-center gap-[10px]">
          {i > 0 && <span className="text-[#6b716d]">›</span>}
          <span className={i === items.length - 1 ? "text-[#151816]" : "text-[#4b524e]"}>{c}</span>
        </span>
      ))}
    </span>
  );
}

export function IconDot({ icon: Icon, tone, className }: { icon: LucideIcon; tone: Tone; className?: string }) {
  return (
    <span className={cn("grid size-[46px] shrink-0 place-items-center rounded-full", TONE[tone].bg, TONE[tone].fg, className)}>
      <Icon className="size-[22px]" strokeWidth={1.7} />
    </span>
  );
}

export function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-[5px] px-[9px] py-[3px] text-[11.5px] font-medium", TONE[tone].bg, TONE[tone].fg, className)}>{children}</span>;
}

export function CardTitle({ children, right, sub }: { children: React.ReactNode; right?: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="serif text-[20px] font-semibold leading-tight tracking-[-0.025em] text-[#151816] min-[1024px]:whitespace-nowrap">{children}</h2>
        {sub && <p className="mt-[3px] text-[13px] text-cs-ink-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Stat strip under the hero: icon dot, value, label, delta line. 5 or 6 across on desktop. */
const STAT_COLS: Record<number, string> = { 4: "min-[1024px]:grid-cols-4", 5: "min-[1024px]:grid-cols-5", 6: "min-[1024px]:grid-cols-6" };
export function StatStrip({ items }: { items: { icon: LucideIcon; tone: Tone; value: React.ReactNode; label: string; delta?: React.ReactNode; deltaTone?: "up" | "bad" | "muted" }[] }) {
  return (
    <section className={cn("cs-card relative -mt-[1px] grid grid-cols-2 gap-y-4 py-[13px] min-[768px]:grid-cols-3 min-[1024px]:gap-y-0", STAT_COLS[items.length])}>
      {items.map((s, i) => (
        <div key={s.label} className={cn("flex min-w-0 items-start gap-[14px] pl-[14px]", i > 0 && "min-[1024px]:border-l min-[1024px]:border-cs-line")}>
          <IconDot icon={s.icon} tone={s.tone} className="size-[44px]" />
          <div className="min-w-0 pt-[2px]">
            <p className="text-[21px] font-semibold leading-none">{s.value}</p>
            <p className="mt-[7px] truncate text-[12.5px] text-[#3e4440]">{s.label}</p>
            {s.delta && <p className={cn("mt-[4px] truncate whitespace-nowrap text-[11.5px]", s.deltaTone === "bad" ? "text-cs-red" : s.deltaTone === "muted" ? "text-cs-ink-2" : "text-cs-green-2")}>{s.delta}</p>}
          </div>
        </div>
      ))}
    </section>
  );
}

/* ---------- interactive building blocks shared by every console screen ---------- */

export function Btn({ kind = "outline", icon: Icon, children, className, ...rest }: { kind?: "primary" | "outline" | "danger"; icon?: LucideIcon } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex h-[40px] items-center justify-center gap-[9px] whitespace-nowrap rounded-[7px] px-[16px] text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        kind === "primary" && "bg-cs-green text-white hover:bg-[#163b29]",
        kind === "outline" && "border border-[#cfd2cd] bg-white text-[#1d211e] hover:border-[#9aa19c]",
        kind === "danger" && "border border-[#f0a8a0] bg-[#fdf3f2] text-cs-red hover:border-cs-red",
        className,
      )}
    >
      {Icon && <Icon className="size-[17px]" strokeWidth={1.7} />}
      {children}
    </button>
  );
}

/** Underlined tab strip, as on every list screen. */
export function Tabs<T extends string>({ tabs, value, onChange, className, size = "lg" }: { tabs: { key: T; label: React.ReactNode }[]; value: T; onChange: (k: T) => void; className?: string; size?: "lg" | "sm" }) {
  return (
    <div role="tablist" className={cn("scrollbar-none flex gap-[6px] overflow-x-auto border-b border-cs-line", className)}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2",
            size === "lg" ? "px-[11px] pb-[12px] text-[13.5px]" : "px-[10px] pb-[9px] text-[12.5px]",
            value === t.key ? "border-cs-green font-semibold text-cs-green" : "border-transparent text-[#3e4440] hover:text-cs-ink",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Small bordered select used in filter rows. The empty value shows the label (no filter). */
export function FilterSelect({ label, value, options, onChange, className }: { label: string; value: string; options: string[]; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={cn("relative inline-flex", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("h-[34px] w-full appearance-none rounded-[6px] border border-cs-line bg-white pl-[11px] pr-[28px] text-[12px] outline-none hover:border-[#cfcac0]", value !== "" && "border-cs-green-2/60 font-medium text-cs-green")}
      >
        <option value="">{label}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-[9px] top-[10px] size-[14px]" />
    </label>
  );
}

export function SearchBox({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={cn("flex h-[34px] items-center gap-[8px] rounded-[6px] border border-cs-line bg-white px-[11px]", className)}>
      <Search className="size-[15px] shrink-0 text-cs-ink-2" strokeWidth={1.8} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#7b817d]" />
      {value && <button type="button" aria-label="Clear search" onClick={() => onChange("")}><X className="size-[13px] text-cs-ink-2" /></button>}
    </label>
  );
}

export function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={cn("grid size-[16px] shrink-0 place-items-center rounded-[4px] border", checked ? "border-cs-green bg-cs-green text-white" : "border-[#b9bdb8] bg-white")}
    >
      {checked && <CheckIcon className="size-[11px]" strokeWidth={3} />}
    </button>
  );
}

export type MenuItem = { label: string; icon?: LucideIcon; onClick: () => void; danger?: boolean; disabled?: boolean } | "sep";

/** Dropdown menu anchored to a trigger. Closes on outside click or Escape. */
export function Menu({ trigger, items, align = "right", className, children }: { trigger: React.ReactNode; items?: MenuItem[]; align?: "left" | "right"; className?: string; children?: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={ref} className={cn("relative", className)} onClick={(e) => e.stopPropagation()}>
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      {open && (
        <div role="menu" className={cn("absolute top-full z-40 mt-[4px] min-w-[190px] rounded-[8px] border border-cs-line bg-white py-[5px] shadow-[0_8px_24px_rgba(20,30,25,0.12)]", align === "right" ? "right-0" : "left-0")}>
          {children
            ? children(() => setOpen(false))
            : items?.map((it, k) =>
                it === "sep" ? <div key={k} className="my-[4px] border-t border-cs-line" /> : (
                  <button
                    key={it.label}
                    type="button"
                    role="menuitem"
                    disabled={it.disabled}
                    onClick={() => { setOpen(false); it.onClick(); }}
                    className={cn("flex w-full items-center gap-[9px] whitespace-nowrap px-[12px] py-[7px] text-left text-[12.5px] hover:bg-[#f5f3ee] disabled:opacity-40", it.danger ? "text-cs-red" : "text-[#1d211e]")}
                  >
                    {it.icon && <it.icon className="size-[15px]" strokeWidth={1.7} />}
                    {it.label}
                  </button>
                ),
              )}
        </div>
      )}
    </div>
  );
}

/** Row "…" button with a menu. */
export function RowMenu({ items, className }: { items: MenuItem[]; className?: string }) {
  return (
    <Menu
      className={className}
      items={items}
      trigger={<span role="button" aria-label="More actions" className="grid size-[26px] cursor-pointer place-items-center rounded-[6px] text-[#2f3431] hover:bg-[#f1f0ec]"><MoreHorizontal className="size-[18px]" /></span>}
    />
  );
}

export function Modal({ open, onClose, title, sub, children, footer, width = 520 }: { open: boolean; onClose: () => void; title: string; sub?: string; children: React.ReactNode; footer?: React.ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#10201b]/40 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()} className="max-h-[90dvh] w-full overflow-y-auto rounded-[12px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]" style={{ maxWidth: width }}>
        <div className="flex items-start justify-between gap-4 border-b border-cs-line px-[22px] py-[16px]">
          <div>
            <h3 className="serif text-[21px] font-semibold leading-tight">{title}</h3>
            {sub && <p className="mt-[2px] text-[12.5px] text-cs-ink-2">{sub}</p>}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-[28px] place-items-center rounded-[6px] hover:bg-[#f1f0ec]"><X className="size-[17px]" /></button>
        </div>
        <div className="px-[22px] py-[18px]">{children}</div>
        {footer && <div className="flex justify-end gap-[10px] border-t border-cs-line px-[22px] py-[14px]">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-[5px] block text-[12px] font-medium text-[#3e4440]">{label}</span>
      {children}
      {hint && <span className="mt-[4px] block text-[11px] text-cs-ink-2">{hint}</span>}
    </label>
  );
}

export const inputCls = "h-[38px] w-full rounded-[7px] border border-[#d6d8d3] bg-white px-[11px] text-[13px] outline-none focus:border-cs-green focus:ring-1 focus:ring-cs-green";
export const textareaCls = "w-full rounded-[7px] border border-[#d6d8d3] bg-white px-[11px] py-[9px] text-[13px] leading-[1.45] outline-none focus:border-cs-green focus:ring-1 focus:ring-cs-green";

export function Toasts({ toasts }: { toasts: { id: number; text: string; tone: "ok" | "info" | "bad" }[] }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-[22px] right-[22px] z-[60] flex flex-col items-end gap-[8px]">
      {toasts.map((t) => (
        <div key={t.id} className="rise flex items-center gap-[10px] rounded-[9px] bg-[#13281f] px-[15px] py-[11px] text-[13px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
          <span className={cn("size-[8px] rounded-full", t.tone === "bad" ? "bg-[#f87171]" : t.tone === "info" ? "bg-[#93c5fd]" : "bg-[#86efac]")} />
          {t.text}
        </div>
      ))}
    </div>
  );
}

/** Empty state line for a filtered list. */
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-[16px] py-[28px] text-center text-[13px] text-cs-ink-2">{children}</p>;
}

/** Horizontal step tracker with check badges (order tracking, product timeline, quality workflow). */
export function Stepper({ steps, current, size = 52, allDone = false }: { steps: { label: string; icon: LucideIcon; sub?: React.ReactNode; note?: React.ReactNode }[]; current: number; size?: number; allDone?: boolean }) {
  return (
    <div className="relative grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0,1fr))` }}>
      <div className="absolute flex" style={{ left: `${50 / steps.length}%`, right: `${50 / steps.length}%`, top: size / 2 - 1 }}>
        {steps.slice(0, -1).map((s, i) => <span key={s.label} className={cn("h-[2px] flex-1", i < current || allDone ? "bg-cs-green" : "bg-[#dedcd6]")} />)}
      </div>
      {steps.map((s, i) => {
        const done = allDone || i < current;
        const on = !allDone && i === current;
        return (
          <div key={s.label} className="relative flex flex-col items-center text-center">
            <span className={cn("relative grid place-items-center rounded-full", on ? "bg-cs-green text-white" : done ? "bg-cs-mint text-cs-green" : "border border-[#e2e0da] bg-[#f6f5f1] text-[#4b524e]")} style={{ width: size, height: size }}>
              <s.icon className="size-[45%]" strokeWidth={1.6} />
              {(done || on) && (
                <span className="absolute -bottom-[2px] -right-[2px] grid size-[17px] place-items-center rounded-full border-2 border-white bg-cs-green text-white">
                  <CheckIcon className="size-[9px]" strokeWidth={3} />
                </span>
              )}
            </span>
            <p className="mt-[8px] text-[13px] font-semibold text-[#1d211e]">{s.label}</p>
            {s.sub && <p className="mt-[2px] text-[11.5px] text-cs-ink-2">{s.sub}</p>}
            {s.note && <p className={cn("mt-[1px] text-[11.5px]", done ? "text-cs-green-2" : on ? "text-cs-blue" : "text-cs-ink-2")}>{s.note}</p>}
          </div>
        );
      })}
    </div>
  );
}

/** "View All →" link-style button used in card headers. */
export function ViewAllBtn({ onClick, label = "View All" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-[6px] whitespace-nowrap pt-[2px] text-[12px] font-medium text-[#2f3431] hover:text-cs-green">
      {label} <span aria-hidden>→</span>
    </button>
  );
}
