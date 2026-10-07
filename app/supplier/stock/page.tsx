"use client";

import { useRef, useState } from "react";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Field, Modal, Pill } from "@/components/ui";
import { fmt, useStore } from "@/lib/store";
import type { StockItem } from "@/lib/types";

const STATUS_TONE: Record<StockItem["status"], "bad" | "ok" | "warn" | "neutral"> = { "Low vs demand": "bad", Healthy: "ok", "9 days cover": "warn", MTO: "neutral" };

type Voice = { lang: string; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

export default function Stock() {
  const { s, update, toast } = useStore();
  const [add, setAdd] = useState(false);
  const [listening, setListening] = useState(false);
  const [rules, setRules] = useState({ validity: "15", discount: "4", radius: "300", credit: "30" });
  const rec = useRef<Voice | null>(null);

  function voice() {
    const w = window as unknown as { SpeechRecognition?: new () => Voice; webkitSpeechRecognition?: new () => Voice };
    const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!C) { toast("Voice update needs Chrome or Edge"); return; }
    if (listening) { rec.current?.stop(); return; }
    const r = new C();
    r.lang = "en-IN";
    r.onresult = (e) => {
      const said = e.results[0][0].transcript.toLowerCase();
      const n = parseInt(said.replace(/[^\d]/g, ""), 10);
      const item = s.stock.find((x) => said.includes(x.name.toLowerCase().split(" ")[0]) || said.includes(x.name.toLowerCase().split(" ").slice(-1)[0]));
      if (item && n) { update((d) => { d.stock.find((x) => x.name === item.name)!.onHand = n; }); toast(`${item.name}: on hand set to ${fmt(n)}`); }
      else toast(`Heard “${said}”. Say e.g. "glass jar 15000".`);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r; setListening(true); r.start();
  }

  return (
    <>
      <DeskHeader back={{ href: "/supplier", label: "Supplier desk" }} title="Stock, prices & demand" actions={<><Btn onClick={voice}>{listening ? "Listening… tap to stop" : "Update by voice"}</Btn><Btn variant="flame" onClick={() => setAdd(true)}>+ Add product</Btn></>} />
      <Panel title="Demand coming your way" right="From production plans of factories you supply · next 30 days">
        <div className="grid gap-3 md:grid-cols-3">
          {[["500ml glass jars", "14,000", "3 factories · pickle brands", "You can cover 9,800", "warn"], ["Groundnut oil", "3,200 L", "2 factories", "Covered", "ok"], ["1kg laminated pouches", "20,000", "Sri Lakshmi Foods, Indur Spices", "Not in your catalog", "neutral"]].map(([a, b, c, d, t]) => (
            <div key={a} className="rounded-[10px] bg-soft p-4"><p className="text-[14px] font-semibold">{a}</p><p className="num mt-1 text-[24px]">{b}</p><p className="text-[12px] text-ink-2">{c}</p><Pill className="mt-2" tone={t as "ok"}>{d}</Pill></div>
          ))}
        </div>
      </Panel>
      <Panel className="mt-5" pad={false} title="Catalog & stock" right={<span className="pr-5">Buyers see “available” and your price band, never exact stock</span>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead><tr><th className="th pl-6">Product</th><th className="th">On hand</th><th className="th">Reserved</th><th className="th">Available</th><th className="th">MOQ</th><th className="th">Price band</th><th className="th">Lead time</th><th className="th pr-6">Status</th></tr></thead>
            <tbody>
              {s.stock.map((x) => (
                <tr key={x.name}>
                  <td className="td pl-6"><b>{x.name}</b><p className="text-[12px] text-ink-2">{x.spec}</p></td>
                  <td className="td">{x.onHand == null ? "—" : <input className="num w-24 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-line focus:border-ink focus:outline-none" value={x.onHand} inputMode="numeric" onChange={(e) => { const v = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0; update((d) => { d.stock.find((y) => y.name === x.name)!.onHand = v; }); }} aria-label={`${x.name} on hand`} />}</td>
                  <td className="td num text-ink-2">{x.reserved == null ? "—" : fmt(x.reserved)}{x.uom ? ` ${x.uom}` : ""}</td>
                  <td className="td num font-semibold">{x.onHand == null ? "Made to order" : `${fmt(Math.max(0, x.onHand - (x.reserved ?? 0)))}${x.uom ? ` ${x.uom}` : ""}`}</td>
                  <td className="td num">{x.moq}</td>
                  <td className="td num">{x.band}</td>
                  <td className="td">{x.lead}</td>
                  <td className="td pr-6"><Pill tone={STATUS_TONE[x.status]}>{x.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Quote rules">
          {([["validity", "Quote validity", "days"], ["discount", "Volume discount above 10,000", "%"], ["radius", "Delivery radius", "km"], ["credit", "Credit terms offered", "days"]] as const).map(([k, l, u]) => (
            <div key={k} className="flex items-center justify-between border-b border-line py-2 text-[14px] last:border-0">
              <span>{l}</span>
              <span className="flex items-center gap-1"><input className="num w-14 rounded border border-line px-1.5 py-0.5 text-right" value={rules[k]} onChange={(e) => setRules({ ...rules, [k]: e.target.value })} /> <span className="text-ink-2">{u}</span></span>
            </div>
          ))}
          <Btn size="sm" className="mt-3" onClick={() => toast("Quote rules saved. They apply to every new quote.")}>Save rules</Btn>
        </Panel>
        <Panel title="How buyers see you" right="Better scores rank higher in factory searches">
          {[["On-time dispatch", 92, "92%"], ["Quote response", 82, "4h"], ["Quality complaints", 95, "1"], ["Profile complete", 80, "80%"]].map(([l, v, t]) => (
            <div key={l as string} className="grid grid-cols-[130px_1fr_40px] items-center gap-3 py-2 text-[14px]"><span>{l}</span><span className="h-1.5 rounded-full bg-soft"><span className="block h-full rounded-full bg-pine" style={{ width: `${v}%` }} /></span><span className="num text-right">{t}</span></div>
          ))}
        </Panel>
      </div>
      <Modal open={add} onClose={() => setAdd(false)} title="Add product">
        <form className="flex flex-col gap-3" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          update((d) => { d.stock.push({ name: String(f.get("name")), spec: String(f.get("spec")), onHand: parseInt(String(f.get("qty")), 10) || 0, reserved: 0, moq: String(f.get("moq")) || "1,000", band: String(f.get("band")) || "—", lead: "Same day", status: "Healthy" }); });
          toast("Product added. Buyers now see it as available.");
          setAdd(false);
        }}>
          <Field label="Product"><input name="name" className="input" required placeholder="e.g. 1kg laminated pouch" /></Field>
          <Field label="Spec"><input name="spec" className="input" placeholder="e.g. 3-layer, zipper" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="On hand"><input name="qty" className="input num" inputMode="numeric" /></Field>
            <Field label="MOQ"><input name="moq" className="input num" /></Field>
            <Field label="Price band"><input name="band" className="input num" placeholder="₹3.9–4.3" /></Field>
          </div>
          <Btn variant="pine" type="submit">Add product</Btn>
        </form>
      </Modal>
    </>
  );
}
