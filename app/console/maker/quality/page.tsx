"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileCheck2, FlaskConical, Send, ShieldCheck } from "lucide-react";
import { Btn, Check, Empty, Pill, StatStrip, Tabs, inputCls, type Tone } from "@/components/console/kit";
import { Avatar, WideHero } from "@/components/console/making";
import { KV, Meter, Page, Panel, Split, tdc, thc } from "@/components/console/maker";
import { useConsole } from "@/lib/console/store";
import { submitLabResults } from "@/lib/console/actions-network";
import { mine, replyOnBatch } from "@/lib/console/actions-maker";
import { ago, fmtDate, fmtNum } from "@/lib/console/format";
import type { QualityBatch } from "@/lib/console/types";
import { cn } from "@/lib/cn";

const STATUS_TONE: Record<QualityBatch["status"], Tone> = { "In Testing": "blue", Passed: "green", "Issues Found": "red", "Re-test": "orange" };
type Tab = "testing" | "issues" | "passed" | "all";
const IN_TAB: Record<Tab, (q: QualityBatch) => boolean> = {
  testing: (q) => q.status === "In Testing" || q.status === "Re-test",
  issues: (q) => q.status === "Issues Found",
  passed: (q) => q.status === "Passed",
  all: () => true,
};

export default function MakerQualityPage() {
  return <Suspense><MakerQuality /></Suspense>;
}

