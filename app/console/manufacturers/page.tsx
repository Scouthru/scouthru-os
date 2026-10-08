"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown, ArrowUp, Bookmark, BookmarkCheck, BookmarkMinus, Building2, CheckCircle2, Clock3, ExternalLink, FileText, Gauge, List, Mail, MapPin, MoreHorizontal,
  Phone, Plus, Send, ShieldCheck, Star, Truck, Users, X,
} from "lucide-react";
import { Btn, Check, Empty, Field, FilterSelect, Hero, Menu, Modal, Pill, RowMenu, SearchBox, StatStrip, Tabs, inputCls, textareaCls } from "@/components/console/kit";
import { useConsole } from "@/lib/console/store";
import { messageMany, setShortlist, toggleShortlist } from "@/lib/console/actions-sourcing";
import type { ConsoleState, Manufacturer } from "@/lib/console/types";
import { cn } from "@/lib/cn";

const fmtNum = (n: number) => Math.round(n).toLocaleString("en-US");
const SEL = "[&_select]:pl-[8px] [&_select]:pr-[18px] [&_select]:text-[11px] [&_svg]:right-[5px] [&_svg]:size-[13px]";
const COLS = "grid-cols-[28px_minmax(0,199fr)_minmax(0,82fr)_minmax(0,119fr)_minmax(0,125fr)_minmax(0,67fr)_minmax(0,103fr)_30px]";

const MOQ_RANGES: Record<string, (n: number) => boolean> = {
  "Up to 10,000": (n) => n <= 10000,
  "Up to 25,000": (n) => n <= 25000,
  "Up to 50,000": (n) => n <= 50000,
  "Above 50,000": (n) => n > 50000,
};
const CAT_IMG: Record<string, string> = { Capsules: "/console/cat-capsules.jpg", Tablets: "/console/cat-tablets.jpg", Powders: "/console/cat-powders.jpg", Gummies: "/console/cat-gummies.jpg" };
const PANEL_IMG: Record<string, string> = { nutralab: "/console/mfr-panel-nutralab.jpg" };

/** Manufacturers that have priced any enquiry. */
const quotedIds = (s: ConsoleState) => new Set(s.enquiries.flatMap((e) => e.quotes.map((q) => q.mfrId)));
const respDays = (m: Manufacturer) => `${m.responseDays[0]}-${m.responseDays[1]} days`;
function kind(m: Manufacturer) {
  const c = m.capabilities.join(" ");
  if (/Personal Care|Liquids/.test(c) && !/Capsules|Tablets/.test(c)) return "Personal Care Manufacturer";
  if (/Functional Foods|Organic/.test(c)) return "Functional & Organic Foods Manufacturer";
  if (/Herbal/.test(c)) return "Herbal & Ayurvedic Manufacturer";
  return "Nutraceutical & Supplement Manufacturer";
}
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export default function ManufacturersPage() {
  return (
    <Suspense>
      <Manufacturers />
    </Suspense>
  );
}

type TabKey = "all" | "shortlisted" | "contacted" | "quoted";

