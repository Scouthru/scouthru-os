"use client";

import Link from "next/link";
import { ArrowRight, Boxes, Gauge, Inbox, Leaf } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/console/site";
import { useConsole } from "@/lib/console/store";
import { capacityLoad } from "@/lib/console/actions-maker";
import { cn } from "@/lib/cn";

const MODULES: [string, string, string, string[], typeof Inbox][] = [
  ["01", "Enquiry management", "Every enquiry in one inbox, checked against what you can actually make.", ["Import from any source", "Reminders for unanswered enquiries", "Masked numbers, protected chats"], Inbox],
  ["02", "Capacity management", "Know your load before you say yes.", ["Live capacity by month and line", "Accept only what fits", "Overflow to verified partner units"], Gauge],
  ["03", "Post-order management", "Sample to final payment, tracked with proof.", ["Batches, photo proof and lab results", "Dispatch and tracking", "Structured payments with reminders"], Boxes],
];

const SOURCES = ["Scouthru marketplace", "IndiaMART", "WhatsApp", "Phone calls", "Email", "Referrals"];

/** Scouthru OS for manufacturers: what the factory portal does, with live numbers from the demo. */
export default function OSLanding() {
  const { s } = useConsole();
  const mine = s.enquiries.filter((e) => e.responses.some((r) => r.mfrId === s.makerId));
  const toQuote = mine.filter((e) => e.responses.some((r) => r.mfrId === s.makerId && (r.status === "Awaiting Reply" || r.status === "Shared Proposal"))).length;
  const leads = s.leads.filter((l) => l.status === "New").length;
  // Same figure as the factory portal's "Capacity Booked" card.
  const lines = capacityLoad(s);
  const cap = lines.reduce((a, l) => a + l.perMonth, 0);
  const pct = cap ? Math.round((lines.reduce((a, l) => a + Math.min(l.booked, l.perMonth), 0) / cap) * 100) : 0;

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <section className="mx-auto max-w-[1240px] px-5 pb-[56px] pt-[48px]">
        <div className="grid items-center gap-[40px] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div>
            <p className="text-[11.5px] font-semibold tracking-[0.2em] text-cs-green-2">SCOUTHRU OS · FOR FMCG MANUFACTURERS</p>
            <h1 className="serif mt-[16px] text-[46px] font-semibold leading-[1.02] tracking-[-0.025em] sm:text-[60px]">Run your factory&apos;s orders in one place.</h1>
            <p className="mt-[16px] max-w-[54ch] text-[17px] leading-[1.55] text-[#3e4440]">Enquiries from any source, live capacity, and every order from sample to final payment. Not just leads.</p>
            <div className="mt-[24px] flex flex-wrap gap-[10px]">
              <Link href="/console/maker" className="inline-flex h-[48px] items-center gap-[8px] rounded-[8px] bg-cs-green px-[22px] text-[15px] font-medium text-white hover:bg-[#8f3a18]">Try the factory portal <ArrowRight className="size-[16px]" /></Link>
              <Link href="/console/maker/capacity" className="inline-flex h-[48px] items-center rounded-[8px] border border-[#cfd2cd] bg-white px-[22px] text-[15px] font-medium hover:border-[#9aa19c]">See capacity planning</Link>
            </div>
          </div>
          <div className="grid gap-[12px] sm:grid-cols-2">
            <Link href="/console/maker/capacity" className="cs-card flex items-center gap-[16px] p-[20px] hover:border-[#cfcac0]">
              <div className="relative grid size-[92px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#a8461f 0 ${pct}%, #ece9e2 ${pct}% 100%)` }}>
                <div className="grid size-[70px] place-items-center rounded-full bg-white"><span className="serif text-[24px] font-semibold">{pct}%</span></div>
              </div>
              <div className="text-[13px]">
                <p className="serif text-[18px] font-semibold">Capacity booked</p>
                <p className="mt-[4px] text-cs-ink-2">{s.capacity.length} lines · NutraLab</p>
                <p className="mt-[2px] font-medium text-cs-green">Plan before you say yes</p>
              </div>
            </Link>
            <Link href="/console/maker/enquiries" className="cs-card p-[20px] hover:border-[#cfcac0]">
              <p className="serif text-[18px] font-semibold">Enquiry inbox</p>
              <div className="mt-[10px] grid grid-cols-2 gap-[8px]">
                <div className="rounded-[8px] bg-cs-mint px-[10px] py-[8px]"><p className="serif text-[24px] font-semibold leading-none">{toQuote}</p><p className="mt-[4px] text-[11.5px] text-cs-ink-2">Brand quotes to send</p></div>
                <div className="rounded-[8px] bg-cs-orange-bg px-[10px] py-[8px]"><p className="serif text-[24px] font-semibold leading-none">{leads}</p><p className="mt-[4px] text-[11.5px] text-cs-ink-2">New outside leads</p></div>
              </div>
            </Link>
            <div className="cs-card p-[20px] sm:col-span-2">
              <p className="serif text-[18px] font-semibold">Latest leads</p>
              <ul className="mt-[6px] divide-y divide-cs-line text-[13px]">
                {s.leads.slice(0, 4).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-[8px]">
                    <span className="min-w-0"><b className="block truncate font-medium">{l.product}</b><span className="text-[12px] text-cs-ink-2">{l.source} · {l.qty.toLocaleString("en-US")} units</span></span>
                    <span className={cn("rounded-[5px] px-[8px] py-[2px] text-[11.5px] font-medium", l.status === "Won" ? "bg-cs-ok-bg text-cs-ok" : l.status === "Lost" ? "bg-[#f1f0ec] text-cs-ink-2" : l.status === "Quoted" ? "bg-cs-blue-bg text-cs-blue" : "bg-cs-orange-bg text-[#b8641f]")}>{l.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-cs-line bg-white">
        <div className="mx-auto max-w-[1240px] px-5 py-[56px]">
          <h2 className="serif text-[40px] font-semibold tracking-[-0.02em] sm:text-[48px]">Three tools. One system.</h2>
          <div className="mt-[26px] grid gap-[14px] md:grid-cols-3">
            {MODULES.map(([n, t, d, items, Icon]) => (
              <div key={n} className="cs-card flex flex-col gap-[10px] bg-cs-ground p-[24px]">
                <div className="flex items-center justify-between"><span className="grid size-[44px] place-items-center rounded-full bg-cs-mint text-cs-green-2"><Icon className="size-[20px]" strokeWidth={1.7} /></span><span className="serif text-[28px] font-semibold text-[#d7d3c9]">{n}</span></div>
                <p className="serif text-[23px] font-semibold">{t}</p>
                <p className="text-[14.5px] leading-[1.6] text-[#3e4440]">{d}</p>
                <ul className="mt-[4px] list-disc space-y-[4px] pl-[18px] text-[14px]">{items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[900px] px-5 py-[56px] text-center">
        <h2 className="serif text-[38px] font-semibold tracking-[-0.02em]">Leads from anywhere. Managed here.</h2>
        <p className="mx-auto mt-[10px] max-w-[56ch] text-[15.5px] text-[#3e4440]">Bring in enquiries you already get. Scouthru OS works even if the lead never came from Scouthru.</p>
        <div className="mt-[18px] flex flex-wrap justify-center gap-[8px]">
          {SOURCES.map((x) => <span key={x} className="rounded-full border border-cs-line bg-white px-[14px] py-[7px] text-[13.5px] font-medium">{x}</span>)}
        </div>
        <Link href="/console/maker/enquiries?newLead=1" className="mt-[22px] inline-flex h-[44px] items-center gap-[8px] rounded-[8px] bg-cs-green px-[18px] text-[14px] font-medium text-white hover:bg-[#8f3a18]">Log a lead in the demo <ArrowRight className="size-[15px]" /></Link>
      </section>

      <section id="pricing" className="border-t border-cs-line bg-white">
        <div className="mx-auto max-w-[900px] px-5 py-[56px]">
          <h2 className="serif text-center text-[38px] font-semibold tracking-[-0.02em]">Start free. Grow when you&apos;re ready.</h2>
          <div className="mt-[26px] grid gap-[14px] md:grid-cols-2">
            <div className="cs-card flex flex-col gap-[8px] bg-cs-ground p-[24px]">
              <p className="serif text-[22px] font-semibold">Free</p>
              <p className="serif text-[42px]">₹0</p>
              <p className="text-[14px] text-[#3e4440]">Verified listing, a limited number of enquiries each month, basic capacity view.</p>
              <Link href="/console/maker" className="mt-[8px] inline-flex h-[40px] items-center self-start rounded-[8px] border border-[#cfd2cd] bg-white px-[16px] text-[13.5px] font-medium">Start free</Link>
            </div>
            <div className="flex flex-col gap-[8px] rounded-[12px] bg-cs-deep p-[24px] text-white">
              <p className="serif text-[22px] font-semibold">Pro</p>
              <p className="serif text-[42px]">₹4,999<span className="text-[16px]"> / month</span></p>
              <p className="text-[14px] text-white/80">Unlimited enquiries, large-lot leads, partner-unit overflow, full order and payment management.</p>
              <Link href="/console/maker" className="mt-[8px] inline-flex h-[40px] items-center self-start rounded-[8px] bg-white px-[16px] text-[13.5px] font-medium text-cs-green">Try Pro in the demo</Link>
            </div>
          </div>
          <p className="mt-[10px] text-center text-[12px] text-cs-ink-2">Pro price is a demo placeholder.</p>
          <p className="mt-[24px] flex items-center justify-center gap-[6px] text-[13px] text-cs-ink-2"><Leaf className="size-[15px] text-cs-green-2" />Made in Hyderabad for India&apos;s factories.</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
