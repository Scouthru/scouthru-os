"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Archive, ArchiveRestore, ArrowDown, ArrowUp, Box, CheckCircle2, Download, ExternalLink, FileText, FlaskConical, MapPin, Pencil, RefreshCw,
  Settings2, ShieldCheck, SlidersHorizontal, Star, Truck, Users, X,
} from "lucide-react";
import { Btn, Check, Empty, Field, FilterSelect, Hero, Menu, Modal, Pill, RowMenu, SearchBox, StatStrip, Tabs, inputCls, textareaCls, type Tone } from "@/components/console/kit";
import { useConsole } from "@/lib/console/store";
import { reorder } from "@/lib/console/actions";
import { setPrimaryPackaging, setProductBrief, setProductStage } from "@/lib/console/actions-ops";
import { ago, download, csv, fmtDate, fmtNum } from "@/lib/console/format";
import type { ConsoleState, Product, ProductStage } from "@/lib/console/types";
import { cn } from "@/lib/cn";

const STAGE_TONE: Record<ProductStage, Tone> = { Active: "green", "In Development": "blue", "In Production": "green", Approved: "green", Draft: "gray", Archived: "gray" };
type TabKey = "all" | ProductStage;
const TABS: TabKey[] = ["all", "Active", "In Development", "In Production", "Approved", "Archived"];

/** Larger photos cropped from the mockup where the list thumbnail would be too small. */
const PANEL_IMG: Record<string, string> = { "Daily Multivitamin Capsules": "/console/prod-panel.jpg" };
const PACK_IMG: Record<string, string> = { "Bottle (120)": "/console/pkg-bottle120.jpg", "Pouch (30)": "/console/pkg-pouch.jpg" };
const FACTORY_IMG: Record<string, string> = { nutralab: "/console/factory-nutralab.jpg" };

export default function ProductsPage() {
  return (
    <Suspense>
      <Products />
    </Suspense>
  );
}

