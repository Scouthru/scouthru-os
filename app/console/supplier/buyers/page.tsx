"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Factory, IndianRupee, Inbox, Mail, MapPin, MessageSquare, Phone, Repeat, Timer } from "lucide-react";
import { Btn, Empty, Hero, Pill, RowMenu, SearchBox, StatStrip } from "@/components/console/kit";
import { MessageModal } from "@/components/console/making";
import { Board, StatusPill, minePOs, poValue, td, th } from "@/components/console/supplier-kit";
import { useConsole } from "@/lib/console/store";
import { ago, fmtDate, inr } from "@/lib/console/format";
import type { ConsoleState, Manufacturer, PurchaseOrder } from "@/lib/console/types";
import { cn } from "@/lib/cn";

export default function Page() {
  return <Suspense><Buyers /></Suspense>;
}

type Row = { m: Manufacturer; pos: PurchaseOrder[]; orders: number; value: number; open: number; last: string; onTime: number | null; owed: number };

function rows(s: ConsoleState): Row[] {
  const mine = minePOs(s);
  const ids = Array.from(new Set(mine.map((p) => p.mfrId)));
  return ids.map((id) => {
    const m = s.manufacturers.find((x) => x.id === id)!;
    const pos = mine.filter((p) => p.mfrId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const won = pos.filter((p) => !["RFQ", "Quoted", "Declined"].includes(p.status));
    const paid = pos.filter((p) => p.invoice?.paidAt);
    return {
      m, pos, orders: won.length, value: won.reduce((a, p) => a + poValue(s, p), 0),
      open: pos.filter((p) => p.status === "RFQ" || p.status === "Quoted").length,
      last: pos[0]?.createdAt ?? "", owed: pos.filter((p) => p.invoice && !p.invoice.paidAt).reduce((a, p) => a + p.invoice!.amount, 0),
      onTime: paid.length ? Math.round((paid.filter((p) => p.invoice!.paidAt! <= p.invoice!.due).length / paid.length) * 100) : null,
    };
  }).filter((r) => r.m).sort((a, b) => b.value - a.value);
}

function Buyers() {
  const { s } = useConsole();
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(params.get("id"));
  const [msgTo, setMsgTo] = useState<Manufacturer | null>(null);
  const all = useMemo(() => rows(s), [s]);
  const list = all.filter((r) => !q.trim() || `${r.m.name} ${r.m.city} ${r.m.state}`.toLowerCase().includes(q.trim().toLowerCase()));
  const r = all.find((x) => x.m.id === sel) ?? list[0] ?? null;
  const repeat = all.filter((x) => x.orders > 1).length;

  return (
    <div>
      <Hero eyebrow="FACTORIES · ORDERS · RELATIONSHIPS" title="Buyers" lede="The factories that buy from you: what they order, what they owe and how to reach them." img="/console/hero-manufacturers.jpg" height={160} quoteTop={32} quoteWidth={160} quote={["Factories", "that buy", "from you,", "in one place."]} />
      <div className="px-[15px] pb-[15px]">
        <StatStrip items={[
          { icon: Factory, tone: "green", value: all.length, label: "Active Buyers", delta: `${all.filter((x) => x.open > 0).length} with open requests`, deltaTone: "muted" },
          { icon: Repeat, tone: "blue", value: repeat, label: "Repeat Buyers", delta: "more than one order", deltaTone: "muted" },
          { icon: IndianRupee, tone: "violet", value: inr(all.reduce((a, x) => a + x.value, 0)), label: "Business Won", delta: "confirmed orders", deltaTone: "muted" },
          { icon: Inbox, tone: "orange", value: all.reduce((a, x) => a + x.open, 0), label: "Open Requests", delta: "to quote or confirm", deltaTone: "muted" },
          { icon: Timer, tone: "red", value: inr(all.reduce((a, x) => a + x.owed, 0)), label: "Owed to You", delta: "unpaid invoices", deltaTone: "muted" },
        ]} />

        <Board
          height={735}
          list={
            <>
              <SearchBox value={q} onChange={setQ} placeholder="Search factories by name or city..." className="w-full min-[1024px]:w-[300px]" />
              <div className="mt-[12px] min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[640px] border-separate border-spacing-0 text-[12px]">
                  <thead><tr><th className={cn(th, "rounded-l-[6px]")}>Factory</th><th className={th}>Orders</th><th className={th}>Business</th><th className={th}>Open</th><th className={th}>Pays on time</th><th className={th}>Last request</th><th className={cn(th, "rounded-r-[6px]")}><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {list.map((x) => {
                      const on = r?.m.id === x.m.id;
                      return (
                        <tr key={x.m.id} onClick={() => setSel(x.m.id)} className={cn("cursor-pointer", on ? "bg-cs-mint/50" : "hover:bg-[#faf9f6]")}>
                          <td className={cn(td, on && "border-l-2 border-l-cs-green")}>
                            <span className="flex items-center gap-[9px]"><Image src={x.m.img} alt="" width={34} height={34} className="size-[34px] shrink-0 rounded-[6px] object-cover" /><span><span className="block font-semibold text-[#1d211e]">{x.m.name}</span><span className="text-[10.5px] text-cs-ink-2">{x.m.city}, {x.m.state}</span></span></span>
                          </td>
                          <td className={td}>{x.orders}</td>
                          <td className={cn(td, "whitespace-nowrap font-medium")}>{inr(x.value)}</td>
                          <td className={td}>{x.open || "—"}</td>
                          <td className={td}>{x.onTime === null ? <span className="text-cs-ink-2">No history</span> : <Pill tone={x.onTime >= 80 ? "green" : "orange"}>{x.onTime}%</Pill>}</td>
                          <td className={cn(td, "whitespace-nowrap text-cs-ink-2")}>{x.last ? ago(x.last) : "—"}</td>
                          <td className={cn(td, "w-[34px]")}><RowMenu items={[{ label: "Message buyer", icon: MessageSquare, onClick: () => setMsgTo(x.m) }]} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {list.length === 0 && <Empty>No buyers match.</Empty>}
              </div>
            </>
          }
          panel={r ? (
            <>
              <div className="-mx-[4px] min-h-0 flex-1 overflow-y-auto px-[4px]">
                <div className="flex items-start gap-[11px]">
                  <Image src={r.m.img} alt="" width={64} height={64} className="size-[64px] shrink-0 rounded-[8px] object-cover" />
                  <div className="min-w-0">
                    <h2 className="serif text-[19px] font-semibold leading-tight">{r.m.name}</h2>
                    <p className="mt-[3px] flex items-center gap-[4px] text-[12px] text-cs-ink-2"><MapPin className="size-[13px]" />{r.m.city}, {r.m.state}</p>
                    <p className="mt-[3px] text-[11.5px] text-cs-ink-2">{r.m.certs.slice(0, 3).join(" · ")}</p>
                  </div>
                </div>
                <dl className="mt-[14px] grid grid-cols-3 gap-[8px] text-[11.5px]">
                  {[["Orders", String(r.orders)], ["Business", inr(r.value)], ["Owes", inr(r.owed)]].map(([k, v]) => (
                    <div key={k} className="rounded-[7px] border border-cs-line px-[9px] py-[7px]"><dt className="text-cs-ink-2">{k}</dt><dd className="font-semibold">{v}</dd></div>
                  ))}
                </dl>
                <p className="mt-[14px] text-[12.5px] font-semibold">Contacts</p>
                <ul className="mt-[6px] space-y-[6px]">
                  {r.m.contacts.map((c) => (
                    <li key={c.email} className="flex items-center justify-between gap-2 rounded-[7px] border border-cs-line px-[10px] py-[7px]">
                      <span className="min-w-0 text-[11.5px]"><span className="block font-medium">{c.name}</span><span className="text-cs-ink-2">{c.role}</span></span>
                      <span className="flex gap-[6px]">
                        <a href={`mailto:${c.email}`} aria-label={`Email ${c.name}`} className="grid size-[30px] place-items-center rounded-full bg-cs-mint text-cs-green"><Mail className="size-[14px]" /></a>
                        <a href={`tel:${c.phone.replace(/\s/g, "")}`} aria-label={`Call ${c.name}`} className="grid size-[30px] place-items-center rounded-full bg-cs-mint text-cs-green"><Phone className="size-[14px]" /></a>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-[14px] text-[12.5px] font-semibold">Requests and orders</p>
                <ul className="mt-[6px] space-y-[6px]">
                  {r.pos.map((p) => (
                    <li key={p.id}>
                      <Link href={`/console/supplier/${p.status === "RFQ" || p.status === "Quoted" || p.status === "Declined" ? "requests" : "pos"}?id=${p.id}`} className="flex items-center justify-between gap-2 rounded-[7px] border border-cs-line px-[10px] py-[7px] text-[11.5px] hover:border-[#cfcac0]">
                        <span className="min-w-0"><span className="block truncate font-medium">{p.title}</span><span className="text-cs-ink-2">{p.id} · {fmtDate(p.createdAt)} · {inr(poValue(s, p))}</span></span>
                        <StatusPill status={p.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-[10px] border-t border-cs-line pt-[10px]">
                <Btn kind="primary" icon={MessageSquare} className="h-[38px] w-full text-[12.5px]" onClick={() => setMsgTo(r.m)}>Message buyer</Btn>
              </div>
            </>
          ) : <Empty>Select a buyer.</Empty>}
        />
      </div>
      {msgTo && <MessageModal open onClose={() => setMsgTo(null)} to={msgTo.name} subject="From PackRight Packaging" href="/console/maker/materials" />}
    </div>
  );
}
