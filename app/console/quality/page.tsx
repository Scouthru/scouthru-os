"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle, BarChart3, Box, Check as CheckIcon, CheckCircle2, ClipboardCheck, Download, FileSearch, FileText, FlaskConical, Globe, List,
  RotateCcw, Settings2, ShieldCheck, TestTube2, X, Fingerprint, Calculator, Bug, Sprout, Cog, Scale,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Btn, Check, Crumbs, Empty, Field, FilterSelect, Menu, Modal, Pill, RowMenu, SearchBox, StatStrip, ViewAllBtn, inputCls, textareaCls,
} from "@/components/console/kit";
import { Avatar, Loading, QB_TONE, WideHero, CT } from "@/components/console/making";
import { useConsole } from "@/lib/console/store";
import { approveBatch, log, raiseIssue, retestBatch } from "@/lib/console/actions";
import { ago, download, fmtDate, fmtDateTime, fmtNum } from "@/lib/console/format";
import type { CheckStatus, ConsoleState, QualityBatch, TestStatus } from "@/lib/console/types";
import { cn } from "@/lib/cn";

type StepState = "Completed" | "In Progress" | "Pending" | "Issues Found";
/** Per-test icons, as in the mockup's Testing Results list. */
const TEST_ICON: [RegExp, LucideIcon][] = [[/identity/i, Fingerprint], [/assay/i, Calculator], [/heavy/i, FlaskConical], [/microbial/i, Bug], [/pesticide/i, Sprout], [/disintegration/i, Cog], [/uniformity|weight/i, Scale]];
const testIcon = (name: string) => TEST_ICON.find(([re]) => re.test(name))?.[1] ?? TestTube2;

const WF: { label: string; icon: LucideIcon }[] = [
  { label: "Sample Collection", icon: FlaskConical },
  { label: "Lab Testing", icon: FlaskConical },
  { label: "Results Review", icon: FileSearch },
  { label: "Compliance Check", icon: ShieldCheck },
  { label: "Final Approval", icon: Box },
];

/** Workflow position for a batch, derived from its checklist, tests and status. */
function workflow(q: QualityBatch): StepState[] {
  const ran = q.tests.filter((t) => t.status === "Pass" || t.status === "Fail").length;
  const s0 = q.checklist[0]?.status === "Completed";
  const s1 = ran === q.tests.length;
  const s2 = q.checklist.slice(1, 6).every((c) => c.status === "Completed");
  const s3 = q.checklist[6]?.status === "Completed";
  const s4 = q.status === "Passed";
  const raw: StepState[] = [
    s0 ? "Completed" : "In Progress",
    s1 ? "Completed" : s0 ? "In Progress" : "Pending",
    s2 && s1 ? "Completed" : s1 ? "In Progress" : "Pending",
    s3 && s2 && s1 ? "Completed" : s2 && s1 ? "In Progress" : "Pending",
    s4 ? "Completed" : s3 && s2 && s1 ? "In Progress" : "Pending",
  ];
  if (s4) return raw.map(() => "Completed");
  if (q.status === "Issues Found") {
    const k = raw.findIndex((x) => x !== "Completed");
    if (k >= 0) raw[k] = "Issues Found";
  }
  return raw;
}

const STEP_PILL: Record<StepState, string> = {
  Completed: "bg-cs-mint text-cs-green-2",
  "In Progress": "bg-cs-blue-bg text-cs-blue",
  Pending: "bg-cs-orange-bg text-[#b8641f]",
  "Issues Found": "bg-cs-red-bg text-cs-red",
};
const CHECK_PILL: Record<CheckStatus, string> = { Completed: "bg-cs-mint text-cs-green-2", "In Progress": "bg-cs-blue-bg text-cs-blue", Pending: "bg-cs-orange-bg text-[#b8641f]" };
const NEXT_CHECK: Record<CheckStatus, CheckStatus> = { Pending: "In Progress", "In Progress": "Completed", Completed: "Pending" };
const DOC_ICON: Record<string, LucideIcon> = { GMP: ShieldCheck, FSSAI: FileText, "ISO 22000": Globe, COA: FlaskConical, "Stability Data": BarChart3, "Microbial Test": Settings2 };
const RANGES: Record<string, number> = { "Last 7 days": 7, "Last 30 days": 30, "Last 90 days": 90 };

