"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ChevronDown, LayoutDashboard, Search, Sparkles } from "lucide-react";
import { Btn, Field, Modal, Toasts, inputCls, textareaCls } from "./kit";
import { useConsole } from "@/lib/console/store";
import { postMarketRequirement } from "@/lib/console/actions-market";
import { parseRequirement } from "@/lib/parse";
import { CATEGORIES, CATEGORY_SUBS } from "@/lib/seed";
import { cn } from "@/lib/cn";

const NAV: { label: string; href: string; cat?: string }[] = [
  ...CATEGORIES.map((c) => ({ label: c.label === "Healthy snacks" ? "Snacks" : c.label, href: `/marketplace?c=${c.id}#ready`, cat: c.id })),
  { label: "Ingredients", href: "/marketplace#ingredients" },
  { label: "Manufacturers", href: "/manufacturers" },
];

export function MarketLogo() {
  return (
    <span className="flex items-baseline gap-[6px]">
      <span className="serif text-[27px] font-semibold leading-none tracking-[-0.02em] text-cs-green">Scouthru</span>
      <span className="text-[11px] font-semibold tracking-[0.16em] text-cs-ink-2">MARKETPLACE</span>
    </span>
  );
}

/** Marketplace header: search, post requirement, way into Scouthru OS, category menu. */
export function MarketHeader({ compact, query = "" }: { compact?: boolean; query?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(query);
  const [post, setPost] = useState<null | { assist: boolean }>(null);
  return (
    <>
      {!compact && (
        <div className="bg-cs-green text-white">
          <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-[7px] text-[12px] sm:px-6">
            <span>FMCG makers in India, matched by capability<span className="hidden sm:inline"> · Brands from anywhere · Free for brands</span></span>
            <Link href="/os" className="hidden font-medium text-white/90 hover:text-white sm:inline">For factories: Scouthru OS →</Link>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-cs-line bg-cs-ground/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-3 gap-y-[10px] px-4 py-[12px] sm:flex-nowrap sm:gap-x-5 sm:px-6">
          <Link href="/marketplace" aria-label="Scouthru marketplace home"><MarketLogo /></Link>
          <form
            className="order-last flex h-[42px] w-full min-w-0 items-center gap-[10px] rounded-[9px] border border-cs-line bg-white pl-[13px] pr-[4px] focus-within:border-cs-green-2/60 sm:order-none sm:w-auto sm:flex-1"
            onSubmit={(e) => { e.preventDefault(); router.push(`/manufacturers?q=${encodeURIComponent(q)}`); }}
          >
            <Search className="size-[17px] shrink-0 text-cs-ink-2" strokeWidth={1.7} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, manufacturers, packaging" className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-[#6f7571]" aria-label="Search the marketplace" />
            <button className="hidden h-[34px] rounded-[7px] bg-cs-green px-[14px] text-[12.5px] font-medium text-white hover:bg-[#163b29] sm:block">Search</button>
          </form>
          <button type="button" onClick={() => setPost({ assist: true })} className="ml-auto flex h-[42px] shrink-0 items-center gap-[7px] rounded-[9px] border border-cs-line bg-white px-[12px] text-[13px] font-medium text-cs-green hover:border-cs-green-2/60 sm:ml-0" aria-label="AI assist: write my requirement">
            <Sparkles className="size-[16px]" strokeWidth={1.7} /><span className="hidden sm:inline">AI assist</span>
          </button>
          <span className="hidden shrink-0 lg:block"><Btn kind="primary" onClick={() => setPost({ assist: false })} className="h-[42px]">Post requirement</Btn></span>
          <Link href="/console" className="hidden h-[42px] shrink-0 items-center gap-[8px] rounded-[9px] border border-cs-line bg-white px-[12px] text-[13px] font-medium hover:border-[#cfcac0] md:flex">
            <LayoutDashboard className="size-[16px]" strokeWidth={1.7} />Scouthru OS
          </Link>
        </div>
        {!compact && (
          <nav className="mx-auto flex max-w-[1240px] gap-[2px] overflow-x-auto px-3 pb-[8px] text-[13.5px] sm:px-5 lg:overflow-visible" aria-label="Categories">
            {NAV.map((n) => (
              <div key={n.label} className="group/nav relative">
                <Link href={n.href} className="flex items-center gap-[4px] whitespace-nowrap rounded-[7px] px-[10px] py-[6px] text-[#2f3431] hover:bg-cs-cream group-hover/nav:bg-cs-cream">
                  {n.label}
                  {n.cat && <ChevronDown className="hidden size-[13px] text-cs-ink-2 transition-transform group-hover/nav:rotate-180 lg:block" />}
                </Link>
                {n.cat && (
                  <div className="invisible absolute left-0 top-full z-40 hidden min-w-[220px] pt-[6px] opacity-0 transition-opacity duration-150 group-focus-within/nav:visible group-focus-within/nav:opacity-100 group-hover/nav:visible group-hover/nav:opacity-100 lg:block">
                    <ul className="rounded-[10px] border border-cs-line bg-white p-[5px] shadow-[0_12px_32px_rgba(20,30,25,0.12)]" role="menu" aria-label={`${n.label} subcategories`}>
                      <li><Link role="menuitem" href={n.href} className="block rounded-[6px] px-[11px] py-[7px] text-[12.5px] font-semibold hover:bg-[#f5f3ee]">All {n.label.toLowerCase()}</Link></li>
                      {CATEGORY_SUBS[n.cat].map((x) => (
                        <li key={x.label}><Link role="menuitem" href={`/marketplace?c=${n.cat}&s=${encodeURIComponent(x.label)}#ready`} className="block rounded-[6px] px-[11px] py-[7px] text-[12.5px] hover:bg-[#f5f3ee]">{x.label}</Link></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </nav>
        )}
      </header>
      {post && <PostRequirement open onClose={() => setPost(null)} assist={post.assist} />}
      <MarketToasts />
    </>
  );
}

function MarketToasts() {
  const { toasts } = useConsole();
  return <Toasts toasts={toasts} />;
}

/** Post a custom requirement. With "AI assist", a free-text line fills the form. It lands in the console as an enquiry. */
export function PostRequirement({ open, onClose, preset, assist = false }: { open: boolean; onClose: () => void; preset?: { product?: string; qty?: string }; assist?: boolean }) {
  const { update, toast } = useConsole();
  const [text, setText] = useState("");
  const [product, setProduct] = useState(preset?.product ?? "");
  const [qty, setQty] = useState(preset?.qty ?? "");
  const [city, setCity] = useState("Hyderabad");
  const [when, setWhen] = useState("4 weeks");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const fill = () => {
    const r = parseRequirement(text);
    if (r.product) setProduct(r.product.replace(/^\w/, (c) => c.toUpperCase()));
    if (r.qty) setQty(String(r.qty));
    if (r.city) setCity(r.city);
    if (r.when) setWhen(r.when);
    setDetails([r.pack && `Pack size ${r.pack}`, r.certs.length ? `Needs ${r.certs.join(", ")}` : ""].filter(Boolean).join(". "));
  };

  return (
    <Modal open={open} onClose={onClose} title={done ? "Requirement posted" : "Post a requirement"} sub={done ? undefined : "Free for brands. Only factories verified to make it will respond."}>
      {done ? (
        <div className="space-y-[14px] text-[13.5px]">
          <p>Verified factories that can make <b>{product}</b> are being matched. It&apos;s now an enquiry in your Scouthru OS workspace.</p>
          <div className="flex flex-wrap gap-[10px]">
            <Link href={`/console/enquiries?id=${done}`} className="inline-flex h-[40px] items-center gap-[8px] rounded-[7px] bg-cs-green px-[16px] text-[13px] font-medium text-white">Open enquiry {done} <ArrowRight className="size-[15px]" /></Link>
            <Btn onClick={onClose}>Keep browsing</Btn>
          </div>
        </div>
      ) : (
        <form
          className="space-y-[12px]"
          onSubmit={(e) => {
            e.preventDefault();
            const n = parseInt(qty.replace(/\D/g, ""), 10) || 0;
            if (!product.trim() || n <= 0) return;
            let id = "";
            update((d) => { id = postMarketRequirement(d, { product: product.trim(), qty: n, details: [details, `Deliver to ${city}`, `Needed in ${when}`].filter(Boolean).join(". ") + "." }); });
            toast("Requirement posted. Factories are being matched.");
            setDone(id);
          }}
        >
          {assist && (
            <div className="rounded-[9px] border border-cs-line bg-cs-cream/60 p-[12px]">
              <Field label="Describe it in your own words" hint="e.g. need 5k protein bars 60g hyd by nov fssai">
                <div className="flex gap-[8px]">
                  <input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} placeholder="What, how many, where, by when" />
                  <Btn icon={Sparkles} onClick={fill} disabled={!text.trim()}>Fill</Btn>
                </div>
              </Field>
            </div>
          )}
          <Field label="What do you want made?"><input className={inputCls} value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. Sugar-free gummies" required /></Field>
          <div className="grid grid-cols-2 gap-[10px]">
            <Field label="Quantity (units)"><input className={inputCls} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Units" required /></Field>
            <Field label="Needed in"><select className={inputCls} value={when} onChange={(e) => setWhen(e.target.value)}>{Array.from(new Set(["2 weeks", "4 weeks", "6 weeks", "3 months", when])).map((w) => <option key={w}>{w}</option>)}</select></Field>
          </div>
          <Field label="Deliver to"><select className={inputCls} value={city} onChange={(e) => setCity(e.target.value)}>{Array.from(new Set(["Hyderabad", "Bengaluru", "Chennai", "Pune", "Mumbai", "Delhi NCR", "Ahmedabad", city])).map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Anything else (optional)"><textarea className={cn(textareaCls, "h-[70px]")} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Pack size, certifications, flavours" /></Field>
          <Btn type="submit" kind="primary" className="w-full">Post free</Btn>
        </form>
      )}
    </Modal>
  );
}

export function MarketFooter() {
  return (
    <footer className="mt-16 border-t border-cs-line bg-cs-cream">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-4 py-[28px] sm:px-6">
        <div className="space-y-[6px]"><MarketLogo /><p className="text-[13px] text-cs-ink-2">From idea to delivery, Scouthru&apos;s got you.</p></div>
        <nav className="flex flex-wrap gap-[20px] text-[13px] text-[#2f3431]">
          <Link href="/marketplace" className="hover:text-cs-green">Products</Link>
          <Link href="/manufacturers" className="hover:text-cs-green">Manufacturers</Link>
          <Link href="/console" className="hover:text-cs-green">Scouthru OS</Link>
          <Link href="/os" className="hover:text-cs-green">For factories</Link>
          <span className="text-cs-ink-2">Hyderabad, India</span>
          <span className="text-cs-ink-2">Product photos: Unsplash</span>
        </nav>
      </div>
    </footer>
  );
}
