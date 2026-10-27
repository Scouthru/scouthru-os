"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Calculator, Check, PiggyBank, Plus, ReceiptIndianRupee, ShieldAlert, TrendingUp, Wallet } from "lucide-react";
import { Btn, inputCls } from "@/components/console/kit";
import { Box } from "@/components/hq/ui";
import { RESERVE_SHARE, fmt, leaks, months, pending, reserve, short } from "@/lib/hq/finance";
import { log, useHq } from "@/lib/hq/store";
import type { FundGoal } from "@/lib/hq/types";
import { fmtDate } from "@/lib/console/format";
import { cn } from "@/lib/cn";

/** Finance: money for marketplace and regular business. Pending payments, funds, profit and loss, costs, leaks. */
export default function Finance() {
  const { s, update, toast } = useHq();
  const ms = useMemo(() => months(s), [s]);
  const cur = ms[ms.length - 1];
  const res = reserve(s);
  const pend = pending(s);
  const lk = useMemo(() => leaks(s), [s]);
  const [tab, setTab] = useState<"receive" | "pay">("receive");

  const markPaid = (id: string) => {
    const v = s.invoices.find((x) => x.id === id)!;
    update((d) => {
      const x = d.invoices.find((y) => y.id === id)!;
      const today = new Date();
      const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      x.paidAt = new Date().toISOString();
      d.txns.push({ id: `x${Date.now()}`, date, kind: x.direction === "receive" ? "in" : "out", category: x.direction === "receive" ? "Invoice payments" : x.party, party: x.party, amount: x.amount, channel: x.channel });
      log(d, `${x.no} ${x.direction === "receive" ? `paid by ${x.party}` : `paid to ${x.party}`} · ₹${fmt(x.amount)}`);
    });
    toast(`${v.no} marked paid`);
  };

  const STATS: [string, string, string, "ok" | "bad" | ""][] = [
    ["Income this month", short(cur.income), `${short(cur.marketplace)} marketplace · ${short(cur.regular)} regular`, ""],
    ["Costs this month", short(cur.expense), `${cur.income ? Math.round((cur.expense / cur.income) * 100) : 0}% of income`, ""],
    ["Profit this month", short(cur.profit), `${short(cur.profit * RESERVE_SHARE)} goes to the reserve`, cur.profit >= 0 ? "ok" : "bad"],
    ["Owed to us", short(pend.owedToUs), pend.overdueToUs ? `${short(pend.overdueToUs)} overdue` : "nothing overdue", pend.overdueToUs ? "bad" : ""],
    ["We owe", short(pend.weOwe), `${pend.pay.length} bill${pend.pay.length === 1 ? "" : "s"}`, ""],
  ];

  return (
    <div className="grid gap-[16px]">
      <div>
        <h1 className="serif text-[30px] font-semibold leading-tight tracking-[-0.02em]">Finance</h1>
        <p className="mt-[2px] text-[13.5px] text-cs-ink-2">Money for marketplace and regular business. {Math.round(RESERVE_SHARE * 100)}% of every month&apos;s profit is set aside in the reserve fund.</p>
      </div>

      <div className="grid grid-cols-2 gap-[10px] lg:grid-cols-5">
        {STATS.map(([l, v, sub, tone]) => (
          <div key={l} className="rounded-[12px] border border-cs-line bg-white px-[15px] py-[12px]">
            <p className="text-[12px] text-cs-ink-2">{l}</p>
            <p className={cn("serif mt-[3px] text-[26px] font-semibold leading-none", tone === "ok" && "text-cs-ok", tone === "bad" && "text-cs-red")}>{v}</p>
            <p className={cn("mt-[5px] truncate text-[11.5px]", tone === "bad" ? "text-cs-red" : "text-cs-ink-2")}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-[16px] lg:grid-cols-12">
        {/* Pending payments */}
        <Box title="Pending payments" icon={ReceiptIndianRupee} sub="Unpaid invoices, latest due first" className="lg:col-span-4"
          right={<div className="flex gap-[4px]">{(["receive", "pay"] as const).map((k) => <button key={k} type="button" onClick={() => setTab(k)} className={cn("rounded-full px-[10px] py-[4px] text-[12px]", tab === k ? "bg-cs-deep text-white" : "bg-[#f3f0e9]")}>{k === "receive" ? `To receive (${pend.receive.length})` : `To pay (${pend.pay.length})`}</button>)}</div>}>
          <ul className="divide-y divide-cs-line">
            {(tab === "receive" ? pend.receive : pend.pay).map((v) => (
              <li key={v.id} className="flex items-center gap-[10px] py-[9px]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{v.party}</p>
                  <p className="truncate text-[11.5px] text-cs-ink-2">{v.no}{v.channel ? ` · ${v.channel}` : ""} · due {fmtDate(v.due)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold">₹{fmt(v.amount)}</p>
                  <p className={cn("text-[11px]", v.days < 0 ? "text-cs-red" : "text-cs-ink-2")}>{v.days < 0 ? `${-v.days} days late` : v.days === 0 ? "due today" : `in ${v.days} days`}</p>
                </div>
                <button type="button" onClick={() => markPaid(v.id)} title="Mark paid" aria-label={`Mark ${v.no} paid`} className="grid size-[30px] shrink-0 place-items-center rounded-[7px] border border-cs-line text-cs-ok hover:bg-cs-ok-bg"><Check className="size-[15px]" /></button>
              </li>
            ))}
            {(tab === "receive" ? pend.receive : pend.pay).length === 0 && <li className="py-[14px] text-center text-[13px] text-cs-ink-2">All paid.</li>}
          </ul>
        </Box>

        {/* Funds */}
        <Funds className="lg:col-span-5" total={res.total} free={res.free} />

        {/* AI finance: leaks */}
        <Box title="Money leaks" icon={ShieldAlert} sub="Where money is slipping" className="lg:col-span-3">
          {lk.length === 0 ? <p className="py-[14px] text-center text-[13px] text-cs-ink-2">No leaks spotted this month.</p> : (
            <ul className="grid gap-[10px]">
              {lk.map((x, i) => (
                <li key={i} className="flex items-start gap-[8px]">
                  {x.tone === "risk" ? <ShieldAlert className="mt-[1px] size-[16px] shrink-0 text-cs-red" /> : <AlertTriangle className="mt-[1px] size-[16px] shrink-0 text-cs-orange" />}
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold leading-snug">{x.title}</span>
                    <span className="block text-[11.5px] leading-snug text-cs-ink-2">{x.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-[10px] text-[11px] text-cs-ink-2">Worked out from your income and costs. AI-written analysis arrives with the backend.</p>
        </Box>

        {/* Profit / loss */}
        <Box title="Profit and loss" icon={TrendingUp} sub="Last 6 months" className="lg:col-span-7">
          <ProfitChart data={ms} />
          <div className="mt-[14px] grid gap-[16px] sm:grid-cols-2">
            <div>
              <p className="mb-[6px] text-[12px] font-semibold">Income this month</p>
              <Split rows={[["Marketplace", cur.marketplace], ["Regular business", cur.regular]]} total={cur.income} tone="bg-cs-green" />
            </div>
            <div>
              <p className="mb-[6px] text-[12px] font-semibold">Costs this month</p>
              <Split rows={cur.costs} total={cur.expense} tone="bg-cs-orange" />
            </div>
          </div>
        </Box>

        {/* Costs calculator */}
        <CostCalculator className="lg:col-span-5" />
      </div>
    </div>
  );
}

/** Reserve fund goals as rings: how much of each target has been put aside. */
function Funds({ total, free, className }: { total: number; free: number; className?: string }) {
  const { s, update, toast } = useHq();
  const [amount, setAmount] = useState<Record<string, string>>({});
  const [goal, setGoal] = useState({ name: "", target: "" });

  const put = (g: FundGoal) => {
    const n = Math.min(Number(amount[g.id] || 0), free, g.target - g.saved);
    if (!(n > 0)) return toast(free <= 0 ? "Nothing left in the reserve to put aside" : "Enter an amount", "bad");
    update((d) => { d.goals.find((x) => x.id === g.id)!.saved += n; log(d, `₹${fmt(n)} put towards ${g.name} from the reserve`); });
    setAmount((a) => ({ ...a, [g.id]: "" }));
    toast(`₹${fmt(n)} put towards ${g.name}`);
  };

  return (
    <Box title="Funds" icon={PiggyBank} sub={`${Math.round(RESERVE_SHARE * 100)}% of every profit · reserve ₹${fmt(total)}`} className={className}
      right={<span className="rounded-full bg-cs-mint px-[10px] py-[3px] text-[12px] font-medium text-cs-green">₹{fmt(free)} free to use</span>}>
      <p className="mb-[10px] text-[12.5px] text-cs-ink-2">What the reserve is being used for:</p>
      <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-3">
        {s.goals.map((g) => {
          const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
          return (
            <div key={g.id} className="flex flex-col items-center rounded-[11px] border border-cs-line p-[10px] text-center">
              <Ring pct={pct} />
              <p className="mt-[6px] text-[13px] font-semibold">{g.name}</p>
              <p className="text-[11px] text-cs-ink-2">₹{fmt(g.saved)} of ₹{fmt(g.target)}</p>
              {pct < 100 ? (
                <form className="mt-[8px] flex w-full gap-[4px]" onSubmit={(e) => { e.preventDefault(); put(g); }}>
                  <input value={amount[g.id] ?? ""} onChange={(e) => setAmount((a) => ({ ...a, [g.id]: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" placeholder="₹" className="h-[30px] min-w-0 flex-1 rounded-[6px] border border-cs-line px-[6px] text-[12px]" aria-label={`Amount for ${g.name}`} />
                  <button type="submit" className="h-[30px] rounded-[6px] bg-cs-green px-[8px] text-[11.5px] font-medium text-white">Add</button>
                </form>
              ) : <p className="mt-[8px] text-[11.5px] font-medium text-cs-ok">Fully funded</p>}
            </div>
          );
        })}
      </div>
      <form className="mt-[12px] flex flex-wrap gap-[6px]" onSubmit={(e) => {
        e.preventDefault();
        const t = Number(goal.target);
        if (!goal.name.trim() || !(t > 0)) return;
        update((d) => { d.goals.push({ id: `g${Date.now()}`, name: goal.name.trim(), target: t, saved: 0 }); });
        setGoal({ name: "", target: "" });
        toast("Goal added");
      }}>
        <input value={goal.name} onChange={(e) => setGoal((x) => ({ ...x, name: e.target.value }))} placeholder="New goal, e.g. Warehouse" className="h-[32px] min-w-0 flex-1 rounded-[7px] border border-cs-line px-[8px] text-[12.5px]" aria-label="Goal name" />
        <input value={goal.target} onChange={(e) => setGoal((x) => ({ ...x, target: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" placeholder="Target ₹" className="h-[32px] w-[110px] rounded-[7px] border border-cs-line px-[8px] text-[12.5px]" aria-label="Goal target" />
        <Btn icon={Plus} type="submit">Add goal</Btn>
      </form>
    </Box>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="size-[78px]" role="img" aria-label={`${pct}% saved`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="#f1ece2" strokeWidth="10" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={pct >= 100 ? "#2f7a4f" : "#a8461f"} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 40 40)" />
      <text x="40" y="45" textAnchor="middle" className="fill-[#1b1f1c] text-[15px] font-semibold">{pct}%</text>
    </svg>
  );
}

/** Six months of income and costs as paired bars, with the profit written above. */
function ProfitChart({ data }: { data: ReturnType<typeof months> }) {
  const max = Math.max(1, ...data.flatMap((m) => [m.income, m.expense]));
  return (
    <div>
      <div className="flex h-[170px] items-end gap-[10px]">
        {data.map((m) => (
          <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end">
            <span className={cn("mb-[4px] text-[11px] font-semibold", m.profit >= 0 ? "text-cs-ok" : "text-cs-red")}>{short(m.profit)}</span>
            <div className="flex h-full w-full items-end justify-center gap-[3px]">
              <span className="w-[42%] max-w-[22px] rounded-t-[4px] bg-cs-green" style={{ height: `${(m.income / max) * 100}%` }} title={`Income ₹${fmt(m.income)}`} />
              <span className="w-[42%] max-w-[22px] rounded-t-[4px] bg-[#e9b48c]" style={{ height: `${(m.expense / max) * 100}%` }} title={`Costs ₹${fmt(m.expense)}`} />
            </div>
            <span className="mt-[5px] text-[11.5px] text-cs-ink-2">{m.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-[8px] flex gap-[14px] text-[11.5px] text-cs-ink-2">
        <span className="flex items-center gap-[5px]"><span className="size-[9px] rounded-[2px] bg-cs-green" />Income</span>
        <span className="flex items-center gap-[5px]"><span className="size-[9px] rounded-[2px] bg-[#e9b48c]" />Costs</span>
        <span>Profit above each month</span>
      </p>
    </div>
  );
}

function Split({ rows, total, tone }: { rows: [string, number][]; total: number; tone: string }) {
  return (
    <ul className="grid gap-[6px]">
      {rows.map(([label, v]) => (
        <li key={label} className="text-[12px]">
          <span className="flex justify-between gap-2"><span className="truncate">{label}</span><span className="shrink-0 font-medium">₹{fmt(v)}</span></span>
          <span className="mt-[3px] block h-[5px] rounded-full bg-[#f1ece2]"><span className={cn("block h-full rounded-full", tone)} style={{ width: `${total ? (v / total) * 100 : 0}%` }} /></span>
        </li>
      ))}
    </ul>
  );
}

/** Cost out an order: what it costs per unit, the price for a target margin, and Scouthru's commission. */
function CostCalculator({ className }: { className?: string }) {
  const [f, setF] = useState({ units: "10000", material: "18", packaging: "6", labour: "3", freight: "25000", overhead: "8", margin: "20", commission: "5" });
  const n = (k: keyof typeof f) => Number(f[k]) || 0;
  const direct = n("material") + n("packaging") + n("labour");
  const freightUnit = n("units") ? n("freight") / n("units") : 0;
  const unitCost = (direct + freightUnit) * (1 + n("overhead") / 100);
  const price = unitCost / Math.max(0.01, 1 - n("margin") / 100);
  const value = price * n("units");
  const profit = (price - unitCost) * n("units");
  const commission = value * (n("commission") / 100);
  const field = (k: keyof typeof f, label: string, suffix: string) => (
    <label className="block">
      <span className="mb-[3px] block text-[11.5px] text-[#3e4440]">{label}</span>
      <span className="flex items-center rounded-[7px] border border-[#d6d8d3] bg-white pr-[8px] focus-within:border-cs-green">
        <input value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value.replace(/[^\d.]/g, "") }))} inputMode="decimal" className={cn(inputCls, "h-[34px] border-0 focus:ring-0")} />
        <span className="text-[11.5px] text-cs-ink-2">{suffix}</span>
      </span>
    </label>
  );
  return (
    <Box title="Costs calculator" icon={Calculator} sub="Cost out an order before quoting" className={className}>
      <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-4">
        {field("units", "Units", "pcs")}
        {field("material", "Material", "₹/unit")}
        {field("packaging", "Packaging", "₹/unit")}
        {field("labour", "Labour", "₹/unit")}
        {field("freight", "Freight", "₹ total")}
        {field("overhead", "Overheads", "%")}
        {field("margin", "Target margin", "%")}
        {field("commission", "Scouthru fee", "%")}
      </div>
      <div className="mt-[12px] grid grid-cols-2 gap-[8px] rounded-[10px] bg-[#faf8f4] p-[12px] sm:grid-cols-3">
        {([["Cost per unit", `₹${unitCost.toFixed(2)}`], ["Price per unit", `₹${price.toFixed(2)}`], ["Order value", `₹${fmt(value)}`], ["Profit on order", `₹${fmt(profit)}`], ["Scouthru fee", `₹${fmt(commission)}`], ["To reserve (10%)", `₹${fmt(profit * RESERVE_SHARE)}`]] as const).map(([l, v]) => (
          <div key={l}>
            <p className="text-[11px] text-cs-ink-2">{l}</p>
            <p className="serif text-[18px] font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-[8px] flex items-center gap-[5px] text-[11px] text-cs-ink-2"><Wallet className="size-[12px]" />Price = cost ÷ (1 − margin). Overheads are added on top of material, packaging, labour and freight.</p>
    </Box>
  );
}