/** Card heading sized for this dense three-column screen (the mockup uses ~16px here). */
function T({ children, right, sub, size = 16.5 }: { children: React.ReactNode; right?: React.ReactNode; sub?: string; size?: number }) {
  return (
    <div className="flex items-start justify-between gap-[8px]">
      <div className="min-w-0">
        <h2 className="serif truncate font-semibold leading-tight tracking-[-0.02em] text-[#151816]" style={{ fontSize: size }}>{children}</h2>
        {sub && <p className="mt-[3px] text-[12.5px] text-cs-ink-2">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

function TestBadge({ status }: { status: TestStatus }) {
  if (status === "Pass") return <span className="flex items-center gap-[6px] text-[12px] text-cs-green-2"><span className="grid size-[15px] place-items-center rounded-full bg-cs-green-2 text-white"><CheckIcon className="size-[9px]" strokeWidth={3} /></span>Pass</span>;
  if (status === "Fail") return <span className="flex items-center gap-[6px] text-[12px] text-cs-red"><span className="grid size-[15px] place-items-center rounded-full bg-cs-red text-white"><X className="size-[9px]" strokeWidth={3} /></span>Fail</span>;
  if (status === "In Progress") return <span className="flex items-center gap-[5px] rounded-[5px] bg-cs-blue-bg px-[7px] py-[2px] text-[11.5px] text-cs-blue"><span className="size-[10px] rounded-full border-2 border-cs-blue border-r-transparent" />In Progress</span>;
  return <span className="flex items-center gap-[5px] rounded-[5px] bg-cs-orange-bg px-[7px] py-[2px] text-[11.5px] text-[#b8641f]"><span className="size-[10px] rounded-full border-2 border-cs-orange border-r-transparent" />Pending</span>;
}

/** Stable "valid until" per document so the modal reads the same across visits. */
function validUntil(name: string) {
  const n = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const d = new Date();
  d.setMonth(d.getMonth() + 4 + (n % 20));
  return d.toISOString();
}

function QualityInner() {
  const { s, ready, update, toast } = useConsole();
  const router = useRouter();
  const params = useSearchParams();
  const wanted = params.get("id");
  const [closed, setClosed] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("");
  const [range, setRange] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  // The open batch counts as selected (ticked, as in the mockup) unless its box is unticked.
  const [offActive, setOffActive] = useState(false);
  const [compact, setCompact] = useState(false);
  const [modal, setModal] = useState<null | "retest" | "issue" | "issues" | "notes" | "docs" | "tests" | "batches">(null);
  const [doc, setDoc] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [issue, setIssue] = useState({ title: "", level: "Medium" as "High" | "Medium" | "Low", detail: "" });
  const [note, setNote] = useState("");

  const batch = useMemo(
    () => (closed ? undefined : s.quality.find((x) => x.id === wanted) ?? s.quality.find((x) => x.status === "In Testing") ?? s.quality[0]),
    [s.quality, wanted, closed],
  );

  const list = useMemo(() => {
    const now = Date.now();
    return s.quality.filter((x) => {
      const m = s.manufacturers.find((y) => y.id === x.mfrId)?.name ?? "";
      if (q && !`${x.id} ${x.name} ${x.sampleRef} ${m}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (cat && x.category !== cat) return false;
      if (status && x.status !== status) return false;
      if (range && now - new Date(x.updatedAt).getTime() > RANGES[range] * 864e5) return false;
      return true;
    });
  }, [s.quality, s.manufacturers, q, cat, status, range]);

  if (!ready) return <><Header /><Loading /></>;

  const select = (id: string) => { setClosed(false); setOffActive(false); router.replace(`/console/quality?id=${id}`, { scroll: false }); };
  const mfr = (id: string) => s.manufacturers.find((x) => x.id === id);
  const mod = (id: string, fn: (x: QualityBatch, d: ConsoleState) => void) => update((d) => { const x = d.quality.find((y) => y.id === id); if (x) { fn(x, d); x.updatedAt = new Date().toISOString(); } });

  // stats
  const open = s.quality.filter((x) => x.status !== "Passed");
  const openChecks = open.reduce((a, x) => a + x.checklist.filter((c) => c.status !== "Completed").length, 0);
  const allTests = s.quality.flatMap((x) => x.tests);
  const passedTests = allTests.filter((t) => t.status === "Pass").length;
  const docsPending = s.compliance.filter((c) => c.status !== "Valid").length + open.filter((x) => x.checklist[6]?.status !== "Completed").length;
  const needAction = s.compliance.filter((c) => c.status !== "Valid").length + s.quality.filter((x) => x.status === "Issues Found").length;
  const issuesOpen = s.issues.filter((i) => !i.resolved);
  const critical = issuesOpen.filter((i) => i.level === "High").length;
  const decided = s.quality.filter((x) => x.status === "Passed" || x.status === "Issues Found");
  const passed = s.quality.filter((x) => x.status === "Passed").length;
  const rate = decided.length ? Math.round((passed / decided.length) * 100) : 0;

  const wf = batch ? workflow(batch) : [];
  const testsDone = batch ? batch.tests.filter((t) => t.status === "Pass" || t.status === "Fail").length : 0;
  const checksDone = batch ? batch.checklist.filter((c) => c.status === "Completed").length : 0;
  const testPct = batch ? Math.round((testsDone / batch.tests.length) * 100) : 0;
  const categories = Array.from(new Set(s.quality.map((x) => x.category)));
  const docObj = s.compliance.find((c) => c.name === doc);

  const sel = batch && !offActive ? Array.from(new Set([batch.id, ...picked])) : picked;
  const showBulk = sel.length > 1 || (sel.length === 1 && sel[0] !== batch?.id);
  const clearSel = () => { setPicked([]); setOffActive(true); };

  const approve = () => {
    if (!batch) return;
    const out = { id: null as string | null };
    update((d) => { out.id = approveBatch(d, batch.id); });
    toast(`${batch.id} approved · shipment ${out.id} ready for dispatch`);
  };
  const bulkApprove = () => {
    const ids = sel.filter((id) => s.quality.find((x) => x.id === id)?.status !== "Passed");
    update((d) => ids.forEach((id) => approveBatch(d, id)));
    clearSel();
    toast(`${ids.length} batch${ids.length === 1 ? "" : "es"} approved · shipments created`);
  };
  const setTest = (name: string, st: TestStatus) => batch && mod(batch.id, (x, d) => {
    const t = x.tests.find((y) => y.name === name);
    if (!t) return;
    t.status = st;
    log(d, { text: `${x.id} ${name}: ${st}`, tag: "Quality", href: `/console/quality?id=${x.id}` });
  });

  return (
    <div>
      <Header />
      <div className="px-[15px] pb-[16px]">
        <StatStrip items={[
          { icon: FileText, tone: "green", value: openChecks, label: "Open Quality Checks", delta: `${open.filter((x) => x.status === "In Testing").length} batches in testing`, deltaTone: "bad" },
          { icon: CheckCircle2, tone: "green", value: passedTests, label: "Tests Passed", delta: `of ${allTests.length} tests on record` },
          { icon: FileText, tone: "orange", value: docsPending, label: "Compliance Docs Pending", delta: `${needAction} require action`, deltaTone: "bad" },
          { icon: AlertTriangle, tone: "red", value: issuesOpen.length, label: "Quality Issues", delta: `${critical} critical issue${critical === 1 ? "" : "s"}`, deltaTone: "bad" },
          { icon: BarChart3, tone: "green", value: `${rate}%`, label: "Batch Approval Rate", delta: `${passed} of ${decided.length} decided batches` },
        ]} />

        <div className="mt-[11px] grid gap-[11px] min-[1024px]:grid-cols-[minmax(0,582fr)_minmax(0,321fr)_minmax(0,291fr)]">
          {/* column 1 */}
          <div className="flex min-w-0 flex-col gap-[12px]">
            <section className="cs-card px-[15px] pb-[14px] pt-[12px]">
              <T size={19} sub={batch ? `Track the quality journey for ${batch.id} from testing to final approval.` : "Track the quality journey for each batch from testing to final approval."}>Quality Workflow</T>
              {batch ? (
                <div className="relative mt-[18px] grid grid-cols-5">
                  <div className="absolute left-[10%] right-[10%] top-[22px] flex">
                    {WF.slice(0, -1).map((w, i) => <span key={w.label} className={cn("h-[2px] flex-1", wf[i] === "Completed" ? "bg-cs-green" : "bg-[#dedcd6]")} />)}
                  </div>
                  {WF.map((w, i) => (
                    <div key={w.label} className="relative flex flex-col items-center text-center">
                      <span className={cn("relative grid size-[46px] place-items-center rounded-full", wf[i] === "Pending" ? "border border-[#e2e0da] bg-[#f6f5f1] text-[#4b524e]" : wf[i] === "Issues Found" ? "bg-cs-red-bg text-cs-red" : "bg-cs-mint text-cs-green")}>
                        <w.icon className="size-[21px]" strokeWidth={1.6} />
                        {wf[i] === "Completed" && <span className="absolute -bottom-[2px] -right-[2px] grid size-[17px] place-items-center rounded-full border-2 border-white bg-cs-green text-white"><CheckIcon className="size-[9px]" strokeWidth={3} /></span>}
                      </span>
                      <p className="mt-[9px] whitespace-nowrap text-[11.5px] font-medium tracking-[-0.01em]">{w.label}</p>
                      <span className={cn("mt-[6px] rounded-[5px] px-[9px] py-[2px] text-[11px] font-medium", STEP_PILL[wf[i]])}>{wf[i]}</span>
                    </div>
                  ))}
                </div>
              ) : <Empty>Select a batch to see its workflow.</Empty>}
            </section>

            <section className="cs-card flex-1 px-[14px] pb-[8px] pt-[12px]">
              <T size={19} right={<ViewAllBtn onClick={() => setModal("batches")} />}>Batch Quality Checks</T>
              <div className="mt-[12px] flex gap-[7px]">
                <SearchBox className="min-w-0 flex-1 [&_input]:text-[10.5px]" value={q} onChange={setQ} placeholder="Search by batch, product, or manufacturer..." />
                <FilterSelect label="Product Category" value={cat} options={categories} onChange={setCat} className="w-[118px] shrink-0 [&_select]:pl-[9px] [&_select]:text-[10.5px]" />
                <FilterSelect label="Status" value={status} options={["In Testing", "Passed", "Issues Found", "Re-test"]} onChange={setStatus} className="w-[70px] shrink-0 [&_select]:pl-[9px] [&_select]:text-[10.5px]" />
                <FilterSelect label="Date Range" value={range} options={Object.keys(RANGES)} onChange={setRange} className="w-[92px] shrink-0 [&_select]:pl-[9px] [&_select]:text-[10.5px]" />
                <button type="button" aria-label={compact ? "Comfortable rows" : "Compact rows"} aria-pressed={compact} onClick={() => setCompact((c) => !c)} className={cn("grid size-[34px] shrink-0 place-items-center rounded-[6px] border", compact ? "border-cs-green bg-cs-mint text-cs-green" : "border-cs-line bg-white")}><List className="size-[16px]" /></button>
              </div>
              {showBulk && (
                <div className="mt-[10px] flex items-center gap-[10px] rounded-[8px] bg-cs-mint px-[12px] py-[7px] text-[12.5px]">
                  <b className="font-semibold text-cs-green">{sel.length} selected</b>
                  <button type="button" onClick={bulkApprove} className="font-medium text-cs-green hover:underline">Approve</button>
                  <button type="button" onClick={() => { const ids = sel; update((d) => ids.forEach((id) => retestBatch(d, id, "Bulk re-test request"))); clearSel(); toast(`Re-test requested for ${ids.length} batch${ids.length === 1 ? "" : "es"}`); }} className="font-medium text-cs-green hover:underline">Request re-test</button>
                  <button type="button" onClick={clearSel} className="ml-auto text-cs-ink-2 hover:underline">Clear</button>
                </div>
              )}
              <table className="mt-[10px] w-full table-fixed text-[11px] [&_td]:pr-[6px] [&_th]:pr-[6px] [&_th]:whitespace-nowrap">
                <colgroup><col className="w-[34px]" /><col className="w-[112px]" /><col className="w-[83px]" /><col className="w-[83px]" /><col className="w-[45px]" /><col className="w-[85px]" /><col /><col className="w-[28px]" /></colgroup>
                <thead>
                  <tr className="text-left text-[11px] text-[#3e4440]">
                    <th className="w-[34px] py-[8px] pl-[10px]"><Check label="Select all batches" checked={list.length > 0 && list.every((x) => sel.includes(x.id))} onChange={(v) => { if (v) { setPicked(list.map((x) => x.id)); setOffActive(false); } else clearSel(); }} /></th>
                    <th className="font-medium">Batch ID</th><th className="font-medium">Product</th><th className="font-medium">Manufacturer</th><th className="font-medium">Tests</th><th className="font-medium">Overall Status</th><th className="font-medium">Last Updated</th><th />
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 && <tr><td colSpan={8}><Empty>No batches match these filters.</Empty></td></tr>}
                  {list.map((x) => {
                    const on = batch?.id === x.id;
                    const done = x.tests.filter((t) => t.status === "Pass" || t.status === "Fail").length;
                    return (
                      <tr key={x.id} onClick={() => select(x.id)} className={cn("cursor-pointer", on ? "outline outline-[1.5px] -outline-offset-1 outline-cs-green-2 [&>td]:bg-[#fbfdfb]" : "border-t border-[#f1efea] hover:bg-[#faf9f6]")}>
                        <td className={cn("pl-[10px]", on && "rounded-l-[8px]")}><Check label={`Select ${x.id}`} checked={sel.includes(x.id)} onChange={(v) => { setPicked((p) => (v ? [...p, x.id] : p.filter((y) => y !== x.id))); if (on) setOffActive(!v); }} /></td>
                        <td className={compact ? "py-[5px]" : "py-[13px]"}>
                          <span className="flex items-center gap-[8px]">
                            {!compact && <Image src={x.img} alt="" width={72} height={72} className="size-[34px] shrink-0 rounded-[5px] object-cover" />}
                            <span className="leading-[15px]"><b className="block whitespace-nowrap font-semibold tracking-[-0.01em]">{x.id}</b><span className="whitespace-nowrap text-[9.5px] tracking-[-0.02em] text-cs-ink-2">{x.sampleRef}</span></span>
                          </span>
                        </td>
                        <td className="text-[10.5px] leading-[15px] tracking-[-0.01em]">{x.name}</td>
                        <td className="text-[10.5px] leading-[15px] tracking-[-0.01em] text-[#3e4440]">{mfr(x.mfrId)?.name}</td>
                        <td className="whitespace-nowrap">{done} / {x.tests.length}</td>
                        <td><Pill tone={QB_TONE[x.status]} className="px-[8px] py-[2px] text-[10.5px]">{x.status}</Pill></td>
                        <td className="whitespace-nowrap leading-[15px]">{fmtDate(x.updatedAt)}<br /><span className="text-[10.5px] text-cs-ink-2">{ago(x.updatedAt)}</span></td>
                        <td className={cn("w-[30px]", on && "rounded-r-[8px]")}>
                          <RowMenu items={[
                            { label: "Open details", icon: ClipboardCheck, onClick: () => select(x.id) },
                            { label: "Approve batch", icon: CheckCircle2, onClick: () => { const out = { id: null as string | null }; update((d) => { out.id = approveBatch(d, x.id); }); toast(`${x.id} approved · shipment ${out.id} ready`); }, disabled: x.status === "Passed" },
                            { label: "Request re-test", icon: RotateCcw, onClick: () => { select(x.id); setReason(""); setModal("retest"); } },
                            { label: "Raise issue", icon: AlertTriangle, onClick: () => { select(x.id); setIssue({ title: "", level: "Medium", detail: "" }); setModal("issue"); } },
                            ...(x.orderId ? [{ label: `View order ${x.orderId}`, icon: Box, onClick: () => router.push(`/console/production?id=${x.orderId}`) }] : []),
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </div>

          {/* column 2 */}
          <div className="flex min-w-0 flex-col gap-[10px]">
            <section className="cs-card px-[12px] pb-[11px] pt-[11px]">
              <T right={<ViewAllBtn onClick={() => setModal("docs")} />}>Compliance Documents</T>
              <div className="mt-[9px] grid grid-cols-3 gap-[6px]">
                {s.compliance.map((c) => {
                  const Icon = DOC_ICON[c.name] ?? FileText;
                  return (
                    <button key={c.name} type="button" onClick={() => setDoc(c.name)} className="flex h-[54px] items-start gap-[6px] rounded-[7px] border border-cs-line px-[7px] py-[8px] text-left hover:border-cs-green-2/60">
                      <Icon className="mt-[1px] size-[16px] shrink-0 text-[#3e4440]" strokeWidth={1.6} />
                      <span className="min-w-0">
                        <span className="block whitespace-nowrap text-[10px] font-medium leading-tight tracking-[-0.02em]">{c.name}</span>
                        <Pill tone={c.status === "Valid" ? "green" : c.status === "Expiring" ? "orange" : "red"} className="mt-[4px] px-[7px] py-[1px] text-[10px]">{c.status}</Pill>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="cs-card px-[12px] pb-[4px] pt-[11px]">
              <T right={<ViewAllBtn onClick={() => setModal("issues")} />}>Recent Quality Issues</T>
              <ul className="mt-[4px]">
                {issuesOpen.length === 0 && <li className="flex items-center gap-[8px] py-[10px] text-[12.5px] text-cs-green-2"><CheckCircle2 className="size-[16px]" />No open quality issues.</li>}
                {issuesOpen.slice(0, 3).map((i) => (
                  <li key={i.id} className="flex items-start gap-[9px] border-b border-[#f1efea] py-[7px] leading-[15px] last:border-0">
                    <span className={cn("grid size-[32px] shrink-0 place-items-center rounded-[7px]", i.level === "Medium" ? "bg-cs-orange-bg text-cs-orange" : "bg-cs-red-bg text-cs-red")}>{i.level === "Medium" ? <FlaskConical className="size-[17px]" strokeWidth={1.7} /> : <AlertTriangle className="size-[17px]" strokeWidth={1.7} />}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold tracking-[-0.01em]">{i.title}</p>
                      <p className="truncate text-[10px] tracking-[-0.01em] text-[#3e4440]">{i.ref}</p>
                      <p className="text-[10px] text-cs-ink-2">{ago(i.at)}</p>
                    </div>
                    <Pill tone={i.level === "High" ? "red" : i.level === "Medium" ? "orange" : "gray"} className="mt-[4px] px-[7px] py-[1px] text-[10.5px]">{i.level}</Pill>
                    <RowMenu items={[
                      { label: "Mark resolved", icon: CheckCircle2, onClick: () => { update((d) => { const x = d.issues.find((y) => y.id === i.id); if (x) x.resolved = true; log(d, { text: `Resolved quality issue: ${i.title}`, tag: "Quality", href: "/console/quality" }); }); toast("Issue resolved"); } },
                      ...(s.quality.some((x) => i.ref.startsWith(x.id)) ? [{ label: "Open batch", icon: ClipboardCheck, onClick: () => select(i.ref.split(" ")[0]) }] : []),
                    ]} />
                  </li>
                ))}
              </ul>
            </section>

            <section className="cs-card flex-1 px-[12px] pb-[6px] pt-[11px]">
              <T right={<ViewAllBtn onClick={() => setModal("tests")} />}>{batch ? `Testing Results (${batch.id})` : "Testing Results"}</T>
              {batch ? (
                <ul className="mt-[8px]">
                  {batch.tests.map((t) => (
                    <li key={t.name}>
                      <Menu
                        align="right"
                        items={(["Pass", "Fail", "In Progress", "Pending"] as const).map((st) => ({ label: `Set ${st}`, onClick: () => setTest(t.name, st), disabled: t.status === st }))}
                        trigger={
                          <button type="button" className="flex w-full items-center gap-[9px] rounded-[5px] px-[2px] py-[3px] text-left hover:bg-[#faf9f6]">
                            {(() => { const I = testIcon(t.name); return <I className="size-[15px] shrink-0 text-[#3e4440]" strokeWidth={1.6} />; })()}
                            <span className="min-w-0 flex-1 truncate text-[11px]">{t.name}</span>
                            <TestBadge status={t.status} />
                          </button>
                        }
                      />
                    </li>
                  ))}
                </ul>
              ) : <Empty>Select a batch.</Empty>}
            </section>
          </div>

          {/* column 3: batch details */}
          <section className="cs-card min-w-0 px-[12px] pb-[10px] pt-[11px]">
            <T right={batch && <button type="button" aria-label="Close batch details" onClick={() => setClosed(true)} className="-mt-[2px] grid size-[20px] place-items-center rounded-[5px] hover:bg-[#f1f0ec]"><X className="size-[15px]" /></button>}>Batch Details</T>
            {!batch ? (
              <div className="py-[30px] text-center text-[12.5px] text-cs-ink-2">
                Select a batch from the list to review its tests and approve it.
                <div className="mt-[10px]"><Btn className="h-[32px] text-[12px]" onClick={() => { setClosed(false); }}>Show first batch</Btn></div>
              </div>
            ) : (
              <>
                <div className="mt-[6px] flex gap-[11px]">
                  <Image src={batch.img} alt="" width={180} height={150} className="h-[73px] w-[86px] shrink-0 rounded-[6px] object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-[6px]"><p className="serif whitespace-nowrap text-[15.5px] font-semibold leading-tight">{batch.id}</p><Pill tone={QB_TONE[batch.status]} className="px-[7px] py-[1px] text-[10.5px]">{batch.status}</Pill></div>
                    <p className="mt-[3px] text-[11.5px] text-cs-ink-2">{batch.sampleRef}</p>
                    <p className="text-[12px] font-medium">{batch.name}</p>
                  </div>
                </div>
                <dl className="mt-[6px] text-[11px]">
                  {([
                    ["Manufacturer", <Link key="m" href={`/console/manufacturers?id=${batch.mfrId}`} className="hover:text-cs-green">{mfr(batch.mfrId)?.name}</Link>],
                    ["Manufacturing Date", fmtDate(batch.mfgDate)],
                    ["Batch Size", `${fmtNum(batch.size)} units`],
                    ["Product Category", batch.category],
                    ["Target Market", batch.market],
                    ["Expected Release", fmtDate(batch.release)],
                  ] as [string, React.ReactNode][]).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[116px_1fr] py-[2px] text-[10.5px] leading-[16px]"><dt className="text-[#3e4440]">{k}</dt><dd className="min-w-0 truncate">{v}</dd></div>
                  ))}
                </dl>

                <div className="mt-[5px] rounded-[8px] border border-cs-line px-[10px] py-[7px]">
                  <div className="flex items-center justify-between"><p className="serif text-[15px] font-semibold">Quality Status</p><Pill tone={QB_TONE[batch.status]} className="px-[7px] py-[1px] text-[10.5px]">{batch.status}</Pill></div>
                  <p className="mt-[4px] flex items-center gap-[6px] text-[11px]"><ShieldCheck className="size-[15px] text-cs-blue" strokeWidth={1.7} />{testsDone} of {batch.tests.length} tests completed</p>
                  <div className="mt-[4px] flex items-center gap-[8px]">
                    <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[#e9e7e1]"><div className="h-full rounded-full bg-cs-green-2" style={{ width: `${testPct}%` }} /></div>
                    <span className="text-[11px]">{testPct}%</span>
                  </div>
                </div>

                <div className="mt-[6px]">
                  <div className="flex items-center justify-between"><p className="serif text-[15px] font-semibold">Quality Checklist</p><span className="text-[12px] font-medium">{checksDone} / {batch.checklist.length}</span></div>
                  <ul className="mt-[3px]">
                    {batch.checklist.map((c) => (
                      <li key={c.label}>
                        <button
                          type="button"
                          title="Click to change status"
                          onClick={() => mod(batch.id, (x, d) => { const it = x.checklist.find((y) => y.label === c.label); if (it) { it.status = NEXT_CHECK[it.status]; log(d, { text: `${x.id} checklist: ${c.label} → ${it.status}`, tag: "Quality", href: `/console/quality?id=${x.id}` }); } })}
                          className="flex w-full items-center gap-[7px] rounded-[4px] py-[2px] text-left hover:bg-[#faf9f6]"
                        >
                          {c.status === "Completed"
                            ? <span className="grid size-[15px] shrink-0 place-items-center rounded-full bg-cs-green-2 text-white"><CheckIcon className="size-[9px]" strokeWidth={3} /></span>
                            : <span className={cn("size-[15px] shrink-0 rounded-full border-2", c.status === "In Progress" ? "border-cs-blue" : "border-cs-amber")} />}
                          <span className="min-w-0 flex-1 truncate text-[10.5px] tracking-[-0.01em]">{c.label}</span>
                          <span className={cn("rounded-[4px] px-[7px] py-[0px] text-[10px] font-medium leading-[16px]", CHECK_PILL[c.status])}>{c.status}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-[6px] border-t border-cs-line pt-[6px]">
                  <div className="flex items-center justify-between"><p className="serif text-[15px] font-semibold">Reviewer Notes</p><ViewAllBtn onClick={() => { setNote(""); setModal("notes"); }} /></div>
                  {batch.notes.length === 0 ? (
                    <button type="button" onClick={() => { setNote(""); setModal("notes"); }} className="mt-[6px] text-[11.5px] font-medium text-cs-green hover:underline">+ Add the first note</button>
                  ) : (
                    <div className="mt-[6px] flex gap-[8px]">
                      <Avatar name={batch.notes[0].who} size={30} />
                      <div className="min-w-0">
                        <p className="text-[11.5px] font-semibold">{batch.notes[0].who}</p>
                        <p className="text-[10.5px] text-cs-ink-2">{fmtDateTime(batch.notes[0].at)}</p>
                        <p className="mt-[2px] line-clamp-2 text-[11px] leading-[1.4] text-[#3e4440]">{batch.notes[0].text}</p>
                      </div>
                    </div>
                  )}
                </div>

                {batch.status === "Passed" ? (
                  <div className="mt-[12px] rounded-[8px] bg-cs-mint px-[12px] py-[10px] text-[12px] text-cs-green">
                    <p className="flex items-center gap-[6px] font-semibold"><CheckCircle2 className="size-[15px]" />Approved for release</p>
                    {batch.shipmentId && <Link href={`/console/shipments?id=${batch.shipmentId}`} className="mt-[3px] block underline">View shipment {batch.shipmentId}</Link>}
                  </div>
                ) : (
                  <Btn kind="primary" icon={CheckIcon} className="mt-[9px] !h-[35px] w-full" onClick={approve}>Approve Batch</Btn>
                )}
                <div className="mt-[7px] grid grid-cols-2 gap-[8px]">
                  <Btn icon={RotateCcw} className="!h-[35px] !gap-[6px] !px-[6px] !text-[11.5px]" onClick={() => { setReason(""); setModal("retest"); }}>Request Re-Test</Btn>
                  <Btn kind="danger" icon={AlertTriangle} className="!h-[35px] !gap-[6px] !px-[6px] !text-[11.5px]" onClick={() => { setIssue({ title: "", level: "Medium", detail: "" }); setModal("issue"); }}>Raise Issue</Btn>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* modals */}
      <Modal open={modal === "retest" && !!batch} onClose={() => setModal(null)} title={`Request re-test · ${batch?.id}`} sub="Pending tests and checks go back to the lab."
        footer={<><Btn onClick={() => setModal(null)}>Cancel</Btn><Btn kind="primary" icon={RotateCcw} disabled={!reason.trim()} onClick={() => { if (!batch) return; const r = reason.trim(); update((d) => retestBatch(d, batch.id, r)); setModal(null); toast(`Re-test requested for ${batch.id}`); }}>Request re-test</Btn></>}>
        <Field label="Reason"><textarea autoFocus rows={3} className={textareaCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Microbial count close to limit; repeat with fresh sample." /></Field>
      </Modal>

      <Modal open={modal === "issue" && !!batch} onClose={() => setModal(null)} title={`Raise issue · ${batch?.id}`} sub={batch?.name}
        footer={<><Btn onClick={() => setModal(null)}>Cancel</Btn><Btn kind="danger" icon={AlertTriangle} disabled={!issue.title.trim()} onClick={() => { if (!batch) return; const x = issue; update((d) => raiseIssue(d, batch.id, x.title.trim(), x.level, x.detail.trim() || "—")); setModal(null); toast("Issue raised", "bad"); }}>Raise issue</Btn></>}>
        <div className="space-y-[12px]">
          <Field label="Title"><input autoFocus className={inputCls} value={issue.title} onChange={(e) => setIssue({ ...issue, title: e.target.value })} placeholder="e.g. Assay below label claim" /></Field>
          <Field label="Severity"><div className="flex gap-[6px]">{(["High", "Medium", "Low"] as const).map((l) => <button key={l} type="button" onClick={() => setIssue({ ...issue, level: l })} className={cn("rounded-[6px] border px-[12px] py-[6px] text-[12.5px]", issue.level === l ? "border-cs-green bg-cs-mint text-cs-green" : "border-cs-line")}>{l}</button>)}</div></Field>
          <Field label="Details"><textarea rows={3} className={textareaCls} value={issue.detail} onChange={(e) => setIssue({ ...issue, detail: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal open={modal === "notes" && !!batch} onClose={() => setModal(null)} title={`Reviewer notes · ${batch?.id}`} width={560}
        footer={<><Btn onClick={() => setModal(null)}>Close</Btn><Btn kind="primary" disabled={!note.trim()} onClick={() => { if (!batch) return; const t = note.trim(); mod(batch.id, (x, d) => { x.notes.unshift({ at: new Date().toISOString(), who: d.user.name, text: t }); log(d, { text: `Added reviewer note on ${x.id}`, tag: "Quality", href: `/console/quality?id=${x.id}` }); }); setNote(""); toast("Note added"); }}>Add note</Btn></>}>
        <textarea aria-label="New note" rows={2} className={textareaCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a reviewer note…" />
        <ul className="mt-[12px] max-h-[45dvh] space-y-[12px] overflow-y-auto">
          {batch?.notes.length === 0 && <Empty>No notes yet.</Empty>}
          {batch?.notes.map((n, i) => (
            <li key={i} className="flex gap-[10px]"><Avatar name={n.who} size={32} /><div><p className="text-[12.5px] font-semibold">{n.who} <span className="ml-[4px] text-[11px] font-normal text-cs-ink-2">{fmtDateTime(n.at)}</span></p><p className="text-[12.5px] text-[#3e4440]">{n.text}</p></div></li>
          ))}
        </ul>
      </Modal>

      <Modal open={modal === "issues"} onClose={() => setModal(null)} title="Quality issues" sub={`${issuesOpen.length} open · ${s.issues.length - issuesOpen.length} resolved`} width={620}>
        <ul className="space-y-[8px]">
          {s.issues.length === 0 && <Empty>No issues recorded.</Empty>}
          {s.issues.map((i) => (
            <li key={i.id} className={cn("flex items-start gap-[10px] rounded-[8px] border border-cs-line p-[10px]", i.resolved && "opacity-60")}>
              <div className="flex-1">
                <p className="flex items-center gap-[8px] text-[13px] font-semibold">{i.title}<Pill tone={i.resolved ? "gray" : i.level === "High" ? "red" : i.level === "Medium" ? "orange" : "gray"}>{i.resolved ? "Resolved" : i.level}</Pill></p>
                <p className="mt-[2px] text-[12px] text-cs-ink-2">{i.ref} · {i.detail} · {ago(i.at)}</p>
              </div>
              <button type="button" onClick={() => update((d) => { const x = d.issues.find((y) => y.id === i.id); if (x) { x.resolved = !x.resolved; log(d, { text: `${x.resolved ? "Resolved" : "Reopened"} quality issue: ${x.title}`, tag: "Quality", href: "/console/quality" }); } })} className="text-[12px] font-medium text-cs-green hover:underline">{i.resolved ? "Reopen" : "Mark resolved"}</button>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal open={modal === "tests" && !!batch} onClose={() => setModal(null)} title={`Testing results · ${batch?.id}`} sub={batch?.name} width={600}>
        <table className="w-full text-[12.5px]">
          <tbody>
            {batch?.tests.map((t) => (
              <tr key={t.name} className="border-b border-[#f1efea]">
                <td className="py-[8px]">{t.name}</td>
                <td><TestBadge status={t.status} /></td>
                <td className="text-right">
                  <div className="inline-flex gap-[4px]">{(["Pass", "Fail", "In Progress", "Pending"] as const).map((st) => <button key={st} type="button" onClick={() => setTest(t.name, st)} className={cn("rounded-[5px] border px-[7px] py-[2px] text-[11px]", t.status === st ? "border-cs-green bg-cs-mint text-cs-green" : "border-cs-line")}>{st}</button>)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>

      <Modal open={modal === "batches"} onClose={() => setModal(null)} title="All quality batches" sub={`${s.quality.length} batches`} width={680}>
        <ul className="max-h-[55dvh] divide-y divide-cs-line overflow-y-auto">
          {s.quality.map((x) => (
            <li key={x.id}><button type="button" onClick={() => { select(x.id); setModal(null); }} className="flex w-full items-center gap-[10px] py-[9px] text-left hover:bg-[#f7f6f2]">
              <Image src={x.img} alt="" width={64} height={64} className="size-[36px] rounded-[6px] object-cover" />
              <span className="flex-1"><b className="text-[13px] font-semibold">{x.id}</b> <span className="text-[12.5px]">{x.name}</span><span className="block text-[11.5px] text-cs-ink-2">{mfr(x.mfrId)?.name} · updated {ago(x.updatedAt)}</span></span>
              <Pill tone={QB_TONE[x.status]}>{x.status}</Pill>
            </button></li>
          ))}
        </ul>
      </Modal>

      <Modal open={modal === "docs"} onClose={() => setModal(null)} title="Compliance documents" width={560}>
        <ul className="divide-y divide-cs-line">
          {s.compliance.map((c) => (
            <li key={c.name}><button type="button" onClick={() => { setModal(null); setDoc(c.name); }} className="flex w-full items-center gap-[10px] py-[9px] text-left hover:bg-[#f7f6f2]">
              <FileText className="size-[18px] text-[#3e4440]" strokeWidth={1.6} /><span className="flex-1 text-[13px]">{c.name}<span className="block text-[11.5px] text-cs-ink-2">Valid until {fmtDate(validUntil(c.name))}</span></span>
              <Pill tone={c.status === "Valid" ? "green" : c.status === "Expiring" ? "orange" : "red"}>{c.status}</Pill>
            </button></li>
          ))}
        </ul>
      </Modal>

      <Modal open={!!docObj} onClose={() => setDoc(null)} title={docObj?.name ?? ""} sub="Compliance document on file"
        footer={docObj && <>
          <Btn icon={Download} onClick={() => download(`${docObj.name.replace(/\s/g, "_")}.txt`, `${docObj.name}\nStatus: ${docObj.status}\nValid until: ${fmtDate(validUntil(docObj.name))}\nWorkspace: ${s.workspace}\n`, "text/plain")}>Download</Btn>
          {docObj.status === "Valid"
            ? <Btn kind="danger" onClick={() => { const n = docObj.name; update((d) => { const c = d.compliance.find((x) => x.name === n); if (c) c.status = "Expiring"; log(d, { text: `Flagged ${n} certificate as expiring`, tag: "Quality", href: "/console/quality" }); }); toast(`${n} flagged as expiring`); }}>Flag as expiring</Btn>
            : <Btn kind="primary" onClick={() => { const n = docObj.name; update((d) => { const c = d.compliance.find((x) => x.name === n); if (c) c.status = "Valid"; log(d, { text: `Renewed ${n} certificate`, tag: "Quality", href: "/console/quality" }); }); toast(`${n} marked renewed`); }}>Mark renewed</Btn>}
        </>}>
        {docObj && (
          <dl className="space-y-[8px] text-[13px]">
            <div className="flex justify-between"><dt className="text-cs-ink-2">Status</dt><dd><Pill tone={docObj.status === "Valid" ? "green" : docObj.status === "Expiring" ? "orange" : "red"}>{docObj.status}</Pill></dd></div>
            <div className="flex justify-between"><dt className="text-cs-ink-2">Valid until</dt><dd>{fmtDate(validUntil(docObj.name))}</dd></div>
            <div className="flex justify-between"><dt className="text-cs-ink-2">Applies to</dt><dd>{s.quality.length} batches across {new Set(s.quality.map((x) => x.mfrId)).size} manufacturers</dd></div>
          </dl>
        )}
      </Modal>
    </div>
  );
}

function Header() {
  return (
    <WideHero
      eyebrow={<Crumbs items={["Quality", "Quality & Compliance"]} />}
      title="Quality & Compliance"
      lede="Monitor quality checks, compliance documents, and issue resolution across production. Ensure every product meets global standards and your brand's quality expectations."
      img="/console/hero-quality.jpg"
      photo={61}
      height={195}
      ledeWidth={445}
      ledeSize={17}
      ledeGap={7}
      quote={["Trusted", "quality.", "Compliant", "to global", "standards."]}
      quoteTop={29}
      quoteWidth={150}
    />
  );
}

export default function QualityPage() {
  return (
    <Suspense fallback={<Header />}>
      <QualityInner />
    </Suspense>
  );
}
