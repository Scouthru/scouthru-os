"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Boxes, ClipboardList, FileText, FlaskConical, IndianRupee, ShieldCheck, Truck } from "lucide-react";
import { CardTitle, Crumbs, Empty, Hero, Pill, Stepper, type Tone } from "@/components/console/kit";
import { CT, Loading } from "@/components/console/making";
import { NextAction, Timeline } from "@/components/console/flow";
import { useConsole } from "@/lib/console/store";
import { productNext, productRecords, productSteps, productTimeline, type LinkedStep, type ProductRecords } from "@/lib/console/flow";
import { fmtDate, fmtNum } from "@/lib/console/format";
import type { ProductStage } from "@/lib/console/types";
import { cn } from "@/lib/cn";

const STAGE_TONE: Record<ProductStage, Tone> = { Active: "green", "In Development": "blue", "In Production": "green", Approved: "green", Draft: "gray", Archived: "gray" };

/**
 * Product workspace: one page per product that answers what it is, where it stands,
 * who has to act next, and what happened, across every linked record (enquiry, quotes,
 * sample, production, materials, quality, shipment, payments).
 */
export default function ProductWorkspacePage() {
  const { s, ready } = useConsole();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const p = s.products.find((x) => x.id === id);

  if (!ready) return <><Header name="Product" /><Loading /></>;
  if (!p) return <><Header name="Not found" /><div className="px-[15px] py-[20px]"><Empty>No product with this ID. <Link href="/console/products" className="font-medium text-cs-green underline">Back to products</Link></Empty></div></>;

  const r = productRecords(s, p);
  const steps = productSteps(s, r);
  const top = productNext(steps);
  const mfr = s.manufacturers.find((m) => m.id === p.mfrId);
  const journey = journeyOf(r);

  return (
    <div>
      <Header name={p.name} />
      <div className="space-y-[12px] px-[15px] pb-[20px]">
        {/* what is it */}
        <section className="cs-card flex flex-wrap items-start gap-[16px] px-[15px] py-[14px]">
          <Image src={p.img} alt={p.name} width={180} height={160} className="h-[96px] w-[108px] shrink-0 rounded-[8px] object-cover" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-[8px]">
              <h2 className="serif text-[24px] font-semibold leading-tight">{p.name}</h2>
              <Pill tone={STAGE_TONE[p.stage]}>{p.stage}</Pill>
            </div>
            <p className="mt-[4px] text-[12.5px] text-cs-ink-2">{p.id} · {p.category} · target MOQ {fmtNum(p.moq)} units · made by {mfr ? <Link href={`/console/manufacturers?id=${mfr.id}`} className="font-medium text-cs-ink hover:text-cs-green">{mfr.name}</Link> : "—"}</p>
            <p className="mt-[8px] line-clamp-2 max-w-[760px] text-[13px] leading-[1.5] text-[#48413b]">{p.brief}</p>
          </div>
          <Link href={`/console/products?id=${p.id}`} className="inline-flex h-[36px] items-center gap-[6px] rounded-[7px] border border-[#d5c9b7] bg-white px-[12px] text-[12.5px] font-medium hover:border-[#ad9c8e]">Brief, packaging &amp; reorder</Link>
        </section>

        {/* what needs to happen next */}
        {top && <NextAction step={{ ...top.step, title: `${top.kind}: ${top.step.title}` }} onAction={() => router.push(top.href)} />}

        {/* where it stands */}
        <section className="cs-card overflow-x-auto px-[15px] py-[14px]">
          <CardTitle sub="From the first enquiry to the last payment."><CT>Journey</CT></CardTitle>
          <div className="mt-[14px] min-w-[640px]">
            <Stepper size={40} current={journey.current} allDone={journey.current >= JOURNEY.length} steps={JOURNEY.map((j, i) => ({ label: j.label, icon: j.icon, sub: journey.subs[i] }))} />
          </div>
        </section>

        <div className="grid items-start gap-[12px] min-[1024px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* who is responsible for what */}
          <section className="cs-card px-[15px] pb-[12px] pt-[14px]">
            <CardTitle sub="Every record linked to this product and whose turn it is."><CT>Linked records</CT></CardTitle>
            <ul className="mt-[10px] space-y-[8px]">
              {steps.map((l) => <LinkedRow key={`${l.kind}-${l.id}`} l={l} />)}
              {steps.length === 0 && <Empty>Nothing linked yet. Start with an enquiry from the Products page.</Empty>}
            </ul>
          </section>

          {/* what changed */}
          <section className="cs-card px-[15px] pb-[14px] pt-[14px]">
            <CardTitle sub="Shared history across enquiry, sample, production, quality, shipment and payments."><CT>Timeline</CT></CardTitle>
            <Timeline items={productTimeline(s, r)} next={top?.step} className="mt-[12px]" />
          </section>
        </div>
      </div>
    </div>
  );
}

