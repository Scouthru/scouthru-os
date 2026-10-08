"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, ArrowUp, Box, CalendarDays, ChevronDown, ChevronRight, CreditCard, FileText,
  FlaskConical, MapPin, MessageSquareMore, Settings2, ShieldCheck, Truck, Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Btn, CardTitle, Field, Hero, IconDot, Modal, Pill, RowMenu, TONE, inputCls, type Tone } from "@/components/console/kit";
import { useConsole } from "@/lib/console/store";
import { createOrderFromSample, raiseIssue, recordPayment, requestSample, sampleOrderDefaults } from "@/lib/console/actions";
import { ago, daysUntil, fmtNum, inr } from "@/lib/console/format";
import type { Activity, ConsoleState } from "@/lib/console/types";
import { cn } from "@/lib/cn";

const D = 864e5;
const within = (iso: string, days: number) => Date.now() - new Date(iso).getTime() <= days * D;

const TAG_TONE: Record<Activity["tag"], Tone> = { Sample: "green", Production: "green", Shipment: "violet", Quality: "red", Enquiry: "green", Payment: "orange", Product: "blue", Manufacturer: "blue" };

const LEVEL: Record<string, string> = { High: "bg-cs-red-bg text-cs-red", Medium: "bg-cs-orange-bg text-[#b8641f]", Low: "bg-[#f1f0ec] text-[#4b524e]" };

type Priority = { key: string; icon: LucideIcon; tone: Tone; title: string; sub: string; due: string; level: "High" | "Medium" | "Low"; href: string; rank: number };

/** Everything that needs the brand's attention, most urgent first. */
function priorities(s: ConsoleState): Priority[] {
  const out: Priority[] = [];
  s.issues.filter((i) => !i.resolved).forEach((i) => out.push({ key: i.id, icon: AlertTriangle, tone: "red", title: "Resolve quality issue", sub: `${i.ref} – ${i.title}`, due: ago(i.at), level: i.level, href: "/console/quality", rank: i.level === "High" ? 0 : i.level === "Medium" ? 3 : 6 }));
  s.samples.filter((x) => x.status === "In Review" || x.status === "Submitted").forEach((x) => {
    const due = daysUntil(new Date(new Date(x.requestedAt).getTime() + 5 * D).toISOString());
    out.push({ key: x.id, icon: FlaskConical, tone: "orange", title: "Review sample", sub: `${x.id} – ${x.name}`, due: due < 0 ? `${-due} day${due === -1 ? "" : "s"} overdue` : `Due in ${Math.max(1, due)} day${due > 1 ? "s" : ""}`, level: due <= 1 ? "Medium" : "Low", href: `/console/samples?id=${x.id}`, rank: due <= 1 ? 2 : 7 });
  });
  s.shipments.filter((x) => x.status === "Delayed" || (x.status === "In Transit" && x.orderId)).forEach((x) => {
    const d = daysUntil(x.eta);
    out.push({ key: x.id, icon: Truck, tone: "violet", title: x.status === "Delayed" ? "Shipment delayed" : "Track shipment", sub: `${x.id} – ${x.status === "Delayed" ? x.note : "In transit"}`, due: d >= 0 ? `Arriving in ${d} day${d === 1 ? "" : "s"}` : "Past ETA", level: x.status === "Delayed" ? "High" : "Medium", href: `/console/shipments?id=${x.id}`, rank: x.status === "Delayed" ? 1 : 4 });
  });
  s.payments.forEach((p) => p.milestones.filter((m) => m.status === "Overdue" || m.status === "Due Soon").forEach((m) => {
    const d = daysUntil(m.due);
    out.push({ key: m.invoice, icon: CreditCard, tone: "orange", title: m.status === "Overdue" ? "Payment overdue" : "Payment due", sub: `${m.invoice} – ${inr(m.amount).replace("₹", "₹ ")}`, due: d < 0 ? `${-d} days overdue` : `Due in ${d} day${d === 1 ? "" : "s"}`, level: m.status === "Overdue" ? "High" : "Medium", href: `/console/payments?id=${p.orderId}`, rank: m.status === "Overdue" ? 1 : 5 });
  }));
  s.orders.filter((o) => !o.confirmed).forEach((o) => out.push({ key: o.id, icon: Box, tone: "gray", title: "Confirm production start", sub: `${o.id} – ${o.name}`, due: "Waiting for confirmation", level: "Low", href: `/console/production?id=${o.id}`, rank: 8 }));
  return out.sort((a, b) => a.rank - b.rank);
}

