"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PostRequirement, Wordmark } from "@/components/market";
import { AiAssistButton } from "@/components/ai-assist";
import { useStore, fmt } from "@/lib/store";

const PREVIEW = [
  ["Whey protein bar", "Scouthru", "5,000", "Fits", "text-ok"],
  ["Millet chips", "Phone call", "10,000", "Fits", "text-ok"],
  ["Electrolyte mix", "IndiaMART", "25,000", "Partner unit", "text-flame"],
];
const CATS = ["Protein bars", "Supplements", "Skincare", "Healthy snacks", "Beverages", "Packaging"];
const HOW = [
  ["01", "Post what you need", "Product, quantity, timeline and location. Free, no calls needed."],
  ["02", "Compare verified units", "See capability, free capacity and lead time. Lock your quote for 15 days."],
  ["03", "Approve the sample", "The approved sample is retained and becomes the standard for your batch."],
  ["04", "Track to delivery", "Milestones, photo proof, QC and payments, all in one place."],
];
const MODULES = [
  ["Enquiry management", "Every enquiry in one inbox, whether it came from Scouthru, IndiaMART, a call or a referral.", ["Import leads from any source", "Reminders for unanswered enquiries", "AI check: can you make this or not"]],
  ["Capacity management", "See exactly how much of your line is booked this quarter before you say yes.", ["Live capacity by month and quarter", "Accept only orders that fit", "Overflow to verified partner units"]],
  ["Post-order management", "From approved sample to final payment, every step tracked with proof.", ["Phased milestones and timelines", "Photo evidence at each stage", "Structured payments, automatic reminders"]],
] as const;
const TRUST = [
  ["Verified units", "Every factory visited in person. Capability, machines and licences checked."],
  ["Protected contact", "Numbers stay masked. Calls and chats run through Scouthru."],
  ["15-day quote freeze", "The price you accept is the price you pay. No surprise hikes."],
  ["Landed cost calculator", "Know your true cost per unit, packaging and freight included."],
  ["Sample equals batch", "Bulk batch checked against the approved sample by QC agents."],
  ["7-day complaint window", "Raise any issue within 7 days of QC and delivery. We resolve it."],
];
const PLANS = [
  ["Free", "₹0", "Post requirements, search the marketplace, and work on a limited number of enquiries each month."],
  ["Pro", "₹4,999 / month", "Unlimited enquiries, large-lot leads, full Scouthru OS: enquiry, capacity and order management."],
  ["Done for you", "Included in order price", "Scouthru runs your order end to end. No separate fee, one price per order."],
];

