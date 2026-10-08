"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, CalendarClock, Download, PackagePlus, SlidersHorizontal, Warehouse, X } from "lucide-react";
import { Btn, CardTitle, Empty, FilterSelect, Hero, Pill, RowMenu, SearchBox, StatStrip, inputCls } from "@/components/console/kit";
import { th } from "@/components/console/ops";
import { AdjustModal, RestockModal, daysTo, stockValue } from "@/components/console/distributor-kit";
import { useConsole } from "@/lib/console/store";
import { setReorderLevel } from "@/lib/console/actions-distributor";
import { csv, download, fmtDate, fmtNum, inr, lakh } from "@/lib/console/format";
import { cn } from "@/lib/cn";

export default function StockPage() {
  return (
    <Suspense>
      <Stock />
    </Suspense>
  );
}

function Stock() {
  const { s, update, toast } = useConsole();
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sel, setSel] = useState<string | null>(params.get("sku") ?? s.distStock[0]?.sku ?? null);
  const [restock, setRestock] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<string | null>(null);
  const [level, setLevel] = useState<number>(0);

  useEffect(() => { const k = params.get("sku"); if (k) setSel(k); }, [params]);
  const cur = s.distStock.find((x) => x.sku === sel) ?? null;
  useEffect(() => { if (cur) setLevel(cur.reorderAt); }, [cur?.sku, cur?.reorderAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const flag = (x: (typeof s.distStock)[number]) => (x.onHand < x.reorderAt ? "Below reorder" : daysTo(x.expiry) < 90 ? "Expiring soon" : "Healthy");
  const list = useMemo(() => s.distStock.filter((x) => (!q.trim() || [x.sku, x.product, x.batch].some((v) => v.toLowerCase().includes(q.trim().toLowerCase()))) && (!status || flag(x) === status)), [s.distStock, q, status]); // eslint-disable-line react-hooks/exhaustive-deps
  const expiring = s.distStock.filter((x) => daysTo(x.expiry) < 90);
  const low = s.distStock.filter((x) => x.onHand < x.reorderAt);
  const pick = (sku: string) => { setSel(sku); router.replace(`/console/distributor/stock?sku=${sku}`, { scroll: false }); };

  const exportCsv = () => {
    download(`stock-${new Date().toISOString().slice(0, 10)}.csv`, csv([["SKU", "Product", "Brand", "Batch", "Expiry", "On hand", "Reorder at", "MRP", "Price", "Value"], ...s.distStock.map((x) => [x.sku, x.product, x.brand, x.batch, fmtDate(x.expiry), x.onHand, x.reorderAt, x.mrp, x.price, x.onHand * x.price])]));
    toast("Stock exported");
  };

  const moves = cur ? [
    ...s.grns.flatMap((g) => g.lines.filter((l) => l.sku === cur.sku).map((l) => ({ at: g.at, text: `Received ${g.shipmentId}`, qty: l.received - l.damaged, tone: "green" as const }))),
    ...s.retailOrders.filter((o) => o.status !== "New" && o.status !== "Cancelled").flatMap((o) => o.lines.filter((l) => l.sku === cur.sku).map((l) => ({ at: o.at, text: `${o.id} · ${o.retailer}`, qty: -l.qty, tone: "red" as const, status: o.status }))),
  ].sort((a, b) => b.at.localeCompare(a.at)) : [];

  return (
    <div>
      <Hero
        eyebrow="STOCK  ·  REORDER  ·  EXPIRY"
        title="Warehouse Stock"
        lede={<span className="lg:whitespace-nowrap">Every SKU on your shelves, its batch, expiry and value. Restock before you run out.</span>}
        img="/console/hero-products.jpg"
        quote={["Full shelves.", "Fresh batches.", "No stock-outs."]}
        height={152}
        quoteTop={36}
        quoteWidth={212}
      />
      <div className="px-[15px] pb-[20px]">
        <StatStrip
          items={[
            { icon: Boxes, tone: "green", value: s.distStock.length, label: "SKUs Carried", delta: <span className="block truncate">{`from ${new Set(s.distStock.map((x) => x.brand)).size} brand${new Set(s.distStock.map((x) => x.brand)).size === 1 ? "" : "s"}`}</span>, deltaTone: "muted" },
            { icon: Warehouse, tone: "blue", value: fmtNum(s.distStock.reduce((a, x) => a + x.onHand, 0)), label: "Packs on Hand", delta: <span className="block truncate">{"across all batches"}</span>, deltaTone: "muted" },
            { icon: Warehouse, tone: "green", value: lakh(stockValue(s)), label: "Stock Value", delta: <span className="block truncate">{"at distributor price"}</span>, deltaTone: "muted" },
            { icon: AlertTriangle, tone: "orange", value: low.length, label: "Below Reorder Level", delta: <span className="block truncate">{low.length ? low.map((x) => x.sku).join(", ") : "all healthy"}</span>, deltaTone: low.length ? "bad" : "up" },
            { icon: CalendarClock, tone: "red", value: expiring.length, label: "Expiring in 90 Days", delta: <span className="block truncate">{expiring.length ? "sell or return first" : "no near-expiry stock"}</span>, deltaTone: expiring.length ? "bad" : "up" },
          ]}
        />

        <div className={cn("mt-[11px] grid gap-[11px] min-[1024px]:h-[741px]", cur && "min-[1024px]:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]")}>
          <section className="cs-card flex min-h-0 min-w-0 flex-col px-[14px] pt-[14px]">
            <div className="flex flex-wrap items-center gap-[8px]">
              <SearchBox value={q} onChange={setQ} placeholder="Search by SKU, product or batch..." className="min-w-[200px] flex-1" />
              <FilterSelect label="All statuses" value={status} onChange={setStatus} options={["Below reorder", "Expiring soon", "Healthy"]} className="w-[140px]" />
              <Btn icon={Download} className="h-[34px]" onClick={exportCsv}>Export CSV</Btn>
            </div>
            <div className="mt-[14px] min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-y-[1px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#f7f6f2]">
                    <th className={cn(th, "rounded-l-[6px] pl-[10px]")}>Product</th>
                    <th className={th}>Batch</th>
                    <th className={th}>Expiry</th>
                    <th className={th}>On Hand</th>
                    <th className={th}>Reorder At</th>
                    <th className={th}>MRP / Price</th>
                    <th className={th}>Value</th>
                    <th className={th}>Status</th>
                    <th className={cn(th, "rounded-r-[6px]")}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((x) => {
                    const on = x.sku === sel;
                    const f = flag(x);
                    const exp = daysTo(x.expiry);
                    return (
                      <tr key={x.sku} onClick={() => pick(x.sku)} className={cn("cursor-pointer", on ? "[&>td]:border-y-[1.5px] [&>td]:border-cs-green-2/70 [&>td:first-child]:rounded-l-[8px] [&>td:first-child]:border-l-[1.5px] [&>td:last-child]:rounded-r-[8px] [&>td:last-child]:border-r-[1.5px] [&>td]:bg-[#fbfdfb]" : "[&>td]:border-b [&>td]:border-cs-line hover:[&>td]:bg-[#faf9f6]")}>
                        <td className="py-[9px] pl-[10px] pr-[8px]">
                          <div className="flex items-center gap-[10px]">
                            <Image src={x.img} alt="" width={42} height={42} className="size-[42px] shrink-0 rounded-[6px] object-cover" />
                            <div className="min-w-0"><p className="truncate text-[11.5px] font-semibold">{x.product}</p><p className="text-[10.5px] text-cs-ink-2">{x.sku}</p></div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-[8px] text-[11.5px]">{x.batch}</td>
                        <td className={cn("whitespace-nowrap px-[8px] text-[11.5px]", exp < 90 && "font-semibold text-cs-red")}>{fmtDate(x.expiry)}<span className="block text-[10.5px] font-normal text-cs-ink-2">{exp} days</span></td>
                        <td className={cn("px-[8px] text-[12px] font-semibold", x.onHand < x.reorderAt && "text-cs-red")}>{fmtNum(x.onHand)}</td>
                        <td className="px-[8px] text-[11.5px]">{fmtNum(x.reorderAt)}</td>
                        <td className="whitespace-nowrap px-[8px] text-[11.5px]">{inr(x.mrp)}<span className="block text-[10.5px] text-cs-ink-2">{inr(x.price)}</span></td>
                        <td className="whitespace-nowrap px-[8px] text-[11.5px] font-medium">{inr(x.onHand * x.price)}</td>
                        <td className="px-[8px]"><Pill tone={f === "Healthy" ? "green" : f === "Below reorder" ? "orange" : "red"}>{f}</Pill></td>
                        <td className="pr-[8px]">
                          <RowMenu items={[
                            { label: "Open", onClick: () => pick(x.sku) },
                            { label: "Request restock", icon: PackagePlus, onClick: () => setRestock(x.sku) },
                            { label: "Adjust stock", icon: SlidersHorizontal, onClick: () => setAdjust(x.sku) },
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {list.length === 0 && <Empty>No SKUs match.</Empty>}
            </div>
            <div className="h-[10px] shrink-0" />
          </section>

          {cur && (
            <section className="cs-card flex min-h-0 min-w-0 flex-col px-[16px] pb-[14px] pt-[14px]">
              <div className="flex items-start gap-[12px]">
                <Image src={cur.img} alt="" width={70} height={70} className="size-[64px] shrink-0 rounded-[8px] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="serif text-[19px] font-semibold leading-tight">{cur.product}</p>
                  <p className="text-[12px] text-cs-ink-2">{cur.sku} · {cur.brand}</p>
                  <div className="mt-[5px]"><Pill tone={flag(cur) === "Healthy" ? "green" : flag(cur) === "Below reorder" ? "orange" : "red"}>{flag(cur)}</Pill></div>
                </div>
                <button type="button" aria-label="Close" onClick={() => { setSel(null); router.replace("/console/distributor/stock", { scroll: false }); }} className="grid size-[28px] place-items-center rounded-[6px] hover:bg-[#f1f0ec]"><X className="size-[16px]" /></button>
              </div>
              <dl className="mt-[12px] grid grid-cols-3 gap-[8px] text-[12px]">
                {[["On hand", fmtNum(cur.onHand)], ["Value", inr(cur.onHand * cur.price)], ["Batch", cur.batch], ["Expiry", fmtDate(cur.expiry)], ["MRP", inr(cur.mrp)], ["Margin", `${Math.round(((cur.mrp - cur.price) / cur.mrp) * 100)}%`]].map(([k, v]) => (
                  <div key={k} className="rounded-[7px] border border-cs-line px-[9px] py-[6px]"><dt className="text-[10.5px] text-cs-ink-2">{k}</dt><dd className="font-medium">{v}</dd></div>
                ))}
              </dl>
              <div className="mt-[12px] flex items-end gap-[8px]">
                <label className="flex-1"><span className="mb-[4px] block text-[11.5px] font-medium text-[#3e4440]">Reorder level</span><input className={inputCls} type="number" min={0} value={level} onChange={(e) => setLevel(Number(e.target.value))} /></label>
                <Btn className="h-[38px]" disabled={level === cur.reorderAt || level < 0} onClick={() => { update((d) => setReorderLevel(d, cur.sku, level)); toast(`Reorder level for ${cur.sku} set to ${level}`); }}>Save</Btn>
              </div>
              <div className="mt-[14px] min-h-0 flex-1 overflow-y-auto">
                <CardTitle><span className="text-[17px]">Movements</span></CardTitle>
                <ul className="mt-[6px] divide-y divide-cs-line">
                  {moves.map((m, i) => (
                    <li key={i} className="flex items-center justify-between gap-[8px] py-[7px] text-[12px]">
                      <span className="min-w-0"><span className="block truncate">{m.text}</span><span className="text-[10.5px] text-cs-ink-2">{fmtDate(m.at)}{"status" in m && m.status ? ` · ${m.status}` : ""}</span></span>
                      <span className={cn("font-semibold", m.qty > 0 ? "text-cs-green-2" : "text-cs-red")}>{m.qty > 0 ? "+" : ""}{fmtNum(m.qty)}</span>
                    </li>
                  ))}
                  {moves.length === 0 && <li className="py-4 text-[12px] text-cs-ink-2">No movements yet.</li>}
                </ul>
              </div>
              <div className="mt-[12px] grid grid-cols-2 gap-[8px] border-t border-cs-line pt-[12px]">
                <Btn kind="primary" icon={PackagePlus} onClick={() => setRestock(cur.sku)}>Request restock</Btn>
                <Btn icon={SlidersHorizontal} onClick={() => setAdjust(cur.sku)}>Adjust stock</Btn>
              </div>
            </section>
          )}
        </div>
      </div>
      <RestockModal sku={restock} onClose={() => setRestock(null)} />
      <AdjustModal sku={adjust} onClose={() => setAdjust(null)} />
    </div>
  );
}
