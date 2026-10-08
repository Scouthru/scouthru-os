"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Gauge, IndianRupee, Inbox, Mail, MessageCircle, Phone, Plus, Send, Trophy, X, XCircle } from "lucide-react";
import { Btn, Empty, Field, FilterSelect, Hero, Modal, Pill, RowMenu, SearchBox, StatStrip, Tabs, inputCls, textareaCls, type Tone } from "@/components/console/kit";
import { KV, Page, Panel, Split, thc, tdc } from "@/components/console/maker";
import { useConsole } from "@/lib/console/store";
import { addLead, declineEnquiry, submitQuote, updateLead } from "@/lib/console/actions-network";
import { capacityFit, lineFor, mine } from "@/lib/console/actions-maker";
import { ago, fmtDate, fmtNum, inr } from "@/lib/console/format";
import type { ConsoleState, Enquiry, FactoryLead } from "@/lib/console/types";
import { cn } from "@/lib/cn";

type Tab = "brand" | "leads" | "quoted" | "won" | "declined";
type Row = {
  key: string; kind: "brand" | "lead"; id: string; name: string; buyer: string; source: string; qty: number; at: string;
  status: "To quote" | "Quoted" | "Won" | "Declined" | "Lost" | "New"; img?: string;
};
const STATUS_TONE: Record<Row["status"], Tone> = { "To quote": "orange", New: "orange", Quoted: "violet", Won: "green", Declined: "gray", Lost: "gray" };
const SOURCE_ICON = { Scouthru: ClipboardList, IndiaMART: Inbox, WhatsApp: MessageCircle, Phone, Email: Mail } as const;

function brandStatus(s: ConsoleState, e: Enquiry): Row["status"] {
  const r = e.responses.find((x) => x.mfrId === s.makerId)!;
  if (r.status === "Declined") return "Declined";
  const won = s.samples.some((x) => x.enquiryId === e.id && x.mfrId === s.makerId) || (e.stage === "In Production" && s.orders.some((o) => o.mfrId === s.makerId && o.name === e.name));
  if (won) return "Won";
  if (r.status === "Quote Received") return "Quoted";
  return "To quote";
}

function rows(s: ConsoleState): Row[] {
  const brand = mine(s).enquiries.filter((e) => e.stage !== "Closed" || brandStatus(s, e) === "Won").map((e) => ({
    key: `b-${e.id}`, kind: "brand" as const, id: e.id, name: e.name, buyer: s.workspace, source: "Scouthru", qty: e.moq, at: e.updatedAt, status: brandStatus(s, e), img: e.img,
  }));
  const leads = s.leads.map((l) => ({ key: `l-${l.id}`, kind: "lead" as const, id: l.id, name: l.product, buyer: l.buyer, source: l.source, qty: l.qty, at: l.at, status: (l.status === "Lost" ? "Lost" : l.status) as Row["status"] }));
  return [...brand, ...leads].sort((a, b) => b.at.localeCompare(a.at));
}

const IN_TAB: Record<Tab, (r: Row) => boolean> = {
  brand: (r) => r.kind === "brand" && r.status === "To quote",
  leads: (r) => r.kind === "lead" && r.status === "New",
  quoted: (r) => r.status === "Quoted",
  won: (r) => r.status === "Won",
  declined: (r) => r.status === "Declined" || r.status === "Lost",
};

export default function MakerEnquiriesPage() {
  return <Suspense><MakerEnquiries /></Suspense>;
}

