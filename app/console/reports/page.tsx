"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Download, Eye, FileText, Filter, Info, ShieldCheck, Trash2, Truck, BarChart3, Wallet } from "lucide-react";
import { Btn, CardTitle, FilterSelect, Hero, Modal, Pill, RowMenu, StatStrip, ViewAllBtn } from "@/components/console/kit";
import { useConsole } from "@/lib/console/store";
import { addExport, removeExport } from "@/lib/console/actions-ops";
import { csv, download, fmtDate, fmtNum, inr } from "@/lib/console/format";
import type { ConsoleState } from "@/lib/console/types";
import { cn } from "@/lib/cn";

/* ---------- windows ---------- */

const RANGES: Record<string, number> = { "": 6, "Last 3 Months": 3, "Last 12 Months": 12 };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The last n calendar months ending this month, oldest first. */
function months(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { y: d.getFullYear(), m: d.getMonth(), label: MON[d.getMonth()] };
  });
}
const inMonth = (iso: string, b: { y: number; m: number }) => { const d = new Date(iso); return d.getFullYear() === b.y && d.getMonth() === b.m; };
const since = (n: number) => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth() - (n - 1), 1).getTime(); };
const within = (iso: string, n: number) => { const t = new Date(iso).getTime(); return t >= since(n) && t <= Date.now() + 864e5; };
const fromWindow = (iso: string, n: number) => new Date(iso).getTime() >= since(n);

/* ---------- metrics, all derived from state ---------- */

function funnel(s: ConsoleState, n: number) {
  const es = s.enquiries.filter((e) => within(e.createdAt, n) || within(e.updatedAt, n));
  const sampled = es.filter((e) => ["Samples Requested", "In Production", "Closed"].includes(e.stage) || s.samples.some((x) => x.enquiryId === e.id));
  const approved = es.filter((e) => ["In Production", "Closed"].includes(e.stage) || s.samples.some((x) => x.enquiryId === e.id && x.status === "Approved"));
  const prod = es.filter((e) => e.stage === "In Production" || e.stage === "Closed");
  const done = es.filter((e) => e.stage === "Closed");
  return [
    ["Enquiries", es.length], ["Samples Requested", sampled.length], ["Samples Approved", approved.length], ["Orders in Production", prod.length], ["Orders Completed", done.length],
  ] as [string, number][];
}

function output(s: ConsoleState, n: number) {
  return months(n).map((b) => {
    const bs = s.orders.flatMap((o) => o.batches);
    return {
      label: b.label,
      planned: bs.filter((x) => inMonth(x.start, b)).reduce((a, x) => a + x.planned, 0),
      done: bs.filter((x) => x.status === "Completed" ? inMonth(x.end, b) : x.status === "In Progress" && inMonth(x.start, b)).reduce((a, x) => a + x.completed, 0),
    };
  });
}

function qualityByMonth(s: ConsoleState, n: number) {
  return months(n).map((b) => ({
    label: b.label,
    total: s.quality.filter((q) => inMonth(q.updatedAt, b)).length + s.orders.flatMap((o) => o.batches).filter((x) => x.status === "Completed" && inMonth(x.end, b) && !s.quality.some((q) => q.id === x.id)).length,
    bad: s.issues.filter((i) => inMonth(i.at, b)).length + s.orders.flatMap((o) => o.issues).filter((i) => inMonth(i.at, b)).length,
  }));
}

function shipPerf(s: ConsoleState, n: number) {
  const xs = s.shipments.filter((x) => x.status !== "Pending" && within(x.updatedAt, n));
  const delayed = xs.filter((x) => x.status === "Delayed").length;
  return { onTime: xs.length - delayed, delayed, cancelled: 0, total: xs.length };
}

function payPerf(s: ConsoleState, n: number) {
  const ms = s.payments.flatMap((p) => p.milestones).filter((m) => fromWindow(m.due, n) || (m.status !== "Paid" && new Date(m.due).getTime() < Date.now()));
  const paid = ms.filter((m) => m.status === "Paid").reduce((a, m) => a + m.amount, 0);
  const overdue = ms.filter((m) => m.status !== "Paid" && new Date(m.due).getTime() < Date.now()).reduce((a, m) => a + m.amount, 0);
  const pending = ms.reduce((a, m) => a + m.amount, 0) - paid - overdue;
  return { paid, pending, overdue, total: paid + pending + overdue };
}

