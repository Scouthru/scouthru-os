"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Btn, Field, Modal, Pill, TINT } from "@/components/ui";
import { MarketFooter, MarketHeader } from "@/components/market";
import { fmt, useStore } from "@/lib/store";
import { dayLabel } from "@/lib/seed";
import { openCase } from "@/lib/ops";
import type { Unit } from "@/lib/types";
import { cn } from "@/lib/cn";

export default function Page() {
  return (
    <Suspense>
      <Search />
    </Suspense>
  );
}

const FILTERS = {
  Category: ["Protein bars", "Supplements", "Skincare", "Healthy snacks", "Packaging"],
  Format: ["Bars", "Powders", "Capsules", "Gummies"],
  Location: ["Telangana", "Maharashtra", "Karnataka", "Andhra Pradesh"],
  Licences: ["FSSAI", "GMP", "ISO 22000"],
} as const;

function Search() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const { s, update, toast } = useStore();
  const [f, setF] = useState<Record<string, string[]>>({});
  const [enq, setEnq] = useState<Unit | null>(null);
  const [diy, setDiy] = useState<Unit | null>(null);
  const [tab, setTab] = useState<"makers" | "products">("makers");

  const toggle = (k: string, v: string) => setF((x) => ({ ...x, [k]: x[k]?.includes(v) ? x[k].filter((y) => y !== v) : [...(x[k] ?? []), v] }));

  const results = useMemo(() => {
    const t = q.toLowerCase().trim();
    return s.units.filter((u) => {
      if (t) {
        const hay = `${u.lines} ${u.tags.join(" ")} ${u.category.join(" ")} ${u.kind} ${u.city}`.toLowerCase();
        if (!t.split(/\s+/).some((w) => hay.includes(w.replace(/s$/, "")))) return false;
      }
      if (f.Category?.length && !f.Category.some((c) => u.category.includes(c))) return false;
      if (f.Format?.length && !f.Format.some((c) => u.formats.includes(c))) return false;
      if (f.Location?.length && !f.Location.includes(u.state)) return false;
      if (f.Licences?.length && !f.Licences.every((c) => u.licences.some((l) => l.includes(c)))) return false;
      return true;
    });
  }, [s.units, q, f]);

  const products = useMemo(() => {
    const t = q.toLowerCase().trim();
    return s.products.filter((p) => !t || t.split(/\s+/).some((w) => `${p.name} ${p.categoryLabel} ${p.format}`.toLowerCase().includes(w.replace(/s$/, ""))));
  }, [s.products, q]);
  // Filter counts, Keychain-style: how many units each option would show on its own.
  const countFor = (k: string, v: string) =>
    s.units.filter((u) => (k === "Category" ? u.category.includes(v) : k === "Format" ? u.formats.includes(v) : k === "Location" ? u.state === v : u.licences.some((l) => l.includes(v)))).length;

  return (
    <div className="min-h-dvh">
      <MarketHeader compact query={q} />
      <main className="mx-auto grid max-w-[1200px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[230px_1fr]">
        <aside className="card h-fit p-5">
          <p className="text-[18px] font-bold">Filters</p>
          {Object.entries(FILTERS).map(([k, vals]) => (
            <fieldset key={k} className="mt-5">
              <legend className="cap mb-2">{k}</legend>
              {vals.map((v) => (
                <label key={v} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[14px]">
                  <input type="checkbox" className="size-4 accent-[var(--color-pine)]" checked={!!f[k]?.includes(v)} onChange={() => toggle(k, v)} />
                  <span className="flex-1">{v}</span>
                  <span className="num rounded-full bg-soft px-2 py-0.5 text-[11px] text-ink-2">{countFor(k, v)}</span>
                </label>
              ))}
            </fieldset>
          ))}
          {Object.values(f).some((x) => x.length) && <button className="mt-4 text-[13px] font-semibold underline" onClick={() => setF({})}>Clear filters</button>}
        </aside>

        <section>
          <h1 className="disp text-[34px]">{q ? `Showing results for “${q}”` : "Verified manufacturers"}</h1>
          <p className="mt-1 text-[15px] text-ink-2">Pick a factory to send an enquiry, or open a ready product. Names stay hidden until you connect.</p>
          <div className="mt-5 grid grid-cols-2 gap-1 rounded-[10px] border border-line bg-white p-1" role="tablist">
            {([["makers", `Manufacturers (${results.length})`], ["products", `Ready products (${products.length})`]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("h-11 rounded-lg text-[14px] font-semibold transition-colors", tab === k ? "bg-pine text-white" : "text-ink-2 hover:bg-soft")}>{l}</button>
            ))}
          </div>
          {tab === "products" ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {products.map((p) => (
                <Link key={p.id} href={`/products/${p.id}`} className="card flex gap-4 p-4 hover:border-line-2">
                  <div className={cn("size-20 shrink-0 overflow-hidden rounded-[10px]", TINT[p.tint])}><img src={`/products/${p.id}.jpg`} alt={p.name} loading="lazy" className="size-full object-cover" /></div>
                  <div className="min-w-0">
                    <p className="cap">{p.categoryLabel}</p>
                    <p className="mt-0.5 text-[15px] font-semibold">{p.name}</p>
                    <p className="mt-1 text-[14px]"><b>₹{p.tiers[0].price}</b> <span className="text-ink-2">per unit · MOQ {fmt(p.moq)} · {p.lead}</span></p>
                  </div>
                </Link>
              ))}
              {products.length === 0 && <div className="card p-6 text-[14px] text-ink-2 sm:col-span-2">No ready product matches. Post a requirement and verified factories will quote.</div>}
            </div>
          ) : (
          <div className="mt-5 flex flex-col gap-4">
            {results.map((u) => (
              <article key={u.code} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="disp text-[21px]">Unit {u.code}</h2>
                      <Pill tone="ok">Verified visit</Pill>
                    </div>
                    <p className="mt-0.5 text-[14px] text-ink-2">{u.city} · {u.kind}</p>
                  </div>
                  <div className="flex gap-2">
                    <Btn onClick={() => setEnq(u)}>Send enquiry</Btn>
                    <Btn variant="flame" onClick={() => setDiy(u)}>Scouthru, do it for me</Btn>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {[["MOQ", fmt(u.moq)], ["Free capacity", `${fmt(u.freeCap)}/month`], ["Lead time", `${u.lead} days`], ["Licences", u.licences.join(", ")]].map(([k, v]) => (
                    <div key={k} className="rounded-[10px] bg-soft px-3 py-2.5">
                      <p className="text-[12px] text-ink-2">{k}</p>
                      <p className={cn("mt-0.5 text-[14px]", k !== "Licences" && "num")}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[13px] text-ink-2"><b className="num text-ink">{u.tags.length}</b> capabilities · <b className="num text-ink">{u.licences.length}</b> licences · <span className="text-ok">● Accepting projects</span></span>
                  <span className="mx-1 h-4 w-px bg-line" />
                  {u.tags.map((t) => <span key={t} className="rounded-full border border-line-2 px-3 py-1 text-[13px]">{t}</span>)}
                </div>
              </article>
            ))}
            {results.length === 0 && (
              <div className="card p-6 text-[14px] text-ink-2">No verified unit matches yet. Clear a filter, or post a requirement and Scouthru finds one for you.</div>
            )}
          </div>
          )}
        </section>
      </main>
      <MarketFooter />

      <Modal open={!!enq} onClose={() => setEnq(null)} title={`Enquiry to Unit ${enq?.code}`}>
        <form className="flex flex-col gap-3" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          update((d) => { if (!d.connected.includes(enq!.code)) d.connected.push(enq!.code); d.enquiries.unshift({ id: `e-${Date.now()}`, product: String(fd.get("product")), source: "Scouthru", moq: parseInt(String(fd.get("qty")), 10) || enq!.moq, neededBy: dayLabel(30), region: "Hyderabad", fit: "Fits", buyer: "Ruchika Foods", receivedHoursAgo: 0, status: "new", notes: String(fd.get("msg")) }); });
          toast("Enquiry sent. Numbers stay masked until both sides agree.");
          setEnq(null);
        }}>
          <Field label="Product"><input name="product" className="input" defaultValue={q || enq?.tags[0]} required /></Field>
          <Field label="Quantity"><input name="qty" className="input" inputMode="numeric" defaultValue={enq?.moq} /></Field>
          <Field label="Message"><textarea name="msg" className="input h-20 py-2" defaultValue="Please share your price band and earliest slot." /></Field>
          <Btn variant="pine" type="submit" size="lg">Send enquiry</Btn>
        </form>
      </Modal>
      <Modal open={!!diy} onClose={() => setDiy(null)} title="Scouthru, do it for me">
        <div className="flex flex-col gap-3 text-[14px]">
          <p>A Scouthru sourcing manager takes it from here: shortlists Unit {diy?.code} and two alternates, gets frozen quotes, arranges samples and runs the order under <b>Scouthru Assured</b>.</p>
          <p className="text-ink-2">You approve the sample and the price. We handle production follow-up, QC and dispatch.</p>
          <Btn variant="flame" size="lg" onClick={() => { update((d) => openCase(d, { kind: "Assisted sourcing", title: `Run it for me · Unit ${diy!.code}`, detail: `Buyer wants Scouthru to shortlist Unit ${diy!.code} and two alternates and run the order under Assured.`, from: "Ruchika Foods" })); toast("Request received. A sourcing manager will call you within 2 working hours."); setDiy(null); }}>Request a call back</Btn>
        </div>
      </Modal>
    </div>
  );
}