export default function Home() {
  const router = useRouter();
  const { s } = useStore();
  const [post, setPost] = useState(false);
  const [q, setQ] = useState({ what: "", qty: "", where: "" });
  const cap = s.capacity;
  const pct = Math.round((cap.booked / cap.total) * 100);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link href="/" aria-label="Scouthru home"><Wordmark className="text-[28px]" /></Link>
          <nav className="hidden gap-7 text-[15px] font-medium md:flex">
            <Link href="/marketplace" className="hover:text-flame">Marketplace</Link>
            <Link href="/os" className="hover:text-flame">Scouthru OS</Link>
            <a href="#manufacturers" className="hover:text-flame">For manufacturers</a>
            <a href="#pricing" className="hover:text-flame">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/demo" className="px-2 py-3 text-[15px] font-medium">Log in</Link>
            <button onClick={() => setPost(true)} className="rounded-lg bg-pine px-5 py-3 text-[15px] font-semibold text-white hover:bg-pine-2">Post a requirement</button>
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 pb-16 pt-14 sm:pt-20">
        <div className="flex flex-wrap items-center gap-12">
          <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-6">
            <p className="monocap text-[13px] text-flame">FMCG manufacturing · From India to the world</p>
            <h1 className="disp text-[44px] leading-[1.02] tracking-[-0.03em] sm:text-[64px]">Find makers by what they can make. Run every order in one place.</h1>
            <p className="max-w-[58ch] text-[18px] leading-relaxed text-[#3e4c46]">Scouthru connects brand owners with India&apos;s FMCG manufacturers, suppliers and distributors. See what each maker can produce and how much capacity is free, then manage the order on the same platform, from the first idea to the delivered batch. Wherever your brand sells.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/brand" className="rounded-lg bg-flame px-6 py-4 font-semibold text-white hover:bg-flame-2">I want to make a product</Link>
              <Link href="/factory" className="rounded-lg bg-pine px-6 py-4 font-semibold text-white hover:bg-pine-2">I run a factory</Link>
            </div>
            <p className="text-[14px] text-ink-2">Supply packaging or ingredients? <Link href="/supplier" className="font-semibold text-ink underline">Supplier desk</Link> · Distribute FMCG brands? <Link href="/distributor" className="font-semibold text-ink underline">Distributor desk</Link></p>
          </div>
          <Link href="/factory" className="flex flex-[1_1_420px] flex-col gap-4 rounded-[18px] border border-line-2 bg-white p-5 transition-shadow hover:shadow-[0_18px_40px_-28px_rgba(16,32,27,.45)]">
            <div className="flex items-center justify-between"><span className="disp text-[18px]">Scouthru OS</span><span className="text-[12px] text-ink-2">Live demo</span></div>
            <div className="flex items-center gap-4 rounded-[10px] bg-ground p-3.5">
              <svg width="84" height="84" viewBox="0 0 170 170" aria-label={`${pct} percent capacity booked`}>
                <circle cx="85" cy="85" r="70" fill="none" stroke="#dce0da" strokeWidth="18" />
                <circle cx="85" cy="85" r="70" fill="none" stroke="#10201b" strokeWidth="18" strokeDasharray={`${(pct / 100) * 440} 440`} strokeLinecap="round" transform="rotate(-90 85 85)" />
                <text x="85" y="98" textAnchor="middle" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 40 }} fill="#10201b">{pct}%</text>
              </svg>
              <div className="text-[14px]"><p className="font-semibold">Capacity this quarter</p><p className="text-ink-2">{fmt(cap.total - cap.booked)} units free</p></div>
            </div>
            <ul>
              {PREVIEW.map(([p, src, moq, fit, tone]) => (
                <li key={p} className="flex items-center justify-between border-b border-soft px-1 py-3 text-[14px]"><span><b className="block font-semibold">{p}</b><span className="text-[13px] text-ink-2">{src} · MOQ {moq}</span></span><span className={`text-[13px] font-semibold ${tone}`}>{fit}</span></li>
              ))}
            </ul>
            <div className="flex gap-1.5">{["bg-pine", "bg-pine", "bg-flame", "bg-line", "bg-line"].map((c, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${c}`} />)}</div>
            <span className="text-[13px] text-ink-2">Order SO-1046 · production stage · 30% payment due</span>
          </Link>
        </div>

        <form
          className="flex max-w-[960px] flex-wrap rounded-[10px] border border-line-2 bg-white p-2"
          onSubmit={(e) => { e.preventDefault(); router.push(`/manufacturers?q=${encodeURIComponent(q.what || "protein bar")}`); }}
        >
          {([["what", "What do you want made?", "Protein bar, face serum, gummies…", "flex-[2_1_260px]"], ["qty", "Quantity (MOQ)", "e.g. 2,000 units", "flex-[1_1_140px]"], ["where", "Location", "Anywhere in India", "flex-[1_1_140px]"]] as const).map(([k, l, ph, w], i) => (
            <label key={k} className={`flex flex-col gap-1 px-4 py-2.5 ${w} ${i < 2 ? "sm:border-r sm:border-soft" : ""}`}>
              <span className="text-[12px] font-semibold text-ink-2">{l}</span>
              <input value={q[k]} onChange={(e) => setQ({ ...q, [k]: e.target.value })} placeholder={ph} className="bg-transparent py-0.5 text-[16px] outline-none" />
            </label>
          ))}
          <button className="min-h-14 w-full rounded-lg bg-flame px-7 text-[16px] font-semibold text-white hover:bg-flame-2 sm:w-auto">Search factories</button>
          <AiAssistButton full seed={[q.qty, q.what, q.where].filter(Boolean).join(" ")} className="mt-2 h-auto min-h-14 w-full justify-center px-5 text-[15px] sm:ml-2 sm:mt-0 sm:w-auto" />
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="mr-1.5 text-[14px] text-ink-2">Popular:</span>
          {CATS.map((c) => <Link key={c} href={`/manufacturers?q=${encodeURIComponent(c)}`} className="rounded-full border border-line-2 bg-white px-4 py-2.5 text-[14px] font-medium hover:border-ink">{c}</Link>)}
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 md:grid-cols-3">
          {[["01 · Scouthru Connect", "Find who can actually make it", "Search by capability, format, MOQ, certification and location. Every unit is visited and verified. Contact details stay protected until both sides are serious.", "/manufacturers"],
            ["02 · Scouthru OS", "Manage everything after the lead", "Enquiries from any source, your capacity, and every order from sample to final payment. Works even for leads that never came from Scouthru.", "/os"],
            ["03 · Scouthru Assured", "Or let Scouthru run it", "One price, one point of contact. Our team handles production, packaging, QC, permissions, storage and dispatch. You approve the sample, the pack and the batch.", "/marketplace"]].map(([k, t, b, href]) => (
            <Link key={k} href={href} className="group flex flex-col gap-3.5">
              <span className="monocap text-[13px] text-ink-2">{k}</span>
              <h3 className="disp text-[28px] group-hover:text-flame">{t}</h3>
              <p className="text-[16px] leading-relaxed text-[#3e4c46]">{b}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto flex max-w-[1240px] flex-col gap-10 px-5 pt-20">
        <h2 className="disp text-[38px] leading-[1.05] sm:text-[52px]">From idea to delivered batch</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map(([n, t, b]) => <div key={n} className="card flex flex-col gap-3 p-6"><span className="num text-[28px] text-flame">{n}</span><span className="disp text-[21px]">{t}</span><span className="text-[15px] leading-relaxed text-[#3e4c46]">{b}</span></div>)}
        </div>
      </section>

      <section className="mx-auto flex max-w-[1240px] flex-col gap-12 px-5 py-20">
        <div className="max-w-[760px]"><p className="monocap text-[13px] text-flame">Scouthru OS</p><h2 className="disp mt-4 text-[38px] leading-[1.05] sm:text-[52px]">Not just leads. Your whole order book.</h2></div>
        <div className="grid gap-5 md:grid-cols-3">
          {MODULES.map(([t, b, pts]) => (
            <div key={t} className="card flex flex-col gap-4 p-8"><p className="disp text-[24px]">{t}</p><p className="text-[16px] leading-relaxed text-[#3e4c46]">{b}</p><ul className="flex list-disc flex-col gap-2 pl-5 text-[15px]">{pts.map((p) => <li key={p}>{p}</li>)}</ul></div>
          ))}
        </div>
        <Link href="/factory" className="self-start rounded-lg border-[1.5px] border-ink px-5 py-3.5 text-[16px] font-semibold hover:bg-white">See the dashboard</Link>
      </section>

      <section className="bg-pine text-ground">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-12 px-5 py-20">
          <h2 className="disp max-w-[760px] text-[38px] leading-[1.05] sm:text-[52px]">Trust built into every order</h2>
          <div className="grid gap-px border border-pine-2 bg-pine-2 sm:grid-cols-2 lg:grid-cols-3">
            {TRUST.map(([t, b]) => <div key={t} className="flex flex-col gap-2.5 bg-pine p-7"><p className="disp text-[21px] text-white">{t}</p><p className="text-[15px] leading-relaxed text-[#c5cec9]">{b}</p></div>)}
          </div>
        </div>
      </section>

      <section id="manufacturers" className="mx-auto grid max-w-[1240px] scroll-mt-4 gap-6 px-5 py-20 md:grid-cols-2">
        <div className="card flex flex-col gap-4 p-10">
          <p className="monocap text-[13px] text-ink-2">For manufacturers</p>
          <h3 className="disp text-[34px] leading-[1.15]">Fill your capacity. Stop chasing payments.</h3>
          <p className="text-[16px] leading-relaxed text-[#3e4c46]">Verified buyers matched to what you can make. Orders bigger than your capacity are shared with partner units, so you never turn a deal away.</p>
          <Link href="/factory" className="self-start rounded-lg bg-pine px-5 py-3.5 font-semibold text-white">List your factory free</Link>
        </div>
        <div className="card flex flex-col gap-4 p-10">
          <p className="monocap text-[13px] text-ink-2">For brands</p>
          <h3 className="disp text-[34px] leading-[1.15]">Launch without becoming a vendor manager.</h3>
          <p className="text-[16px] leading-relaxed text-[#3e4c46]">Compare verified factories, lock your quote, and track every batch. You own your formula and artwork, always.</p>
          <button onClick={() => setPost(true)} className="self-start rounded-lg bg-flame px-5 py-3.5 font-semibold text-white">Post a requirement free</button>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-4 border-t border-line bg-white">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-10 px-5 py-20">
          <h2 className="disp text-[38px] sm:text-[52px]">Simple plans</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {PLANS.map(([n, p, b]) => <div key={n} className="flex flex-col gap-3.5 rounded-[14px] border border-line-2 bg-ground p-8"><p className="disp text-[24px]">{n}</p><p className="num text-[21px]">{p}</p><p className="text-[15px] leading-relaxed text-[#3e4c46]">{b}</p></div>)}
          </div>
          <p className="text-[12px] text-ink-3">Pro price is a demo placeholder.</p>
        </div>
      </section>

      <footer className="bg-pine text-[#c5cec9]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-6 px-5 py-12 text-[14px]">
          <div className="flex flex-col gap-2"><Wordmark light /><p className="text-[14px] text-white/80">From idea to delivery, Scouthru&apos;s got you.</p></div>
          <nav className="flex flex-wrap gap-5"><Link href="/marketplace">Marketplace</Link><Link href="/os">Scouthru OS</Link><Link href="/demo">Working demo</Link><span>Hyderabad, India</span></nav>
        </div>
      </footer>

      <PostRequirement open={post} onClose={() => setPost(false)} />
    </div>
  );
}