/** Dated events ahead: arrivals, quality reviews, sample decisions, payments. */
function milestones(s: ConsoleState) {
  const out: { at: string; icon: LucideIcon; color: string; title: string; sub: string; href: string }[] = [];
  s.shipments.filter((x) => x.status !== "Delivered" && daysUntil(x.eta) >= 0).forEach((x) => out.push({ at: x.eta, icon: Truck, color: "text-[#2f3431]", title: "Shipment arrival", sub: `${x.id} – ${x.destination}`, href: `/console/shipments?id=${x.id}` }));
  s.quality.filter((q) => q.status === "In Testing").forEach((q) => out.push({ at: q.release, icon: ShieldCheck, color: "text-cs-orange", title: "Quality review", sub: `${q.id} – ${q.name}`, href: `/console/quality?id=${q.id}` }));
  s.samples.filter((x) => x.status === "In Review" || x.status === "Testing").forEach((x) => out.push({ at: new Date(new Date(x.requestedAt).getTime() + 7 * D).toISOString(), icon: FlaskConical, color: "text-cs-amber", title: "Sample decision", sub: `${x.id} – ${x.name}`, href: `/console/samples?id=${x.id}` }));
  s.payments.forEach((p) => p.milestones.filter((m) => m.status === "Due Soon" || m.status === "Scheduled").forEach((m) => out.push({ at: m.due, icon: CreditCard, color: "text-cs-green-2", title: `${m.name} payment`, sub: `${m.invoice} – ${inr(m.amount)}`, href: `/console/payments?id=${p.orderId}` })));
  return out.filter((m) => daysUntil(m.at) >= 0).sort((a, b) => a.at.localeCompare(b.at));
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-[6px] whitespace-nowrap pt-[2px] text-[12px] font-medium text-[#2f3431] hover:text-cs-green">
      View All <ArrowRight className="size-[14px]" />
    </Link>
  );
}

type Quick = null | "sample" | "order" | "issue" | "track" | "pay";

