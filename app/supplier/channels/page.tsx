"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Modal, Pill, Tag } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/cn";

const PLATFORMS = [
  { n: "IndiaMART", s: "Connected", v: 86, f: "86 → 22 → 6", note: "Most volume, many time-pass" },
  { n: "TradeIndia", s: "Connected", v: 24, f: "24 → 8 → 2", note: "" },
  { n: "JustDial", s: "Connected", v: 31, f: "31 → 5 → 1", note: "Mostly retail, low fit" },
  { n: "WhatsApp", s: "Connected", v: 58, f: "58 → 30 → 11", note: "Repeat buyers" },
  { n: "Calls", s: "Scouthru number", v: 19, f: "19 → 9 → 4", note: "Auto-logged, recorded" },
  { n: "Scouthru", s: "Native", v: 17, f: "17 → 12 → 6", note: "Pre-verified factories" },
];

const FIT_TONE: Record<Lead["fit"], "warn" | "ok" | "bad" | "neutral"> = { "Partial stock": "warn", "In stock": "ok", "Below MOQ": "bad", "Make to order": "neutral", "Out of radius": "bad" };
const Q_TONE: Record<Lead["quality"], "ok" | "bad" | "warn"> = { Genuine: "ok", Verified: "ok", "Likely spam": "bad", "Repeat buyer": "ok", "Price-shopping": "warn" };

export default function Channels() {
  const { s, update, toast } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "genuine" | "follow" | "spam">("all");
  const [connect, setConnect] = useState(false);
  const [email, setEmail] = useState(false);
  const leads = s.leads.filter((l) => !l.dismissed);
  const list = leads.filter((l) => tab === "all" || (tab === "genuine" ? ["Genuine", "Verified", "Repeat buyer"].includes(l.quality) : tab === "follow" ? l.next.toLowerCase().includes("follow") || l.next.includes("Reply") : ["Likely spam", "Price-shopping"].includes(l.quality)));

  function act(l: Lead) {
    if (l.cta === "Dismiss") { update((d) => { d.leads.find((x) => x.id === l.id)!.dismissed = true; }); toast("Dismissed. Similar leads score lower next time."); }
    else if (l.cta === "View PO") router.push("/supplier/pos/PO-2240");
    else if (l.cta === "Follow up") { update((d) => { const x = d.leads.find((y) => y.id === l.id)!; x.next = "Followed up today"; x.cta = "Open"; }); toast(`Follow-up sent on ${l.sources[0]}`); }
    else router.push("/supplier/requests");
  }

  return (
    <>
      <DeskHeader kicker="One source for every platform" title="All channels" sub="Leads from IndiaMART, TradeIndia, JustDial, WhatsApp, calls and email land here, de-duplicated and scored." actions={<Btn onClick={() => setConnect(true)}>+ Connect a platform</Btn>} />
      <Panel title="Connected platforms" right="Last 30 days · leads → quoted → won">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {PLATFORMS.map((p) => (
            <div key={p.n} className="rounded-[10px] border border-line p-4">
              <p className="text-[14px] font-semibold">{p.n}</p><Pill tone={p.s === "Native" ? "info" : "ok"} className="mt-1.5">{p.s}</Pill>
              <p className="num mt-2 text-[24px]">{p.v}</p>
              <p className="num text-[11px] text-ink-2">{p.f}</p>
              {p.note && <p className="mt-1 text-[12px] text-ink-2">{p.note}</p>}
            </div>
          ))}
          <button onClick={() => setEmail(true)} className={cn("rounded-lg border border-line bg-soft p-3 text-left", email && "bg-ok-bg")}>
            <p className="text-[14px] font-semibold">Email / website</p><Pill className="mt-1.5">{email ? "Connected" : "Not connected"}</Pill>
            <p className="num mt-2 text-[24px]">—</p>
            <p className="text-[12px] text-ink-2">{email ? "Forwarding set up" : "Forward to connect"}</p>
          </button>
        </div>
      </Panel>

      <Panel className="mt-5" pad={false} title="Unified inbox" right={
        <div className="flex gap-1.5">
          {([["all", `All ${leads.length}`], ["genuine", "Genuine"], ["follow", "Follow-up due"], ["spam", "Likely spam"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("rounded-full px-3 py-1 text-[12px]", tab === k ? "bg-info-bg font-semibold text-info" : "bg-soft")}>{l}</button>
          ))}
        </div>
      }>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead><tr><th className="th pl-6">Source</th><th className="th">Buyer</th><th className="th">Requirement</th><th className="th">Fit</th><th className="th">Quality</th><th className="th">Status</th><th className="th">Next</th><th className="th pr-6" /></tr></thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id}>
                  <td className="td pl-6"><div className="flex flex-col items-start gap-1">{l.sources.map((x, i) => <Tag key={x} className={i ? "bg-info-bg text-info" : ""}>{i ? `+ ${x}` : x}</Tag>)}</div></td>
                  <td className="td"><b>{l.buyer}</b><p className="text-[12px] text-ink-2">{l.city}</p></td>
                  <td className="td">{l.req}</td>
                  <td className="td"><Pill tone={FIT_TONE[l.fit]}>{l.fit}</Pill></td>
                  <td className="td"><Pill tone={Q_TONE[l.quality]}>{l.quality}</Pill></td>
                  <td className="td">{l.status}</td>
                  <td className={cn("td", l.next.includes("today") || l.next.includes("within") ? "text-flame" : l.next.startsWith("Dispatch") ? "text-ok" : "")}>{l.next}</td>
                  <td className="td pr-6"><Btn size="sm" variant={l.cta === "Quote" ? "pine" : "outline"} onClick={() => act(l)}>{l.cta}</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Every lead, whatever the source">
          <ol className="list-decimal space-y-1.5 pl-5 text-[14px]">
            <li>Pulled in automatically (IndiaMART and TradeIndia lead feeds, WhatsApp Business, calls on your Scouthru number, email forward)</li>
            <li>Same buyer on two platforms is merged into one lead</li>
            <li>Scored: genuine vs time-pass, and checked against your stock and MOQ</li>
            <li>Quote from here; reply goes back on the channel it came from</li>
            <li>Won leads become POs and flow into dispatch and payments</li>
          </ol>
        </Panel>
        <Panel title="Is each platform paying off?" right="Subscription cost vs orders won, this quarter">
          <ul className="divide-y divide-line text-[14px]">
            {[["IndiaMART subscription", "₹38,000", "6 orders", "ok"], ["TradeIndia subscription", "₹9,500", "2 orders", "warn"], ["JustDial listing", "₹6,000", "1 order", "bad"]].map(([a, b, c, t]) => (
              <li key={a} className="flex items-center justify-between py-2"><span>{a}</span><span className="flex items-center gap-3"><span className="num">{b}</span><Pill tone={t as "ok"}>{c}</Pill></span></li>
            ))}
          </ul>
        </Panel>
      </div>

      <Modal open={connect} onClose={() => setConnect(false)} title="Connect a platform">
        <ul className="divide-y divide-line text-[14px]">
          {["Email forward", "Website form", "Jumbotail", "ExportersIndia"].map((p) => (
            <li key={p} className="flex items-center justify-between py-2.5"><span>{p}</span><Btn size="sm" variant="pine" onClick={() => { toast(`${p} connected. New leads will appear in the inbox.`); if (p === "Email forward") setEmail(true); setConnect(false); }}>Connect</Btn></li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
