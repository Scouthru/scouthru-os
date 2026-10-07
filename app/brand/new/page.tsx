"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Mic, Image as ImageIcon, Paperclip } from "lucide-react";
import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Field, Pill } from "@/components/ui";
import { fmt, inr, useStore } from "@/lib/store";
import { newOrderFromWizard } from "@/lib/ops";
import { dayLabel } from "@/lib/seed";
import { cn } from "@/lib/cn";

const FACTORIES = [
  { id: "GNT-0057", name: "Sri Lakshmi Foods", city: "Guntur", meta: "FSSAI · ISO 22000 · 14 orders on Scouthru", fit: 100, price: 64, pack: 9.5, freight: 2.4, lead: 18, rating: 4.7 },
  { id: "HYD-0517", name: "Deccan Agro Foods", city: "Hyderabad", meta: "FSSAI · 70% in-house + partner", fit: 70, price: 62, pack: 9.5, freight: 0.9, lead: 14, rating: 4.4 },
  { id: "VJA-0233", name: "Krishna Pickles", city: "Vijayawada", meta: "FSSAI · Halal · new on Scouthru", fit: 100, price: 60, pack: 10.2, freight: 2.1, lead: 24, rating: 0 },
];

const WHATSAPP = `[02/10/26, 10:14 am] Ruchika Ops: Need tomato pickle 300g glass jars, 4,000 jars
[02/10/26, 10:15 am] Ruchika Ops: deliver Hyderabad warehouse by end of month
[02/10/26, 10:15 am] Ruchika Ops: shrink sleeve with our label, FSSAI must`;

type Voice = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