function MakerEnquiries() {
  const { s, update, toast } = useConsole();
  const params = useSearchParams();
  const router = useRouter();
  const all = useMemo(() => rows(s), [s]);
  const [tab, setTab] = useState<Tab>("brand");
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [quoteFor, setQuoteFor] = useState<Row | null>(null);
  const [declineFor, setDeclineFor] = useState<Row | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);

  // deep links: ?id=ENQ-…, ?lead=LD-…, ?newLead=1
  useEffect(() => {
    const id = params.get("id"), lead = params.get("lead");
    const r = id ? all.find((x) => x.kind === "brand" && x.id === id) : lead ? all.find((x) => x.kind === "lead" && x.id === lead) : null;
    if (r) { setSel(r.key); setTab((Object.keys(IN_TAB) as Tab[]).find((t) => IN_TAB[t](r)) ?? "brand"); }
    if (params.get("newLead")) setLeadOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const list = all.filter((r) => IN_TAB[tab](r) && (!source || r.source === source) && (!q.trim() || `${r.name} ${r.id} ${r.buyer}`.toLowerCase().includes(q.trim().toLowerCase())));
  const current = all.find((r) => r.key === sel) ?? list[0] ?? null;
  const count = (t: Tab) => all.filter(IN_TAB[t]).length;
  const wonThisMonth = all.filter((r) => r.status === "Won" && Date.now() - new Date(r.at).getTime() < 30 * 864e5).length;
  const decided = all.filter((r) => ["Won", "Lost", "Declined"].includes(r.status));
  const winRate = decided.length ? Math.round((decided.filter((r) => r.status === "Won").length / decided.length) * 100) : 0;

  return (
    <div>
      <Hero eyebrow="RESPOND · QUOTE · WIN" title="Enquiries & Leads" lede={<>Brand enquiries from Scouthru and leads from IndiaMART, WhatsApp and calls,<br />in one inbox. Check capacity, quote, and win the order.</>} img="/console/hero-enquiries.jpg" height={160} quoteTop={44} quoteWidth={184} quote={["Every enquiry.", "One inbox.", "Quoted fast."]} />
      <Page>
        <StatStrip items={[
          { icon: ClipboardList, tone: "orange", value: count("brand"), label: "Quotes to Send", delta: "Brand enquiries waiting", deltaTone: "muted" },
          { icon: Inbox, tone: "blue", value: count("leads"), label: "New Leads", delta: "From outside Scouthru", deltaTone: "muted" },
          { icon: Send, tone: "violet", value: count("quoted"), label: "Quoted", delta: "Waiting for the buyer", deltaTone: "muted" },
          { icon: Trophy, tone: "green", value: wonThisMonth, label: "Won This Month", delta: `${count("won")} won in total` },
          { icon: CheckCircle2, tone: "green", value: `${winRate}%`, label: "Win Rate", delta: `${decided.length} decided` },
        ]} />

        <Split side="1.05fr" hero={160}>
          <Panel>
            <div className="px-[15px] pt-[12px]">
              <Tabs<Tab> value={tab} onChange={(t) => { setTab(t); setSel(null); }} tabs={[
                { key: "brand", label: `Brand Enquiries (${count("brand")})` }, { key: "leads", label: `Leads (${count("leads")})` }, { key: "quoted", label: `Quoted (${count("quoted")})` },
                { key: "won", label: `Won (${count("won")})` }, { key: "declined", label: `Declined / Lost (${count("declined")})` },
              ]} />
              <div className="mt-[12px] flex flex-wrap items-center gap-[8px]">
                <SearchBox value={q} onChange={setQ} placeholder="Search product, buyer or ID..." className="w-full min-[1024px]:w-[300px]" />
                <FilterSelect label="All sources" value={source} onChange={setSource} options={["Scouthru", "IndiaMART", "WhatsApp", "Phone", "Email"]} className="w-[130px]" />
                <Btn kind="primary" icon={Plus} className="ml-auto h-[34px] text-[12.5px]" onClick={() => setLeadOpen(true)}>Log a lead</Btn>
              </div>
            </div>
            <div className="mt-[10px] overflow-x-auto px-[7px]">
              <table className="w-full min-w-[620px] border-separate border-spacing-0">
                <thead><tr><th className={thc}>Product & Buyer</th><th className={thc}>Source</th><th className={thc}>Quantity</th><th className={thc}>Received</th><th className={thc}>Status</th><th className={thc}><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {list.map((r) => {
                    const Icon = SOURCE_ICON[r.source as keyof typeof SOURCE_ICON] ?? Inbox;
                    const on = current?.key === r.key;
                    return (
                      <tr key={r.key} onClick={() => setSel(r.key)} className={cn("cursor-pointer", on ? "bg-cs-mint/50" : "hover:bg-[#faf9f5]")}>
                        <td className={cn(tdc, on && "border-l-2 border-l-cs-green")}>
                          <div className="flex items-center gap-[10px]">
                            {r.img ? <Image src={r.img} alt="" width={36} height={36} className="size-[36px] rounded-[6px] object-cover" /> : <span className="grid size-[36px] place-items-center rounded-[6px] bg-cs-cream text-cs-green"><Icon className="size-[16px]" strokeWidth={1.7} /></span>}
                            <div className="min-w-0"><p className="truncate font-medium text-[#1d211e]">{r.name}</p><p className="truncate text-[11px] text-cs-ink-2">{r.buyer} · {r.id}</p></div>
                          </div>
                        </td>
                        <td className={tdc}><span className="inline-flex items-center gap-[5px] text-[11.5px]"><Icon className="size-[13px] text-cs-ink-2" />{r.source}</span></td>
                        <td className={tdc}>{fmtNum(r.qty)}<span className="block text-[11px] text-cs-ink-2">units</span></td>
                        <td className={tdc}>{ago(r.at)}</td>
                        <td className={tdc}><Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill></td>
                        <td className={cn(tdc, "w-[34px]")}>
                          <RowMenu items={[
                            { label: "Open", onClick: () => setSel(r.key) },
                            ...(r.status === "To quote" || r.status === "New" || r.status === "Quoted" ? [{ label: r.status === "Quoted" ? "Update quote" : "Send quote", icon: Send, onClick: () => setQuoteFor(r) }] : []),
                            ...(r.kind === "brand" && r.status !== "Declined" && r.status !== "Won" ? [{ label: "Decline", icon: XCircle, onClick: () => setDeclineFor(r), danger: true }] : []),
                            ...(r.kind === "lead" && r.status !== "Won" && r.status !== "Lost" ? [{ label: "Mark won", icon: Trophy, onClick: () => { update((d) => updateLead(d, r.id, { status: "Won" })); toast(`${r.id} marked won`); } }, { label: "Mark lost", icon: X, onClick: () => { update((d) => updateLead(d, r.id, { status: "Lost" })); toast(`${r.id} marked lost`); }, danger: true }] : []),
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {list.length === 0 && <Empty>Nothing here. {tab === "brand" ? "All brand enquiries are quoted." : "Try another tab or clear the search."}</Empty>}
            </div>
          </Panel>

          <Detail row={current} onQuote={setQuoteFor} onDecline={setDeclineFor} onClose={() => setSel(null)} goBrand={(id) => router.push(`/console/enquiries?id=${id}`)} />
        </Split>
      </Page>

      {quoteFor && <QuoteModal row={quoteFor} onClose={() => setQuoteFor(null)} />}
      {declineFor && (
        <DeclineModal row={declineFor} onClose={() => setDeclineFor(null)} onDecline={(reason) => {
          update((d) => declineEnquiry(d, declineFor.id, d.makerId, reason));
          toast(`Declined ${declineFor.id}`);
          setDeclineFor(null);
        }} />
      )}
      {leadOpen && <LeadModal onClose={() => setLeadOpen(false)} onSaved={(id) => { setLeadOpen(false); setTab("leads"); setSel(`l-${id}`); }} />}
    </div>
  );
}

function FitBadge({ name, qty }: { name: string; qty: number }) {
  const { s } = useConsole();
  const line = lineFor(name);
  const fit = capacityFit(s, line, qty);
  return (
    <div className={cn("rounded-[8px] border px-[11px] py-[9px]", fit.fits ? "border-[#cfe5d4] bg-cs-mint/50" : "border-[#f3d6b9] bg-cs-orange-bg/60")}>
      <p className="flex items-center gap-[7px] text-[12.5px] font-semibold"><Gauge className={cn("size-[15px]", fit.fits ? "text-cs-green-2" : "text-cs-orange")} />{fit.fits ? "Fits this month's capacity" : "Needs a partner unit or a later slot"}</p>
      <p className="mt-[2px] text-[11.5px] text-cs-ink-2">{line}: needs {fmtNum(fit.need)}, {fmtNum(fit.free)} free{fit.fits ? "" : ` (short by ${fmtNum(fit.shortfall)})`}</p>
    </div>
  );
}

function Detail({ row, onQuote, onDecline, onClose, goBrand }: { row: Row | null; onQuote: (r: Row) => void; onDecline: (r: Row) => void; onClose: () => void; goBrand: (id: string) => void }) {
  const { s, update, toast } = useConsole();
  if (!row) return <Panel><Empty>Pick an enquiry or lead to see the details.</Empty></Panel>;
  const e = row.kind === "brand" ? s.enquiries.find((x) => x.id === row.id) : undefined;
  const lead = row.kind === "lead" ? s.leads.find((x) => x.id === row.id) : undefined;
  const myQuote = e?.quotes.find((x) => x.mfrId === s.makerId);
  const myResp = e?.responses.find((x) => x.mfrId === s.makerId);
  const canQuote = row.status === "To quote" || row.status === "New" || row.status === "Quoted";

  return (
    <Panel className="relative" bodyClass="px-[15px] pb-[14px] pt-[14px]">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute right-[10px] top-[10px] grid size-[28px] place-items-center rounded-[6px] hover:bg-[#f1f0ec]"><X className="size-[16px]" /></button>
      <div className="flex items-start gap-[12px] pr-[30px]">
        {row.img ? <Image src={row.img} alt="" width={72} height={72} className="size-[64px] rounded-[8px] object-cover" /> : <span className="grid size-[64px] place-items-center rounded-[8px] bg-cs-cream text-cs-green"><Inbox className="size-[24px]" strokeWidth={1.6} /></span>}
        <div className="min-w-0">
          <h3 className="serif text-[19px] font-semibold leading-tight">{row.name}</h3>
          <p className="mt-[2px] text-[12px] text-cs-ink-2">{row.id} · {row.buyer} · via {row.source}</p>
          <Pill tone={STATUS_TONE[row.status]} className="mt-[6px]">{row.status}</Pill>
        </div>
      </div>

      <dl className="mt-[12px]">
        <KV k="Quantity" v={`${fmtNum(row.qty)} units`} />
        {e && <><KV k="Target price" v={e.price} /><KV k="Target launch" v={e.launch} /><KV k="Category" v={e.category} /></>}
        <KV k="Received" v={`${fmtDate(row.at)} · ${ago(row.at)}`} />
        {myQuote && <KV k="Your quote" v={<span className="font-semibold">{inr(myQuote.unitPrice)}/unit · MOQ {fmtNum(myQuote.moq)} · {myQuote.leadWeeks} wks</span>} />}
        {lead?.quote && <KV k="Your quote" v={<span className="font-semibold">₹{lead.quote}/unit</span>} />}
      </dl>

      <div className="mt-[12px]"><FitBadge name={`${row.name} ${e?.tags.join(" ") ?? ""}`} qty={row.qty} /></div>

      <h4 className="serif mt-[14px] text-[16px] font-semibold">{e ? "Brand's brief" : "Notes"}</h4>
      <p className="mt-[4px] text-[12.5px] leading-[1.5] text-[#3e4440]">{e?.brief ?? lead?.note}</p>
      {e && (
        <div className="mt-[8px] flex flex-wrap gap-[6px]">{e.requirements.map((r) => <span key={r} className="rounded-[5px] bg-[#f1f0ec] px-[9px] py-[3px] text-[11.5px]">{r}</span>)}</div>
      )}
      {myResp?.status === "Declined" && <p className="mt-[10px] rounded-[7px] bg-[#f5f3ee] px-[10px] py-[8px] text-[12px] text-cs-ink-2">You declined: {myResp.note}</p>}

      {e && (
        <>
          <h4 className="serif mt-[14px] text-[16px] font-semibold">History</h4>
          <ul className="mt-[4px] space-y-[6px] text-[12px]">
            {e.activity.slice(-4).reverse().map((a, i) => <li key={i} className="flex justify-between gap-3"><span className="text-[#3e4440]">{a.text}</span><span className="shrink-0 text-cs-ink-2">{ago(a.at)}</span></li>)}
          </ul>
        </>
      )}

      <div className="mt-[14px] flex flex-wrap gap-[8px]">
        {canQuote && <Btn kind="primary" icon={Send} className="flex-1" onClick={() => onQuote(row)}>{row.status === "Quoted" ? "Update quote" : "Send quote"}</Btn>}
        {row.kind === "brand" && row.status !== "Declined" && row.status !== "Won" && <Btn kind="danger" icon={XCircle} onClick={() => onDecline(row)}>Decline</Btn>}
        {row.kind === "lead" && row.status !== "Won" && row.status !== "Lost" && (
          <>
            <Btn icon={Trophy} onClick={() => { update((d) => updateLead(d, row.id, { status: "Won" })); toast(`${row.id} marked won`); }}>Won</Btn>
            <Btn icon={X} onClick={() => { update((d) => updateLead(d, row.id, { status: "Lost" })); toast(`${row.id} marked lost`); }}>Lost</Btn>
          </>
        )}
        {row.kind === "brand" && row.status === "Won" && <Btn icon={IndianRupee} onClick={() => goBrand(row.id)}>See it as the brand</Btn>}
      </div>
    </Panel>
  );
}

function QuoteModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const { s, update, toast } = useConsole();
  const e = row.kind === "brand" ? s.enquiries.find((x) => x.id === row.id) : undefined;
  const lead = row.kind === "lead" ? s.leads.find((x) => x.id === row.id) : undefined;
  const prev = e?.quotes.find((x) => x.mfrId === s.makerId);
  const [price, setPrice] = useState(String(prev?.unitPrice ?? lead?.quote ?? ""));
  const [moq, setMoq] = useState(String(prev?.moq ?? row.qty));
  const [weeks, setWeeks] = useState(String(prev?.leadWeeks ?? 5));
  const [note, setNote] = useState("");
  const p = Number(price), m = Number(moq), w = Number(weeks);
  const ok = p > 0 && m > 0 && w > 0;
  return (
    <Modal open onClose={onClose} title={prev || lead?.quote ? "Update quote" : "Send quote"} sub={`${row.name} · ${row.buyer}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={Send} disabled={!ok} onClick={() => {
        if (row.kind === "brand") update((d) => submitQuote(d, row.id, d.makerId, { unitPrice: p, moq: m, leadWeeks: w, note }));
        else update((d) => updateLead(d, row.id, { status: "Quoted", quote: p }));
        toast(row.kind === "brand" ? `Quote sent to ${s.workspace}` : `Quote saved on ${row.id}`);
        onClose();
      }}>Send quote</Btn></>}>
      <div className="space-y-[12px]">
        <div className="grid grid-cols-3 gap-[10px]">
          <Field label="Unit price (₹)"><input className={inputCls} type="number" min={0} step={0.1} value={price} onChange={(ev) => setPrice(ev.target.value)} autoFocus /></Field>
          <Field label="MOQ (units)"><input className={inputCls} type="number" min={1} value={moq} onChange={(ev) => setMoq(ev.target.value)} /></Field>
          <Field label="Lead time (weeks)"><input className={inputCls} type="number" min={1} value={weeks} onChange={(ev) => setWeeks(ev.target.value)} /></Field>
        </div>
        {row.kind === "brand" && <Field label="Note to the brand"><textarea className={cn(textareaCls, "h-[74px]")} value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="e.g. Includes COA and stability data; capsules from our own shell stock." /></Field>}
        {ok && <p className="text-[12px] text-cs-ink-2">Order value at MOQ: {inr(p * m)} · valid 15 days</p>}
        <FitBadge name={row.name} qty={m || row.qty} />
      </div>
    </Modal>
  );
}

function DeclineModal({ row, onClose, onDecline }: { row: Row; onClose: () => void; onDecline: (reason: string) => void }) {
  const [reason, setReason] = useState("No free capacity in the requested window");
  return (
    <Modal open onClose={onClose} title="Decline enquiry" sub={`${row.name} · ${row.id}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="danger" icon={XCircle} disabled={!reason.trim()} onClick={() => onDecline(reason.trim())}>Decline</Btn></>}>
      <Field label="Reason (the brand sees this)">
        <select className={inputCls} value={["No free capacity in the requested window", "Not a product we make", "MOQ too low for our lines", "Price target not workable"].includes(reason) ? reason : "Other"} onChange={(ev) => setReason(ev.target.value === "Other" ? "" : ev.target.value)}>
          {["No free capacity in the requested window", "Not a product we make", "MOQ too low for our lines", "Price target not workable", "Other"].map((r) => <option key={r}>{r}</option>)}
        </select>
      </Field>
      <div className="mt-[10px]"><Field label="Details"><input className={inputCls} value={reason} onChange={(ev) => setReason(ev.target.value)} /></Field></div>
    </Modal>
  );
}

function LeadModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const { update, toast } = useConsole();
  const [f, setF] = useState<{ product: string; buyer: string; source: FactoryLead["source"]; qty: string; note: string }>({ product: "", buyer: "", source: "IndiaMART", qty: "", note: "" });
  const ok = f.product.trim() && f.buyer.trim() && Number(f.qty) > 0;
  return (
    <Modal open onClose={onClose} title="Log a lead" sub="Bring in an enquiry from IndiaMART, WhatsApp, a call or email."
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={Plus} disabled={!ok} onClick={() => {
        let id = "";
        update((d) => { id = addLead(d, { product: f.product.trim(), buyer: f.buyer.trim(), source: f.source, qty: Number(f.qty), note: f.note.trim() }); });
        toast(`Lead ${id} logged`);
        onSaved(id);
      }}>Save lead</Btn></>}>
      <div className="space-y-[12px]">
        <Field label="Product"><input className={inputCls} value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })} placeholder="e.g. Biotin gummies" autoFocus /></Field>
        <Field label="Buyer"><input className={inputCls} value={f.buyer} onChange={(e) => setF({ ...f, buyer: e.target.value })} placeholder="Company or person" /></Field>
        <div className="grid grid-cols-2 gap-[10px]">
          <Field label="Source"><select className={inputCls} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as FactoryLead["source"] })}>{["IndiaMART", "WhatsApp", "Phone", "Email"].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Quantity (units)"><input className={inputCls} type="number" min={1} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></Field>
        </div>
        <Field label="Notes"><textarea className={cn(textareaCls, "h-[64px]")} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
