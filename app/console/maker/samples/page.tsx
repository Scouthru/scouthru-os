"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, FlaskConical, Paperclip, Send, Timer, Truck, Upload, XCircle } from "lucide-react";
import { Btn, Empty, Field, Modal, Pill, RowMenu, SearchBox, StatStrip, Tabs, inputCls, textareaCls } from "@/components/console/kit";
import { Avatar, WideHero } from "@/components/console/making";
import { KV, MAKER_SAMPLE_TONE, Page, Panel, Split, tdc, thc } from "@/components/console/maker";
import { useConsole } from "@/lib/console/store";
import { attachToSample, dispatchSample, replyOnSample } from "@/lib/console/actions-network";
import { mine } from "@/lib/console/actions-maker";
import { ago, download, fmtDate, fmtNum } from "@/lib/console/format";
import type { Sample, SampleStatus } from "@/lib/console/types";
import { cn } from "@/lib/cn";

type Tab = "make" | "sent" | "changes" | "approved" | "rejected";
const IN_TAB: Record<Tab, SampleStatus[]> = { make: ["Submitted", "Draft"], sent: ["In Review", "Testing", "Feedback"], changes: ["Changes Requested"], approved: ["Approved"], rejected: ["Rejected"] };
const COURIERS = ["BlueDart", "DTDC", "Delhivery", "Professional Couriers", "Hand delivery"];

export default function MakerSamplesPage() {
  return <Suspense><MakerSamples /></Suspense>;
}

