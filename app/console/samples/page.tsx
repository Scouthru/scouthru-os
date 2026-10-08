"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check as CheckIcon, ChevronRight, CircleDot, Clock3, Download, Eye, FileText, FlaskConical, Hourglass, Layers, MessageSquare,
  Microscope, Pencil, Utensils, Wind, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Btn, CardTitle, Crumbs, Empty, Field, FilterSelect, Modal, Pill, RowMenu, SearchBox, Tabs, ViewAllBtn, inputCls, textareaCls } from "@/components/console/kit";
import { Avatar, Lightbox, Loading, SAMPLE_TONE, WideHero, CT } from "@/components/console/making";
import { useConsole } from "@/lib/console/store";
import { createOrderFromSample, log, sampleOrderDefaults, setSampleStatus } from "@/lib/console/actions";
import { download, fmtDate, fmtDateTime, fmtNum } from "@/lib/console/format";
import type { Eval, Sample, SampleStatus } from "@/lib/console/types";
import { cn } from "@/lib/cn";

const STEPS: SampleStatus[] = ["Submitted", "In Review", "Testing", "Feedback", "Approved"];
const EST_DAYS = [0, 3, 6, 8, 10];
const EVAL_ICON: Record<string, LucideIcon> = {
  Appearance: Eye, Odor: Wind, Taste: Utensils, Texture: Layers, Disintegration: Hourglass, "Assay (Active Content)": FlaskConical, "Microbial Limits": Microscope,
};
const LARGE: Record<string, string> = { "Ashwagandha Capsules": "/console/smp-ashwagandha-lg.jpg" };
const STATUSES: SampleStatus[] = ["Draft", "Submitted", "In Review", "Testing", "Feedback", "Changes Requested", "Approved", "Rejected"];

type Tab = "details" | "quality" | "packaging" | "comments" | "attachments";

/** Index of the step the sample has reached (Changes Requested sits at Feedback; Rejected stays where it stopped). */
function stepIndex(s: Sample) {
  if (s.status === "Draft") return -1;
  if (s.status === "Changes Requested") return 3;
  if (s.status === "Rejected") {
    const prev = [...s.history].reverse().find((h) => STEPS.includes(h.status) && h.status !== "Approved");
    return prev ? STEPS.indexOf(prev.status) : 0;
  }
  return STEPS.indexOf(s.status);
}

function SampleStepper({ s }: { s: Sample }) {
  const cur = stepIndex(s);
  const approved = s.status === "Approved";
  const rejected = s.status === "Rejected";
  return (
    <div className="mx-[15px] mb-[12px] flex items-center rounded-[8px] border border-cs-line px-[16px] py-[11px]">
      {STEPS.map((st, k) => {
        const done = approved || k < cur;
        const on = !approved && k === cur;
        const hit = [...s.history].reverse().find((h) => h.status === st);
        const label = on && rejected ? "Rejected" : on && s.status === "Changes Requested" ? "Changes Requested" : st;
        const date = hit && (done || on) ? fmtDate(hit.at) : `Est. ${fmtDate(new Date(new Date(s.requestedAt).getTime() + EST_DAYS[k] * 864e5).toISOString())}`;
        return (
          <div key={st} className="flex min-w-0 flex-1 items-center last:flex-none">
            <div className="flex shrink-0 items-center gap-[12px]">
              <span className={cn(
                "grid size-[36px] place-items-center rounded-full",
                done && "bg-cs-green text-white",
                on && !rejected && "border-2 border-cs-green bg-white",
                on && rejected && "border-2 border-cs-red bg-white text-cs-red",
                !done && !on && "border-2 border-[#dcdad4] bg-white",
              )}>
                {done && <CheckIcon className="size-[18px]" strokeWidth={2.4} />}
                {on && !rejected && <span className="size-[18px] rounded-full bg-cs-green" />}
                {on && rejected && <X className="size-[18px]" strokeWidth={2.4} />}
              </span>
              <span className="leading-tight">
                <span className={cn("block text-[13.5px] font-medium", on && rejected ? "text-cs-red" : "text-[#1d211e]")}>{label}</span>
                <span className="mt-[2px] block text-[12.5px] text-cs-ink-2">{date}</span>
              </span>
            </div>
            {k < STEPS.length - 1 && <span className={cn("mx-[14px] h-[2px] min-w-[20px] flex-1", k < cur || approved ? "bg-cs-green" : "bg-[#dedcd6]")} />}
          </div>
        );
      })}
    </div>
  );
}

