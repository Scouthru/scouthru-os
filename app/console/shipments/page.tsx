"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowDown, ArrowUp, BarChart3, Box, Check as CheckIcon, CheckCircle2, Download, ExternalLink, FileText, IndianRupee, List,
  Mail, MapPin, MessageSquare, Navigation, Phone, Share2, Truck, X,
} from "lucide-react";
import { Btn, Check, Empty, Field, FilterSelect, Hero, Modal, Pill, RowMenu, SearchBox, StatStrip, Tabs, inputCls, textareaCls, type Tone } from "@/components/console/kit";
import { Carrier, WINDOWS, copyText, inWindow, th } from "@/components/console/ops";
import { useConsole } from "@/lib/console/store";
import { advanceShipment, sendMessage } from "@/lib/console/actions";
import { markDelayed } from "@/lib/console/actions-ops";
import { ago, download, fmtDate, fmtDateTime, fmtNum, inr, csv } from "@/lib/console/format";
import { SHIP_STEPS, type Shipment, type ShipStatus } from "@/lib/console/types";
import { cn } from "@/lib/cn";

const STATUS_TONE: Record<ShipStatus, Tone> = { "In Transit": "blue", Delivered: "green", Delayed: "red", Pending: "orange" };
type TabKey = "all" | "transit" | "delivered" | "delayed" | "pending";
const TAB_STATUS: Record<TabKey, ShipStatus | null> = { all: null, transit: "In Transit", delivered: "Delivered", delayed: "Delayed", pending: "Pending" };
type PanelTab = "overview" | "tracking" | "documents" | "orders" | "activity";

export default function ShipmentsPage() {
  return (
    <Suspense>
      <Shipments />
    </Suspense>
  );
}