function Header({ name }: { name: string }) {
  return (
    <Hero
      eyebrow={<Crumbs items={["Products", name]} />}
      title="Product Workspace"
      lede="Everything about this product in one place: where it stands, whose turn it is, and what happened."
      img="/console/hero-products.jpg"
      quote={["From concept", "to shelf-ready", "product."]}
      height={152}
      quoteTop={36}
      quoteWidth={212}
    />
  );
}

function LinkedRow({ l }: { l: LinkedStep }) {
  const st = l.step;
  const late = st.due && new Date(st.due) < new Date();
  return (
    <li>
      <Link href={l.href} className={cn("group flex items-start gap-[12px] rounded-[10px] border px-[12px] py-[10px] transition-colors hover:border-[#ad9c8e]", st.state === "open" && st.yours ? "border-cs-green/40 bg-cs-mint/40" : "border-cs-line bg-white")}>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-[8px]"><span className="monolabel">{l.kind}</span><span className="text-[11.5px] text-cs-ink-2">{l.id}</span></p>
          <p className="mt-[2px] text-[13.5px] font-medium leading-snug">{st.title}</p>
          <p className="mt-[2px] text-[11.5px] text-cs-ink-2">
            {st.state === "open" ? (st.yours ? <b className="font-medium text-cs-green">Your step</b> : <>Waiting on {st.owner}</>) : st.state === "done" ? "Done" : "Closed"}
            {st.due && <span className={cn("ml-[6px]", late && "text-cs-red")}>· due {fmtDate(st.due)}</span>}
          </p>
        </div>
        <ArrowRight className="mt-[4px] size-[15px] shrink-0 text-cs-ink-2 transition-transform group-hover:translate-x-[2px]" />
      </Link>
    </li>
  );
}

const JOURNEY = [
  { label: "Enquiry", icon: FileText },
  { label: "Quotes", icon: ClipboardList },
  { label: "Sample", icon: FlaskConical },
  { label: "Production", icon: Boxes },
  { label: "Quality", icon: ShieldCheck },
  { label: "Shipment", icon: Truck },
  { label: "Paid", icon: IndianRupee },
];

/** Which journey step the product is on, and a short status under each step. */
function journeyOf(r: ProductRecords) {
  const made = r.orders.length > 0 && r.orders.every((o) => o.batches.every((b) => b.status === "Completed"));
  const milestones = r.payments.flatMap((p) => p.milestones);
  const done = [
    r.enquiries.some((e) => e.stage !== "Draft") || r.samples.length > 0 || r.orders.length > 0,
    r.enquiries.some((e) => e.quotes.length > 0) || r.samples.length > 0 || r.orders.length > 0,
    r.samples.some((x) => x.status === "Approved") || r.orders.length > 0,
    made,
    r.quality.length > 0 && r.quality.every((q) => q.status === "Passed") && made,
    r.shipments.length > 0 && r.shipments.every((x) => x.status === "Delivered") && made,
    milestones.length > 0 && milestones.every((m) => m.status === "Paid"),
  ];
  const quotes = r.enquiries.reduce((a, e) => a + e.quotes.length, 0);
  const units = r.orders.reduce((a, o) => a + o.qty, 0);
  const madeUnits = r.orders.reduce((a, o) => a + o.batches.reduce((b, x) => b + x.completed, 0), 0);
  const subs = [
    r.enquiries[0]?.stage ?? (r.orders.length ? "Ordered direct" : "Not started"),
    quotes ? `${quotes} quote${quotes === 1 ? "" : "s"}` : r.samples.length || r.orders.length ? "Skipped" : "—",
    r.samples[0]?.status ?? (r.orders.length ? "Skipped" : "—"),
    units ? `${Math.round((madeUnits / units) * 100)}% made` : "—",
    r.quality.length ? `${r.quality.filter((q) => q.status === "Passed").length}/${r.quality.length} passed` : "—",
    r.shipments.length ? `${r.shipments.filter((x) => x.status === "Delivered").length}/${r.shipments.length} delivered` : "—",
    milestones.length ? `${milestones.filter((m) => m.status === "Paid").length}/${milestones.length} paid` : "—",
  ];
  const first = done.findIndex((x) => !x);
  return { current: first === -1 ? JOURNEY.length : first, subs };
}
