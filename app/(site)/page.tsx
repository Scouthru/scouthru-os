"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight, BadgeCheck, Boxes, Factory, FileText, FlaskConical, Leaf, Lock, PackageOpen, Phone, ReceiptIndianRupee, Search, ShieldCheck, Sparkles, Store, Truck, Warehouse,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/console/site";
import { PostRequirement } from "@/components/console/market";
import { useConsole } from "@/lib/console/store";
import { cn } from "@/lib/cn";

const CATS = ["Protein bars", "Supplements", "Skincare", "Healthy snacks", "Beverages", "Packaging"];

const PRODUCTS: [string, string, string, string, typeof Search][] = [
  ["01 · Scouthru Connect", "Find who can actually make it", "Search by capability, format, MOQ, certification and location. Every unit is visited and verified. Contact details stay protected until both sides are serious.", "/manufacturers", Search],
  ["02 · Scouthru OS", "Manage everything after the lead", "Enquiries, samples, production, quality, dispatch and payments in one place, for brands, factories, suppliers and distributors alike.", "/os", Boxes],
  ["03 · Scouthru Assured", "Or let Scouthru run it", "One price, one point of contact. Our team handles production, packaging, QC, permissions, storage and dispatch. You approve the sample, the pack and the batch.", "/marketplace", ShieldCheck],
];

const HOW: [string, string, string, typeof FileText][] = [
  ["01", "Post what you need", "Product, quantity, timeline and location. Free, no calls needed.", FileText],
  ["02", "Compare verified units", "See capability, free capacity and lead time. Lock your quote for 15 days.", Factory],
  ["03", "Approve the sample", "The approved sample is retained and becomes the standard for your batch.", FlaskConical],
  ["04", "Track to delivery", "Milestones, photo proof, QC and payments, all in one place.", Truck],
];

const PORTALS: [string, string, string, string, typeof Store][] = [
  ["Brands", "Post enquiries, compare quotes, approve samples, track every batch and pay by milestone.", "/console", "Open brand console", Store],
  ["Manufacturers", "Quote enquiries from any source, plan capacity, run batches and get paid on proof.", "/console/maker", "Open factory portal", Factory],
  ["Suppliers", "Answer RFQs for packaging and ingredients, ship POs and keep stock and prices current.", "/console/supplier", "Open supplier portal", PackageOpen],
  ["Distributors", "Count inbound stock, run retailer orders and routes, and collect payments.", "/console/distributor", "Open distributor portal", Warehouse],
];

const TRUST: [string, string, typeof BadgeCheck][] = [
  ["Verified units", "Every factory visited in person. Capability, machines and licences checked.", BadgeCheck],
  ["Protected contact", "Numbers stay masked. Calls and chats run through Scouthru.", Phone],
  ["15-day quote freeze", "The price you accept is the price you pay. No surprise hikes.", Lock],
  ["Landed cost calculator", "Know your true cost per unit, packaging and freight included.", ReceiptIndianRupee],
  ["Sample equals batch", "Bulk batch checked against the approved sample by QC agents.", FlaskConical],
  ["7-day complaint window", "Raise any issue within 7 days of QC and delivery. We resolve it.", ShieldCheck],
];

const PLANS: [string, string, string, boolean][] = [
  ["Free", "₹0", "Post requirements, search the marketplace, and work on a limited number of enquiries each month.", false],
  ["Pro", "₹4,999 / month", "Unlimited enquiries, large-lot leads, and the full Scouthru OS: enquiries, capacity, orders and payments.", true],
  ["Done for you", "Included in order price", "Scouthru runs your order end to end. No separate fee, one price per order.", false],
];