function MakerSamples() {
  const { s } = useConsole();
  const params = useSearchParams();
  const samples = useMemo(() => mine(s).samples, [s]);
  const [tab, setTab] = useState<Tab>("make");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [sendFor, setSendFor] = useState<Sample | null>(null);

  useEffect(() => {
    const id = params.get("id");
    const x = id ? samples.find((y) => y.id === id) : undefined;
    if (x) { setSel(x.id); setTab((Object.keys(IN_TAB) as Tab[]).find((t) => IN_TAB[t].includes(x.status)) ?? "make"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const count = (t: Tab) => samples.filter((x) => IN_TAB[t].includes(x.status)).length;
  const list = samples.filter((x) => IN_TAB[tab].includes(x.status) && (!q.trim() || `${x.name} ${x.id}`.toLowerCase().includes(q.trim().toLowerCase())));
  const current = samples.find((x) => x.id === sel) ?? list[0] ?? null;
  const approved = samples.filter((x) => x.status === "Approved").length;
  const decided = samples.filter((x) => x.status === "Approved" || x.status === "Rejected").length;

  return (
    <div>
      <WideHero eyebrow="MAKE · SEND · GET APPROVED" title="Samples" lede="Make the samples brands ask for, send them with your COA and spec sheet, and answer feedback in one thread." img="/console/hero-samples.jpg" photo={46} height={146} ledeWidth={620} ledeGap={7} />
      <Page>
        <StatStrip items={[
          { icon: FlaskConical, tone: "orange", value: count("make"), label: "Samples to Make", delta: "Requested by brands", deltaTone: "muted" },
          { icon: Truck, tone: "blue", value: count("sent"), label: "With the Brand", delta: "In review or testing", deltaTone: "muted" },
          { icon: Timer, tone: "red", value: count("changes"), label: "Changes Requested", delta: "Revise and resend", deltaTone: count("changes") ? "bad" : "muted" },
          { icon: CheckCircle2, tone: "green", value: approved, label: "Approved", delta: decided ? `${Math.round((approved / decided) * 100)}% approval rate` : "No decisions yet" },
          { icon: XCircle, tone: "gray", value: count("rejected"), label: "Rejected", delta: "Closed samples", deltaTone: "muted" },
        ]} />
        <Split side="1.1fr" hero={146}>
          <Panel>
            <div className="px-[15px] pt-[12px]">
              <Tabs<Tab> value={tab} onChange={(t) => { setTab(t); setSel(null); }} tabs={[
                { key: "make", label: `To Make (${count("make")})` }, { key: "sent", label: `Sent (${count("sent")})` }, { key: "changes", label: `Changes Requested (${count("changes")})` },
                { key: "approved", label: `Approved (${count("approved")})` }, { key: "rejected", label: `Rejected (${count("rejected")})` },
              ]} />
              <SearchBox value={q} onChange={setQ} placeholder="Search sample or product..." className="mt-[12px] w-full min-[1024px]:w-[300px]" />
            </div>
            <div className="mt-[10px] overflow-x-auto px-[7px]">
              <table className="w-full min-w-[560px] border-separate border-spacing-0">
                <thead><tr><th className={thc}>Sample</th><th className={thc}>Quantity</th><th className={thc}>Requested</th><th className={thc}>Status</th><th className={thc}><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {list.map((x) => {
                    const on = current?.id === x.id;
                    return (
                      <tr key={x.id} onClick={() => setSel(x.id)} className={cn("cursor-pointer", on ? "bg-cs-mint/50" : "hover:bg-[#faf9f5]")}>
                        <td className={cn(tdc, on && "border-l-2 border-l-cs-green")}>
                          <div className="flex items-center gap-[10px]">
                            <Image src={x.img} alt="" width={36} height={36} className="size-[36px] rounded-[6px] object-cover" />
                            <div className="min-w-0"><p className="truncate font-medium">{x.name}</p><p className="text-[11px] text-cs-ink-2">{x.id} · Rev. {String(x.rev).padStart(2, "0")}</p></div>
                          </div>
                        </td>
                        <td className={tdc}>{fmtNum(x.qty)} <span className="text-[11px] text-cs-ink-2">{x.unit}</span></td>
                        <td className={tdc}>{fmtDate(x.requestedAt)}<span className="block text-[11px] text-cs-ink-2">{ago(x.requestedAt)}</span></td>
                        <td className={tdc}><Pill tone={MAKER_SAMPLE_TONE[x.status]}>{x.status}</Pill></td>
                        <td className={cn(tdc, "w-[34px]")}>
                          <RowMenu items={[
                            { label: "Open", onClick: () => setSel(x.id) },
                            ...(x.status === "Submitted" || x.status === "Changes Requested" ? [{ label: x.status === "Submitted" ? "Mark dispatched" : "Send revised sample", icon: Truck, onClick: () => setSendFor(x) }] : []),
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {list.length === 0 && <Empty>No samples here.</Empty>}
            </div>
          </Panel>
          {current ? <SampleDetail x={current} onSend={() => setSendFor(current)} /> : <Panel><Empty>Pick a sample to see the brand&apos;s spec and feedback.</Empty></Panel>}
        </Split>
      </Page>
      {sendFor && <SendModal x={sendFor} onClose={() => setSendFor(null)} />}
    </div>
  );
}

const FILES = (id: string) => [`COA_${id}.pdf`, "Spec_Sheet.pdf", "Stability_Report.pdf", "MSDS.pdf", "Label_Proof.pdf"];

function SampleDetail({ x, onSend }: { x: Sample; onSend: () => void }) {
  const { s, update, toast } = useConsole();
  const [reply, setReply] = useState("");
  const [file, setFile] = useState("");
  const e = s.enquiries.find((y) => y.id === x.enquiryId);
  const canSend = x.status === "Submitted" || x.status === "Changes Requested";
  const files = FILES(x.id).filter((f) => !x.attachments.includes(f));
  return (
    <Panel bodyClass="px-[15px] pb-[14px] pt-[14px]">
      <div className="flex items-start gap-[12px]">
        <Image src={x.img} alt="" width={72} height={72} className="size-[64px] rounded-[8px] object-cover" />
        <div className="min-w-0">
          <h3 className="serif text-[19px] font-semibold leading-tight">{x.name}</h3>
          <p className="mt-[2px] text-[12px] text-cs-ink-2">{x.id} · Rev. {String(x.rev).padStart(2, "0")} · for {s.workspace}</p>
          <Pill tone={MAKER_SAMPLE_TONE[x.status]} className="mt-[6px]">{x.status}</Pill>
        </div>
      </div>
      <dl className="mt-[10px]">
        <KV k="Quantity" v={`${fmtNum(x.qty)} ${x.unit}`} />
        <KV k="Requested" v={`${fmtDate(x.requestedAt)} · lead time ${x.leadTime}`} />
        {e && <KV k="Enquiry" v={`${e.id} · MOQ ${fmtNum(e.moq)} · ${e.price}`} />}
        {x.specs.slice(0, 4).map(([k, v]) => <KV key={k} k={k} v={v} />)}
      </dl>

      <h4 className="serif mt-[12px] text-[16px] font-semibold">Files</h4>
      <ul className="mt-[4px] space-y-[4px]">
        {x.attachments.map((f) => (
          <li key={f}><button type="button" onClick={() => download(f.replace(/\.pdf$/, ".txt"), `${f}\n${x.name} · ${x.id}\nShared by ${s.people.maker.name}`, "text/plain")} className="flex items-center gap-[7px] text-[12px] text-cs-green hover:underline"><FileText className="size-[14px]" />{f}</button></li>
        ))}
      </ul>
      <div className="mt-[8px] flex gap-[8px]">
        <select className={cn(inputCls, "h-[34px] text-[12px]")} value={file} onChange={(ev) => setFile(ev.target.value)} aria-label="File to upload">
          <option value="">Choose a file to share…</option>
          {files.map((f) => <option key={f}>{f}</option>)}
        </select>
        <Btn icon={Upload} className="h-[34px] text-[12px]" disabled={!file} onClick={() => { update((d) => attachToSample(d, x.id, file)); toast(`${file} shared with the brand`); setFile(""); }}>Upload</Btn>
      </div>

      <h4 className="serif mt-[14px] text-[16px] font-semibold">Comments ({x.comments.length})</h4>
      <ul className="mt-[6px] space-y-[9px]">
        {x.comments.map((c, i) => (
          <li key={i} className="flex gap-[9px]">
            <Avatar name={c.who} size={28} />
            <div className="min-w-0 text-[12px]"><p><b>{c.who}</b> <span className="text-cs-ink-2">· {ago(c.at)}</span></p><p className="mt-[1px] leading-[1.45] text-[#3e4440]">{c.text}</p></div>
          </li>
        ))}
        {x.comments.length === 0 && <li className="text-[12px] text-cs-ink-2">No comments yet.</li>}
      </ul>
      <form className="mt-[8px] flex gap-[8px]" onSubmit={(ev) => { ev.preventDefault(); if (!reply.trim()) return; update((d) => replyOnSample(d, x.id, reply.trim())); setReply(""); toast("Reply sent to the brand"); }}>
        <input className={cn(inputCls, "h-[34px] text-[12px]")} value={reply} onChange={(ev) => setReply(ev.target.value)} placeholder="Reply to the brand…" aria-label="Reply" />
        <Btn type="submit" icon={Send} className="h-[34px] text-[12px]" disabled={!reply.trim()}>Send</Btn>
      </form>

      {canSend && <Btn kind="primary" icon={Truck} className="mt-[14px] w-full" onClick={onSend}>{x.status === "Submitted" ? "Mark dispatched" : "Send revised sample"}</Btn>}
      {x.status === "Approved" && <p className="mt-[14px] flex items-center gap-[7px] rounded-[8px] bg-cs-mint/60 px-[11px] py-[9px] text-[12.5px] text-cs-green"><CheckCircle2 className="size-[16px]" />Approved by the brand{x.orderId ? ` · order ${x.orderId}` : ""}.</p>}
    </Panel>
  );
}

function SendModal({ x, onClose }: { x: Sample; onClose: () => void }) {
  const { update, toast } = useConsole();
  const [courier, setCourier] = useState(COURIERS[0]);
  const [awb, setAwb] = useState("");
  const [note, setNote] = useState("");
  return (
    <Modal open onClose={onClose} title={x.status === "Submitted" ? "Mark sample dispatched" : "Send revised sample"} sub={`${x.name} · ${x.id} · ${fmtNum(x.qty)} ${x.unit}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={Truck} onClick={() => {
        update((d) => dispatchSample(d, x.id, [awb && `AWB ${awb}.`, note].filter(Boolean).join(" "), courier));
        toast(`${x.id} dispatched. The brand can start reviewing.`);
        onClose();
      }}>Dispatch</Btn></>}>
      <div className="space-y-[12px]">
        <div className="grid grid-cols-2 gap-[10px]">
          <Field label="Courier"><select className={inputCls} value={courier} onChange={(e) => setCourier(e.target.value)}>{COURIERS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="AWB / tracking no. (optional)"><input className={inputCls} value={awb} onChange={(e) => setAwb(e.target.value)} /></Field>
        </div>
        <Field label="Note to the brand"><textarea className={cn(textareaCls, "h-[70px]")} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. COA attached; stability data in 2 weeks." /></Field>
        <p className="flex items-center gap-[6px] text-[11.5px] text-cs-ink-2"><Paperclip className="size-[13px]" />Upload the COA from the Files section so the brand has it with the sample.</p>
      </div>
    </Modal>
  );
}