function scorecards(s: ConsoleState) {
  return s.manufacturers
    .map((m) => {
      const bs = s.orders.filter((o) => o.mfrId === m.id).flatMap((o) => o.batches);
      const planned = bs.reduce((a, b) => a + b.planned, 0);
      const done = bs.reduce((a, b) => a + b.completed, 0);
      const delayed = s.shipments.filter((x) => s.orders.find((o) => o.id === x.orderId)?.mfrId === m.id && x.status === "Delayed").length;
      return { m, quality: m.rating, onTime: Math.max(0, m.onTime - delayed * 2), completion: planned ? Math.round((done / planned) * 100) : Math.max(0, m.onTime - 2), orders: new Set(s.orders.filter((o) => o.mfrId === m.id).map((o) => o.id)).size };
    })
    .sort((a, b) => b.quality - a.quality);
}

/* ---------- report files ---------- */

const REPORTS = [
  { key: "Operational", title: "Operational Report", text: "Enquiries, conversion, production and shipment overview.", icon: FileText, tone: "bg-cs-mint text-cs-green-2" },
  { key: "Manufacturer", title: "Manufacturer Performance Report", text: "Compare quality, delivery, and production metrics across partners.", icon: BarChart3, tone: "bg-cs-mint text-cs-green-2" },
  { key: "Payment", title: "Payment Summary", text: "Payment status, ageing and collection analysis.", icon: Wallet, tone: "bg-cs-mint text-cs-green-2" },
  { key: "Quality", title: "Quality Report", text: "Defect trends, quality issues and resolution timelines.", icon: ShieldCheck, tone: "bg-cs-blue-bg text-cs-blue" },
] as const;
type ReportKey = (typeof REPORTS)[number]["key"];

function reportTable(s: ConsoleState, key: string): (string | number)[][] {
  const mfr = (id: string) => s.manufacturers.find((m) => m.id === id)?.name ?? id;
  if (key === "Manufacturer") return [["Manufacturer", "Location", "Quality score", "On-time delivery %", "Order completion %", "Orders"], ...scorecards(s).map((r) => [r.m.name, `${r.m.city}, ${r.m.state}`, r.quality, r.onTime, r.completion, r.orders])];
  if (key === "Payment") return [["Order", "Product", "Manufacturer", "Invoice", "Milestone", "Due", "Amount (INR)", "Status"], ...s.payments.flatMap((p) => p.milestones.map((m) => [p.orderId, p.name, mfr(p.mfrId), m.invoice, m.name, fmtDate(m.due), m.amount, m.status === "Paid" ? "Paid" : new Date(m.due).getTime() < Date.now() ? "Overdue" : "Pending"]))];
  if (key === "Quality") return [["Batch", "Product", "Manufacturer", "Status", "Tests passed", "Updated"], ...s.quality.map((q) => [q.id, q.name, mfr(q.mfrId), q.status, `${q.tests.filter((t) => t.status === "Pass").length}/${q.tests.length}`, fmtDate(q.updatedAt)]), [], ["Issue", "Reference", "Level", "Raised", "Resolved"], ...s.issues.map((i) => [i.title, i.ref, i.level, fmtDate(i.at), i.resolved ? "Yes" : "No"])];
  return [["Enquiry", "Product", "Category", "Stage", "Target MOQ", "Manufacturers", "Updated"], ...s.enquiries.map((e) => [e.id, e.name, e.category, e.stage, e.moq, e.mfrCount, fmtDate(e.updatedAt)]), [], ["Order", "Product", "Manufacturer", "Units planned", "Units completed", "Target delivery"], ...s.orders.map((o) => [o.id, o.name, mfr(o.mfrId), o.qty, o.batches.reduce((a, b) => a + b.completed, 0), fmtDate(o.targetDelivery)])];
}

const typeOf = (file: string) => (/Manufacturer/i.test(file) ? "Manufacturer" : /Payment/i.test(file) ? "Payment" : /Quality/i.test(file) ? "Quality" : /Shipment/i.test(file) ? "Shipment" : "Operational");

/* ---------- page ---------- */