export default function Home() {
  const router = useRouter();
  const { s } = useConsole();
  const [post, setPost] = useState(false);
  const [q, setQ] = useState({ what: "", qty: "", where: "" });

  // Live preview from the demo workspace.
  const open = s.enquiries.filter((e) => e.stage !== "Closed").length;
  const inReview = s.samples.filter((x) => ["Submitted", "In Review", "Testing", "Feedback"].includes(x.status)).length;
  const running = s.orders.filter((o) => o.batches.some((b) => b.status !== "Completed")).length;
  const transit = s.shipments.filter((x) => x.status === "In Transit").length;
  const order = s.orders.find((o) => o.id === "ORD-2026-0042") ?? s.orders[0];
  const done = order ? order.batches.reduce((a, b) => a + b.completed, 0) : 0;
  const pct = order ? Math.round((done / order.qty) * 100) : 0;

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      {/* hero */}
      <section className="mx-auto max-w-[1240px] px-5 pb-[56px] pt-[48px] sm:pt-[64px]">
        <div className="grid items-center gap-[40px] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div>
            <p className="text-[11.5px] font-semibold tracking-[0.2em] text-cs-green-2">FMCG MANUFACTURING · FROM INDIA TO THE WORLD</p>
            <h1 className="serif mt-[16px] text-[46px] font-semibold leading-[1.02] tracking-[-0.025em] text-[#151816] sm:text-[62px]">Find makers by what they can make. Run every order in one place.</h1>
            <p className="mt-[18px] max-w-[58ch] text-[17px] leading-[1.55] text-[#3e4440]">Scouthru connects brand owners with India&apos;s FMCG manufacturers, suppliers and distributors. See what each maker can produce and how much capacity is free, then manage the order on the same platform, from the first idea to the delivered batch.</p>
            <div className="mt-[24px] flex flex-wrap gap-[10px]">
              <Link href="/console" className="inline-flex h-[48px] items-center gap-[8px] rounded-[8px] bg-cs-green px-[22px] text-[15px] font-medium text-white hover:bg-[#8f3a18]">I want to make a product <ArrowRight className="size-[16px]" /></Link>
              <Link href="/console/maker" className="inline-flex h-[48px] items-center gap-[8px] rounded-[8px] border border-[#cfd2cd] bg-white px-[22px] text-[15px] font-medium hover:border-[#9aa19c]">I run a factory</Link>
            </div>
            <p className="mt-[14px] text-[13.5px] text-cs-ink-2">Supply packaging or ingredients? <Link href="/console/supplier" className="font-medium text-cs-green hover:underline">Supplier portal</Link> · Distribute FMCG brands? <Link href="/console/distributor" className="font-medium text-cs-green hover:underline">Distributor portal</Link></p>
          </div>

          {/* live preview of the console */}
          <Link href="/console" className="group relative overflow-hidden rounded-[16px] border border-cs-line bg-white shadow-[0_24px_60px_-40px_rgba(16,32,27,.5)] transition-shadow hover:shadow-[0_28px_70px_-36px_rgba(16,32,27,.55)]">
            <div className="relative h-[150px] overflow-hidden bg-[#f7f2ea]">
              <img src="/console/hero-dashboard-clean.jpg" alt="" className="absolute right-0 top-0 h-full w-[78%] object-cover object-right" />
              <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-[#f7f2ea] via-[#f7f2ea]/85 to-transparent" />
              <div className="relative px-[18px] pt-[18px]">
                <p className="text-[10.5px] font-semibold tracking-[0.2em] text-[#2b302d]">SCOUTHRU OS · LIVE DEMO</p>
                <p className="serif mt-[6px] text-[26px] font-semibold leading-tight">{s.workspace}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 border-y border-cs-line">
              {[[open, "Open enquiries"], [inReview, "Samples in review"], [running, "In production"], [transit, "In transit"]].map(([v, l], i) => (
                <div key={l as string} className={cn("px-[12px] py-[12px]", i > 0 && "border-l border-cs-line")}>
                  <p className="serif text-[24px] font-semibold leading-none">{v}</p>
                  <p className="mt-[5px] text-[11.5px] leading-tight text-cs-ink-2">{l}</p>
                </div>
              ))}
            </div>
            {order && (
              <div className="px-[18px] py-[14px]">
                <div className="flex items-center justify-between text-[13px]"><span className="font-medium">{order.name}</span><span className="text-cs-ink-2">{order.id}</span></div>
                <div className="mt-[8px] h-[7px] overflow-hidden rounded-full bg-[#ece9e2]"><div className="h-full rounded-full bg-cs-green" style={{ width: `${pct}%` }} /></div>
                <p className="mt-[6px] text-[12px] text-cs-ink-2">{pct}% produced · {order.batches.filter((b) => b.status === "Completed").length} of {order.batches.length} batches done</p>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-cs-line bg-cs-cream/50 px-[18px] py-[11px] text-[13px] font-medium text-cs-green">Open the console <ArrowRight className="size-[15px] transition-transform group-hover:translate-x-[3px]" /></div>
          </Link>
        </div>

        {/* search */}
        <form
          className="mt-[34px] flex max-w-[980px] flex-wrap rounded-[12px] border border-cs-line bg-white p-[6px] shadow-[0_10px_30px_-24px_rgba(16,32,27,.5)]"
          onSubmit={(e) => { e.preventDefault(); router.push(`/manufacturers?q=${encodeURIComponent(q.what || "protein bar")}`); }}
        >
          {([["what", "What do you want made?", "Protein bar, face serum, gummies…", "flex-[2_1_260px]"], ["qty", "Quantity (MOQ)", "e.g. 2,000 units", "flex-[1_1_140px]"], ["where", "Location", "Anywhere in India", "flex-[1_1_140px]"]] as const).map(([k, l, ph, w], i) => (
            <label key={k} className={cn("flex flex-col gap-[3px] px-[14px] py-[8px]", w, i < 2 && "sm:border-r sm:border-cs-line")}>
              <span className="text-[11.5px] font-semibold text-cs-ink-2">{l}</span>
              <input value={q[k]} onChange={(e) => setQ({ ...q, [k]: e.target.value })} placeholder={ph} className="bg-transparent py-[2px] text-[15px] outline-none placeholder:text-[#8a908c]" />
            </label>
          ))}
          <button className="inline-flex min-h-[54px] w-full items-center justify-center gap-[8px] rounded-[8px] bg-cs-green px-[24px] text-[15px] font-medium text-white hover:bg-[#8f3a18] sm:w-auto"><Search className="size-[17px]" />Search factories</button>
        </form>
        <div className="mt-[16px] flex flex-wrap items-center gap-[8px]">
          <button type="button" onClick={() => setPost(true)} className="mr-[10px] inline-flex h-[36px] items-center gap-[7px] rounded-full border border-cs-green-2/40 bg-cs-mint px-[14px] text-[13.5px] font-medium text-cs-green hover:border-cs-green"><Sparkles className="size-[15px]" />Describe it to AI assist</button>
          <span className="mr-[4px] text-[13.5px] text-cs-ink-2">Popular:</span>
          {CATS.map((c) => <Link key={c} href={`/manufacturers?q=${encodeURIComponent(c)}`} className="rounded-full border border-cs-line bg-white px-[14px] py-[7px] text-[13.5px] hover:border-[#9aa19c]">{c}</Link>)}
        </div>
      </section>

      {/* three products */}
      <section className="border-y border-cs-line bg-white">
        <div className="mx-auto grid max-w-[1240px] gap-[36px] px-5 py-[56px] md:grid-cols-3">
          {PRODUCTS.map(([k, t, b, href, Icon]) => (
            <Link key={k} href={href} className="group flex flex-col gap-[12px]">
              <span className="grid size-[46px] place-items-center rounded-full bg-cs-mint text-cs-green-2"><Icon className="size-[22px]" strokeWidth={1.7} /></span>
              <span className="text-[11.5px] font-semibold tracking-[0.16em] text-cs-ink-2">{k.toUpperCase()}</span>
              <h3 className="serif text-[28px] font-semibold leading-tight group-hover:text-cs-green">{t}</h3>
              <p className="text-[15px] leading-[1.6] text-[#3e4440]">{b}</p>
              <span className="mt-auto inline-flex items-center gap-[6px] text-[13.5px] font-medium text-cs-green">Learn more <ArrowRight className="size-[14px]" /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* how */}
      <section className="mx-auto max-w-[1240px] px-5 pt-[64px]">
        <h2 className="serif text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[50px]">From idea to delivered batch</h2>
        <div className="relative mt-[28px] grid gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map(([n, t, b, Icon]) => (
            <div key={n} className="cs-card flex flex-col gap-[10px] p-[22px]">
              <div className="flex items-center justify-between"><span className="grid size-[44px] place-items-center rounded-full bg-cs-mint text-cs-green-2"><Icon className="size-[20px]" strokeWidth={1.7} /></span><span className="serif text-[30px] font-semibold text-[#d7d3c9]">{n}</span></div>
              <span className="serif text-[22px] font-semibold">{t}</span>
              <span className="text-[14.5px] leading-[1.6] text-[#3e4440]">{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* portals */}
      <section className="mx-auto max-w-[1240px] px-5 py-[64px]">
        <div className="max-w-[760px]">
          <p className="text-[11.5px] font-semibold tracking-[0.2em] text-cs-green-2">SCOUTHRU OS</p>
          <h2 className="serif mt-[12px] text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[50px]">One system. A portal for everyone in the chain.</h2>
          <p className="mt-[12px] text-[16px] leading-[1.6] text-[#3e4440]">The same order moves between brand, factory, supplier and distributor, so everyone works from one version of the truth.</p>
        </div>
        <div className="mt-[28px] grid gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
          {PORTALS.map(([t, b, href, cta, Icon]) => (
            <Link key={t} href={href} className="cs-card group flex flex-col gap-[10px] p-[22px] hover:border-[#cfcac0]">
              <span className="grid size-[46px] place-items-center rounded-full bg-cs-mint text-cs-green-2"><Icon className="size-[22px]" strokeWidth={1.7} /></span>
              <span className="serif text-[24px] font-semibold">{t}</span>
              <span className="text-[14.5px] leading-[1.6] text-[#3e4440]">{b}</span>
              <span className="mt-auto inline-flex items-center gap-[6px] pt-[6px] text-[13.5px] font-medium text-cs-green">{cta} <ArrowRight className="size-[14px] transition-transform group-hover:translate-x-[3px]" /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* trust */}
      <section className="bg-cs-deep text-white">
        <div className="mx-auto max-w-[1240px] px-5 py-[64px]">
          <h2 className="serif max-w-[760px] text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[50px]">Trust built into every order</h2>
          <div className="mt-[28px] grid gap-px overflow-hidden rounded-[12px] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {TRUST.map(([t, b, Icon]) => (
              <div key={t} className="flex flex-col gap-[10px] bg-cs-deep p-[24px]">
                <Icon className="size-[22px] text-[#f2c4ad]" strokeWidth={1.6} />
                <p className="serif text-[22px] font-semibold">{t}</p>
                <p className="text-[14.5px] leading-[1.6] text-white/75">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* two audiences */}
      <section id="manufacturers" className="mx-auto grid max-w-[1240px] scroll-mt-[80px] gap-[14px] px-5 py-[64px] md:grid-cols-2">
        <div className="cs-card flex flex-col gap-[12px] p-[32px]">
          <p className="text-[11.5px] font-semibold tracking-[0.18em] text-cs-ink-2">FOR MANUFACTURERS</p>
          <h3 className="serif text-[34px] font-semibold leading-[1.12]">Fill your capacity. Stop chasing payments.</h3>
          <p className="text-[15px] leading-[1.6] text-[#3e4440]">Verified buyers matched to what you can make. Orders bigger than your capacity are shared with partner units, so you never turn a deal away.</p>
          <Link href="/console/maker" className="mt-[6px] inline-flex h-[44px] items-center gap-[8px] self-start rounded-[8px] bg-cs-green px-[18px] text-[14px] font-medium text-white hover:bg-[#8f3a18]">Open the factory portal <ArrowRight className="size-[15px]" /></Link>
        </div>
        <div className="flex flex-col gap-[12px] rounded-[12px] border border-[#e6dccb] bg-cs-cream p-[32px]">
          <p className="text-[11.5px] font-semibold tracking-[0.18em] text-cs-ink-2">FOR BRANDS</p>
          <h3 className="serif text-[34px] font-semibold leading-[1.12]">Launch without becoming a vendor manager.</h3>
          <p className="text-[15px] leading-[1.6] text-[#3e4440]">Compare verified factories, lock your quote, and track every batch. You own your formula and artwork, always.</p>
          <button type="button" onClick={() => setPost(true)} className="mt-[6px] inline-flex h-[44px] items-center gap-[8px] self-start rounded-[8px] bg-cs-green px-[18px] text-[14px] font-medium text-white hover:bg-[#8f3a18]">Post a requirement free <ArrowRight className="size-[15px]" /></button>
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="scroll-mt-[80px] border-t border-cs-line bg-white">
        <div className="mx-auto max-w-[1240px] px-5 py-[64px]">
          <h2 className="serif text-[40px] font-semibold tracking-[-0.02em] sm:text-[50px]">Simple plans</h2>
          <div className="mt-[28px] grid gap-[14px] md:grid-cols-3">
            {PLANS.map(([n, p, b, hi]) => (
              <div key={n} className={cn("flex flex-col gap-[10px] rounded-[12px] p-[26px]", hi ? "bg-cs-deep text-white" : "border border-cs-line bg-cs-ground")}>
                <p className="serif text-[24px] font-semibold">{n}</p>
                <p className="serif text-[26px]">{p}</p>
                <p className={cn("text-[14.5px] leading-[1.6]", hi ? "text-white/80" : "text-[#3e4440]")}>{b}</p>
              </div>
            ))}
          </div>
          <p className="mt-[12px] text-[12px] text-cs-ink-2">Pro price is a demo placeholder.</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 pb-[64px]">
        <div className="relative overflow-hidden rounded-[16px] bg-[#f7f2ea] p-[30px] sm:p-[40px]">
          <img src="/console/hero-products.jpg" alt="" className="absolute right-0 top-0 hidden h-full w-[48%] object-cover object-left md:block" />
          <div className="absolute inset-y-0 left-[46%] hidden w-[160px] bg-gradient-to-r from-[#f7f2ea] to-transparent md:block" />
          <div className="relative max-w-[520px]">
            <Leaf className="size-[26px] text-cs-green-2" strokeWidth={1.4} />
            <h2 className="serif mt-[10px] text-[38px] font-semibold leading-[1.05] tracking-[-0.02em]">See it working, end to end.</h2>
            <p className="mt-[10px] text-[15.5px] leading-[1.6] text-[#3e4440]">Open the demo and move one order from enquiry to delivered batch, as the brand, the factory, the supplier and the distributor.</p>
            <div className="mt-[18px] flex flex-wrap gap-[10px]">
              <Link href="/demo" className="inline-flex h-[46px] items-center gap-[8px] rounded-[8px] bg-cs-green px-[20px] text-[14.5px] font-medium text-white hover:bg-[#8f3a18]">Choose a portal <ArrowRight className="size-[15px]" /></Link>
              <Link href="/marketplace" className="inline-flex h-[46px] items-center rounded-[8px] border border-[#cfd2cd] bg-white px-[20px] text-[14.5px] font-medium hover:border-[#9aa19c]">Browse the marketplace</Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
      {post && <PostRequirement open onClose={() => setPost(false)} assist />}
    </div>
  );
}
