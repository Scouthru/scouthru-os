"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp, BarChart3, Check as CheckIcon, CheckCircle2, Copy, ExternalLink, FileText, FlaskConical, Heart, List, MapPin, MessageSquareMore, MoreHorizontal,
  Pencil, Plus, Send, Settings2, Star, Trash2, X,
} from "lucide-react";
import {
  Btn, Check, Empty, Field, FilterSelect, Hero, Menu, Modal, Pill, RowMenu, SearchBox, StatStrip, Tabs, inputCls, textareaCls, type Tone,
} from "@/components/console/kit";
import { useConsole } from "@/lib/console/store";
import { createEnquiry, requestSample, setEnquiryStage } from "@/lib/console/actions";
import { deleteEnquiry, duplicateEnquiry, editEnquiry, messageMany, toggleQuoteShortlist, toggleShortlist, toggleStep } from "@/lib/console/actions-sourcing";
import { PRODUCT_IMAGES } from "@/lib/console/seed";
import { ago, daysUntil, fmtDate, fmtDateTime, fmtDay } from "@/lib/console/format";
import type { ConsoleState, Enquiry, EnquiryStage, Manufacturer } from "@/lib/console/types";
import { cn } from "@/lib/cn";

const STAGES: EnquiryStage[] = ["Draft", "In Discussion", "Quote Received", "Samples Requested", "In Production", "Closed"];
const STAGE_TONE: Record<EnquiryStage, Tone> = {
  Draft: "gray", "In Discussion": "blue", "Quote Received": "violet", "Samples Requested": "orange", "In Production": "green", Closed: "gray",
};

type TabKey = "all" | "discussion" | "samples" | "production" | "closed";
const TAB_STAGES: Record<TabKey, EnquiryStage[] | null> = {
  all: null,
  discussion: ["In Discussion", "Quote Received", "Draft"],
  samples: ["Samples Requested"],
  production: ["In Production"],
  closed: ["Closed"],
};

const MOQ_RANGES: Record<string, [number, number]> = {
  "Under 25,000": [0, 24999],
  "25,000 – 50,000": [25000, 50000],
  "50,001 – 1,00,000": [50001, 100000],
  "Over 1,00,000": [100001, Infinity],
};
/** Empty value = the default "Last 30 Days" window, as the mockup shows it. */
const RANGE_DAYS: Record<string, number> = { "": 30, "Last 7 Days": 7, "Last 90 Days": 90, "All Time": Infinity };

/** Unit counts read like the mockup (100,000), not Indian grouping. */
const fmtNum = (n: number) => Math.round(n).toLocaleString("en-US");
const SEL = "[&_select]:pl-[9px] [&_select]:pr-[20px] [&_select]:text-[11px] [&_svg]:right-[6px] [&_svg]:size-[13px]";

const CATEGORIES = ["Supplements", "Skincare", "Food & Beverages", "Personal Care"];

const mfrOf = (s: ConsoleState, id: string) => s.manufacturers.find((m) => m.id === id);
const WIDE: Record<string, string> = { nutralab: "/console/f-nutralab.jpg", pureform: "/console/f-pureform.jpg", mahafresh: "/console/f-mahafresh.jpg" };
const RESP_TONE: Record<string, Tone> = { "Quote Received": "green", "Shared Proposal": "violet", "Awaiting Reply": "gray", Declined: "red" };

export default function EnquiriesPage() {
  return (
    <Suspense>
      <Enquiries />
    </Suspense>
  );
}

