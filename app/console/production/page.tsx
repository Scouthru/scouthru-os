"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle, BarChart3, Box, CalendarDays, Check as CheckIcon, CheckCircle2, ChevronDown, Download, Factory, FileText, FlaskConical, Info, Mail, MapPin,
  MessageSquare, MoreHorizontal, Pencil, Phone, PlayCircle, Settings2, ShieldCheck, Truck, Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Btn, CardTitle, Crumbs, Empty, Field, IconDot, Menu, Modal, Pill, RowMenu, ViewAllBtn, inputCls, textareaCls, type Tone } from "@/components/console/kit";
import { Avatar, BATCH_TONE, Lightbox, Loading, MessageModal, WideHero, CT } from "@/components/console/making";
import { useConsole } from "@/lib/console/store";
import { confirmOrder, log, updateBatch } from "@/lib/console/actions";
import { csv, daysUntil, download, fmtDate, fmtDateTime, fmtNum, inr } from "@/lib/console/format";
import type { ConsoleState, Order } from "@/lib/console/types";
import { orderProgress, orderStatus } from "@/lib/console/actions-making";
import { cn } from "@/lib/cn";

/** "12 Mar 2026" (the en-GB "Sept" is a character wider than the mockup's dates). */
const shortDate = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })} ${d.getFullYear()}`; };

const STEP_ICONS: LucideIcon[] = [FileText, FlaskConical, Settings2, ShieldCheck, Truck, Box];
const STEP_LABELS = ["Brief", "Sample", "Production", "Quality", "Dispatch", "Delivery"];
const LARGE: Record<string, string> = { "Daily Multivitamin Capsules": "/console/ord-multivitamin-lg.jpg" };

function ProductionInner() {
  const { s, ready, update, toast } = useConsole();
  const router = useRouter();
  const params = useSearchParams();
  const wanted = params.get("id");
  const order = useMemo(() => s.orders.find((o) => o.id === wanted) ?? s.orders.find((o) => o.id === "ORD-2026-0042") ?? s.orders[0], [s.orders, wanted]);

  const [modal, setModal] = useState<null | "batch" | "updates" | "evidence" | "issues" | "issue" | "contacts" | "message">(null);
  const [batchId, setBatchId] = useState("");
  const [units, setUnits] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [updImg, setUpdImg] = useState<string | null>(null);
  const [edit, setEdit] = useState<null | { target: string; dest: string; inco: string }>(null);
  const [issue, setIssue] = useState({ title: "", level: "Medium" as "High" | "Medium" | "Low", detail: "" });
  const [note, setNote] = useState("");

  if (!ready || !order) return <><Header id={wanted ?? "ORD-2026-0042"} /><Loading /></>;

  const m = s.manufacturers.find((x) => x.id === order.mfrId);
  const { current, est } = orderProgress(s, order);
  const status = orderStatus(s, order);
  const completed = order.batches.reduce((a, b) => a + b.completed, 0);
  const pct = order.qty ? Math.round((completed / order.qty) * 100) : 0;
  const left = daysUntil(order.targetDelivery);
  const lastEnd = Math.max(...order.batches.map((b) => new Date(b.end).getTime()));
  const onTrack = lastEnd <= new Date(order.targetDelivery).getTime();
  const plan = s.payments.find((p) => p.orderId === order.id);
  const total = plan?.milestones.reduce((a, x) => a + x.amount, 0) ?? 0;
  const paid = plan?.milestones.filter((x) => x.status === "Paid").reduce((a, x) => a + x.amount, 0) ?? 0;
  const paidPct = total ? Math.round((paid / total) * 100) : 0;
  const nextStep = Math.min(current + 1, 5);
  const nextIn = daysUntil(est[nextStep]);
  const openIssues = order.issues.filter((i) => !i.resolved);
  const evidence = order.evidence.map((e) => ({ src: e.img, label: `${e.label} · ${e.batch}` }));
  const href = `/console/production?id=${order.id}`;
  const mod = (fn: (o: Order, d: ConsoleState) => void) => update((d) => { const o = d.orders.find((x) => x.id === order.id); if (o) fn(o, d); });

  const openBatch = (id: string) => {
    const b = order.batches.find((x) => x.id === id);
    if (!b) return;
    setBatchId(id); setUnits(b.completed); setModal("batch");
  };
  const saveBatch = (value: number) => {
    const b = order.batches.find((x) => x.id === batchId);
    update((d) => updateBatch(d, order.id, batchId, value));
    setModal(null);
    toast(b && value >= b.planned ? `${batchId} completed · sent to Quality for testing` : `${batchId} progress saved`);
  };
  const report = () => {
    download(`${order.id}_production_report.csv`, csv([
      ["Order", order.id], ["Product", order.name], ["Manufacturer", m?.name ?? ""], ["Quantity", order.qty], ["Completed", completed], ["Progress", `${pct}%`],
      ["Target delivery", fmtDate(order.targetDelivery)], ["Status", status.label], ["Payment", `${paidPct}% paid`], [],
      ["Batch", "Planned", "Completed", "Status", "Start", "Est. completion"],
      ...order.batches.map((b) => [b.id, b.planned, b.completed, b.status, fmtDate(b.start), fmtDate(b.end)]),
    ]));
    update((d) => d.exports.unshift({ file: `${order.id}_production_report.csv`, type: "Operational", at: new Date().toISOString(), by: d.user.name }));
    toast("Production report downloaded");
  };
  const steps = STEP_LABELS.map((label, i) => ({
    label,
    icon: STEP_ICONS[i],
    sub: `${i > current ? "Est. " : ""}${fmtDate(est[i])}`,
    note: i < current ? "Completed" : i === current ? (i === 2 && !order.confirmed ? "Awaiting confirmation" : "In Progress") : "Upcoming",
  }));

  return (
    <div>
      <Header id={order.id} />
      <div className="px-[15px] pb-[16px]">
        {/* order header */}
        <section className="cs-card relative -mt-[1px] flex items-center gap-[15px] px-[10px] py-[7px] pr-[16px]">
          <Image src={LARGE[order.name] ?? order.img} alt={order.name} width={230} height={220} className="h-[110px] w-[115px] shrink-0 rounded-[7px] object-cover" />
          <div className="min-w-0 flex-1 self-start pt-[6px]">
            <h2 className="serif text-[18px] font-semibold leading-tight tracking-[-0.02em]">{order.name}</h2>
            <div className="mt-[8px] flex flex-wrap gap-[6px]">{order.tags.map((t) => <span key={t} className="rounded-[5px] bg-[#f1f0ec] px-[10px] py-[3px] text-[11.5px] text-[#3e4440]">{t}</span>)}</div>
            <p className="mt-[8px] max-w-[320px] text-[12.5px] leading-[1.4] text-[#3e4440]">{order.desc}</p>
          </div>
          <div className="h-[100px] w-px shrink-0 bg-cs-line" />
          <dl className="w-[285px] shrink-0 space-y-[7px] text-[12px] leading-[18px]">
            <div className="grid grid-cols-[84px_1fr] items-center">
              <dt className="text-[#3e4440]">Order ID</dt>
              <dd className="relative">
                <label className="sr-only" htmlFor="order-switch">Switch order</label>
                <select id="order-switch" value={order.id} onChange={(e) => router.replace(`/console/production?id=${e.target.value}`, { scroll: false })} className="w-full appearance-none bg-transparent pr-[20px] text-[12.5px] outline-none hover:text-cs-green">
                  {s.orders.map((o) => <option key={o.id} value={o.id} title={o.name}>{o.id}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-[2px] size-[14px]" />
              </dd>
            </div>
            <div className="grid grid-cols-[84px_1fr] border-t border-[#f1efea] pt-[7px]"><dt className="text-[#3e4440]">Manufacturer</dt><dd><Link href={`/console/manufacturers?id=${order.mfrId}`} className="hover:text-cs-green">{m?.name}</Link></dd></div>
            <div className="grid grid-cols-[84px_1fr] border-t border-[#f1efea] pt-[7px]"><dt className="text-[#3e4440]">Location</dt><dd className="flex items-center gap-[5px]"><MapPin className="size-[14px]" strokeWidth={1.7} />{m?.state}, India</dd></div>
          </dl>
          <div className="h-[100px] w-px shrink-0 bg-cs-line" />
          <div className="w-[160px] shrink-0">
            <p className="text-[12.5px] text-[#3e4440]">Target Delivery</p>
            <div className="mt-[8px] flex items-center gap-[10px]">
              <span className="grid size-[34px] place-items-center rounded-[7px] bg-cs-mint text-cs-green"><CalendarDays className="size-[18px]" strokeWidth={1.7} /></span>
              <span className="leading-tight">
                <span className="block text-[16.5px] font-medium">{fmtDate(order.targetDelivery)}</span>
                <span className={cn("block text-[12.5px]", left < 0 ? "text-cs-red" : "text-cs-green-2")}>{left < 0 ? `${-left} days late` : `In ${left} days`}</span>
              </span>
            </div>
          </div>
          <Btn kind="primary" icon={Download} className="h-[42px] w-[177px] text-[13.5px]" onClick={report}>Download Report</Btn>
          <Menu
            items={[
              ...(!order.confirmed ? [{ label: "Confirm production start", icon: PlayCircle, onClick: () => { update((d) => confirmOrder(d, order.id)); toast(`Production confirmed for ${order.id}`); } }] : []),
              { label: "Message manufacturer", icon: MessageSquare, onClick: () => setModal("message") },
              { label: "Raise issue", icon: AlertTriangle, onClick: () => { setIssue({ title: "", level: "Medium", detail: "" }); setModal("issue"); } },
              "sep" as const,
              { label: "View payments", icon: Wallet, onClick: () => router.push(`/console/payments?id=${order.id}`) },
              { label: "View quality checks", icon: ShieldCheck, onClick: () => router.push("/console/quality") },
            ]}
            trigger={<span role="button" aria-label="More order actions" className="grid h-[42px] w-[40px] cursor-pointer place-items-center rounded-[7px] border border-[#cfd2cd] bg-white hover:border-[#9aa19c]"><MoreHorizontal className="size-[18px]" /></span>}
          />
        </section>

        <div className="mt-[13px] grid items-start gap-[11px] min-[1024px]:grid-cols-[minmax(0,886fr)_minmax(0,319fr)]">
          <div className="min-w-0 space-y-[10px]">
            {/* progress */}
            <section className="cs-card px-[16px] pb-[10px] pt-[9px]">
              <CardTitle
                sub="Track the key milestones from concept to delivery."
                right={!order.confirmed && <Btn kind="primary" icon={PlayCircle} className="h-[34px] text-[12.5px]" onClick={() => { update((d) => confirmOrder(d, order.id)); toast(`Production confirmed for ${order.id}`); }}>Confirm production start</Btn>}
              >
                <CT>Production Progress</CT>
              </CardTitle>
              <div className="mt-[10px]">
                <ProgressSteps steps={steps} current={current} />
              </div>
            </section>

            {/* tiles */}
            <section className="grid grid-cols-2 gap-[9px] min-[1024px]:grid-cols-5">
              {([
                { icon: BarChart3, tone: "orange", value: fmtNum(order.qty), label: "Units Planned", sub: `${order.batches.length} batches`, subTone: "" },
                { icon: BarChart3, tone: "green", value: fmtNum(completed), label: "Units Completed", sub: `${pct}% of total`, subTone: "" },
                { icon: AlertTriangle, tone: "red", value: `${order.defectRate}%`, label: "Defect Rate", sub: "Target < 2%", subTone: order.defectRate >= 2 ? "text-cs-red" : "" },
                { icon: ShieldCheck, tone: "green", value: STEP_LABELS[nextStep] === "Quality" ? "Quality Check" : STEP_LABELS[nextStep], label: "Next Milestone", sub: current >= 6 ? "All done" : nextIn >= 0 ? `In ${nextIn} days` : `${-nextIn} days overdue`, subTone: "" },
                { icon: CalendarDays, tone: "orange", value: String(Math.max(0, left)), label: "Days Remaining", sub: onTrack ? "On track" : "At risk", subTone: onTrack ? "text-cs-green-2" : "text-cs-red" },
              ] as const).map((t) => (
                <div key={t.label} className="cs-card flex items-center gap-[10px] px-[12px] py-[9px]">
                  <IconDot icon={t.icon} tone={t.tone as Tone} className="size-[42px] [&>svg]:size-[20px]" />
                  <div className="min-w-0">
                    <p className={cn("truncate font-semibold leading-tight", t.value.length > 8 ? "text-[13px] tracking-[-0.02em]" : "text-[17px]")}>{t.value}</p>
                    <p className="mt-[2px] whitespace-nowrap text-[12px] tracking-[-0.01em] text-[#3e4440]">{t.label}</p>
                    <p className={cn("mt-[2px] whitespace-nowrap text-[11.5px] text-cs-ink-2", t.subTone)}>{t.sub}</p>
                  </div>
                </div>
              ))}
            </section>

            <div className="grid gap-[10px] min-[1024px]:grid-cols-[minmax(0,551fr)_minmax(0,325fr)]">
              {/* batches */}
              <section className="cs-card px-[14px] pb-[8px] pt-[10px]">
                <CardTitle right={<ViewAllBtn onClick={() => openBatch(order.batches.find((b) => b.status !== "Completed")?.id ?? order.batches[0].id)} label="Update" />}><CT>Production Batches</CT></CardTitle>
                <table className="mt-[8px] w-full whitespace-nowrap text-[11px] [&_td]:pr-[6px] [&_th]:pr-[6px]">
                  <thead>
                    <tr className="bg-[#f7f6f2] text-left text-[10.5px] text-[#3e4440]">
                      <th className="rounded-l-[6px] py-[7px] pl-[8px] font-medium">Batch #</th><th className="font-medium">Planned Units</th><th className="font-medium">Completed Units</th><th className="font-medium">Status</th><th className="font-medium">Start Date</th><th className="font-medium">Est. Completion</th><th className="rounded-r-[6px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {order.batches.map((b) => {
                      const q = s.quality.find((x) => x.id === b.id);
                      return (
                        <tr key={b.id} className="border-b border-[#f1efea] last:border-0">
                          <td className="py-[5px] pl-[8px] font-semibold">{b.id}</td>
                          <td>{fmtNum(b.planned)}</td>
                          <td>{fmtNum(b.completed)}</td>
                          <td><Pill tone={BATCH_TONE[b.status]} className="py-[2px]">{b.status}</Pill></td>
                          <td>{fmtDate(b.start)}</td>
                          <td>{fmtDate(b.end)}</td>
                          <td className="w-[30px]">
                            <RowMenu items={[
                              { label: "Update progress", icon: Pencil, onClick: () => openBatch(b.id), disabled: b.status === "Completed" },
                              { label: "Mark complete", icon: CheckCircle2, onClick: () => { setBatchId(b.id); update((d) => updateBatch(d, order.id, b.id, b.planned)); toast(`${b.id} completed · sent to Quality for testing`); }, disabled: b.status === "Completed" },
                              { label: q ? "View quality check" : "No quality check yet", icon: ShieldCheck, onClick: () => router.push(`/console/quality?id=${b.id}`), disabled: !q },
                            ]} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>

              {/* factory updates */}
              <section className="cs-card px-[14px] pb-[6px] pt-[10px]">
                <CardTitle right={<ViewAllBtn onClick={() => { setNote(""); setModal("updates"); }} />}><CT>Factory Updates</CT></CardTitle>
                <ul className="relative mt-[9px]">
                  <span className="absolute bottom-[20px] left-[5px] top-[6px] border-l border-dashed border-[#cfd2cd]" />
                  {order.updates.length === 0 && <Empty>No updates yet.</Empty>}
                  {order.updates.slice(0, 4).map((u, i) => (
                    <li key={i} className={cn("relative pb-[7px] pl-[22px]", u.img ? "min-h-[64px] pr-[90px]" : "pr-[18px]")}>
                      <span className={cn("absolute left-0 top-[3px] size-[11px] rounded-full ring-2 ring-white", i === 1 ? "bg-cs-amber" : "bg-cs-green-2")} />
                      <div className="min-w-0">
                        <p className="text-[10.5px] text-cs-ink-2">{fmtDateTime(u.at)}</p>
                        <p className="text-[11.5px] leading-[1.35]">{u.text}</p>
                      </div>
                      {u.img && <button type="button" aria-label="View photo" onClick={() => setUpdImg(u.img ?? null)} className="absolute right-[2px] top-[2px]"><Image src={u.img} alt="" width={156} height={110} className="h-[54px] w-[78px] rounded-[5px] object-cover" /></button>}
                      <span className="absolute -right-[6px] -top-[6px]"><RowMenu items={[
                        { label: "Reply to factory", icon: MessageSquare, onClick: () => setModal("message") },
                        { label: "Copy update", icon: FileText, onClick: () => { navigator.clipboard?.writeText(`${fmtDateTime(u.at)} – ${u.text}`); toast("Update copied"); } },
                      ]} /></span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* evidence */}
              <section className="cs-card self-start px-[14px] pb-[10px] pt-[10px]">
                <CardTitle right={<ViewAllBtn onClick={() => setModal("evidence")} />}><CT>Quality Evidence</CT></CardTitle>
                {evidence.length === 0 ? (
                  <div className="mt-[10px] flex items-center justify-between rounded-[8px] border border-dashed border-cs-line px-[14px] py-[18px] text-[12.5px] text-cs-ink-2">
                    No photos or test reports uploaded yet.
                    <Btn className="h-[32px] text-[12px]" onClick={() => setModal("message")}>Request evidence</Btn>
                  </div>
                ) : (
                  <div className="mt-[7px] grid grid-cols-5 gap-[7px]">
                    {order.evidence.map((e, i) => (
                      <button key={i} type="button" onClick={() => setLightbox(i)} className="min-w-0 text-left">
                        <Image src={e.img} alt={e.label} width={200} height={160} className="h-[80px] w-full rounded-[5px] object-cover hover:opacity-90" />
                        <span className="mt-[3px] block truncate text-[10px] tracking-[-0.01em] text-[#3e4440]">{e.label}</span>
                        <span className="block text-[10px] text-cs-ink-2">{e.batch}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* issues */}
              <section className="cs-card self-start px-[14px] pb-[5px] pt-[10px]">
                <CardTitle right={<ViewAllBtn onClick={() => setModal("issues")} />}><CT>Issues &amp; Risks</CT></CardTitle>
                <ul className="mt-[6px] space-y-[5px]">
                  {openIssues.length === 0 && <li className="flex items-center gap-[8px] text-[12.5px] text-cs-green-2"><CheckCircle2 className="size-[16px]" />No open issues on this order.</li>}
                  {openIssues.slice(0, 2).map((i) => (
                    <li key={i.id} className="flex items-start gap-[8px] border-b border-[#f1efea] pb-[5px] last:border-0">
                      <span className={cn("grid size-[32px] shrink-0 place-items-center rounded-[7px]", i.level === "Low" ? "bg-cs-blue-bg text-cs-blue" : "bg-cs-red-bg text-cs-red")}>{i.level === "Low" ? <Info className="size-[18px]" strokeWidth={1.8} /> : <AlertTriangle className="size-[18px]" strokeWidth={1.8} />}</span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-[6px] whitespace-nowrap text-[10.5px] font-semibold tracking-[-0.01em]">{i.title}<Pill tone={i.level === "High" ? "red" : i.level === "Medium" ? "orange" : "green"} className="px-[6px] py-[1px] text-[10px]">{i.level}</Pill></p>
                        <p className="mt-[1px] text-[10.5px] leading-[1.35] text-cs-ink-2">{i.detail}</p>
                      </div>
                      <div className="flex w-[54px] shrink-0 flex-col items-end gap-[2px]">
                        <span className="whitespace-nowrap text-[10px] text-cs-ink-2">{shortDate(i.at)}</span>
                        <button type="button" onClick={() => { mod((o, d) => { const x = o.issues.find((y) => y.id === i.id); if (x) x.resolved = true; log(d, { text: `Marked "${i.title}" mitigated on ${o.id}`, tag: "Production", href }); }); toast("Marked as mitigated"); }} className="text-[10px] font-medium text-cs-green hover:underline">Mitigated</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          <div className="min-w-0 space-y-[10px]">
            {/* order summary */}
            <section className="cs-card px-[14px] pb-[10px] pt-[14px]">
              <CardTitle right={edit
                ? <div className="flex gap-[6px]"><button type="button" onClick={() => setEdit(null)} className="rounded-[6px] border border-cs-line px-[9px] py-[4px] text-[12px]">Cancel</button><button type="button" onClick={() => { const e = edit; mod((o, d) => { o.targetDelivery = new Date(e.target).toISOString(); o.destination = e.dest; o.incoterms = e.inco; log(d, { text: `Updated order details for ${o.id}`, tag: "Production", href }); }); setEdit(null); toast("Order details saved"); }} className="rounded-[6px] bg-cs-green px-[9px] py-[4px] text-[12px] text-white">Save</button></div>
                : <button type="button" onClick={() => setEdit({ target: order.targetDelivery.slice(0, 10), dest: order.destination, inco: order.incoterms })} className="flex items-center gap-[6px] rounded-[6px] border border-cs-line px-[10px] py-[4px] text-[12px] hover:border-[#cfcac0]"><Pencil className="size-[13px]" />Edit</button>}
              ><CT>Order Summary</CT></CardTitle>
              <dl className="mt-[10px] text-[12.5px]">
                {([
                  ["Order ID", order.id],
                  ["Product", <span key="p" className="flex items-center gap-[8px]"><Image src={order.img} alt="" width={52} height={52} className="size-[26px] rounded-[4px] object-cover" />{order.name}</span>],
                  ["Manufacturer", <Link key="m" href={`/console/manufacturers?id=${order.mfrId}`} className="flex items-center gap-[8px] hover:text-cs-green">{m && <Image src={m.img} alt="" width={52} height={52} className="size-[30px] rounded-[4px] object-cover" />}<span className="leading-tight">{m?.short}<br />Manufacturing</span></Link>],
                  ["Quantity", `${fmtNum(order.qty)} units (${order.batches.length} batches)`],
                  ["Unit Format", order.unitFormat],
                  ["Target Delivery", edit ? <input key="t" type="date" aria-label="Target delivery" className={cn(inputCls, "h-[28px] text-[12px]")} value={edit.target} onChange={(e) => setEdit({ ...edit, target: e.target.value })} /> : fmtDate(order.targetDelivery)],
                  ["Current Status", <Pill key="s" tone={status.tone} className="py-[2px]">{status.label}</Pill>],
                  ["Payment Status", plan ? <Link key="pay" href={`/console/payments?id=${order.id}`}><Pill tone={paidPct >= 100 ? "green" : paidPct > 0 ? "green" : "orange"} className="py-[2px] hover:underline">{paidPct}% Paid</Pill></Link> : "—"],
                  ["Incoterms", edit ? <input key="i" aria-label="Incoterms" className={cn(inputCls, "h-[28px] text-[12px]")} value={edit.inco} onChange={(e) => setEdit({ ...edit, inco: e.target.value })} /> : order.incoterms],
                  ["Destination", edit ? <input key="d" aria-label="Destination" className={cn(inputCls, "h-[28px] text-[12px]")} value={edit.dest} onChange={(e) => setEdit({ ...edit, dest: e.target.value })} /> : order.destination],
                ] as [string, React.ReactNode][]).map(([k, v]) => (
                  <div key={k} className="grid min-h-[31px] grid-cols-[98px_1fr] items-center border-b border-[#f1efea] py-[3px] last:border-0">
                    <dt className="text-[#3e4440]">{k}</dt><dd className="min-w-0">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* contacts */}
            <section className="cs-card px-[14px] pb-[8px] pt-[14px]">
              <CardTitle right={<ViewAllBtn onClick={() => setModal("contacts")} />}><CT>Primary Contacts</CT></CardTitle>
              <ul className="mt-[10px]">
                {(m?.contacts ?? []).slice(0, 2).map((c) => (
                  <li key={c.name} className="flex items-center gap-[12px] border-b border-[#f1efea] py-[10px] last:border-0">
                    <Avatar name={c.name} size={50} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-[13.5px] font-semibold">{c.name}</p>
                      <p className="mt-[3px] text-[11.5px] text-cs-ink-2">{c.role}</p>
                      <p className="whitespace-nowrap text-[11.5px] text-cs-ink-2">{m?.name}</p>
                    </div>
                    <a href={`mailto:${c.email}?subject=${encodeURIComponent(order.id)}`} aria-label={`Email ${c.name}`} className="grid size-[34px] place-items-center rounded-full bg-cs-mint text-cs-green hover:bg-[#d6eadb]"><Mail className="size-[16px]" strokeWidth={1.7} /></a>
                    <a href={`tel:${c.phone.replace(/\s/g, "")}`} aria-label={`Call ${c.name}`} className="grid size-[34px] place-items-center rounded-full bg-cs-mint text-cs-green hover:bg-[#d6eadb]"><Phone className="size-[16px]" strokeWidth={1.7} /></a>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>

      <Lightbox images={evidence} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />
      <Lightbox images={updImg ? [{ src: updImg, label: "Factory update" }] : []} index={updImg ? 0 : null} onClose={() => setUpdImg(null)} onIndex={() => {}} />
      <MessageModal open={modal === "message"} onClose={() => setModal(null)} to={m?.name ?? "manufacturer"} subject={`${order.id} – ${order.name}`} href={href} />

      <Modal
        open={modal === "batch"}
        onClose={() => setModal(null)}
        title={`Update ${batchId}`}
        sub="Record units made so far. A finished batch goes to Quality for testing."
        footer={<>
          <Btn onClick={() => setModal(null)}>Cancel</Btn>
          <Btn onClick={() => saveBatch(order.batches.find((b) => b.id === batchId)?.planned ?? units)}>Mark complete</Btn>
          <Btn kind="primary" onClick={() => saveBatch(units)}>Save progress</Btn>
        </>}
      >
        {(() => {
          const b = order.batches.find((x) => x.id === batchId);
          if (!b) return null;
          return (
            <div className="space-y-[10px]">
              <Field label={`Completed units (of ${fmtNum(b.planned)})`}><input type="number" min={0} max={b.planned} className={inputCls} value={units} onChange={(e) => setUnits(Math.max(0, Math.min(b.planned, +e.target.value)))} /></Field>
              <input type="range" aria-label="Completed units" min={0} max={b.planned} step={500} value={units} onChange={(e) => setUnits(+e.target.value)} className="w-full accent-[#1d4b34]" />
              <p className="text-[12px] text-cs-ink-2">{Math.round((units / b.planned) * 100)}% of batch</p>
            </div>
          );
        })()}
      </Modal>

      <Modal open={modal === "updates"} onClose={() => setModal(null)} title="Factory updates" sub={`${order.updates.length} updates on ${order.id}`} width={620}
        footer={<><Btn onClick={() => setModal(null)}>Close</Btn><Btn kind="primary" disabled={!note.trim()} onClick={() => { const t = note.trim(); mod((o, d) => { o.updates.unshift({ at: new Date().toISOString(), text: t }); log(d, { text: `Posted update on ${o.id}: ${t}`, tag: "Production", href }); }); setNote(""); toast("Update posted"); }}>Post update</Btn></>}>
        <textarea aria-label="New update" rows={2} className={textareaCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note to the order timeline…" />
        <ul className="mt-[12px] max-h-[45dvh] space-y-[10px] overflow-y-auto">
          {order.updates.map((u, i) => <li key={i} className="border-b border-[#f1efea] pb-[8px]"><p className="text-[11px] text-cs-ink-2">{fmtDateTime(u.at)}</p><p className="text-[13px]">{u.text}</p></li>)}
        </ul>
      </Modal>

      <Modal open={modal === "evidence"} onClose={() => setModal(null)} title="Quality evidence" sub={`${order.evidence.length} items from ${m?.name}`} width={720}>
        {order.evidence.length === 0 ? <Empty>No evidence uploaded yet.</Empty> : (
          <div className="grid grid-cols-3 gap-[12px]">
            {order.evidence.map((e, i) => (
              <button key={i} type="button" onClick={() => { setModal(null); setLightbox(i); }} className="text-left">
                <Image src={e.img} alt={e.label} width={300} height={200} className="h-[130px] w-full rounded-[7px] object-cover" />
                <span className="mt-[5px] block text-[12.5px]">{e.label}</span><span className="text-[11.5px] text-cs-ink-2">{e.batch}</span>
              </button>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={modal === "issues"} onClose={() => setModal(null)} title="Issues & risks" sub={`${openIssues.length} open · ${order.issues.length - openIssues.length} mitigated`} width={620}
        footer={<><Btn onClick={() => setModal(null)}>Close</Btn><Btn kind="primary" icon={AlertTriangle} onClick={() => { setIssue({ title: "", level: "Medium", detail: "" }); setModal("issue"); }}>Log a risk</Btn></>}>
        <ul className="space-y-[10px]">
          {order.issues.length === 0 && <Empty>No issues logged on this order.</Empty>}
          {order.issues.map((i) => (
            <li key={i.id} className={cn("flex items-start gap-[10px] rounded-[8px] border border-cs-line p-[10px]", i.resolved && "opacity-60")}>
              <div className="flex-1">
                <p className="flex items-center gap-[8px] text-[13px] font-semibold">{i.title}<Pill tone={i.resolved ? "gray" : i.level === "High" ? "red" : i.level === "Medium" ? "orange" : "green"}>{i.resolved ? "Mitigated" : i.level}</Pill></p>
                <p className="mt-[2px] text-[12px] text-cs-ink-2">{i.detail}</p>
                <p className="mt-[2px] text-[11px] text-cs-ink-2">{fmtDate(i.at)} · {i.ref}</p>
              </div>
              <button type="button" onClick={() => mod((o) => { const x = o.issues.find((y) => y.id === i.id); if (x) x.resolved = !x.resolved; })} className="text-[12px] font-medium text-cs-green hover:underline">{i.resolved ? "Reopen" : "Mark mitigated"}</button>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal open={modal === "issue"} onClose={() => setModal(null)} title="Raise an issue" sub={`${order.id} · ${order.name}`}
        footer={<><Btn onClick={() => setModal(null)}>Cancel</Btn><Btn kind="primary" disabled={!issue.title.trim()} onClick={() => { const x = issue; mod((o, d) => { o.issues.unshift({ id: `ISS-${Date.now()}`, title: x.title.trim(), detail: x.detail.trim() || "—", level: x.level, at: new Date().toISOString(), resolved: false, ref: o.id }); log(d, { text: `Raised ${x.level.toLowerCase()} issue on ${o.id}: ${x.title.trim()}`, tag: "Production", href }); }); setModal(null); toast("Issue logged"); }}>Log issue</Btn></>}>
        <div className="space-y-[12px]">
          <Field label="Title"><input autoFocus className={inputCls} value={issue.title} onChange={(e) => setIssue({ ...issue, title: e.target.value })} placeholder="e.g. Label print misaligned on Batch 004" /></Field>
          <Field label="Severity">
            <div className="flex gap-[6px]">{(["High", "Medium", "Low"] as const).map((l) => <button key={l} type="button" onClick={() => setIssue({ ...issue, level: l })} className={cn("rounded-[6px] border px-[12px] py-[6px] text-[12.5px]", issue.level === l ? "border-cs-green bg-cs-mint text-cs-green" : "border-cs-line")}>{l}</button>)}</div>
          </Field>
          <Field label="Details"><textarea rows={3} className={textareaCls} value={issue.detail} onChange={(e) => setIssue({ ...issue, detail: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal open={modal === "contacts"} onClose={() => setModal(null)} title="Contacts" sub={m?.name}>
        <ul className="divide-y divide-cs-line">
          {(m?.contacts ?? []).map((c) => (
            <li key={c.name} className="flex items-center gap-[12px] py-[10px]">
              <Avatar name={c.name} size={40} />
              <div className="flex-1 text-[13px]"><p className="font-semibold">{c.name}</p><p className="text-[12px] text-cs-ink-2">{c.role} · {c.email} · {c.phone}</p></div>
              <a href={`mailto:${c.email}`} aria-label={`Email ${c.name}`} className="grid size-[32px] place-items-center rounded-full bg-cs-mint text-cs-green"><Mail className="size-[15px]" /></a>
              <a href={`tel:${c.phone.replace(/\s/g, "")}`} aria-label={`Call ${c.name}`} className="grid size-[32px] place-items-center rounded-full bg-cs-mint text-cs-green"><Phone className="size-[15px]" /></a>
            </li>
          ))}
        </ul>
        <p className="mt-[10px] text-[12px] text-cs-ink-2">Order value {inr(total)} · <Factory className="inline size-[12px]" /> {m?.city}, {m?.state}</p>
      </Modal>
    </div>
  );
}

/**
 * Order milestones, as in the mockup: filled circles for done steps, the current
 * one solid green, and a small hollow dot on the line just after it (work in flight).
 */
function ProgressSteps({ steps, current }: { steps: { label: string; icon: LucideIcon; sub: string; note: string }[]; current: number }) {
  const n = steps.length;
  const SZ = 48;
  return (
    <div className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>
      <div className="absolute flex" style={{ left: `${50 / n}%`, right: `${50 / n}%`, top: SZ / 2 - 1 }}>
        {steps.slice(0, -1).map((st, i) => (
          <span key={st.label} className={cn("relative h-[2px] flex-1", i < current ? "bg-cs-green" : "bg-[#dedcd6]")}>
            {i === current && current < n - 1 && <span className="absolute left-[38%] top-1/2 size-[13px] -translate-y-1/2 rounded-full border-[1.5px] border-[#c9ccc7] bg-white" />}
          </span>
        ))}
      </div>
      {steps.map((st, i) => {
        const done = i < current;
        const on = i === current;
        return (
          <div key={st.label} className="relative flex flex-col items-center text-center">
            <span className={cn("relative grid place-items-center rounded-full", on ? "bg-cs-green text-white ring-[5px] ring-cs-mint" : done ? "bg-cs-mint text-cs-green" : "border border-[#e2e0da] bg-[#f6f5f1] text-[#4b524e]")} style={{ width: SZ, height: SZ }}>
              <st.icon className="size-[22px]" strokeWidth={1.6} />
              {(done || on) && (
                <span className="absolute -bottom-[3px] -right-[3px] grid size-[17px] place-items-center rounded-full border-2 border-white bg-cs-green text-white">
                  <CheckIcon className="size-[10px]" strokeWidth={3} />
                </span>
              )}
            </span>
            <p className="mt-[10px] text-[13.5px] font-semibold leading-tight text-[#1d211e]">{st.label}</p>
            <p className="mt-[4px] text-[11.5px] leading-tight text-[#3e4440]">{st.sub}</p>
            <p className={cn("mt-[3px] text-[11.5px] leading-tight", done ? "text-cs-green-2" : on ? "text-cs-blue" : "text-cs-ink-2")}>{st.note}</p>
          </div>
        );
      })}
    </div>
  );
}

function Header({ id }: { id: string }) {
  return (
    <WideHero
      eyebrow={<span className="flex items-center gap-[10px]">PRODUCTION <span className="text-[13px]">›</span> ORDERS <span className="text-[13px]">›</span> <span className="tracking-[0.05em]">{id}</span></span>}
      title="Production Order Tracking"
      lede={<>Track real-time progress, get factory updates, and ensure your products<br />are on time from production to delivery.</>}
      img="/console/hero-production.jpg"
      photo={54}
      height={163}
      titleSize={42}
      ledeGap={8}
      quote={["Quality", "production.", "On time.", "Every time."]}
      quoteTop={25}
      quoteWidth={155}
    />
  );
}

export default function ProductionPage() {
  return (
    <Suspense fallback={<Header id="ORD-2026-0042" />}>
      <ProductionInner />
    </Suspense>
  );
}
