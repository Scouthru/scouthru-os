"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Modal, Pill, Stat } from "@/components/ui";
import { OrdersTable, orderHref } from "@/components/brand";
import { lakh, todayLabel, useStore, inr } from "@/lib/store";
import { STAGES, STAGE_LABEL, acceptQuote, approveSample, payAmount, payNext } from "@/lib/ops";
import { dayLabel } from "@/lib/seed";
import type { Action, OrderStage } from "@/lib/types";
import { cn } from "@/lib/cn";
import { FileText, FlaskConical, IndianRupee, PenLine, ShieldCheck, type LucideIcon } from "lucide-react";

const KIND_ICON: Record<Action["kind"], LucideIcon> = { Pay: IndianRupee, Sample: FlaskConical, Change: PenLine, QC: ShieldCheck, Quote: FileText };
const KIND_WORD: Record<Action["kind"], string> = { Pay: "Pay", Sample: "Sample", Change: "Change", QC: "Check", Quote: "Prices" };

const KIND_TONE: Record<Action["kind"], string> = {
  Pay: "bg-peach text-flame",
  Sample: "bg-info-bg text-info",
  Change: "bg-bad-bg text-bad",
  QC: "bg-ok-bg text-ok",
  Quote: "bg-soft text-ink-2",
};


export default function ControlTower() {
  const { s, update, toast } = useStore();
  const router = useRouter();
  const [stage, setStage] = useState<OrderStage | null>(null);
  const [describe, setDescribe] = useState("");
  const q: string = "";
  const [sample, setSample] = useState<Action | null>(null);
  const [compare, setCompare] = useState<Action | null>(null);

  const mine = s.orders.filter((o) => o.brandId === "ruchika");
  const active = mine.filter((o) => o.stage !== "closed");
  const dues = active.flatMap((o) => o.payments.filter((p) => p.status === "due").map((p) => payAmount(o, p.pct)));
  const paid = mine.flatMap((o) => o.payments.filter((p) => p.status === "paid").map((p) => payAmount(o, p.pct))).reduce((a, b) => a + b, 0);
  const committed = active.flatMap((o) => o.payments.filter((p) => p.status === "later" || p.status === "proof").map((p) => payAmount(o, p.pct))).reduce((a, b) => a + b, 0);
  const due = dues.reduce((a, b) => a + b, 0);
  const totalSpend = paid + due + committed || 1;
  const pipeline = STAGES.slice(0, 7).map((st) => ({ st, n: active.filter((o) => o.stage === st).length }));
  const shown = active.filter((o) => (!stage || o.stage === stage) && (!q || `${o.id} ${o.product} ${o.factory}`.toLowerCase().includes(q.toLowerCase())));
  const risky = active.filter((o) => o.health === "Delayed 3d" || o.split.partner > 0 && o.next.includes("partner"));

  function act(a: Action) {
    if (a.kind === "Pay" && a.orderId) {
      let msg: string | null = null;
      update((d) => { msg = payNext(d, a.orderId!); });
      setTimeout(() => toast(msg ?? "Payment recorded"), 0);
    } else if (a.kind === "Sample") setSample(a);
    else if (a.kind === "Quote") setCompare(a);
    else if (a.orderId) router.push(a.kind === "QC" ? `/brand/qc/${a.orderId}` : `/brand/orders/${a.orderId}`);
  }

  return (
    <>
      <DeskHeader kicker={todayLabel()} title="Welcome back, Ruchika Foods" sub="Your control tower: what needs you, what's in production, and what's due." />

      <section className="card mb-5 p-5">
        <p className="desk text-[18px]">What do you want made next?</p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => { e.preventDefault(); router.push(describe.trim() ? `/brand/new?d=${encodeURIComponent(describe.trim())}` : "/brand/new"); }}
        >
          <input value={describe} onChange={(e) => setDescribe(e.target.value)} placeholder="Describe your product, quantity and when you need it…" className="input h-12 flex-1 text-[15px]" aria-label="Describe your product" />
          <Btn variant="flame" size="lg" type="submit">Find factories</Btn>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Need tomato pickle 300g glass jars, 4,000 jars, Hyderabad", "Need millet chips 60g pouches, 10,000 packs", "Need ginger garlic paste 200g, 5,000 jars"].map((x) => (
            <button key={x} type="button" onClick={() => router.push(`/brand/new?d=${encodeURIComponent(x)}`)} className="rounded-full border border-line-2 bg-white px-3 py-1.5 text-left text-[13px] text-ink-2 hover:border-ink hover:text-ink">
              {x.replace(/^Need /, "")}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active orders" value={active.length} sub={`${active.filter((o) => o.stage === "production").length} in production`} />
        <Stat label="Need your action" value={s.actions.length} tone={s.actions.length ? "bad" : undefined} sub={`${s.actions.filter((a) => a.detail.includes("today") || a.detail.includes("Today")).length} due today`} />
        <Stat label="Payments due" value={lakh(due)} sub={`Next 7 days · ${dues.length} milestones`} />
        <Stat label="On-time rate" value="91%" tone="ok" sub="Last 30 days" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Needs your action" right={<Pill tone="bad">{s.actions.length} pending</Pill>}>
          <ul className="divide-y divide-line">
            {s.actions.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                {(() => { const I = KIND_ICON[a.kind]; return <span className={cn("flex w-[84px] shrink-0 items-center justify-center gap-1 rounded-full py-1 text-[12px] font-medium", KIND_TONE[a.kind])}><I className="size-3.5" aria-hidden />{KIND_WORD[a.kind]}</span>; })()}
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold">{a.title}</span>
                  <span className="block text-[12px] text-ink-2">{a.detail}</span>
                </span>
                <Btn size="sm" variant={a.kind === "Pay" ? "pine" : "outline"} onClick={() => act(a)}>{a.cta}</Btn>
              </li>
            ))}
            {s.actions.length === 0 && <li className="py-3 text-[13px] text-ink-2">Nothing waiting on you. Factories are working.</li>}
          </ul>
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel title="Spend this month">
            <div className="flex h-2 overflow-hidden rounded-full bg-soft">
              <span className="bg-pine" style={{ width: `${(paid / totalSpend) * 100}%` }} />
              <span className="bg-flame" style={{ width: `${(due / totalSpend) * 100}%` }} />
              <span className="bg-apricot" style={{ width: `${(committed / totalSpend) * 100}%` }} />
            </div>
            <ul className="mt-3 flex flex-col gap-2 text-[13px]">
              {[["Paid", paid, "bg-pine"], ["Due in 7 days", due, "bg-flame"], ["Committed, later", committed, "bg-apricot"]].map(([l, v, c]) => (
                <li key={l as string} className="flex items-center justify-between"><span className="flex items-center gap-2"><span className={cn("size-2.5 rounded-sm", c as string)} />{l as string}</span><span className="num">{lakh(v as number)}</span></li>
              ))}
            </ul>
          </Panel>
          <Panel title="At risk" right={<Pill tone="bad">{risky.length}</Pill>}>
            <ul className="flex flex-col gap-3">
              {risky.map((o) => (
                <li key={o.id}>
                  <Link href={orderHref(o)} className="block hover:underline">
                    <p className="text-[14px] font-semibold">{o.id} · {o.health === "Delayed 3d" ? "Phase 2 delayed 3 days" : `${o.product}: ${o.split.partner.toLocaleString("en-IN")} shifted to partner unit`}</p>
                    <p className="text-[12px] text-ink-2">{o.health === "Delayed 3d" ? `No proof uploaded since ${dayLabel(-5)} · Factory notified` : "Excess shifted to partner unit · confirm?"}</p>
                  </Link>
                </li>
              ))}
              {risky.length === 0 && <li className="text-[13px] text-ink-2">No orders at risk.</li>}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel className="mt-5" title="Order pipeline" right="Tap a stage to filter">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {pipeline.map(({ st, n }, i) => (
            <button key={st} onClick={() => setStage(stage === st ? null : st)} className={cn("rounded-lg border p-3 text-left transition-colors", stage === st ? "border-pine bg-pine text-white" : "border-line bg-soft/60 hover:border-line-2")}>
              <p className={cn("text-[12px]", stage === st ? "text-white/80" : "text-ink-2")}>{i + 1} · {STAGE_LABEL[st]}</p>
              <p className="num mt-1 text-[24px]">{n}</p>
            </button>
          ))}
        </div>
      </Panel>

      <div className="mt-5">
        <OrdersTable orders={shown} />
      </div>

      <Modal open={!!sample} onClose={() => setSample(null)} title="Approve sample · Lemon pickle 250g">
        <div className="flex flex-col gap-3 text-[14px]">
          <div className="relative h-40 overflow-hidden rounded-[10px] bg-soft"><img src="/products/made-gongura.jpg" alt="Sample jars" className="size-full object-cover" /><span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] text-white">Sample jars · delivered yesterday</span></div>
          <p>Approving makes this sample the <b>golden sample</b>. The bulk batch is checked against it at QC.</p>
          <div className="flex gap-2">
            <Btn variant="pine" onClick={() => { update((d) => approveSample(d, sample!.orderId!)); toast("Sample approved. Production can start."); setSample(null); }}>Approve sample</Btn>
            <Btn onClick={() => { update((d) => { d.actions = d.actions.filter((a) => a.id !== sample!.id); const o = d.orders.find((x) => x.id === sample!.orderId); if (o) { o.next = "Revised sample requested"; o.health = "Awaiting factory"; } }); toast("Revised sample requested from the factory"); setSample(null); }}>Ask for changes</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!compare} onClose={() => setCompare(null)} title={`Compare quotes · ${s.orders.find((o) => o.id === compare?.orderId)?.product ?? ""}`} wide>
        {(() => {
          const o = s.orders.find((x) => x.id === compare?.orderId);
          const qs = s.quotes.filter((q) => q.orderId === compare?.orderId && q.status === "sent");
          if (!o) return null;
          const low = Math.min(...qs.map((q) => q.price));
          return (
            <>
              <p className="text-[13px] text-ink-2">{o.qty.toLocaleString("en-IN")} {o.uom} · prices frozen 15 days · vetted, licensed factories.</p>
              {qs.length === 0 ? (
                <p className="mt-3 rounded-[10px] bg-soft p-3 text-[14px]">No quotes yet. Matched factories are being notified.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead><tr><th className="th">Factory</th><th className="th">Unit price</th><th className="th">Order value</th><th className="th">Lead</th><th className="th">Rating</th><th className="th" /></tr></thead>
                    <tbody>
                      {qs.map((x) => (
                        <tr key={x.id}>
                          <td className="td"><b>{x.factory}</b><p className="text-[12px] text-ink-2">{x.city} · {x.note}</p></td>
                          <td className="td num">₹{x.price}{x.price === low && qs.length > 1 && <Pill tone="ok" className="ml-2">Lowest</Pill>}</td>
                          <td className="td num">{inr(x.price * o.qty)}</td>
                          <td className="td">{x.lead} days</td>
                          <td className="td">{x.rating}</td>
                          <td className="td">
                            <Btn size="sm" variant="pine" onClick={() => { update((d) => acceptQuote(d, x.id)); toast(`${x.factory} selected. Agreement sent for e-sign.`); setCompare(null); }}>Select</Btn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          );
        })()}
      </Modal>
    </>
  );
}
