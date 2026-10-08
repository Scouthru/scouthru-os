"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Box, CheckCircle2, ClipboardCheck, Download, MapPin, PackageCheck, Send, Truck } from "lucide-react";
import { Btn, Empty, Field, Hero, Modal, Pill, RowMenu, StatStrip, Stepper, Tabs, inputCls, type Tone } from "@/components/console/kit";
import { Carrier } from "@/components/console/ops";
import { KV, Page, Panel, Split, tdc, thc } from "@/components/console/maker";
import { useConsole } from "@/lib/console/store";
import { dispatchShipment } from "@/lib/console/actions-network";
import { mine } from "@/lib/console/actions-maker";
import { ago, download, fmtDate, fmtDateTime, fmtDay, fmtNum, inr } from "@/lib/console/format";
import { SHIP_STEPS, type Shipment, type ShipStatus } from "@/lib/console/types";
import { cn } from "@/lib/cn";

const TONE: Record<ShipStatus, Tone> = { Pending: "orange", "In Transit": "blue", Delayed: "red", Delivered: "green" };
type Tab = "ready" | "transit" | "delivered";
const IN_TAB: Record<Tab, ShipStatus[]> = { ready: ["Pending"], transit: ["In Transit", "Delayed"], delivered: ["Delivered"] };
const CARRIERS = ["BlueDart Freight", "DHL", "Delhivery", "FedEx"];

export default function MakerDispatchPage() {
  return <Suspense><MakerDispatch /></Suspense>;
}

