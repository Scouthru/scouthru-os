"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/cn";
import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";

export function Toaster() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="rise rounded-lg bg-ink px-4 py-2.5 text-[13px] text-white shadow-lg">
          {t.text}
        </div>
      ))}
    </div>
  );
}

type Tone = "ok" | "warn" | "bad" | "info" | "neutral" | "ox" | "dark";
const TONE: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
  info: "bg-info-bg text-info",
  neutral: "bg-soft text-ink-2",
  ox: "bg-ox-wash text-ox",
  dark: "bg-pine text-white",
};

export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium leading-none", TONE[tone], className)}>{children}</span>;
}

export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-lg border border-line bg-soft px-2 py-1 text-[12px] font-semibold leading-none text-ink-2", className)}>{children}</span>;
}

type Variant = "flame" | "pine" | "ox" | "outline" | "outline-ox" | "ghost" | "white";
const VAR: Record<Variant, string> = {
  flame: "bg-flame text-white hover:bg-flame-2",
  pine: "bg-pine text-white hover:bg-pine-2",
  ox: "bg-ox text-white hover:bg-ox-2",
  outline: "border-[1.5px] border-ink bg-white text-ink hover:bg-soft",
  "outline-ox": "border-[1.5px] border-ink bg-white text-ink hover:bg-soft",
  ghost: "text-ink-2 hover:bg-soft hover:text-ink",
  white: "bg-white text-ink hover:bg-soft",
};

export function Btn({
  variant = "outline",
  size = "md",
  href,
  className,
  children,
  ...rest
}: { variant?: Variant; size?: "sm" | "md" | "lg"; href?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45",
    size === "sm" ? "h-9 px-3.5 text-[13px]" : size === "lg" ? "h-12 px-6 text-[15px]" : "h-11 px-[18px] text-[15px]",
    VAR[variant],
    className,
  );
  if (href)
    return (
      <Link href={href} className={cls} onClick={rest.onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}>
        {children}
      </Link>
    );
  return <button type="button" className={cls} {...rest}>{children}</button>;
}

export function Bar({ value, tone = "pine", className }: { value: number; tone?: "pine" | "ox" | "apricot" | "ok" | "rose" | "flame"; className?: string }) {
  const c = { pine: "bg-pine", ox: "bg-ox", apricot: "bg-apricot", ok: "bg-ok", rose: "bg-rose", flame: "bg-flame" }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-soft", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-[width] duration-300", c)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/** The bottle glyph used on product tiles in the marketplace design. */
export function Jar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 64" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="15" y="3" width="18" height="8" rx="2" />
      <rect x="7" y="11" width="34" height="50" rx="6" />
      <path d="M15 28h18M15 35h11" />
    </svg>
  );
}

export const TINT: Record<string, string> = {
  sage: "bg-t-sage",
  blush: "bg-t-blush",
  oat: "bg-t-oat",
  sky: "bg-t-sky",
  lilac: "bg-t-lilac",
  stone: "bg-t-stone",
};

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={cn("rise max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-[14px]", wide ? "sm:max-w-2xl" : "sm:max-w-md")} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-[18px] font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-ink-2 hover:bg-soft" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-ink-3">{hint}</span>}
    </label>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "bad" | "ok" }) {
  return (
    <div className="card px-5 py-[18px]">
      <p className="cap">{label}</p>
      <p className={cn("num mt-2.5 text-[28px] leading-none", tone === "bad" ? "text-bad" : tone === "ok" ? "text-ok" : "text-ink")}>{value}</p>
      {sub && <p className="mt-2 text-[13px] text-ink-2">{sub}</p>}
    </div>
  );
}

/** Segmented step tracker used on order, PO and pipeline screens. */
export function Steps({ steps, at, tone = "ox" }: { steps: string[]; at: number; tone?: "ox" | "pine" }) {
  const done = tone === "ox" ? "bg-ox" : "bg-pine";
  const cur = tone === "ox" ? "bg-rose" : "bg-flame";
  return (
    <div className="card px-4 py-3">
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0,1fr))` }}>
        {steps.map((st, i) => (
          <li key={st} className="flex min-w-0 flex-col gap-1.5">
            <span className={cn("h-1 rounded-full", i < at ? done : i === at ? cur : "bg-soft")} />
            <span className={cn("truncate text-[12px]", i === at ? "font-semibold text-ink" : i < at ? "text-ink" : "text-ink-3")}>{st}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Read a photo or PDF in the browser for a proof upload. */
export async function readFile(file: File): Promise<{ url: string; buf: ArrayBuffer }> {
  const buf = await file.arrayBuffer();
  const url = await new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.readAsDataURL(file);
  });
  return { url, buf };
}

/**
 * Compact stage tracker for order rows: one segment per stage, the current
 * stage named underneath, every stage name on hover. Same component on every
 * dashboard so an order reads the same way to the brand, factory, supplier and
 * distributor.
 */
export function StageTrack({ steps, at, alert, label }: { steps: string[]; at: number; alert?: "bad" | "warn"; label?: string }) {
  const done = at >= steps.length;
  const cur = Math.min(at, steps.length - 1);
  const title = steps.map((s, i) => `${i < at || done ? "✓" : i === at ? "●" : "○"} ${s}`).join("\n");
  return (
    <div className="min-w-[150px]" title={title}>
      <div className="flex gap-0.5" role="img" aria-label={`Stage ${Math.max(cur, 0) + 1} of ${steps.length}: ${label ?? steps[Math.max(cur, 0)]}`}>
        {steps.map((s, i) => (
          <span
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i < at || done ? "bg-pine" : i === at ? (alert === "bad" ? "bg-bad" : alert === "warn" ? "bg-warn" : "bg-flame") : "bg-soft",
            )}
          />
        ))}
      </div>
      <p className="mt-1.5 flex items-center gap-1 whitespace-nowrap text-[12px]">
        {alert === "bad" ? <XCircle className="size-3.5 shrink-0 text-bad" aria-hidden /> : alert === "warn" ? <AlertTriangle className="size-3.5 shrink-0 text-warn" aria-hidden /> : done ? <CheckCircle2 className="size-3.5 shrink-0 text-ok" aria-hidden /> : <Clock3 className="size-3.5 shrink-0 text-flame" aria-hidden />}
        <span className={cn("font-semibold", alert === "bad" ? "text-bad" : alert === "warn" ? "text-warn" : "text-ink")}>{label ?? (done ? steps[steps.length - 1] : at < 0 ? "Not started" : steps[at])}</span>
        <span className="num text-ink-3"> · {done ? steps.length : Math.max(at, 0)}/{steps.length} done</span>
      </p>
    </div>
  );
}