export default function Dashboard() {
  const { s, update, toast } = useConsole();
  const router = useRouter();
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [quick, setQuick] = useState<Quick>(null);
  const [allActivity, setAllActivity] = useState(false);

  const firstName = s.user.name.split(" ")[0].toUpperCase();
  const inReview = s.samples.filter((x) => ["Submitted", "In Review", "Testing", "Feedback"].includes(x.status));
  const running = s.orders.filter((o) => o.confirmed && o.batches.some((b) => b.status !== "Completed"));
  const openIssues = s.issues.filter((i) => !i.resolved);
  const transit = s.shipments.filter((x) => x.status === "In Transit");
  const unpaid = s.payments.flatMap((p) => p.milestones).filter((m) => m.status === "Overdue" || m.status === "Due Soon");

  const STATS: { icon: LucideIcon; tone: Tone; value: number; label: string; delta: string; bad?: boolean; href: string }[] = [
    { icon: FileText, tone: "green", value: s.enquiries.length, label: "Total Enquiries", delta: `${s.enquiries.filter((e) => within(e.createdAt, 30)).length} new this month`, href: "/console/enquiries" },
    { icon: MessageSquareMore, tone: "orange", value: inReview.length, label: "Samples in Review", delta: `${inReview.filter((x) => within(x.requestedAt, 7)).length} new this week`, href: "/console/samples" },
    { icon: CalendarDays, tone: "orange", value: running.length, label: "Orders in Production", delta: `${s.orders.filter((o) => !o.confirmed).length} awaiting start`, href: "/console/production" },
    { icon: ShieldCheck, tone: "blue", value: openIssues.length, label: "Quality Alerts", delta: `${openIssues.filter((i) => i.level === "High").length} high priority`, bad: true, href: "/console/quality" },
    { icon: Truck, tone: "violet", value: transit.length, label: "Shipments in Transit", delta: `${s.shipments.filter((x) => x.status === "Delayed").length} delayed`, href: "/console/shipments" },
    { icon: Wallet, tone: "green", value: unpaid.length, label: "Payments Due", delta: `${unpaid.filter((m) => daysUntil(m.due) <= 7).length} due this week`, href: "/console/payments" },
  ];

  const inRange = (iso: string) => within(iso, range);
  const delivered = s.shipments.filter((x) => x.status === "Delivered");
  const PIPE: { icon: LucideIcon; label: string; n: number; tag: string; tone: "green" | "gray" | "violet"; tagTone: "up" | "blue" | "green"; href: string }[] = [
    { icon: FileText, label: "Enquiries", n: s.enquiries.filter((e) => e.stage !== "Closed").length, tag: `${s.enquiries.filter((e) => inRange(e.createdAt)).length} new`, tone: "green", tagTone: "up", href: "/console/enquiries" },
    { icon: FlaskConical, label: "Samples", n: inReview.length, tag: `${s.samples.filter((x) => inRange(x.requestedAt)).length} new`, tone: "green", tagTone: "up", href: "/console/samples" },
    { icon: Settings2, label: "Production", n: running.length, tag: `${s.orders.filter((o) => inRange(o.createdAt)).length} new`, tone: "green", tagTone: "up", href: "/console/production" },
    { icon: ShieldCheck, label: "Quality", n: s.quality.filter((q) => q.status !== "Passed").length, tag: "In Progress", tone: "gray", tagTone: "blue", href: "/console/quality" },
    { icon: Truck, label: "Shipments", n: transit.length + s.shipments.filter((x) => x.status === "Delayed").length, tag: `${s.shipments.filter((x) => inRange(x.updatedAt) && x.status !== "Pending").length} moving`, tone: "violet", tagTone: "up", href: "/console/shipments" },
    { icon: Box, label: "Delivery", n: delivered.filter((x) => inRange(x.updatedAt)).length, tag: s.shipments.some((x) => x.status === "Delayed") ? "Delays" : "On Track", tone: "gray", tagTone: "green", href: "/console/shipments" },
  ];

  const ACTIONS: { label: string; icon: LucideIcon; color: string; go: () => void }[] = [
    { label: "Create Enquiry", icon: FileText, color: "", go: () => router.push("/console/enquiries?new=1") },
    { label: "Request Sample", icon: FlaskConical, color: "text-cs-orange", go: () => setQuick("sample") },
    { label: "Create Production Order", icon: Box, color: "text-[#2f3431]", go: () => setQuick("order") },
    { label: "Log Quality Issue", icon: ShieldCheck, color: "text-cs-red", go: () => setQuick("issue") },
    { label: "Track Shipment", icon: Truck, color: "text-[#2f3431]", go: () => setQuick("track") },
    { label: "Record Payment", icon: CreditCard, color: "text-cs-green-2", go: () => setQuick("pay") },
  ];

  const pri = useMemo(() => priorities(s), [s]);
  const mile = useMemo(() => milestones(s), [s]);
  const activity = allActivity ? s.activity : s.activity.slice(0, 6);

  // Manufacturing footprint: the partner with the most live orders.
  const top = useMemo(() => {
    const byM = s.manufacturers.map((m) => {
      const live = s.orders.filter((o) => o.mfrId === m.id && o.batches.some((b) => b.status !== "Completed"));
      return { m, live: live.length, units: live.reduce((a, o) => a + o.qty, 0) };
    });
    return byM.sort((a, b) => b.units - a.units || b.m.rating - a.m.rating)[0];
  }, [s]);
  const topProducts = s.products.filter((p) => p.mfrId === top.m.id && p.stage !== "Archived").length;

  return (
    <div>
      <Hero
        eyebrow={`WELCOME BACK, ${firstName}`}
        title="Scouthru OS Dashboard"
        lede={<span className="text-[17.5px] leading-[1.32]">Your complete operations overview — from enquiries to delivery.<br />Track progress, monitor key metrics, and keep your supply chain moving.</span>}
        img="/console/hero-dashboard.jpg"
        quote={["Ideas.", "Samples.", "Production.", "To global markets."]}
      />

      <div className="px-[15px] pb-[18px]">
        <section className="cs-card relative -mt-[1px] grid grid-cols-2 gap-y-4 py-[15px] min-[768px]:grid-cols-3 min-[1024px]:grid-cols-6 min-[1024px]:gap-y-0">
          {STATS.map((st, i) => (
            <Link key={st.label} href={st.href} className={cn("group flex min-w-0 items-start gap-[10px] pl-[12px] min-[1024px]:gap-[14px] min-[1024px]:pl-[14px]", i > 0 && "min-[1024px]:border-l min-[1024px]:border-cs-line")}>
              <IconDot icon={st.icon} tone={st.tone} className="size-[38px] min-[1024px]:size-[46px]" />
              <div className="min-w-0 pt-[2px]">
                <p className="text-[21px] font-semibold leading-none group-hover:text-cs-green">{st.value}</p>
                <p className="mt-[7px] truncate text-[13px] text-[#3e4440]">{st.label}</p>
                <p className={cn("mt-[4px] flex items-center gap-[4px] whitespace-nowrap text-[12px]", st.bad ? "text-cs-red" : "text-cs-green-2")}>
                  <ArrowUp className="size-[13px]" strokeWidth={2} />{st.delta}
                </p>
              </div>
            </Link>
          ))}
        </section>

        <div className="mt-[14px] grid gap-[14px] min-[1024px]:grid-cols-[minmax(0,1.97fr)_minmax(0,1fr)]">
          <section className="cs-card px-[15px] pb-[10px] pt-[14px]">
            <CardTitle
              sub="Track your products through each stage of the supply chain."
              right={
                <label className="relative">
                  <span className="sr-only">Time range</span>
                  <select value={range} onChange={(e) => setRange(Number(e.target.value) as 7 | 30 | 90)} className="h-[30px] w-[138px] appearance-none rounded-[6px] border border-cs-line bg-white pl-[11px] text-[12px] outline-none">
                    <option value={7}>Last 7 Days</option><option value={30}>Last 30 Days</option><option value={90}>Last 90 Days</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-[10px] top-[8px] size-[14px]" />
                </label>
              }
            >
              Enquiry to Delivery Pipeline
            </CardTitle>
            <div className="relative mt-[22px] grid grid-cols-6">
              <div className="absolute left-[8.3%] right-[8.3%] top-[26px] flex">
                {PIPE.slice(0, -1).map((p, i) => <span key={p.label} className={cn("h-[2px] flex-1", i < 3 ? "bg-cs-green" : "bg-[#dedcd6]")} />)}
              </div>
              {PIPE.map((p, i) => (
                <Link key={p.label} href={p.href} className="group relative flex flex-col items-center">
                  <span className={cn("relative grid size-[52px] place-items-center rounded-full transition group-hover:ring-2 group-hover:ring-cs-green/30", p.tone === "green" ? "bg-cs-mint text-cs-green" : p.tone === "violet" ? "bg-cs-violet-bg text-cs-violet" : "bg-[#f1f0ec] text-[#3a403c]")}>
                    <p.icon className="size-[24px]" strokeWidth={1.6} />
                    {(i === 0 || i === 2) && (
                      <span className="absolute -bottom-[3px] -right-[3px] grid size-[18px] place-items-center rounded-full border-2 border-white bg-cs-green text-white">
                        <svg viewBox="0 0 12 12" className="size-[9px]" aria-hidden><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                    )}
                  </span>
                  <p className="mt-[8px] text-[13.5px] font-medium text-[#1d211e]">{p.label}</p>
                  <p className="serif mt-[5px] text-[20px] font-semibold leading-none">{p.n}</p>
                  <span className={cn("mt-[8px] flex items-center gap-[3px] whitespace-nowrap rounded-[5px] px-[10px] py-[3px] text-[12px] font-medium", p.tagTone === "blue" ? `${TONE.blue.bg} ${TONE.blue.fg}` : "bg-cs-mint text-cs-green-2")}>
                    {p.tagTone === "up" && !p.tag.startsWith("0 ") && <ArrowUp className="size-[12px]" strokeWidth={2.2} />}{p.tag.startsWith("0 ") ? "None new" : p.tag}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="cs-card px-[14px] pb-[6px] pt-[14px]">
            <CardTitle sub="Get started with key workflows.">Quick Actions</CardTitle>
            <div className="mt-[6px] grid grid-cols-2 gap-[9px]">
              {ACTIONS.map((a, i) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.go}
                  className={cn("flex h-[54px] items-center gap-[10px] rounded-[7px] px-[12px] text-left text-[12.5px] font-medium leading-tight tracking-[-0.01em] min-[1024px]:whitespace-nowrap", i === 0 ? "bg-cs-green text-white hover:bg-[#8f3a18]" : "border border-cs-line bg-white text-[#1f2421] hover:border-[#cfcac0]")}
                >
                  <a.icon className={cn("size-[21px] shrink-0", a.color)} strokeWidth={1.6} />
                  {a.label}
                  <ChevronRight className="ml-auto size-[15px]" />
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-[14px] grid gap-[10px] min-[1024px]:grid-cols-[minmax(0,1.69fr)_minmax(0,1.09fr)_minmax(0,1fr)]">
          <section className="cs-card px-[15px] pt-[16px]">
            <CardTitle right={<button type="button" onClick={() => setAllActivity((v) => !v)} className="flex items-center gap-[6px] whitespace-nowrap pt-[2px] text-[12px] font-medium text-[#2f3431] hover:text-cs-green">{allActivity ? "Show Less" : "View All"} <ArrowRight className="size-[14px]" /></button>}>Recent Activity</CardTitle>
            <ul className={cn("relative mt-[8px]", allActivity && "max-h-[520px] overflow-y-auto")}>
              <span className="absolute bottom-[30px] left-[4px] top-[24px] w-px bg-cs-line" />
              {activity.map((a) => (
                <li key={a.id} className="relative flex items-center gap-[10px] border-b border-cs-line py-[8px] pl-[20px] last:border-0">
                  <span className={cn("absolute left-0 top-[16px] size-[9px] rounded-full ring-2 ring-white", a.tag === "Production" || a.tag === "Quality" ? "bg-cs-amber" : "bg-cs-green-2")} />
                  <span className="w-[66px] shrink-0 self-start pt-[1px] text-[11px] text-cs-ink-2">{ago(a.at)}</span>
                  {a.img ? (
                    <Image src={a.img} alt="" width={40} height={40} className="size-[40px] shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className={cn("grid size-[40px] shrink-0 place-items-center rounded-full", TONE[TAG_TONE[a.tag]].bg, TONE[TAG_TONE[a.tag]].fg)}>
                      {a.tag === "Quality" ? <ShieldCheck className="size-[19px]" strokeWidth={1.7} /> : a.tag === "Shipment" ? <Truck className="size-[19px]" strokeWidth={1.7} /> : <FileText className="size-[19px]" strokeWidth={1.7} />}
                    </span>
                  )}
                  <Link href={a.href} className="min-w-0 flex-1 hover:text-cs-green">
                    <p className="text-[12.5px] font-medium text-[#1d211e]">{a.who}</p>
                    <p className="mt-[1px] line-clamp-2 text-[11px] leading-[1.4] tracking-[-0.01em] text-cs-ink-2">{a.text}</p>
                  </Link>
                  <Pill tone={TAG_TONE[a.tag]} className="w-[64px] justify-center px-0">{a.tag}</Pill>
                  <RowMenu items={[
                    { label: "Open", icon: ArrowRight, onClick: () => router.push(a.href) },
                    { label: "Remove from feed", onClick: () => update((d) => { d.activity = d.activity.filter((x) => x.id !== a.id); }) },
                  ]} />
                </li>
              ))}
              {activity.length === 0 && <li className="py-6 text-center text-[13px] text-cs-ink-2">No activity yet.</li>}
            </ul>
          </section>

          <section className="cs-card px-[11px] pt-[16px]">
            <div className="px-[4px]">
              <CardTitle right={<ViewAll href="/console/quality" />}>
                <span className="flex items-center gap-[10px]">High Priority Items <span className="grid size-[21px] place-items-center rounded-full bg-cs-red font-sans text-[11px] font-semibold text-white">{pri.length}</span></span>
              </CardTitle>
            </div>
            <ul className="mt-[8px] space-y-[7px] pb-[10px]">
              {pri.slice(0, 5).map((p) => (
                <li key={p.key} className="relative flex min-w-0 items-start gap-[10px] rounded-[8px] border border-cs-line px-[8px] py-[7px] hover:border-[#cfcac0]">
                  <span className={cn("grid size-[38px] shrink-0 place-items-center rounded-[7px]", TONE[p.tone].bg, TONE[p.tone].fg)}><p.icon className="size-[20px]" strokeWidth={1.7} /></span>
                  <Link href={p.href} className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-[#1d211e]">{p.title}</p>
                    <p className="mt-[1px] truncate pr-[24px] text-[10.5px] tracking-[-0.01em] text-cs-ink-2">{p.sub}</p>
                    <p className="mt-[2px] text-[11px] text-cs-red">{p.due}</p>
                  </Link>
                  <span className={cn("absolute right-[38px] top-[9px] rounded-[5px] px-[9px] py-[2px] text-[11px] font-medium", LEVEL[p.level])}>{p.level}</span>
                  <RowMenu className="absolute right-[6px] top-[7px]" items={[{ label: "Open", icon: ArrowRight, onClick: () => router.push(p.href) }]} />
                </li>
              ))}
              {pri.length === 0 && <li className="py-6 text-center text-[13px] text-cs-ink-2">Nothing urgent right now.</li>}
            </ul>
          </section>

          <div className="space-y-[12px]">
            <section className="cs-card px-[13px] pb-[9px] pt-[12px]">
              <CardTitle right={<ViewAll href="/console/manufacturers" />}><span className="text-[18.5px]">Manufacturing Footprint</span></CardTitle>
              <Link href={`/console/manufacturers?id=${top.m.id}`} className="block">
                <Image src={top.m.id === "nutralab" ? "/console/factory-nutralab.jpg" : top.m.img} alt={`${top.m.name} facility`} width={576} height={144} className="mt-[3px] h-[96px] w-full rounded-[6px] object-cover" />
                <div className="mt-[4px] flex items-start justify-between">
                  <div>
                    <p className="serif text-[16.5px] font-semibold hover:text-cs-green">{top.m.name}</p>
                    <p className="flex items-center gap-[4px] text-[12px] text-cs-ink-2"><MapPin className="size-[13px]" />{top.m.state}, India</p>
                  </div>
                  <Pill tone="green" className="mt-[6px]">{top.live > 0 ? "Active" : "Idle"}</Pill>
                </div>
              </Link>
              <div className="mt-[7px] grid grid-cols-3 gap-[6px]">
                {[[String(topProducts), "Active Products"], [String(top.live), "In Production"], [`${top.m.onTime}%`, "On-time Delivery"]].map(([v, l]) => (
                  <div key={l} className="rounded-[6px] border border-cs-line px-[8px] py-[3px]">
                    <p className="serif text-[16px] font-semibold leading-tight">{v}</p>
                    <p className="whitespace-nowrap text-[9.5px] leading-tight tracking-[-0.01em] text-cs-ink-2">{l}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="cs-card px-[15px] pb-[6px] pt-[12px]">
              <CardTitle right={<ViewAll href="/console/production" />}>Upcoming Milestones</CardTitle>
              <ul className="mt-[2px]">
                {mile.slice(0, 3).map((m) => {
                  const dt = new Date(m.at);
                  return (
                    <li key={m.title + m.sub} className="border-b border-cs-line last:border-0">
                      <Link href={m.href} className="flex items-center gap-[12px] py-[5px] hover:text-cs-green">
                        <span className="grid h-[36px] w-[30px] shrink-0 place-content-center rounded-[6px] bg-[#f3f1ec] text-center leading-none">
                          <span className="serif block text-[14.5px] font-semibold">{dt.getDate()}</span>
                          <span className="block text-[10px] text-cs-ink-2">{dt.toLocaleDateString("en-GB", { month: "short" })}</span>
                        </span>
                        <m.icon className={cn("size-[20px] shrink-0", m.color)} strokeWidth={1.6} />
                        <div className="min-w-0">
                          <p className="text-[12.5px] text-[#1d211e]">{m.title}</p>
                          <p className="truncate text-[11px] text-cs-ink-2">{m.sub}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
                {mile.length === 0 && <li className="py-4 text-[12.5px] text-cs-ink-2">No upcoming milestones.</li>}
              </ul>
            </section>
          </div>
        </div>
      </div>

      <QuickModals which={quick} close={() => setQuick(null)} onDone={(text, href) => { toast(text); if (href) router.push(href); }} />
    </div>
  );
}

/** The five Quick Action dialogs. Each runs the same action the full screen uses. */
function QuickModals({ which, close, onDone }: { which: Quick; close: () => void; onDone: (text: string, href?: string) => void }) {
  const { s, update } = useConsole();
  const [enq, setEnq] = useState("");
  const [mfr, setMfr] = useState("");
  const [qty, setQty] = useState(500);
  const [smp, setSmp] = useState("");
  const [orderQty, setOrderQty] = useState(50000);
  const [price, setPrice] = useState(9);
  const [dest, setDest] = useState("Mumbai, India");
  const [batch, setBatch] = useState("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<"High" | "Medium" | "Low">("Medium");
  const [ship, setShip] = useState("");
  const [inv, setInv] = useState("");
  const [ref, setRef] = useState("");

  const openEnq = s.enquiries.filter((e) => ["In Discussion", "Quote Received", "Samples Requested"].includes(e.stage));
  const approvedNoOrder = s.samples.filter((x) => x.status === "Approved" && !x.orderId);
  const unpaid = s.payments.flatMap((p) => p.milestones.filter((m) => m.status !== "Paid").map((m) => ({ p, m })));
  const e = s.enquiries.find((x) => x.id === enq);
  const respMfrs = e ? e.responses.map((r) => r.mfrId) : s.manufacturers.map((m) => m.id);

  if (which === "sample") return (
    <Modal open onClose={close} title="Request Sample" sub="Ask a manufacturer to make a sample for one of your enquiries."
      footer={<><Btn onClick={close}>Cancel</Btn><Btn kind="primary" icon={FlaskConical} disabled={!enq || !mfr || qty <= 0} onClick={() => { let id = ""; update((d) => { id = requestSample(d, enq, mfr, qty); }); close(); onDone("Sample requested", `/console/samples?id=${id}`); }}>Request sample</Btn></>}>
      <div className="space-y-[12px]">
        <Field label="Enquiry"><select className={inputCls} value={enq} onChange={(ev) => { setEnq(ev.target.value); setMfr(""); }}><option value="">Choose an enquiry</option>{openEnq.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.id}</option>)}</select></Field>
        <Field label="Manufacturer"><select className={inputCls} value={mfr} onChange={(ev) => setMfr(ev.target.value)} disabled={!enq}><option value="">Choose a manufacturer</option>{respMfrs.map((id) => <option key={id} value={id}>{s.manufacturers.find((m) => m.id === id)?.name}</option>)}</select></Field>
        <Field label="Sample quantity (units)"><input className={inputCls} type="number" min={1} value={qty} onChange={(ev) => setQty(Number(ev.target.value))} /></Field>
      </div>
    </Modal>
  );

  if (which === "order") return (
    <Modal open onClose={close} title="Create Production Order" sub="Production orders start from an approved sample."
      footer={<><Btn onClick={close}>Cancel</Btn><Btn kind="primary" icon={Box} disabled={!smp || orderQty <= 0} onClick={() => { let id: string | null = null; update((d) => { id = createOrderFromSample(d, smp, orderQty, price, dest); }); close(); onDone(`Production order ${id} created`, `/console/production?id=${id}`); }}>Create order</Btn></>}>
      {approvedNoOrder.length === 0 ? <p className="text-[13px] text-cs-ink-2">No approved samples are waiting for an order. Approve a sample on the Samples screen first.</p> : (
        <div className="space-y-[12px]">
          <Field label="Approved sample"><select className={inputCls} value={smp} onChange={(ev) => { setSmp(ev.target.value); const x = s.samples.find((y) => y.id === ev.target.value); if (x) { const def = sampleOrderDefaults(x, s.enquiries.find((y) => y.id === x.enquiryId)); setOrderQty(def.qty); setPrice(def.unitPrice); } }}><option value="">Choose a sample</option>{approvedNoOrder.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.id} · {s.manufacturers.find((m) => m.id === x.mfrId)?.short}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-[10px]">
            <Field label="Quantity (units)"><input className={inputCls} type="number" min={1} value={orderQty} onChange={(ev) => setOrderQty(Number(ev.target.value))} /></Field>
            <Field label="Unit price (₹)"><input className={inputCls} type="number" min={0} step={0.1} value={price} onChange={(ev) => setPrice(Number(ev.target.value))} /></Field>
          </div>
          <Field label="Deliver to"><input className={inputCls} value={dest} onChange={(ev) => setDest(ev.target.value)} /></Field>
          <p className="text-[12px] text-cs-ink-2">Order value {inr(orderQty * price)} · {Math.ceil(orderQty / 10000)} batch{orderQty > 10000 ? "es" : ""} of up to {fmtNum(10000)} units</p>
        </div>
      )}
    </Modal>
  );

  if (which === "issue") return (
    <Modal open onClose={close} title="Log Quality Issue"
      footer={<><Btn onClick={close}>Cancel</Btn><Btn kind="danger" icon={AlertTriangle} disabled={!batch || !title.trim()} onClick={() => { update((d) => raiseIssue(d, batch, title.trim(), level, "")); close(); onDone("Quality issue logged", `/console/quality?id=${batch}`); }}>Log issue</Btn></>}>
      <div className="space-y-[12px]">
        <Field label="Batch"><select className={inputCls} value={batch} onChange={(ev) => setBatch(ev.target.value)}><option value="">Choose a batch</option>{s.quality.map((q) => <option key={q.id} value={q.id}>{q.id} · {q.name}</option>)}</select></Field>
        <Field label="What's wrong?"><input className={inputCls} value={title} onChange={(ev) => setTitle(ev.target.value)} placeholder="e.g. Seal not tight on 3 of 50 bottles" /></Field>
        <Field label="Priority"><select className={inputCls} value={level} onChange={(ev) => setLevel(ev.target.value as typeof level)}><option>High</option><option>Medium</option><option>Low</option></select></Field>
      </div>
    </Modal>
  );

  if (which === "track") return (
    <Modal open onClose={close} title="Track Shipment"
      footer={<><Btn onClick={close}>Cancel</Btn><Btn kind="primary" icon={Truck} disabled={!ship} onClick={() => { close(); onDone("Opening shipment", `/console/shipments?id=${ship}`); }}>Track</Btn></>}>
      <Field label="Shipment"><select className={inputCls} value={ship} onChange={(ev) => setShip(ev.target.value)}><option value="">Choose a shipment</option>{s.shipments.filter((x) => x.status !== "Delivered").map((x) => <option key={x.id} value={x.id}>{x.id} · {x.name} · {x.status}</option>)}</select></Field>
    </Modal>
  );

  if (which === "pay") {
    const pick = unpaid.find((u) => u.m.invoice === inv);
    return (
      <Modal open onClose={close} title="Record Payment"
        footer={<><Btn onClick={close}>Cancel</Btn><Btn kind="primary" icon={CreditCard} disabled={!pick || !ref.trim()} onClick={() => { if (!pick) return; update((d) => recordPayment(d, pick.p.orderId, pick.m.invoice, ref.trim(), new Date().toISOString())); close(); onDone(`Payment recorded for ${pick.m.invoice}`, `/console/payments?id=${pick.p.orderId}`); }}>Record payment</Btn></>}>
        <div className="space-y-[12px]">
          <Field label="Invoice"><select className={inputCls} value={inv} onChange={(ev) => setInv(ev.target.value)}><option value="">Choose an unpaid invoice</option>{unpaid.map(({ p, m }) => <option key={m.invoice} value={m.invoice}>{m.invoice} · {p.name} · {m.name} · {inr(m.amount)} · {m.status}</option>)}</select></Field>
          <Field label="Payment reference (UTR / cheque no.)"><input className={inputCls} value={ref} onChange={(ev) => setRef(ev.target.value)} placeholder="e.g. UTR 4521 8890 1123" /></Field>
        </div>
      </Modal>
    );
  }
  return null;
}
