"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight, Boxes, ChevronRight, ClipboardList, Factory, FlaskConical, Gauge, IndianRupee, PackageOpen, PlayCircle, Plus, Send, ShieldCheck, Truck, Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CardTitle, Hero, Pill, StatStrip, TONE, type Tone } from "@/components/console/kit";
import { Meter } from "@/components/console/maker";
import { useConsole } from "@/lib/console/store";
import { capacityLoad, milestoneStatus, mine } from "@/lib/console/actions-maker";
import { ago, daysUntil, fmtDay, fmtNum, lakh } from "@/lib/console/format";
import type { ConsoleState } from "@/lib/console/types";
import { cn } from "@/lib/cn";

type Item = { key: string; icon: LucideIcon; tone: Tone; title: string; sub: string; when: string; href: string; rank: number };

function today(s: ConsoleState): Item[] {
  const m = mine(s);
  const out: Item[] = [];
  m.enquiries.filter((e) => e.stage !== "Closed" && e.responses.some((r) => r.mfrId === s.makerId && (r.status === "Awaiting Reply" || r.status === "Shared Proposal"))).forEach((e) =>
    out.push({ key: e.id, icon: ClipboardList, tone: "orange", title: "Send a quote", sub: `${e.id} · ${e.name} · ${fmtNum(e.moq)} units`, when: ago(e.updatedAt), href: `/console/maker/enquiries?id=${e.id}`, rank: 2 }));
  m.samples.filter((x) => x.status === "Submitted" || x.status === "Changes Requested").forEach((x) =>
    out.push({ key: x.id, icon: FlaskConical, tone: x.status === "Changes Requested" ? "red" : "orange", title: x.status === "Submitted" ? "Make and send sample" : "Revise sample", sub: `${x.id} · ${x.name}`, when: ago(x.requestedAt), href: `/console/maker/samples?id=${x.id}`, rank: 1 }));
  m.orders.filter((o) => !o.confirmed).forEach((o) => out.push({ key: o.id, icon: PlayCircle, tone: "green", title: "Accept new order", sub: `${o.id} · ${o.name} · ${fmtNum(o.qty)} units`, when: ago(o.createdAt), href: `/console/maker/orders?id=${o.id}`, rank: 0 }));
  m.quality.filter((q) => q.status === "In Testing" && q.tests.some((t) => t.status === "Pending" || t.status === "In Progress")).forEach((q) =>
    out.push({ key: q.id, icon: ShieldCheck, tone: "blue", title: "Share lab results", sub: `${q.id} · ${q.name}`, when: ago(q.updatedAt), href: `/console/maker/quality?id=${q.id}`, rank: 3 }));
  m.shipments.filter((x) => x.status === "Pending").forEach((x) => out.push({ key: x.id, icon: Truck, tone: "violet", title: "Hand to carrier", sub: `${x.id} · ${x.name} · ${fmtNum(x.qty)} units`, when: ago(x.updatedAt), href: `/console/maker/dispatch?id=${x.id}`, rank: 2 }));
  m.pos.filter((p) => p.status === "Quoted" || p.status === "Dispatched").forEach((p) =>
    out.push({ key: p.id, icon: PackageOpen, tone: "violet", title: p.status === "Quoted" ? "Accept supplier quote" : "Receive materials", sub: `${p.id} · ${p.title}`, when: ago(p.updatedAt), href: `/console/maker/materials?id=${p.id}`, rank: 4 }));
  m.plans.forEach((p) => p.milestones.filter((x) => milestoneStatus(x) === "Overdue").forEach((x) =>
    out.push({ key: x.invoice, icon: Wallet, tone: "red", title: "Chase overdue payment", sub: `${x.invoice} · ${p.orderId} · ₹${x.amount.toLocaleString("en-IN")}`, when: `${-daysUntil(x.due)} days late`, href: "/console/maker/payments", rank: 3 })));
  return out.sort((a, b) => a.rank - b.rank);
}

