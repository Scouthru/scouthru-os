"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Btn, Pill, TINT, Bar, Modal } from "@/components/ui";
import { MarketFooter, MarketHeader, PostRequirement } from "@/components/market";
import { CATEGORIES, CATEGORY_SUBS, inSub, INGREDIENT_SUPPLY, MADE_WITH, PACKAGING_SUPPLY } from "@/lib/seed";
import { useStore, fmt } from "@/lib/store";
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
  const active = cat;
  const list = s.products.filter((p) => (!active || p.category === active) && (!active || !sub || inSub(p, active, sub)) && (!starters || p.starter));
  const pick = (c: string | null, x: string | null) => {
    setCat(c); setSub(x); setStarters(false);
    history.replaceState(null, "", c ? `/marketplace?c=${c}${x ? `&s=${encodeURIComponent(x)}` : ""}#ready` : "/marketplace#ready");
    document.getElementById("ready")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-dvh">
      <MarketHeader />
      <main className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <section className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <div className="rounded-[14px] bg-pine p-7 text-white sm:p-9">
            <p className="monocap text-apricot">White-label ready</p>
            <h1 className="disp mt-3 text-[38px] leading-[1.02] sm:text-[52px]">Proven products. Your brand on it.</h1>
            <p className="mt-4 max-w-[46ch] text-[15px] text-white/80">Pick a ready formula from verified factories, customise flavour and pack, and launch in weeks.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Btn variant="white" href="#ready">Browse ready products</Btn>
              <button onClick={() => setPost(true)} className="h-10 rounded-lg border border-white/40 px-4 text-[14px] font-semibold text-white hover:bg-white/10">Need something custom</button>
            </div>
          </div>
          <div className="grid gap-5">
            <button onClick={() => { setStarters(true); setCat(null); document.getElementById("ready")?.scrollIntoView({ behavior: "smooth" }); }} className="card p-6 text-left hover:border-line-2">
              <p className="text-[21px] font-bold">Low MOQ starters</p>
              <p className="mt-1 text-[14px] text-ink-2">Products you can launch from small first batches.</p>
              <span className="mt-2 inline-block text-[13px] font-semibold underline">See starters</span>
            </button>
            <button onClick={() => setAssured(true)} className="rounded-[14px] bg-peach p-6 text-left">
              <p className="text-[21px] font-bold">Scouthru Assured</p>
              <p className="mt-1 text-[14px] text-ink-2">One price. We run production, QC and dispatch.</p>
              <span className="mt-2 inline-block text-[13px] font-semibold underline">How it works</span>
            </button>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="disp text-[24px]">Shop by category</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((c, ci) => (
              <div key={c.id} className="group/cat relative">
                <button
                  onClick={() => pick(active === c.id && !sub ? null : c.id, null)}
                  aria-haspopup="true"
                  className={cn("card flex size-full flex-col justify-start p-3.5 text-left transition-colors hover:border-line-2", active === c.id && "border-pine ring-1 ring-pine")}
                >
                  <div className={cn("h-24 overflow-hidden rounded-[10px]", TINT[c.tint])}><img src={CAT_PHOTO[c.id]} alt="" loading="lazy" className="size-full object-cover" /></div>
                  <p className="mt-3 text-[14px] font-semibold">{c.label}</p>
                  <p className="mt-1 text-[12px] text-ink-2">{c.sub}</p>
                </button>
                {/* pt-2 bridges the gap so the cursor can move from the tile into the menu */}
                <div className={cn("invisible absolute top-full z-30 hidden w-full min-w-[220px] pt-2 opacity-0 transition-opacity duration-150 group-focus-within/cat:visible group-focus-within/cat:opacity-100 group-hover/cat:visible group-hover/cat:opacity-100 md:block", ci % 3 === 2 || ci >= 4 ? "right-0" : "left-0")}>
                  <ul className="rounded-[12px] border border-line bg-white p-1.5 shadow-[0_16px_40px_-20px_rgba(16,32,27,.45)]" role="menu" aria-label={`${c.label} subcategories`}>
                    <li>
                      <button role="menuitem" onClick={() => pick(c.id, null)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-semibold hover:bg-soft">
                        All {c.label.toLowerCase()}<span className="num text-[12px] text-ink-3">{s.products.filter((p) => p.category === c.id).length}</span>
                      </button>
                    </li>
                    {CATEGORY_SUBS[c.id].map((x) => {
                      const n = s.products.filter((p) => p.category === c.id && inSub(p, c.id, x.label)).length;
                      return (
                        <li key={x.label}>
                          <button role="menuitem" onClick={() => pick(c.id, x.label)} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] hover:bg-soft", active === c.id && sub === x.label && "bg-soft font-semibold")}>
                            {x.label}<span className="num text-[12px] text-ink-3">{n}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="ready" className="mt-12 scroll-mt-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="disp text-[24px]">
              {starters ? "Low MOQ starters" : active ? (sub ?? CATEGORIES.find((c) => c.id === active)?.label) : "Ready to white-label"}
            </h2>
            <div className="flex items-center gap-3 text-[13px] text-ink-2">
              {(active || starters) && <button className="font-semibold text-ink underline" onClick={() => pick(null, null)}>Show all</button>}
              <span>Sample listings · demo prices</span>
            </div>
          </div>
          {active && !starters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {[null, ...CATEGORY_SUBS[active].map((x) => x.label)].map((x) => (
                <button key={x ?? "all"} onClick={() => pick(active, x)} className={cn("rounded-full border px-3 py-1.5 text-[13px]", sub === x ? "border-pine bg-pine text-white" : "border-line-2 bg-white text-ink-2 hover:border-ink")}>
                  {x ?? "All"}
                </button>
              ))}
            </div>
          )}
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="card group overflow-hidden transition-shadow hover:shadow-[0_10px_30px_-18px_rgba(0,0,0,.35)]">
                <div className={cn("relative h-40 overflow-hidden", TINT[p.tint])}>
                  <img src={`/products/${p.id}.jpg`} alt={p.name} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  <span className="absolute left-3 top-3 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold">{p.pack}</span>
                </div>
                <div className="p-4">
                  <p className="cap">{p.categoryLabel}</p>
                  <p className="mt-1 text-[15px] font-semibold">{p.name}</p>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-[18px] font-bold">₹{p.tiers[0].price}</span>
                    <span className="text-[12px] text-ink-2">per unit</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    <Pill className="px-2">MOQ {fmt(p.moq)}</Pill>
                    <Pill className="px-2">{p.lead}</Pill>
                    <Pill tone="ok" className="px-2">Verified</Pill>
                  </div>
                </div>
              </Link>
            ))}
            {list.length === 0 && (
              <div className="card col-span-full flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[14px] text-ink-2">No ready listings for {sub ?? "this category"} yet. Verified factories can make it for you.</p>
                <div className="flex flex-wrap gap-2">
                  <Btn size="sm" href={`/manufacturers?q=${encodeURIComponent(sub ?? CATEGORIES.find((c) => c.id === active)?.label ?? "")}`}>Find manufacturers</Btn>
                  <Btn size="sm" variant="flame" onClick={() => setPost(true)}>Post a requirement</Btn>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="disp text-[24px]">Made with Scouthru</h2>
              <p className="mt-1 text-[14px] text-ink-2">Products brands launched through Scouthru, from sample to shelf.</p>
            </div>
            <span className="text-[12px] text-ink-2">Sample showcase</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MADE_WITH.map((m) => (
              <article key={m.name} className="card overflow-hidden">
                <div className={cn("relative h-40 overflow-hidden", TINT[m.tint])}>
                  <img src={m.photo} alt={m.name} loading="lazy" className="size-full object-cover" />
                  <span className="absolute left-3 top-3 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold">{m.pack}</span>
                  <span className="absolute right-3 top-3 rounded-full bg-pine px-2 py-0.5 text-[11px] font-semibold text-white">Shipped</span>
                </div>
                <div className="p-4">
                  <p className="cap">{m.brand} · {m.category}</p>
                  <p className="mt-1 text-[15px] font-semibold">{m.name}</p>
                  <p className="mt-1 text-[13px] text-ink-2">Made at Unit {m.unit}, {m.city}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    <Pill className="px-2">{fmt(m.units)} units</Pill>
                    <Pill className="px-2">{m.weeks} weeks to launch</Pill>
                  </div>
                  {m.similar ? (
                    <Link href={`/products/${m.similar}`} className="mt-3 inline-block text-[13px] font-semibold underline hover:text-flame">Make something similar</Link>
                  ) : (
                    <button onClick={() => { setQuick({ product: m.name, qty: String(m.units) }); setPost(true); }} className="mt-3 text-[13px] font-semibold underline hover:text-flame">Make something similar</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between">
            <h2 className="disp text-[24px]">Verified manufacturers</h2>
            <Link href="/manufacturers" className="text-[13px] font-semibold underline">View all</Link>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {s.units.slice(0, 4).map((u) => (
              <Link key={u.code} href={`/manufacturers?q=${encodeURIComponent(u.lines.split(",")[0])}`} className="card p-4 hover:border-line-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="disp text-[16px]">Unit {u.code}</span>
                  <Pill tone="ok">Visited</Pill>
                </div>
                <p className="mt-1 text-[13px] text-ink-2">{u.city} · {u.licences.join(", ")}</p>
                <p className="mt-2 text-[14px]">{u.lines}</p>
                <Bar value={u.booked} className="mt-3" />
                <p className="mt-1.5 text-[12px] text-ink-2">{u.booked}% booked this quarter</p>
              </Link>
            ))}
          </div>
        </section>

        <section id="ingredients" className="mt-8 grid scroll-mt-4 gap-5 lg:grid-cols-2">
          {[["Packaging suppliers", PACKAGING_SUPPLY], ["Ingredients and raw materials", INGREDIENT_SUPPLY]].map(([title, rows]) => (
            <div key={title as string} className="card p-6">
              <h3 className="disp text-[21px]">{title as string}</h3>
              <ul className="mt-3 divide-y divide-line">
                {(rows as [string, string][]).map(([a, b]) => (
                  <li key={a}>
                    <button onClick={() => { setQuick({ product: a, qty: "" }); setPost(true); }} className="flex w-full justify-between py-3 text-left text-[14px] hover:text-flame">
                      <span>{a}</span>
                      <span className="text-ink-2">{b}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="mt-10 grid items-center gap-5 rounded-[14px] bg-peach p-6 sm:p-8 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <h2 className="disp text-[28px]">Can&apos;t find it ready-made?</h2>
            <p className="mt-1 text-[15px] text-ink-2">Post a custom requirement. Verified factories that can make it will respond.</p>
          </div>
          <form
            className="grid gap-2 sm:grid-cols-[1.4fr_0.8fr_auto] sm:items-end"
            onSubmit={(e) => { e.preventDefault(); setPost(true); }}
          >
            <label className="flex flex-col gap-1 text-[12px] font-semibold">Product<input className="input" placeholder="e.g. Sugar-free gummies" value={quick.product} onChange={(e) => setQuick({ ...quick, product: e.target.value })} /></label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold">Quantity<input className="input" placeholder="Units" inputMode="numeric" value={quick.qty} onChange={(e) => setQuick({ ...quick, qty: e.target.value })} /></label>
            <Btn variant="pine" type="submit" className="h-11">Post free</Btn>
          </form>
        </section>
      </main>
      <MarketFooter />

      <PostRequirement key={`${quick.product}|${quick.qty}|${post}`} open={post} onClose={() => setPost(false)} preset={quick} />
      <Modal open={assured} onClose={() => setAssured(false)} title="Scouthru Assured">
        <ol className="flex flex-col gap-3 text-[14px]">
          {[
            ["One all-in price", "Product, packaging, QC and freight to your door, frozen for 15 days once you accept."],
            ["We run production", "Phased milestones with photo proof at every stage, logged so it cannot be edited later."],
            ["QC against your sample", "A Scouthru QC agent checks the batch against the approved golden sample before dispatch."],
            ["Escrow by milestone", "Your money is released only on verified proof. 7-day complaint window after delivery."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-peach text-[12px]">{i + 1}</span>
              <span><b>{t}.</b> <span className="text-ink-2">{d}</span></span>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex gap-2">
          <Btn variant="flame" href="#ready" onClick={() => setAssured(false)}>Browse Assured products</Btn>
        </div>
      </Modal>
    </div>
  );
}
