"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BadgeCheck, Leaf, PackageCheck, ShieldCheck } from "lucide-react";
import { Btn, Modal, Pill, inputCls } from "@/components/console/kit";
import { MarketFooter, MarketHeader, PostRequirement } from "@/components/console/market";
import { CATEGORIES, CATEGORY_SUBS, inSub, INGREDIENT_SUPPLY, MADE_WITH, PACKAGING_SUPPLY } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { fmtNum } from "@/lib/console/format";
import { cn } from "@/lib/cn";

const CAT_PHOTO: Record<string, string> = {
  supplements: "/products/ashwagandha.jpg",
  skincare: "/products/vitamin-c-serum.jpg",
  snacks: "/products/millet-chips.jpg",
  beverages: "/products/electrolyte-mix.jpg",
  personal: "/products/onion-hair-oil.jpg",
  packaging: "/products/pet-jar.jpg",
};

export default function Page() {
  return (
    <Suspense>
      <Market />
    </Suspense>
  );
}

function Market() {
  const { s } = useStore();
  const params = useSearchParams();
  const [cat, setCat] = useState<string | null>(params.get("c"));
  const [sub, setSub] = useState<string | null>(params.get("s"));
  const [starters, setStarters] = useState(false);
  const [assured, setAssured] = useState(false);
  const [post, setPost] = useState(false);
  const [quick, setQuick] = useState({ product: "", qty: "" });

  const pc = params.get("c"), ps = params.get("s");
  useEffect(() => { if (pc) { setCat(pc); setSub(ps); setStarters(false); } }, [pc, ps]);
  const list = s.products.filter((p) => (!cat || p.category === cat) && (!cat || !sub || inSub(p, cat, sub)) && (!starters || p.starter));
  const pick = (c: string | null, x: string | null) => {
    setCat(c); setSub(x); setStarters(false);
    history.replaceState(null, "", c ? `/marketplace?c=${c}${x ? `&s=${encodeURIComponent(x)}` : ""}#ready` : "/marketplace#ready");
    document.getElementById("ready")?.scrollIntoView({ behavior: "smooth" });
  };
  const openPost = (product = "", qty = "") => { setQuick({ product, qty }); setPost(true); };

  return (
    <div className="min-h-dvh">
      <MarketHeader />
      <main className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {/* hero */}
        <section className="mt-[22px] grid gap-[14px] lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
          <div className="cs-card relative h-[330px] overflow-hidden bg-white max-sm:h-auto">
            <img src="/products/ashwagandha.jpg" alt="" className="absolute right-0 top-0 hidden h-full w-[56%] object-cover object-center sm:block" />
            <div className="absolute inset-y-0 left-[44%] hidden w-[200px] bg-gradient-to-r from-white via-white/60 to-transparent sm:block" />
            <div className="relative px-[28px] py-[30px] sm:max-w-[520px]">
              <p className="text-[11px] font-semibold tracking-[0.2em] text-[#2b302d]">WHITE-LABEL READY</p>
              <h1 className="serif mt-[12px] text-[46px] font-semibold leading-[1.02] tracking-[-0.02em] text-[#151816] sm:text-[52px]">Proven products. Your brand on it.</h1>
              <p className="mt-[14px] max-w-[42ch] text-[16px] leading-[1.4] text-[#3e4440]">Pick a ready formula from verified factories, customise flavour and pack, and launch in weeks.</p>
              <div className="mt-[22px] flex flex-wrap gap-[10px]">
                <Btn kind="primary" onClick={() => pick(null, null)}>Browse ready products</Btn>
                <Btn onClick={() => openPost()}>Need something custom</Btn>
              </div>
            </div>
            <div className="absolute bottom-[24px] right-[16px] hidden w-[176px] rounded-[6px] bg-[#f5efe5] px-[18px] py-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:block">
              <p className="serif text-[18.5px] leading-[1.15] tracking-[-0.02em] text-[#1d211e]">From concept to shelf-ready product.</p>
              <Leaf className="absolute bottom-[10px] right-[10px] size-[22px] -rotate-12 text-cs-green-2" strokeWidth={1} />
            </div>
          </div>
          <div className="grid gap-[14px]">
            <button type="button" onClick={() => { setStarters(true); setCat(null); setSub(null); document.getElementById("ready")?.scrollIntoView({ behavior: "smooth" }); }} className="cs-card flex items-start gap-[14px] p-[22px] text-left hover:border-[#cfcac0]">
              <span className="grid size-[46px] shrink-0 place-items-center rounded-full bg-cs-mint text-cs-green-2"><PackageCheck className="size-[22px]" strokeWidth={1.7} /></span>
              <span>
                <span className="serif block text-[22px] font-semibold leading-tight">Low MOQ starters</span>
                <span className="mt-[4px] block text-[13.5px] text-cs-ink-2">Products you can launch from small first batches.</span>
                <span className="mt-[10px] inline-flex items-center gap-[6px] text-[12.5px] font-medium text-cs-green">See starters <ArrowRight className="size-[14px]" /></span>
              </span>
            </button>
            <button type="button" onClick={() => setAssured(true)} className="flex items-start gap-[14px] rounded-[12px] border border-[#e6dccb] bg-cs-cream p-[22px] text-left hover:border-[#cfc2ab]">
              <span className="grid size-[46px] shrink-0 place-items-center rounded-full bg-white text-cs-green"><ShieldCheck className="size-[22px]" strokeWidth={1.7} /></span>
              <span>
                <span className="serif block text-[22px] font-semibold leading-tight">Scouthru Assured</span>
                <span className="mt-[4px] block text-[13.5px] text-cs-ink-2">One price. We run production, QC and dispatch.</span>
                <span className="mt-[10px] inline-flex items-center gap-[6px] text-[12.5px] font-medium text-cs-green">How it works <ArrowRight className="size-[14px]" /></span>
              </span>
            </button>
          </div>
        </section>

        {/* categories */}
        <section className="mt-[44px]">
          <h2 className="serif text-[28px] font-semibold tracking-[-0.02em]">Shop by category</h2>
          <div className="mt-[16px] grid grid-cols-2 gap-[12px] sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((c, ci) => (
              <div key={c.id} className="group/cat relative">
                <button type="button" onClick={() => pick(cat === c.id && !sub ? null : c.id, null)} aria-haspopup="true" className={cn("cs-card flex size-full flex-col p-[10px] text-left transition-colors hover:border-[#cfcac0]", cat === c.id && "border-cs-green ring-1 ring-cs-green")}>
                  <div className="h-[96px] overflow-hidden rounded-[8px] bg-cs-cream"><img src={CAT_PHOTO[c.id]} alt="" loading="lazy" className="size-full object-cover" /></div>
                  <p className="mt-[10px] text-[14px] font-semibold">{c.label}</p>
                  <p className="mt-[2px] text-[12px] leading-[1.35] text-cs-ink-2 lg:truncate" title={c.sub}>{c.sub}</p>
                </button>
                <div className={cn("invisible absolute top-full z-30 hidden w-full min-w-[220px] pt-[6px] opacity-0 transition-opacity duration-150 group-focus-within/cat:visible group-focus-within/cat:opacity-100 group-hover/cat:visible group-hover/cat:opacity-100 md:block", ci % 3 === 2 || ci >= 4 ? "right-0" : "left-0")}>
                  <ul className="rounded-[10px] border border-cs-line bg-white p-[5px] shadow-[0_12px_32px_rgba(20,30,25,0.12)]" role="menu" aria-label={`${c.label} subcategories`}>
                    <li>
                      <button type="button" role="menuitem" onClick={() => pick(c.id, null)} className="flex w-full items-center justify-between rounded-[6px] px-[11px] py-[7px] text-left text-[12.5px] font-semibold hover:bg-[#f5f3ee]">
                        All {c.label.toLowerCase()}<span className="text-[11.5px] text-cs-ink-2">{s.products.filter((p) => p.category === c.id).length}</span>
                      </button>
                    </li>
                    {CATEGORY_SUBS[c.id].map((x) => (
                      <li key={x.label}>
                        <button type="button" role="menuitem" onClick={() => pick(c.id, x.label)} className={cn("flex w-full items-center justify-between rounded-[6px] px-[11px] py-[7px] text-left text-[12.5px] hover:bg-[#f5f3ee]", cat === c.id && sub === x.label && "bg-[#f5f3ee] font-semibold")}>
                          {x.label}<span className="text-[11.5px] text-cs-ink-2">{s.products.filter((p) => p.category === c.id && inSub(p, c.id, x.label)).length}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ready products */}
        <section id="ready" className="mt-[44px] scroll-mt-[120px]">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="serif text-[28px] font-semibold tracking-[-0.02em]">{starters ? "Low MOQ starters" : cat ? (sub ?? CATEGORIES.find((c) => c.id === cat)?.label) : "Ready to white-label"}</h2>
            <div className="flex items-center gap-[12px] text-[12.5px] text-cs-ink-2">
              {(cat || starters) && <button type="button" className="font-medium text-cs-green hover:underline" onClick={() => pick(null, null)}>Show all</button>}
              <span>Sample listings · demo prices</span>
            </div>
          </div>
          {cat && !starters && (
            <div className="mt-[14px] flex flex-wrap gap-[8px]">
              {[null, ...CATEGORY_SUBS[cat].map((x) => x.label)].map((x) => (
                <button type="button" key={x ?? "all"} onClick={() => pick(cat, x)} className={cn("rounded-full border px-[13px] py-[6px] text-[12.5px]", sub === x ? "border-cs-green bg-cs-green text-white" : "border-cs-line bg-white text-[#3e4440] hover:border-[#9aa19c]")}>
                  {x ?? "All"}
                </button>
              ))}
            </div>
          )}
          <div className="mt-[16px] grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
            {list.map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="cs-card group flex flex-col overflow-hidden transition-shadow hover:shadow-[0_10px_30px_-18px_rgba(0,0,0,.35)]">
                <div className="relative h-[170px] overflow-hidden bg-cs-cream">
                  <img src={`/products/${p.id}.jpg`} alt={p.name} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  <span className="absolute left-[10px] top-[10px] rounded-[5px] bg-white/95 px-[8px] py-[2px] text-[10.5px] font-semibold tracking-[0.06em]">{p.pack}</span>
                </div>
                <div className="flex flex-1 flex-col p-[14px]">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-cs-ink-2">{p.categoryLabel.toUpperCase()}</p>
                  <p className="mt-[4px] line-clamp-2 min-h-[2.75em] text-[14.5px] font-semibold leading-[1.375]">{p.name}</p>
                  <div className="mt-auto flex items-baseline justify-between pt-[6px]">
                    <span className="serif text-[22px] font-semibold">₹{p.tiers[0].price}</span>
                    <span className="text-[11.5px] text-cs-ink-2">per unit</span>
                  </div>
                  <div className="mt-[10px] flex flex-wrap gap-[5px]">
                    <Pill tone="gray">MOQ {fmtNum(p.moq)}</Pill>
                    <Pill tone="gray">{p.lead}</Pill>
                    <Pill tone="green"><BadgeCheck className="size-[12px]" />Verified</Pill>
                  </div>
                </div>
              </Link>
            ))}
            {list.length === 0 && (
              <div className="cs-card col-span-full flex flex-col gap-3 p-[20px] sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[13.5px] text-cs-ink-2">No ready listings for {sub ?? "this category"} yet. Verified factories can make it for you.</p>
                <div className="flex flex-wrap gap-[8px]">
                  <Link href={`/manufacturers?q=${encodeURIComponent(sub ?? CATEGORIES.find((c) => c.id === cat)?.label ?? "")}`} className="inline-flex h-[38px] items-center rounded-[7px] border border-[#cfd2cd] bg-white px-[14px] text-[13px] font-medium">Find manufacturers</Link>
                  <Btn kind="primary" className="h-[38px]" onClick={() => openPost(sub ?? "")}>Post a requirement</Btn>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* made with */}
        <section className="mt-[44px]">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="serif text-[28px] font-semibold tracking-[-0.02em]">Made with Scouthru</h2>
              <p className="mt-[4px] text-[13.5px] text-cs-ink-2">Products brands launched through Scouthru, from sample to shelf.</p>
            </div>
            <span className="text-[12px] text-cs-ink-2">Sample showcase</span>
          </div>
          <div className="mt-[16px] grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
            {MADE_WITH.map((m) => (
              <article key={m.name} className="cs-card flex flex-col overflow-hidden">
                <div className="relative h-[170px] overflow-hidden bg-cs-cream">
                  <img src={m.photo} alt={m.name} loading="lazy" className="size-full object-cover" />
                  <span className="absolute left-[10px] top-[10px] rounded-[5px] bg-white/95 px-[8px] py-[2px] text-[10.5px] font-semibold tracking-[0.06em]">{m.pack}</span>
                  <span className="absolute right-[10px] top-[10px] rounded-[5px] bg-cs-green px-[8px] py-[2px] text-[11px] font-medium text-white">Shipped</span>
                </div>
                <div className="flex flex-1 flex-col p-[14px]">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-cs-ink-2">{`${m.brand} · ${m.category}`.toUpperCase()}</p>
                  <p className="mt-[4px] text-[14.5px] font-semibold">{m.name}</p>
                  <p className="mt-[2px] text-[12.5px] text-cs-ink-2">Made at Unit {m.unit}, {m.city}</p>
                  <div className="mt-[10px] mb-[2px] flex flex-wrap gap-[5px]">
                    <Pill tone="gray">{fmtNum(m.units)} units</Pill>
                    <Pill tone="gray">{m.weeks} weeks to launch</Pill>
                  </div>
                  {m.similar ? (
                    <Link href={`/products/${m.similar}`} className="mt-auto inline-flex items-center gap-[6px] pt-[12px] text-[12.5px] font-medium text-cs-green hover:underline">Make something similar <ArrowRight className="size-[13px]" /></Link>
                  ) : (
                    <button type="button" onClick={() => openPost(m.name, String(m.units))} className="mt-auto inline-flex items-center gap-[6px] self-start pt-[12px] text-[12.5px] font-medium text-cs-green hover:underline">Make something similar <ArrowRight className="size-[13px]" /></button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* units */}
        <section className="mt-[44px]">
          <div className="flex items-end justify-between">
            <h2 className="serif text-[28px] font-semibold tracking-[-0.02em]">Verified manufacturers</h2>
            <Link href="/manufacturers" className="inline-flex items-center gap-[6px] text-[12.5px] font-medium text-[#2f3431] hover:text-cs-green">View all <ArrowRight className="size-[14px]" /></Link>
          </div>
          <div className="mt-[16px] grid gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
            {s.units.slice(0, 4).map((u) => (
              <Link key={u.code} href={`/manufacturers?q=${encodeURIComponent(u.lines.split(",")[0])}`} className="cs-card flex flex-col p-[16px] hover:border-[#cfcac0]">
                <div className="flex items-center justify-between gap-2">
                  <span className="serif text-[18px] font-semibold">Unit {u.code}</span>
                  <Pill tone="green">Visited</Pill>
                </div>
                <p className="mt-[3px] text-[12.5px] text-cs-ink-2">{u.city} · {u.licences.join(", ")}</p>
                <p className="mt-[8px] text-[13.5px]">{u.lines}</p>
                <div className="mt-auto pt-[12px]"><div className="h-[6px] overflow-hidden rounded-full bg-[#ece9e2]"><div className="h-full rounded-full bg-cs-green" style={{ width: `${u.booked}%` }} /></div></div>
                <p className="mt-[6px] text-[11.5px] text-cs-ink-2">{u.booked}% booked this quarter</p>
              </Link>
            ))}
          </div>
        </section>

        {/* suppliers */}
        <section id="ingredients" className="mt-[24px] grid scroll-mt-[120px] gap-[14px] lg:grid-cols-2">
          {([["Packaging suppliers", PACKAGING_SUPPLY], ["Ingredients and raw materials", INGREDIENT_SUPPLY]] as const).map(([title, rows]) => (
            <div key={title} className="cs-card p-[20px]">
              <h3 className="serif text-[22px] font-semibold">{title}</h3>
              <ul className="mt-[8px] divide-y divide-cs-line">
                {rows.map(([a, b]) => (
                  <li key={a}>
                    <button type="button" onClick={() => openPost(a)} className="flex w-full justify-between py-[11px] text-left text-[13.5px] hover:text-cs-green">
                      <span>{a}</span><span className="text-cs-ink-2">{b}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* custom requirement */}
        <section className="mt-[32px] grid items-center gap-[18px] rounded-[12px] border border-[#d9e7dc] bg-cs-mint p-[22px] sm:p-[28px] lg:grid-cols-[1fr_1.15fr]">
          <div>
            <h2 className="serif text-[30px] font-semibold tracking-[-0.02em]">Can&apos;t find it ready-made?</h2>
            <p className="mt-[4px] text-[14px] text-[#3e4440]">Post a custom requirement. Verified factories that can make it will respond.</p>
          </div>
          <form className="grid gap-[10px] sm:grid-cols-[1.4fr_0.8fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); setPost(true); }}>
            <label className="flex flex-col gap-[5px] text-[12px] font-medium">Product<input className={inputCls} placeholder="e.g. Sugar-free gummies" value={quick.product} onChange={(e) => setQuick({ ...quick, product: e.target.value })} /></label>
            <label className="flex flex-col gap-[5px] text-[12px] font-medium">Quantity<input className={inputCls} placeholder="Units" inputMode="numeric" value={quick.qty} onChange={(e) => setQuick({ ...quick, qty: e.target.value })} /></label>
            <Btn kind="primary" type="submit" className="h-[38px] px-[20px]">Post free</Btn>
          </form>
        </section>
      </main>
      <MarketFooter />

      {post && <PostRequirement key={`${quick.product}|${quick.qty}`} open onClose={() => setPost(false)} preset={quick} />}
      <Modal open={assured} onClose={() => setAssured(false)} title="Scouthru Assured" sub="One all-in price. We run production, QC and dispatch.">
        <ol className="space-y-[12px] text-[13.5px]">
          {[
            ["One all-in price", "Product, packaging, QC and freight to your door, frozen for 15 days once you accept."],
            ["We run production", "Phased milestones with photo proof at every stage, logged so it cannot be edited later."],
            ["QC against your sample", "A Scouthru QC agent checks the batch against the approved golden sample before dispatch."],
            ["Escrow by milestone", "Your money is released only on verified proof. 7-day complaint window after delivery."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-[12px]">
              <span className="grid size-[24px] shrink-0 place-items-center rounded-full bg-cs-mint text-[12px] font-semibold text-cs-green">{i + 1}</span>
              <span><b>{t}.</b> <span className="text-cs-ink-2">{d}</span></span>
            </li>
          ))}
        </ol>
        <Btn kind="primary" className="mt-[18px]" onClick={() => { setAssured(false); pick(null, null); }}>Browse Assured products</Btn>
      </Modal>
    </div>
  );
}