function MakerQuality() {
  const { s } = useConsole();
  const params = useSearchParams();
  const batches = useMemo(() => mine(s).quality, [s]);
  const [tab, setTab] = useState<Tab>("testing");
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    const id = params.get("id");
    const b = id ? batches.find((x) => x.id === id) : undefined;
    if (b) { setSel(b.id); setTab("all"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  const list = batches.filter(IN_TAB[tab]);
  const cur = batches.find((x) => x.id === sel) ?? list[0] ?? null;
  const pending = batches.flatMap((b) => b.tests).filter((t) => t.status === "Pending" || t.status === "In Progress").length;
  const coa = batches.filter((b) => b.checklist.find((c) => c.label === "COA reviewed")?.status === "Completed").length;
  const count = (t: Tab) => batches.filter(IN_TAB[t]).length;

  return (
    <div>
      <WideHero eyebrow="TEST · SHARE · RELEASE" title="Quality & COA" lede="Share lab results and the COA for every batch. The brand reviews them and releases the batch for dispatch." img="/console/hero-quality.jpg" photo={61} height={195} ledeWidth={445} ledeSize={17} ledeGap={7} quote={["Trusted", "quality.", "Compliant", "to global", "standards."]} quoteTop={29} quoteWidth={150} />
      <Page>
        <StatStrip items={[
          { icon: FlaskConical, tone: "blue", value: count("testing"), label: "Batches in Testing", delta: "Waiting on results", deltaTone: "muted" },
          { icon: ClipboardCheck, tone: "orange", value: pending, label: "Tests Pending", delta: "Across all batches", deltaTone: "muted" },
          { icon: AlertTriangle, tone: "red", value: count("issues"), label: "Issues Found", delta: "Raised by the brand", deltaTone: count("issues") ? "bad" : "muted" },
          { icon: ShieldCheck, tone: "green", value: count("passed"), label: "Released", delta: "Ready to ship" },
          { icon: FileCheck2, tone: "green", value: coa, label: "COAs Shared", delta: `of ${batches.length} batches`, deltaTone: "muted" },
        ]} />
        <Split side="1.1fr" hero={195}>
          <Panel>
            <div className="px-[15px] pt-[12px]">
              <Tabs<Tab> value={tab} onChange={(t) => { setTab(t); setSel(null); }} tabs={[
                { key: "testing", label: `In Testing (${count("testing")})` }, { key: "issues", label: `Issues Found (${count("issues")})` }, { key: "passed", label: `Released (${count("passed")})` }, { key: "all", label: `All (${batches.length})` },
              ]} />
            </div>
            <div className="mt-[10px] overflow-x-auto px-[7px]">
              <table className="w-full min-w-[540px] border-separate border-spacing-0">
                <thead><tr><th className={thc}>Batch</th><th className={thc}>Order</th><th className={thc}>Tests</th><th className={thc}>Status</th><th className={thc}>Updated</th></tr></thead>
                <tbody>
                  {list.map((b) => {
                    const passed = b.tests.filter((t) => t.status === "Pass").length;
                    const on = cur?.id === b.id;
                    return (
                      <tr key={b.id} onClick={() => setSel(b.id)} className={cn("cursor-pointer", on ? "bg-cs-mint/50" : "hover:bg-[#faf9f5]")}>
                        <td className={cn(tdc, on && "border-l-2 border-l-cs-green")}>
                          <div className="flex items-center gap-[10px]">
                            <Image src={b.img} alt="" width={36} height={36} className="size-[36px] rounded-[6px] object-cover" />
                            <div className="min-w-0"><p className="font-medium">{b.id}</p><p className="truncate text-[11px] text-cs-ink-2">{b.name}</p></div>
                          </div>
                        </td>
                        <td className={tdc}>{b.orderId ?? "—"}</td>
                        <td className={cn(tdc, "w-[120px]")}>{passed}/{b.tests.length}<Meter value={(passed / b.tests.length) * 100} className="mt-[4px] h-[5px]" /></td>
                        <td className={tdc}><Pill tone={STATUS_TONE[b.status]}>{b.status}</Pill></td>
                        <td className={tdc}>{ago(b.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {list.length === 0 && <Empty>No batches here.</Empty>}
            </div>
          </Panel>
          {cur ? <BatchPanel key={cur.id} b={cur} /> : <Panel><Empty>Batches appear here when you complete them on the Production screen.</Empty></Panel>}
        </Split>
      </Page>
    </div>
  );
}

function BatchPanel({ b }: { b: QualityBatch }) {
  const { update, toast } = useConsole();
  const [draft, setDraft] = useState<Record<string, "Pass" | "Fail" | "">>(() => Object.fromEntries(b.tests.map((t) => [t.name, t.status === "Pass" || t.status === "Fail" ? t.status : ""])));
  const coaDone = b.checklist.find((c) => c.label === "COA reviewed")?.status === "Completed";
  const [coa, setCoa] = useState(coaDone);
  const [reply, setReply] = useState("");
  const changed = b.tests.some((t) => (draft[t.name] || "") !== (t.status === "Pass" || t.status === "Fail" ? t.status : "")) || coa !== coaDone;
  const locked = b.status === "Passed";

  return (
    <Panel bodyClass="px-[15px] pb-[14px] pt-[14px]">
      <div className="flex items-start gap-[12px]">
        <Image src={b.img} alt="" width={72} height={72} className="size-[60px] rounded-[8px] object-cover" />
        <div className="min-w-0">
          <h3 className="serif text-[19px] font-semibold leading-tight">{b.id}</h3>
          <p className="mt-[2px] text-[12px] text-cs-ink-2">{b.name} · {b.sampleRef}</p>
          <Pill tone={STATUS_TONE[b.status]} className="mt-[6px]">{b.status === "Passed" ? "Released by the brand" : b.status}</Pill>
        </div>
      </div>
      <dl className="mt-[10px]">
        <KV k="Batch size" v={`${fmtNum(b.size)} units`} />
        <KV k="Manufactured" v={fmtDate(b.mfgDate)} />
        <KV k="Target release" v={fmtDate(b.release)} />
        {b.shipmentId && <KV k="Shipment" v={b.shipmentId} />}
      </dl>

      <h4 className="serif mt-[12px] text-[16px] font-semibold">Lab results</h4>
      <ul className="mt-[4px] divide-y divide-[#f1efea]">
        {b.tests.map((t) => (
          <li key={t.name} className="flex items-center justify-between gap-2 py-[5px] text-[12px]">
            <span className="min-w-0 truncate">{t.name}</span>
            <div className="flex gap-[4px]" role="group" aria-label={t.name}>
              {(["Pass", "Fail"] as const).map((v) => (
                <button key={v} type="button" disabled={locked} onClick={() => setDraft({ ...draft, [t.name]: draft[t.name] === v ? "" : v })}
                  className={cn("h-[24px] rounded-[5px] border px-[9px] text-[11px] font-medium disabled:opacity-60", draft[t.name] === v ? (v === "Pass" ? "border-cs-green bg-cs-green text-white" : "border-cs-red bg-cs-red text-white") : "border-cs-line bg-white text-[#3e4440]")}>{v}</button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <label className="mt-[8px] flex items-center gap-[8px] text-[12.5px]"><Check checked={coa} onChange={(v) => !locked && setCoa(v)} label="COA attached" /> Attach the Certificate of Analysis (COA)</label>
      {!locked && (
        <Btn kind="primary" icon={Send} className="mt-[10px] w-full" disabled={!changed} onClick={() => {
          const results = Object.fromEntries(Object.entries(draft).filter(([, v]) => v)) as Record<string, "Pass" | "Fail">;
          update((d) => submitLabResults(d, b.id, results, coa));
          toast(`Results for ${b.id} shared with the brand`);
        }}>Share results with the brand</Btn>
      )}

      <h4 className="serif mt-[14px] text-[16px] font-semibold">Brand checklist</h4>
      <ul className="mt-[4px] space-y-[3px] text-[12px]">
        {b.checklist.map((c) => (
          <li key={c.label} className="flex items-center justify-between"><span className="flex items-center gap-[6px]"><CheckCircle2 className={cn("size-[14px]", c.status === "Completed" ? "text-cs-green-2" : "text-[#c9ccc7]")} />{c.label}</span><span className="text-[11px] text-cs-ink-2">{c.status}</span></li>
        ))}
      </ul>

      <h4 className="serif mt-[14px] text-[16px] font-semibold">Notes ({b.notes.length})</h4>
      <ul className="mt-[6px] space-y-[8px]">
        {b.notes.map((n, i) => (
          <li key={i} className="flex gap-[9px]"><Avatar name={n.who} size={26} /><div className="min-w-0 text-[12px]"><p><b>{n.who}</b> <span className="text-cs-ink-2">· {ago(n.at)}</span></p><p className="text-[#3e4440]">{n.text}</p></div></li>
        ))}
        {b.notes.length === 0 && <li className="text-[12px] text-cs-ink-2">No notes yet.</li>}
      </ul>
      <form className="mt-[8px] flex gap-[8px]" onSubmit={(e) => { e.preventDefault(); if (!reply.trim()) return; update((d) => replyOnBatch(d, b.id, reply.trim())); setReply(""); toast("Note sent to the brand"); }}>
        <input className={cn(inputCls, "h-[34px] text-[12px]")} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to the brand's QC team…" aria-label="Reply" />
        <Btn type="submit" icon={Send} className="h-[34px] text-[12px]" disabled={!reply.trim()}>Send</Btn>
      </form>
    </Panel>
  );
}
