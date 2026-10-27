"use client";

import Link from "next/link";
import { CalendarDays, CalendarPlus, CheckCircle2, Star } from "lucide-react";
import { Box, TypeBadge } from "@/components/hq/ui";
import { daysFromToday, progress } from "@/lib/hq/rules";
import { log, useHq } from "@/lib/hq/store";
import type { Member } from "@/lib/hq/types";
import { fmtDate, fmtDay } from "@/lib/console/format";
import { cn } from "@/lib/cn";

const daysTo = (date: string) => daysFromToday(date);

/** Visits: overdue, coming up, still to book, and recent reports. */
export default function Visits() {
  const { s, update, toast } = useHq();
  const booked = s.members.filter((m) => m.visit?.date && !m.visit.done).sort((a, b) => a.visit!.date.localeCompare(b.visit!.date));
  const overdue = booked.filter((m) => daysTo(m.visit!.date) < 0);
  const upcoming = booked.filter((m) => daysTo(m.visit!.date) >= 0);
  const toBook = s.members.filter((m) => progress(s, m).stage === "Visit" && !m.visit?.date);
  const done = s.members.filter((m) => m.visit?.done).sort((a, b) => b.visit!.date.localeCompare(a.visit!.date));

  const book = (m: Member, date: string) => {
    update((d) => {
      const x = d.members.find((y) => y.id === m.id)!;
      x.visit = { date, done: false, checks: {}, notes: "" };
      log(d, `Visit to ${x.name} booked for ${fmtDate(date)}`, x.id);
    });
    toast(`Visit booked for ${fmtDate(date)}`);
  };

  const Row = ({ m, tone }: { m: Member; tone?: "bad" }) => (
    <li>
      <Link href={`/hq/members/${m.id}#visit`} className="flex items-center gap-[12px] rounded-[10px] border border-cs-line p-[10px] hover:border-cs-green-2/60">
        <span className={cn("grid size-[46px] shrink-0 place-content-center rounded-[8px] text-center leading-none", tone === "bad" ? "bg-cs-red-bg text-cs-red" : "bg-cs-cream")}>
          <span className="serif text-[17px] font-semibold">{fmtDay(m.visit!.date).split(" ")[0]}</span>
          <span className="text-[10.5px]">{fmtDay(m.visit!.date).split(" ")[1]}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold">{m.name}</span>
          <span className="flex flex-wrap items-center gap-[6px] text-[12px] text-cs-ink-2"><TypeBadge type={m.type} />{m.city}, {m.state}</span>
        </span>
        <span className={cn("shrink-0 text-[12px] font-medium", tone === "bad" ? "text-cs-red" : "text-cs-green")}>
          {tone === "bad" ? `${-daysTo(m.visit!.date)} days late` : daysTo(m.visit!.date) === 0 ? "Today" : `In ${daysTo(m.visit!.date)} days`}
        </span>
      </Link>
    </li>
  );

  return (
    <div className="grid gap-[16px]">
      <div>
        <h1 className="serif text-[30px] font-semibold leading-tight tracking-[-0.02em]">Visits</h1>
        <p className="mt-[2px] text-[13.5px] text-cs-ink-2">Every manufacturer, supplier and distributor is visited before going live. Open a visit to fill in the report and add photos.</p>
      </div>

      <div className="grid gap-[16px] lg:grid-cols-2">
        <Box title="Booked" icon={CalendarDays} sub={`${upcoming.length} coming up${overdue.length ? ` · ${overdue.length} overdue` : ""}`}>
          {booked.length === 0 ? <p className="py-[14px] text-center text-[13px] text-cs-ink-2">No visits booked.</p> : (
            <ul className="grid gap-[8px]">
              {overdue.map((m) => <Row key={m.id} m={m} tone="bad" />)}
              {upcoming.map((m) => <Row key={m.id} m={m} />)}
            </ul>
          )}
        </Box>

        <Box title="To book" icon={CalendarPlus} sub="Documents are in; the visit is next">
          {toBook.length === 0 ? <p className="py-[14px] text-center text-[13px] text-cs-ink-2">Nobody waiting for a visit date.</p> : (
            <ul className="grid gap-[8px]">
              {toBook.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-[10px] rounded-[10px] border border-dashed border-[#e2dccf] p-[10px]">
                  <span className="min-w-0 flex-1">
                    <Link href={`/hq/members/${m.id}`} className="block truncate text-[13.5px] font-semibold hover:text-cs-green">{m.name}</Link>
                    <span className="text-[12px] text-cs-ink-2">{m.city}, {m.state}</span>
                  </span>
                  <label className="flex items-center gap-[6px] text-[12px] text-cs-ink-2">
                    Book for
                    <input type="date" min={new Date().toISOString().slice(0, 10)} onChange={(e) => e.target.value && book(m, e.target.value)} className="h-[34px] rounded-[7px] border border-cs-line bg-white px-[8px] text-[12.5px] text-cs-ink" aria-label={`Visit date for ${m.name}`} />
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Box>
      </div>

      <Box title="Reports" icon={CheckCircle2} sub="Visits done">
        {done.length === 0 ? <p className="py-[14px] text-center text-[13px] text-cs-ink-2">No visits done yet.</p> : (
          <ul className="grid gap-[8px] md:grid-cols-2">
            {done.map((m) => (
              <li key={m.id}>
                <Link href={`/hq/members/${m.id}#visit`} className="block rounded-[10px] border border-cs-line p-[11px] hover:border-cs-green-2/60">
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-[13.5px] font-semibold">{m.name}</span>
                    <span className="flex shrink-0">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn("size-[14px]", (m.visit!.score ?? 0) >= n ? "fill-cs-amber text-cs-amber" : "text-[#d8d2c4]")} />)}</span>
                  </span>
                  <span className="mt-[3px] block text-[12px] text-cs-ink-2">{fmtDate(m.visit!.date)} · {Object.values(m.visit!.checks).filter(Boolean).length} checks passed</span>
                  {m.visit!.notes && <span className="mt-[5px] line-clamp-2 block text-[12.5px] text-[#3e4440]">{m.visit!.notes}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Box>
    </div>
  );
}
