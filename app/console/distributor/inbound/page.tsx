"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, MessageSquare, PackageCheck, PackageOpen, Truck, X } from "lucide-react";
import { Btn, CardTitle, Empty, Hero, Pill, RowMenu, SearchBox, StatStrip, Tabs } from "@/components/console/kit";
import { Carrier, th } from "@/components/console/ops";
import { INBOUND_TONE, ReceiveModal, grnText, inboundFor, inboundState, type InboundState } from "@/components/console/distributor-kit";
import { useConsole } from "@/lib/console/store";
import { PhoneList } from "@/components/console/phone-list";
import { NextAction, Timeline } from "@/components/console/flow";
import { shipmentNext, shipmentTimeline } from "@/lib/console/flow";
import { messageBrand } from "@/lib/console/actions-distributor";
import { download, fmtDate, fmtDateTime, fmtNum } from "@/lib/console/format";
import type { Shipment } from "@/lib/console/types";
import { cn } from "@/lib/cn";
import { SavedViews, SortLabel, ariaSort, useRowKeys, useSort } from "@/components/console/table-tools";

type TabKey = "all" | InboundState;

export default function InboundPage() {
  return (
    <Suspense>
      <Inbound />
    </Suspense>
  );
}

function Inbound() {
  const { s, update, toast } = useConsole();
  const params = useSearchParams();
  const router = useRouter();
  const rows = useMemo(() => inboundFor(s).map((r) => ({ ...r, state: inboundState(r.sh, r.grn) })), [s]);
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(params.get("id") ?? rows.find((r) => r.state !== "Received")?.sh.id ?? rows[0]?.sh.id ?? null);
  const [receive, setReceive] = useState<Shipment | null>(null);

  useEffect(() => { const id = params.get("id"); if (id) setSel(id); }, [params]);

  const list = rows.filter((r) => (tab === "all" || r.state === tab) && (!q.trim() || [r.sh.id, r.sh.name, r.sh.carrier].some((v) => v.toLowerCase().includes(q.trim().toLowerCase()))));
  const count = (k: TabKey) => rows.filter((r) => k === "all" || r.state === k).length;
  const cur = rows.find((r) => r.sh.id === sel) ?? null;
  // Click a column to sort; arrows move through rows.
  const srt = useSort(list, { units: (r) => r.sh.qty, carrier: (r) => r.sh.carrier, eta: (r) => r.grn?.at ?? r.sh.eta, status: (r) => r.state });
  useRowKeys(srt.sorted.map((r) => r.sh.id), cur?.sh.id, (id) => { setSel(id); router.replace(`/console/distributor/inbound?id=${id}`, { scroll: false }); });
  const monthAgo = Date.now() - 30 * 864e5;
  const received30 = s.grns.filter((g) => new Date(g.at).getTime() >= monthAgo);
  const units = s.grns.reduce((a, g) => a + g.lines.reduce((b, l) => b + l.received, 0), 0);
  const damaged = s.grns.reduce((a, g) => a + g.lines.reduce((b, l) => b + l.damaged, 0), 0);
  const pick = (id: string) => { setSel(id); router.replace(`/console/distributor/inbound?id=${id}`, { scroll: false }); };

  return (
    <div>
      <Hero
        eyebrow="RECEIVE  ·  COUNT  ·  STOCK"
        title="Inbound Shipments"
        lede={<span className="lg:whitespace-nowrap">Brand shipments headed to {s.distributor.city}. Count each one in against the invoice.</span>}
        img="/console/hero-shipments.jpg"
        quote={["Every carton.", "Counted.", "Claimed fast."]}
        height={142}
        quoteTop={32}
        quoteWidth={192}
      />
      <div className="px-[15px] pb-[20px]">
        <StatStrip
          items={[
            { icon: Truck, tone: "violet", value: count("In Transit"), label: "In Transit", delta: <span className="block truncate">{rows.filter((r) => r.state === "In Transit").length ? `next ETA ${fmtDate(rows.filter((r) => r.state === "In Transit").map((r) => r.sh.eta).sort()[0])}` : "nothing on the road"}</span>, deltaTone: "muted" },
            { icon: PackageOpen, tone: "orange", value: count("At the Dock"), label: "At the Dock", delta: <span className="block truncate">{count("At the Dock") ? "count and receive today" : "dock is clear"}</span>, deltaTone: count("At the Dock") ? "bad" : "up" },
            { icon: PackageCheck, tone: "green", value: received30.length, label: "Received (30 days)", delta: <span className="block truncate">{`${s.grns.length} GRNs on record`}</span> },
            { icon: CheckCircle2, tone: "blue", value: fmtNum(units), label: "Units Received", delta: <span className="block truncate">{`${fmtNum(units - damaged)} good into stock`}</span> },
            { icon: AlertTriangle, tone: "red", value: `${units ? ((damaged / units) * 100).toFixed(1) : "0.0"}%`, label: "Damage Rate", delta: <span className="block truncate">{`${s.grns.filter((g) => g.claim).length} claims raised`}</span>, deltaTone: damaged ? "bad" : "up" },
          ]}
        />

        <div className={cn("mt-[11px] grid gap-[11px] min-[1024px]:h-[751px]", cur && "min-[1024px]:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]")}>
          <section className="cs-card flex min-h-0 min-w-0 flex-col px-[14px] pt-[13px]">
            <Tabs value={tab} onChange={setTab} tabs={[
              { key: "all", label: `All Inbound (${count("all")})` },
              { key: "In Transit", label: `In Transit (${count("In Transit")})` },
              { key: "At the Dock", label: `At the Dock (${count("At the Dock")})` },
              { key: "Received", label: `Received (${count("Received")})` },
            ]} />
            <div className="mt-[14px]"><SearchBox value={q} onChange={setQ} placeholder="Search by shipment ID, product or carrier..." /></div>
            <PhoneList detail="#dist-detail" empty="No shipments here." className="mt-[12px] !px-0" items={srt.sorted.map((r) => ({ key: r.sh.id, img: r.sh.img, title: r.sh.name, sub: `${r.sh.id} · ${r.sh.carrier}`, pill: { tone: INBOUND_TONE[r.state], label: r.state },
              meta: [`${fmtNum(r.sh.qty)} units`, r.grn ? `Counted ${fmtDate(r.grn.at)}` : `ETA ${fmtDate(r.sh.eta)}`], selected: cur?.sh.id === r.sh.id, onSelect: () => pick(r.sh.id) }))} />
            <div className="mt-[14px] min-h-0 flex-1 overflow-auto max-lg:hidden">
              <table className="w-full min-w-[640px] border-separate border-spacing-y-[1px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#f9f6f0]">
                    <th className={cn(th, "rounded-l-[6px] pl-[10px]")}>Shipment &amp; Product</th>
                    <th className={th} {...ariaSort(srt, "units")}><SortLabel k="units" s={srt}>Units</SortLabel></th>
                    <th className={th} {...ariaSort(srt, "carrier")}><SortLabel k="carrier" s={srt}>Carrier</SortLabel></th>
                    <th className={th} {...ariaSort(srt, "eta")}><SortLabel k="eta" s={srt}>ETA / Arrived</SortLabel></th>
                    <th className={th} {...ariaSort(srt, "status")}><SortLabel k="status" s={srt}>Status</SortLabel></th>
                    <th className={cn(th, "rounded-r-[6px]")}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {srt.sorted.map(({ sh, grn, state }) => {
                    const on = sh.id === sel;
                    return (
                      <tr key={sh.id} data-row={sh.id} onClick={() => pick(sh.id)} className={cn("cursor-pointer", on ? "[&>td]:border-y-[1.5px] [&>td]:border-cs-green-2/70 [&>td:first-child]:rounded-l-[8px] [&>td:first-child]:border-l-[1.5px] [&>td:last-child]:rounded-r-[8px] [&>td:last-child]:border-r-[1.5px] [&>td]:bg-[#fdfcfb]" : "[&>td]:border-b [&>td]:border-cs-line hover:[&>td]:bg-[#fbf9f5]")}>
                        <td className="py-[9px] pl-[10px] pr-[8px]">
                          <div className="flex items-center gap-[10px]">
                            <Image src={sh.img} alt="" width={42} height={42} className="size-[42px] shrink-0 rounded-[6px] object-cover" />
                            <div className="min-w-0">
                              <p className="text-[11.5px] font-semibold">{sh.id}</p>
                              <p className="truncate text-[11px] text-[#48413b]">{sh.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-[8px] text-[11.5px]">{fmtNum(sh.qty)}{grn && <span className="block text-[10.5px] text-cs-ink-2">{fmtNum(grn.lines[0]?.received ?? 0)} counted</span>}</td>
                        <td className="px-[8px]"><Carrier name={sh.carrier} /></td>
                        <td className="whitespace-nowrap px-[8px] text-[11.5px]">{grn ? fmtDate(grn.at) : fmtDate(sh.eta)}<span className="block text-[10.5px] text-cs-ink-2">{grn ? "received" : sh.status === "Delivered" ? "delivered" : sh.note || "expected"}</span></td>
                        <td className="px-[8px]"><Pill tone={INBOUND_TONE[state]}>{state}</Pill>{grn?.claim && <Pill tone="red" className="ml-[4px]">Claim</Pill>}</td>
                        <td className="pr-[8px]">
                          <RowMenu items={[
                            { label: "Open", onClick: () => pick(sh.id) },
                            { label: "Receive & count", icon: PackageCheck, disabled: !!grn, onClick: () => setReceive(sh) },
                            { label: "Download GRN", icon: Download, disabled: !grn, onClick: () => grn && download(`GRN-${sh.id}.txt`, grnText(s, grn), "text/plain") },
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {list.length === 0 && <Empty>No inbound shipments here.</Empty>}
            </div>
            <div className="h-[10px] shrink-0" />
          </section>

          {cur && (
            <section id="dist-detail" className="cs-card flex min-h-0 min-w-0 scroll-mt-[76px] flex-col px-[16px] pb-[14px] pt-[14px]">
              <div className="flex items-start gap-[12px]">
                <Image src={cur.sh.img} alt="" width={70} height={70} className="size-[64px] shrink-0 rounded-[8px] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="serif text-[19px] font-semibold leading-tight">{cur.sh.id}</p>
                  <p className="text-[12.5px] text-[#48413b]">{cur.sh.name}</p>
                  <div className="mt-[5px] flex flex-wrap gap-[5px]"><Pill tone={INBOUND_TONE[cur.state]}>{cur.state}</Pill>{cur.grn?.claim && <Pill tone="red">Damage claim</Pill>}</div>
                </div>
                <button type="button" aria-label="Close" onClick={() => { setSel(null); router.replace("/console/distributor/inbound", { scroll: false }); }} className="grid size-[28px] place-items-center rounded-[6px] hover:bg-[#f6f0e7]"><X className="size-[16px]" /></button>
              </div>
              {(() => { const flow = shipmentNext(s, cur.sh, "distributor"); return <NextAction step={flow} onAction={flow.action === "receive" ? () => setReceive(cur.sh) : undefined} className="mt-[12px]" />; })()}
              <dl className="mt-[12px] grid grid-cols-2 gap-[8px] text-[12px]">
                {[["From", s.workspace], ["Carrier", cur.sh.carrier], ["Invoiced", `${fmtNum(cur.sh.qty)} units`], ["Packages", cur.sh.packages], [cur.grn ? "Received on" : "ETA", fmtDate(cur.grn?.at ?? cur.sh.eta)], ["Destination", cur.sh.destination]].map(([k, v]) => (
                  <div key={k} className="rounded-[7px] border border-cs-line px-[10px] py-[7px]"><dt className="text-[10.5px] text-cs-ink-2">{k}</dt><dd className="font-medium">{v}</dd></div>
                ))}
              </dl>

              <div className="mt-[14px] min-h-0 flex-1 overflow-y-auto">
                {cur.grn ? (
                  <>
                    <CardTitle><span className="text-[17px]">Goods Received Note</span></CardTitle>
                    <table className="mt-[8px] w-full text-[12px]">
                      <thead><tr className="text-left text-[10.5px] text-cs-ink-2"><th className="pb-[5px] font-medium">SKU</th><th className="font-medium">Invoiced</th><th className="font-medium">Received</th><th className="font-medium">Damaged</th></tr></thead>
                      <tbody>
                        {cur.grn.lines.map((l) => (
                          <tr key={l.sku} className="border-t border-cs-line"><td className="py-[7px]"><b>{l.sku}</b><span className="block text-[10.5px] text-cs-ink-2">{l.product}</span></td><td>{fmtNum(l.invoiced)}</td><td>{fmtNum(l.received)}</td><td className={l.damaged ? "font-semibold text-cs-red" : ""}>{fmtNum(l.damaged)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                    {cur.grn.claim && <p className="mt-[10px] rounded-[7px] bg-cs-red-bg px-[11px] py-[8px] text-[12px] text-cs-red"><b>Claim sent to {s.workspace}:</b> {cur.grn.claim}</p>}
                    <p className="mt-[8px] text-[11.5px] text-cs-ink-2">Counted {fmtDateTime(cur.grn.at)}</p>
                  </>
                ) : (
                  <>
                    <CardTitle><span className="text-[17px]">Timeline</span></CardTitle>
                    <Timeline items={shipmentTimeline(s, cur.sh)} next={shipmentNext(s, cur.sh, "distributor")} className="mt-[8px]" />
                  </>
                )}
              </div>

              <div className="mt-[12px] grid grid-cols-2 gap-[8px] border-t border-cs-line pt-[12px]">
                {cur.grn
                  ? <Btn kind="primary" icon={Download} onClick={() => { download(`GRN-${cur.sh.id}.txt`, grnText(s, cur.grn!), "text/plain"); toast("GRN downloaded"); }}>Download GRN</Btn>
                  : <Btn kind="primary" icon={PackageCheck} onClick={() => setReceive(cur.sh)}>Receive &amp; count</Btn>}
                <Btn icon={MessageSquare} onClick={() => { update((d) => messageBrand(d, `About ${cur.sh.id}`, `Following up on ${cur.sh.id} (${cur.sh.name}).`, `/console/shipments?id=${cur.sh.id}`)); toast(`Message sent to ${s.workspace}`); }}>Message brand</Btn>
              </div>
            </section>
          )}
        </div>
      </div>
      <ReceiveModal sh={receive} onClose={() => setReceive(null)} />
    </div>
  );
}