function Manufacturers() {
  const { s, update, toast } = useConsole();
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [cert, setCert] = useState("");
  const [loc, setLoc] = useState("");
  const [moq, setMoq] = useState("");
  const [cap, setCap] = useState("");
  const [sort, setSort] = useState("");
  const [compact, setCompact] = useState(false);
  const [bulk, setBulk] = useState<Set<string>>(new Set());
  const [selId, setSelId] = useState<string | null>(params.get("id"));
  const [panelOpen, setPanelOpen] = useState(true);
  const [profile, setProfile] = useState<string | null>(null);
  const [msgTo, setMsgTo] = useState<string[] | null>(null);

  useEffect(() => {
    const id = params.get("id");
    if (id) { setSelId(id); setPanelOpen(true); }
  }, [params]);

  const quoted = useMemo(() => quotedIds(s), [s]);
  const inTab = (m: Manufacturer, k: TabKey) => (k === "shortlisted" ? m.shortlisted : k === "contacted" ? m.contacted : k === "quoted" ? quoted.has(m.id) : true);
  const count = (k: TabKey) => s.manufacturers.filter((m) => inTab(m, k)).length;

  const opts = useMemo(() => ({
    cats: Array.from(new Set(s.manufacturers.flatMap((m) => m.capabilities))).sort(),
    certs: Array.from(new Set(s.manufacturers.flatMap((m) => m.certs))).sort(),
    locs: Array.from(new Set(s.manufacturers.map((m) => m.state))).sort(),
    caps: Array.from(new Set(s.manufacturers.map((m) => `${m.unitsPerMonth} units/month`))).sort(),
  }), [s.manufacturers]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const rows = s.manufacturers.filter((m) => {
      if (!inTab(m, tab)) return false;
      if (cat && !m.capabilities.includes(cat)) return false;
      if (cert && !m.certs.includes(cert)) return false;
      if (loc && m.state !== loc) return false;
      if (moq && !MOQ_RANGES[moq](m.moq)) return false;
      if (cap && `${m.unitsPerMonth} units/month` !== cap) return false;
      if (t && ![m.name, m.city, m.state, m.capabilities.join(" "), m.certs.join(" ")].some((x) => x.toLowerCase().includes(t))) return false;
      return true;
    });
    return rows.sort((a, b) =>
      sort === "Rating" ? b.rating - a.rating
        : sort === "Response Time" ? a.responseDays[0] - b.responseDays[0] || a.responseDays[1] - b.responseDays[1]
          : sort === "Min. MOQ" ? a.moq - b.moq
            : b.rating - a.rating || b.reviews - a.reviews,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.manufacturers, quoted, tab, q, cat, cert, loc, moq, cap, sort]);

  const sel = s.manufacturers.find((m) => m.id === selId) ?? (selId === null ? list[0] : undefined) ?? null;
  const showPanel = panelOpen && !!sel;
  const select = (id: string) => { setSelId(id); setPanelOpen(true); router.replace(`/console/manufacturers?id=${id}`, { scroll: false }); };

  const ms = s.manufacturers;
  const fastest = ms.slice().sort((a, b) => a.avgResponse - b.avgResponse)[0];
  const best = ms.slice().sort((a, b) => b.onTime - a.onTime)[0];
  const top = ms.slice().sort((a, b) => b.rating - a.rating)[0];
  // The row open in the panel shows ticked (as in the mockup) and is included in bulk actions.
  const picked = new Set([...bulk, ...(showPanel && sel ? [sel.id] : [])]);
  const allChecked = list.length > 0 && list.every((m) => picked.has(m.id));

  const shortlistToggle = (m: Manufacturer) => { update((d) => toggleShortlist(d, m.id)); toast(m.shortlisted ? `${m.name} removed from shortlist` : `${m.name} added to shortlist`); };

  return (
    <div>
      <div className="[&_h1]:text-[48px] [&_h1+p]:mt-[6px] [&_h1+p]:text-[17px]">
      <Hero
        eyebrow="DISCOVER · COMPARE · PARTNER"
        title="Manufacturers"
        lede={<>Discover, compare, and manage verified manufacturing partners.<br />Find the right capabilities, get quotes, and build long-term partnerships.</>}
        img="/console/hero-manufacturers.jpg"
        quote={["Trusted", "manufacturing", "partners for", "global brands."]}
        height={160}
        quoteTop={32}
        quoteWidth={160}
      />
      </div>

      <div className="px-[14px] pb-[16px]">
        <div className="[&>section]:py-[11px] [&>section_p+p]:mt-[4px]">
        <StatStrip
          items={[
            { icon: Users, tone: "green", value: ms.length, label: "Verified Partners", delta: <span className="flex items-center gap-[4px]"><ArrowUp className="size-[13px]" strokeWidth={2} />{ms.filter((m) => m.contacted).length} contacted so far</span> },
            { icon: Bookmark, tone: "orange", value: count("shortlisted"), label: "Active Shortlists", delta: <span className="flex items-center gap-[4px]"><ArrowUp className="size-[13px]" strokeWidth={2} />{quoted.size} have sent quotes</span> },
            { icon: Clock3, tone: "green", value: `${avg(ms.map((m) => m.avgResponse)).toFixed(1)} days`, label: "Avg. Response Time", delta: <span className="flex items-center gap-[4px]"><ArrowDown className="size-[13px]" strokeWidth={2} />Fastest: {fastest?.short} {fastest?.avgResponse}d</span> },
            { icon: Truck, tone: "blue", value: `${Math.round(avg(ms.map((m) => m.onTime)))}%`, label: "On-Time Delivery", delta: <span className="flex items-center gap-[4px]"><ArrowUp className="size-[13px]" strokeWidth={2} />Best: {best?.short} {best?.onTime}%</span> },
            { icon: ShieldCheck, tone: "orange", value: `${avg(ms.map((m) => m.rating)).toFixed(1)} / 5`, label: "Avg. Quality Score", delta: <span className="flex items-center gap-[4px]"><ArrowUp className="size-[13px]" strokeWidth={2} />Top: {top?.short} {top?.rating}</span> },
          ]}
        />
        </div>

        <div className={cn("mt-[13px] grid gap-[13px]", showPanel ? "items-stretch min-[1024px]:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]" : "items-start")}>
          <section className="cs-card flex min-w-0 flex-col pt-[13px]">
            <div className="flex items-start justify-between gap-3 px-[15px]">
              <div>
                <h2 className="serif text-[22px] font-semibold leading-tight tracking-[-0.025em]">Manufacturer Directory</h2>
                <p className="text-[13px] text-cs-ink-2">Search and filter verified manufacturing partners based on your requirements.</p>
              </div>
              {!showPanel && <Link href="/console/enquiries?new=1" className="flex h-[32px] items-center gap-[6px] rounded-[6px] bg-cs-green px-[11px] text-[12px] font-medium text-white"><Plus className="size-[14px]" />New Enquiry</Link>}
            </div>
            <div className="flex flex-wrap items-center gap-[7px] px-[15px] pt-[16px]">
              <SearchBox value={q} onChange={setQ} placeholder="Search by manufacturer name, location, or capability..." className="min-w-[160px] flex-1 [&_input]:text-[11.5px]" />
              <FilterSelect label="Category" value={cat} options={opts.cats} onChange={setCat} className={cn("w-[75px]", SEL)} />
              <FilterSelect label="Certifications" value={cert} options={opts.certs} onChange={setCert} className={cn("w-[93px]", SEL)} />
              <FilterSelect label="Location" value={loc} options={opts.locs} onChange={setLoc} className={cn("w-[74px]", SEL)} />
              <FilterSelect label="MOQ" value={moq} options={Object.keys(MOQ_RANGES)} onChange={setMoq} className={cn("w-[55px]", SEL)} />
              <FilterSelect label="Capacity" value={cap} options={opts.caps} onChange={setCap} className={cn("w-[71px]", SEL)} />
              <button type="button" aria-label="Compact rows" aria-pressed={compact} title={compact ? "Comfortable rows" : "Compact rows"} onClick={() => setCompact((c) => !c)} className={cn("grid size-[34px] place-items-center rounded-[6px] border", compact ? "border-cs-green bg-cs-mint text-cs-green" : "border-cs-line bg-white text-[#2f3431]")}>
                <List className="size-[17px]" strokeWidth={1.8} />
              </button>
            </div>

            <div className="mt-[17px] flex items-end justify-between gap-3 border-b border-cs-line px-[12px]">
              <Tabs
                className="border-b-0"
                value={tab}
                onChange={(k) => { setTab(k); setBulk(new Set()); }}
                tabs={[
                  { key: "all", label: `All Manufacturers (${count("all")})` },
                  { key: "shortlisted", label: `Shortlisted (${count("shortlisted")})` },
                  { key: "contacted", label: `Contacted (${count("contacted")})` },
                  { key: "quoted", label: `Quoted (${count("quoted")})` },
                ]}
              />
              <label className="mb-[7px] flex items-center gap-[10px] text-[11.5px] text-cs-ink-2">
                Sort by
                <FilterSelect label="Relevance" value={sort} options={["Rating", "Response Time", "Min. MOQ"]} onChange={setSort} className={cn("w-[102px] [&_select]:font-normal [&_select]:text-cs-ink", SEL)} />
              </label>
            </div>

            {bulk.size > 0 && (
              <div className="mx-[12px] mt-[8px] flex items-center gap-[8px] rounded-[7px] bg-cs-mint px-[10px] py-[5px] text-[12px]">
                <span className="font-semibold text-cs-green">{picked.size} selected</span>
                <button type="button" className="rounded-[5px] border border-cs-line bg-white px-[8px] py-[3px] font-medium" onClick={() => { update((d) => setShortlist(d, [...picked], true)); toast(`${picked.size} added to shortlist`); setBulk(new Set()); }}>Shortlist</button>
                <button type="button" className="rounded-[5px] border border-cs-line bg-white px-[8px] py-[3px] font-medium" onClick={() => { update((d) => setShortlist(d, [...picked], false)); toast(`${picked.size} removed from shortlist`); setBulk(new Set()); }}>Remove from shortlist</button>
                <button type="button" className="rounded-[5px] border border-cs-line bg-white px-[8px] py-[3px] font-medium" onClick={() => setMsgTo([...picked])}>Message</button>
                <button type="button" className="px-[4px] text-cs-ink-2 hover:text-cs-ink" onClick={() => setBulk(new Set())}>Clear</button>
              </div>
            )}

            <div className={cn("mx-[8px] mt-[2px] grid items-center py-[10px] pl-[10px] text-[11.5px] font-medium text-[#3e4440]", COLS)}>
              <Check checked={allChecked} onChange={(on) => setBulk(on ? new Set(list.map((m) => m.id)) : new Set())} label="Select all" />
              <span>Manufacturer</span><span>Location</span><span>Certifications</span><span>Capabilities</span><span>Min. MOQ</span><span>Response Time</span><span />
            </div>
            <ul className={cn("overflow-y-auto px-[8px] pb-[8px]", showPanel ? "min-h-[300px] shrink grow basis-0" : "max-h-[640px]")}>
              {list.map((m) => {
                const on = showPanel && sel?.id === m.id;
                const fast = m.responseDays[1] <= 2;
                return (
                  <li
                    key={m.id}
                    onClick={() => select(m.id)}
                    className={cn("grid cursor-pointer items-center rounded-[8px] border pl-[10px]", COLS, compact ? "py-[5px]" : "py-[7px]", on ? "border-[1.5px] border-cs-green-2 bg-[#fbfdfb]" : "border-transparent border-b-cs-line hover:bg-[#fbfaf7]")}
                  >
                    <Check checked={picked.has(m.id)} onChange={(v) => setBulk((b) => { const n = new Set(b); const add = on ? !b.has(m.id) : v; if (add) n.add(m.id); else n.delete(m.id); return n; })} label={`Select ${m.name}`} />
                    <div className="flex min-w-0 items-center gap-[12px]">
                      {!compact && <Image src={m.img} alt="" width={96} height={96} className="size-[46px] shrink-0 rounded-[6px] object-cover" />}
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-[#1d211e]" title={m.shortlisted ? `${m.name} (shortlisted)` : m.name}>{m.name}</p>
                        <p className="mt-[3px] flex items-center gap-[4px] text-[11.5px]"><Star className="size-[12px] fill-cs-amber text-cs-amber" />{m.rating} <span className="text-cs-ink-2">({m.reviews})</span></p>
                      </div>
                    </div>
                    <span className="flex items-start gap-[3px] text-[10.5px] leading-[1.35] tracking-[-0.01em] text-[#3e4440]"><MapPin className="mt-[1px] size-[12px] shrink-0" /><span>{m.state},<br />India</span></span>
                    <span className="flex flex-wrap items-center gap-[5px]">
                      {m.certs.slice(0, 2).map((c) => <span key={c} className="rounded-[4px] bg-[#f1f0ec] px-[6px] py-[3px] text-[10px] text-[#3e4440]">{c}</span>)}
                      {m.certs.length > 2 && <span title={m.certs.slice(2).join(", ")} className="rounded-[4px] bg-[#f1f0ec] px-[6px] py-[3px] text-[10px] text-[#3e4440]">+{m.certs.length - 2}</span>}
                    </span>
                    <span className="line-clamp-2 pr-2 text-[11px] leading-[1.35] text-cs-ink-2">{m.capabilities.join(", ")}</span>
                    <span className="leading-tight"><span className="block text-[12.5px]">{fmtNum(m.moq)}</span><span className="text-[11px] text-cs-ink-2">units</span></span>
                    <span><span className={cn("inline-block rounded-[5px] px-[12px] py-[5px] text-[11px] font-medium", fast ? "bg-cs-mint text-cs-green-2" : "bg-cs-orange-bg text-[#b8641f]")}>{respDays(m)}</span></span>
                    <RowMenu
                      items={[
                        { label: "View profile", icon: ExternalLink, onClick: () => setProfile(m.id) },
                        { label: m.shortlisted ? "Remove from shortlist" : "Add to shortlist", icon: m.shortlisted ? BookmarkMinus : Bookmark, onClick: () => shortlistToggle(m) },
                        { label: "Message", icon: Send, onClick: () => setMsgTo([m.id]) },
                        { label: "Start an enquiry", icon: Plus, onClick: () => router.push("/console/enquiries?new=1") },
                      ]}
                    />
                  </li>
                );
              })}
              {list.length === 0 && <Empty>No manufacturers match these filters. <button type="button" className="font-medium text-cs-green underline" onClick={() => { setQ(""); setCat(""); setCert(""); setLoc(""); setMoq(""); setCap(""); setTab("all"); }}>Clear filters</button></Empty>}
            </ul>
          </section>

          {showPanel && sel && (
            <MfrPanel
              key={sel.id}
              m={sel}
              onClose={() => { setPanelOpen(false); router.replace("/console/manufacturers", { scroll: false }); }}
              onProfile={() => setProfile(sel.id)}
              onShortlist={() => shortlistToggle(sel)}
              onMessage={() => setMsgTo([sel.id])}
            />
          )}
        </div>
      </div>

      {profile && <ProfileModal id={profile} onClose={() => setProfile(null)} onMessage={() => { setMsgTo([profile]); setProfile(null); }} />}
      {msgTo && <MessageModal ids={msgTo} onClose={() => setMsgTo(null)} onSent={() => setBulk(new Set())} />}
    </div>
  );
}

/* ------------------------------------------------------------------ panel */

function MfrPanel({ m, onClose, onProfile, onShortlist, onMessage }: { m: Manufacturer; onClose: () => void; onProfile: () => void; onShortlist: () => void; onMessage: () => void }) {
  const { s } = useConsole();
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "capabilities" | "compliance" | "products" | "reviews">("overview");
  const products = s.products.filter((p) => p.mfrId === m.id);
  const ms = s.manufacturers;
  const net = { onTime: avg(ms.map((x) => x.onTime)), issues: avg(ms.map((x) => x.qualityIssues)), resp: avg(ms.map((x) => x.avgResponse)), rating: avg(ms.map((x) => x.rating)) };
  const pct = (a: number, b: number) => Math.round(Math.abs((a - b) / b) * 100);

  return (
    <aside className="cs-card min-w-0 overflow-hidden">
      <div className="px-[15px] pt-[6px]">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Close panel" onClick={onClose} className="-ml-[4px] grid size-[26px] place-items-center rounded-[6px] hover:bg-[#f1f0ec]"><X className="size-[17px]" /></button>
          <Menu
            items={[
              { label: "View full profile", icon: ExternalLink, onClick: onProfile },
              { label: m.shortlisted ? "Remove from shortlist" : "Add to shortlist", icon: Bookmark, onClick: onShortlist },
              { label: "Message", icon: Send, onClick: onMessage },
              "sep",
              { label: "Start an enquiry", icon: Plus, onClick: () => router.push("/console/enquiries?new=1") },
            ]}
            trigger={<span role="button" aria-label="Manufacturer actions" className="grid size-[26px] cursor-pointer place-items-center rounded-[6px] hover:bg-[#f1f0ec]"><MoreHorizontal className="size-[18px]" /></span>}
          />
        </div>
        <div className="mt-[4px] flex gap-[16px]">
          <Image src={PANEL_IMG[m.id] ?? m.img} alt={`${m.name} facility`} width={256} height={202} className="h-[80px] w-[130px] shrink-0 rounded-[7px] object-cover" />
          <div className="min-w-0">
            <span className="inline-flex items-center gap-[5px] rounded-[5px] bg-cs-mint px-[8px] py-[3px] text-[11px] font-medium text-cs-green-2"><CheckCircle2 className="size-[12px] fill-cs-green-2 text-white" />Verified Partner</span>
            <h2 className="serif mt-[4px] text-[19px] font-semibold leading-[1.15] tracking-[-0.025em]">{m.name}</h2>
            <p className="mt-[2px] text-[12.5px] text-cs-ink-2">{kind(m)}</p>
            <p className="mt-[3px] flex items-center gap-[5px] text-[12px]"><Star className="size-[13px] fill-cs-amber text-cs-amber" /><b className="font-semibold">{m.rating}</b><span className="text-cs-ink-2">({m.reviews} reviews)</span></p>
            <p className="mt-[2px] flex items-center gap-[5px] text-[12px] text-[#3e4440]"><MapPin className="size-[13px]" />{m.state}, India</p>
          </div>
        </div>
        <div className="mt-[12px] grid grid-cols-3 gap-[8px] [&_button]:h-[36px] [&_svg]:shrink-0">
          <Btn kind="primary" icon={ExternalLink} onClick={onProfile} className="px-[8px] text-[12px]">View Profile</Btn>
          <Btn icon={m.shortlisted ? BookmarkCheck : Bookmark} onClick={onShortlist} aria-pressed={m.shortlisted} className={cn("px-[8px] text-[12px]", m.shortlisted && "border-cs-green-2 text-cs-green")}>{m.shortlisted ? "Shortlisted" : "Add to Shortlist"}</Btn>
          <Btn icon={Send} onClick={onMessage} className="px-[8px] text-[12px]">Message</Btn>
        </div>
        <Tabs
          size="sm"
          className="mt-[10px] gap-[2px] [&_button]:px-[8px] [&_button]:text-[12px]"
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "overview", label: "Overview" },
            { key: "capabilities", label: "Capabilities" },
            { key: "compliance", label: "Compliance" },
            { key: "products", label: `Products (${products.length})` },
            { key: "reviews", label: `Reviews (${m.reviews})` },
          ]}
        />
      </div>

      <div className="px-[15px] pb-[6px] pt-[10px]">
        {tab === "overview" && (
          <>
            <h3 className="serif text-[16px] font-semibold leading-[20px]">About</h3>
            <p className="mt-[1px] text-[12px] leading-[1.3] text-[#3e4440]">{m.about}</p>
            <Facts m={m} />
            <SectionHead title="Product Categories" onAll={() => setTab("capabilities")} />
            <div className="mt-[7px] grid grid-cols-4 gap-[6px]">
              {m.categories.slice(0, 4).map((c) => (
                <div key={c} className="flex items-center gap-[5px] rounded-[7px] border border-cs-line px-[4px] py-[5px]">
                  {CAT_IMG[c] ? <Image src={CAT_IMG[c]} alt="" width={96} height={84} className="h-[34px] w-[34px] shrink-0 object-contain" /> : <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[5px] bg-cs-mint text-cs-green"><Building2 className="size-[16px]" /></span>}
                  <span className="truncate text-[10.5px]">{c}</span>
                </div>
              ))}
            </div>
            <h3 className="serif mt-[10px] text-[16px] font-semibold leading-[20px]">Certifications &amp; Compliance</h3>
            <div className="mt-[6px] flex flex-wrap gap-[6px]">
              {m.certs.map((c) => <span key={c} className="rounded-[5px] bg-[#f1f0ec] px-[10px] py-[4px] text-[11px] text-[#3e4440]">{certLabel(c)}</span>)}
            </div>
            <div className="mt-[10px] flex items-center justify-between">
              <h3 className="serif text-[16px] font-semibold leading-[20px]">Recent Performance</h3>
              <span className="text-[11px] text-cs-ink-2">vs. network average</span>
            </div>
            <div className="mt-[6px] grid grid-cols-4 gap-[6px]">
              <Perf icon={Truck} value={`${m.onTime}%`} label="On-Time Delivery" good={m.onTime >= net.onTime} delta={pct(m.onTime, net.onTime)} />
              <Perf icon={ShieldCheck} value={`${m.qualityIssues}%`} label="Quality Issues" good={m.qualityIssues <= net.issues} delta={pct(m.qualityIssues, net.issues)} invert />
              <Perf icon={FileText} value={`${m.avgResponse} days`} label="Avg. Response" good={m.avgResponse <= net.resp} delta={pct(m.avgResponse, net.resp)} invert />
              <Perf icon={Star} value={`${m.rating} / 5`} label="Customer Rating" good={m.rating >= net.rating} delta={pct(m.rating, net.rating)} />
            </div>
            <SectionHead title={`Active Products (${products.length})`} onAll={() => setTab("products")} />
            <div className="mt-[5px] grid grid-cols-5 gap-[6px]">
              {products.slice(0, 5).map((p) => (
                <Link key={p.id} href={`/console/products?id=${p.id}`} className="group text-center">
                  <Image src={p.img} alt="" width={156} height={92} className="h-[43px] w-full rounded-[5px] object-cover" />
                  <span className="mt-[3px] line-clamp-2 text-[10px] leading-[1.25] group-hover:text-cs-green">{p.name}</span>
                </Link>
              ))}
              {products.length === 0 && <p className="col-span-5 text-[12px] text-cs-ink-2">No products made here yet.</p>}
            </div>
          </>
        )}

        {tab === "capabilities" && (
          <div className="space-y-[12px] text-[12.5px]">
            <div>
              <p className="font-semibold">What they make</p>
              <div className="mt-[6px] flex flex-wrap gap-[6px]">{m.capabilities.map((c) => <span key={c} className="rounded-[5px] bg-cs-mint px-[10px] py-[4px] text-[11.5px] text-cs-green">{c}</span>)}</div>
            </div>
            <div>
              <p className="font-semibold">Product categories</p>
              <div className="mt-[6px] flex flex-wrap gap-[6px]">{m.categories.map((c) => <span key={c} className="rounded-[5px] bg-[#f1f0ec] px-[10px] py-[4px] text-[11.5px]">{c}</span>)}</div>
            </div>
            <dl className="grid grid-cols-2 gap-[8px]">
              {[["Minimum order", `${fmtNum(m.moq)} units`], ["Monthly capacity", `${m.unitsPerMonth} units`], ["Facility", `${m.sqft} sq ft`], ["Typical reply", respDays(m)], ["Experience", `${m.years}+ years`], ["Brands served", `${m.brands}+`]].map(([k, v]) => (
                <div key={k} className="rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-[11px] text-cs-ink-2">{k}</dt><dd className="font-semibold">{v}</dd></div>
              ))}
            </dl>
          </div>
        )}

        {tab === "compliance" && (
          <ul className="divide-y divide-cs-line">
            {m.certs.map((c) => (
              <li key={c} className="flex items-center gap-[10px] py-[9px]">
                <span className="grid size-[32px] place-items-center rounded-[7px] bg-cs-mint text-cs-green"><ShieldCheck className="size-[16px]" /></span>
                <div className="flex-1"><p className="text-[12.5px] font-semibold">{certLabel(c)}</p><p className="text-[11px] text-cs-ink-2">Certificate checked by Scouthru during onboarding</p></div>
                <Pill tone="green">Valid</Pill>
              </li>
            ))}
          </ul>
        )}

        {tab === "products" && (
          <ul className="divide-y divide-cs-line">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/console/products?id=${p.id}`} className="flex items-center gap-[10px] py-[8px] hover:text-cs-green">
                  <Image src={p.img} alt="" width={80} height={80} className="size-[40px] rounded-[6px] object-cover" />
                  <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-semibold">{p.name}</p><p className="text-[11px] text-cs-ink-2">{p.id} · MOQ {fmtNum(p.moq)}</p></div>
                  <Pill tone={p.stage === "Active" || p.stage === "Approved" ? "green" : p.stage === "In Production" ? "blue" : "gray"}>{p.stage}</Pill>
                </Link>
              </li>
            ))}
            {products.length === 0 && <Empty>No products made with {m.short} yet.</Empty>}
          </ul>
        )}

        {tab === "reviews" && <Reviews m={m} />}
      </div>
    </aside>
  );
}

const certLabel = (c: string) => (c === "GMP" ? "GMP Certified" : c === "FSSAI" ? "FSSAI Approved" : c);

function SectionHead({ title, onAll }: { title: string; onAll: () => void }) {
  return (
    <div className="mt-[10px] flex items-center justify-between">
      <h3 className="serif text-[16px] font-semibold leading-[20px]">{title}</h3>
      <button type="button" onClick={onAll} className="flex items-center gap-[6px] text-[12px] font-medium text-[#2f3431] hover:text-cs-green">View All <span aria-hidden>→</span></button>
    </div>
  );
}

function Facts({ m }: { m: Manufacturer }) {
  const items: [typeof Clock3, string, string][] = [[Clock3, `${m.years}+`, "Years Experience"], [Users, `${m.brands}+`, "Global Brands"], [Gauge, m.unitsPerMonth, "Units/Month"], [MapPin, m.sqft, "Sq. Ft. Facility"]];
  return (
    <div className="mt-[9px] grid grid-cols-4 border-y border-cs-line py-[6px]">
      {items.map(([Icon, v, l], i) => (
        <div key={l} className={cn("flex items-center gap-[7px] px-[7px]", i > 0 && "border-l border-cs-line")}>
          <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-cs-mint text-cs-green-2"><Icon className="size-[14px]" strokeWidth={1.7} /></span>
          <span className="min-w-0 leading-tight"><span className="serif block text-[14px] font-semibold">{v}</span><span className="block whitespace-nowrap text-[8.5px] leading-[1.15] tracking-[-0.01em] text-cs-ink-2">{l}</span></span>
        </div>
      ))}
    </div>
  );
}

function Perf({ icon: Icon, value, label, good, delta, invert }: { icon: typeof Truck; value: string; label: string; good: boolean; delta: number; invert?: boolean }) {
  const Arrow = (good ? !invert : invert) ? ArrowUp : ArrowDown;
  return (
    <div className="rounded-[8px] border border-cs-line px-[6px] py-[4px]">
      <div className="flex items-start gap-[5px]">
        <span className={cn("grid size-[24px] shrink-0 place-items-center rounded-full", label === "Customer Rating" ? "bg-cs-orange-bg text-cs-orange" : "bg-cs-mint text-cs-green-2")}><Icon className="size-[13px]" strokeWidth={1.7} /></span>
        <span className="min-w-0 leading-tight"><span className="block whitespace-nowrap text-[12.5px] font-semibold">{value}</span><span className="block whitespace-nowrap text-[8.5px] leading-[1.15] tracking-[-0.01em] text-cs-ink-2">{label}</span></span>
      </div>
      <span className={cn("ml-[29px] mt-[2px] inline-flex items-center gap-[2px] rounded-[4px] px-[5px] text-[10px] font-medium", good ? "bg-cs-mint text-cs-green-2" : "bg-cs-red-bg text-cs-red")}>
        <Arrow className="size-[10px]" strokeWidth={2.4} />{delta}%
      </span>
    </div>
  );
}

function Reviews({ m }: { m: Manufacturer }) {
  // Star split derived from the average so the bars always agree with the rating shown.
  const five = Math.max(0, Math.min(95, Math.round((m.rating - 4) * 100)));
  const three = m.rating >= 4.5 ? 2 : 5;
  const split: [number, number][] = [[5, five], [4, 100 - five - three], [3, three], [2, 0], [1, 0]];
  return (
    <div>
      <div className="flex items-center gap-[16px]">
        <div className="text-center">
          <p className="serif text-[36px] font-semibold leading-none">{m.rating}</p>
          <p className="mt-[4px] flex justify-center gap-[1px]">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn("size-[12px]", i <= Math.round(m.rating) ? "fill-cs-amber text-cs-amber" : "text-[#d6d8d3]")} />)}</p>
          <p className="mt-[3px] text-[11px] text-cs-ink-2">{m.reviews} reviews</p>
        </div>
        <div className="flex-1 space-y-[4px]">
          {split.map(([st, p]) => (
            <div key={st} className="flex items-center gap-[8px] text-[11px]">
              <span className="w-[16px] text-cs-ink-2">{st}★</span>
              <span className="h-[6px] flex-1 overflow-hidden rounded-full bg-[#f1f0ec]"><span className="block h-full rounded-full bg-cs-green-2" style={{ width: `${p}%` }} /></span>
              <span className="w-[30px] text-right text-cs-ink-2">{p}%</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-[12px] text-[11.5px] text-cs-ink-2">Ratings come from brands that completed orders with {m.short} through Scouthru: on-time delivery, quality at inspection and communication.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ modals */

function ProfileModal({ id, onClose, onMessage }: { id: string; onClose: () => void; onMessage: () => void }) {
  const { s, update, toast } = useConsole();
  const m = s.manufacturers.find((x) => x.id === id);
  if (!m) return null;
  const enquiries = s.enquiries.filter((e) => e.responses.some((r) => r.mfrId === id));
  const orders = s.orders.filter((o) => o.mfrId === id);
  return (
    <Modal
      open
      onClose={onClose}
      width={720}
      title={m.name}
      sub={`${kind(m)} · ${m.city}, ${m.state}`}
      footer={<>
        <Btn icon={m.shortlisted ? BookmarkCheck : Bookmark} onClick={() => { update((d) => toggleShortlist(d, id)); toast(m.shortlisted ? `${m.name} removed from shortlist` : `${m.name} added to shortlist`); }}>{m.shortlisted ? "Shortlisted" : "Add to Shortlist"}</Btn>
        <Btn icon={Send} onClick={onMessage}>Message</Btn>
        <Link href="/console/enquiries?new=1" className="inline-flex h-[40px] items-center gap-[8px] rounded-[7px] bg-cs-green px-[16px] text-[13px] font-medium text-white"><Plus className="size-[16px]" />Start an enquiry</Link>
      </>}
    >
      <div className="grid gap-[18px] sm:grid-cols-[220px_1fr]">
        <div>
          <Image src={PANEL_IMG[m.id] ?? m.img} alt="" width={440} height={340} className="h-[170px] w-full rounded-[8px] object-cover" />
          <p className="mt-[10px] flex items-center gap-[5px] text-[13px]"><Star className="size-[14px] fill-cs-amber text-cs-amber" /><b>{m.rating}</b> <span className="text-cs-ink-2">({m.reviews} reviews)</span></p>
          <p className="mt-[4px] text-[12px] text-cs-ink-2">Replies in {respDays(m)} · {m.onTime}% on time</p>
          <p className="mt-[12px] text-[12px] font-semibold">Contacts</p>
          <ul className="mt-[6px] space-y-[8px]">
            {m.contacts.map((c) => (
              <li key={c.email} className="flex items-center gap-[8px]">
                <Image src={c.img} alt="" width={64} height={64} className="size-[32px] rounded-full" />
                <div className="min-w-0 flex-1 leading-tight"><p className="text-[12px] font-semibold">{c.name}</p><p className="text-[11px] text-cs-ink-2">{c.role}</p></div>
                <a href={`mailto:${c.email}`} aria-label={`Email ${c.name}`} className="grid size-[28px] place-items-center rounded-full bg-cs-mint text-cs-green"><Mail className="size-[13px]" /></a>
                <a href={`tel:${c.phone.replace(/\s/g, "")}`} aria-label={`Call ${c.name}`} className="grid size-[28px] place-items-center rounded-full bg-cs-mint text-cs-green"><Phone className="size-[13px]" /></a>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-[12px]">
          <p className="text-[13px] leading-[1.5] text-[#3e4440]">{m.about}</p>
          <Facts m={m} />
          <div>
            <p className="text-[12px] font-semibold">Capabilities</p>
            <div className="mt-[6px] flex flex-wrap gap-[6px]">{m.capabilities.map((c) => <span key={c} className="rounded-[5px] bg-cs-mint px-[9px] py-[3px] text-[11.5px] text-cs-green">{c}</span>)}</div>
          </div>
          <div>
            <p className="text-[12px] font-semibold">Certifications</p>
            <div className="mt-[6px] flex flex-wrap gap-[6px]">{m.certs.map((c) => <span key={c} className="rounded-[5px] bg-[#f1f0ec] px-[9px] py-[3px] text-[11.5px]">{certLabel(c)}</span>)}</div>
          </div>
          <div>
            <p className="text-[12px] font-semibold">Your work with {m.short}</p>
            <ul className="mt-[6px] space-y-[4px] text-[12px]">
              {enquiries.slice(0, 4).map((e) => <li key={e.id}><Link className="hover:text-cs-green" href={`/console/enquiries?id=${e.id}`}>{e.id} · {e.name}</Link> <span className="text-cs-ink-2">— {e.responses.find((r) => r.mfrId === id)?.status}</span></li>)}
              {orders.map((o) => <li key={o.id}><Link className="hover:text-cs-green" href={`/console/production?id=${o.id}`}>{o.id} · {o.name}</Link> <span className="text-cs-ink-2">— production order</span></li>)}
              {enquiries.length + orders.length === 0 && <li className="text-cs-ink-2">No enquiries or orders yet.</li>}
              {enquiries.length > 4 && <li className="text-cs-ink-2">+{enquiries.length - 4} more enquiries</li>}
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function MessageModal({ ids, onClose, onSent }: { ids: string[]; onClose: () => void; onSent: () => void }) {
  const { s, update, toast } = useConsole();
  const names = ids.map((id) => s.manufacturers.find((m) => m.id === id)?.name ?? id);
  const [subject, setSubject] = useState("Partnership enquiry from Scouthru Demo");
  const [body, setBody] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title={ids.length === 1 ? `Message ${names[0]}` : `Message ${ids.length} manufacturers`}
      sub={ids.length > 1 ? names.join(", ") : "Your message goes to their account manager."}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={Send} disabled={!subject.trim() || !body.trim()} onClick={() => {
        update((d) => messageMany(d, ids, subject.trim(), body.trim(), ids.length === 1 ? `/console/manufacturers?id=${ids[0]}` : "/console/manufacturers"));
        toast(ids.length === 1 ? `Message sent to ${names[0]}` : `Message sent to ${ids.length} manufacturers`);
        onSent();
        onClose();
      }}>Send message</Btn></>}
    >
      <div className="space-y-[12px]">
        <Field label="Subject"><input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Message"><textarea autoFocus className={textareaCls} rows={5} value={body} placeholder="Tell them what you want to make, quantities and timelines." onChange={(e) => setBody(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