export default function NewOrder() {
  const { update, toast } = useStore();
  const router = useRouter();
  const [product, setProduct] = useState("Tomato pickle 300g");
  const [qty, setQty] = useState("4000");
  const [when, setWhen] = useState(dayLabel(28));
  const [pack, setPack] = useState("Glass jar + shrink sleeve");
  const [to, setTo] = useState("Hyderabad DC");
  const [files, setFiles] = useState(["Label_v3.pdf", "Recipe spec.pdf"]);
  const [sort, setSort] = useState<"landed" | "fast">("landed");
  const [sel, setSel] = useState("GNT-0057");
  const [lang, setLang] = useState<"te-IN" | "hi-IN">("te-IN");
  const [listening, setListening] = useState(false);
  const [source, setSource] = useState("Auto-filled from WhatsApp");
  const rec = useRef<Voice | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const shotRef = useRef<HTMLInputElement>(null);

  const n = parseInt(qty.replace(/\D/g, ""), 10) || 0;
  const rows = useMemo(() => {
    const r = FACTORIES.map((f) => {
      const qc = 1.1;
      const gst = (f.price + f.pack) * 0.12;
      return { ...f, qc, gst, landed: f.price + f.pack + f.freight + qc + gst };
    });
    return r.sort((a, b) => (sort === "landed" ? a.landed - b.landed : a.lead - b.lead));
  }, [sort]);
  const chosen = rows.find((r) => r.id === sel)!;

  function fromChat(text: string, label: string) {
    const t = text.toLowerCase();
    const q = t.match(/(\d[\d,]*)\s*(jars|units|packs|pcs|pouches|bottles|boxes)/);
    if (q) setQty(q[1].replace(/,/g, ""));
    const p = text.match(/need\s+([^,\n]+?)(?:\s+glass jars|,|\n|$)/i);
    if (p) setProduct(p[1].trim().replace(/^\w/, (c) => c.toUpperCase()));
    if (/hyderabad/.test(t)) setTo("Hyderabad DC");
    if (/sleeve/.test(t)) setPack("Glass jar + shrink sleeve");
    setSource(label);
  }

  // Arriving from the "What do you want made next?" box on Home.
  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get("d");
    if (d) fromChat(d, "Filled from your description");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function speak() {
    const w = window as unknown as { SpeechRecognition?: new () => Voice; webkitSpeechRecognition?: new () => Voice };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { toast("Voice input needs Chrome or Edge. Try the chat paste instead."); return; }
    if (listening) { rec.current?.stop(); return; }
    const r = new Ctor();
    r.lang = lang; r.continuous = false; r.interimResults = false;
    r.onresult = (e) => { const said = e.results[0][0].transcript; fromChat(said, `Spoken in ${lang === "te-IN" ? "Telugu" : "Hindi"}`); toast(`Heard: “${said}”`); };
    r.onend = () => setListening(false);
    r.onerror = () => { setListening(false); toast("Couldn't hear that. Allow the microphone and try again."); };
    rec.current = r; setListening(true); r.start();
  }

  function send() {
    if (!n || !product.trim()) { toast("Add a product and quantity first."); return; }
    let id = "";
    update((d) => { id = newOrderFromWizard(d, { product, qty: n, factory: { id: chosen.id, name: chosen.name, city: chosen.city, price: chosen.price, lead: chosen.lead, split: chosen.fit < 100 ? chosen.fit / 100 : undefined } }); });
    toast(`Agreement sent to ${chosen.name} for e-sign. Price frozen till ${dayLabel(15)}.`);
    setTimeout(() => router.push(`/brand/orders/${id}`), 250);
  }

  return (
    <>
      <DeskHeader
        back={{ href: "/brand", label: "Control tower" }}
        title="New order"
        actions={
          <ol className="flex flex-wrap gap-1.5" aria-label="Steps">
            {[["1", "Requirement", "ok"], ["2", "Match factories", "ok"], ["3", "Compare quotes", "info"], ["4", "Agreement", "neutral"]].map(([n, l, t]) => (
              <li key={n}><Pill tone={t as "ok"} className="px-3 py-1.5 text-[13px]">{n}. {l}</Pill></li>
            ))}
          </ol>
        }
      />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(320px,1fr)_2fr]">
      <Panel title="1 · Requirement" right={<Pill tone="ok">{source}</Pill>}>
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-line p-1">
            {(["te-IN", "hi-IN"] as const).map((l) => <button key={l} onClick={() => setLang(l)} className={cn("rounded-lg px-2.5 py-1 text-[13px]", lang === l ? "bg-pine text-white" : "text-ink-2")}>{l === "te-IN" ? "తెలుగు" : "हिंदी"}</button>)}
          </div>
          <Btn size="sm" onClick={speak} className={listening ? "border-flame text-flame" : ""}><Mic className="size-4" />{listening ? "Listening… tap to stop" : "Speak (తెలుగు / हिंदी)"}</Btn>
          <Btn size="sm" onClick={() => fromChat(WHATSAPP, "Auto-filled from WhatsApp")}><MessageIcon />Paste WhatsApp chat</Btn>
          <Btn size="sm" onClick={() => shotRef.current?.click()}><ImageIcon className="size-4" />Chat screenshot</Btn>
          <input ref={shotRef} type="file" accept="image/*" hidden onChange={(e) => { if (e.target.files?.[0]) { fromChat(WHATSAPP, `Read from ${e.target.files[0].name}`); toast("Screenshot read. Check the fields below."); } }} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Product" ><input className="input" value={product} onChange={(e) => setProduct(e.target.value)} /></Field>
          <Field label="Quantity (units)"><input className="input num" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Target delivery"><input className="input" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
          <Field label="Packaging"><input className="input" value={pack} onChange={(e) => setPack(e.target.value)} /></Field>
          <Field label="Deliver to"><input className="input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-[13px] font-semibold">Specs &amp; compliance</span>
            <textarea className="input h-20 py-2" defaultValue="FSSAI licensed, oil ≤ 18%, no artificial colour. Label artwork attached." />
            <div className="flex flex-wrap gap-1.5">
              {files.map((f) => <span key={f} className="inline-flex items-center gap-1 rounded-[10px] bg-soft px-2 py-1 text-[12px]"><FileText className="size-3.5" />{f}</span>)}
              <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-line-2 px-2 py-1 text-[12px]"><Paperclip className="size-3.5" />+ Attach</button>
              <input ref={fileRef} type="file" hidden onChange={(e) => e.target.files?.[0] && setFiles([...files, e.target.files[0].name])} />
            </div>
          </div>
        </div>
      </Panel>

      <div className="flex min-w-0 flex-col gap-5">
      <Panel title="2–3 · Matched factories & quotes" right="Vetted, FSSAI-certified, within 400 km · quotes frozen 15 days">
        <div className="mb-3 flex gap-1.5">
          {([["landed", "Best landed cost"], ["fast", "Fastest"]] as const).map(([k, l]) => <button key={k} onClick={() => setSort(k)} className={cn("rounded-full px-3 py-1 text-[13px]", sort === k ? "bg-pine text-white" : "bg-soft text-ink-2")}>{l}</button>)}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead><tr><th className="th">Factory</th><th className="th">Capacity fit</th><th className="th">Unit price</th><th className="th">Landed cost</th><th className="th">Lead time</th><th className="th">Rating</th><th className="th" /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={cn(sel === r.id && "bg-peach/50")}>
                  <td className="td"><b>{r.name} · {r.city}</b><p className="text-[12px] text-ink-2">{r.meta}</p></td>
                  <td className="td"><span className="flex items-center gap-2"><span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-soft"><span className="block h-full bg-ok" style={{ width: `${r.fit}%` }} /></span><span className="num text-[12px]">{r.fit}%</span></span></td>
                  <td className="td num">₹{r.price.toFixed(2)}</td>
                  <td className="td num font-semibold">₹{r.landed.toFixed(2)}</td>
                  <td className="td">{r.lead} days</td>
                  <td className="td">{r.rating || "—"}</td>
                  <td className="td">{sel === r.id ? <Pill tone="dark">Selected</Pill> : <Btn size="sm" onClick={() => setSel(r.id)}>Select</Btn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {chosen.fit < 100 && <p className="mt-3 rounded-[10px] bg-soft p-3 text-[13px]">{chosen.name} can do {chosen.fit}% in-house; {100 - chosen.fit}% moves to its connected partner unit automatically.</p>}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={`Landed cost · ${chosen.name}`}>
          <dl className="divide-y divide-line text-[14px]">
            {[["Ex-factory price", chosen.price], ["Packaging (jar + sleeve)", chosen.pack], [`Freight to ${to.split(" ")[0]}`, chosen.freight], ["QC inspection", chosen.qc], ["GST", chosen.gst]].map(([k, v]) => (
              <div key={k as string} className="flex justify-between py-2"><dt className="text-ink-2">{k as string}</dt><dd className="num">₹{(v as number).toFixed(2)}</dd></div>
            ))}
            <div className="flex justify-between py-2.5 font-semibold"><dt>Per unit, delivered</dt><dd className="num">₹{chosen.landed.toFixed(2)}</dd></div>
          </dl>
          <p className="mt-2 text-[13px] text-ink-2">{fmt(n)} units · order value {inr(n * chosen.price)} ex-factory · {inr(n * chosen.landed)} delivered</p>
        </Panel>

        <Panel title="4 · Agreement" right={<Pill>Auto-drafted</Pill>}>
          <ul className="divide-y divide-line">
            {[["20%", "Advance · order confirmed", "On e-sign"], ["30%", "Phase 1 · raw material + packaging in", "On verified proof"], ["30%", "Phase 2 · production complete", "On verified proof"], ["20%", "Phase 3 · QC pass + delivery", "After 7-day window"]].map(([p, t, w]) => (
              <li key={t} className="flex items-center gap-3 py-2.5 text-[14px]"><span className="num w-10 font-semibold">{p}</span><span className="flex-1">{t}</span><span className="text-[12px] text-ink-2">{w}</span></li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-ink-2">QC vs approved sample · 7-day complaint window after delivery</p>
          <div className="mt-5 flex gap-2">
            <Btn variant="flame" onClick={send}>Send for e-sign</Btn>
            <Btn onClick={() => toast("Terms editor: change percentages or add clauses (demo)")}>Edit terms</Btn>
          </div>
        </Panel>
      </div>
      </div>
      </div>
    </>
  );
}

function MessageIcon() {
  return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>;
}
