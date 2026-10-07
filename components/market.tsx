"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Btn, Field, Modal } from "@/components/ui";
import { useStore } from "@/lib/store";
import { postRequirement } from "@/lib/ops";
import { AiAssistButton } from "@/components/ai-assist";
import { CATEGORY_SUBS } from "@/lib/seed";
import { cn } from "@/lib/cn";

// Scouthru logo, cut from the brand artwork (public/logo.png, 1054x428) and used as a mask
// so it takes the text colour: pine on light surfaces, white on dark ones.
export function Wordmark({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex text-[24px] leading-none", light ? "text-white" : "text-pine", className)}>
      <span
        role="img"
        aria-label="Scouthru"
        className="inline-block h-[1.45em] bg-current"
        style={{ aspectRatio: "1054 / 428", WebkitMask: "url(/logo.png) center / contain no-repeat", mask: "url(/logo.png) center / contain no-repeat" }}
      />
    </span>
  );
}

const NAV: { label: string; href: string; cat?: string }[] = [
  { label: "Supplements", href: "/marketplace?c=supplements#ready", cat: "supplements" },
  { label: "Skincare", href: "/marketplace?c=skincare#ready", cat: "skincare" },
  { label: "Snacks", href: "/marketplace?c=snacks#ready", cat: "snacks" },
  { label: "Beverages", href: "/marketplace?c=beverages#ready", cat: "beverages" },
  { label: "Personal care", href: "/marketplace?c=personal#ready", cat: "personal" },
  { label: "Packaging", href: "/marketplace?c=packaging#ready", cat: "packaging" },
  { label: "Ingredients", href: "/marketplace#ingredients" },
  { label: "Manufacturers", href: "/manufacturers" },
];

export function MarketHeader({ compact, query = "" }: { compact?: boolean; query?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(query);
  const [post, setPost] = useState(false);
  return (
    <>
      {!compact && (
        <div className="bg-pine text-white">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-2 text-[12px] sm:px-6">
            <span>FMCG makers in India, matched by capability · Brands from anywhere · Free for brands</span>
            <Link href="/os" className="hidden font-semibold sm:inline">For factories: Scouthru OS</Link>
          </div>
        </div>
      )}
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3.5 sm:gap-5 sm:px-6">
          <Link href="/" aria-label="Scouthru home"><Wordmark /></Link>
          <form
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-ink/80 bg-white pl-3 pr-1"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/manufacturers?q=${encodeURIComponent(q)}`);
            }}
          >
            <Search className="size-4 shrink-0 text-ink-2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, manufacturers, packaging, ingredients" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" aria-label="Search" />
            <button className="hidden h-9 rounded-lg bg-pine px-4 text-[13px] font-semibold text-white sm:block">Search</button>
          </form>
          <AiAssistButton seed={q} />
          <Link href="/demo" className="hidden text-[14px] font-semibold sm:block">Sign in</Link>
          <Btn variant="flame" onClick={() => setPost(true)} className="hidden sm:inline-flex">Post requirement</Btn>
        </div>
        {!compact && (
          <nav className="mx-auto flex max-w-[1200px] gap-1 overflow-x-auto px-3 pb-2 text-[14px] font-medium sm:px-5 lg:overflow-visible" aria-label="Categories">
            {NAV.map((n) => (
              <div key={n.label} className="group/nav relative">
                <Link href={n.href} className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 hover:bg-soft group-hover/nav:bg-soft">
                  {n.label}
                  {n.cat && <ChevronDown className="hidden size-3.5 text-ink-3 transition-transform group-hover/nav:rotate-180 lg:block" />}
                </Link>
                {n.cat && (
                  /* pt-1.5 keeps the hover alive while the cursor moves down into the menu */
                  <div className="invisible absolute left-0 top-full z-40 hidden min-w-[220px] pt-1.5 opacity-0 transition-opacity duration-150 group-focus-within/nav:visible group-focus-within/nav:opacity-100 group-hover/nav:visible group-hover/nav:opacity-100 lg:block">
                    <ul className="rounded-[12px] border border-line bg-white p-1.5 shadow-[0_16px_40px_-20px_rgba(16,32,27,.45)]" role="menu" aria-label={`${n.label} subcategories`}>
                      <li><Link role="menuitem" href={n.href} className="block rounded-lg px-3 py-2 text-[13px] font-semibold hover:bg-soft">All {n.label.toLowerCase()}</Link></li>
                      {CATEGORY_SUBS[n.cat].map((x) => (
                        <li key={x.label}><Link role="menuitem" href={`/marketplace?c=${n.cat}&s=${encodeURIComponent(x.label)}#ready`} className="block rounded-lg px-3 py-2 text-[13px] font-normal hover:bg-soft">{x.label}</Link></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </nav>
        )}
      </header>
      <PostRequirement open={post} onClose={() => setPost(false)} />
    </>
  );
}

export function PostRequirement({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: { product?: string; qty?: string } }) {
  const { update, toast } = useStore();
  const [product, setProduct] = useState(preset?.product ?? "");
  const [qty, setQty] = useState(preset?.qty ?? "");
  const [city, setCity] = useState("Hyderabad");
  const [when, setWhen] = useState("4 weeks");
  const [done, setDone] = useState(false);
  return (
    <Modal open={open} onClose={() => { setDone(false); onClose(); }} title={done ? "Requirement posted" : "Post a requirement"}>
      {done ? (
        <div className="flex flex-col gap-5 text-[14px]">
          <p>Verified factories that can make <b>{product}</b> are being notified. It has also landed in the factory inbox of matching units in the demo.</p>
          <div className="flex flex-wrap gap-2">
            <Btn variant="pine" href="/brand">Track it in your dashboard</Btn>
            <Btn href="/factory">See it as a factory</Btn>
          </div>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Math.max(1, parseInt(qty.replace(/\D/g, ""), 10) || 0);
            if (!product.trim() || !n) return;
            update((d) => { postRequirement(d, { product, qty: n, city, when }); });
            toast("Requirement posted. Factories are being matched.");
            setDone(true);
          }}
        >
          <Field label="What do you want made?"><input className="input" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. Sugar-free gummies" required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity"><input className="input" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Units" required /></Field>
            <Field label="Needed in"><select className="input" value={when} onChange={(e) => setWhen(e.target.value)}>{["2 weeks", "4 weeks", "6 weeks", "3 months"].map((w) => <option key={w}>{w}</option>)}</select></Field>
          </div>
          <Field label="Deliver to"><select className="input" value={city} onChange={(e) => setCity(e.target.value)}>{["Hyderabad", "Bengaluru", "Chennai", "Pune", "Mumbai", "Vijayawada"].map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Btn variant="flame" size="lg" type="submit">Post free</Btn>
          <p className="text-[12px] text-ink-3">Free for brands. Only factories verified to make it will respond.</p>
        </form>
      )}
    </Modal>
  );
}

export function MarketFooter() {
  return (
    <footer className="mt-16 bg-pine text-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-1.5"><Wordmark light /><span className="text-[13px] text-white/75">From idea to delivery, Scouthru&apos;s got you.</span></div>
        <nav className="flex flex-wrap gap-5 text-[13px] text-white/85">
          <Link href="/marketplace">Products</Link>
          <Link href="/manufacturers">Manufacturers</Link>
          <Link href="/os">Scouthru OS</Link>
          <Link href="/demo">Working demo</Link>
          <span>Hyderabad, India</span>
          <span className="text-white/50">Product photos: Unsplash</span>
        </nav>
      </div>
    </footer>
  );
}