function MakerDispatch() {
  const { s } = useConsole();
  const params = useSearchParams();
  const ships = useMemo(() => mine(s).shipments, [s]);
  const [tab, setTab] = useState<Tab>("ready");
  const [sel, setSel] = useState<string | null>(null);
  const [handFor, setHandFor] = useState<Shipment | null>(null);
  useEffect(() => {
    const id = params.get("id");
    const x = id ? ships.find((y) => y.id === id) : undefined;
    if (x) { setSel(x.id); setTab((Object.keys(IN_TAB) as Tab[]).find((t) => IN_TAB[t].includes(x.status)) ?? "ready"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  const count = (t: Tab) => ships.filter((x) => IN_TAB[t].includes(x.status)).length;
  const list = ships.filter((x) => IN_TAB[tab].includes(x.status));
  const cur = ships.find((x) => x.id === sel) ?? list[0] ?? null;
  const shippedUnits = ships.filter((x) => x.status !== "Pending").reduce((a, x) => a + x.qty, 0);

  return (
    <div>
      <Hero eyebrow="PACK · HAND OVER · TRACK" title="Dispatch" lede={<>Released batches ready to ship, handed to the carrier and tracked to the brand&apos;s<br />warehouse. Documents go with every shipment.</>} img="/console/hero-shipments.jpg" height={142} quoteTop={32} quoteWidth={192} quote={["Every shipment.", "Visible.", "On time."]} />
      <Page>
        <StatStrip items={[
          { icon: Box, tone: "orange", value: count("ready"), label: "Ready to Dispatch", delta: "Released by QC", deltaTone: "muted" },
          { icon: Truck, tone: "blue", value: ships.filter((x) => x.status === "In Transit").length, label: "In Transit", delta: "With the carrier", deltaTone: "muted" },
          { icon: AlertTriangle, tone: "red", value: ships.filter((x) => x.status === "Delayed").length, label: "Delayed", delta: "Check with the carrier", deltaTone: ships.some((x) => x.status === "Delayed") ? "bad" : "muted" },
          { icon: PackageCheck, tone: "green", value: count("delivered"), label: "Delivered", delta: "To the brand" },
          { icon: ClipboardCheck, tone: "violet", value: fmtNum(shippedUnits), label: "Units Shipped", delta: "All shipments", deltaTone: "muted" },
        ]} />
        <Split side="1fr" hero={142}>
          <Panel>
            <div className="px-[15px] pt-[12px]">
              <Tabs<Tab> value={tab} onChange={(t) => { setTab(t); setSel(null); }} tabs={[{ key: "ready", label: `Ready to Dispatch (${count("ready")})` }, { key: "transit", label: `In Transit (${count("transit")})` }, { key: "delivered", label: `Delivered (${count("delivered")})` }]} />
            </div>
            <div className="mt-[10px] overflow-x-auto px-[7px]">
              <table className="w-full min-w-[600px] border-separate border-spacing-0">
                <thead><tr><th className={thc}>Shipment</th><th className={thc}>Quantity</th><th className={thc}>Carrier</th><th className={thc}>Destination</th><th className={thc}>ETA</th><th className={thc}>Status</th><th className={thc}><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {list.map((x) => {
                    const on = cur?.id === x.id;
                    return (
                      <tr key={x.id} onClick={() => setSel(x.id)} className={cn("cursor-pointer", on ? "bg-cs-mint/50" : "hover:bg-[#faf9f5]")}>
                        <td className={cn(tdc, on && "border-l-2 border-l-cs-green")}>
                          <div className="flex items-center gap-[10px]"><Image src={x.img} alt="" width={36} height={36} className="size-[36px] rounded-[6px] object-cover" /><div className="min-w-0"><p className="font-medium">{x.id}</p><p className="truncate text-[11px] text-cs-ink-2">{x.name}</p></div></div>
                        </td>
                        <td className={tdc}>{fmtNum(x.qty)}</td>
                        <td className={tdc}>{x.status === "Pending" ? <span className="text-[11.5px] text-cs-ink-2">Not booked</span> : <Carrier name={x.carrier} />}</td>
                        <td className={tdc}>{x.destination}</td>
                        <td className={tdc}>{fmtDay(x.eta)}</td>
                        <td className={tdc}><Pill tone={TONE[x.status]}>{x.status}</Pill></td>
                        <td className={cn(tdc, "w-[34px]")}><RowMenu items={[{ label: "Open", onClick: () => setSel(x.id) }, { label: "Hand to carrier", icon: Send, onClick: () => setHandFor(x), disabled: x.status !== "Pending" }]} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {list.length === 0 && <Empty>{tab === "ready" ? "Nothing waiting. Shipments appear here when the brand releases a batch." : "No shipments here."}</Empty>}
            </div>
          </Panel>
          {cur ? (
            <Panel bodyClass="px-[15px] pb-[14px] pt-[14px]">
              <div className="flex items-start gap-[12px]">
                <Image src={cur.img} alt="" width={64} height={64} className="size-[58px] rounded-[8px] object-cover" />
                <div className="min-w-0"><h3 className="serif text-[19px] font-semibold leading-tight">{cur.id}</h3><p className="mt-[2px] text-[12px] text-cs-ink-2">{cur.name}{cur.orderId ? ` · ${cur.orderId}` : ""}</p><Pill tone={TONE[cur.status]} className="mt-[6px]">{cur.status}</Pill></div>
              </div>
              <div className="mt-[14px]">
                <Stepper size={36} current={cur.step} allDone={cur.status === "Delivered"} steps={SHIP_STEPS.map((l, i) => ({ label: l, icon: i === 0 ? Box : i === 4 ? CheckCircle2 : Truck, sub: cur.stepDates[i] ? fmtDay(cur.stepDates[i]!) : undefined }))} />
              </div>
              <dl className="mt-[12px]">
                <KV k="Destination" v={<span className="inline-flex items-center gap-[4px]"><MapPin className="size-[12px]" />{cur.destination}</span>} />
                <KV k="Carrier" v={cur.status === "Pending" ? "Not booked yet" : cur.carrier} />
                <KV k="ETA" v={fmtDate(cur.eta)} />
                <KV k="Packages" v={cur.packages} />
                <KV k="Value" v={inr(cur.value)} />
                <KV k="Incoterms" v={cur.incoterms} />
              </dl>
              {cur.status === "Pending" && <Btn kind="primary" icon={Send} className="mt-[12px] w-full" onClick={() => setHandFor(cur)}>Hand to carrier</Btn>}
              <h4 className="serif mt-[14px] text-[16px] font-semibold">Tracking</h4>
              <ul className="mt-[6px] space-y-[7px]">
                {cur.events.map((e, i) => (
                  <li key={i} className="flex gap-[9px] text-[12px]"><span className={cn("mt-[5px] size-[7px] shrink-0 rounded-full", e.tone === "green" ? "bg-cs-green-2" : "bg-cs-amber")} /><span className="min-w-0 flex-1">{e.text}<span className="block text-[11px] text-cs-ink-2">{fmtDateTime(e.at)}</span></span></li>
                ))}
              </ul>
              <h4 className="serif mt-[14px] text-[16px] font-semibold">Documents</h4>
              <ul className="mt-[4px] space-y-[4px]">
                {cur.documents.map((f) => <li key={f}><button type="button" onClick={() => download(f.replace(/\.pdf$/, ".txt"), `${f}\n${cur.id} · ${cur.name}\n${fmtNum(cur.qty)} units to ${cur.destination}`, "text/plain")} className="flex items-center gap-[6px] text-[12px] text-cs-green hover:underline"><Download className="size-[13px]" />{f}</button></li>)}
              </ul>
              <p className="mt-[12px] text-[11px] text-cs-ink-2">Updated {ago(cur.updatedAt)}</p>
            </Panel>
          ) : <Panel><Empty>Pick a shipment.</Empty></Panel>}
        </Split>
      </Page>
      {handFor && <HandModal x={handFor} onClose={() => setHandFor(null)} />}
    </div>
  );
}

function HandModal({ x, onClose }: { x: Shipment; onClose: () => void }) {
  const { update, toast } = useConsole();
  const [carrier, setCarrier] = useState(x.carrier || CARRIERS[0]);
  return (
    <Modal open onClose={onClose} title="Hand to carrier" sub={`${x.id} · ${x.name} · ${fmtNum(x.qty)} units to ${x.destination}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" icon={Send} onClick={() => { update((d) => dispatchShipment(d, x.id, carrier)); toast(`${x.id} dispatched with ${carrier}`); onClose(); }}>Dispatch</Btn></>}>
      <Field label="Carrier"><select className={inputCls} value={carrier} onChange={(e) => setCarrier(e.target.value as Shipment["carrier"])}>{CARRIERS.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <p className="mt-[10px] text-[12px] text-cs-ink-2">The brand and the receiving warehouse see the shipment move to Dispatched with tracking.</p>
    </Modal>
  );
}
