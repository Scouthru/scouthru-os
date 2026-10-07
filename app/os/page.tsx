import Link from "next/link";
import { Wordmark } from "@/components/market";

export const metadata = { title: "Scouthru OS for FMCG manufacturers" };

const INBOX = [
  ["Whey protein bar", "Scouthru · MOQ 5,000", "Fits", "text-ok"],
  ["Millet chips", "Phone call · MOQ 10,000", "Fits", "text-ok"],
  ["Electrolyte mix", "IndiaMART · MOQ 30,000", "Partner unit", "text-flame"],
  ["Vitamin C serum", "WhatsApp · MOQ 2,000", "Not your line", "text-ink-2"],
];

export default function OSLanding() {
  return (
    <div className="min-h-dvh bg-pine text-white">
      <header className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-5 py-4">
        <Link href="/os" className="flex items-baseline gap-1.5"><Wordmark light className="text-[21px]" /><span className="text-[12px] font-semibold text-apricot">OS</span></Link>
        <nav className="hidden gap-6 text-[13px] text-white/80 md:flex">
          <a href="#features">Features</a><a href="#integrations">Integrations</a><a href="#pricing">Pricing</a><Link href="/marketplace">Marketplace</Link>
        </nav>
        <div className="flex items-center gap-3 text-[13px]">
          <Link href="/demo" className="text-white/85">Sign in</Link>
          <Link href="/factory" className="rounded-lg bg-apricot px-3.5 py-2 font-semibold text-pine">Start free</Link>
        </div>
      </header>

      <section className="mx-auto max-w-[900px] px-5 pt-12 text-center">
        <p className="monocap text-apricot">For FMCG manufacturers</p>
        <h1 className="disp mt-4 text-[44px] leading-[1.03] sm:text-[60px]">Run your factory&apos;s orders in one place.</h1>
        <p className="mx-auto mt-5 max-w-[56ch] text-[16px] text-white/75">Enquiries from any source, live capacity, and every order from sample to final payment. Not just leads.</p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/factory" className="rounded-lg bg-apricot px-5 py-3 text-[14px] font-semibold text-pine">Try the demo</Link>
          <Link href="/factory" className="rounded-lg border border-white/35 px-5 py-3 text-[14px] font-semibold">See the dashboard</Link>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-[880px] px-5">
        <div className="grid gap-3 rounded-[14px] bg-[#f4f3f0] p-3 text-ink sm:grid-cols-2">
          <div className="card flex items-center gap-5 p-5">
            <div className="relative grid size-24 shrink-0 place-items-center rounded-full" style={{ background: "conic-gradient(#10201a 0 75%, #e7e4de 75% 100%)" }}>
              <div className="grid size-[74px] place-items-center rounded-full bg-white"><span className="disp text-[24px]">75%</span></div>
            </div>
            <div className="text-[13px]">
              <p className="disp text-[16px]">Capacity · Q3</p>
              <p className="mt-2">75,000 of 1,00,000 units</p>
              <p className="text-ink-2">25,000 free</p>
              <p className="font-semibold text-ink hover:text-flame">1 order needs a partner unit</p>
            </div>
          </div>
          <div className="card p-6">
            <p className="disp text-[16px]">Enquiry inbox</p>
            <ul className="mt-2 divide-y divide-line text-[13px]">
              {INBOX.map(([a, b, c, t]) => (
                <li key={a} className="flex items-center justify-between py-2"><span><b className="block">{a}</b><span className="text-[12px] text-ink-2">{b}</span></span><span className={`text-[12px] font-semibold ${t}`}>{c}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto mt-20 max-w-[1100px] px-5">
        <h2 className="disp text-center text-[34px]">Three tools. One system.</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ["01", "Enquiry management", "Every enquiry in one inbox, checked against what you can actually make.", ["Import from any source", "Reminders for unanswered enquiries", "Masked numbers, protected chats"]],
            ["02", "Capacity management", "Know your load before you say yes.", ["Live capacity by month and quarter", "Accept only what fits", "Overflow to verified partner units"]],
            ["03", "Post-order management", "Sample to final payment, tracked with proof.", ["Phased milestones and timelines", "Photo evidence at each stage", "Structured payments with auto reminders"]],
          ].map(([n, t, d, items]) => (
            <div key={n as string} className="rounded-[14px] border border-white/10 bg-pine-2 p-6">
              <p className="num text-[12px] text-apricot">{n as string}</p>
              <p className="disp mt-3 text-[21px]">{t as string}</p>
              <p className="mt-2 text-[14px] text-white/75">{d as string}</p>
              <ul className="mt-5 flex list-disc flex-col gap-1.5 pl-5 text-[14px] text-white/85">{(items as string[]).map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section id="integrations" className="mx-auto mt-20 max-w-[900px] px-5 text-center">
        <h2 className="disp text-[34px]">Leads from anywhere. Managed here.</h2>
        <p className="mx-auto mt-3 max-w-[56ch] text-[15px] text-white/75">Import enquiries you already get. Scouthru OS works even if the lead never came from Scouthru.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {["Scouthru marketplace", "IndiaMART", "WhatsApp", "Phone calls", "Email", "Referrals"].map((x) => <span key={x} className="rounded-full border border-white/25 px-4 py-2 text-[13px] font-semibold">{x}</span>)}
        </div>
      </section>

      <section id="pricing" className="mx-auto mt-20 max-w-[900px] px-5 pb-20">
        <h2 className="disp text-center text-[34px]">Start free. Grow when you&apos;re ready.</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-[14px] border border-white/15 p-6">
            <p className="disp text-[21px]">Free</p>
            <p className="disp mt-2 text-[44px]">₹0</p>
            <p className="mt-2 text-[14px] text-white/75">Verified listing, a limited number of enquiries each month, basic capacity view.</p>
            <Link href="/factory" className="mt-5 inline-block rounded-lg border border-white/35 px-4 py-2.5 text-[14px] font-semibold">Start free</Link>
          </div>
          <div className="rounded-[14px] bg-apricot p-6 text-pine">
            <p className="disp text-[21px]">Pro</p>
            <p className="disp mt-2 text-[44px]">₹4,999<span className="text-[16px]"> / month</span></p>
            <p className="mt-2 text-[14px]">Unlimited enquiries, large-lot leads, partner-unit overflow, full order and payment management.</p>
            <Link href="/factory" className="mt-5 inline-block rounded-lg bg-pine px-4 py-2.5 text-[14px] font-semibold text-white">Try Pro in the demo</Link>
          </div>
        </div>
        <p className="mt-3 text-center text-[12px] text-white/50">Pro price is a demo placeholder.</p>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[13px] text-white/70">
          <span>scouthru OS · Hyderabad, India</span>
          <Link href="/marketplace">Back to marketplace</Link>
        </div>
      </footer>
    </div>
  );
}
