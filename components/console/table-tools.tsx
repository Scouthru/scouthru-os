"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Bookmark, Check, X } from "lucide-react";
import { Menu } from "./kit";
import { cn } from "@/lib/cn";

/* ---------------------------------- sorting --------------------------------- */

export type Sort = { key: string; dir: "asc" | "desc" } | null;

/**
 * Click-to-sort for a list: first click sorts ascending, second descending, third
 * goes back to the page's own order. Accessors return a number or text per column.
 */
export function useSort<T>(items: T[], acc: Record<string, (x: T) => string | number>) {
  const [sort, setSort] = useState<Sort>(null);
  const sorted = useMemo(() => {
    const f = sort && acc[sort.key];
    if (!sort || !f) return items;
    return [...items].sort((a, b) => {
      const x = f(a), y = f(b);
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "en", { numeric: true });
      return sort.dir === "asc" ? c : -c;
    });
    // accessors are defined inline by each page; the sort only depends on items and the chosen key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sort]);
  const toggle = (key: string) => setSort((s) => (!s || s.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));
  return { sorted, sort, toggle };
}

/** Header label that sorts its column. Put it inside the page's own <th>, and spread ariaSort() on the th. */
export function SortLabel({ k, s, children, align = "left" }: { k: string; s: { sort: Sort; toggle: (k: string) => void }; children: React.ReactNode; align?: "left" | "right" }) {
  const on = s.sort?.key === k;
  const Icon = !on ? ArrowUpDown : s.sort!.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button type="button" onClick={() => s.toggle(k)} className={cn("group inline-flex items-center gap-[4px] font-[inherit] hover:text-cs-ink", align === "right" && "flex-row-reverse", on && "text-cs-ink")}
      aria-label={`Sort by ${typeof children === "string" ? children : k}${on ? (s.sort!.dir === "asc" ? ", ascending" : ", descending") : ""}`}>
      {children}
      <Icon className={cn("size-[12px] shrink-0", on ? "opacity-100" : "opacity-30 group-hover:opacity-70")} strokeWidth={2} />
    </button>
  );
}

export const ariaSort = (s: { sort: Sort }, k: string) =>
  ({ "aria-sort": s.sort?.key === k ? (s.sort.dir === "asc" ? "ascending" : "descending") : "none" }) as const;

/* --------------------------------- keyboard --------------------------------- */

/**
 * Up and down arrows (or j and k) move the selected row and keep it in view, as long as
 * focus isn't in a text field and no dialog is open. Rows mark themselves with data-row.
 */
export function useRowKeys(ids: string[], current: string | null | undefined, select: (id: string) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || !ids.length) return;
      if (t && (t.closest("input, textarea, select, [contenteditable=true]") || document.querySelector("[role=dialog]"))) return;
      const down = e.key === "ArrowDown" || e.key === "j";
      const up = e.key === "ArrowUp" || e.key === "k";
      if (!down && !up) return;
      e.preventDefault();
      const i = current ? ids.indexOf(current) : -1;
      const next = ids[Math.max(0, Math.min(ids.length - 1, i + (down ? 1 : -1)))];
      if (!next || next === current) return;
      select(next);
      requestAnimationFrame(() => document.querySelector(`[data-row="${CSS.escape(next)}"]`)?.scrollIntoView({ block: "nearest" }));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ids, current, select]);
}

/* -------------------------------- saved views -------------------------------- */

type View = { name: string; value: Record<string, unknown> };
const KEY = "scouthru-views-v1";
// Saved views are a per-person convenience, so they live in this browser only.
function read(): Record<string, View[]> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}
function write(all: Record<string, View[]>) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage blocked: views just won't persist */ }
}

/**
 * "Views" button for a list: save the current filters under a name, reapply or delete
 * them later. `value` is the page's filter state; `onApply` puts a saved one back.
 */
export function SavedViews({ page, value, onApply, className }: { page: string; value: Record<string, unknown>; onApply: (v: Record<string, unknown>) => void; className?: string }) {
  const [views, setViews] = useState<View[]>([]);
  const [name, setName] = useState("");
  useEffect(() => { setViews(read()[page] ?? []); }, [page]);
  const save = (list: View[]) => { const all = read(); all[page] = list; write(all); setViews(list); };
  const same = (v: View) => JSON.stringify(v.value) === JSON.stringify(value);
  return (
    <Menu
      align="right"
      className={className}
      trigger={
        <span role="button" aria-label="Saved views" className="inline-flex h-[34px] cursor-pointer items-center gap-[6px] rounded-[6px] border border-cs-line bg-white px-[10px] text-[12px] font-medium hover:border-[#d0c7bf]">
          <Bookmark className="size-[14px]" strokeWidth={1.8} />Views{views.length ? ` (${views.length})` : ""}
        </span>
      }
    >
      {(close) => (
        <div className="w-[260px] p-[6px]">
          <p className="px-[8px] pb-[4px] pt-[2px] text-[11px] font-medium uppercase tracking-[0.08em] text-cs-ink-2">Saved views</p>
          {views.length === 0 && <p className="px-[8px] py-[6px] text-[12px] text-cs-ink-2">Set the filters you use often, then save them here.</p>}
          <ul>
            {views.map((v) => (
              <li key={v.name} className="flex items-center gap-[4px]">
                <button type="button" onClick={() => { onApply(v.value); close(); }} className="flex min-w-0 flex-1 items-center gap-[7px] rounded-[6px] px-[8px] py-[6px] text-left text-[12.5px] hover:bg-[#f8f3eb]">
                  {same(v) ? <Check className="size-[13px] text-cs-green" /> : <span className="size-[13px]" />}<span className="truncate">{v.name}</span>
                </button>
                <button type="button" aria-label={`Delete view ${v.name}`} onClick={() => save(views.filter((x) => x.name !== v.name))} className="grid size-[26px] place-items-center rounded-[6px] text-cs-ink-2 hover:bg-[#f8f3eb] hover:text-cs-red"><X className="size-[13px]" /></button>
              </li>
            ))}
          </ul>
          <form className="mt-[4px] flex gap-[6px] border-t border-cs-line px-[2px] pt-[8px]" onSubmit={(e) => { e.preventDefault(); const n = name.trim(); if (!n) return; save([...views.filter((x) => x.name !== n), { name: n, value }]); setName(""); }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this view" aria-label="View name" className="h-[30px] min-w-0 flex-1 rounded-[6px] border border-cs-line px-[8px] text-[12px] outline-none focus:border-cs-green" />
            <button type="submit" disabled={!name.trim()} className="h-[30px] rounded-[6px] bg-cs-green px-[10px] text-[12px] font-medium text-white disabled:opacity-40">Save</button>
          </form>
        </div>
      )}
    </Menu>
  );
}
