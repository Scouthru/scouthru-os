"use client";

import { DeskHeader, Panel } from "@/components/desk";
import { Btn, Field, Pill } from "@/components/ui";
import { useStore } from "@/lib/store";

const PROFILE: [string, string][] = [
  ["Factory size", "18,000 sq ft"], ["Year founded", "2014"], ["Employees", "85"], ["Lines", "2 bar lines, 1 roasting line, N2-flush packing"],
  ["Digital capabilities", "Batch traceability, online order tracking"], ["Allergens handled", "Peanut, milk, soy, gluten"], ["Dietary", "Vegan, Jain, sugar-free"],
  ["Certifications", "FSSAI (verified), GMP (verified)"], ["Customers", "3 D2C snack brands, 1 regional chain"],
];

export default function Settings() {
  const { toast, reset } = useStore();
  return (
    <>
      <DeskHeader title="Settings" sub="Your verified profile, plan and connected lead sources." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Verified profile" right={<Pill tone="ok">Visited by Scouthru</Pill>}>
          <dl className="divide-y divide-line text-[14px]">
            {PROFILE.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-ink-2">{k}</dt><dd className="text-right">{v}</dd></div>)}
          </dl>
        </Panel>
        <div className="flex flex-col gap-5">
          <Panel title="Plan">
            <p className="text-[14px]"><b>Pro</b> · unlimited enquiries, large-lot leads, partner overflow, full order and payment management.</p>
            <Btn size="sm" className="mt-3" onClick={() => toast("Billing is a demo placeholder")}>Manage plan</Btn>
          </Panel>
          <Panel title="Lead sources">
            <ul className="divide-y divide-line text-[14px]">
              {[["Scouthru marketplace", true], ["IndiaMART", true], ["WhatsApp Business", true], ["Phone (Scouthru number)", true], ["Email forward", false]].map(([k, on]) => (
                <li key={k as string} className="flex items-center justify-between py-2"><span>{k as string}</span>{on ? <Pill tone="ok">Connected</Pill> : <Btn size="sm" onClick={() => toast("Forward leads to leads+hyd0142@scouthru.in to connect")}>Connect</Btn>}</li>
              ))}
            </ul>
          </Panel>
          <Panel title="Field">
            <Field label="Masked number for buyers"><input className="input num" readOnly value="+91 40 4520 0142" /></Field>
            <button onClick={reset} className="mt-3 text-[13px] underline">Reset demo data</button>
          </Panel>
        </div>
      </div>
    </>
  );
}