function Shipments() {
  const { s, update, toast } = useConsole();
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("");
  const [dest, setDest] = useState("");
  const [carrier, setCarrier] = useState("");
  const [win, setWin] = useState("");
  const [compact, setCompact] = useState(false);
  const [sel, setSel] = useState<string | null>(params.get("id") ?? s.shipments[0]?.id ?? null);
  const [checked, setChecked] = useState<string[]>(() => [params.get("id") ?? s.shipments[0]?.id].filter(Boolean) as string[]);
  const [ptab, setPtab] = useState<PanelTab>("overview");
  const [allEvents, setAllEvents] = useState(false);
  const [msgFor, setMsgFor] = useState<Shipment | null>(null);
  const [delayFor, setDelayFor] = useState<Shipment | null>(null);

  useEffect(() => {
    const id = params.get("id");
    if (id) { setSel(id); setPtab("overview"); }
  }, [params]);

  const days = win ? WINDOWS[win as keyof typeof WINDOWS] : 30;
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return s.shipments.filter((x) =>
      (!TAB_STATUS[tab] || x.status === TAB_STATUS[tab]) &&
      (!t || [x.id, x.name, x.destination, x.carrier].some((v) => v.toLowerCase().includes(t))) &&
      (!cat || x.category === cat) && (!status || x.status === status) && (!dest || x.destination === dest) && (!carrier || x.carrier === carrier) &&
      inWindow(x.updatedAt, days),
    );
  }, [s.shipments, tab, q, cat, status, dest, carrier, days]);

  const count = (st: ShipStatus | null) => s.shipments.filter((x) => !st || x.status === st).length;
  const ship = s.shipments.find((x) => x.id === sel) ?? null;

  // stats
  const weekAgo = Date.now() - 7 * 864e5;
  const deliveredThisWeek = s.shipments.filter((x) => x.status === "Delivered" && new Date(x.eta).getTime() >= weekAgo).length;
  const deliveredLastWeek = s.shipments.filter((x) => x.status === "Delivered" && new Date(x.eta).getTime() < weekAgo && new Date(x.eta).getTime() >= weekAgo - 7 * 864e5).length;
  const moving = s.shipments.filter((x) => x.status !== "Pending");
  const onTime = moving.length ? Math.round((moving.filter((x) => x.status !== "Delayed").length / moving.length) * 100) : 100;
  const arrivingWeek = s.shipments.filter((x) => x.status === "In Transit" && new Date(x.eta).getTime() <= Date.now() + 7 * 864e5).length;

  const opts = (f: (x: Shipment) => string) => Array.from(new Set(s.shipments.map(f))).sort();

  const advance = (x: Shipment) => {
    update((d) => advanceShipment(d, x.id));
    const next = SHIP_STEPS[Math.min(SHIP_STEPS.length - 1, x.step + 1)];
    toast(`${x.id} updated: ${next}`);
  };

  const shareEta = async (x: Shipment) => {
    const text = x.status === "Delivered"
      ? `${x.id} (${x.name}) was delivered to ${x.destination} on ${fmtDate(x.eta)}.`
      : `${x.id} (${x.name}, ${fmtNum(x.qty)} units) via ${x.carrier} is ${x.status.toLowerCase()} — ETA ${fmtDate(x.eta)} at ${x.destination}.`;
    const ok = await copyText(text);
    toast(ok ? "ETA copied to clipboard" : text, ok ? "ok" : "info");
  };

  const toggle = (id: string) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const allChecked = list.length > 0 && list.every((x) => checked.includes(x.id));

  const exportSelected = () => {
    const rows = s.shipments.filter((x) => checked.includes(x.id));
    download(`shipments-${new Date().toISOString().slice(0, 10)}.csv`, csv([["Shipment", "Product", "Qty", "Carrier", "Destination", "ETA", "Status"], ...rows.map((x) => [x.id, x.name, x.qty, x.carrier, x.destination, fmtDate(x.eta), x.status])]));
    toast(`Exported ${rows.length} shipment${rows.length === 1 ? "" : "s"}`);
  };

  return (
    <div>
      <Hero
        eyebrow="SHIP  ·  TRACK  ·  DELIVER"
        title="Shipments & Logistics"
        lede={<span className="whitespace-nowrap">Track dispatches, monitor transit progress, and keep delivery commitments on schedule.</span>}
        img="/console/hero-shipments.jpg"
        quote={["Every shipment.", "Visible.", "On time."]}
        height={142}
        quoteTop={32}
        quoteWidth={192}
      />
      <div className="px-[15px] pb-[20px]">
        <StatStrip
          items={[
            { icon: Truck, tone: "blue", value: count("In Transit"), label: "Shipments in Transit", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />{arrivingWeek} arriving this week</> },
            { icon: CheckIcon, tone: "green", value: deliveredThisWeek, label: "Delivered This Week", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />{deliveredLastWeek} last week</> },
            { icon: AlertTriangle, tone: "red", value: count("Delayed"), label: "Delayed", delta: <><ArrowDown className="mr-[3px] inline size-[13px]" />{count("Delayed") ? "needs attention" : "none right now"}</>, deltaTone: count("Delayed") ? "bad" : "up" },
            { icon: BarChart3, tone: "green", value: `${onTime}%`, label: "On-Time Rate", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />{moving.length - count("Delayed")} of {moving.length} on schedule</> },
            { icon: FileText, tone: "orange", value: count("Pending"), label: "Pending Dispatch", delta: <><ArrowDown className="mr-[3px] inline size-[13px]" />{s.shipments.filter((x) => x.status === "Pending" && /ready/i.test(x.note)).length} ready to ship</> },
          ]}
        />

        <div className={cn("mt-[11px] grid gap-[11px] min-[1024px]:h-[751px]", ship && "min-[1024px]:grid-cols-[minmax(0,2.11fr)_minmax(0,1fr)]")}>
          <section className="cs-card flex min-h-0 min-w-0 flex-col px-[14px] pt-[13px]">
            <Tabs
              value={tab}
              onChange={(k) => setTab(k)}
              tabs={[
                { key: "all", label: `All Shipments (${count(null)})` },
                { key: "transit", label: `In Transit (${count("In Transit")})` },
                { key: "delivered", label: `Delivered (${count("Delivered")})` },
                { key: "delayed", label: `Delayed (${count("Delayed")})` },
                { key: "pending", label: `Pending Dispatch (${count("Pending")})` },
              ]}
            />
            <div className="mt-[14px] flex items-center gap-[8px] [&_input]:text-[11px] [&_select]:!h-[32px] [&_select]:!pl-[9px] [&_select]:!pr-[20px] [&_select]:!text-[10.5px] [&_svg]:right-[6px] [&>label]:h-[32px]">
              <SearchBox value={q} onChange={setQ} placeholder="Search by shipment ID, product, or destination..." className="min-w-0 flex-1" />
              <FilterSelect label="Product Category" value={cat} onChange={setCat} options={opts((x) => x.category)} className="w-[116px] shrink-0" />
              <FilterSelect label="Status" value={status} onChange={setStatus} options={["In Transit", "Delivered", "Delayed", "Pending"]} className="w-[60px] shrink-0" />
              <FilterSelect label="Destination" value={dest} onChange={setDest} options={opts((x) => x.destination)} className="w-[84px] shrink-0" />
              <FilterSelect label="Carrier" value={carrier} onChange={setCarrier} options={opts((x) => x.carrier)} className="w-[66px] shrink-0" />
              <FilterSelect label="Last 30 Days" value={win} onChange={setWin} options={["Last 7 Days", "Last 90 Days", "All Time"]} className="w-[94px] shrink-0" />
              <button type="button" aria-label={compact ? "Comfortable rows" : "Compact rows"} aria-pressed={compact} onClick={() => setCompact((c) => !c)} className={cn("grid size-[32px] shrink-0 place-items-center rounded-[6px] border border-cs-line", compact ? "bg-cs-mint text-cs-green" : "bg-white")}>
                <List className="size-[16px]" strokeWidth={1.7} />
              </button>
            </div>

            {checked.length > 1 && (
              <div className="mt-[10px] flex items-center gap-[10px] rounded-[7px] bg-cs-mint px-[12px] py-[7px] text-[12.5px]">
                <span className="font-medium text-cs-green">{checked.length} selected</span>
                <button type="button" className="font-medium text-cs-green underline-offset-2 hover:underline" onClick={() => { const n = checked.filter((id) => s.shipments.find((x) => x.id === id)?.status !== "Delivered").length; update((d) => checked.forEach((id) => advanceShipment(d, id))); toast(`Advanced ${n} shipment${n === 1 ? "" : "s"}`); }}>Advance status</button>
                <button type="button" className="font-medium text-cs-green underline-offset-2 hover:underline" onClick={exportSelected}>Export CSV</button>
                <button type="button" className="ml-auto text-cs-ink-2 hover:text-cs-ink" onClick={() => setChecked([])}>Clear</button>
              </div>
            )}

            <div className="mt-[22px] min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-y-[1px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#f7f6f2]">
                    <th className={cn(th, "w-[34px] rounded-l-[6px] pl-[10px]")}><Check checked={allChecked} onChange={(v) => setChecked(v ? Array.from(new Set([...checked, ...list.map((x) => x.id)])) : checked.filter((id) => !list.some((x) => x.id === id)))} label="Select all" /></th>
                    <th className={th}>Shipment &amp; Product</th>
                    <th className={th}>Category</th>
                    <th className={th}>Quantity</th>
                    <th className={th}>Carrier</th>
                    <th className={th}>Destination</th>
                    <th className={th}>ETA</th>
                    <th className={th}>Status</th>
                    <th className={th}>Last Update</th>
                    <th className={cn(th, "rounded-r-[6px]")}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((x) => {
                    const on = x.id === sel;
                    return (
                      <tr key={x.id} onClick={() => { setSel(x.id); setPtab("overview"); setChecked((c) => (c.length <= 1 ? [x.id] : c)); router.replace(`/console/shipments?id=${x.id}`, { scroll: false }); }} className={cn("group cursor-pointer", on ? "[&>td]:border-y-[1.5px] [&>td]:border-cs-green-2/70 [&>td:first-child]:rounded-l-[8px] [&>td:first-child]:border-l-[1.5px] [&>td:last-child]:rounded-r-[8px] [&>td:last-child]:border-r-[1.5px] [&>td]:bg-[#fbfdfb]" : "[&>td]:border-b [&>td]:border-cs-line hover:[&>td]:bg-[#faf9f6]")}>
                        <td className="pl-[10px]"><Check checked={checked.includes(x.id)} onChange={() => toggle(x.id)} label={`Select ${x.id}`} /></td>
                        <td className={cn("px-[8px]", compact ? "py-[6px]" : "py-[8px]")}>
                          <div className="flex items-center gap-[10px]">
                            {!compact && <Image src={x.img} alt="" width={42} height={42} className="size-[42px] shrink-0 rounded-[6px] object-cover" />}
                            <div className="min-w-0">
                              <p className="whitespace-nowrap text-[11.5px] font-semibold text-[#1d211e]">{x.id}</p>
                              <p className="line-clamp-2 w-[112px] text-[11px] leading-[1.3] text-[#3e4440]">{x.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[86px] px-[8px] text-[11px] leading-tight text-cs-ink-2">{x.category}</td>
                        <td className="px-[8px] text-[11.5px] leading-tight text-[#2b302d]">{fmtNum(x.qty)}<br /><span className="text-cs-ink-2">units</span></td>
                        <td className="px-[8px]"><Carrier name={x.carrier} /></td>
                        <td className="px-[8px] text-[11.5px] leading-tight text-[#2b302d]">{x.destination.split(", ")[0]},<br />{x.destination.split(", ")[1]}</td>
                        <td className="whitespace-nowrap px-[8px] text-[11.5px] text-[#2b302d]">{fmtDate(x.eta)}</td>
                        <td className="px-[8px]"><Pill tone={STATUS_TONE[x.status]}>{x.status}</Pill></td>
                        <td className="whitespace-nowrap px-[8px] text-[11px] leading-tight text-[#2b302d]">{fmtDate(x.updatedAt)}<br /><span className="text-cs-ink-2">{x.status === "Delivered" ? "Delivered" : x.note || ago(x.updatedAt)}</span></td>
                        <td className="pr-[8px]">
                          <RowMenu
                            items={[
                              { label: "Open", icon: ExternalLink, onClick: () => { setSel(x.id); setPtab("overview"); } },
                              { label: x.status === "Delivered" ? "Delivered" : `Advance to ${SHIP_STEPS[Math.min(4, x.step + 1)]}`, icon: Navigation, disabled: x.status === "Delivered", onClick: () => advance(x) },
                              { label: "Mark delayed…", icon: AlertTriangle, disabled: x.status === "Delivered", onClick: () => setDelayFor(x) },
                              { label: "Contact carrier", icon: MessageSquare, onClick: () => setMsgFor(x) },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {list.length === 0 && <Empty>No shipments match these filters.</Empty>}
            </div>
            <div className="h-[10px] shrink-0" />
          </section>

          {ship && (
            <ShipmentPanel
              x={ship}
              tab={ptab}
              setTab={setPtab}
              allEvents={allEvents}
              setAllEvents={setAllEvents}
              onClose={() => { setSel(null); router.replace("/console/shipments", { scroll: false }); }}
              onAdvance={() => advance(ship)}
              onShare={() => shareEta(ship)}
              onContact={() => setMsgFor(ship)}
              onDelay={() => setDelayFor(ship)}
            />
          )}
        </div>
      </div>

      <ContactCarrier x={msgFor} onClose={() => setMsgFor(null)} />
      <DelayModal x={delayFor} onClose={() => setDelayFor(null)} />
    </div>
  );
}

function ShipmentPanel({ x, tab, setTab, allEvents, setAllEvents, onClose, onAdvance, onShare, onContact, onDelay }: {
  x: Shipment; tab: PanelTab; setTab: (t: PanelTab) => void; allEvents: boolean; setAllEvents: (v: boolean) => void;
  onClose: () => void; onAdvance: () => void; onShare: () => void; onContact: () => void; onDelay: () => void;
}) {
  const { s, toast } = useConsole();
  const order = s.orders.find((o) => o.id === x.orderId);
  const mfr = s.manufacturers.find((m) => m.id === order?.mfrId) ?? s.manufacturers[0];
  const account = mfr.contacts[0];
  const events = allEvents ? x.events : x.events.slice(0, 4);
  const delivered = x.status === "Delivered";

  return (
    <aside className="cs-card flex min-h-0 min-w-0 flex-col px-[13px] pb-[13px] pt-[11px]">
      <div className="-mx-[4px] min-h-0 flex-1 overflow-y-auto px-[4px]">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Close panel" onClick={onClose} className="grid size-[24px] place-items-center rounded-[5px] hover:bg-[#f1f0ec]"><X className="size-[16px]" /></button>
        <RowMenu items={[
          { label: "Advance status", icon: Navigation, disabled: delivered, onClick: onAdvance },
          { label: "Mark delayed…", icon: AlertTriangle, disabled: delivered, onClick: onDelay },
          { label: "Share ETA", icon: Share2, onClick: onShare },
          { label: "Download documents list", icon: Download, onClick: () => { download(`${x.id}-documents.csv`, csv([["Document"], ...x.documents.map((d) => [d])])); toast("Document list downloaded"); } },
        ]} />
      </div>
      <div className="mt-[2px] flex items-start gap-[12px]">
        <Image src={x.img} alt="" width={66} height={66} className="size-[58px] shrink-0 rounded-[8px] object-cover" />
        <div className="min-w-0 flex-1 pt-[4px]">
          <div className="flex items-start justify-between gap-2">
            <p className="serif text-[18px] font-semibold leading-tight">{x.id}</p>
            <Pill tone={STATUS_TONE[x.status]}>{x.status}</Pill>
          </div>
          <div className="mt-[3px] flex items-center justify-between gap-2">
            <p className="truncate text-[12.5px] text-[#3e4440]">{x.name}</p>
            {order && <Link href={`/console/production?id=${order.id}`} aria-label="Open the production order" className="text-cs-ink-2 hover:text-cs-green"><ExternalLink className="size-[14px]" /></Link>}
          </div>
        </div>
      </div>

      <Tabs
        className="mt-[10px] gap-[2px] [&_button]:px-[8px] [&_button]:pb-[8px] [&_button]:text-[11.5px]"
        size="sm"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "tracking", label: `Tracking (${x.events.length})` },
          { key: "documents", label: `Documents (${x.documents.length})` },
          { key: "orders", label: "Orders" },
          { key: "activity", label: "Activity" },
        ]}
      />

      {tab === "overview" && (
        <>
          <div className="mt-[10px] grid grid-cols-2 overflow-hidden rounded-[8px] border border-cs-line">
            {[
              { icon: MapPin, k: "Destination", v: x.destination },
              { icon: Truck, k: "Carrier", v: x.carrier },
              { icon: FileText, k: "Order ID", v: order ? <Link href={`/console/production?id=${order.id}`} className="inline-flex items-center gap-[4px] text-cs-blue hover:underline">{order.id}<ExternalLink className="size-[11px]" /></Link> : <span className="text-cs-ink-2">Not linked</span> },
              { icon: FileText, k: "Incoterms", v: x.incoterms },
              { icon: IndianRupee, k: "Shipment Value", v: inr(x.value) },
              { icon: Box, k: "Total Packages", v: <>{x.packages}<br /><span className="text-cs-ink-2">({fmtNum(x.qty)} units)</span></> },
            ].map((c, i) => (
              <div key={c.k} className={cn("flex items-start gap-[10px] px-[10px] py-[6px]", i % 2 === 1 && "border-l border-cs-line", i > 1 && "border-t border-cs-line")}>
                <c.icon className="mt-[3px] size-[17px] shrink-0 text-[#3e4440]" strokeWidth={1.6} />
                <div className="min-w-0">
                  <p className="text-[10.5px] text-cs-ink-2">{c.k}</p>
                  <div className="text-[12px] font-medium leading-tight text-[#1d211e]">{c.v}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="serif mt-[10px] text-[16px] font-semibold">Shipment Progress</p>
          <ProgressDots x={x} />

          <div className="mt-[9px] flex items-center justify-between">
            <p className="serif text-[15px] font-semibold">Recent Tracking Events</p>
            <button type="button" onClick={() => setTab("tracking")} className="text-[11.5px] font-medium text-[#2f3431] hover:text-cs-green">View All →</button>
          </div>
          <Timeline events={x.events.slice(0, 4)} />

          <p className="serif mt-[6px] text-[15px] font-semibold">Contact Details</p>
          <div className="mt-[6px] grid grid-cols-2 gap-[6px]">
            {[
              { img: account.img, name: account.name, role: account.role, org: mfr.name, email: account.email, phone: account.phone },
              { img: x.carrierContact.img, name: x.carrierContact.name, role: x.carrierContact.role, org: x.carrier, email: `${x.carrierContact.name.split(" ")[0].toLowerCase()}@carrier.example`, phone: "+91 98100 22334" },
            ].map((c) => (
              <div key={c.name + c.org} className="flex items-start gap-[7px] rounded-[8px] border border-cs-line px-[7px] py-[7px]">
                <Image src={c.img} alt="" width={30} height={30} className="size-[30px] shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-[2px]">
                    <p className="truncate text-[11px] font-semibold">{c.name}</p>
                    <div className="flex shrink-0">
                      <a href={`mailto:${c.email}`} aria-label={`Email ${c.name}`} className="grid size-[18px] place-items-center rounded-full text-[#3e4440] hover:bg-cs-mint"><Mail className="size-[11px]" /></a>
                      <a href={`tel:${c.phone.replace(/\s/g, "")}`} aria-label={`Call ${c.name}`} className="grid size-[18px] place-items-center rounded-full text-[#3e4440] hover:bg-cs-mint"><Phone className="size-[11px]" /></a>
                    </div>
                  </div>
                  <p className="text-[9.5px] leading-[1.3] text-cs-ink-2">{c.role}</p>
                  <p className="text-[9.5px] leading-[1.3] text-cs-ink-2">{c.org}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "tracking" && (
        <div className="mt-[12px]">
          <ProgressDots x={x} />
          <div className="mt-[12px] rounded-[8px] bg-[#f7f6f2] px-[12px] py-[10px] text-[12px]">
            {delivered ? (
              <p className="flex items-center gap-[6px] font-medium text-cs-green"><CheckCircle2 className="size-[15px]" />Delivered on {fmtDate(x.eta)}</p>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span>Next step: <b>{SHIP_STEPS[Math.min(4, x.step + 1)]}</b><br /><span className="text-cs-ink-2">ETA {fmtDate(x.eta)}</span></span>
                <Btn kind="primary" className="!h-[34px] !px-[12px] !text-[12px]" icon={Navigation} onClick={onAdvance}>Update to next step</Btn>
              </div>
            )}
          </div>
          <p className="serif mt-[12px] text-[15px] font-semibold">All tracking events</p>
          <Timeline events={events} />
          {x.events.length > 4 && <button type="button" className="mt-[4px] text-[12px] font-medium text-cs-green" onClick={() => setAllEvents(!allEvents)}>{allEvents ? "Show fewer" : `Show all ${x.events.length}`}</button>}
        </div>
      )}

      {tab === "documents" && (
        <ul className="mt-[10px] divide-y divide-cs-line rounded-[8px] border border-cs-line">
          {x.documents.map((doc) => (
            <li key={doc} className="flex items-center gap-[10px] px-[11px] py-[9px] text-[12.5px]">
              <FileText className="size-[16px] text-cs-red" strokeWidth={1.6} />
              <span className="flex-1 truncate">{doc}</span>
              <button type="button" aria-label={`Download ${doc}`} className="grid size-[26px] place-items-center rounded-[6px] hover:bg-[#f1f0ec]" onClick={() => { download(doc.replace(/\.pdf$/, ".txt"), `${doc}\nShipment ${x.id} · ${x.name}\nCarrier: ${x.carrier}\nDestination: ${x.destination}\nQuantity: ${fmtNum(x.qty)} units\nValue: ${inr(x.value)}\nGenerated ${fmtDateTime(new Date().toISOString())}\n`, "text/plain"); toast(`${doc} downloaded`); }}>
                <Download className="size-[15px]" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === "orders" && (
        <div className="mt-[10px]">
          {order ? (
            <Link href={`/console/production?id=${order.id}`} className="flex items-center gap-[10px] rounded-[8px] border border-cs-line px-[10px] py-[9px] hover:border-cs-green-2/60">
              <Image src={order.img} alt="" width={40} height={40} className="size-[40px] rounded-[6px] object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold">{order.id}</p>
                <p className="truncate text-[11.5px] text-cs-ink-2">{order.name} · {fmtNum(order.qty)} units · {mfr.name}</p>
              </div>
              <ExternalLink className="size-[14px] text-cs-ink-2" />
            </Link>
          ) : <Empty>This shipment isn&apos;t linked to a production order.</Empty>}
        </div>
      )}

      {tab === "activity" && (
        <ul className="mt-[10px] space-y-[8px]">
          {s.activity.filter((a) => a.text.includes(x.id)).map((a) => (
            <li key={a.id} className="rounded-[8px] border border-cs-line px-[10px] py-[8px] text-[12px]"><p>{a.text}</p><p className="text-[11px] text-cs-ink-2">{a.who} · {ago(a.at)}</p></li>
          ))}
          {!s.activity.some((a) => a.text.includes(x.id)) && <Empty>No activity logged for this shipment yet.</Empty>}
        </ul>
      )}

      </div>
      <div className="grid shrink-0 grid-cols-[1.15fr_1fr_1.15fr] gap-[7px] pt-[8px]">
        <Btn kind="primary" icon={Navigation} className="!px-[8px] !text-[12px]" onClick={() => setTab("tracking")}>Track Shipment</Btn>
        <Btn icon={Share2} className="!px-[8px] !text-[12px]" onClick={onShare}>Share ETA</Btn>
        <Btn icon={MessageSquare} className="!px-[8px] !text-[12px]" onClick={onContact}>Contact Carrier</Btn>
      </div>
    </aside>
  );
}

function ProgressDots({ x }: { x: Shipment }) {
  return (
    <div className="relative mt-[10px] grid grid-cols-5">
      <div className="absolute left-[10%] right-[10%] top-[11px] flex">
        {SHIP_STEPS.slice(0, -1).map((st, i) => <span key={st} className={cn("h-[2px] flex-1", i < x.step ? "bg-cs-green-2" : "bg-[#dedcd6]")} />)}
      </div>
      {SHIP_STEPS.map((st, i) => {
        const done = i < x.step || (x.status === "Delivered" && i === x.step);
        const on = i === x.step && x.status !== "Delivered";
        const date = x.stepDates[i];
        return (
          <div key={st} className="relative flex flex-col items-center text-center">
            <span className={cn("grid size-[23px] place-items-center rounded-full border-2", done ? "border-cs-mint bg-[#4f9a62] text-white" : on ? "border-[#cfe3d3] bg-cs-green" : "border-[#dcdad4] bg-white")}>
              {done ? <CheckIcon className="size-[12px]" strokeWidth={3} /> : on ? <span className="size-[8px] rounded-full bg-white" /> : null}
            </span>
            <p className="mt-[5px] text-[11px] font-medium leading-tight">{st}</p>
            <p className="text-[10px] text-cs-ink-2">{date ? fmtDate(date) : i === 4 ? `Est. ${fmtDate(x.eta).slice(0, -5)}` : x.status === "Delivered" ? "" : `Est. ${fmtDate(new Date(new Date(x.eta).getTime() - (4 - i) * 864e5).toISOString()).slice(0, -5)}`}</p>
          </div>
        );
      })}
    </div>
  );
}

function Timeline({ events }: { events: Shipment["events"] }) {
  return (
    <ul className="relative mt-[6px]">
      <span className="absolute bottom-[10px] left-[4px] top-[8px] w-px bg-cs-line" />
      {events.map((e) => (
        <li key={e.at + e.text} className="relative pb-[4px] pl-[20px]">
          <span className={cn("absolute left-0 top-[4px] size-[9px] rounded-full ring-2 ring-white", e.tone === "green" ? "bg-cs-green-2" : "bg-cs-amber")} />
          <p className="text-[10.5px] text-cs-ink-2">{fmtDateTime(e.at)}</p>
          <p className="text-[11.5px] leading-tight text-[#1d211e]">{e.text}</p>
        </li>
      ))}
    </ul>
  );
}

function ContactCarrier({ x, onClose }: { x: Shipment | null; onClose: () => void }) {
  const { update, toast } = useConsole();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  useEffect(() => {
    if (x) { setSubject(`${x.id} – status update`); setBody(`Hi ${x.carrierContact.name.split(" ")[0]},\n\nCould you share the latest status and confirm the ETA (${fmtDate(x.eta)}) for ${x.id} (${x.name}) to ${x.destination}?\n\nThanks,\nPriya`); }
  }, [x]);
  if (!x) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title="Contact carrier"
      sub={`${x.carrierContact.name} · ${x.carrierContact.role}, ${x.carrier}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={MessageSquare} disabled={!body.trim()} onClick={() => { update((d) => sendMessage(d, `${x.carrierContact.name} (${x.carrier})`, subject, body, `/console/shipments?id=${x.id}`, "Shipment")); toast(`Message sent to ${x.carrierContact.name}`); onClose(); }}>Send message</Btn></>}
    >
      <div className="space-y-[12px]">
        <Field label="Subject"><input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Message"><textarea rows={6} className={textareaCls} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function DelayModal({ x, onClose }: { x: Shipment | null; onClose: () => void }) {
  const { update, toast } = useConsole();
  const [reason, setReason] = useState("Weather delay");
  const [days, setDays] = useState(2);
  if (!x) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Mark ${x.id} delayed`}
      sub={`${x.name} · current ETA ${fmtDate(x.eta)}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="danger" icon={AlertTriangle} disabled={!reason.trim()} onClick={() => { update((d) => markDelayed(d, x.id, reason.trim(), days)); toast(`${x.id} marked delayed`, "bad"); onClose(); }}>Mark delayed</Btn></>}
    >
      <div className="grid grid-cols-[1fr_120px] gap-[12px]">
        <Field label="Reason"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <Field label="Extra days"><input type="number" min={0} max={60} className={inputCls} value={days} onChange={(e) => setDays(Math.max(0, +e.target.value))} /></Field>
      </div>
    </Modal>
  );
}