function EvalStatus({ e }: { e: Eval }) {
  if (e.status === "Pass") return <span className="flex items-center gap-[7px] text-[12.5px] text-[#1d211e]"><span className="grid size-[16px] place-items-center rounded-full bg-cs-ok text-white"><CheckIcon className="size-[10px]" strokeWidth={3} /></span>Pass</span>;
  if (e.status === "Fail") return <span className="flex items-center gap-[7px] text-[12.5px] text-cs-red"><span className="grid size-[16px] place-items-center rounded-full bg-cs-red text-white"><X className="size-[10px]" strokeWidth={3} /></span>Fail</span>;
  if (e.status === "Testing") return <span className="flex items-center gap-[7px] text-[12.5px] text-[#1d211e]"><Clock3 className="size-[16px] text-cs-ink-2" strokeWidth={1.8} />Testing</span>;
  return <span className="flex items-center gap-[7px] text-[12.5px] text-[#1d211e]"><span className="size-[14px] rounded-full bg-[#c9ccc7]" />Not Started</span>;
}

function SamplesInner() {
  const { s, ready, update, toast } = useConsole();
  const router = useRouter();
  const params = useSearchParams();
  const wanted = params.get("id");
  const sample = useMemo(
    () => s.samples.find((x) => x.id === wanted) ?? s.samples.find((x) => x.status === "In Review") ?? s.samples[0],
    [s.samples, wanted],
  );
  const [tab, setTab] = useState<Tab>("details");
  const [editSpecs, setEditSpecs] = useState<[string, string][] | null>(null);
  const [pkIndex, setPkIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [comment, setComment] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "order" | "changes" | "reject" | "all">(null);
  const [reason, setReason] = useState("");
  const [allFilter, setAllFilter] = useState("");
  const [allQ, setAllQ] = useState("");
  const [orderForm, setOrderForm] = useState({ qty: 0, price: 0, dest: "Mumbai, India" });

  const select = (id: string) => {
    setTab("details"); setEditSpecs(null); setPkIndex(0); setComment(null);
    router.replace(`/console/samples?id=${id}`, { scroll: false });
  };

  if (!ready || !sample) {
    return (
      <>
        <Header />
        <Loading />
      </>
    );
  }

  const m = s.manufacturers.find((x) => x.id === sample.mfrId);
  const enquiry = s.enquiries.find((e) => e.id === sample.enquiryId);
  const pack = sample.name.includes("Ashwagandha") ? sample.packaging : [sample.img];
  const pkImages = pack.map((src, i) => ({ src, label: i === 0 ? `${sample.name} – packaging` : `${sample.name} – view ${i + 1}` }));
  const others = [sample, ...s.samples.filter((x) => x.id !== sample.id)].slice(0, 6);
  const order = sample.orderId ? s.orders.find((o) => o.id === sample.orderId) : undefined;
  const mod = (fn: (x: Sample) => void) => update((d) => { const x = d.samples.find((y) => y.id === sample.id); if (x) fn(x); });

  const openOrder = () => {
    const def = sampleOrderDefaults(sample, enquiry);
    setOrderForm({ qty: def.qty, price: def.unitPrice, dest: "Mumbai, India" });
    setModal("order");
  };
  const approve = () => {
    update((d) => setSampleStatus(d, sample.id, "Approved"));
    toast(`${sample.id} approved`);
    openOrder();
  };
  const createOrder = () => {
    const out = { id: null as string | null };
    update((d) => { out.id = createOrderFromSample(d, sample.id, orderForm.qty, orderForm.price, orderForm.dest); });
    setModal(null);
    if (out.id) { toast(`Production order ${out.id} created`); router.push(`/console/production?id=${out.id}`); }
  };
  const addComment = () => {
    if (!comment?.trim()) return;
    const text = comment.trim();
    update((d) => {
      const x = d.samples.find((y) => y.id === sample.id);
      if (!x) return;
      x.comments.push({ at: new Date().toISOString(), who: d.user.name, text });
      log(d, { text: `Added comment on sample ${x.id}`, tag: "Sample", href: `/console/samples?id=${x.id}` });
    });
    setComment(null);
    toast("Comment added");
  };
  const setEval = (label: string, status: Eval["status"]) => mod((x) => {
    const e = x.evaluation.find((v) => v.label === label);
    if (e) { e.status = status; e.note = status === "Pass" ? "Within specification" : status === "Fail" ? "Out of specification" : status === "Testing" ? "Lab testing in progress" : "Scheduled"; }
  });

  const comments = sample.comments;
  const allList = s.samples.filter((x) => (!allFilter || x.status === allFilter) && (!allQ || `${x.name} ${x.id}`.toLowerCase().includes(allQ.toLowerCase())));

  return (
    <div>
      <Header />
      <div className="px-[15px] pb-[20px]">
        {/* sample header card */}
        <section className="cs-card relative -mt-[1px]">
          <div className="relative flex flex-wrap gap-[18px] px-[15px] pb-[12px] pt-[15px] lg:flex-nowrap">
            <Image src={LARGE[sample.name] ?? sample.img} alt={sample.name} width={344} height={320} className="h-[160px] w-[172px] shrink-0 rounded-[8px] object-cover" />
            <div className="min-w-0 flex-1 pt-0">
              <div className="flex items-start justify-between gap-2 pr-[4px]">
                <Pill tone={SAMPLE_TONE[sample.status]} className="gap-[5px] py-[2px]">
                  <span className="grid size-[11px] place-items-center rounded-full bg-current"><CheckIcon className="size-[8px] text-white" strokeWidth={3} /></span>
                  {sample.status}
                </Pill>
                <RowMenu
                  items={[
                    { label: "Mark as In Review", icon: CircleDot, onClick: () => { update((d) => setSampleStatus(d, sample.id, "In Review")); toast("Moved to In Review"); }, disabled: sample.status === "In Review" },
                    { label: "Mark as Testing", icon: FlaskConical, onClick: () => { update((d) => setSampleStatus(d, sample.id, "Testing")); toast("Moved to Testing"); }, disabled: sample.status === "Testing" },
                    { label: "Mark as Feedback", icon: MessageSquare, onClick: () => { update((d) => setSampleStatus(d, sample.id, "Feedback")); toast("Moved to Feedback"); }, disabled: sample.status === "Feedback" },
                    "sep",
                    { label: "Add comment", icon: Pencil, onClick: () => { setTab("comments"); setComment(""); } },
                  ]}
                />
              </div>
              <h2 className="serif mt-[4px] text-[24px] font-semibold leading-tight tracking-[-0.02em]">{sample.name}</h2>
              <p className="mt-[4px] flex items-center gap-[10px] text-[13.5px] text-[#3e4440]">Rev. {String(sample.rev).padStart(2, "0")}<span className="h-[14px] w-px bg-[#c9ccc7]" />{m?.name}</p>
              <div className="mt-[10px] flex flex-wrap gap-[6px]">
                {sample.tags.map((t) => <span key={t} className="rounded-[5px] bg-[#f1f0ec] px-[10px] py-[3px] text-[11.5px] text-[#3e4440]">{t}</span>)}
              </div>
              <p className="mt-[10px] max-w-[365px] text-[12.5px] leading-[1.45] tracking-[-0.005em] text-[#3e4440]">{sample.desc}</p>
            </div>
            <div className="hidden w-px shrink-0 bg-cs-line lg:block" />
            <dl className="w-full shrink-0 lg:w-[330px] space-y-[7px] pt-[1px] text-[12.5px] leading-[16px]">
              {([
                ["Sample ID", sample.id],
                ["Request Date", fmtDate(sample.requestedAt)],
                ["Quantity", `${fmtNum(sample.qty)} ${sample.unit}`],
                ["Expected Lead Time", sample.leadTime],
              ] as const).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[128px_1fr] border-b border-[#f1efea] pb-[4px]"><dt className="text-[#3e4440]">{k}</dt><dd>{v}</dd></div>
              ))}
              <div className="grid grid-cols-[128px_1fr]">
                <dt className="text-[#3e4440]">Manufacturer</dt>
                <dd>
                  <Link href={`/console/manufacturers?id=${sample.mfrId}`} className="group flex items-center justify-between pr-[10px]">
                    <span><span className="block font-semibold group-hover:text-cs-green">{m?.name}</span><span className="block text-cs-ink-2">{m?.state}, India</span></span>
                    <ChevronRight className="size-[15px]" />
                  </Link>
                </dd>
              </div>
            </dl>
            <div className="hidden w-px shrink-0 bg-cs-line lg:block" />
            <div className="flex w-full shrink-0 flex-col gap-[10px] lg:w-[252px]">
              {sample.status === "Approved" ? (
                order
                  ? <Btn kind="primary" icon={ChevronRight} className="h-[42px] w-full text-[14px]" onClick={() => router.push(`/console/production?id=${order.id}`)}>View Order {order.id}</Btn>
                  : <Btn kind="primary" icon={CheckIcon} className="h-[42px] w-full text-[14px]" onClick={openOrder}>Create Production Order</Btn>
              ) : (
                <Btn kind="primary" icon={CheckIcon} className="h-[42px] w-full text-[14px]" onClick={approve} disabled={sample.status === "Rejected"}>Approve Sample</Btn>
              )}
              <Btn icon={MessageSquare} className="h-[42px] w-full text-[14px]" onClick={() => { setReason(""); setModal("changes"); }} disabled={sample.status === "Approved"}>Request Changes</Btn>
              <Btn kind="danger" icon={X} className="h-[42px] w-full text-[14px]" onClick={() => { setReason(""); setModal("reject"); }} disabled={sample.status === "Rejected" || sample.status === "Approved"}>Reject Sample</Btn>
            </div>
          </div>
          <SampleStepper s={sample} />
        </section>

        <div className="mt-[9px] grid gap-[15px] min-[1024px]:grid-cols-[minmax(0,876fr)_minmax(0,323fr)]">
          {/* left: tabs and tab content */}
          <section className="min-w-0">
            <Tabs<Tab>
              className="px-[8px]"
              value={tab}
              onChange={(t) => { setTab(t); setEditSpecs(null); }}
              tabs={[
                { key: "details", label: "Sample Details" },
                { key: "quality", label: "Quality & Testing" },
                { key: "packaging", label: "Packaging" },
                { key: "comments", label: `Comments (${comments.length})` },
                { key: "attachments", label: `Attachments (${sample.attachments.length})` },
              ]}
            />

            {tab === "details" && (
              <div className="mt-[10px] grid gap-[13px] min-[1024px]:grid-cols-2">
                {/* specifications */}
                <div className="cs-card px-[14px] pb-[10px] pt-[13px]">
                  <CardTitle right={
                    editSpecs
                      ? <div className="flex gap-[6px]"><button type="button" onClick={() => setEditSpecs(null)} className="rounded-[6px] border border-cs-line px-[10px] py-[4px] text-[12px]">Cancel</button><button type="button" onClick={() => { const v = editSpecs; mod((x) => { x.specs = v; }); setEditSpecs(null); toast("Specifications saved"); }} className="rounded-[6px] bg-cs-green px-[10px] py-[4px] text-[12px] text-white">Save</button></div>
                      : <button type="button" onClick={() => setEditSpecs(sample.specs.map(([a, b]) => [a, b]))} className="rounded-[6px] border border-cs-line px-[12px] py-[4px] text-[12px] hover:border-[#cfcac0]">Edit</button>
                  }><CT>Sample Specifications</CT></CardTitle>
                  <dl className="mt-[6px]">
                    {(editSpecs ?? sample.specs).map(([k, v], i) => (
                      <div key={k} className="grid grid-cols-[156px_1fr] items-center border-b border-[#f1efea] py-[3px] text-[12.5px] leading-[1.35] last:border-0">
                        <dt className="text-[#3e4440]">{k}</dt>
                        <dd>{editSpecs
                          ? <input aria-label={k} className="h-[26px] w-full rounded-[5px] border border-[#d6d8d3] px-[7px] text-[12.5px] outline-none focus:border-cs-green" value={v} onChange={(e) => setEditSpecs((p) => p && p.map((r, j) => (j === i ? [r[0], e.target.value] : r)))} />
                          : v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* packaging preview */}
                <div className="cs-card px-[14px] pb-[11px] pt-[11px]">
                  <CardTitle right={<ViewAllBtn label="View Details" onClick={() => setLightbox(pkIndex)} />}><CT>Packaging Preview</CT></CardTitle>
                  <div className="mt-[9px] flex gap-[13px]">
                    <button type="button" onClick={() => setLightbox(pkIndex)} className="min-w-0 flex-1 overflow-hidden rounded-[7px]">
                      <Image src={pack[pkIndex] ?? pack[0]} alt="Packaging preview" width={606} height={404} className="h-[202px] w-full object-cover" />
                    </button>
                    {pack.length > 1 && (
                      <div className="flex w-[55px] shrink-0 flex-col gap-[6px]">
                        {pack.slice(0, 3).map((src, i) => (
                          <button key={src} type="button" aria-label={`Show view ${i + 1}`} onClick={() => setPkIndex(i)} className={cn("overflow-hidden rounded-[6px] border-2", pkIndex === i ? "border-cs-green" : "border-transparent")}>
                            <Image src={src} alt="" width={110} height={92} className="h-[42px] w-full object-cover" />
                          </button>
                        ))}
                        {pack.length > 3 && (
                          <button type="button" onClick={() => setLightbox(3)} className="grid h-[40px] place-items-center rounded-[6px] border border-cs-line bg-white text-[12.5px] font-medium">+{pack.length - 3}</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* evaluation */}
                <div className="cs-card px-[14px] pb-[10px] pt-[13px]">
                  <CardTitle><CT>Quality &amp; Sensory Evaluation</CT></CardTitle>
                  <p className="mt-[1px] text-[11.5px] text-cs-ink-2">Based on internal review and lab testing results.</p>
                  <ul className="mt-[6px]">
                    {sample.evaluation.map((e) => {
                      const Icon = EVAL_ICON[e.label] ?? FlaskConical;
                      return (
                        <li key={e.label} className="grid grid-cols-[24px_134px_98px_1fr] items-center border-b border-[#f1efea] py-[3px] leading-[18px] last:border-0">
                          <Icon className="size-[15px] text-[#3e4440]" strokeWidth={1.6} />
                          <span className="text-[11.5px]">{e.label}</span>
                          <EvalStatus e={e} />
                          <span className="truncate text-[11px] text-cs-ink-2">{e.note}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* comments */}
                <div className="cs-card px-[14px] pb-[12px] pt-[13px]">
                  <CardTitle right={<button type="button" onClick={() => setComment(comment === null ? "" : null)} className="rounded-[6px] border border-cs-line px-[11px] py-[4px] text-[12px] font-medium hover:border-[#cfcac0]">Add Comment</button>}><CT>Comments &amp; Feedback</CT></CardTitle>
                  {comment !== null && (
                    <div className="mt-[10px] flex gap-[8px]">
                      <input autoFocus aria-label="New comment" className={cn(inputCls, "h-[34px]")} value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} placeholder="Write a comment…" />
                      <Btn kind="primary" className="h-[34px]" onClick={addComment} disabled={!comment.trim()}>Post</Btn>
                    </div>
                  )}
                  <ul className="mt-[8px] space-y-[10px]">
                    {comments.length === 0 && <Empty>No comments yet.</Empty>}
                    {comments.slice(-3).map((c, i) => (
                      <li key={i} className="flex gap-[10px]">
                        <Avatar name={c.who} size={32} />
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-[8px] text-[12px]"><b className="font-semibold">{c.who}</b>{c.who !== s.user.name && m && c.who !== "Priya Sharma" && <span className="rounded-[4px] bg-cs-orange-bg px-[6px] py-[1px] text-[10.5px] text-[#b8641f]">{m.short} Manufacturing</span>}<span className="text-[11px] text-cs-ink-2">{fmtDateTime(c.at)}</span></p>
                          <p className="mt-[2px] text-[11.5px] leading-[1.45] text-[#3e4440]">{c.text}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {tab === "quality" && (
              <div className="cs-card mt-[12px] px-[16px] pb-[12px] pt-[14px]">
                <CardTitle sub="Set the result for each check as lab reports come in."><CT>Quality &amp; Testing</CT></CardTitle>
                <table className="mt-[10px] w-full text-[12.5px]">
                  <thead><tr className="text-left text-[11.5px] text-cs-ink-2"><th className="py-[6px] font-medium">Check</th><th className="font-medium">Result</th><th className="font-medium">Note</th><th className="w-[160px] font-medium">Set result</th></tr></thead>
                  <tbody>
                    {sample.evaluation.map((e) => (
                      <tr key={e.label} className="border-t border-[#f1efea]">
                        <td className="py-[8px]">{e.label}</td>
                        <td><EvalStatus e={e} /></td>
                        <td className="text-cs-ink-2">{e.note}</td>
                        <td>
                          <div className="flex gap-[4px]">
                            {(["Pass", "Fail", "Testing"] as const).map((st) => (
                              <button key={st} type="button" onClick={() => setEval(e.label, st)} className={cn("rounded-[5px] border px-[8px] py-[3px] text-[11.5px]", e.status === st ? "border-cs-green bg-cs-mint text-cs-green" : "border-cs-line hover:border-[#cfcac0]")}>{st}</button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "packaging" && (
              <div className="cs-card mt-[12px] p-[16px]">
                <CardTitle sub="Click a view to open it full size."><CT>Packaging</CT></CardTitle>
                <div className="mt-[12px] grid grid-cols-2 gap-[12px] min-[1024px]:grid-cols-4">
                  {pkImages.map((im, i) => (
                    <button key={im.src + i} type="button" onClick={() => setLightbox(i)} className="overflow-hidden rounded-[8px] border border-cs-line text-left hover:border-cs-green">
                      <Image src={im.src} alt={im.label} width={400} height={300} className="h-[150px] w-full object-cover" />
                      <span className="block px-[10px] py-[7px] text-[12px]">{im.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === "comments" && (
              <div className="cs-card mt-[12px] p-[16px]">
                <CardTitle><CT>Comments &amp; Feedback</CT></CardTitle>
                <ul className="mt-[12px] space-y-[14px]">
                  {comments.length === 0 && <Empty>No comments yet. Start the conversation with {m?.name}.</Empty>}
                  {comments.map((c, i) => (
                    <li key={i} className="flex gap-[10px]">
                      <Avatar name={c.who} size={34} />
                      <div>
                        <p className="text-[12.5px]"><b className="font-semibold">{c.who}</b> <span className="ml-[6px] text-[11px] text-cs-ink-2">{fmtDateTime(c.at)}</span></p>
                        <p className="mt-[2px] text-[12.5px] leading-[1.5] text-[#3e4440]">{c.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-[14px] flex gap-[8px] border-t border-cs-line pt-[14px]">
                  <textarea aria-label="New comment" rows={2} className={textareaCls} value={comment ?? ""} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment…" />
                  <Btn kind="primary" onClick={addComment} disabled={!comment?.trim()}>Post</Btn>
                </div>
              </div>
            )}

            {tab === "attachments" && (
              <div className="cs-card mt-[12px] p-[16px]">
                <CardTitle><CT>Attachments</CT></CardTitle>
                <ul className="mt-[10px] divide-y divide-cs-line">
                  {sample.attachments.map((f) => (
                    <li key={f} className="flex items-center gap-[10px] py-[10px]">
                      <span className="grid size-[34px] place-items-center rounded-[7px] bg-cs-red-bg text-cs-red"><FileText className="size-[17px]" strokeWidth={1.7} /></span>
                      <span className="flex-1 text-[13px]">{f}</span>
                      <Btn icon={Download} className="h-[32px] px-[12px] text-[12px]" onClick={() => download(f.replace(/\.pdf$/, ".txt"), `${f}\nSample ${sample.id} – ${sample.name}\nManufacturer: ${m?.name}\nRevision ${sample.rev}\nStatus: ${sample.status}\n`, "text/plain")}>Download</Btn>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* right: other samples */}
          <section className="cs-card self-start px-[12px] pb-[12px] pt-[16px]">
            <CardTitle right={<ViewAllBtn onClick={() => { setAllFilter(""); setAllQ(""); setModal("all"); }} />}><CT>Other Samples</CT></CardTitle>
            <ul className="mt-[12px] space-y-[9px]">
              {others.map((x) => {
                const xm = s.manufacturers.find((y) => y.id === x.mfrId);
                const on = x.id === sample.id;
                return (
                  <li key={x.id}>
                    <button type="button" onClick={() => select(x.id)} className={cn("relative flex w-full items-center gap-[10px] rounded-[8px] border p-[7px] pr-[24px] text-left", on ? "border-cs-green-2 bg-[#fbfdfb]" : "border-cs-line hover:border-[#cfcac0]")}>
                      <Image src={x.img} alt="" width={120} height={120} className="size-[60px] shrink-0 rounded-[6px] object-cover" />
                      <span className="min-w-0 flex-1 leading-[16px]">
                        <span className="block truncate text-[12px] font-medium tracking-[-0.01em]">{x.name}</span>
                        <span className="block truncate pr-[82px] text-[10.5px] text-cs-ink-2">{xm?.name}</span>
                        <span className="block whitespace-nowrap text-[10.5px] text-cs-ink-2">Rev. {String(x.rev).padStart(2, "0")} • {fmtNum(x.qty)} units</span>
                      </span>
                      <Pill tone={SAMPLE_TONE[x.status]} className="absolute right-[26px] top-[calc(50%+1px)] max-w-[80px] -translate-y-1/2 truncate px-[7px] text-[10.5px]">{x.status}</Pill>
                      <ChevronRight className="absolute right-[7px] top-1/2 size-[15px] -translate-y-1/2" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      <Lightbox images={pkImages} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />

      <Modal
        open={modal === "order"}
        onClose={() => setModal(null)}
        title="Create production order"
        sub={`${sample.name} · ${m?.name}. Batches of 10,000 units and a payment plan are set up for you.`}
        footer={<><Btn onClick={() => setModal(null)}>Not now</Btn><Btn kind="primary" onClick={createOrder} disabled={orderForm.qty <= 0 || orderForm.price <= 0 || !orderForm.dest.trim()}>Create order</Btn></>}
      >
        <div className="grid grid-cols-2 gap-[12px]">
          <Field label="Quantity (units)"><input type="number" min={1} className={inputCls} value={orderForm.qty} onChange={(e) => setOrderForm({ ...orderForm, qty: +e.target.value })} /></Field>
          <Field label="Unit price (₹)"><input type="number" min={0} step="0.1" className={inputCls} value={orderForm.price} onChange={(e) => setOrderForm({ ...orderForm, price: +e.target.value })} /></Field>
          <div className="col-span-2"><Field label="Deliver to"><input className={inputCls} value={orderForm.dest} onChange={(e) => setOrderForm({ ...orderForm, dest: e.target.value })} /></Field></div>
        </div>
        <p className="mt-[12px] text-[12.5px] text-cs-ink-2">Order value ₹{fmtNum(orderForm.qty * orderForm.price)} · {Math.max(1, Math.ceil(orderForm.qty / 10000))} batch{Math.ceil(orderForm.qty / 10000) > 1 ? "es" : ""}</p>
      </Modal>

      <Modal
        open={modal === "changes"}
        onClose={() => setModal(null)}
        title="Request changes"
        sub={`Tell ${m?.name} what to change for the next revision.`}
        footer={<><Btn onClick={() => setModal(null)}>Cancel</Btn><Btn kind="primary" disabled={!reason.trim()} onClick={() => { update((d) => setSampleStatus(d, sample.id, "Changes Requested", reason.trim())); setModal(null); toast("Change request sent"); }}>Send request</Btn></>}
      >
        <Field label="What needs to change"><textarea autoFocus rows={4} className={textareaCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Reduce capsule shell thickness; share revised COA." /></Field>
      </Modal>

      <Modal
        open={modal === "reject"}
        onClose={() => setModal(null)}
        title="Reject this sample?"
        sub="The manufacturer is told the sample did not meet the brief."
        footer={<><Btn onClick={() => setModal(null)}>Cancel</Btn><Btn kind="danger" icon={X} disabled={!reason.trim()} onClick={() => { update((d) => setSampleStatus(d, sample.id, "Rejected", `Rejected: ${reason.trim()}`)); setModal(null); toast(`${sample.id} rejected`, "bad"); }}>Reject sample</Btn></>}
      >
        <Field label="Reason"><textarea autoFocus rows={3} className={textareaCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Assay below label claim." /></Field>
      </Modal>

      <Modal open={modal === "all"} onClose={() => setModal(null)} title="All samples" sub={`${s.samples.length} samples across ${new Set(s.samples.map((x) => x.mfrId)).size} manufacturers`} width={720}>
        <div className="flex gap-[8px]">
          <SearchBox className="flex-1" value={allQ} onChange={setAllQ} placeholder="Search by product or sample ID…" />
          <FilterSelect label="All statuses" value={allFilter} options={STATUSES} onChange={setAllFilter} className="w-[170px]" />
        </div>
        <ul className="mt-[12px] max-h-[55dvh] divide-y divide-cs-line overflow-y-auto">
          {allList.length === 0 && <Empty>No samples match.</Empty>}
          {allList.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => { select(x.id); setModal(null); }} className="flex w-full items-center gap-[12px] px-[4px] py-[9px] text-left hover:bg-[#f7f6f2]">
                <Image src={x.img} alt="" width={80} height={80} className="size-[40px] rounded-[6px] object-cover" />
                <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium">{x.name}</span><span className="block text-[11.5px] text-cs-ink-2">{x.id} · {s.manufacturers.find((y) => y.id === x.mfrId)?.name} · {fmtDate(x.requestedAt)}</span></span>
                <Pill tone={SAMPLE_TONE[x.status]}>{x.status}</Pill>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}

function Header() {
  return (
    <WideHero
      eyebrow={<Crumbs items={["Samples", "Sample Review & Approval"]} />}
      title="Sample Review & Approval"
      lede="Review sample details, evaluate quality, and share feedback with the manufacturer."
      img="/console/hero-samples.jpg"
      photo={46}
      height={146}
      ledeWidth={700}
      ledeGap={7}
    />
  );
}

export default function SamplesPage() {
  return (
    <Suspense fallback={<Header />}>
      <SamplesInner />
    </Suspense>
  );
}