function Products() {
  const { s, update, toast } = useConsole();
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [stage, setStage] = useState("");
  const [mfr, setMfr] = useState("");
  const [moqMin, setMoqMin] = useState("");
  const [moqMax, setMoqMax] = useState("");
  const [sortKey, setSortKey] = useState<"updated" | "moq">("updated");
  const [desc, setDesc] = useState(true);
  const [sel, setSel] = useState<string | null>(params.get("id") ?? s.products[0]?.id ?? null);
  const [checked, setChecked] = useState<string[]>(() => [params.get("id") ?? s.products[0]?.id].filter(Boolean) as string[]);
  const [editing, setEditing] = useState(false);
  const [packFor, setPackFor] = useState<Product | null>(null);
  const [reorderFor, setReorderFor] = useState<Product | null>(null);

  useEffect(() => {
    const id = params.get("id");
    if (id) setSel(id);
  }, [params]);

  const mfrName = (id: string) => s.manufacturers.find((m) => m.id === id)?.name ?? id;
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const lo = moqMin ? +moqMin : 0;
    const hi = moqMax ? +moqMax : Infinity;
    return s.products
      .filter((p) => (tab === "all" || p.stage === tab) && (!t || [p.name, p.id, p.category, mfrName(p.mfrId)].some((v) => v.toLowerCase().includes(t))) &&
        (!cat || p.category === cat) && (!stage || p.stage === stage) && (!mfr || mfrName(p.mfrId) === mfr) && p.moq >= lo && p.moq <= hi)
      .sort((a, b) => (desc ? -1 : 1) * (sortKey === "moq" ? a.moq - b.moq : +new Date(a.updatedAt) - +new Date(b.updatedAt)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, tab, q, cat, stage, mfr, moqMin, moqMax, sortKey, desc]);

  const count = (k: TabKey) => s.products.filter((p) => k === "all" || p.stage === k).length;
  const live = s.products.filter((p) => p.stage !== "Archived");
  const week = (k?: ProductStage) => s.products.filter((p) => (!k || p.stage === k) && Date.now() - +new Date(p.updatedAt) < 7 * 864e5).length;
  const p = s.products.find((x) => x.id === sel) ?? null;
  const moreActive = moqMin !== "" || moqMax !== "";

  const sortBy = (k: "updated" | "moq") => { if (sortKey === k) setDesc((d) => !d); else { setSortKey(k); setDesc(true); } };
  const archiveToggle = (x: Product) => {
    const to: ProductStage = x.stage === "Archived" ? "Active" : "Archived";
    update((d) => setProductStage(d, x.id, to));
    toast(to === "Archived" ? `${x.name} archived` : `${x.name} restored to Active`);
  };

  return (
    <div>
      <Hero
        eyebrow="PRODUCTS"
        title="Products & Briefs"
        lede={<span className="whitespace-nowrap">Organize product concepts, specifications, packaging, and manufacturing briefs in one place.</span>}
        img="/console/hero-products.jpg"
        quote={["From concept", "to shelf-ready", "product."]}
        height={152}
        quoteTop={36}
        quoteWidth={212}
      />
      <div className="px-[15px] pb-[20px]">
        <StatStrip
          items={[
            { icon: Box, tone: "green", value: live.length, label: "Active Products", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />{week()} updated this week</> },
            { icon: FlaskConical, tone: "orange", value: count("In Development"), label: "In Development", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />{week("In Development")} updated this week</> },
            { icon: Settings2, tone: "orange", value: count("In Production"), label: "In Production", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />{s.orders.filter((o) => o.batches.some((b) => b.status === "In Progress")).length} batches running</> },
            { icon: ShieldCheck, tone: "blue", value: count("Approved"), label: "Approved", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />ready for production</> },
            { icon: FileText, tone: "orange", value: count("Draft"), label: "Draft Briefs", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />{count("Draft") ? "need a brief" : "none open"}</> },
          ]}
        />

        <div className={cn("mt-[11px] grid gap-[12px] min-[1024px]:h-[738px]", p && "min-[1024px]:grid-cols-[minmax(0,1.83fr)_minmax(0,1fr)]")}>
          <section className="cs-card flex min-h-0 min-w-0 flex-col px-[12px] pt-[13px]">
            <Tabs value={tab} onChange={setTab} tabs={TABS.map((k) => ({ key: k, label: `${k === "all" ? "All Products" : k} (${count(k)})` }))} />
            <div className="mt-[14px] flex items-center gap-[9px] [&_input]:text-[11px] [&_select]:pl-[11px] [&_select]:text-[11px]">
              <SearchBox value={q} onChange={setQ} placeholder="Search by product name, category or manufacturer..." className="min-w-0 flex-1" />
              <FilterSelect label="Category" value={cat} onChange={setCat} options={Array.from(new Set(s.products.map((x) => x.category))).sort()} className="w-[104px] shrink-0" />
              <FilterSelect label="Stage" value={stage} onChange={setStage} options={["Draft", "In Development", "Approved", "In Production", "Active", "Archived"]} className="w-[74px] shrink-0" />
              <FilterSelect label="Manufacturer" value={mfr} onChange={setMfr} options={Array.from(new Set(s.products.map((x) => mfrName(x.mfrId)))).sort()} className="w-[112px] shrink-0" />
              <Menu
                align="right"
                className="shrink-0"
                trigger={
                  <button type="button" className={cn("flex h-[34px] items-center gap-[7px] whitespace-nowrap rounded-[6px] border px-[11px] text-[11.5px]", moreActive ? "border-cs-green-2/60 font-medium text-cs-green" : "border-cs-line bg-white")}>
                    <SlidersHorizontal className="size-[15px]" strokeWidth={1.7} />More Filters{moreActive && " ·1"}
                  </button>
                }
              >
                {(close) => (
                  <div className="w-[250px] space-y-[10px] px-[12px] py-[8px]">
                    <p className="text-[12px] font-semibold">Target MOQ (units)</p>
                    <div className="grid grid-cols-2 gap-[8px]">
                      <input aria-label="Minimum MOQ" type="number" min={0} placeholder="Min" className={cn(inputCls, "h-[34px]")} value={moqMin} onChange={(e) => setMoqMin(e.target.value)} />
                      <input aria-label="Maximum MOQ" type="number" min={0} placeholder="Max" className={cn(inputCls, "h-[34px]")} value={moqMax} onChange={(e) => setMoqMax(e.target.value)} />
                    </div>
                    <div className="flex justify-between">
                      <button type="button" className="text-[12px] text-cs-ink-2 hover:text-cs-ink" onClick={() => { setMoqMin(""); setMoqMax(""); }}>Clear</button>
                      <button type="button" className="text-[12px] font-semibold text-cs-green" onClick={close}>Done</button>
                    </div>
                  </div>
                )}
              </Menu>
            </div>

            {checked.length > 1 && (
              <div className="mt-[10px] flex items-center gap-[12px] rounded-[7px] bg-cs-mint px-[12px] py-[7px] text-[12px]">
                <span className="font-medium text-cs-green">{checked.length} selected</span>
                <button type="button" className="font-medium text-cs-green hover:underline" onClick={() => { update((d) => checked.forEach((id) => setProductStage(d, id, "Archived"))); toast(`Archived ${checked.length} products`); setChecked([]); }}>Archive</button>
                <button type="button" className="font-medium text-cs-green hover:underline" onClick={() => { const rows = s.products.filter((x) => checked.includes(x.id)); download("products.csv", csv([["ID", "Product", "Category", "Manufacturer", "Stage", "Target MOQ", "Last updated"], ...rows.map((x) => [x.id, x.name, x.category, mfrName(x.mfrId), x.stage, x.moq, fmtDate(x.updatedAt)])])); toast(`Exported ${rows.length} products`); }}>Export CSV</button>
                <button type="button" className="ml-auto text-cs-ink-2 hover:text-cs-ink" onClick={() => setChecked([])}>Clear</button>
              </div>
            )}

            <div className="mt-[12px] min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-y-[1px]">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-left text-[11px] text-[#4b524e]">
                    <th className="w-[30px] border-b border-cs-line pb-[9px] pl-[10px] font-medium"><Check checked={list.length > 0 && list.every((x) => checked.includes(x.id))} onChange={(v) => setChecked(v ? list.map((x) => x.id) : [])} label="Select all" /></th>
                    <th className="border-b border-cs-line pb-[9px] pl-[14px] font-medium">Product</th>
                    <th className="border-b border-cs-line pb-[9px] font-medium">Category</th>
                    <th className="border-b border-cs-line pb-[9px] font-medium">Manufacturer</th>
                    <th className="border-b border-cs-line pb-[9px] font-medium">Stage</th>
                    <th className="border-b border-cs-line pb-[9px] font-medium"><button type="button" onClick={() => sortBy("moq")} className="flex items-center gap-[4px]">Target MOQ{sortKey === "moq" && (desc ? <ArrowDown className="size-[12px]" /> : <ArrowUp className="size-[12px]" />)}</button></th>
                    <th className="border-b border-cs-line pb-[9px] font-medium"><button type="button" onClick={() => sortBy("updated")} className="flex items-center gap-[4px]">Last Updated{sortKey === "updated" && (desc ? <ArrowDown className="size-[12px]" /> : <ArrowUp className="size-[12px]" />)}</button></th>
                    <th className="border-b border-cs-line pb-[9px]"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((x) => {
                    const on = x.id === sel;
                    return (
                      <tr key={x.id} onClick={() => { setSel(x.id); setEditing(false); setChecked((c) => (c.length <= 1 ? [x.id] : c)); router.replace(`/console/products?id=${x.id}`, { scroll: false }); }} className={cn("cursor-pointer", on ? "[&>td]:border-y-[1.5px] [&>td]:border-cs-green-2/70 [&>td]:bg-[#fbfdfb] [&>td:first-child]:rounded-l-[8px] [&>td:first-child]:border-l-[1.5px] [&>td:last-child]:rounded-r-[8px] [&>td:last-child]:border-r-[1.5px]" : "[&>td]:border-b [&>td]:border-cs-line hover:[&>td]:bg-[#faf9f6]")}>
                        <td className="pl-[10px]"><Check checked={checked.includes(x.id)} onChange={() => setChecked((c) => (c.includes(x.id) ? c.filter((y) => y !== x.id) : [...c, x.id]))} label={`Select ${x.name}`} /></td>
                        <td className="py-[9px] pl-[14px]">
                          <div className="flex items-center gap-[12px]">
                            <Image src={x.img} alt="" width={44} height={44} className="size-[44px] shrink-0 rounded-[6px] object-cover" />
                            <div className="min-w-0">
                              <p className="w-[116px] text-[11px] font-medium leading-[1.3] tracking-[-0.01em] text-[#1d211e]">{x.name}</p>
                              <p className="text-[10.5px] text-cs-ink-2">{x.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="w-[90px] text-[11px] leading-tight text-[#3e4440]">{x.category}</td>
                        <td className="w-[110px] text-[11px] leading-tight text-[#3e4440]">{mfrName(x.mfrId)}</td>
                        <td><Pill tone={STAGE_TONE[x.stage]} className={cn("text-[11px]", x.stage === "In Development" && "!bg-cs-blue-bg !text-cs-blue")}>{x.stage}</Pill></td>
                        <td className="text-[11.5px] leading-tight text-[#1d211e]">{fmtNum(x.moq)}<br /><span className="text-cs-ink-2">units</span></td>
                        <td className="whitespace-nowrap text-[11px] leading-tight text-[#1d211e]">{fmtDate(x.updatedAt)}<br /><span className="text-cs-ink-2">{ago(x.updatedAt)}</span></td>
                        <td className="pr-[8px]">
                          <RowMenu items={[
                            { label: "Open", icon: ExternalLink, onClick: () => setSel(x.id) },
                            { label: x.stage === "Archived" ? "Unarchive" : "Archive", icon: x.stage === "Archived" ? ArchiveRestore : Archive, onClick: () => archiveToggle(x) },
                            { label: "Create reorder", icon: RefreshCw, onClick: () => setReorderFor(x) },
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {list.length === 0 && <Empty>No products match these filters.</Empty>}
            </div>
            <div className="h-[10px] shrink-0" />
          </section>

          {p && (
            <ProductPanel
              key={p.id}
              p={p}
              editing={editing}
              setEditing={setEditing}
              onClose={() => { setSel(null); router.replace("/console/products", { scroll: false }); }}
              onArchive={() => archiveToggle(p)}
              onPack={() => setPackFor(p)}
              onReorder={() => setReorderFor(p)}
            />
          )}
        </div>
      </div>

      <PackagingModal p={packFor ? s.products.find((x) => x.id === packFor.id) ?? null : null} onClose={() => setPackFor(null)} />
      {reorderFor && <ReorderModal key={reorderFor.id} p={reorderFor} onClose={() => setReorderFor(null)} />}
    </div>
  );
}

function timeline(s: ConsoleState, p: Product) {
  const enq = s.enquiries.find((e) => e.name === p.name);
  const smp = s.samples.find((x) => x.name === p.name && x.status === "Approved") ?? s.samples.find((x) => x.name === p.name);
  const order = s.orders.find((o) => o.name === p.name);
  const qb = s.quality.find((q) => q.orderId === order?.id || q.name === p.name);
  const sh = s.shipments.find((x) => (order && x.orderId === order.id) || x.name === p.name);
  const approvedAt = smp?.history.find((h) => h.status === "Approved")?.at;
  const current = p.stage === "Draft" ? 0 : p.stage === "In Development" ? 1 : p.stage === "Approved" ? 2 : p.stage === "In Production" ? (qb?.status === "Passed" ? 4 : qb ? 3 : 2) : 5;
  const dates = [enq?.createdAt ?? p.updatedAt, approvedAt ?? smp?.requestedAt, order?.productionAt, qb?.updatedAt ?? (order ? order.targetDelivery : undefined), sh?.eta ?? order?.targetDelivery];
  return { current, dates };
}

function ProductPanel({ p, editing, setEditing, onClose, onArchive, onPack, onReorder }: { p: Product; editing: boolean; setEditing: (v: boolean) => void; onClose: () => void; onArchive: () => void; onPack: () => void; onReorder: () => void }) {
  const { s, update, toast } = useConsole();
  const [brief, setBrief] = useState(p.brief);
  const mfr = s.manufacturers.find((m) => m.id === p.mfrId);
  const { current, dates } = timeline(s, p);
  const [allSteps, setAllSteps] = useState(false);
  const steps = [
    { label: "Brief", icon: FileText }, { label: "Sample", icon: FlaskConical }, { label: "Production", icon: Settings2 }, { label: "Quality", icon: ShieldCheck }, { label: "Shipment", icon: Truck },
  ];

  const save = () => { update((d) => setProductBrief(d, p.id, brief.trim())); setEditing(false); toast("Brief saved"); };
  const specSheet = () => {
    download(`${p.id}-spec.txt`, [`${p.name} (${p.id})`, `Category: ${p.category}`, `Stage: ${p.stage}`, `Manufacturer: ${mfr?.name}`, `Target MOQ: ${fmtNum(p.moq)} units`, "", "Brief:", p.brief, "", `Target market: ${p.market.join(", ")}`, `Certifications: ${p.certs.join(", ")}`, `Packaging: ${p.packaging.map((k) => `${k.name}${k.primary ? " (primary)" : ""}`).join(", ")}`].join("\n"), "text/plain");
    toast("Spec sheet downloaded");
  };

  return (
    <aside className="cs-card flex min-h-0 min-w-0 flex-col px-[14px] pb-[12px] pt-[12px]">
      <div className="-mx-[4px] min-h-0 flex-1 overflow-y-auto px-[4px]">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Close panel" onClick={onClose} className="grid size-[24px] place-items-center rounded-[5px] hover:bg-[#f1f0ec]"><X className="size-[16px]" /></button>
        <RowMenu items={[
          { label: "Edit brief", icon: Pencil, onClick: () => setEditing(true) },
          { label: p.stage === "Archived" ? "Unarchive" : "Archive", icon: p.stage === "Archived" ? ArchiveRestore : Archive, onClick: onArchive },
          { label: "Create reorder", icon: RefreshCw, onClick: onReorder },
          { label: "Download spec sheet", icon: Download, onClick: specSheet },
        ]} />
      </div>
      <div className="mt-[4px] flex items-start gap-[14px]">
        <Image src={PANEL_IMG[p.name] ?? p.img} alt="" width={216} height={164} className="h-[82px] w-[108px] shrink-0 rounded-[8px] object-cover" />
        <div className="min-w-0 flex-1 pt-[6px]">
          <div className="flex items-start justify-between gap-2">
            <p className="serif text-[17px] font-semibold leading-tight tracking-[-0.025em]">{p.name}</p>
            <Pill tone={STAGE_TONE[p.stage]} className="!text-[11px]">{p.stage}</Pill>
          </div>
          <p className="mt-[2px] text-[12px] text-cs-ink-2">{p.id}</p>
          <div className="mt-[6px] flex flex-wrap gap-[5px]">{p.tags.map((t) => <span key={t} className="rounded-[4px] bg-[#f1f0ec] px-[8px] py-[2px] text-[10.5px] text-[#3e4440]">{t}</span>)}</div>
        </div>
      </div>

      <div className="mt-[12px] flex items-center justify-between">
        <p className="serif text-[16px] font-semibold">Product Brief</p>
        {!editing && <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-[5px] text-[12px] text-[#2f3431] hover:text-cs-green"><Pencil className="size-[13px]" />Edit</button>}
      </div>
      {editing ? (
        <div className="mt-[6px]">
          <textarea aria-label="Product brief" rows={4} className={textareaCls} value={brief} onChange={(e) => setBrief(e.target.value)} />
          <div className="mt-[6px] flex justify-end gap-[8px]">
            <Btn className="!h-[32px] !text-[12px]" onClick={() => { setBrief(p.brief); setEditing(false); }}>Cancel</Btn>
            <Btn kind="primary" className="!h-[32px] !text-[12px]" disabled={!brief.trim()} onClick={save}>Save brief</Btn>
          </div>
        </div>
      ) : <p className="mt-[3px] text-[11.5px] leading-[1.4] text-[#3e4440]">{p.brief}</p>}

      <div className="mt-[10px] grid grid-cols-2 gap-[8px]">
        <div className="flex gap-[8px] rounded-[8px] border border-cs-line px-[9px] py-[8px]">
          <Users className="size-[18px] shrink-0 text-[#3e4440]" strokeWidth={1.6} />
          <div className="min-w-0 text-[11px] leading-[1.45] tracking-[-0.01em]"><p className="text-[11.5px] font-semibold">Target Market</p>{p.market.map((m) => <p key={m} className="text-[#3e4440]">{m}</p>)}</div>
        </div>
        <div className="flex gap-[8px] rounded-[8px] border border-cs-line px-[9px] py-[8px]">
          <ShieldCheck className="size-[18px] shrink-0 text-[#3e4440]" strokeWidth={1.6} />
          <div className="text-[11px] leading-[1.45]"><p className="text-[11.5px] font-semibold">Certifications</p>{p.certs.map((c) => <p key={c} className="flex items-center gap-[5px] text-[#3e4440]"><CheckCircle2 className="size-[12px] text-cs-green-2" />{c}</p>)}</div>
        </div>
      </div>

      <div className="mt-[12px] flex items-center justify-between">
        <p className="serif text-[16px] font-semibold">Packaging Variants</p>
        <button type="button" onClick={onPack} className="text-[11.5px] font-medium text-[#2f3431] hover:text-cs-green">View All →</button>
      </div>
      <div className="mt-[6px] grid grid-cols-3 gap-[6px]">
        {p.packaging.slice(0, 3).map((k) => (
          <button type="button" key={k.name} onClick={onPack} className="flex items-start gap-[6px] rounded-[8px] border border-cs-line px-[6px] py-[6px] text-left hover:border-cs-green-2/60">
            <Image src={PACK_IMG[k.name] ?? k.img} alt="" width={44} height={52} className="h-[46px] w-[36px] shrink-0 rounded-[4px] object-cover" />
            <span className="min-w-0 leading-tight">
              <span className="block text-[11px] font-semibold">{k.name}</span>
              <span className="block text-[9.5px] text-cs-ink-2">{k.detail.replace(" · ", "\n")}</span>
              {k.primary && <span className="mt-[3px] inline-block rounded-[4px] bg-cs-mint px-[6px] py-[1px] text-[9.5px] font-medium text-cs-green-2">Primary</span>}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-[12px] flex items-center justify-between">
        <p className="serif text-[16px] font-semibold">Manufacturing Partner</p>
        <Link href={`/console/manufacturers?id=${p.mfrId}`} className="text-[11.5px] font-medium text-[#2f3431] hover:text-cs-green">View Details →</Link>
      </div>
      {mfr && (
        <div className="mt-[6px] flex items-center gap-[12px]">
          <Image src={FACTORY_IMG[mfr.id] ?? mfr.img} alt="" width={320} height={120} className="h-[60px] w-[160px] shrink-0 rounded-[6px] object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold">{mfr.name}</p>
            <p className="flex items-center gap-[4px] text-[11px] text-cs-ink-2"><MapPin className="size-[11px]" />{mfr.state}, India</p>
            <p className="flex items-center gap-[4px] text-[11px]"><Star className="size-[12px] fill-cs-amber text-cs-amber" />{mfr.rating} <span className="text-cs-ink-2">({mfr.reviews})</span></p>
          </div>
          <Pill tone={s.orders.some((o) => o.mfrId === mfr.id && o.batches.some((b) => b.status !== "Completed")) ? "green" : "gray"}>{s.orders.some((o) => o.mfrId === mfr.id && o.batches.some((b) => b.status !== "Completed")) ? "Active" : "Idle"}</Pill>
        </div>
      )}

      <div className="mt-[12px] flex items-center justify-between">
        <p className="serif text-[16px] font-semibold">Product Stage &amp; Timeline</p>
        <button type="button" onClick={() => setAllSteps(!allSteps)} className="text-[11.5px] font-medium text-[#2f3431] hover:text-cs-green">{allSteps ? "Hide" : "View All"} →</button>
      </div>
      <div className="relative mt-[8px] grid grid-cols-5">
        <div className="absolute left-[10%] right-[10%] top-[16px] flex">
          {steps.slice(0, -1).map((st, i) => <span key={st.label} className={cn("h-[2px] flex-1", i < current ? "bg-cs-green" : "bg-[#dedcd6]")} />)}
        </div>
        {steps.map((st, i) => {
          const done = i < current;
          const on = i === current;
          return (
            <div key={st.label} className="relative flex flex-col items-center text-center">
              <span className={cn("grid size-[33px] place-items-center rounded-full border", on ? "border-cs-green bg-cs-green text-white" : done ? "border-cs-mint bg-cs-mint text-cs-green" : "border-[#e2e0da] bg-[#f6f5f1] text-[#4b524e]")}><st.icon className="size-[16px]" strokeWidth={1.7} /></span>
              <p className="mt-[4px] text-[11px] font-semibold">{st.label}</p>
              <p className="text-[9.5px] text-cs-ink-2">{dates[i] ? `${done || on ? "" : "Est. "}${fmtDate(dates[i]!).replace(/ \d{4}$/, "")}` : "—"}</p>
              <span className={cn("mt-[2px] rounded-[4px] px-[5px] py-[1px] text-[9.5px]", done ? "bg-cs-mint text-cs-green-2" : on ? "bg-cs-blue-bg text-cs-blue" : "text-cs-ink-2")}>{done ? "Completed" : on ? "In Progress" : "Upcoming"}</span>
            </div>
          );
        })}
      </div>
      {allSteps && (
        <ul className="mt-[10px] space-y-[4px] rounded-[8px] bg-[#f7f6f2] px-[10px] py-[8px] text-[11.5px]">
          {steps.map((st, i) => <li key={st.label} className="flex justify-between"><span>{st.label}</span><span className="text-cs-ink-2">{dates[i] ? fmtDate(dates[i]!) : "Not started"}</span></li>)}
        </ul>
      )}

      </div>
      <div className="grid shrink-0 grid-cols-3 gap-[8px] pt-[10px]">
        <Btn kind="primary" icon={FileText} className="!px-[8px] !text-[12px]" onClick={() => setEditing(true)}>Edit Brief</Btn>
        <Btn icon={Box} className="!px-[8px] !text-[12px]" onClick={onPack}>View Packaging</Btn>
        <Btn icon={RefreshCw} className="!px-[8px] !text-[12px]" onClick={onReorder}>Create Reorder</Btn>
      </div>
    </aside>
  );
}

function PackagingModal({ p, onClose }: { p: Product | null; onClose: () => void }) {
  const { update, toast } = useConsole();
  if (!p) return null;
  return (
    <Modal open onClose={onClose} title="Packaging variants" sub={`${p.name} · ${p.id}`} width={620}>
      <div className="grid grid-cols-3 gap-[12px]">
        {p.packaging.map((k) => (
          <div key={k.name} className={cn("rounded-[10px] border p-[10px]", k.primary ? "border-cs-green-2/70" : "border-cs-line")}>
            <Image src={PACK_IMG[k.name] ?? k.img} alt={k.name} width={180} height={180} className="h-[130px] w-full rounded-[6px] object-cover" />
            <p className="mt-[8px] text-[13px] font-semibold">{k.name}</p>
            <p className="text-[11.5px] text-cs-ink-2">{k.detail}</p>
            {k.primary ? <Pill tone="green" className="mt-[8px]">Primary</Pill> : (
              <button type="button" className="mt-[8px] text-[12px] font-medium text-cs-green hover:underline" onClick={() => { update((d) => setPrimaryPackaging(d, p.id, k.name)); toast(`${k.name} is now the primary pack`); }}>Set as primary</button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function ReorderModal({ p, onClose }: { p: Product; onClose: () => void }) {
  const { update, toast } = useConsole();
  const [moq, setMoq] = useState(p.moq);
  const [made, setMade] = useState<string | null>(null);
  const create = () => {
    let id: string | null = null;
    update((d) => { id = reorder(d, p.id, moq); });
    if (id) { setMade(id); toast(`Reorder enquiry ${id} created`); }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={made ? "Reorder created" : "Create reorder"}
      sub={`${p.name} · ${p.id}`}
      footer={made
        ? <><Btn onClick={onClose}>Close</Btn><Link href={`/console/enquiries?id=${made}`} className="inline-flex h-[40px] items-center gap-[8px] rounded-[7px] bg-cs-green px-[16px] text-[13px] font-medium text-white">Open {made}</Link></>
        : <><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={RefreshCw} disabled={moq <= 0} onClick={create}>Create reorder</Btn></>}
    >
      {made ? (
        <p className="text-[13px] text-[#3e4440]">A new enquiry <b>{made}</b> for {fmtNum(moq)} units was sent to matched manufacturers. It&apos;s now in Enquiries.</p>
      ) : (
        <div className="space-y-[12px]">
          <Field label="Quantity (units)" hint={`Last target MOQ was ${fmtNum(p.moq)} units`}><input type="number" min={1} className={inputCls} value={moq} onChange={(e) => setMoq(Math.max(0, +e.target.value))} /></Field>
          <p className="text-[12px] text-cs-ink-2">The brief, certifications and packaging are copied from this product.</p>
        </div>
      )}
    </Modal>
  );
}