function Enquiries() {
  const { s, update, toast } = useConsole();
  const router = useRouter();
  const params = useSearchParams();

  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [cat, setCat] = useState("");
  const [stage, setStage] = useState("");
  const [moq, setMoq] = useState("");
  const [range, setRange] = useState("");
  const [sort, setSort] = useState("Last Updated");
  const [compact, setCompact] = useState(false);
  const [bulk, setBulk] = useState<Set<string>>(new Set());
  const [selId, setSelId] = useState<string | null>(params.get("id"));
  const [panelOpen, setPanelOpen] = useState(true);
  const [creating, setCreating] = useState(params.get("new") === "1");
  const [sampleFor, setSampleFor] = useState<{ enquiryId: string; mfrId?: string } | null>(null);
  const [messageFor, setMessageFor] = useState<string | null>(null);

  // Deep links (?id=, ?q=, ?new=1) also work when arriving from the search bar while already on this page.
  useEffect(() => {
    const id = params.get("id");
    if (id) { setSelId(id); setPanelOpen(true); setTab("all"); }
    const qq = params.get("q");
    if (qq !== null) setQ(qq);
    if (params.get("new") === "1") setCreating(true);
  }, [params]);

  const now = Date.now();
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const days = RANGE_DAYS[range];
    const rows = s.enquiries.filter((e) => {
      if (TAB_STAGES[tab] && !TAB_STAGES[tab]!.includes(e.stage)) return false;
      if (cat && e.category !== cat) return false;
      if (stage && e.stage !== stage) return false;
      if (moq) { const [a, b] = MOQ_RANGES[moq]; if (e.moq < a || e.moq > b) return false; }
      if (Number.isFinite(days) && now - new Date(e.updatedAt).getTime() > days * 864e5) return false;
      if (t) {
        const names = e.responses.map((r) => mfrOf(s, r.mfrId)?.name ?? "").join(" ");
        if (![e.name, e.id, e.category, names].some((x) => x.toLowerCase().includes(t))) return false;
      }
      return true;
    });
    return rows.sort((a, b) =>
      sort === "Target MOQ" ? b.moq - a.moq : sort === "Product Name" ? a.name.localeCompare(b.name) : sort === "Oldest" ? a.updatedAt.localeCompare(b.updatedAt) : b.updatedAt.localeCompare(a.updatedAt),
    );
  }, [s, tab, q, cat, stage, moq, range, sort, now]);

  const sel = s.enquiries.find((e) => e.id === selId) ?? (selId === null ? list[0] : undefined) ?? null;
  const showPanel = panelOpen && !!sel;

  const select = (id: string) => {
    setSelId(id);
    setPanelOpen(true);
    router.replace(`/console/enquiries?id=${id}`, { scroll: false });
  };

  const count = (k: TabKey) => (TAB_STAGES[k] ? s.enquiries.filter((e) => TAB_STAGES[k]!.includes(e.stage)).length : s.enquiries.length);
  const weekly = (k: TabKey) => s.enquiries.filter((e) => (!TAB_STAGES[k] || TAB_STAGES[k]!.includes(e.stage)) && now - new Date(e.updatedAt).getTime() < 7 * 864e5).length;
  const up = (n: number) => <span className="flex items-center gap-[4px]"><ArrowUp className="size-[13px]" strokeWidth={2} />{n} updated this week</span>;

  // The row open in the panel shows ticked (as in the mockup) and is included in bulk actions.
  const picked = new Set([...bulk, ...(showPanel && sel ? [sel.id] : [])]);
  const allChecked = list.length > 0 && list.every((e) => picked.has(e.id));
  const toggleBulk = (id: string, on: boolean) => setBulk((b) => { const n = new Set(b); if (on) n.add(id); else n.delete(id); return n; });

  const moveStage = (ids: string[], st: EnquiryStage) => {
    update((d) => ids.forEach((id) => setEnquiryStage(d, id, st)));
    toast(`${ids.length === 1 ? ids[0] : `${ids.length} enquiries`} moved to ${st}`);
  };

  return (
    <div>
      <div className="[&_h1]:text-[49px] [&_h1+p]:mt-[6px] [&_h1+p]:text-[17px]">
      <Hero
        eyebrow="SOURCE · MANAGE · FULFILL"
        title="Enquiries & RFQs"
        lede={<>Track, manage and convert your product enquiries into reliable manufacturing<br />partnerships. Get quotes, compare capabilities and move from idea to production.</>}
        img="/console/hero-enquiries.jpg"
        quote={["Turn enquiries", "into exceptional", "products."]}
        height={160}
        quoteTop={44}
        quoteWidth={184}
      />
      </div>

      <div className="px-[14px] pb-[16px]">
        <div className="[&>section]:py-[11px] [&>section_p+p]:mt-[4px]">
        <StatStrip
          items={[
            { icon: FileText, tone: "green", value: count("all"), label: "Total Enquiries", delta: up(weekly("all")) },
            { icon: MessageSquareMore, tone: "orange", value: count("discussion"), label: "In Discussion", delta: up(weekly("discussion")) },
            { icon: FlaskConical, tone: "orange", value: count("samples"), label: "Samples Requested", delta: up(weekly("samples")) },
            { icon: Settings2, tone: "blue", value: count("production"), label: "In Production", delta: up(weekly("production")) },
            { icon: CheckIcon, tone: "green", value: count("closed"), label: "Closed", delta: up(weekly("closed")) },
          ]}
        />
        </div>

        <div className={cn("mt-[13px] grid gap-[11px]", showPanel ? "items-stretch min-[1024px]:grid-cols-[minmax(0,1.83fr)_minmax(0,1fr)]" : "items-start")}>
          {/* list: beside the panel it takes the panel's height and scrolls inside */}
          <section className="cs-card flex min-w-0 flex-col pt-[15px]">
            <div className="flex items-end justify-between gap-3 px-[10px]">
              <Tabs
                className="flex-1 border-b-0"
                value={tab}
                onChange={(k) => { setTab(k); setBulk(new Set()); }}
                tabs={[
                  { key: "all", label: `All Enquiries (${count("all")})` },
                  { key: "discussion", label: `In Discussion (${count("discussion")})` },
                  { key: "samples", label: `Samples Requested (${count("samples")})` },
                  { key: "production", label: `In Production (${count("production")})` },
                  { key: "closed", label: `Closed (${count("closed")})` },
                ]}
              />
              <button type="button" onClick={() => setCreating(true)} className="mb-[8px] hidden h-[30px] items-center gap-[6px] rounded-[6px] bg-cs-green px-[11px] text-[12px] font-medium text-white hover:bg-[#163b29] min-[1024px]:flex" style={{ display: showPanel ? "none" : undefined }}>
                <Plus className="size-[14px]" /> New Enquiry
              </button>
            </div>
            <div className="border-t border-cs-line" />

            <div className="flex flex-wrap items-center gap-[8px] px-[13px] pt-[14px]">
              <SearchBox value={q} onChange={setQ} placeholder="Search by product, category or manufacturer..." className="min-w-[160px] flex-1 [&_input]:text-[11.5px]" />
              <FilterSelect label="Product Category" value={cat} options={CATEGORIES} onChange={setCat} className={cn("w-[124px]", SEL)} />
              <FilterSelect label="Stage" value={stage} options={STAGES} onChange={setStage} className={cn("w-[66px]", SEL)} />
              <FilterSelect label="Target MOQ" value={moq} options={Object.keys(MOQ_RANGES)} onChange={setMoq} className={cn("w-[96px]", SEL)} />
              <FilterSelect label="Last 30 Days" value={range} options={["Last 7 Days", "Last 90 Days", "All Time"]} onChange={setRange} className={cn("w-[100px]", SEL)} />
              <button
                type="button"
                aria-pressed={compact}
                aria-label="Compact rows"
                title={compact ? "Comfortable rows" : "Compact rows"}
                onClick={() => setCompact((c) => !c)}
                className={cn("grid size-[34px] place-items-center rounded-[6px] border", compact ? "border-cs-green bg-cs-mint text-cs-green" : "border-cs-line bg-white text-[#2f3431] hover:border-[#cfcac0]")}
              >
                <List className="size-[17px]" strokeWidth={1.8} />
              </button>
            </div>

            <div className="flex min-h-[44px] items-center justify-between gap-3 px-[13px] pt-[10px]">
              {bulk.size > 0 ? (
                <div className="flex items-center gap-[8px] rounded-[7px] bg-cs-mint px-[10px] py-[5px] text-[12px]">
                  <span className="font-semibold text-cs-green">{picked.size} selected</span>
                  <Menu
                    align="left"
                    items={STAGES.map((st) => ({ label: st, onClick: () => { moveStage([...picked], st); setBulk(new Set()); } }))}
                    trigger={<button type="button" className="rounded-[5px] border border-cs-line bg-white px-[8px] py-[3px] font-medium">Move to stage ▾</button>}
                  />
                  <button type="button" className="rounded-[5px] border border-cs-line bg-white px-[8px] py-[3px] font-medium" onClick={() => { moveStage([...picked], "Closed"); setBulk(new Set()); }}>Mark closed</button>
                  <button type="button" className="px-[4px] text-cs-ink-2 hover:text-cs-ink" onClick={() => setBulk(new Set())}>Clear</button>
                </div>
              ) : (
                <span className="text-[12px] text-cs-ink-2">{list.length === s.enquiries.length ? "" : `${list.length} of ${s.enquiries.length} shown`}</span>
              )}
              <label className="flex items-center gap-[10px] text-[11.5px] text-cs-ink-2">
                Sort by
                <FilterSelect label="Last Updated" value={sort === "Last Updated" ? "" : sort} options={["Oldest", "Target MOQ", "Product Name"]} onChange={(v) => setSort(v || "Last Updated")} className="w-[110px] [&_select]:font-normal [&_select]:text-cs-ink" />
              </label>
            </div>

            <div className={cn("mt-[5px] flex flex-col", showPanel && "min-h-0 shrink grow basis-0")}>
              <div className="mx-[8px] grid grid-cols-[28px_minmax(0,187fr)_minmax(0,89fr)_minmax(0,97fr)_minmax(0,90fr)_minmax(0,121fr)_minmax(0,113fr)_30px] items-center rounded-[6px] bg-[#faf9f5] py-[10px] pl-[10px] text-[11.5px] font-medium text-[#3e4440]">
                <Check checked={allChecked} onChange={(on) => setBulk(on ? new Set(list.map((e) => e.id)) : new Set())} label="Select all" />
                <span>Product &amp; Enquiry</span><span>Category</span><span>Manufacturers</span><span>Target MOQ</span><span>Stage</span><span>Last Update</span><span />
              </div>
              <ul className={cn("overflow-y-auto px-[8px] pb-[8px] pt-[2px]", showPanel ? "min-h-[300px] shrink grow basis-0" : "max-h-[640px]")}>
                {list.map((e) => {
                  const on = showPanel && sel?.id === e.id;
                  return (
                    <li
                      key={e.id}
                      onClick={() => select(e.id)}
                      className={cn(
                        "grid cursor-pointer grid-cols-[28px_minmax(0,187fr)_minmax(0,89fr)_minmax(0,97fr)_minmax(0,90fr)_minmax(0,121fr)_minmax(0,113fr)_30px] items-center rounded-[8px] border pl-[10px]",
                        compact ? "py-[5px]" : "py-[8px]",
                        on ? "border-[1.5px] border-cs-green-2 bg-[#fbfdfb]" : "border-transparent border-b-cs-line hover:bg-[#fbfaf7]",
                      )}
                    >
                      <Check checked={picked.has(e.id)} onChange={(v) => toggleBulk(e.id, on ? !bulk.has(e.id) : v)} label={`Select ${e.name}`} />
                      <div className="flex min-w-0 items-center gap-[10px]">
                        {!compact && <Image src={e.img} alt="" width={88} height={88} className="size-[42px] shrink-0 rounded-[6px] object-cover" />}
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-[11.5px] font-medium leading-[1.3] tracking-[-0.015em] text-[#1d211e]">{e.name}</p>
                          <p className="mt-[2px] text-[11px] text-cs-ink-2">{e.id}</p>
                        </div>
                      </div>
                      <span className="pr-2 text-[11px] leading-tight text-cs-ink-2">{e.category}</span>
                      <span className="leading-tight"><span className="block text-[12.5px]">{e.mfrCount}</span><span className="text-[11px] text-cs-ink-2">Manufacturers</span></span>
                      <span className="leading-tight"><span className="block text-[12.5px]">{fmtNum(e.moq)}</span><span className="text-[11px] text-cs-ink-2">units</span></span>
                      <span><Pill tone={STAGE_TONE[e.stage]} className="px-[8px] py-[4px] text-[10.5px]">{e.stage}</Pill></span>
                      <span className="leading-tight"><span className="block text-[11px]">{fmtDate(e.updatedAt)}</span><span className="text-[11px] text-cs-ink-2">{ago(e.updatedAt)}</span></span>
                      <RowMenu
                        items={[
                          { label: "Open", icon: ExternalLink, onClick: () => select(e.id) },
                          { label: "Request sample", icon: FlaskConical, onClick: () => setSampleFor({ enquiryId: e.id }), disabled: e.stage === "Closed" },
                          { label: "Message manufacturers", icon: Send, onClick: () => setMessageFor(e.id), disabled: e.responses.length === 0 },
                          { label: "Duplicate", icon: Copy, onClick: () => { let nid: string | null = null; update((d) => { nid = duplicateEnquiry(d, e.id); }); if (nid) { toast(`Duplicated as ${nid}`); select(nid); } } },
                          "sep",
                          { label: "Mark closed", icon: CheckCircle2, onClick: () => moveStage([e.id], "Closed"), disabled: e.stage === "Closed" },
                          ...(e.stage === "Draft" ? [{ label: "Delete draft", icon: Trash2, danger: true, onClick: () => { update((d) => deleteEnquiry(d, e.id)); toast(`Deleted ${e.id}`); if (selId === e.id) setSelId(null); } }] : []),
                        ]}
                      />
                    </li>
                  );
                })}
                {list.length === 0 && <Empty>No enquiries match these filters. <button type="button" className="font-medium text-cs-green underline" onClick={() => { setQ(""); setCat(""); setStage(""); setMoq(""); setRange("All Time"); setTab("all"); }}>Clear filters</button></Empty>}
              </ul>
            </div>
          </section>

          {showPanel && sel && (
            <EnquiryPanel
              key={sel.id}
              e={sel}
              onClose={() => { setPanelOpen(false); router.replace("/console/enquiries", { scroll: false }); }}
              onSample={(mfrId) => setSampleFor({ enquiryId: sel.id, mfrId })}
              onMessage={() => setMessageFor(sel.id)}
              onMove={(st) => moveStage([sel.id], st)}
              onDuplicate={() => { let nid: string | null = null; update((d) => { nid = duplicateEnquiry(d, sel.id); }); if (nid) { toast(`Duplicated as ${nid}`); select(nid); } }}
              onDelete={() => { update((d) => deleteEnquiry(d, sel.id)); toast(`Deleted ${sel.id}`); setSelId(null); }}
            />
          )}
        </div>
      </div>

      <CreateEnquiry
        open={creating}
        onClose={() => { setCreating(false); if (params.get("new")) router.replace("/console/enquiries", { scroll: false }); }}
        onCreated={(id, draft) => { setCreating(false); setTab("all"); setRange("All Time"); select(id); toast(draft ? `Draft ${id} saved` : `${id} sent to matched manufacturers`); }}
      />
      {sampleFor && <RequestSample key={sampleFor.enquiryId + (sampleFor.mfrId ?? "")} enquiryId={sampleFor.enquiryId} mfrId={sampleFor.mfrId} onClose={() => setSampleFor(null)} />}
      {messageFor && <MessageAll key={messageFor} enquiryId={messageFor} onClose={() => setMessageFor(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ panel */

function EnquiryPanel({ e, onClose, onSample, onMessage, onMove, onDuplicate, onDelete }: {
  e: Enquiry; onClose: () => void; onSample: (mfrId?: string) => void; onMessage: () => void; onMove: (st: EnquiryStage) => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const { s, update } = useConsole();
  const [tab, setTab] = useState<"overview" | "responses" | "quotes" | "activity">("overview");
  const [editing, setEditing] = useState(false);
  const responses = e.responses;

  return (
    <aside className="flex min-w-0 flex-col gap-[7px]">
      <div className="cs-card overflow-hidden">
      <div className="px-[18px] pt-[4px]">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Close panel" onClick={onClose} className="-ml-[4px] grid size-[26px] place-items-center rounded-[6px] hover:bg-[#f1f0ec]"><X className="size-[17px]" /></button>
          <Menu
            items={[
              { label: "Edit enquiry", icon: Pencil, onClick: () => { setEditing(true); setTab("overview"); } },
              { label: "Duplicate", icon: Copy, onClick: onDuplicate },
              "sep",
              ...STAGES.filter((st) => st !== e.stage).map((st) => ({ label: `Move to ${st}`, onClick: () => onMove(st) })),
              ...(e.stage === "Draft" ? ["sep" as const, { label: "Delete draft", icon: Trash2, danger: true, onClick: onDelete }] : []),
            ]}
            trigger={<span role="button" aria-label="Enquiry actions" className="grid size-[26px] cursor-pointer place-items-center rounded-[6px] hover:bg-[#f1f0ec]"><MoreHorizontal className="size-[18px]" /></span>}
          />
        </div>

        {editing ? (
          <EditForm e={e} onDone={() => setEditing(false)} />
        ) : (
          <>
            <div className="mt-[4px] flex gap-[13px]">
              <Image src={e.id === "ENQ-2026-001" ? "/console/enq-multivitamin-lg.jpg" : e.img} alt="" width={168} height={156} className="h-[78px] w-[84px] shrink-0 rounded-[7px] object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-[6px]">
                  <h2 title={e.name} className="serif min-w-0 truncate text-[15.5px] font-semibold leading-[1.2] tracking-[-0.035em]">{e.name}</h2>
                  <Pill tone={STAGE_TONE[e.stage]} className="mt-[1px] shrink-0 px-[5px] py-[2px] text-[10px]">{e.stage}</Pill>
                </div>
                <p className="mt-[3px] text-[12px] text-cs-ink-2">{e.id}</p>
                <div className="mt-[8px] flex items-center gap-[6px]">
                  <div className="flex min-w-0 flex-1 flex-wrap gap-[6px]">
                    {e.tags.map((t) => <span key={t} className="rounded-[5px] bg-[#f1f0ec] px-[10px] py-[4px] text-[11px] text-[#3e4440]">{t}</span>)}
                  </div>
                  <button type="button" aria-label="Edit enquiry" onClick={() => setEditing(true)} className="grid size-[26px] place-items-center rounded-[6px] text-[#3e4440] hover:bg-[#f1f0ec]"><Pencil className="size-[15px]" strokeWidth={1.7} /></button>
                </div>
              </div>
            </div>
            <div className="mt-[8px] grid grid-cols-3 border-y border-cs-line py-[4px]">
              {[["Target MOQ", `${fmtNum(e.moq)} units`], ["Target Launch", e.launch], ["Target Price", e.price]].map(([l, v], i) => (
                <div key={l} className={cn("px-[4px]", i > 0 && "border-l border-cs-line pl-[16px]")}>
                  <p className="text-[11px] leading-[16px] text-cs-ink-2">{l}</p>
                  <p className="text-[13px] font-semibold leading-[19px]">{v}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <Tabs
          size="sm"
          className="mt-[10px]"
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "overview", label: "Overview" },
            { key: "responses", label: `Responses (${e.responses.length})` },
            { key: "quotes", label: `Quotes (${e.quotes.length})` },
            { key: "activity", label: "Activity" },
          ]}
        />
      </div>

      <div className="px-[18px] pb-[9px] pt-[6px]">
        {tab === "overview" && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="serif text-[17px] font-semibold leading-[21px]">Enquiry Brief</h3>
              <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-[5px] text-[12px] text-[#2f3431] hover:text-cs-green"><Pencil className="size-[13px]" />Edit</button>
            </div>
            <p className="mt-[2px] text-[12px] leading-[1.42] text-cs-ink-2">{e.brief}</p>
            <p className="mt-[8px] text-[12px] font-semibold">Key Requirements</p>
            <div className="mt-[5px] flex flex-wrap gap-[7px]">
              {e.requirements.map((r) => <span key={r} className="rounded-[5px] border border-cs-line bg-[#f7f6f2] px-[10px] py-[3px] text-[10.5px] text-[#3e4440]">{r}</span>)}
              {e.requirements.length === 0 && <span className="text-[12px] text-cs-ink-2">None added yet.</span>}
            </div>
          </>
        )}

        {tab === "responses" && (
          <ul className="space-y-[8px]">
            {responses.map((r) => {
              const m = mfrOf(s, r.mfrId);
              if (!m) return null;
              return (
                <li key={r.mfrId} className="flex items-start gap-[10px] rounded-[8px] border border-cs-line p-[9px]">
                  <Image src={m.img} alt="" width={80} height={80} className="size-[40px] rounded-[6px] object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/console/manufacturers?id=${m.id}`} className="truncate text-[12.5px] font-semibold hover:text-cs-green">{m.name}</Link>
                      <Pill tone={RESP_TONE[r.status]} className="text-[10.5px]">{r.status}</Pill>
                    </div>
                    <p className="text-[11px] text-cs-ink-2">{m.state}, India · ★ {m.rating} · {ago(r.at)}</p>
                    <p className="mt-[3px] text-[11.5px] leading-[1.4] text-[#3e4440]">{r.note}</p>
                  </div>
                  <HeartBtn m={m} />
                </li>
              );
            })}
            {responses.length === 0 && <Empty>No responses yet. Send the enquiry to manufacturers to start getting replies.</Empty>}
          </ul>
        )}

        {tab === "quotes" && <QuotesTable e={e} onSample={onSample} />}

        {tab === "activity" && (
          <ul className="relative space-y-[10px] pl-[16px]">
            <span className="absolute bottom-[6px] left-[4px] top-[6px] w-px bg-cs-line" />
            {[...e.activity].reverse().map((a, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[16px] top-[5px] size-[9px] rounded-full bg-cs-green-2 ring-2 ring-white" />
                <p className="text-[12.5px]"><span className="font-medium">{a.who}</span> · {a.text}</p>
                <p className="text-[11px] text-cs-ink-2">{fmtDateTime(a.at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      </div>

      {/* manufacturer responses + next steps: second card, as in the mockup */}
      <div className="cs-card overflow-hidden">
      <div className="px-[14px] pb-[8px] pt-[6px]">
        <div className="flex items-center justify-between">
          <h3 className="serif text-[17px] font-semibold leading-[21px]">Manufacturer Responses ({e.responses.length})</h3>
          <button type="button" onClick={() => setTab("responses")} className="flex items-center gap-[6px] text-[12px] font-medium text-[#2f3431] hover:text-cs-green">View All <span aria-hidden>→</span></button>
        </div>
        <div className="mt-[7px] grid grid-cols-3 gap-[12px]">
          {responses.slice(0, 3).map((r) => {
            const m = mfrOf(s, r.mfrId);
            if (!m) return null;
            return (
              <div key={r.mfrId} className="relative overflow-hidden rounded-[8px] border border-cs-line">
                <Link href={`/console/manufacturers?id=${m.id}`} className="block">
                  <Image src={WIDE[m.id] ?? m.img} alt={m.name} width={240} height={98} className="h-[49px] w-full object-cover" />
                  <div className="px-[10px] pb-[7px] pt-[5px]">
                    <p className="line-clamp-2 text-[12px] font-semibold leading-[1.18]">{m.name}</p>
                    <p className="flex items-center gap-[3px] truncate text-[10.5px] leading-[1.35] text-cs-ink-2"><MapPin className="size-[11px] shrink-0" />{m.state}, India</p>
                    <p className="flex items-center gap-[3px] text-[11px] leading-[1.35]"><Star className="size-[11px] fill-cs-amber text-cs-amber" />{m.rating} <span className="text-cs-ink-2">({m.reviews})</span></p>
                    <Pill tone={RESP_TONE[r.status]} className="mt-[6px] w-full justify-center py-[2px] text-[10.5px]">{r.status}</Pill>
                  </div>
                </Link>
                <HeartBtn m={m} className="absolute right-[6px] top-[5px]" />
              </div>
            );
          })}
          {responses.length === 0 && <p className="col-span-3 py-[10px] text-[12px] text-cs-ink-2">No manufacturer has replied yet.</p>}
        </div>
      </div>

      {/* next steps + actions */}
      <div className="px-[14px] pb-[7px] pt-[4px]">
        <h3 className="serif text-[16px] font-semibold leading-[20px]">Next Steps</h3>
        <ul className="mt-[2px]">
          {e.steps.map((st, i) => (
            <li key={st.text}>
              <button type="button" onClick={() => update((d) => toggleStep(d, e.id, i))} className="flex h-[19px] w-full items-center gap-[10px] text-left">
                <span className={cn("grid size-[16px] shrink-0 place-items-center rounded-full border", st.done ? "border-cs-green bg-cs-green text-white" : "border-[#9da39f] bg-white")}>
                  {st.done && <CheckIcon className="size-[10px]" strokeWidth={3} />}
                </span>
                <span className={cn("flex-1 text-[11.5px]", st.done ? "text-[#1d211e]" : "text-[#3e4440]")}>{st.text}</span>
                <span className={cn("text-[11px]", !st.done && daysUntil(st.due) < 0 ? "text-cs-red" : "text-cs-ink-2")}>{st.done ? fmtDay(st.due) : `Due ${fmtDay(st.due)}`}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="-mx-[6px] mt-[11px] grid grid-cols-[142fr_134fr_117fr] gap-[7px] [&_button]:h-[38px] [&_button]:gap-[7px] [&_button]:px-[6px] [&_button]:text-[12px] [&_svg]:shrink-0">
          <Btn kind="primary" icon={BarChart3} onClick={() => setTab("quotes")}>Compare Quotes</Btn>
          <Btn icon={FlaskConical} onClick={() => onSample()} disabled={e.stage === "Closed"}>Request Sample</Btn>
          <Btn icon={Send} onClick={onMessage} disabled={e.responses.length === 0}>Message All</Btn>
        </div>
      </div>
      </div>
    </aside>
  );
}

function HeartBtn({ m, className }: { m: Manufacturer; className?: string }) {
  const { update, toast } = useConsole();
  return (
    <button
      type="button"
      aria-pressed={m.shortlisted}
      aria-label={m.shortlisted ? `Remove ${m.name} from shortlist` : `Shortlist ${m.name}`}
      title={m.shortlisted ? "Shortlisted" : "Add to shortlist"}
      onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); update((d) => toggleShortlist(d, m.id)); toast(m.shortlisted ? `${m.name} removed from shortlist` : `${m.name} shortlisted`); }}
      className={cn("grid size-[24px] shrink-0 place-items-center rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)]", className)}
    >
      <Heart className={cn("size-[13px]", m.shortlisted ? "fill-cs-red text-cs-red" : "text-[#2f3431]")} strokeWidth={2} />
    </button>
  );
}

function QuotesTable({ e, onSample }: { e: Enquiry; onSample: (mfrId: string) => void }) {
  const { s, update } = useConsole();
  if (e.quotes.length === 0) return <Empty>No quotes yet. Quotes appear here as manufacturers price your brief.</Empty>;
  const best = Math.min(...e.quotes.map((q) => q.unitPrice));
  const fastest = Math.min(...e.quotes.map((q) => q.leadWeeks));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11.5px]">
        <thead>
          <tr className="text-left text-[10.5px] uppercase tracking-[0.04em] text-cs-ink-2">
            <th className="pb-[6px] font-medium">Manufacturer</th><th className="pb-[6px] font-medium">Unit price</th><th className="pb-[6px] font-medium">MOQ</th><th className="pb-[6px] font-medium">Lead</th><th className="pb-[6px] font-medium">Valid till</th><th />
          </tr>
        </thead>
        <tbody>
          {e.quotes.map((q) => {
            const m = mfrOf(s, q.mfrId);
            return (
              <tr key={q.mfrId} className="border-t border-cs-line align-top">
                <td className="py-[7px] pr-2">
                  <Link href={`/console/manufacturers?id=${q.mfrId}`} className="font-semibold hover:text-cs-green">{m?.short ?? q.mfrId}</Link>
                  <div className="mt-[3px] flex flex-wrap gap-[4px]">
                    {q.unitPrice === best && <span className="rounded-[4px] bg-cs-mint px-[5px] text-[10px] font-medium text-cs-green-2">Best price</span>}
                    {q.leadWeeks === fastest && <span className="rounded-[4px] bg-cs-blue-bg px-[5px] text-[10px] font-medium text-cs-blue">Fastest</span>}
                  </div>
                </td>
                <td className="py-[7px] font-semibold">₹{q.unitPrice.toFixed(2)}</td>
                <td className="py-[7px]">{fmtNum(q.moq)}</td>
                <td className="py-[7px]">{q.leadWeeks} wks</td>
                <td className="py-[7px]">{fmtDay(q.validTill)}</td>
                <td className="py-[5px] text-right">
                  <div className="flex justify-end gap-[4px]">
                    <button type="button" title={q.shortlisted ? "Remove from shortlist" : "Shortlist quote"} aria-pressed={q.shortlisted} onClick={() => update((d) => toggleQuoteShortlist(d, e.id, q.mfrId))} className={cn("grid size-[26px] place-items-center rounded-[6px] border", q.shortlisted ? "border-cs-amber bg-[#fdf6e3]" : "border-cs-line")}>
                      <Star className={cn("size-[13px]", q.shortlisted ? "fill-cs-amber text-cs-amber" : "text-[#55605a]")} />
                    </button>
                    <button type="button" title="Request sample" onClick={() => onSample(q.mfrId)} disabled={e.stage === "Closed"} className="grid size-[26px] place-items-center rounded-[6px] border border-cs-line disabled:opacity-40">
                      <FlaskConical className="size-[13px] text-cs-orange" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EditForm({ e, onDone }: { e: Enquiry; onDone: () => void }) {
  const { update, toast } = useConsole();
  const [f, setF] = useState({ name: e.name, category: e.category, moq: String(e.moq), launch: e.launch, price: e.price, brief: e.brief, reqs: e.requirements.join(", ") });
  const valid = f.name.trim() && Number(f.moq) > 0;
  return (
    <form
      className="mt-[6px] space-y-[9px]"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!valid) return;
        update((d) => editEnquiry(d, e.id, { name: f.name.trim(), category: f.category, moq: Number(f.moq), launch: f.launch, price: f.price, brief: f.brief, requirements: f.reqs.split(",").map((x) => x.trim()).filter(Boolean) }));
        toast(`${e.id} updated`);
        onDone();
      }}
    >
      <Field label="Product name"><input className={inputCls} value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} /></Field>
      <div className="grid grid-cols-3 gap-[8px]">
        <Field label="Target MOQ"><input className={inputCls} inputMode="numeric" value={f.moq} onChange={(x) => setF({ ...f, moq: x.target.value.replace(/\D/g, "") })} /></Field>
        <Field label="Target launch"><input className={inputCls} value={f.launch} onChange={(x) => setF({ ...f, launch: x.target.value })} /></Field>
        <Field label="Target price"><input className={inputCls} value={f.price} onChange={(x) => setF({ ...f, price: x.target.value })} /></Field>
      </div>
      <Field label="Brief"><textarea className={textareaCls} rows={3} value={f.brief} onChange={(x) => setF({ ...f, brief: x.target.value })} /></Field>
      <Field label="Key requirements" hint="Separate with commas"><input className={inputCls} value={f.reqs} onChange={(x) => setF({ ...f, reqs: x.target.value })} /></Field>
      <div className="flex justify-end gap-[8px] pt-[2px]">
        <Btn onClick={onDone} className="h-[34px]">Cancel</Btn>
        <Btn kind="primary" type="submit" disabled={!valid} className="h-[34px]">Save changes</Btn>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ modals */

const REQ_OPTIONS = ["Vegetarian Capsules", "GMP Certified", "FSSAI", "ISO Certified", "Custom Formula", "Clean Label", "Third-party Testing", "Export Ready", "Halal", "Organic"];

function CreateEnquiry({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string, draft: boolean) => void }) {
  const { s, update } = useConsole();
  const blank = { name: "", category: "Supplements", moq: "25000", launch: "Q1 2027", price: "", brief: "", reqs: ["GMP Certified", "Clean Label"], img: PRODUCT_IMAGES.multivitamin };
  const [f, setF] = useState(blank);
  const [tried, setTried] = useState(false);
  const valid = f.name.trim().length > 1 && Number(f.moq) > 0 && f.brief.trim().length > 0;
  const submit = (draft: boolean) => {
    setTried(true);
    if (!valid) return;
    let id = "";
    update((d) => { id = createEnquiry(d, { name: f.name.trim(), category: f.category, moq: Number(f.moq), launch: f.launch, price: f.price.trim() || "To be quoted", brief: f.brief.trim(), requirements: f.reqs, img: f.img }, draft); });
    setF(blank);
    setTried(false);
    onCreated(id, draft);
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      width={600}
      title="Create Enquiry"
      sub="Describe the product once. Scouthru sends it to matched, verified manufacturers."
      footer={<><Btn onClick={() => submit(true)}>Save as draft</Btn><Btn kind="primary" icon={Send} onClick={() => submit(false)}>Send to manufacturers</Btn></>}
    >
      <div className="space-y-[12px]">
        <Field label="Product name"><input autoFocus className={cn(inputCls, tried && f.name.trim().length < 2 && "border-cs-red")} placeholder="e.g. Daily Multivitamin Capsules" value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-[10px]">
          <Field label="Category">
            <select className={inputCls} value={f.category} onChange={(x) => setF({ ...f, category: x.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Target MOQ (units)"><input className={cn(inputCls, tried && !(Number(f.moq) > 0) && "border-cs-red")} inputMode="numeric" value={f.moq} onChange={(x) => setF({ ...f, moq: x.target.value.replace(/\D/g, "") })} /></Field>
          <Field label="Target launch"><input className={inputCls} value={f.launch} onChange={(x) => setF({ ...f, launch: x.target.value })} /></Field>
          <Field label="Target price"><input className={inputCls} placeholder="e.g. ₹ 8–12 / unit" value={f.price} onChange={(x) => setF({ ...f, price: x.target.value })} /></Field>
        </div>
        <Field label="Brief"><textarea className={cn(textareaCls, tried && !f.brief.trim() && "border-cs-red")} rows={3} placeholder="What should it contain, how should it be packed, which certifications do you need?" value={f.brief} onChange={(x) => setF({ ...f, brief: x.target.value })} /></Field>
        <div>
          <p className="mb-[6px] text-[12px] font-medium text-[#3e4440]">Key requirements</p>
          <div className="flex flex-wrap gap-[6px]">
            {REQ_OPTIONS.map((r) => {
              const on = f.reqs.includes(r);
              return (
                <button key={r} type="button" aria-pressed={on} onClick={() => setF({ ...f, reqs: on ? f.reqs.filter((x) => x !== r) : [...f.reqs, r] })} className={cn("rounded-full border px-[11px] py-[4px] text-[11.5px]", on ? "border-cs-green bg-cs-mint font-medium text-cs-green" : "border-cs-line text-[#3e4440]")}>
                  {on && "✓ "}{r}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-[6px] text-[12px] font-medium text-[#3e4440]">Product image</p>
          <div className="flex flex-wrap gap-[6px]">
            {Object.entries(PRODUCT_IMAGES).map(([k, src]) => (
              <button key={k} type="button" aria-label={`Use ${k} image`} aria-pressed={f.img === src} onClick={() => setF({ ...f, img: src })} className={cn("rounded-[7px] border-2 p-[1px]", f.img === src ? "border-cs-green" : "border-transparent")}>
                <Image src={src} alt="" width={72} height={72} className="size-[36px] rounded-[5px] object-cover" />
              </button>
            ))}
          </div>
        </div>
        {tried && !valid && <p className="text-[12px] text-cs-red">Add a product name, MOQ and a short brief.</p>}
      </div>
    </Modal>
  );
}

function RequestSample({ enquiryId, mfrId, onClose }: { enquiryId: string; mfrId?: string; onClose: () => void }) {
  const { s, update, toast } = useConsole();
  const e = s.enquiries.find((x) => x.id === enquiryId);
  const options = e && e.responses.length ? e.responses.map((r) => r.mfrId) : s.manufacturers.filter((m) => m.shortlisted).map((m) => m.id);
  const [mfr, setMfr] = useState(mfrId ?? e?.quotes[0]?.mfrId ?? options[0] ?? "");
  const [qty, setQty] = useState("1000");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState<string | null>(null);
  if (!e) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={done ? "Sample requested" : "Request Sample"}
      sub={`${e.name} · ${e.id}`}
      footer={done ? (
        <><Btn onClick={onClose}>Close</Btn><Link href={`/console/samples?id=${done}`} className="inline-flex h-[40px] items-center rounded-[7px] bg-cs-green px-[16px] text-[13px] font-medium text-white">View sample {done}</Link></>
      ) : (
        <><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={FlaskConical} disabled={!mfr || !(Number(qty) > 0)} onClick={() => {
          let id = "";
          update((d) => { id = requestSample(d, e.id, mfr, Number(qty)); if (notes.trim()) { const sm = d.samples.find((x) => x.id === id); sm?.comments.push({ at: new Date().toISOString(), who: d.user.name, text: notes.trim() }); } });
          toast(`Sample ${id} requested from ${mfrOf(s, mfr)?.name}`);
          setDone(id);
        }}>Send request</Btn></>
      )}
    >
      {done ? (
        <p className="text-[13px] leading-[1.5] text-[#3e4440]">
          <b>{done}</b> is on the Samples screen as <b>Submitted</b>. {mfrOf(s, mfr)?.name} has been asked for {fmtNum(Number(qty))} units; the enquiry moved to <b>Samples Requested</b>.
        </p>
      ) : (
        <div className="space-y-[12px]">
          <Field label="Manufacturer">
            <select className={inputCls} value={mfr} onChange={(x) => setMfr(x.target.value)}>
              {options.map((id) => {
                const q = e.quotes.find((x) => x.mfrId === id);
                return <option key={id} value={id}>{mfrOf(s, id)?.name}{q ? ` — ₹${q.unitPrice.toFixed(2)}/unit` : ""}</option>;
              })}
            </select>
          </Field>
          <Field label="Sample quantity (units)"><input className={inputCls} inputMode="numeric" value={qty} onChange={(x) => setQty(x.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="Notes for the manufacturer (optional)"><textarea className={textareaCls} rows={3} value={notes} placeholder="Packaging, flavour, test reports you need with the sample…" onChange={(x) => setNotes(x.target.value)} /></Field>
        </div>
      )}
    </Modal>
  );
}

function MessageAll({ enquiryId, onClose }: { enquiryId: string; onClose: () => void }) {
  const { s, update, toast } = useConsole();
  const e = s.enquiries.find((x) => x.id === enquiryId);
  const [to, setTo] = useState<string[]>(e?.responses.map((r) => r.mfrId) ?? []);
  const [subject, setSubject] = useState(e ? `${e.name} (${e.id})` : "");
  const [body, setBody] = useState("");
  if (!e) return null;
  return (
    <Modal
      open
      onClose={onClose}
      width={560}
      title="Message manufacturers"
      sub={`${to.length} of ${e.responses.length} responding manufacturers selected`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={Send} disabled={!to.length || !body.trim() || !subject.trim()} onClick={() => {
        update((d) => messageMany(d, to, subject.trim(), body.trim(), `/console/enquiries?id=${e.id}`, e.id));
        toast(`Message sent to ${to.length} manufacturer${to.length > 1 ? "s" : ""}`);
        onClose();
      }}>Send message</Btn></>}
    >
      <div className="space-y-[12px]">
        <div className="flex flex-wrap gap-[6px]">
          {e.responses.map((r) => {
            const on = to.includes(r.mfrId);
            return (
              <button key={r.mfrId} type="button" aria-pressed={on} onClick={() => setTo(on ? to.filter((x) => x !== r.mfrId) : [...to, r.mfrId])} className={cn("rounded-full border px-[10px] py-[4px] text-[11.5px]", on ? "border-cs-green bg-cs-mint font-medium text-cs-green" : "border-cs-line text-cs-ink-2 line-through")}>
                {mfrOf(s, r.mfrId)?.short}
              </button>
            );
          })}
        </div>
        <Field label="Subject"><input className={inputCls} value={subject} onChange={(x) => setSubject(x.target.value)} /></Field>
        <Field label="Message"><textarea autoFocus className={textareaCls} rows={5} value={body} placeholder="e.g. Please share your best price for 50,000 units and the earliest production slot." onChange={(x) => setBody(x.target.value)} /></Field>
      </div>
    </Modal>
  );
}
