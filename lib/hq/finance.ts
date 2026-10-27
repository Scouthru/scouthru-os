import type { HqState, Invoice, Txn } from "./types";
import { daysFromToday } from "./rules";

/** Finance for HQ: profit and loss by month, the reserve fund, pending payments and money leaks. */

/** Share of every month's profit that goes into the reserve fund. */
export const RESERVE_SHARE = 0.1;

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const keyOf = (date: string) => date.slice(0, 7);

/** The last `n` calendar months, oldest first, with money in, out and profit; split by marketplace and regular. */
export function months(s: HqState, n = 6, now = Date.now()) {
  const t = new Date(now);
  return Array.from({ length: n }, (_, i) => {
    const m = new Date(t.getFullYear(), t.getMonth() - (n - 1 - i), 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    const rows = s.txns.filter((x) => keyOf(x.date) === key);
    const sum = (f: (x: Txn) => boolean) => rows.filter(f).reduce((a, x) => a + x.amount, 0);
    const income = sum((x) => x.kind === "in");
    const expense = sum((x) => x.kind === "out");
    return {
      key,
      label: MON[m.getMonth()],
      income,
      expense,
      profit: income - expense,
      marketplace: sum((x) => x.kind === "in" && x.channel === "Marketplace"),
      regular: sum((x) => x.kind === "in" && x.channel === "Regular"),
      costs: Object.entries(rows.filter((x) => x.kind === "out").reduce<Record<string, number>>((a, x) => ({ ...a, [x.category]: (a[x.category] ?? 0) + x.amount }), {})).sort((a, b) => b[1] - a[1]),
    };
  });
}

/** The reserve: 10% of each month's profit. `free` is what hasn't been put towards a goal yet. */
export function reserve(s: HqState, now = Date.now()) {
  const total = Math.round(months(s, 12, now).reduce((a, m) => a + Math.max(0, m.profit) * RESERVE_SHARE, 0));
  const allocated = s.goals.reduce((a, g) => a + g.saved, 0);
  return { total, allocated, free: Math.max(0, total - allocated) };
}

/** Unpaid invoices with how late they are; receivables (owed to us) and payables (we owe). */
export function pending(s: HqState, now = Date.now()) {
  const open = s.invoices.filter((v) => !v.paidAt).map((v) => ({ ...v, days: daysFromToday(v.due, now) })).sort((a, b) => a.days - b.days);
  const total = (list: (Invoice & { days: number })[]) => list.reduce((a, v) => a + v.amount, 0);
  const receive = open.filter((v) => v.direction === "receive");
  const pay = open.filter((v) => v.direction === "pay");
  return { receive, pay, owedToUs: total(receive), weOwe: total(pay), overdueToUs: total(receive.filter((v) => v.days < 0)) };
}

export type Leak = { tone: "risk" | "watch"; title: string; detail: string; amount?: number };

/** Where money is slipping: costs rising fast, double payments, money owed and overdue, thin margins. */
export function leaks(s: HqState, now = Date.now()): Leak[] {
  const out: Leak[] = [];
  const ms = months(s, 6, now);
  const cur = ms[ms.length - 1];
  const prev3 = ms.slice(-4, -1);

  // A cost line growing well beyond its recent average.
  for (const [cat, amt] of cur.costs) {
    const avg = prev3.reduce((a, m) => a + (m.costs.find(([c]) => c === cat)?.[1] ?? 0), 0) / prev3.length;
    if (avg > 0 && amt > avg * 1.2) {
      out.push({ tone: amt > avg * 1.4 ? "risk" : "watch", title: `${cat} up ${Math.round((amt / avg - 1) * 100)}%`, detail: `₹${fmt(amt - avg)} more than the 3-month average this month`, amount: amt - avg });
    }
  }

  // The same bill paid twice in a month.
  const seen = new Map<string, Txn>();
  for (const x of s.txns.filter((t) => t.kind === "out")) {
    const k = `${keyOf(x.date)}|${x.party}|${x.amount}`;
    const first = seen.get(k);
    if (first) out.push({ tone: "risk", title: `${x.category} paid twice`, detail: `${x.party} · ₹${fmt(x.amount)} on ${first.date} and ${x.date}`, amount: x.amount });
    else seen.set(k, x);
  }

  // Money owed to us that's late.
  const p = pending(s, now);
  if (p.overdueToUs > 0) {
    const late = p.receive.filter((v) => v.days < 0);
    out.push({ tone: "risk", title: `₹${fmt(p.overdueToUs)} owed to us is overdue`, detail: late.map((v) => `${v.party} (${-v.days} days)`).join(", "), amount: p.overdueToUs });
  }
  const latePay = p.pay.filter((v) => v.days < 0);
  if (latePay.length) out.push({ tone: "watch", title: `${latePay.length} bill${latePay.length === 1 ? "" : "s"} we haven't paid on time`, detail: latePay.map((v) => `${v.party} ₹${fmt(v.amount)}`).join(", ") });

  // Costs eating too much of income.
  if (cur.income > 0 && cur.expense / cur.income > 0.7) {
    out.push({ tone: "watch", title: `Costs are ${Math.round((cur.expense / cur.income) * 100)}% of income`, detail: "Above the 70% comfort line this month" });
  }
  return out.sort((a, b) => (a.tone === b.tone ? (b.amount ?? 0) - (a.amount ?? 0) : a.tone === "risk" ? -1 : 1));
}

/** ₹ in Indian grouping, no symbol: 1,20,000. */
export const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");
/** Short rupees: ₹4.2L, ₹86k. */
export const short = (n: number) => (Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : Math.abs(n) >= 1e3 ? `₹${Math.round(n / 1e3)}k` : `₹${Math.round(n)}`);