export default function MakerDashboard() {
  const { s } = useConsole();
  const m = useMemo(() => mine(s), [s]);
  const items = useMemo(() => today(s), [s]);
  const lines = useMemo(() => capacityLoad(s), [s]);
  const open = m.orders.filter((o) => o.batches.some((b) => b.status !== "Completed"));
  const toQuote = items.filter((i) => i.title === "Send a quote").length;
  const toMake = m.samples.filter((x) => x.status === "Submitted").length;
  const madeMonth = m.orders.flatMap((o) => o.batches).filter((b) => b.completed > 0 && Date.now() - new Date(b.end).getTime() < 30 * 864e5 && new Date(b.start).getTime() < Date.now()).reduce((a, b) => a + b.completed, 0);
  const totalCap = lines.reduce((a, l) => a + l.perMonth, 0);
  const booked = lines.reduce((a, l) => a + Math.min(l.booked, l.perMonth), 0);
  const recv = m.plans.flatMap((p) => p.milestones).filter((x) => x.status !== "Paid");
  const overdue = recv.filter((x) => milestoneStatus(x) === "Overdue");
  const first = s.people.maker.name.split(" ")[0].toUpperCase();
  const firstQuote = items.find((i) => i.title === "Send a quote");
  const activity = s.activity.filter((a) => a.who === s.people.maker.name || /NutraLab|Factory/.test(a.text) || m.orders.some((o) => a.text.includes(o.id))).slice(0, 6);

  const ACTIONS: { label: string; icon: LucideIcon; color: string; href: string }[] = [
    { label: "Send Quote", icon: Send, color: "", href: firstQuote?.href ?? "/console/maker/enquiries" },
    { label: "Log a Lead", icon: Plus, color: "text-cs-orange", href: "/console/maker/enquiries?newLead=1" },
    { label: "Update Batch", icon: Factory, color: "text-[#2f3431]", href: "/console/maker/orders" },
    { label: "Request Materials", icon: PackageOpen, color: "text-cs-violet", href: "/console/maker/materials?new=1" },
    { label: "Dispatch Shipment", icon: Truck, color: "text-[#2f3431]", href: "/console/maker/dispatch" },
    { label: "Share Lab Results", icon: ShieldCheck, color: "text-cs-green-2", href: "/console/maker/quality" },
  ];

  return (
    <div>
      <Hero eyebrow={`WELCOME BACK, ${first}`} title="NutraLab Factory Dashboard" lede={<>Enquiries, samples, production, quality, dispatch and payments for NutraLab,<br />with every brand update in one place.</>} img="/console/hero-manufacturers.jpg" height={160} quoteTop={32} quoteWidth={160} quote={["Trusted", "manufacturing", "partners for", "global brands."]} />
      <div className="px-[15px] pb-[20px]">
        <StatStrip items={[
          { icon: ClipboardList, tone: "orange", value: toQuote, label: "Quotes to Send", delta: "Brands are waiting", deltaTone: toQuote ? "bad" : "muted" },
          { icon: FlaskConical, tone: "orange", value: toMake, label: "Samples to Make", delta: `${m.samples.filter((x) => x.status === "Changes Requested").length} need changes`, deltaTone: "muted" },
          { icon: Boxes, tone: "green", value: open.length, label: "Orders in Production", delta: `${open.filter((o) => !o.confirmed).length} to accept`, deltaTone: "muted" },
          { icon: Factory, tone: "blue", value: fmtNum(madeMonth), label: "Units Made (30 days)", delta: "Completed in batches", deltaTone: "muted" },
          { icon: Gauge, tone: "violet", value: `${totalCap ? Math.round((booked / totalCap) * 100) : 0}%`, label: "Capacity Booked", delta: `${lines.filter((l) => l.pct > 100).length} lines overbooked`, deltaTone: lines.some((l) => l.pct > 100) ? "bad" : "muted" },
          { icon: IndianRupee, tone: "green", value: lakh(recv.reduce((a, x) => a + x.amount, 0)), label: "Receivables", delta: `${overdue.length} overdue`, deltaTone: overdue.length ? "bad" : "muted" },
        ]} />

        <div className="mt-[14px] grid gap-[14px] min-[1024px]:grid-cols-[minmax(0,1.97fr)_minmax(0,1fr)]">
          <section className="cs-card flex flex-col px-[15px] pb-[12px] pt-[14px] min-[1024px]:h-[281px]">
            <CardTitle sub="What needs you today, most urgent first." right={<span className="pt-[2px] text-[12px] text-cs-ink-2">{items.length} items</span>}>Today</CardTitle>
            <ul className="mt-[8px] min-h-0 flex-1 space-y-[6px] overflow-y-auto pr-[2px]">
              {items.map((i) => (
                <li key={i.key}>
                  <Link href={i.href} className="flex items-center gap-[10px] rounded-[8px] border border-cs-line px-[9px] py-[7px] hover:border-[#cfcac0]">
                    <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-[7px]", TONE[i.tone].bg, TONE[i.tone].fg)}><i.icon className="size-[17px]" strokeWidth={1.7} /></span>
                    <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-medium">{i.title}</span><span className="block truncate text-[11px] text-cs-ink-2">{i.sub}</span></span>
                    <span className="shrink-0 text-[11px] text-cs-ink-2">{i.when}</span>
                    <ChevronRight className="size-[15px] shrink-0 text-cs-ink-2" />
                  </Link>
                </li>
              ))}
              {items.length === 0 && <li className="py-6 text-center text-[13px] text-cs-ink-2">All caught up.</li>}
            </ul>
          </section>
          <section className="cs-card px-[14px] pb-[12px] pt-[14px] min-[1024px]:h-[281px]">
            <CardTitle sub="Jump straight into the work.">Quick Actions</CardTitle>
            <div className="mt-[16px] grid grid-cols-2 gap-[9px]">
              {ACTIONS.map((a, i) => (
                <Link key={a.label} href={a.href} className={cn("flex h-[54px] items-center gap-[10px] rounded-[7px] px-[12px] text-[12.5px] font-medium leading-tight", i === 0 ? "bg-cs-green text-white hover:bg-[#163b29]" : "border border-cs-line bg-white text-[#1f2421] hover:border-[#cfcac0]")}>
                  <a.icon className={cn("size-[20px] shrink-0", a.color)} strokeWidth={1.6} />{a.label}<ChevronRight className="ml-auto size-[15px]" />
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-[14px] grid gap-[10px] min-[1024px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.1fr)] min-[1024px]:h-[426px]">
          <section className="cs-card flex min-h-0 flex-col px-[15px] pt-[14px]">
            <CardTitle right={<Link href="/console/maker/orders" className="flex items-center gap-[6px] pt-[2px] text-[12px] font-medium hover:text-cs-green">View All <ArrowRight className="size-[14px]" /></Link>}>Production Progress</CardTitle>
            <ul className="mt-[8px] min-h-0 flex-1 overflow-y-auto pb-[10px]">
              {m.orders.slice().sort((a, b) => Number(!a.batches.some((x) => x.status !== "Completed")) - Number(!b.batches.some((x) => x.status !== "Completed"))).map((o) => {
                const made = o.batches.reduce((a, b) => a + b.completed, 0);
                const pct = Math.round((made / o.qty) * 100);
                return (
                  <li key={o.id} className="border-b border-cs-line py-[9px] last:border-0">
                    <Link href={`/console/maker/orders?id=${o.id}`} className="flex items-center gap-[10px]">
                      <Image src={o.img} alt="" width={38} height={38} className="size-[38px] rounded-[6px] object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="flex justify-between gap-2 text-[12.5px]"><b className="truncate font-medium">{o.name}</b><span className="shrink-0">{pct}%</span></span>
                        <Meter value={pct} className="mt-[5px] h-[6px]" />
                        <span className="mt-[3px] block text-[11px] text-cs-ink-2">{o.id} · {fmtNum(made)}/{fmtNum(o.qty)} · due {fmtDay(o.targetDelivery)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="cs-card flex min-h-0 flex-col px-[15px] pt-[14px]">
            <CardTitle right={<Link href="/console/maker/capacity" className="flex items-center gap-[6px] pt-[2px] text-[12px] font-medium hover:text-cs-green">Details <ArrowRight className="size-[14px]" /></Link>}>Capacity</CardTitle>
            <ul className="mt-[10px] space-y-[14px] pb-[12px]">
              {lines.map((l) => (
                <li key={l.line}>
                  <div className="flex justify-between text-[12.5px]"><span className="font-medium">{l.line}</span><Pill tone={l.pct > 100 ? "red" : l.pct >= 70 ? "orange" : "green"}>{l.pct}%</Pill></div>
                  <Meter value={l.pct} tone={l.pct > 100 ? "red" : l.pct >= 70 ? "orange" : "green"} className="mt-[6px]" />
                  <p className="mt-[4px] text-[11px] text-cs-ink-2">{fmtNum(l.free)} {l.unit} free of {fmtNum(l.perMonth)}/month</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="cs-card flex min-h-0 flex-col px-[15px] pt-[14px]">
            <CardTitle>Recent Activity</CardTitle>
            <ul className="mt-[6px] min-h-0 flex-1 overflow-y-auto pb-[10px]">
              {activity.map((a) => (
                <li key={a.id} className="border-b border-cs-line py-[8px] last:border-0">
                  <Link href={a.href} className="block text-[12px] hover:text-cs-green"><span className="line-clamp-2 text-[#2f3431]">{a.text}</span><span className="text-[11px] text-cs-ink-2">{a.who} · {ago(a.at)}</span></Link>
                </li>
              ))}
              {activity.length === 0 && <li className="py-6 text-center text-[12.5px] text-cs-ink-2">Your quotes, updates and dispatches show up here.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
