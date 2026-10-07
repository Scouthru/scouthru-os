"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { Btn, Field, Modal, Pill } from "@/components/ui";
import { useStore } from "@/lib/store";
import { postRequirement } from "@/lib/ops";
import { parseRequirement } from "@/lib/parse";
import { cn } from "@/lib/cn";

const CITY_OPTIONS = ["Hyderabad", "Bengaluru", "Chennai", "Pune", "Mumbai", "Vijayawada", "Delhi NCR", "Kolkata", "Ahmedabad", "Guntur"];
const WHEN_OPTIONS = ["As soon as possible", "In 2 weeks", "In 4 weeks", "In 6 weeks", "Next month", "In 3 months"];
const EXAMPLE = "need 5k protein bars 60g hyd by nov fssai";

/** Button beside the search: turns a half-written requirement into one factories can quote on. */
export function AiAssistButton({ seed = "", className, full }: { seed?: string; className?: string; full?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-apricot bg-peach px-3 text-[13px] font-semibold text-flame hover:border-flame", className)}
        aria-label="AI assist: complete my requirement"
      >
        <Sparkles className="size-4" aria-hidden />
        <span className={full ? "" : "hidden sm:inline"}>AI assist</span>
      </button>
      {open && <AiAssistModal seed={seed} onClose={() => setOpen(false)} />}
    </>
  );
}

function AiAssistModal({ seed, onClose }: { seed: string; onClose: () => void }) {
  const { s, update, toast } = useStore();
  const [text, setText] = useState(seed);
  const [edits, setEdits] = useState<{ product?: string; qty?: string; city?: string; when?: string }>({});
  const [posted, setPosted] = useState<string | null>(null);
  const p = useMemo(() => parseRequirement(text), [text]);

  // what the user typed into a field wins over what was read from the sentence
  const product = edits.product ?? p.product;
  const qtyText = edits.qty ?? (p.qty ? String(p.qty) : "");
  const qty = parseInt(qtyText.replace(/\D/g, ""), 10) || 0;
  const city = edits.city ?? p.city;
  const when = edits.when ?? p.when;
  const ready = !!product.trim() && qty > 0 && !!city && !!when;
  const missing = [!product.trim() && "what to make", !qty && "how many", !city && "where to deliver", !when && "when you need it"].filter(Boolean) as string[];

  const words = product.toLowerCase().split(/\s+/).filter((w) => w.length > 3).map((w) => w.replace(/s$/, ""));
  const matches = words.length ? s.products.filter((x) => words.some((w) => `${x.name} ${x.format} ${x.categoryLabel}`.toLowerCase().includes(w))).slice(0, 3) : [];

  const row = (ok: boolean, label: string, field: React.ReactNode) => (
    <div className={cn("rounded-[10px] border p-3", ok ? "border-line bg-white" : "border-apricot bg-peach/50")}>
      <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold">
        {ok ? <CheckCircle2 className="size-4 text-ok" aria-hidden /> : <AlertCircle className="size-4 text-flame" aria-hidden />}
        {label}
        {!ok && <span className="font-normal text-flame">· please add</span>}
      </p>
      {field}
    </div>
  );

  return (
    <Modal open onClose={onClose} title={posted ? "Requirement posted" : "AI assist · complete your requirement"} wide>
      {posted ? (
        <div className="flex flex-col gap-4 text-[14px]">
          <p><b>{product}</b>, {qty.toLocaleString("en-IN")} {p.unit}, to {city}, {when.toLowerCase()}. Verified factories that can make it are being notified.</p>
          <div className="flex flex-wrap gap-2">
            <Btn variant="pine" href={`/brand/orders/${posted}`}>Track it</Btn>
            <Btn onClick={onClose}>Done</Btn>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Type it the way you'd say it. Half a sentence is fine.">
            <textarea
              className="input min-h-[84px] py-2.5 text-[15px]"
              value={text}
              onChange={(e) => { setText(e.target.value); setEdits({}); }}
              placeholder={`e.g. ${EXAMPLE}`}
              autoFocus
            />
          </Field>
          {!text.trim() && (
            <button type="button" onClick={() => setText(EXAMPLE)} className="-mt-2 self-start text-[13px] font-semibold text-flame underline">Try an example</button>
          )}

          {text.trim() && (
            <>
              <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
                <Sparkles className="size-4 text-flame" aria-hidden />
                {ready ? "Everything a factory needs is here. Check it and post." : `Found what I could. Still needed: ${missing.join(", ")}.`}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {row(!!product.trim(), "What to make", <input className="input h-10" value={product} onChange={(e) => setEdits({ ...edits, product: e.target.value })} placeholder="e.g. Protein bars 60g" />)}
                {row(qty > 0, "How many", <input className="input h-10" inputMode="numeric" value={qtyText} onChange={(e) => setEdits({ ...edits, qty: e.target.value })} placeholder="e.g. 5000" />)}
                {row(!!city, "Deliver to", (
                  <select className="input h-10" value={city} onChange={(e) => setEdits({ ...edits, city: e.target.value })}>
                    <option value="">Choose a city</option>
                    {CITY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                ))}
                {row(!!when, "Needed by", (
                  <select className="input h-10" value={when} onChange={(e) => setEdits({ ...edits, when: e.target.value })}>
                    <option value="">Choose a time</option>
                    {[...new Set([...(p.when ? [p.when] : []), ...WHEN_OPTIONS])].map((w) => <option key={w}>{w}</option>)}
                  </select>
                ))}
              </div>
              {(p.certs.length > 0 || p.pack) && (
                <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                  <span className="text-ink-2">Also noted:</span>
                  {p.pack && <Pill>Pack {p.pack}</Pill>}
                  {p.certs.map((c) => <Pill key={c} tone="ok">{c}</Pill>)}
                </div>
              )}
              {matches.length > 0 && (
                <div className="rounded-[10px] bg-soft p-3">
                  <p className="text-[12px] font-semibold text-ink-2">Ready to launch now, if one fits</p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {matches.map((m) => (
                      <li key={m.id}><Link href={`/products/${m.id}`} onClick={onClose} className="text-[14px] font-medium hover:text-flame hover:underline">{m.name}</Link> <span className="text-[12px] text-ink-2">· MOQ {m.moq.toLocaleString("en-IN")} · {m.lead}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              <Btn
                variant="flame"
                size="lg"
                disabled={!ready}
                onClick={() => {
                  let id = "";
                  const notes = [p.pack && `Pack ${p.pack}`, ...p.certs].filter(Boolean).join(" · ");
                  update((d) => { id = postRequirement(d, { product: product.trim(), qty, city, when, unit: p.unit, notes: notes ? `Posted with AI assist · ${notes}` : "Posted with AI assist" }); });
                  setTimeout(() => { setPosted(id); toast("Requirement posted. Factories are being matched."); }, 0);
                }}
              >
                {ready ? "Post requirement" : `Add ${missing[0]} to post`}
              </Btn>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
