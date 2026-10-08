"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BadgeIndianRupee, CheckCircle2, Clock, Download, Store, Wallet } from "lucide-react";
import { Btn, CardTitle, Empty, Hero, Pill, RowMenu, SearchBox, StatStrip, Tabs } from "@/components/console/kit";
import { th } from "@/components/console/ops";
import { CollectModal, ageDays, invoiceText } from "@/components/console/distributor-kit";
import { useConsole } from "@/lib/console/store";
import { csv, download, fmtDate, inr, lakh } from "@/lib/console/format";
import type { RetailOrder } from "@/lib/console/types";
import { cn } from "@/lib/cn";

type TabKey = "due" | "overdue" | "collected" | "all";

export default function CollectionsPage() {
  return (
    <Suspense>
      <Collections />
    </Suspense>
  );
}

function Collections() {
  const { s, toast } = useConsole();
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("due");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(params.get("id"));
  const [collect, setCollect] = useState<RetailOrder | null>(null);

  useEffect(() => {
    const id = params.get("id");
    if (id) { setSel(id); const o = s.retailOrders.find((x) => x.id === id); if (o) setTab(o.payment === "Collected" ? "collected" : "due"); }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const delivered = s.retailOrders.filter((o) => o.status === "Delivered");
  const age = (o: RetailOrder) => ageDays(o.deliveredAt ?? o.at);
  const due = delivered.filter((o) => o.payment === "Due");
  const overdue = due.filter((o) => age(o) > 7);
  const collected = delivered.filter((o) => o.payment === "Collected");
  const monthAgo = Date.now() - 30 * 864e5;
  const collected30 = collected.filter((o) => o.collected && new Date(o.collected.at).getTime() >= monthAgo);

  const base: Record<TabKey, RetailOrder[]> = { due, overdue, collected, all: delivered };
  const list = useMemo(() => base[tab].filter((o) => !q.trim() || [o.id, o.retailer, o.area].some((v) => v.toLowerCase().includes(q.trim().toLowerCase()))).sort((a, b) => age(b) - age(a)), [tab, q, s.retailOrders]); // eslint-disable-line react-hooks/exhaustive-deps

  const byRetailer = useMemo(() => {
    const m = new Map<string, { due: number; n: number; oldest: number }>();
    due.forEach((o) => { const c = m.get(o.retailer) ?? { due: 0, n: 0, oldest: 0 }; m.set(o.retailer, { due: c.due + o.value, n: c.n + 1, oldest: Math.max(c.oldest, age(o)) }); });
    return Array.from(m.entries()).sort((a, b) => b[1].due - a[1].due);
  }, [s.retailOrders]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = () => {
    download(`collections-${new Date().toISOString().slice(0, 10)}.csv`, csv([["Order", "Retailer", "Area", "Delivered", "Age (days)", "Amount", "Payment", "Mode", "Reference", "Collected on"], ...delivered.map((o) => [o.id, o.retailer, o.area, o.deliveredAt ? fmtDate(o.deliveredAt) : "", age(o), o.value, o.payment, o.collected?.mode ?? "", o.collected?.ref ?? "", o.collected ? fmtDate(o.collected.at) : ""])]));
    toast("Collections exported");
  };

  return (
    <div>
      <Hero
        eyebrow="FINANCE  ·  COLLECTIONS"
        title="Collections"
        lede={<span className="lg:whitespace-nowrap">Payments due from retailers for delivered orders, collected by cash, UPI or cheque.</span>}
        img="/console/hero-payments.jpg"
        quote={["Delivered.", "Invoiced.", "Collected", "on time."]}
        height={146}
        quoteTop={16}
        quoteWidth={192}
      />
      <div className="px-[15px] pb-[20px]">
        <StatStrip
          items={[
            { icon: Wallet, tone: "orange", value: lakh(due.reduce((a, o) => a + o.value, 0)), label: "Due from Retailers", delta: <span className="block truncate">{`${due.length} invoice${due.length === 1 ? "" : "s"} open`}</span>, deltaTone: "muted" },
            { icon: AlertTriangle, tone: "red", value: overdue.length, label: "Overdue (7+ days)", delta: <span className="block truncate">{overdue.length ? inr(overdue.reduce((a, o) => a + o.value, 0)) : "nothing overdue"}</span>, deltaTone: overdue.length ? "bad" : "up" },
            { icon: CheckCircle2, tone: "green", value: lakh(collected30.reduce((a, o) => a + (o.collected?.amount ?? 0), 0)), label: "Collected (30 days)", delta: <span className="block truncate">{`${collected30.length} payment${collected30.length === 1 ? "" : "s"}`}</span> },
            { icon: Clock, tone: "blue", value: due.length ? `${Math.round(due.reduce((a, o) => a + age(o), 0) / due.length)} days` : "—", label: "Average Age of Dues", delta: <span className="block truncate">{"since delivery"}</span>, deltaTone: "muted" },
            { icon: BadgeIndianRupee, tone: "green", value: `${delivered.length ? Math.round((collected.length / delivered.length) * 100) : 0}%`, label: "Collection Rate", delta: <span className="block truncate">{`${collected.length} of ${delivered.length} delivered orders paid`}</span> },
          ]}
        />

        <div className="mt-[11px] grid gap-[11px] min-[1024px]:h-[749px] min-[1024px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="cs-card flex min-h-0 min-w-0 flex-col px-[14px] pt-[13px]">
            <div className="flex items-start gap-[10px]">
              <Tabs className="min-w-0 flex-1" value={tab} onChange={setTab} tabs={[
                { key: "due", label: `Due (${due.length})` },
                { key: "overdue", label: `Overdue (${overdue.length})` },
                { key: "collected", label: `Collected (${collected.length})` },
                { key: "all", label: `All Delivered (${delivered.length})` },
              ]} />
              <Btn icon={Download} className="h-[34px] shrink-0" onClick={exportCsv}>Export CSV</Btn>
            </div>
            <div className="mt-[14px]"><SearchBox value={q} onChange={setQ} placeholder="Search by order, retailer or area..." /></div>
            <div className="mt-[14px] min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[700px] border-separate border-spacing-y-[1px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#f7f6f2]">
                    <th className={cn(th, "rounded-l-[6px] pl-[10px]")}>Order &amp; Retailer</th>
                    <th className={th}>Delivered</th>
                    <th className={th}>Age</th>
                    <th className={th}>Amount</th>
                    <th className={th}>Status</th>
                    <th className={th}>Mode &amp; Reference</th>
                    <th className={cn(th, "rounded-r-[6px]")}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((o) => {
                    const on = o.id === sel;
                    const late = o.payment === "Due" && age(o) > 7;
                    return (
                      <tr key={o.id} onClick={() => { setSel(o.id); router.replace(`/console/distributor/collections?id=${o.id}`, { scroll: false }); }} className={cn("cursor-pointer", on ? "[&>td]:border-y-[1.5px] [&>td]:border-cs-green-2/70 [&>td:first-child]:rounded-l-[8px] [&>td:first-child]:border-l-[1.5px] [&>td:last-child]:rounded-r-[8px] [&>td:last-child]:border-r-[1.5px] [&>td]:bg-[#fbfdfb]" : "[&>td]:border-b [&>td]:border-cs-line hover:[&>td]:bg-[#faf9f6]")}>
                        <td className="py-[10px] pl-[10px] pr-[8px]"><p className="text-[11.5px] font-semibold">{o.id}</p><p className="max-w-[200px] truncate text-[11px] text-[#3e4440]">{o.retailer}</p></td>
                        <td className="whitespace-nowrap px-[8px] text-[11.5px]">{o.deliveredAt ? fmtDate(o.deliveredAt) : "—"}</td>
                        <td className={cn("px-[8px] text-[11.5px]", late && "font-semibold text-cs-red")}>{age(o)} days</td>
                        <td className="whitespace-nowrap px-[8px] text-[11.5px] font-medium">{inr(o.value)}</td>
                        <td className="px-[8px]"><Pill tone={o.payment === "Collected" ? "green" : late ? "red" : "orange"}>{o.payment === "Collected" ? "Collected" : late ? "Overdue" : "Due"}</Pill></td>
                        <td className="px-[8px] text-[11px]">{o.collected ? <><b>{o.collected.mode}</b> · {o.collected.ref}<span className="block text-cs-ink-2">{fmtDate(o.collected.at)}</span></> : <span className="text-cs-ink-2">—</span>}</td>
                        <td className="pr-[8px]">
                          {o.payment === "Due" ? (
                            <Btn kind="primary" className="h-[30px] px-[11px] text-[11.5px]" onClick={(e) => { e.stopPropagation(); setCollect(o); }}>Collect</Btn>
                          ) : (
                            <RowMenu items={[
                              { label: "Open order", onClick: () => router.push(`/console/distributor/orders?id=${o.id}`) },
                              { label: "Download receipt", icon: Download, onClick: () => { download(`Receipt-${o.id}.txt`, invoiceText(s, o), "text/plain"); toast("Receipt downloaded"); } },
                            ]} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {list.length === 0 && <Empty>{tab === "overdue" ? "Nothing overdue." : tab === "collected" ? "No collections yet." : "Nothing due right now."}</Empty>}
            </div>
            <div className="h-[10px] shrink-0" />
          </section>

          <section className="cs-card flex min-h-0 min-w-0 flex-col px-[14px] pt-[14px]">
            <CardTitle sub="Outstanding by retailer.">Who Owes What</CardTitle>
            <ul className="mt-[10px] min-h-0 flex-1 divide-y divide-cs-line overflow-y-auto pb-[10px]">
              {byRetailer.map(([name, v]) => (
                <li key={name} className="flex items-center gap-[10px] py-[9px]">
                  <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-cs-mint text-cs-green"><Store className="size-[16px]" strokeWidth={1.7} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">{name}</p>
                    <p className={cn("text-[11px]", v.oldest > 7 ? "text-cs-red" : "text-cs-ink-2")}>{v.n} invoice{v.n === 1 ? "" : "s"} · oldest {v.oldest} days</p>
                  </div>
                  <span className="text-[12.5px] font-semibold">{inr(v.due)}</span>
                </li>
              ))}
              {byRetailer.length === 0 && <li className="py-6 text-center text-[12.5px] text-cs-ink-2">All retailers are paid up.</li>}
            </ul>
            <div className="border-t border-cs-line py-[12px] text-[12px]">
              <div className="flex justify-between"><span className="text-cs-ink-2">Total outstanding</span><b>{inr(due.reduce((a, o) => a + o.value, 0))}</b></div>
              <div className="mt-[4px] flex justify-between"><span className="text-cs-ink-2">Collected, all time</span><b>{inr(collected.reduce((a, o) => a + (o.collected?.amount ?? 0), 0))}</b></div>
              <Link href="/console/distributor/orders" className="mt-[8px] inline-block text-[12px] font-medium text-cs-green hover:underline">Retailer orders →</Link>
            </div>
          </section>
        </div>
      </div>
      <CollectModal order={collect} onClose={() => setCollect(null)} />
    </div>
  );
}