export default function Reports() {
  const { s, update, toast } = useConsole();
  const [rFunnel, setRFunnel] = useState("");
  const [rOut, setROut] = useState("");
  const [rQual, setRQual] = useState("");
  const [rShip, setRShip] = useState("");
  const [rPay, setRPay] = useState("");
  const [view, setView] = useState<ReportKey | null>(null);
  const [allCards, setAllCards] = useState(false);
  const [allExports, setAllExports] = useState(false);
  const [allReports, setAllReports] = useState(false);

  const f = useMemo(() => funnel(s, RANGES[rFunnel]), [s, rFunnel]);
  const out = useMemo(() => output(s, RANGES[rOut]), [s, rOut]);
  const qual = useMemo(() => qualityByMonth(s, RANGES[rQual]), [s, rQual]);
  const sp = useMemo(() => shipPerf(s, RANGES[rShip]), [s, rShip]);
  const pp = useMemo(() => payPerf(s, RANGES[rPay]), [s, rPay]);
  const cards = useMemo(() => scorecards(s), [s]);

  // headline stats (all time)
  const conv = s.enquiries.length ? Math.round((s.enquiries.filter((e) => e.stage === "In Production" || e.stage === "Closed").length / s.enquiries.length) * 100) : 0;
  const allShip = shipPerf(s, 1200);
  const onTime = allShip.total ? Math.round((allShip.onTime / allShip.total) * 100) : 100;
  const units = s.orders.reduce((a, o) => a + o.qty, 0);
  const defect = units ? s.orders.reduce((a, o) => a + o.defectRate * o.qty, 0) / units : 0;
  const allPay = payPerf(s, 1200);
  const payDone = allPay.total ? Math.round((allPay.paid / allPay.total) * 100) : 0;
  const thisMonth = s.enquiries.filter((e) => within(e.createdAt, 1)).length;

  const generate = (key: ReportKey) => {
    const stamp = new Date().toISOString().slice(0, 10);
    const file = `${REPORTS.find((r) => r.key === key)!.title.replace(/ /g, "_")}_${stamp}.csv`;
    download(file, csv(reportTable(s, key)));
    update((d) => addExport(d, file, key));
    toast(`${file} downloaded`);
  };
  const again = (file: string) => {
    const key = typeOf(file);
    download(file.replace(/\.pdf$/, ".csv"), csv(key === "Shipment" ? [["Shipment", "Product", "Carrier", "Destination", "ETA", "Status"], ...s.shipments.map((x) => [x.id, x.name, x.carrier, x.destination, fmtDate(x.eta), x.status])] : reportTable(s, key)));
    toast(`${file} downloaded`);
  };

  const exportRows = (rows: typeof s.exports) => rows.map((e) => (
    <tr key={e.file + e.at} className="border-b border-cs-line last:border-0">
      <td className="py-[5px] pl-[4px]"><span className="flex items-center gap-[8px]"><FileText className="size-[15px] shrink-0 text-cs-red" strokeWidth={1.6} /><span className="truncate">{e.file}</span></span></td>
      <td className="px-[6px] text-[#3e4440]">{e.type}</td>
      <td className="whitespace-nowrap px-[6px] text-[#3e4440]">{fmtDate(e.at)}</td>
      <td className="whitespace-nowrap px-[6px] text-[#3e4440]">{e.by}</td>
      <td className="px-[6px]"><Pill tone="green" className="!px-[7px] !text-[10px]">Completed</Pill></td>
      <td className="pr-[2px]"><RowMenu items={[{ label: "Download again", icon: Download, onClick: () => again(e.file) }, { label: "Remove from list", icon: Trash2, danger: true, onClick: () => { update((d) => removeExport(d, e.file, e.at)); toast("Removed from recent exports", "info"); } }]} /></td>
    </tr>
  ));

  return (
    <div>
      <Hero
        eyebrow="INSIGHTS  ·  PERFORMANCE  ·  GROWTH"
        title="Reports & Analytics"
        lede={<>Measure enquiry conversion, production efficiency, quality performance,<br />shipment reliability, and payment health.</>}
        img="/console/hero-reports.jpg"
        quote={["Insight-led", "operations.", "Better decisions."]}
        height={148}
        quoteTop={36}
        quoteWidth={214}
      />
      <div className="px-[15px] pb-[20px]">
        <StatStrip
          items={[
            { icon: FileText, tone: "green", value: s.enquiries.length, label: "Total Enquiries", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />{thisMonth} this month</> },
            { icon: Filter, tone: "orange", value: `${conv}%`, label: "Conversion to Production", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />{s.enquiries.filter((e) => e.stage === "In Production" || e.stage === "Closed").length} of {s.enquiries.length} enquiries</> },
            { icon: Truck, tone: "blue", value: `${onTime}%`, label: "On-Time Delivery", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />{allShip.onTime} of {allShip.total} shipments</> },
            { icon: AlertTriangle, tone: "red", value: `${defect.toFixed(1)}%`, label: "Defect Rate", delta: <><ArrowDown className="mr-[3px] inline size-[13px]" />target under 2%</> },
            { icon: Wallet, tone: "green", value: `${payDone}%`, label: "Payment Completion", delta: <><ArrowUp className="mr-[3px] inline size-[13px]" />{inr(allPay.paid)} received</> },
          ]}
        />

        {/* row 2: funnel, output, quality */}
        <div className="mt-[11px] grid gap-[10px] min-[1024px]:grid-cols-[minmax(0,1.04fr)_minmax(0,1fr)_minmax(0,1.05fr)]">
          <section className="cs-card px-[14px] pb-[12px] pt-[12px]">
            <CardTitle right={<Range value={rFunnel} onChange={setRFunnel} />}><span className="flex items-center gap-[8px] text-[17px]">Enquiry Conversion Funnel <InfoTip text="Enquiries created or updated in the window, and how far each one got." /></span></CardTitle>
            <div className="mt-[10px] space-y-[6px]">
              {f.map(([label, n], i) => {
                const pct = f[0][1] ? Math.round((n / f[0][1]) * 100) : 0;
                return (
                  <div key={label} className="grid grid-cols-[124px_34px_1fr] items-center gap-[6px] whitespace-nowrap text-[11px]">
                    <span className="text-[#2b302d]">{label}</span>
                    <span className="text-cs-ink-2">{pct}%</span>
                    <span className="flex items-center gap-[8px] text-[17px]">
                      <span className="h-[28px] rounded-[2px]" style={{ width: `${Math.max(4, pct * 0.85)}%`, background: ["#a8461f", "#8fcb9c", "#a9d7b3", "#c4e4ca", "#dcefe0"][i] }} />
                      <span className="serif text-[15px] font-semibold">{n}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="cs-card px-[14px] pb-[8px] pt-[12px]">
            <CardTitle right={<Range value={rOut} onChange={setROut} />}><span className="flex items-center gap-[8px] text-[17px]">Production Output Trend <InfoTip text="Units planned per batch start month, and units completed." /></span></CardTitle>
            <Legend items={[["Planned Units", "#a9d7b3"], ["Completed Units", "#1d6b3c"]]} />
            <Bars data={out.map((x) => ({ label: x.label, a: x.planned, b: x.done }))} colors={["#a9d7b3", "#1d6b3c"]} fmt={(v) => (v >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`)} />
          </section>

          <section className="cs-card px-[14px] pb-[8px] pt-[12px]">
            <CardTitle right={<Range value={rQual} onChange={setRQual} />}><span className="flex items-center gap-[8px] text-[17px]">Quality Issues by Month <InfoTip text="Batches tested each month, and quality issues raised." /></span></CardTitle>
            <Legend items={[["Total Batches", "#a9d7b3"], ["Defective Batches", "#f28b82"]]} />
            <Bars data={qual.map((x) => ({ label: x.label, a: x.total, b: x.bad }))} colors={["#a9d7b3", "#f28b82"]} fmt={(v) => `${v}`} />
          </section>
        </div>

        {/* row 3: donuts + scorecards */}
        <div className="mt-[10px] grid gap-[10px] min-[1024px]:grid-cols-[minmax(0,0.74fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
          <section className="cs-card px-[14px] pb-[10px] pt-[12px]">
            <CardTitle right={<Range value={rShip} onChange={setRShip} />}><span className="text-[17px]">Shipment Performance</span></CardTitle>
            <div className="mt-[8px] flex items-center gap-[18px]">
              <Donut parts={[[sp.onTime, "#1d5c38"], [sp.delayed, "#f5c344"], [sp.cancelled, "#e5483b"]]} big={`${sp.total ? Math.round((sp.onTime / sp.total) * 100) : 100}%`} small="On-Time" />
              <table className="flex-1 text-[11.5px]">
                <tbody>
                  {[["On Time", sp.onTime, "#1d5c38"], ["Delayed", sp.delayed, "#f5c344"], ["Cancelled", sp.cancelled, "#e5483b"]].map(([l, v, c]) => (
                    <tr key={l as string}><td className="py-[5px]"><span className="mr-[8px] inline-block size-[9px] rounded-full" style={{ background: c as string }} />{l}</td><td>{v}</td><td className="text-right">{sp.total ? Math.round(((v as number) / sp.total) * 100) : 0}%</td></tr>
                  ))}
                  <tr className="border-t border-cs-line"><td className="pt-[8px]">Total Shipments</td><td /><td className="pt-[8px] text-right font-semibold">{sp.total}</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="cs-card px-[14px] pb-[10px] pt-[12px]">
            <CardTitle right={<Range value={rPay} onChange={setRPay} />}><span className="text-[17px]">Payment Status Breakdown</span></CardTitle>
            <div className="mt-[8px] flex items-center gap-[18px]">
              <Donut parts={[[pp.paid, "#1d5c38"], [pp.pending, "#f5c76a"], [pp.overdue, "#f19a9a"]]} big={`${pp.total ? Math.round((pp.paid / pp.total) * 100) : 0}%`} small="Completed" />
              <table className="flex-1 text-[11.5px]">
                <tbody>
                  {[["Completed", pp.paid, "#1d5c38"], ["Pending", pp.pending, "#f5c76a"], ["Overdue", pp.overdue, "#f19a9a"]].map(([l, v, c]) => (
                    <tr key={l as string}><td className="py-[5px]"><span className="mr-[8px] inline-block size-[9px] rounded-full" style={{ background: c as string }} />{l}</td><td className="whitespace-nowrap">{inr(v as number)}</td><td className="text-right">{pp.total ? Math.round(((v as number) / pp.total) * 100) : 0}%</td></tr>
                  ))}
                  <tr className="border-t border-cs-line"><td className="pt-[8px]">Total Value</td><td className="whitespace-nowrap pt-[8px] font-semibold" colSpan={2}>{inr(pp.total)}</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="cs-card px-[12px] pb-[6px] pt-[12px]">
            <CardTitle right={<ViewAllBtn onClick={() => setAllCards(true)} />}><span className="text-[17px]">Manufacturer Scorecards</span></CardTitle>
            <Scorecards rows={cards.slice(0, 4)} />
          </section>
        </div>

        {/* row 4: report center + exports */}
        <div className="mt-[10px] grid gap-[10px] min-[1024px]:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
          <section className="cs-card px-[14px] pb-[8px] pt-[12px]">
            <CardTitle right={<ViewAllBtn onClick={() => setAllReports(true)} />}><span className="text-[17px]">Report Center</span></CardTitle>
            <div className="mt-[7px] grid grid-cols-2 gap-[7px]">
              {REPORTS.map((r) => <ReportCard key={r.key} r={r} onDownload={() => generate(r.key)} onView={() => setView(r.key)} />)}
            </div>
          </section>

          <section className="cs-card px-[14px] pb-[8px] pt-[12px]">
            <CardTitle right={<ViewAllBtn onClick={() => setAllExports(true)} />}><span className="text-[17px]">Recent Exports</span></CardTitle>
            <table className="mt-[8px] w-full table-fixed text-[10.5px]">
              <thead><tr className="whitespace-nowrap bg-[#f7f6f2] text-left text-[10px] text-[#4b524e]"><th className="w-[36%] rounded-l-[5px] py-[6px] pl-[6px] font-medium">File Name</th><th className="w-[14%] px-[6px] font-medium">Report Type</th><th className="w-[15%] px-[6px] font-medium">Date Generated</th><th className="w-[15%] px-[6px] font-medium">Generated By</th><th className="px-[6px] font-medium">Status</th><th className="w-[28px] rounded-r-[5px]" /></tr></thead>
              <tbody>{exportRows(s.exports.slice(0, 5))}</tbody>
            </table>
            {s.exports.length === 0 && <p className="py-[18px] text-center text-[12px] text-cs-ink-2">No exports yet. Download a report to see it here.</p>}
          </section>
        </div>
      </div>

      {view && (
        <Modal open onClose={() => setView(null)} title={REPORTS.find((r) => r.key === view)!.title} sub={`Generated from live data · ${fmtDate(new Date().toISOString())}`} width={860} footer={<><Btn onClick={() => setView(null)}>Close</Btn><Btn kind="primary" icon={Download} onClick={() => generate(view)}>Download CSV</Btn></>}>
          <ReportPreview rows={reportTable(s, view)} />
        </Modal>
      )}
      <Modal open={allCards} onClose={() => setAllCards(false)} title="Manufacturer scorecards" sub="All partners, best quality score first" width={720}><Scorecards rows={cards} /></Modal>
      <Modal open={allExports} onClose={() => setAllExports(false)} title="All exports" width={760}>
        <table className="w-full table-fixed text-[12px]"><thead><tr className="text-left text-[11px] text-cs-ink-2"><th className="w-[38%] pb-[6px]">File Name</th><th>Report Type</th><th>Date Generated</th><th>Generated By</th><th>Status</th><th className="w-[30px]" /></tr></thead><tbody>{exportRows(s.exports)}</tbody></table>
      </Modal>
      <Modal open={allReports} onClose={() => setAllReports(false)} title="Report center" width={640}>
        <div className="grid grid-cols-2 gap-[10px]">{REPORTS.map((r) => <ReportCard key={r.key} r={r} onDownload={() => generate(r.key)} onView={() => { setAllReports(false); setView(r.key); }} />)}</div>
      </Modal>
    </div>
  );
}

/* ---------- pieces ---------- */

function Range({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <FilterSelect label="Last 6 Months" value={value} onChange={onChange} options={["Last 3 Months", "Last 12 Months"]} className="w-[100px] [&_select]:pl-[8px] [&_select]:pr-[20px] [&_select]:text-[10.5px] [&_svg]:right-[6px]" />;
}

function InfoTip({ text }: { text: string }) {
  return <span title={text} aria-label={text} className="font-sans text-cs-ink-2"><Info className="size-[14px]" strokeWidth={1.8} /></span>;
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-[8px] flex gap-[18px] text-[11px] text-[#3e4440]">
      {items.map(([l, c]) => <span key={l} className="flex items-center gap-[6px]"><span className="size-[9px] rounded-full" style={{ background: c }} />{l}</span>)}
    </div>
  );
}

/** Grouped bar chart: two series per month, nice y-axis with 4 ticks. */
function Bars({ data, colors, fmt }: { data: { label: string; a: number; b: number }[]; colors: [string, string]; fmt: (v: number) => string }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  const step = niceStep(max / 4);
  const top = step * 4;
  const W = 340, H = 118, L = 30, B = 18;
  const cw = (W - L) / data.length;
  const bw = Math.min(16, cw / 3);
  return (
    <svg viewBox={`0 0 ${W} ${H + B}`} className="mt-[4px] w-full" role="img" aria-label="Bar chart">
      {[0, 1, 2, 3, 4].map((i) => {
        const y = H - (i / 4) * (H - 8);
        return <g key={i}><line x1={L} x2={W} y1={y} y2={y} stroke="#eceae4" /><text x={L - 6} y={y + 3} fontSize="9" textAnchor="end" fill="#6b716d">{fmt(step * i)}</text></g>;
      })}
      {data.map((d, i) => {
        const x = L + i * cw + cw / 2;
        const h = (v: number) => (v / top) * (H - 8);
        return (
          <g key={d.label + i}>
            <rect x={x - bw - 1} y={H - h(d.a)} width={bw} height={h(d.a)} rx="2" fill={colors[0]}><title>{`${d.label}: ${fmtNum(d.a)}`}</title></rect>
            <rect x={x + 1} y={H - h(d.b)} width={bw} height={h(d.b)} rx="2" fill={colors[1]}><title>{`${d.label}: ${fmtNum(d.b)}`}</title></rect>
            <text x={x} y={H + 14} fontSize="9.5" textAnchor="middle" fill="#3e4440">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
function niceStep(raw: number) {
  if (raw <= 1) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function Donut({ parts, big, small }: { parts: [number, string][]; big: string; small: string }) {
  const total = parts.reduce((a, [v]) => a + v, 0);
  const r = 52, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="relative size-[134px] shrink-0">
      <svg viewBox="0 0 142 142" className="size-full -rotate-90">
        <circle cx="71" cy="71" r={r} fill="none" stroke="#eceae4" strokeWidth="20" />
        {total > 0 && parts.filter(([v]) => v > 0).map(([v, col], i) => {
          const len = (v / total) * c;
          const el = <circle key={i} cx="71" cy="71" r={r} fill="none" stroke={col} strokeWidth="20" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} />;
          off += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><p className="serif text-[24px] font-semibold leading-none">{big}</p><p className="mt-[3px] text-[12px] text-[#3e4440]">{small}</p></div>
      </div>
    </div>
  );
}

function Scorecards({ rows }: { rows: ReturnType<typeof scorecards> }) {
  return (
    <table className="mt-[8px] w-full text-[11px]">
      <thead><tr className="bg-[#f7f6f2] text-left text-[10.5px] text-[#4b524e]"><th className="rounded-l-[5px] py-[6px] pl-[8px] font-medium">Manufacturer</th><th className="font-medium">Quality Score</th><th className="font-medium">On-Time Delivery</th><th className="rounded-r-[5px] font-medium">Order Completion</th><th /></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.m.id} className="border-b border-cs-line last:border-0">
            <td className="py-[4px] pl-[4px]"><span className="flex items-center gap-[8px]"><Image src={r.m.img} alt="" width={38} height={30} className="h-[28px] w-[36px] rounded-[4px] object-cover" /><span className="leading-tight">{r.m.name.replace(" Manufacturing", " Manufacturing")}</span></span></td>
            <td><span className="inline-flex items-center gap-[4px] rounded-full bg-cs-mint px-[8px] py-[2px] font-medium text-cs-green-2"><CheckCircle2 className="size-[12px]" />{r.quality.toFixed(1)}</span></td>
            <td className="pl-[14px]">{r.onTime}%</td>
            <td className="pl-[14px]">{r.completion}%</td>
            <td className="w-[28px]"><RowMenu items={[{ label: "Open manufacturer", icon: Eye, onClick: () => { window.location.href = `/console/manufacturers?id=${r.m.id}`; } }]} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReportCard({ r, onDownload, onView }: { r: (typeof REPORTS)[number]; onDownload: () => void; onView: () => void }) {
  return (
    <div className="rounded-[8px] border border-cs-line px-[11px] pb-[9px] pt-[9px]">
      <div className="flex items-start gap-[10px]">
        <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-full", r.tone)}><r.icon className="size-[17px]" strokeWidth={1.7} /></span>
        <div className="min-w-0"><p className="serif whitespace-nowrap text-[13.5px] font-semibold leading-tight tracking-[-0.02em]">{r.title}</p><p className="mt-[2px] text-[10.5px] leading-[1.35] text-cs-ink-2">{r.text}</p></div>
      </div>
      <div className="mt-[7px] flex gap-[7px] pl-[44px]">
        <Btn kind="primary" icon={Download} className="!h-[27px] !px-[12px] !text-[11px]" onClick={onDownload}>Download</Btn>
        <Btn icon={Eye} className="!h-[27px] !px-[12px] !text-[11px]" onClick={onView}>View Report</Btn>
      </div>
    </div>
  );
}

function ReportPreview({ rows }: { rows: (string | number)[][] }) {
  const blocks: (string | number)[][][] = [[]];
  rows.forEach((r) => (r.length === 0 ? blocks.push([]) : blocks[blocks.length - 1].push(r)));
  return (
    <div className="space-y-[18px]">
      {blocks.filter((b) => b.length).map((b, i) => (
        <div key={i} className="max-h-[360px] overflow-auto rounded-[8px] border border-cs-line">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#f7f6f2]"><tr>{b[0].map((h) => <th key={String(h)} className="whitespace-nowrap px-[10px] py-[7px] text-left text-[11px] font-medium text-[#4b524e]">{h}</th>)}</tr></thead>
            <tbody>{b.slice(1).map((r, k) => <tr key={k} className="border-t border-cs-line">{r.map((c, j) => <td key={j} className="whitespace-nowrap px-[10px] py-[6px]">{typeof c === "number" ? fmtNum(c) : c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
