"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Field, Modal, Pill, StageTrack, Tag } from "@/components/ui";
import { Donut, EnquiryModal, FIT_TONE, UploadProof } from "@/components/factory";
import { fmt, useStore } from "@/lib/store";
import { BRAND_NAME, FACTORY_ID, ORDER_STEPS, notify, openCase, orderTrack } from "@/lib/ops";
import { dayLabel } from "@/lib/seed";
import type { Enquiry } from "@/lib/types";
import { cn } from "@/lib/cn";

const SOURCES: Enquiry["source"][] = ["Scouthru", "IndiaMART", "Phone call", "WhatsApp", "Referral", "Email"];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function FactoryHome() {
  const { s, update, toast } = useStore();
  const [open, setOpen] = useState<Enquiry | null>(null);
  const [imp, setImp] = useState(false);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("import")) setImp(true); }, []);
  const [issue, setIssue] = useState(false);
  const [src, setSrc] = useState<string>("All");

  const cap = s.capacity;
  const pct = Math.round((cap.booked / cap.total) * 100);
  const free = cap.total - cap.booked;
  const stale = s.enquiries.filter((e) => e.status === "new" && e.receivedHoursAgo >= 24);
  const myOrders = s.orders.filter((o) => o.factoryId === FACTORY_ID);
  const featured = myOrders.find((o) => o.id === "SO-1046") ?? myOrders[0];
  const payDue = myOrders.find((o) => o.payments.some((p) => p.status === "due"));
  const over = s.enquiries.find((e) => e.fit === "Needs partner unit" && e.status === "new");
  const list = s.enquiries.filter((e) => src === "All" || e.source === src);
  const live = list.find((e) => e.id === open?.id) ?? null;

  const steps = featured
    ? [
        { t: "Sample approved", d: "Retained for QC", state: "done" },
        { t: "Advance 20%", d: featured.payments[0].status === "paid" ? "Received" : "Awaited", state: featured.payments[0].status === "paid" ? "done" : "now" },
        { t: "Production", d: featured.payments[1].status === "paid" ? "30% received" : "30% due at start", state: featured.stage === "production" ? "now" : featured.stage === "agreed" || featured.stage === "sample" ? "todo" : "done" },
        { t: "QC check", d: "Sample vs batch", state: featured.stage === "qc" ? "now" : ["dispatch", "delivered", "closed"].includes(featured.stage) ? "done" : "todo" },
        { t: "Dispatch", d: "Partner logistics", state: featured.stage === "dispatch" ? "now" : ["delivered", "closed"].includes(featured.stage) ? "done" : "todo" },
        { t: "Final payment", d: "7-day complaint window", state: featured.stage === "closed" ? "done" : featured.stage === "delivered" ? "now" : "todo" },
      ]
    : [];

  return (
    <>
      <DeskHeader
        kicker={`${greeting()}, Nutrabite Foods`}
        title="Enquiries and orders"
        actions={<><Btn onClick={() => setImp(true)}>Import enquiry</Btn><Btn variant="flame" href="/factory/orders?new=1">New order</Btn></>}
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Needs attention">
          <ul className="flex flex-col gap-2">
            {stale.length > 0 && (
              <li><button onClick={() => setOpen(stale[0])} className="flex w-full gap-3 rounded-[10px] bg-soft p-3 text-left"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-flame" /><span><b className="block text-[14px]">{stale.length} enquir{stale.length === 1 ? "y" : "ies"} unanswered for 24+ hours</b><span className="text-[13px] text-ink-2">Reply before buyers move on</span></span></button></li>
            )}
            {payDue && (
              <li><Link href="/factory/payments" className="flex gap-3 rounded-[10px] bg-soft p-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-info" /><span><b className="block text-[14px]">Payment milestone due: {payDue.payments.find((p) => p.status === "due")!.label}</b><span className="text-[13px] text-ink-2">Order {payDue.id} · reminder sent to buyer</span></span></Link></li>
            )}
            {over && (
              <li><Link href="/factory/partners" className="flex gap-3 rounded-[10px] bg-soft p-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-flame" /><span><b className="block text-[14px]">{over.moq > free ? `${over.product} exceeds capacity by ${fmt(over.moq - free)} units` : `${over.product} (${fmt(over.moq)} units) is outside your line`}</b><span className="text-[13px] text-ink-2">Share with a partner unit to accept it</span></span></Link></li>
            )}
            {!stale.length && !payDue && !over && <li className="text-[13px] text-ink-2">All clear.</li>}
          </ul>
        </Panel>

        <Panel title="Capacity this quarter" right={cap.line}>
          <div className="flex flex-wrap items-center gap-6">
            <Donut pct={pct} />
            <div className="text-[14px]">
              <p><span className="num font-medium">{fmt(cap.booked)}</span> of {fmt(cap.total)} units</p>
              <p className="mt-1 text-ink-2">Free: {fmt(free)} units</p>
              <p className="mt-1 text-ink-2">Next quarter: {cap.nextQ}% booked</p>
              <Link href="/factory/partners" className="mt-2 inline-block font-semibold underline">Overflow to partner units</Link>
            </div>
          </div>
        </Panel>
      </div>

      <Panel className="mt-5" pad={false} title="Enquiries" right={
        <select value={src} onChange={(e) => setSrc(e.target.value)} className="rounded-lg border border-line bg-white px-2 py-1 text-[13px]">
          <option>All</option>{SOURCES.map((x) => <option key={x}>{x}</option>)}
        </select>
      }>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr><th className="th pl-6">Product</th><th className="th">Source</th><th className="th">MOQ</th><th className="th">Needed by</th><th className="th">Region</th><th className="th">Can you make it</th><th className="th">Status</th><th className="th pr-6" /></tr></thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} className="hover:bg-soft/50">
                  <td className="td pl-6 font-semibold">{e.product}</td>
                  <td className="td"><Tag>{e.source}</Tag></td>
                  <td className="td num">{fmt(e.moq)}</td>
                  <td className="td">{e.neededBy}</td>
                  <td className="td">{e.region}</td>
                  <td className={cn("td font-semibold", FIT_TONE[e.fit])}>{e.fit}</td>
                  <td className="td">{e.status === "new" ? (e.receivedHoursAgo >= 24 ? <Pill tone="bad">{e.receivedHoursAgo}h unanswered</Pill> : <Pill tone="info">New</Pill>) : <Pill tone={e.status === "quoted" ? "ok" : "neutral"}>{e.status === "quoted" ? "Quoted" : "Declined"}</Pill>}</td>
                  <td className="td pr-6 text-right"><button onClick={() => setOpen(e)} className="font-semibold underline">Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {myOrders.length > 0 && (
        <Panel className="mt-5" title="Orders in progress" right={<Link href="/factory/orders" className="text-[13px] font-semibold hover:underline">All orders →</Link>}>
          <ul className="grid gap-x-6 gap-y-1 md:grid-cols-2">
            {myOrders.filter((o) => o.stage !== "closed").map((o) => (
              <li key={o.id}>
                <Link href={`/factory/orders/${o.id}`} className="flex items-center gap-4 rounded-[10px] px-2 py-2.5 hover:bg-soft">
                  <span className="min-w-0 flex-1"><b className="block truncate text-[14px]">{o.id} · {o.product}</b><span className="block truncate text-[12px] text-ink-2">{BRAND_NAME[o.brandId] ?? o.brandId} · due {o.due}</span></span>
                  <span className="w-[170px] shrink-0"><StageTrack steps={ORDER_STEPS} {...orderTrack(o)} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {featured && (
        <Panel className="mt-5" title={`Order ${featured.id} · ${featured.product}, ${fmt(featured.qty)} ${featured.uom}`} right={`Quote frozen till ${featured.frozenTill}`}>
          <p className="-mt-2 mb-3 text-[13px] text-ink-2">For {BRAND_NAME[featured.brandId] ?? featured.brandId}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {steps.map((st) => (
              <div key={st.t} className={cn("rounded-lg border p-3", st.state === "now" ? "border-apricot bg-peach" : st.state === "done" ? "border-line bg-soft" : "border-line bg-white")}>
                <span className={cn("block h-1 rounded-full", st.state === "done" ? "bg-pine" : st.state === "now" ? "bg-flame" : "bg-soft")} />
                <p className="mt-2 text-[13px] font-semibold">{st.t}</p>
                <p className="text-[12px] text-ink-2">{st.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <UploadProof o={featured} />
            <Btn onClick={() => setIssue(true)}>Report an issue</Btn>
            <Btn variant="ghost" href={`/factory/orders/${featured.id}`}>Open order →</Btn>
          </div>
        </Panel>
      )}

      <EnquiryModal e={live} onClose={() => setOpen(null)} />

      <Modal open={imp} onClose={() => setImp(false)} title="Import an enquiry">
        <form className="flex flex-col gap-3" onSubmit={(ev) => {
          ev.preventDefault();
          const f = new FormData(ev.currentTarget);
          const moq = parseInt(String(f.get("qty")).replace(/\D/g, ""), 10) || 1000;
          update((d) => {
            const fit: Enquiry["fit"] = moq > d.capacity.total - d.capacity.booked ? "Needs partner unit" : /serum|cream|capsule|lotion/i.test(String(f.get("product"))) ? "Not your line" : "Fits";
            d.enquiries.unshift({ id: `e-${Date.now()}`, product: String(f.get("product")), source: f.get("source") as Enquiry["source"], moq, neededBy: dayLabel(30), region: String(f.get("region")), fit, buyer: String(f.get("buyer")) || "New buyer", receivedHoursAgo: 0, status: "new", notes: "Imported manually" });
          });
          toast("Enquiry imported and checked against your capacity");
          setImp(false);
        }}>
          <Field label="Source"><select name="source" className="input">{SOURCES.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Product"><input name="product" className="input" required placeholder="e.g. Granola bar" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity"><input name="qty" className="input" inputMode="numeric" required /></Field>
            <Field label="Region"><input name="region" className="input" defaultValue="Hyderabad" /></Field>
          </div>
          <Field label="Buyer"><input name="buyer" className="input" placeholder="Name or company" /></Field>
          <Btn variant="pine" type="submit">Import</Btn>
          <p className="text-[12px] text-ink-3">IndiaMART and WhatsApp leads can also flow in automatically once connected.</p>
        </form>
      </Modal>

      <Modal open={issue} onClose={() => setIssue(false)} title={`Report an issue · ${featured?.id}`}>
        <form className="flex flex-col gap-3" onSubmit={(ev) => {
          ev.preventDefault();
          const t = String(new FormData(ev.currentTarget).get("what"));
          update((d) => { const x = d.orders.find((y) => y.id === featured!.id)!; x.changes.unshift({ id: `f${Date.now()}`, text: `Factory: ${t}`, note: "Raised by factory · Scouthru notified", status: "Awaiting you", by: "factory" }); openCase(d, { kind: "Factory issue", title: `${x.id} · ${x.product}`, detail: t, from: "Nutrabite Foods", orderId: x.id }); notify(d, "brand", `Nutrabite Foods reported an issue on ${x.id}`, `/brand/orders/${x.id}`); });
          toast("Issue reported. The brand and Scouthru are notified.");
          setIssue(false);
        }}>
          <Field label="What's the issue"><textarea name="what" className="input h-24 py-2" required placeholder="e.g. Whey supply delayed 2 days" /></Field>
          <Btn variant="flame" type="submit">Report</Btn>
        </form>
      </Modal>
    </>
  );
}
