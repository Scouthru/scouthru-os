"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BadgeCheck, Headset, MessageSquare } from "lucide-react";
import { Btn, Check, Field, Modal, Pill, inputCls, textareaCls } from "@/components/console/kit";
import { MarketFooter, MarketHeader } from "@/components/console/market";
import { useStore } from "@/lib/store";
import { useConsole } from "@/lib/console/store";
import { assistedSourcing, marketEnquiry, unitMfrId } from "@/lib/console/actions-market";
import { fmtNum } from "@/lib/console/format";
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
  const { s } = useStore();
  const { s: cs, update, toast } = useConsole();
  const [f, setF] = useState<Record<string, string[]>>({});
  const [enq, setEnq] = useState<Unit | null>(null);
  const [diy, setDiy] = useState<Unit | null>(null);
  const [tab, setTab] = useState<"makers" | "products">("makers");
  const [form, setForm] = useState({ product: "", qty: "", msg: "" });
  const [sent, setSent] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const toggle = (k: string, v: string) => setF((x) => ({ ...x, [k]: x[k]?.includes(v) ? x[k].filter((y) => y !== v) : [...(x[k] ?? []), v] }));
  const units = s.units.filter((u) => u.status !== "pending" && u.status !== "rejected");

  const results = useMemo(() => {
    const t = q.toLowerCase().trim();
    return units.filter((u) => {
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
  }, [units, q, f]);

  const products = useMemo(() => {
    const t = q.toLowerCase().trim();
    return s.products.filter((p) => !t || t.split(/\s+/).some((w) => `${p.name} ${p.categoryLabel} ${p.format}`.toLowerCase().includes(w.replace(/s$/, ""))));
  }, [s.products, q]);

  const countFor = (k: string, v: string) =>
    units.filter((u) => (k === "Category" ? u.category.includes(v) : k === "Format" ? u.formats.includes(v) : k === "Location" ? u.state === v : u.licences.some((l) => l.includes(v)))).length;
  const activeCount = Object.values(f).reduce((a, x) => a + x.length, 0);
  const connected = (u: Unit) => cs.manufacturers.some((m) => m.id === unitMfrId(u.code));

  return (
    <div className="min-h-dvh">
      <MarketHeader compact query={q} />
      <main className="mx-auto grid max-w-[1240px] gap-[20px] px-4 py-[22px] sm:px-6 lg:grid-cols-[236px_minmax(0,1fr)]">
        <aside className="cs-card h-fit p-[18px] lg:sticky lg:top-[86px]">
          <div className="flex items-center justify-between">
            <p className="serif text-[21px] font-semibold">Filters{activeCount > 0 && <span className="ml-[8px] align-middle font-sans text-[12px] font-semibold text-cs-green">{activeCount} on</span>}</p>
            <button type="button" className="text-[12.5px] font-medium text-cs-green lg:hidden" aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}>{showFilters ? "Hide" : "Show"}</button>
          </div>
          <div className={cn(!showFilters && "max-lg:hidden")}>
          {Object.entries(FILTERS).map(([k, vals]) => (
            <fieldset key={k} className="mt-[16px]">
              <legend className="mb-[6px] text-[11px] font-semibold tracking-[0.12em] text-cs-ink-2">{k.toUpperCase()}</legend>
              {vals.map((v) => (
                <div key={v} className="flex cursor-pointer items-center gap-[10px] py-[5px] text-[13.5px]" onClick={() => toggle(k, v)}>
                  <Check checked={!!f[k]?.includes(v)} onChange={() => toggle(k, v)} label={v} />
                  <span className="flex-1">{v}</span>
                  <span className="rounded-full bg-[#f1f0ec] px-[7px] py-[1px] text-[11px] text-cs-ink-2">{countFor(k, v)}</span>
                </div>
              ))}
            </fieldset>
          ))}
          {activeCount > 0 && <button type="button" className="mt-[14px] text-[12.5px] font-medium text-cs-green hover:underline" onClick={() => setF({})}>Clear filters</button>}
          </div>
        </aside>

        <section className="min-w-0">
          <h1 className="serif text-[34px] font-semibold leading-tight tracking-[-0.02em] sm:text-[38px]">{q ? `Results for “${q}”` : "Verified manufacturers"}</h1>
          <p className="mt-[4px] text-[14px] text-cs-ink-2">Pick a factory to send an enquiry, or open a ready product. Names stay hidden until you connect.</p>
          <div className="mt-[16px] grid grid-cols-2 gap-[4px] rounded-[10px] border border-cs-line bg-white p-[4px]" role="tablist">
            {([["makers", `Manufacturers (${results.length})`], ["products", `Ready products (${products.length})`]] as const).map(([k, l]) => (
              <button type="button" key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("h-[40px] rounded-[7px] text-[13.5px] font-medium transition-colors", tab === k ? "bg-cs-green text-white" : "text-[#3e4440] hover:bg-[#f5f3ee]")}>{l}</button>
            ))}
          </div>

          {tab === "products" ? (
            <div className="mt-[16px] grid grid-cols-1 gap-[12px] sm:grid-cols-2">
              {products.map((p) => (
                <Link key={p.id} href={`/products/${p.id}`} className="cs-card flex gap-[14px] p-[14px] hover:border-[#cfcac0]">
                  <div className="size-[80px] shrink-0 overflow-hidden rounded-[8px] bg-cs-cream"><img src={`/products/${p.id}.jpg`} alt={p.name} loading="lazy" className="size-full object-cover" /></div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.12em] text-cs-ink-2">{p.categoryLabel.toUpperCase()}</p>
                    <p className="mt-[2px] text-[14.5px] font-semibold">{p.name}</p>
                    <p className="mt-[4px] text-[13px]"><b>₹{p.tiers[0].price}</b> <span className="text-cs-ink-2">per unit · MOQ {fmtNum(p.moq)} · {p.lead}</span></p>
                  </div>
                </Link>
              ))}
              {products.length === 0 && <div className="cs-card p-[20px] text-[13.5px] text-cs-ink-2 sm:col-span-2">No ready product matches. Post a requirement and verified factories will quote.</div>}
            </div>
          ) : (
            <div className="mt-[16px] space-y-[12px]">
              {results.map((u) => {
                const known = connected(u);
                return (
                  <article key={u.code} className="cs-card p-[20px]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-[8px]">
                          <h2 className="serif text-[24px] font-semibold">{known ? u.name : `Unit ${u.code}`}</h2>
                          <Pill tone="green"><BadgeCheck className="size-[12px]" />Verified visit</Pill>
                          {known && <Pill tone="blue">Connected</Pill>}
                        </div>
                        <p className="mt-[2px] text-[13px] text-cs-ink-2">{known ? `Unit ${u.code} · ` : ""}{u.city} · {u.kind}</p>
                      </div>
                      <div className="flex flex-wrap gap-[8px] max-sm:w-full max-sm:[&>button]:flex-1">
                        <Btn icon={MessageSquare} onClick={() => { setForm({ product: q || u.tags[0], qty: String(u.moq), msg: "Please share your price band and earliest slot." }); setSent(null); setEnq(u); }}>Send enquiry</Btn>
                        <Btn kind="primary" icon={Headset} onClick={() => setDiy(u)}>Scouthru, do it for me</Btn>
                      </div>
                    </div>
                    <div className="mt-[14px] grid grid-cols-2 gap-[8px] lg:grid-cols-4">
                      {[["MOQ", fmtNum(u.moq)], ["Free capacity", `${fmtNum(u.freeCap)}/month`], ["Lead time", `${u.lead} days`], ["Licences", u.licences.join(", ")]].map(([k, v]) => (
                        <div key={k} className="rounded-[8px] bg-[#f7f5f0] px-[12px] py-[9px]">
                          <p className="text-[11.5px] text-cs-ink-2">{k}</p>
                          <p className="mt-[2px] text-[13.5px] font-medium">{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-[12px] flex flex-wrap items-center gap-[8px]">
                      <span className="text-[12.5px] text-cs-ink-2"><b className="text-cs-ink">{u.tags.length}</b> capabilities · <b className="text-cs-ink">{u.licences.length}</b> licences · <span className="text-cs-green-2">● Accepting projects</span></span>
                      <span className="mx-[2px] h-[16px] w-px bg-cs-line" />
                      {u.tags.map((t) => <span key={t} className="rounded-full border border-cs-line bg-white px-[11px] py-[3px] text-[12px]">{t}</span>)}
                      {known && <Link href={`/console/manufacturers?id=${unitMfrId(u.code)}`} className="ml-auto inline-flex items-center gap-[5px] text-[12.5px] font-medium text-cs-green hover:underline">Open in Scouthru OS <ArrowRight className="size-[13px]" /></Link>}
                    </div>
                  </article>
                );
              })}
              {results.length === 0 && <div className="cs-card p-[20px] text-[13.5px] text-cs-ink-2">No verified unit matches yet. Clear a filter, or post a requirement and Scouthru finds one for you.</div>}
            </div>
          )}
        </section>
      </main>
      <MarketFooter />

      <Modal open={!!enq} onClose={() => setEnq(null)} title={sent ? "Enquiry sent" : `Enquiry to ${enq && connected(enq) ? enq.name : `Unit ${enq?.code}`}`} sub={sent ? undefined : "Numbers stay masked until both sides agree."}>
        {sent ? (
          <div className="space-y-[14px] text-[13.5px]">
            <p>Sent to {enq?.name}. It&apos;s now an enquiry in your Scouthru OS workspace, and the unit has joined your manufacturers list.</p>
            <div className="flex flex-wrap gap-[10px]">
              <Link href={`/console/enquiries?id=${sent}`} className="inline-flex h-[40px] items-center gap-[8px] rounded-[7px] bg-cs-green px-[16px] text-[13px] font-medium text-white">Open enquiry {sent} <ArrowRight className="size-[15px]" /></Link>
              <Btn onClick={() => setEnq(null)}>Keep browsing</Btn>
            </div>
          </div>
        ) : (
          <form className="space-y-[12px]" onSubmit={(e) => {
            e.preventDefault();
            if (!enq || !form.product.trim()) return;
            let id = "";
            update((d) => { id = marketEnquiry(d, { name: form.product.trim(), img: "/console/p-multivitamin.jpg", qty: parseInt(form.qty.replace(/\D/g, ""), 10) || enq.moq, message: form.msg, unit: enq }); });
            toast(`Enquiry ${id} sent`);
            setSent(id);
          }}>
            <Field label="Product"><input className={inputCls} value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} required /></Field>
            <Field label="Quantity (units)"><input className={inputCls} inputMode="numeric" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></Field>
            <Field label="Message"><textarea className={cn(textareaCls, "h-[80px]")} value={form.msg} onChange={(e) => setForm({ ...form, msg: e.target.value })} /></Field>
            <Btn kind="primary" type="submit" className="w-full">Send enquiry</Btn>
          </form>
        )}
      </Modal>
      <Modal open={!!diy} onClose={() => setDiy(null)} title="Scouthru, do it for me">
        <div className="space-y-[12px] text-[13.5px]">
          <p>A Scouthru sourcing manager takes it from here: shortlists Unit {diy?.code} and two alternates, gets frozen quotes, arranges samples and runs the order under <b>Scouthru Assured</b>.</p>
          <p className="text-cs-ink-2">You approve the sample and the price. We handle production follow-up, QC and dispatch.</p>
          <Btn kind="primary" icon={Headset} className="w-full" onClick={() => { if (!diy) return; update((d) => assistedSourcing(d, diy)); toast("Request received. A sourcing manager will call you within 2 working hours."); setDiy(null); }}>Request a call back</Btn>
        </div>
      </Modal>
    </div>
  );
}
